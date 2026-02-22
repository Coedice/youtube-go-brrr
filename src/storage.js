/**
 * Storage utility for managing extension settings
 */
class StorageManager {
    static async getSettings() {
        return new Promise((resolve) => {
            const defaultSettings = {};
            defaultSettings[STORAGE_KEYS.DEFAULT_SPEED] = DEFAULT_SPEED;
            defaultSettings[STORAGE_KEYS.GENRE_SPEEDS] = DEFAULT_GENRE_SPEEDS;
            defaultSettings[STORAGE_KEYS.CHANNEL_SPEEDS] = DEFAULT_CHANNEL_SPEEDS;
            defaultSettings[STORAGE_KEYS.VIDEO_SPEEDS] = DEFAULT_VIDEO_SPEEDS;
            defaultSettings[STORAGE_KEYS.DISABLED_VIDEO_IDS] = DEFAULT_DISABLED_VIDEO_IDS;

            chrome.storage.sync.get(defaultSettings, resolve);
        });
    }

    static async saveSettings(settings) {
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

    static async setDefaultSpeed(speed) {
        const settings = await this.getSettings();
        settings[STORAGE_KEYS.DEFAULT_SPEED] = parseFloat(speed);
        await this.saveSettings(settings);
        return settings;
    }

    static async addGenre(genre, speed) {
        const settings = await this.getSettings();
        settings[STORAGE_KEYS.GENRE_SPEEDS][genre] = parseFloat(speed);
        await this.saveSettings(settings);
        return settings;
    }

    static async removeGenre(genre) {
        const settings = await this.getSettings();
        delete settings[STORAGE_KEYS.GENRE_SPEEDS][genre];
        await this.saveSettings(settings);
        return settings;
    }

    static async addChannel(channel, speed) {
        const settings = await this.getSettings();
        settings[STORAGE_KEYS.CHANNEL_SPEEDS][channel] = parseFloat(speed);
        await this.saveSettings(settings);
        return settings;
    }

    static async removeChannel(channel) {
        const settings = await this.getSettings();
        delete settings[STORAGE_KEYS.CHANNEL_SPEEDS][channel];
        await this.saveSettings(settings);
        return settings;
    }

    static async toggleDisableVideo(videoId) {
        const settings = await this.getSettings();
        if (settings[STORAGE_KEYS.DISABLED_VIDEO_IDS][videoId]) {
            delete settings[STORAGE_KEYS.DISABLED_VIDEO_IDS][videoId];
        } else {
            settings[STORAGE_KEYS.DISABLED_VIDEO_IDS][videoId] = true;
        }
        await this.saveSettings(settings);
        return settings;
    }

    static async isVideoDisabled(videoId) {
        const settings = await this.getSettings();
        return !!settings[STORAGE_KEYS.DISABLED_VIDEO_IDS][videoId];
    }

    static async getSpeedForVideo(videoInfo) {
        const settings = await this.getSettings();
        const { channel = null, genres = [], videoId = null } = videoInfo;

        // Check video-specific speeds first (highest priority)
        if (
            videoId &&
            settings[STORAGE_KEYS.VIDEO_SPEEDS] &&
            settings[STORAGE_KEYS.VIDEO_SPEEDS][videoId]
        ) {
            return settings[STORAGE_KEYS.VIDEO_SPEEDS][videoId];
        }

        // Check channel speeds second (medium-high priority)
        if (channel && settings[STORAGE_KEYS.CHANNEL_SPEEDS][channel]) {
            return settings[STORAGE_KEYS.CHANNEL_SPEEDS][channel];
        }

        // Check genre speeds third (medium priority)
        for (const genre of genres) {
            if (settings[STORAGE_KEYS.GENRE_SPEEDS][genre]) {
                return settings[STORAGE_KEYS.GENRE_SPEEDS][genre];
            }
        }

        // Return default speed (lowest priority)
        return settings[STORAGE_KEYS.DEFAULT_SPEED];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
