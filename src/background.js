/**
 * Background service worker
 * Handles extension lifecycle and message passing
 */

// Import constants (only in browser service worker context)
try {
    if (typeof importScripts !== 'undefined') {
        importScripts('constants.js');
    }
} catch (e) {
    // In test environment, constants are loaded separately
}

// Initialize extension on install/update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === MESSAGE_ACTIONS.INSTALL) {
        // Set default settings on first install
        const defaultSettings = {};
        defaultSettings[STORAGE_KEYS.DEFAULT_SPEED] = DEFAULT_SPEED;
        defaultSettings[STORAGE_KEYS.GENRE_SPEEDS] = DEFAULT_GENRE_SPEEDS;
        defaultSettings[STORAGE_KEYS.CHANNEL_SPEEDS] = DEFAULT_CHANNEL_SPEEDS;
        defaultSettings[STORAGE_KEYS.DISABLED_VIDEO_IDS] = DEFAULT_DISABLED_VIDEO_IDS;

        chrome.storage.sync.set(defaultSettings);
    }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === MESSAGE_ACTIONS.GET_SETTINGS) {
        chrome.storage.sync.get(null, (settings) => {
            sendResponse(settings);
        });
        return true; // Will respond asynchronously
    }

    if (request.action === MESSAGE_ACTIONS.UPDATE_SETTINGS) {
        chrome.storage.sync.set(request.settings, () => {
            sendResponse({ success: true });
        });
        return true;
    }
});
