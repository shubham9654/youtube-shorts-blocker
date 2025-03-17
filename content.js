let isEnabled = true;
let timeoutId = null;

// Debounce function to prevent too frequent updates
function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            timeoutId = null;
            func(...args);
        };
        clearTimeout(timeoutId);
        timeoutId = setTimeout(later, wait);
    };
}

// Function to check if an element contains Shorts content
function isShortContent(element) {
    const text = element.textContent.toLowerCase();
    return text.includes('shorts') || 
           element.querySelector('[overlay-style="SHORTS"]') !== null ||
           element.hasAttribute('is-shorts') ||
           element.getAttribute('page-type') === 'SHORTS';
}

// Function to remove Shorts elements
function removeShorts() {
    if (!isEnabled) return;

    // Basic selectors that don't use complex pseudo-selectors
    const basicSelectors = [
        // Sidebar and Navigation
        'ytd-guide-entry-renderer[title="Shorts"]',
        'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
        'ytd-guide-entry-renderer[aria-label="Shorts"]',
        
        // Main Content
        'ytd-rich-section-renderer',
        'ytd-reel-shelf-renderer',
        'ytd-rich-item-renderer[is-shorts]',
        'ytd-reel-item-renderer',
        
        // Shorts specific elements
        'ytd-shorts',
        'ytd-shorts-player-page',
        'ytd-shorts-video-renderer',
        
        // Video elements
        'ytd-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-rich-grid-row',
        'ytd-compact-video-renderer',
        'ytd-rich-section-renderer',
        'ytd-shelf-renderer',
        '[overlay-style="SHORTS"]',
        '[is-shorts]',
        '[page-type="SHORTS"]'
    ];

    // Remove elements based on basic selectors and content check
    document.querySelectorAll(basicSelectors.join(','))
        .forEach(element => {
            if (isShortContent(element)) {
                element.style.display = 'none';
            }
        });

    // Handle sidebar items specifically
    document.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer')
        .forEach(element => {
            const titleElement = element.querySelector('a[title="Shorts"]');
            if (titleElement || isShortContent(element)) {
                element.style.display = 'none';
            }
        });

    // Handle video thumbnails with Shorts badge
    document.querySelectorAll('ytd-thumbnail-overlay-time-status-renderer')
        .forEach(badge => {
            if (badge.getAttribute('overlay-style') === 'SHORTS') {
                const container = badge.closest('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer');
                if (container) {
                    container.style.display = 'none';
                }
            }
        });
}

// Function to show Shorts elements
function showShorts() {
    // Show all potentially hidden elements
    const basicSelectors = [
        'ytd-guide-entry-renderer',
        'ytd-mini-guide-entry-renderer',
        'ytd-rich-section-renderer',
        'ytd-reel-shelf-renderer',
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-rich-grid-row',
        'ytd-compact-video-renderer',
        'ytd-shelf-renderer',
        'ytd-shorts',
        'ytd-shorts-player-page',
        'ytd-shorts-video-renderer',
        '[overlay-style="SHORTS"]',
        '[is-shorts]',
        '[page-type="SHORTS"]'
    ];

    document.querySelectorAll(basicSelectors.join(','))
        .forEach(element => {
            element.style.display = '';
        });
}

// Initialize the extension
function initializeExtension() {
    // Load initial state
    chrome.storage.sync.get(['enabled'], function(result) {
        isEnabled = result.enabled === undefined ? true : result.enabled;
        if (isEnabled) {
            removeShorts();
        }
    });

    // Create a MutationObserver to watch for dynamic content changes
    const debouncedRemoveShorts = debounce(removeShorts, 250);
    
    const observer = new MutationObserver((mutations) => {
        if (!isEnabled) return;

        // Check if any relevant mutations occurred
        const shouldUpdate = mutations.some(mutation => {
            // Check if added nodes contain shorts
            const hasNewShorts = Array.from(mutation.addedNodes).some(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return false;
                return isShortContent(node);
            });

            // Check if the mutation is on a relevant attribute
            const isRelevantAttribute = mutation.type === 'attributes' && 
                ['style', 'is-shorts', 'overlay-style'].includes(mutation.attributeName);

            return hasNewShorts || isRelevantAttribute;
        });

        if (shouldUpdate) {
            debouncedRemoveShorts();
        }
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'is-shorts', 'overlay-style']
    });

    // Run initial cleanup
    if (isEnabled) {
        removeShorts();
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleShortsRemoval') {
        isEnabled = request.enabled;
        if (isEnabled) {
            removeShorts();
        } else {
            showShorts();
        }
        sendResponse({ success: true });
    }
    return true;
});

// Initialize when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}

// Handle scroll events for infinite loading
let scrollTimeout = null;
window.addEventListener('scroll', () => {
    if (!isEnabled) return;
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        removeShorts();
    }, 500);
}, { passive: true }); 