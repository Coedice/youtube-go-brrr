/**
 * Popup script - handles UI interactions and settings management
 */

console.log('YouTube Go Brrr popup: Script loaded');

class PopupManager {
    constructor() {
        console.log('YouTube Go Brrr popup: Constructor called');
        this.defaultSpeedInput = document.getElementById('default-speed');
        // Genre elements
        this.currentGenreContainer = document.getElementById('current-genre-container');
        this.currentGenreName = document.getElementById('current-genre-name');
        this.genreRuleToggle = document.getElementById('genre-rule-toggle');
        this.currentGenreSpeed = document.getElementById('current-genre-speed');
        this.deleteGenreRuleBtn = document.getElementById('delete-genre-rule-btn');
        this.noGenreInfo = document.getElementById('no-genre-info');

        // Channel elements
        this.currentChannelContainer = document.getElementById('current-channel-container');
        this.currentChannelName = document.getElementById('current-channel-name');
        this.channelRuleToggle = document.getElementById('channel-rule-toggle');
        this.currentChannelSpeed = document.getElementById('current-channel-speed');
        this.deleteChannelRuleBtn = document.getElementById('delete-channel-rule-btn');
        this.noChannelInfo = document.getElementById('no-channel-info');

        this.currentGenre = null;
        this.currentGenres = [];
        this.currentChannel = null;
        this.currentVideoId = null;

        // Video elements
        this.currentVideoContainer = document.getElementById('current-video-container');
        this.currentVideoName = document.getElementById('current-video-name');
        this.videoRuleToggle = document.getElementById('video-rule-toggle');
        this.currentVideoSpeed = document.getElementById('current-video-speed');
        this.deleteVideoRuleBtn = document.getElementById('delete-video-rule-btn');
        this.noVideoInfo = document.getElementById('no-video-info');

        this.statusMessage = document.getElementById('status-message');

        console.log(
            'YouTube Go Brrr popup: Elements loaded, videoSpeedToggle:',
            this.videoSpeedToggle,
            'videoSpeedControl:',
            this.videoSpeedControl
        );

        this.init();
    }

    async init() {
        console.log('YouTube Go Brrr popup: init() called');
        this.attachEventListeners();
        await this.loadSettings();
        await this.loadCurrentVideoInfo();
        console.log('YouTube Go Brrr popup: init() completed');
    }

