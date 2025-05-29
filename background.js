// Google Meet Auto Mute - Background Service Worker

class BackgroundManager {
    constructor() {
        this.setupEventListeners();
        this.initializeSettings();
    }

    setupEventListeners() {
        // Initialize settings on first install
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                this.onFirstInstall();
            }
        });

        // Receive messages from content scripts
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep the message channel open for sendResponse
        });

        // Watch for tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });
    }

    async initializeSettings() {
        // Check if settings exist, if not, set defaults
        const result = await chrome.storage.sync.get([
            'autoMuteEnabled',
            'notificationEnabled',
            'statistics'
        ]);

        const defaults = {
            autoMuteEnabled: true,
            notificationEnabled: true,
            statistics: {
                totalMeetings: 0,
                totalMutes: 0,
                lastUsed: null
            }
        };

        // 只设置未存在的值
        const updates = {};
        Object.keys(defaults).forEach(key => {
            if (!(key in result)) {
                updates[key] = defaults[key];
            }
        });

        if (Object.keys(updates).length > 0) {
            await chrome.storage.sync.set(updates);
        }
    }

    onFirstInstall() {
        console.log('🎥 Google Meet Auto Mute Installed!');

        // You can add any first-time setup logic here
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome.html')
        });
    }

    async handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'autoMuteSuccess':
                await this.recordMuteSuccess(message.timestamp);
                break;

            case 'getStatistics':
                const stats = await this.getStatistics();
                sendResponse(stats);
                break;

            case 'resetStatistics':
                await this.resetStatistics();
                sendResponse({ success: true });
                break;

            default:
                console.log('Unknown message:', message);
        }
    }

    async handleTabUpdate(tabId, changeInfo, tab) {
        // When a tab is updated, check if it's a Google Meet page
        if (changeInfo.status === 'complete' &&
            tab.url &&
            tab.url.includes('meet.google.com/')) {

            await this.recordMeetingAccess();

            // Update icon based on whether it's a Meet page
            await this.updateIcon(tabId, true);
        }
    }

    async recordMuteSuccess(timestamp) {
        const result = await chrome.storage.sync.get(['statistics']);
        const stats = result.statistics || {
            totalMeetings: 0,
            totalMutes: 0,
            lastUsed: null
        };

        stats.totalMutes++;
        stats.lastUsed = timestamp;

        await chrome.storage.sync.set({ statistics: stats });

        // Send a notification if enabled
        const settings = await chrome.storage.sync.get(['notificationEnabled']);
        if (settings.notificationEnabled) {
            this.showNotification('Executed successfully!', 'Your microphone and camera have been muted automatically.');
        }
    }

    async recordMeetingAccess() {
        const result = await chrome.storage.sync.get(['statistics']);
        const stats = result.statistics || {
            totalMeetings: 0,
            totalMutes: 0,
            lastUsed: null
        };

        stats.totalMeetings++;
        await chrome.storage.sync.set({ statistics: stats });
    }

    async getStatistics() {
        const result = await chrome.storage.sync.get(['statistics']);
        return result.statistics || {
            totalMeetings: 0,
            totalMutes: 0,
            lastUsed: null
        };
    }

    async resetStatistics() {
        const resetStats = {
            totalMeetings: 0,
            totalMutes: 0,
            lastUsed: null
        };

        await chrome.storage.sync.set({ statistics: resetStats });
    }

    async updateIcon(tabId, isMeetPage) {
        const iconPath = isMeetPage ?
            {
                16: 'icons/icon16.png',
                48: 'icons/icon48.png',
                128: 'icons/icon128.png'
            } :
            {
                16: 'icons/icon16_gray.png',
                48: 'icons/icon48_gray.png',
                128: 'icons/icon128_gray.png'
            };

        try {
            await chrome.action.setIcon({
                tabId: tabId,
                path: iconPath
            });
        } catch (error) {
            // Ignore errors if the tab is closed or invalid
        }
    }

    showNotification(title, message) {
        // Create a notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: title,
            message: message
        });
    }
}

// Initialize the BackgroundManager
const backgroundManager = new BackgroundManager();