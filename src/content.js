/**
 * Content script - runs on YouTube pages to control video playback speed
 * Injected into the page context to access video element
 */

class YouTubeSpeedController {
    constructor() {
        console.log('YouTube Go Brrr content: Controller constructor called');
        this.lastAppliedSpeed = null;
        this.checkInterval = null;
        this.videoElement = null;
        this.lastUrl = window.location.href;
        this.init();
    }

    init() {
        console.log('YouTube Go Brrr content: init() called, URL:', window.location.href);
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('YouTube Go Brrr content: Received message:', request.action);

            if (request.action === MESSAGE_ACTIONS.PING) {
                console.log('YouTube Go Brrr content: Received ping, responding');
                sendResponse({ status: 'ready' });
                return;
            }

            if (request.action === MESSAGE_ACTIONS.GET_SPEED) {
                console.log(
                    'YouTube Go Brrr content: Returning speed:',
                    this.lastAppliedSpeed || NORMAL_SPEED
                );
                sendResponse({ speed: this.lastAppliedSpeed || NORMAL_SPEED });
                return;
            }

            if (request.action === MESSAGE_ACTIONS.GET_VIDEO_INFO) {
                this.extractVideoInfo().then((videoInfo) => {
                    console.log('YouTube Go Brrr content: Returning video info:', videoInfo);
                    sendResponse(videoInfo);
                });
                return true; // Keep the channel open for async response
            }

            if (request.action === MESSAGE_ACTIONS.REAPPLY_SPEED) {
                console.log(
                    'YouTube Go Brrr content: Reapplying speed, isDisabled:',
                    request.isDisabled
                );
                if (request.isDisabled !== undefined) {
                    // Use the disabled state from the message to avoid race conditions with storage
                    this.applySpeedWithDisabledState(request.isDisabled);
                } else {
                    // Fallback to reading from storage if isDisabled not provided
                    this.applySpeed();
                }
                sendResponse({ success: true });
                return;
            }

            if (request.action === MESSAGE_ACTIONS.GET_VIDEO_ID) {
                const videoId = this.getVideoId();
                console.log('YouTube Go Brrr content: Returning video ID:', videoId);
                sendResponse({ videoId });
                return;
            }

            if (request.action === MESSAGE_ACTIONS.GET_CHANNEL_INFO) {
                console.log('YouTube Go Brrr content: Getting channel info...');
                // Resolve channel asynchronously to allow late-loading DOM
                this.resolveChannelName().then((channel) => {
                    console.log('YouTube Go Brrr content: Resolved channel:', channel);
                    sendResponse({ channel });
                });
                return true; // async response
            }

            if (request.action === MESSAGE_ACTIONS.GET_GENRE_INFO) {
                console.log('YouTube Go Brrr content: Getting genre info...');
                const genres = this.extractGenres();
                console.log('YouTube Go Brrr content: Extracted genres:', genres);
                sendResponse({ genres });
                return;
            }
        });

        // Listen for storage changes to update speed when settings are edited
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === STORAGE_AREA) {
                this.applySpeed();
            }
        });

        // Apply speed once when video appears
        this.setupVideoObserver();

        // Listen for YouTube's SPA navigation (client-side routing)
        this.setupNavigationListener();
    }

    setupNavigationListener() {
        // Detect URL changes for YouTube's SPA navigation
        const checkUrlChange = () => {
            const currentUrl = window.location.href;
            if (currentUrl !== this.lastUrl) {
                this.lastUrl = currentUrl;
                // Reset state and reapply speed for new video
                this.lastAppliedSpeed = null;
                // Wait a bit for YouTube to update the video element
                setTimeout(() => this.applySpeed(), NAVIGATION_DELAY);
            }
        };

        // Listen to history API changes (pushState/replaceState)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            checkUrlChange();
        };

        history.replaceState = function (...args) {
            originalReplaceState.apply(this, args);
            checkUrlChange();
        };

        // Also listen to popstate for back/forward navigation
        window.addEventListener(DOM_EVENTS.POP_STATE, checkUrlChange);

        // YouTube sometimes uses yt-navigate events
        document.addEventListener(DOM_EVENTS.YT_NAVIGATE_FINISH, () => {
            checkUrlChange();
        });
    }

    setupVideoObserver() {
        // Wait for document to be ready before observing
        if (document.body) {
            this.startObserving();
        } else {
            document.addEventListener(DOM_EVENTS.DOM_CONTENT_LOADED, () => this.startObserving());
        }
    }

    startObserving() {
        // Use MutationObserver to detect when video element is added to DOM
        const observer = new MutationObserver(() => {
            const video = document.querySelector(SELECTORS.VIDEO);
            if (video && video !== this.videoElement) {
                this.videoElement = video;
                this.lastAppliedSpeed = null;
                this.applySpeed();
            }
        });

        observer.observe(document.body, MUTATION_OBSERVER_CONFIG);
    }

    async applySpeed() {
        const video = this.videoElement;
        if (!video) return;

        try {
            const videoId = this.getVideoId();

            // Check if video is disabled
            if (videoId) {
                const isDisabled = await this.isVideoDisabled(videoId);
                if (isDisabled) {
                    return;
                }
            }

            const videoInfo = await this.extractVideoInfo();
            const speed = await this.getApplicableSpeed(videoInfo);

            if (speed && speed !== this.lastAppliedSpeed) {
                video.playbackRate = speed;
                this.lastAppliedSpeed = speed;
            }
        } catch (error) {
            console.error('YouTube Go Brrr: Error applying speed', error);
            // Continue monitoring - don't stop on error
        }
    }

    async applySpeedWithDisabledState(isDisabled) {
        const video = this.videoElement;
        if (!video) return;

        try {
            if (isDisabled) {
                video.playbackRate = NORMAL_SPEED;
                this.lastAppliedSpeed = NORMAL_SPEED;
                return;
            }

            const videoInfo = await this.extractVideoInfo();
            const speed = await this.getApplicableSpeed(videoInfo);

            if (speed && speed !== this.lastAppliedSpeed) {
                video.playbackRate = speed;
                this.lastAppliedSpeed = speed;
            }
        } catch (error) {
            console.error('YouTube Go Brrr: Error applying speed with disabled state', error);
        }
    }

    async extractVideoInfo() {
        const channel = await this.resolveChannelName();
        const genres = this.extractGenres();
        const videoId = this.getVideoId();

        console.log('YouTube Go Brrr content: extractVideoInfo - channel:', channel);
        console.log('YouTube Go Brrr content: extractVideoInfo - genres:', genres);
        console.log('YouTube Go Brrr content: extractVideoInfo - videoId:', videoId);

        const result = {
            videoId,
            channel,
            genres,
        };

        console.log('YouTube Go Brrr content: extractVideoInfo - returning:', result);
        return result;
    }

    getChannelName() {
        console.log('YouTube Go Brrr content: getChannelName() called');
        console.log('YouTube Go Brrr content: URL:', window.location.href);

        // Primary: channel link in the watch page header
        const channelElement = document.querySelector(SELECTORS.CHANNEL_PRIMARY);
        if (channelElement && channelElement.textContent) {
            const channel = channelElement.textContent.trim();
            console.log(
                'YouTube Go Brrr content: Found channel in primary selector:',
                channel,
                'from element:',
                channelElement
            );
            return channel;
        }

        // Alternate DOM locations (owner renderer, shorts overlay/header)
        for (const selector of SELECTORS.CHANNEL_ALTERNATES) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                const name = el.textContent.trim();
                console.log(
                    'YouTube Go Brrr content: Found channel via',
                    selector,
                    ':',
                    name,
                    'from element:',
                    el
                );
                return name;
            }
        }

        // Player response author
        const playerResponse = window.ytInitialPlayerResponse;
        if (playerResponse && playerResponse.videoDetails && playerResponse.videoDetails.author) {
            const author = playerResponse.videoDetails.author.trim();
            console.log(
                'YouTube Go Brrr content: Found channel in ytInitialPlayerResponse:',
                author
            );
            return author;
        }

        // ytplayer config player_response
        const ytPlayerConfig =
            window.ytplayer && window.ytplayer.config && window.ytplayer.config.args;
        if (ytPlayerConfig && ytPlayerConfig.player_response) {
            try {
                const parsed =
                    typeof ytPlayerConfig.player_response === 'string'
                        ? JSON.parse(ytPlayerConfig.player_response)
                        : ytPlayerConfig.player_response;
                const author = parsed && parsed.videoDetails && parsed.videoDetails.author;
                if (author) {
                    return author.trim();
                }
            } catch (e) {
                // Ignore
            }
        }

        // ytInitialData owner extraction
        const initialDataOwner = this.extractOwnerFromInitialData(window.ytInitialData);
        if (initialDataOwner) {
            return initialDataOwner;
        }

        // Structured data author name
        const jsonLd = document.querySelector(SELECTORS.JSON_LD);
        if (jsonLd) {
            try {
                const data = JSON.parse(jsonLd.textContent);
                if (data.author && data.author.name) {
                    return data.author.name.trim();
                }
                if (Array.isArray(data.author) && data.author.length && data.author[0].name) {
                    return data.author[0].name.trim();
                }
            } catch (e) {
                // Ignore
            }
        }

        // Meta tag with channel id or author
        const channelIdMeta = document.querySelector(SELECTORS.CHANNEL_ID_META);
        if (channelIdMeta && channelIdMeta.content) {
            return channelIdMeta.content.trim();
        }
        const authorMeta = document.querySelector(SELECTORS.AUTHOR_META);
        if (authorMeta && authorMeta.content) {
            return authorMeta.content.trim();
        }

        // URL-based handle or channel id
        return this.extractChannelFromUrl();
    }

    async resolveChannelName(
        maxAttempts = MAX_CHANNEL_RESOLVE_ATTEMPTS,
        delayMs = CHANNEL_RESOLVE_DELAY
    ) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const channel = this.getChannelName();
            if (channel) {
                return channel;
            }
            if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, delayMs));
            }
        }
        return null;
    }

    extractChannelFromUrl() {
        const url = window.location.href;

        const handleMatch = url.match(PATTERNS.HANDLE);
        if (handleMatch && handleMatch[1]) {
            return handleMatch[1];
        }

        const channelIdMatch = url.match(PATTERNS.CHANNEL_ID);
        if (channelIdMatch && channelIdMatch[1]) {
            return channelIdMatch[1];
        }

        return null;
    }

    getVideoId() {
        // Extract video ID from URL
        // Handles both /watch?v=VIDEO_ID and /shorts/VIDEO_ID
        const url = window.location.href;

        // Check for /watch?v=VIDEO_ID format
        const watchMatch = url.match(PATTERNS.VIDEO_ID);
        if (watchMatch && watchMatch[1]) {
            return watchMatch[1];
        }

        // Check for /shorts/VIDEO_ID format
        const shortsMatch = url.match(PATTERNS.SHORTS_VIDEO_ID);
        if (shortsMatch && shortsMatch[1]) {
            return shortsMatch[1];
        }

        return null;
    }

    extractOwnerFromInitialData(data) {
        if (!data || typeof data !== 'object') return null;

        const tryOwner = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            const vor = obj.videoOwnerRenderer;
            if (
                vor &&
                vor.title &&
                Array.isArray(vor.title.runs) &&
                vor.title.runs[0] &&
                vor.title.runs[0].text
            ) {
                return vor.title.runs[0].text.trim();
            }
            return null;
        };

        // Specific likely locations
        const twoColumn = data.contents && data.contents.twoColumnWatchNextResults;
        if (
            twoColumn &&
            twoColumn.results &&
            twoColumn.results.results &&
            Array.isArray(twoColumn.results.results.contents)
        ) {
            for (const c of twoColumn.results.results.contents) {
                const owner =
                    tryOwner(c) ||
                    tryOwner(c.videoSecondaryInfoRenderer && c.videoSecondaryInfoRenderer.owner);
                if (owner) return owner;
            }
        }

        // Shorts rich grid or other nested areas: fallback to deep search
        const stack = [data];
        while (stack.length) {
            const node = stack.pop();
            const owner = tryOwner(node);
            if (owner) return owner;
            if (node && typeof node === 'object') {
                for (const val of Object.values(node)) {
                    if (val && typeof val === 'object') {
                        stack.push(val);
                    }
                }
            }
        }
        return null;
    }

    extractGenres() {
        console.log('YouTube Go Brrr content: extractGenres() called');
        // Try to get video categories/genres from multiple sources (robust)
        const genres = [];

        // Helper function to decode HTML entities and unicode escapes
        const decodeText = (text) => {
            // Decode HTML entities
            const textarea = document.createElement('textarea');
            textarea.innerHTML = text;
            let decoded = textarea.value;

            // Decode unicode escapes (e.g., \u0026 -> &)
            try {
                decoded = decoded.replace(PATTERNS.UNICODE_ESCAPE, (match) => {
                    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
                });
            } catch (e) {
                console.log('YouTube Go Brrr content: Error decoding unicode escapes:', e);
            }

            return decoded;
        };

        // 1) Structured data (JSON-LD)
        const jsonLd = document.querySelector(SELECTORS.JSON_LD);
        if (jsonLd) {
            try {
                const data = JSON.parse(jsonLd.textContent);
                console.log('YouTube Go Brrr content: Found JSON-LD data:', data);
                // keywords is a comma-separated string sometimes available
                if (data.keywords && typeof data.keywords === 'string') {
                    const keywords = data.keywords
                        .split(',')
                        .map((k) => decodeText(k.trim()).toLowerCase())
                        .filter(Boolean);
                    if (keywords.length) {
                        console.log('YouTube Go Brrr content: Found keywords:', keywords);
                        genres.push(...keywords);
                    }
                }
                // Some JSON-LD variants may include a genre field (string or array)
                if (data.genre) {
                    const genreValues = Array.isArray(data.genre) ? data.genre : [data.genre];
                    const cleaned = genreValues
                        .map((g) =>
                            typeof g === 'string' ? decodeText(g.trim()).toLowerCase() : ''
                        )
                        .filter(Boolean);
                    if (cleaned.length) {
                        console.log('YouTube Go Brrr content: Found JSON-LD genre:', cleaned);
                        genres.push(...cleaned);
                    }
                }
            } catch (e) {
                console.log('YouTube Go Brrr content: Error parsing JSON-LD:', e);
            }
        }

        // 2) Page metadata
        const categoryMeta = document.querySelector(SELECTORS.GENRE_META);
        if (categoryMeta && categoryMeta.content) {
            const category = decodeText(categoryMeta.content).toLowerCase();
            console.log('YouTube Go Brrr content: Found category meta:', category);
            genres.push(category);
        }

        // 3) Fallback: parse category from ytInitialPlayerResponse microformat
        //    microformat.playerMicroformatRenderer.category is typically "Music", "Entertainment", etc.
        const categoryFromPlayer = this.extractCategoryFromPlayerResponse();
        if (categoryFromPlayer) {
            const lc = decodeText(categoryFromPlayer).toLowerCase();
            console.log('YouTube Go Brrr content: Found category from player response:', lc);
            genres.push(lc);
        }

        // Dedupe and return
        const deduped = Array.from(new Set(genres));
        console.log('YouTube Go Brrr content: Final extracted genres:', deduped);
        return deduped;
    }

    extractCategoryFromPlayerResponse() {
        try {
            // Scan inline <script> tags for a JSON blob containing playerMicroformatRenderer.category
            const scripts = document.querySelectorAll('script');

            for (const s of scripts) {
                const text = s.textContent || '';
                if (!text) continue;
                // Quick filter to avoid heavy regex on unrelated scripts
                if (text.includes('playerMicroformatRenderer') && text.includes('category')) {
                    const m = PATTERNS.CATEGORY.exec(text);
                    if (m && m[1]) {
                        return m[1];
                    }
                }
            }
        } catch (e) {
            console.log(
                'YouTube Go Brrr content: Error extracting category from player response:',
                e
            );
        }
        return null;
    }

    async getApplicableSpeed(videoInfo) {
        return new Promise((resolve) => {
            try {
                // Check if chrome.storage is available before attempting to use it
                if (!chrome?.storage?.sync) {
                    console.warn(
                        'YouTube Go Brrr: chrome.storage unavailable, using default speed'
                    );
                    resolve(DEFAULT_SPEED);
                    return;
                }
                try {
                    const defaultSettings = {};
                    defaultSettings[STORAGE_KEYS.DEFAULT_SPEED] = DEFAULT_SPEED;
                    defaultSettings[STORAGE_KEYS.GENRE_SPEEDS] = DEFAULT_GENRE_SPEEDS;
                    defaultSettings[STORAGE_KEYS.CHANNEL_SPEEDS] = DEFAULT_CHANNEL_SPEEDS;
                    defaultSettings[STORAGE_KEYS.VIDEO_SPEEDS] = DEFAULT_VIDEO_SPEEDS;

                    chrome.storage.sync.get(defaultSettings, (settings) => {
                        try {
                            // Safely check if extension context is still valid
                            // Avoid any chrome API access that might throw
                            if (settings === undefined || !settings) {
                                console.warn(
                                    'YouTube Go Brrr: No settings returned, using default speed'
                                );
                                resolve(DEFAULT_SPEED);
                                return;
                            }
                            const speed = this.determineSpeed(videoInfo, settings);
                            resolve(speed);
                        } catch (callbackError) {
                            console.error(
                                'YouTube Go Brrr: Error in storage callback:',
                                callbackError
                            );
                            resolve(DEFAULT_SPEED);
                        }
                    });
                } catch (storageError) {
                    console.error(
                        'YouTube Go Brrr: Error calling chrome.storage.sync.get (likely extension context invalidated)'
                    );
                    resolve(DEFAULT_SPEED);
                }
            } catch (error) {
                console.warn('YouTube Go Brrr: Unexpected error in getApplicableSpeed', error);
                resolve(DEFAULT_SPEED); // Return default speed on error
            }
        });
    }

    determineSpeed(videoInfo, settings) {
        const { channel, genres, videoId } = videoInfo;

        // Check video-specific speeds first (highest priority)
        if (videoId && settings.videoSpeeds && settings.videoSpeeds[videoId]) {
            return settings.videoSpeeds[videoId];
        }

        // Check channel speeds second (medium-high priority) - case insensitive exact match
        if (channel) {
            const channelKey = Object.keys(settings.channelSpeeds).find(
                (key) => key.toLowerCase() === channel.toLowerCase()
            );
            if (channelKey) {
                return settings.channelSpeeds[channelKey];
            }
        }

        // Check genre speeds (medium priority) - check ALL genres and use lowest speed
        let lowestGenreSpeed = null;
        for (const genre of genres) {
            const genreKey = Object.keys(settings.genreSpeeds).find(
                (key) => key.toLowerCase() === genre.toLowerCase()
            );
            if (genreKey) {
                const genreSpeed = settings.genreSpeeds[genreKey];
                if (lowestGenreSpeed === null || genreSpeed < lowestGenreSpeed) {
                    lowestGenreSpeed = genreSpeed;
                }
            }
        }

        if (lowestGenreSpeed !== null) {
            return lowestGenreSpeed;
        }

        // Return default speed (lowest priority)
        return settings.defaultSpeed;
    }

    isVideoDisabled(videoId) {
        return new Promise((resolve) => {
            if (!videoId) {
                resolve(false);
                return;
            }

            try {
                if (!chrome?.storage?.sync) {
                    console.warn('YouTube Go Brrr: chrome.storage unavailable');
                    resolve(false);
                    return;
                }

                const defaultSettings = {};
                defaultSettings[STORAGE_KEYS.DISABLED_VIDEO_IDS] = DEFAULT_DISABLED_VIDEO_IDS;

                chrome.storage.sync.get(defaultSettings, (settings) => {
                    if (chrome.runtime.lastError) {
                        console.warn(
                            'YouTube Go Brrr: Error checking disabled videos',
                            chrome.runtime.lastError
                        );
                        resolve(false);
                        return;
                    }
                    const isDisabled = !!settings[STORAGE_KEYS.DISABLED_VIDEO_IDS][videoId];
                    resolve(isDisabled);
                });
            } catch (error) {
                console.error('YouTube Go Brrr: Error in isVideoDisabled', error);
                resolve(false);
            }
        });
    }
}

// Initialize the controller (no binding needed; constructor sets up listeners)
console.log('YouTube Go Brrr content: Creating new YouTubeSpeedController');
new YouTubeSpeedController();
console.log('YouTube Go Brrr content: Controller created successfully');
