/**
 * Storage utility for managing extension settings
 */
class StorageManager {
    static async getSettings() {
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
        settings.defaultSpeed = parseFloat(speed);
        await this.saveSettings(settings);
        return settings;
    }

    static async addGenre(genre, speed) {
        const settings = await this.getSettings();
        settings.genreSpeeds[genre] = parseFloat(speed);
        await this.saveSettings(settings);
        return settings;
    }

    static async removeGenre(genre) {
        const settings = await this.getSettings();
        delete settings.genreSpeeds[genre];
        await this.saveSettings(settings);
        return settings;
    }

    static async addChannel(channel, speed) {
        const settings = await this.getSettings();
        settings.channelSpeeds[channel] = parseFloat(speed);
        await this.saveSettings(settings);
        return settings;
    }

    static async removeChannel(channel) {
        const settings = await this.getSettings();
        delete settings.channelSpeeds[channel];
        await this.saveSettings(settings);
        return settings;
    }

    static async toggleDisableVideo(videoId) {
        const settings = await this.getSettings();
        if (settings.disabledVideoIds[videoId]) {
            delete settings.disabledVideoIds[videoId];
        } else {
            settings.disabledVideoIds[videoId] = true;
        }
        await this.saveSettings(settings);
        return settings;
    }

    static async isVideoDisabled(videoId) {
        const settings = await this.getSettings();
        return !!settings.disabledVideoIds[videoId];
    }

    static async getSpeedForVideo(videoInfo) {
        const settings = await this.getSettings();
        const { channel = null, genres = [], videoId = null } = videoInfo;

        // Check video-specific speeds first (highest priority)
        if (videoId && settings.videoSpeeds && settings.videoSpeeds[videoId]) {
            return settings.videoSpeeds[videoId];
        }

        // Check channel speeds second (medium-high priority)
        if (channel && settings.channelSpeeds[channel]) {
            return settings.channelSpeeds[channel];
        }

        // Check genre speeds third (medium priority)
        for (const genre of genres) {
            if (settings.genreSpeeds[genre]) {
                return settings.genreSpeeds[genre];
            }
        }

        // Return default speed (lowest priority)
        return settings.defaultSpeed;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
