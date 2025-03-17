document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const statusText = document.getElementById('status');

    // Load saved state
    chrome.storage.sync.get(['enabled'], function(result) {
        toggleSwitch.checked = result.enabled === undefined ? true : result.enabled;
        updateStatus(toggleSwitch.checked);
    });

    // Handle toggle changes
    toggleSwitch.addEventListener('change', function() {
        const isEnabled = toggleSwitch.checked;
        
        // Save state
        chrome.storage.sync.set({ enabled: isEnabled });
        
        // Update UI
        updateStatus(isEnabled);

        // Send message to content script
        chrome.tabs.query({url: "*://*.youtube.com/*"}, function(tabs) {
            if (tabs.length > 0) {
                tabs.forEach(tab => {
                    try {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'toggleShortsRemoval',
                            enabled: isEnabled
                        }).catch(error => {
                            console.log('Tab message failed:', error);
                            // If the content script isn't ready yet, reload the tab
                            if (error.message.includes('Receiving end does not exist')) {
                                chrome.tabs.reload(tab.id);
                            }
                        });
                    } catch (error) {
                        console.log('Error sending message to tab:', error);
                    }
                });
            }
        });
    });

    function updateStatus(enabled) {
        statusText.textContent = enabled ? 'enabled' : 'disabled';
        statusText.style.color = enabled ? '#2196F3' : '#dc3545';
    }
}); 