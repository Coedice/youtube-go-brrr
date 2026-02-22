/**
 * Tests for background service worker
 */

describe('background service worker', () => {
    let onInstalledListener;
    let onMessageListener;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        onInstalledListener = null;
        onMessageListener = null;

        global.chrome = {
            runtime: {
                onInstalled: {
                    addListener: jest.fn((cb) => {
                        onInstalledListener = cb;
                    }),
                },
                onMessage: {
                    addListener: jest.fn((cb) => {
                        onMessageListener = cb;
                    }),
                },
                lastError: null,
            },
            storage: {
                sync: {
                    set: jest.fn((data, cb) => cb && cb()),
                    get: jest.fn((keys, cb) => cb && cb({ defaultSpeed: 1 })),
                },
            },
        };

        // Load constants into global scope
        require('../src/constants.js');
    });

    it('sets defaults on install', () => {
        jest.isolateModules(() => {
            require('../src/background.js');
        });

        expect(onInstalledListener).toBeInstanceOf(Function);
        onInstalledListener({ reason: 'install' });

        expect(chrome.storage.sync.set).toHaveBeenCalledWith(
            expect.objectContaining({
                defaultSpeed: 2.3,
                genreSpeeds: expect.any(Object),
                channelSpeeds: expect.any(Object),
            })
        );
    });

    it('does not set defaults when not installing', () => {
        jest.isolateModules(() => {
            require('../src/background.js');
        });

        onInstalledListener({ reason: 'update' });

        expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    });

    it('responds to getSettings and updateSettings messages', () => {
        const mockSettings = { defaultSpeed: 1.75 };
        chrome.storage.sync.get.mockImplementation((keys, cb) => cb(mockSettings));

        jest.isolateModules(() => {
            require('../src/background.js');
        });

        const sendResponse = jest.fn();

        const getSettingsResult = onMessageListener({ action: 'getSettings' }, null, sendResponse);
        expect(chrome.storage.sync.get).toHaveBeenCalledWith(null, expect.any(Function));
        expect(sendResponse).toHaveBeenCalledWith(mockSettings);
        expect(getSettingsResult).toBe(true);

        const updateResponse = jest.fn();
        const updated = { defaultSpeed: 2 };
        const setSpy = chrome.storage.sync.set;
        setSpy.mockImplementation((settings, cb) => cb && cb());

        const updateResult = onMessageListener(
            { action: 'updateSettings', settings: updated },
            null,
            updateResponse
        );
        expect(setSpy).toHaveBeenCalledWith(updated, expect.any(Function));
        expect(updateResponse).toHaveBeenCalledWith({ success: true });
        expect(updateResult).toBe(true);
    });

    it('handles unknown actions gracefully', () => {
        jest.isolateModules(() => {
            require('../src/background.js');
        });

        const sendResponse = jest.fn();

        const result = onMessageListener({ action: 'unknown' }, null, sendResponse);
        expect(result).toBeUndefined();
        expect(sendResponse).not.toHaveBeenCalled();
    });

    it('handles empty requests gracefully', () => {
        jest.isolateModules(() => {
            require('../src/background.js');
        });

        const sendResponse = jest.fn();

        const result = onMessageListener({}, null, sendResponse);
        expect(result).toBeUndefined();
        expect(sendResponse).not.toHaveBeenCalled();
    });

    it('handles storage errors in getSettings', () => {
        const mockSettings = { defaultSpeed: 1.75 };
        chrome.storage.sync.get.mockImplementation((keys, cb) => {
            chrome.runtime.lastError = { message: 'Storage error' };
            cb(mockSettings);
        });

        jest.isolateModules(() => {
            require('../src/background.js');
        });

        const sendResponse = jest.fn();

        const result = onMessageListener({ action: 'getSettings' }, null, sendResponse);
        expect(sendResponse).toHaveBeenCalledWith(mockSettings);
        expect(result).toBe(true);
    });

    it('handles storage errors in updateSettings', () => {
        chrome.storage.sync.set.mockImplementation((settings, cb) => {
            chrome.runtime.lastError = { message: 'Storage error' };
            cb && cb();
        });

        jest.isolateModules(() => {
            require('../src/background.js');
        });

        const sendResponse = jest.fn();
        const updated = { defaultSpeed: 2 };

        const result = onMessageListener(
            { action: 'updateSettings', settings: updated },
            null,
            sendResponse
        );
        expect(chrome.storage.sync.set).toHaveBeenCalledWith(updated, expect.any(Function));
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
        expect(result).toBe(true);
    });

    it('does not set defaults for browser_update reason', () => {
        jest.isolateModules(() => {
            require('../src/background.js');
        });

        onInstalledListener({ reason: 'browser_update' });

        expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    });

    it('sets complete default settings structure', () => {
        jest.isolateModules(() => {
            require('../src/background.js');
        });

        onInstalledListener({ reason: 'install' });

        expect(chrome.storage.sync.set).toHaveBeenCalledWith(
            expect.objectContaining({
                defaultSpeed: 2.3,
                genreSpeeds: expect.objectContaining({
                    Music: 1,
                    Comedy: 1,
                }),
                channelSpeeds: expect.any(Object),
                disabledVideoIds: expect.any(Object),
            })
        );
    });
});