    attachEventListeners() {
        console.log('YouTube Go Brrr popup: Attaching event listeners');

        this.defaultSpeedInput.addEventListener('change', () => this.handleSaveDefault());

        // Genre rule event listeners
        this.genreRuleToggle.addEventListener('change', () => this.handleGenreToggle());
        this.currentGenreSpeed.addEventListener('change', () => this.handleGenreSpeedChange());

        // Channel rule event listeners
        this.channelRuleToggle.addEventListener('change', () => this.handleChannelToggle());
        this.currentChannelSpeed.addEventListener('change', () => this.handleChannelSpeedChange());

        // Video rule event listeners
        this.videoRuleToggle.addEventListener('change', () => this.handleVideoToggle());
        this.currentVideoSpeed.addEventListener('change', () => this.handleVideoSpeedChange());

        // Allow Enter key for speed inputs
        if (this.currentChannelSpeed) {
            this.currentChannelSpeed.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleChannelSpeedChange();
                }
            });
        }
    }

    async loadSettings() {
        const settings = await this.getStorageSettings();

        // Load default speed
        this.defaultSpeedInput.value = this.snapSpeed(settings.defaultSpeed);

        // Load video info and rules
        await this.loadCurrentVideoInfo();
    }

    async getStorageSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(
                {
                    defaultSpeed: 2.3,
                    genreSpeeds: {
                        Music: 1,
                        Comedy: 1,
                    },
                    channelSpeeds: {},
                    videoSpeeds: {},
                    disabledVideoIds: {},
                },
                resolve
            );
        });
    }

    async saveStorageSettings(settings) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set(settings, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    async handleSaveDefault() {
        const speed = this.snapSpeed(parseFloat(this.defaultSpeedInput.value));

        if (isNaN(speed) || speed < 0.25 || speed > 16) {
            this.showStatus('Invalid speed. Must be between 0.25x and 16x', 'error');
            return;
        }

        try {
            const settings = await this.getStorageSettings();
            settings.defaultSpeed = speed;
            this.defaultSpeedInput.value = speed;
            await this.saveStorageSettings(settings);

            // Notify content script to reapply speed
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
                chrome.tabs.sendMessage(tab.id, { action: 'reapplySpeed' });
            }
        } catch (error) {
            this.showStatus('Error saving default speed', 'error');
        }
    }

    async handleDeleteChannel(channel) {
        try {
            const settings = await this.getStorageSettings();
            delete settings.channelSpeeds[channel];
            await this.saveStorageSettings(settings);
            this.renderChannels(settings.channelSpeeds);
        } catch (error) {
            this.showStatus('Error deleting channel', 'error');
        }
    }

    async handleGenreToggle() {
        if (!this.currentGenres || this.currentGenres.length === 0) return;

        // Use the first genre as the primary one for rule creation
        const primaryGenre =
            this.currentGenres[0].charAt(0).toUpperCase() +
            this.currentGenres[0].slice(1).toLowerCase();

        if (this.genreRuleToggle.checked) {
            // Enable rule - create with default speed if not exists
            document.getElementById('current-genre-speed').parentElement.style.display = 'flex';
            document.getElementById('genre-rule-actions').style.display = 'flex';

            const speed = this.snapSpeed(parseFloat(this.currentGenreSpeed.value));
            if (isNaN(speed) || speed < 0.25 || speed > 16) {
                this.genreRuleToggle.checked = false;
                document.getElementById('current-genre-speed').parentElement.style.display = 'none';
                document.getElementById('genre-rule-actions').style.display = 'none';
                this.showStatus('Invalid speed. Must be between 0.25x and 16x', 'error');
                return;
            }

            try {
                const settings = await this.getStorageSettings();
                settings.genreSpeeds[primaryGenre] = speed;
                await this.saveStorageSettings(settings);

                // Notify content script to reapply speed
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: 'reapplySpeed' });
                }
            } catch (error) {
                this.showStatus('Error enabling genre rule', 'error');
            }
        } else {
            // Disable rule - remove from storage
            document.getElementById('current-genre-speed').parentElement.style.display = 'none';
            document.getElementById('genre-rule-actions').style.display = 'none';

            try {
                const settings = await this.getStorageSettings();
                delete settings.genreSpeeds[primaryGenre];
                await this.saveStorageSettings(settings);

                // Notify content script to reapply speed
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: 'reapplySpeed' });
                }
            } catch (error) {
                this.showStatus('Error disabling genre rule', 'error');
            }
        }
    }

    async handleGenreSpeedChange() {
        // Auto-save when speed changes if rule is enabled
        if (this.genreRuleToggle.checked && this.currentGenres && this.currentGenres.length > 0) {
            const primaryGenre =
                this.currentGenres[0].charAt(0).toUpperCase() +
                this.currentGenres[0].slice(1).toLowerCase();
            const speed = this.snapSpeed(parseFloat(this.currentGenreSpeed.value));

            if (isNaN(speed) || speed < 0.25 || speed > 16) {
                this.showStatus('Invalid speed. Must be between 0.25x and 16x', 'error');
                return;
            }

            try {
                const settings = await this.getStorageSettings();
                settings.genreSpeeds[primaryGenre] = speed;
                await this.saveStorageSettings(settings);
                this.showStatus('Genre speed updated!', 'success');

                // Notify content script to reapply speed
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: 'reapplySpeed' });
                }
            } catch (error) {
                this.showStatus('Error updating genre speed', 'error');
            }
        }
    }

    async handleChannelToggle() {
        if (!this.currentChannel) return;

        if (this.channelRuleToggle.checked) {
            // Enable rule - create with default speed if not exists
            document.getElementById('current-channel-speed').parentElement.style.display = 'flex';

            const speed = this.snapSpeed(parseFloat(this.currentChannelSpeed.value));
            if (isNaN(speed) || speed < 0.25 || speed > 16) {
                this.channelRuleToggle.checked = false;
                document.getElementById('current-channel-speed').parentElement.style.display =
                    'none';
                this.showStatus('Invalid speed. Must be between 0.25x and 16x', 'error');
                return;
            }

            try {
                const settings = await this.getStorageSettings();
                settings.channelSpeeds[this.currentChannel] = speed;
                await this.saveStorageSettings(settings);
                this.showStatus('Channel rule enabled!', 'success');

                // Notify content script to reapply speed
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: 'reapplySpeed' });
                }
            } catch (error) {
                this.showStatus('Error enabling channel rule', 'error');
            }
        } else {
            // Disable rule - remove from storage
            document.getElementById('current-channel-speed').parentElement.style.display = 'none';

            try {
                const settings = await this.getStorageSettings();
                delete settings.channelSpeeds[this.currentChannel];
                await this.saveStorageSettings(settings);
                this.showStatus('Channel rule disabled!', 'success');

                // Notify content script to reapply speed
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: 'reapplySpeed' });
                }
            } catch (error) {
                this.showStatus('Error disabling channel rule', 'error');
            }
        }
    }

    async handleChannelSpeedChange() {
        // Auto-save when speed changes if rule is enabled
        if (this.channelRuleToggle.checked && this.currentChannel) {
            const speed = this.snapSpeed(parseFloat(this.currentChannelSpeed.value));

            if (isNaN(speed) || speed < 0.25 || speed > 16) {
                this.showStatus('Invalid speed. Must be between 0.25x and 16x', 'error');
                return;
            }

            try {
                const settings = await this.getStorageSettings();
                settings.channelSpeeds[this.currentChannel] = speed;
                await this.saveStorageSettings(settings);
                this.showStatus('Channel speed updated!', 'success');

                // Notify content script to reapply speed
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: 'reapplySpeed' });
                }
            } catch (error) {
                this.showStatus('Error updating channel speed', 'error');
            }
        }
    }

    async loadCurrentVideoInfo() {
        console.log('YouTube Go Brrr popup: loadCurrentVideoInfo() called');

        if (!chrome.tabs || !chrome.tabs.query) {
            console.log('YouTube Go Brrr popup: chrome.tabs unavailable for video info');
            return;
        }

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('YouTube Go Brrr popup: Active tab:', tab);

            if (!tab || !tab.id) {
                console.log('YouTube Go Brrr popup: No active tab or tab ID');
                return;
            }

            if (!tab.url) {
                console.log('YouTube Go Brrr popup: No tab URL');
                return;
            }

            if (!tab.url.includes('youtube.com')) {
                console.log('YouTube Go Brrr popup: Not on YouTube, URL:', tab.url);
                return;
            }

            console.log('YouTube Go Brrr popup: On YouTube, tab ID:', tab.id);

            // First, let's check if content script is loaded by pinging it
            let contentScriptLoaded = false;
            try {
                const pingResponse = await new Promise((resolve) => {
                    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (res) => {
                        if (chrome.runtime.lastError) {
                            console.log(
                                'YouTube Go Brrr popup: Content script not loaded:',
                                chrome.runtime.lastError.message
                            );
                            resolve(null);
                        } else {
                            resolve(res);
                        }
                    });
                });
                contentScriptLoaded = !!pingResponse;
            } catch (error) {
                console.log('YouTube Go Brrr popup: Error checking content script:', error);
            }

            if (!contentScriptLoaded) {
                console.log(
                    'YouTube Go Brrr popup: Content script not loaded, attempting to inject...'
                );
                // Try to inject content script manually
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['src/content.js'],
                    });
                    console.log('YouTube Go Brrr popup: Content script injected successfully');
                    // Wait a bit for script to initialize
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                } catch (error) {
                    console.log('YouTube Go Brrr popup: Failed to inject content script:', error);
                    // Show no info states since we can't get data
                    this.currentGenreContainer.style.display = 'none';
                    this.noGenreInfo.style.display = 'block';
                    this.currentChannelContainer.style.display = 'none';
                    this.noChannelInfo.style.display = 'block';
                    return;
                }
            }

            // Get genre, channel, and video info
            console.log('YouTube Go Brrr popup: Sending messages to content script...');
            const [genreResponse, channelResponse, videoResponse] = await Promise.all([
                new Promise((resolve) => {
                    console.log('YouTube Go Brrr popup: Sending getGenreInfo to tab', tab.id);
                    chrome.tabs.sendMessage(tab.id, { action: 'getGenreInfo' }, (res) => {
                        if (chrome.runtime.lastError) {
                            console.log(
                                'YouTube Go Brrr popup: getGenreInfo error:',
                                chrome.runtime.lastError.message
                            );
                            resolve(null);
                        } else {
                            console.log('YouTube Go Brrr popup: getGenreInfo response:', res);
                            resolve(res);
                        }
                    });
                }),
                new Promise((resolve) => {
                    console.log('YouTube Go Brrr popup: Sending getChannelInfo to tab', tab.id);
                    chrome.tabs.sendMessage(tab.id, { action: 'getChannelInfo' }, (res) => {
                        if (chrome.runtime.lastError) {
                            console.log(
                                'YouTube Go Brrr popup: getChannelInfo error:',
                                chrome.runtime.lastError.message
                            );
                            resolve(null);
                        } else {
                            console.log('YouTube Go Brrr popup: getChannelInfo response:', res);
                            resolve(res);
                        }
                    });
                }),
                new Promise((resolve) => {
                    console.log('YouTube Go Brrr popup: Sending getVideoInfo to tab', tab.id);
                    chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' }, (res) => {
                        if (chrome.runtime.lastError) {
                            console.log(
                                'YouTube Go Brrr popup: getVideoInfo error:',
                                chrome.runtime.lastError.message
                            );
                            resolve(null);
                        } else {
                            console.log('YouTube Go Brrr popup: getVideoInfo response:', res);
                            resolve(res);
                        }
                    });
                }),
            ]);

            console.log('YouTube Go Brrr popup: Genre response:', genreResponse);
            console.log('YouTube Go Brrr popup: Channel response:', channelResponse);
            console.log('YouTube Go Brrr popup: Video response:', videoResponse);

            // Load current settings
            const settings = await this.getStorageSettings();

            // Extract video ID from response
            if (videoResponse && videoResponse.videoId) {
                this.currentVideoId = videoResponse.videoId;
                console.log('YouTube Go Brrr popup: Got video ID:', this.currentVideoId);
            } else {
                console.log('YouTube Go Brrr popup: No video ID in response:', videoResponse);
            }

            // Handle genre info
            if (genreResponse && genreResponse.genres && genreResponse.genres.length > 0) {
                // Store all genres and display them
                this.currentGenres = genreResponse.genres;

                // Format genres for display (capitalize first letter)
                const displayGenres = this.currentGenres
                    .map((g) => g.charAt(0).toUpperCase() + g.slice(1).toLowerCase())
                    .join(', ');

                this.currentGenreName.textContent = displayGenres;
                this.currentGenreContainer.style.display = 'block';
                this.noGenreInfo.style.display = 'none';
                console.log('YouTube Go Brrr popup: Set genres:', this.currentGenres);

                // Check if any genre has a rule - find the lowest speed among matched genres
                let lowestSpeed = null;
                let matchedGenres = [];

                for (const genre of this.currentGenres) {
                    const capitalizedGenre =
                        genre.charAt(0).toUpperCase() + genre.slice(1).toLowerCase();
                    const genreRule = settings.genreSpeeds[capitalizedGenre];
                    if (genreRule !== undefined) {
                        matchedGenres.push(capitalizedGenre);
                        if (lowestSpeed === null || genreRule < lowestSpeed) {
                            lowestSpeed = genreRule;
                        }
                    }
                }

                if (lowestSpeed !== null) {
                    this.genreRuleToggle.checked = true;
                    this.currentGenreSpeed.value = this.snapSpeed(lowestSpeed);
                    document.getElementById('current-genre-speed').parentElement.style.display =
                        'flex';
                    console.log(
                        'YouTube Go Brrr popup: Found genre rules for:',
                        matchedGenres,
                        'using lowest speed:',
                        lowestSpeed
                    );
                } else {
                    this.genreRuleToggle.checked = false;
                    document.getElementById('current-genre-speed').parentElement.style.display =
                        'none';
                    console.log('YouTube Go Brrr popup: No genre rules found');
                }
            } else {
                this.currentGenreContainer.style.display = 'none';
                this.noGenreInfo.style.display = 'block';
                console.log('YouTube Go Brrr popup: No genre info available');
            }

            // Handle channel info
            if (channelResponse && channelResponse.channel) {
                this.currentChannel = channelResponse.channel.trim();
                this.currentChannelName.textContent = this.currentChannel;
                this.currentChannelContainer.style.display = 'block';
                this.noChannelInfo.style.display = 'none';
                console.log('YouTube Go Brrr popup: Set channel:', this.currentChannel);

                // Check if channel rule exists
                const channelRule = settings.channelSpeeds[this.currentChannel];
                if (channelRule !== undefined) {
                    this.channelRuleToggle.checked = true;
                    this.currentChannelSpeed.value = this.snapSpeed(channelRule);
                    document.getElementById('current-channel-speed').parentElement.style.display =
                        'flex';
                    console.log('YouTube Go Brrr popup: Found existing channel rule:', channelRule);
                } else {
                    this.channelRuleToggle.checked = false;
                    document.getElementById('current-channel-speed').parentElement.style.display =
                        'none';
                    console.log('YouTube Go Brrr popup: No existing channel rule');
                }
            } else {
                this.currentChannelContainer.style.display = 'none';
                this.noChannelInfo.style.display = 'block';
                console.log('YouTube Go Brrr popup: No channel info available');
            }

            // Handle video-specific rule
            if (this.currentVideoId) {
                this.currentVideoName.textContent = `Video ${this.currentVideoId.slice(-6)}`;
                this.currentVideoContainer.style.display = 'block';
                this.noVideoInfo.style.display = 'none';

                // Check if video rule exists (highest priority)
                const videoRule = settings.videoSpeeds && settings.videoSpeeds[this.currentVideoId];
                if (videoRule !== undefined) {
                    this.videoRuleToggle.checked = true;
                    this.currentVideoSpeed.value = this.snapSpeed(videoRule);
                    document.getElementById('current-video-speed').parentElement.style.display =
                        'flex';
                    document.getElementById('video-rule-actions').style.display = 'flex';
                    console.log('YouTube Go Brrr popup: Found existing video rule:', videoRule);
                } else {
                    this.videoRuleToggle.checked = false;
                    document.getElementById('current-video-speed').parentElement.style.display =
                        'none';
                    document.getElementById('video-rule-actions').style.display = 'none';
                    console.log('YouTube Go Brrr popup: No existing video rule');
                }
            } else {
                this.currentVideoContainer.style.display = 'none';
                this.noVideoInfo.style.display = 'block';
                console.log(
                    'YouTube Go Brrr popup: No video info available. VideoResponse was:',
                    videoResponse
                );
            }
        } catch (error) {
            console.log('YouTube Go Brrr popup: loadCurrentVideoInfo error', error);
        }
    }

    async handleToggleVideoSpeed() {
        console.log('YouTube Go Brrr popup: Toggle clicked, currentVideoId:', this.currentVideoId);

        if (!this.currentVideoId) {
            console.log('YouTube Go Brrr popup: No currentVideoId, aborting toggle');
            return;
        }

        try {
            const settings = await this.getStorageSettings();
            console.log('YouTube Go Brrr popup: Current settings:', settings);

            // Ensure disabledVideoIds exists
            if (!settings.disabledVideoIds) {
                settings.disabledVideoIds = {};
            }

            const isCurrentlyDisabled = !!settings.disabledVideoIds[this.currentVideoId];
            console.log('YouTube Go Brrr popup: Video currently disabled:', isCurrentlyDisabled);
            console.log('YouTube Go Brrr popup: Toggle checked:', this.videoSpeedToggle.checked);

            // If toggle is ON, speed should be ENABLED (disabled = false)
            // If toggle is OFF, speed should be DISABLED (disabled = true)
            if (this.videoSpeedToggle.checked) {
                delete settings.disabledVideoIds[this.currentVideoId];
                console.log('YouTube Go Brrr popup: Enabling speed for video');
            } else {
                settings.disabledVideoIds[this.currentVideoId] = true;
                console.log('YouTube Go Brrr popup: Disabling speed for video');
            }

            await this.saveStorageSettings(settings);
            console.log('YouTube Go Brrr popup: Settings saved');

            // Send message to content script to reapply speed immediately
            // Include the new disabled state so content script doesn't have to read from storage
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
                const newDisabledState = !!settings.disabledVideoIds[this.currentVideoId];
                console.log(
                    'YouTube Go Brrr popup: Sending reapplySpeed message to tab:',
                    tab.id,
                    'disabled:',
                    newDisabledState
                );
                chrome.tabs.sendMessage(
                    tab.id,
                    { action: 'reapplySpeed', isDisabled: newDisabledState },
                    () => {
                        if (chrome.runtime.lastError) {
                            console.log(
                                'YouTube Go Brrr popup: sendMessage error (reapplySpeed)',
                                chrome.runtime.lastError.message
                            );
                        } else {
                            console.log(
                                'YouTube Go Brrr popup: reapplySpeed message sent successfully'
                            );
                        }
                    }
                );
            }
        } catch (error) {
            console.error('YouTube Go Brrr popup: Error toggling video speed', error);
            // Revert the toggle on error
            this.videoSpeedToggle.checked = !this.videoSpeedToggle.checked;
        }
    }

    async handleVideoToggle() {
        if (!this.currentVideoId) return;

        if (this.videoRuleToggle.checked) {
            // Enable rule - create with default speed if not exists
            document.getElementById('current-video-speed').parentElement.style.display = 'flex';

            const speed = this.snapSpeed(parseFloat(this.currentVideoSpeed.value));
            if (isNaN(speed) || speed < 0.25 || speed > 16) {
                this.videoRuleToggle.checked = false;
                document.getElementById('current-video-speed').parentElement.style.display = 'none';
                this.showStatus('Invalid speed. Must be between 0.25x and 16x', 'error');
                return;
            }

            try {
                const settings = await this.getStorageSettings();
                if (!settings.videoSpeeds) {
                    settings.videoSpeeds = {};
                }
                settings.videoSpeeds[this.currentVideoId] = speed;
                await this.saveStorageSettings(settings);
                this.showStatus('Video rule enabled!', 'success');

                // Notify content script to reapply speed
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: 'reapplySpeed' }, () => {
                        if (chrome.runtime.lastError) {
                            console.log(
                                'YouTube Go Brrr popup: reapplySpeed error',
                                chrome.runtime.lastError.message
                            );
                        }
                    });
                }
            } catch (error) {
                this.showStatus('Error enabling video rule', 'error');
            }
        } else {
            // Disable rule - remove from storage
            document.getElementById('current-video-speed').parentElement.style.display = 'none';

            try {
                const settings = await this.getStorageSettings();
                if (settings.videoSpeeds) {
                    delete settings.videoSpeeds[this.currentVideoId];
                }
                await this.saveStorageSettings(settings);
                this.showStatus('Video rule disabled!', 'success');

                // Notify content script to reapply speed
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: 'reapplySpeed' }, () => {
                        if (chrome.runtime.lastError) {
                            console.log(
                                'YouTube Go Brrr popup: reapplySpeed error',
                                chrome.runtime.lastError.message
                            );
                        }
                    });
                }
            } catch (error) {
                this.showStatus('Error disabling video rule', 'error');
            }
        }
    }

    async handleVideoSpeedChange() {
        // Auto-save when speed changes if rule is enabled
        if (this.videoRuleToggle.checked && this.currentVideoId) {
            const speed = this.snapSpeed(parseFloat(this.currentVideoSpeed.value));

            if (isNaN(speed) || speed < 0.25 || speed > 16) {
                this.showStatus('Invalid speed. Must be between 0.25x and 16x', 'error');
                return;
            }

            try {
                const settings = await this.getStorageSettings();
                if (!settings.videoSpeeds) {
                    settings.videoSpeeds = {};
                }
                settings.videoSpeeds[this.currentVideoId] = speed;
                await this.saveStorageSettings(settings);
                this.showStatus('Video speed updated!', 'success');

                // Notify content script to reapply speed
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: 'reapplySpeed' }, () => {
                        if (chrome.runtime.lastError) {
                            console.log(
                                'YouTube Go Brrr popup: reapplySpeed error',
                                chrome.runtime.lastError.message
                            );
                        }
                    });
                }
            } catch (error) {
                this.showStatus('Error updating video speed', 'error');
            }
        }
    }

    showStatus(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;

        setTimeout(() => {
            this.statusMessage.className = 'status-message';
        }, 2000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    snapSpeed(value) {
        const min = 0.25;
        const max = 16;
        const step = 0.1;
        if (!Number.isFinite(value)) return NaN;
        const clamped = Math.min(Math.max(value, min), max);
        const snapped = Math.round(clamped / step) * step;
        return Number(snapped.toFixed(2));
    }
}

// Initialize popup when DOM is ready
console.log('YouTube Go Brrr popup: Setting up DOMContentLoaded listener');
document.addEventListener('DOMContentLoaded', () => {
    console.log('YouTube Go Brrr popup: DOMContentLoaded fired, creating PopupManager');
    new PopupManager();
});
