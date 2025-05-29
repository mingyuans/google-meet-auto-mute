// Google Meet Auto Mute - Content Script
// Domain Model: Meeting Control Manager

class MeetingControlManager {
    constructor() {
        this.isEnabled = true;
        this.checkInterval = null;
        this.maxRetries = 10;
        this.retryCount = 0;
        this.isCompleted = false;
        this.verificationDelay = 1000; // Wait 1 seconds to verify if devices are actually muted

        this.init();
    }

    async init() {
        // Get user settings
        const result = await chrome.storage.sync.get(['autoMuteEnabled']);
        this.isEnabled = result.autoMuteEnabled !== false; // Default enabled

        if (this.isEnabled) {
            this.startMonitoring();
        }

        // Listen for setting changes
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.autoMuteEnabled) {
                this.isEnabled = changes.autoMuteEnabled.newValue;
                if (this.isEnabled) {
                    this.startMonitoring();
                } else {
                    this.stopMonitoring();
                }
            }
        });
    }

    startMonitoring() {
        console.log('Google Meet Auto Mute: Starting monitoring');

        // Try immediately after page load
        if (document.readyState === 'complete') {
            this.tryAutoMute();
        } else {
            window.addEventListener('load', () => this.tryAutoMute());
        }

        // Periodic check (since Google Meet is SPA with dynamic content)
        this.checkInterval = setInterval(() => {
            this.tryAutoMute();
        }, 2000);
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    isMeetingPage() {
        // Check if we're on a meeting page
        const url = window.location.href;
        return url.includes('meet.google.com/') &&
            (url.includes('/') && url.split('/').length > 3);
    }

    async tryAutoMute() {
        if (!this.isEnabled || !this.isMeetingPage() || this.isCompleted) {
            return;
        }

        try {
            const result = await this.muteAudioAndVideo();
            if (result.success) {
                console.log('Auto mute attempt completed:', result.message);

                // Wait and then verify if devices are actually muted
                setTimeout(() => {
                    this.verifyMuteStatus(result);
                }, this.verificationDelay);

            } else if (this.retryCount < this.maxRetries) {
                this.retryCount++;
            }
        } catch (error) {
            console.error('Auto mute failed:', error);
        }
    }

    async verifyMuteStatus(previousResult) {
        console.log('Verifying mute status...');

        const selectors = {
            micButton: [
                'div[role="button"][aria-label*="mic"]',
                'div[jscontroller][jsaction*="click"]'
            ],
            cameraButton: [
                'div[role="button"][aria-label*="camera"]',
                'div[jscontroller][jsaction*="click"]'
            ]
        };

        const micButton = this.findElement(selectors.micButton);
        const cameraButton = this.findElement(selectors.cameraButton);

        let micStillOn = false;
        let cameraStillOn = false;

        if (micButton) {
            micStillOn = this.isButtonActive(micButton);
            console.log('Mic verification:', {
                stillOn: micStillOn,
                ariaLabel: micButton.getAttribute('aria-label')
            });
        }

        if (cameraButton) {
            cameraStillOn = this.isButtonActive(cameraButton);
            console.log('Camera verification:', {
                stillOn: cameraStillOn,
                ariaLabel: cameraButton.getAttribute('aria-label')
            });
        }

        if (micStillOn || cameraStillOn) {
            // Auto mute failed, show manual prompt
            this.showManualPrompt(micStillOn, cameraStillOn);
        } else {
            // Success - both devices are muted
            console.log('Auto mute successful - both devices are off');
            this.isCompleted = true;
            this.stopMonitoring();

            // Notify background script
            chrome.runtime.sendMessage({
                action: 'autoMuteSuccess',
                timestamp: Date.now(),
                micMuted: true,
                cameraMuted: true
            });
        }
    }

    showManualPrompt(micStillOn, cameraStillOn) {
        console.log('Auto mute failed, showing manual prompt');

        let message = 'Google Meet Auto Mute: Please manually turn off:\n';
        if (micStillOn) message += '• Microphone\n';
        if (cameraStillOn) message += '• Camera\n';
        message += '\nAuto mute will stop monitoring this session.';

        // Show alert
        alert(message);

        // Stop monitoring for this session
        this.isCompleted = true;
        this.stopMonitoring();

        // Notify background script about partial failure
        chrome.runtime.sendMessage({
            action: 'autoMutePartialFailure',
            timestamp: Date.now(),
            micStillOn: micStillOn,
            cameraStillOn: cameraStillOn
        });
    }

    async muteAudioAndVideo() {
        // Google Meet button selectors
        const selectors = {
            micButton: [
                'div[role="button"][aria-label*="mic"]',
                'div[jscontroller][jsaction*="click"]'
            ],
            cameraButton: [
                'div[role="button"][aria-label*="camera"]',
                'div[jscontroller][jsaction*="click"]'
            ]
        };

        let micClicked = false;
        let cameraClicked = false;
        let messages = [];

        // Mute microphone
        const micButton = this.findElement(selectors.micButton);
        if (micButton) {
            const isMicOn = this.isButtonActive(micButton);
            console.log('Microphone button status:', {
                element: micButton,
                isMicOn,
                ariaLabel: micButton.getAttribute('aria-label')
            });

            if (isMicOn) {
                console.log("Attempting to turn off microphone...");
                try {
                    micButton.click();
                    micClicked = true;
                    messages.push('Microphone clicked');
                    console.log("Microphone click executed");
                } catch (error) {
                    if (error.message && !error.message.includes('className.match')) {
                        console.warn("Error clicking microphone:", error);
                    }
                    micClicked = true;
                    messages.push('Microphone clicked (with internal error)');
                }
            } else {
                messages.push('Microphone already off');
                console.log("Microphone already off");
            }
        } else {
            console.log("Microphone button not found");
            messages.push('Microphone button not found');
        }

        // Turn off camera
        const cameraButton = this.findElement(selectors.cameraButton);
        if (cameraButton) {
            const isCameraOn = this.isButtonActive(cameraButton);
            console.log('Camera button status:', {
                element: cameraButton,
                isCameraOn,
                ariaLabel: cameraButton.getAttribute('aria-label')
            });

            if (isCameraOn) {
                console.log("Attempting to turn off camera...");
                try {
                    cameraButton.click();
                    cameraClicked = true;
                    messages.push('Camera clicked');
                    console.log("Camera click executed");
                } catch (error) {
                    if (error.message && !error.message.includes('className.match')) {
                        console.warn("Error clicking camera:", error);
                    }
                    cameraClicked = true;
                    messages.push('Camera clicked (with internal error)');
                }
            } else {
                messages.push('Camera already off');
                console.log("Camera already off");
            }
        } else {
            console.log("Camera button not found");
            messages.push('Camera button not found');
        }

        const success = micButton && cameraButton;

        return {
            success,
            micClicked,
            cameraClicked,
            message: messages.join(', ') || 'No control buttons found'
        };
    }

    findElement(selectors) {
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);

            // For generic selectors, need further filtering
            if (selector.includes('jscontroller') || selector.includes('jsaction')) {
                // Filter for actual media control buttons
                for (const element of elements) {
                    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
                    if (ariaLabel.includes('mic') || ariaLabel.includes('camera')) {
                        return element;
                    }
                }
            } else {
                // For specific selectors, return first found
                if (elements.length > 0) {
                    return elements[0];
                }
            }
        }
        return null;
    }

    isButtonActive(button) {
        // Check if button represents "on" state
        const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();

        // Google Meet state logic:
        // - "Turn off microphone" = microphone is currently on
        // - "Turn on microphone" = microphone is currently off
        // - "Turn off camera" = camera is currently on
        // - "Turn on camera" = camera is currently off

        const isCurrentlyOn = (
            ariaLabel.includes('turn off') ||
            ariaLabel.includes('mute microphone') ||
            ariaLabel.includes('disable camera')
        );

        console.log(`Button state check: "${ariaLabel}" -> currently on: ${isCurrentlyOn}`);

        return isCurrentlyOn;
    }
}

// Initialize
const meetingController = new MeetingControlManager();

// Page navigation listener (handle SPA routing)
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('Page URL changed, resetting state');
        meetingController.retryCount = 0;
        meetingController.isCompleted = false;

        // If new meeting page and plugin enabled, restart monitoring
        if (meetingController.isEnabled && meetingController.isMeetingPage()) {
            meetingController.startMonitoring();
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Page refresh listener
window.addEventListener('beforeunload', () => {
    console.log('Page about to refresh, resetting state');
    meetingController.isCompleted = false;
});

// Page load complete listener
window.addEventListener('load', () => {
    console.log('Page load complete, resetting state');
    meetingController.isCompleted = false;
});