/**
 * Constants and configuration values for YouTube Go Brrr extension
 */

// Default Settings
const DEFAULT_SPEED = 2.3;
const DEFAULT_GENRE_SPEEDS = {
    Music: 1,
    Comedy: 1,
};
const DEFAULT_CHANNEL_SPEEDS = {};
const DEFAULT_VIDEO_SPEEDS = {};
const DEFAULT_DISABLED_VIDEO_IDS = {};

// Speed Limits
const MIN_SPEED = 0.25;
const MAX_SPEED = 16;
const SPEED_STEP = 0.1;
const NORMAL_SPEED = 1;

// Timing/Delays (in milliseconds)
const NAVIGATION_DELAY = 100;
const CHANNEL_RESOLVE_DELAY = 500;
const MAX_CHANNEL_RESOLVE_ATTEMPTS = 10;
const CONTENT_SCRIPT_INJECTION_WAIT = 1000;
const STATUS_MESSAGE_TIMEOUT = 2000;

// Video ID Display
const VIDEO_ID_DISPLAY_LENGTH = 6;

// Storage Keys
const STORAGE_KEYS = {
    DEFAULT_SPEED: 'defaultSpeed',
    GENRE_SPEEDS: 'genreSpeeds',
    CHANNEL_SPEEDS: 'channelSpeeds',
    VIDEO_SPEEDS: 'videoSpeeds',
    DISABLED_VIDEO_IDS: 'disabledVideoIds',
};

// Storage Area
const STORAGE_AREA = 'sync';

// Message Actions
const MESSAGE_ACTIONS = {
    INSTALL: 'install',
    PING: 'ping',
    GET_SPEED: 'getSpeed',
    GET_VIDEO_INFO: 'getVideoInfo',
    REAPPLY_SPEED: 'reapplySpeed',
    GET_VIDEO_ID: 'getVideoId',
    GET_CHANNEL_INFO: 'getChannelInfo',
    GET_GENRE_INFO: 'getGenreInfo',
    GET_SETTINGS: 'getSettings',
    UPDATE_SETTINGS: 'updateSettings',
};

// Regex Patterns
const PATTERNS = {
    // YouTube video ID: 11 characters of alphanumeric, underscore, or hyphen
    VIDEO_ID: /[?&]v=([a-zA-Z0-9_-]{11})/,
    SHORTS_VIDEO_ID: /\/shorts\/([a-zA-Z0-9_-]{11})/,
    // URL patterns
    HANDLE: /\/(@[^/?#]+)/,
    CHANNEL_ID: /\/channel\/([^/?#]+)/,
    // Category extraction pattern
    CATEGORY: /"playerMicroformatRenderer"\s*:\s*\{[\s\S]*?"category"\s*:\s*"([^"]+)"/,
    // Unicode escape pattern
    UNICODE_ESCAPE: /\\u[\dA-Fa-f]{4}/g,
};

// DOM Selectors
const SELECTORS = {
    // Video element
    VIDEO: 'video',
    // Channel selectors (in priority order)
    CHANNEL_PRIMARY: '.ytd-channel-name > ytd-channel-name > a',
    CHANNEL_ALTERNATES: [
        'ytd-video-owner-renderer a',
        '#owner-name a',
        '#channel-name a',
        'ytd-reel-player-header-renderer a',
        'ytd-reel-player-overlay-renderer a',
        '.ytd-channel-name a',
    ],
    // Metadata selectors
    JSON_LD: 'script[type="application/ld+json"]',
    GENRE_META: 'meta[itemprop="genre"]',
    CHANNEL_ID_META: 'meta[itemprop="channelId"]',
    AUTHOR_META: 'meta[itemprop="author"], meta[name="author"]',
};

// MutationObserver config
const MUTATION_OBSERVER_CONFIG = {
    childList: true,
    subtree: true,
};

// DOM Events
const DOM_EVENTS = {
    DOM_CONTENT_LOADED: 'DOMContentLoaded',
    POP_STATE: 'popstate',
    YT_NAVIGATE_FINISH: 'yt-navigate-finish',
};

const EXPORTED_CONSTANTS = {
    DEFAULT_SPEED,
    DEFAULT_GENRE_SPEEDS,
    DEFAULT_CHANNEL_SPEEDS,
    DEFAULT_VIDEO_SPEEDS,
    DEFAULT_DISABLED_VIDEO_IDS,
    MIN_SPEED,
    MAX_SPEED,
    SPEED_STEP,
    NORMAL_SPEED,
    NAVIGATION_DELAY,
    CHANNEL_RESOLVE_DELAY,
    MAX_CHANNEL_RESOLVE_ATTEMPTS,
    CONTENT_SCRIPT_INJECTION_WAIT,
    STATUS_MESSAGE_TIMEOUT,
    VIDEO_ID_DISPLAY_LENGTH,
    STORAGE_KEYS,
    STORAGE_AREA,
    MESSAGE_ACTIONS,
    PATTERNS,
    SELECTORS,
    MUTATION_OBSERVER_CONFIG,
    DOM_EVENTS,
};

// Export for use in other modules (CommonJS) and expose for tests.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EXPORTED_CONSTANTS;
    if (typeof globalThis !== 'undefined') {
        Object.assign(globalThis, EXPORTED_CONSTANTS);
    }
}
