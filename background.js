function setBadge(tabId, enabled) {
    chrome.action.setBadgeText({ text: enabled ? "ON" : "", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#1a73e8", tabId });
}

chrome.action.onClicked.addListener((tab) => {
    chrome.storage.local.get({ enabled: false }, ({ enabled }) => {
        const next = !enabled;
        chrome.storage.local.set({ enabled: next });
        setBadge(tab.id, next);

        // Notify every open Keep tab so they all stay in sync.
        chrome.tabs.query({ url: "https://keep.google.com/*" }, (tabs) => {
            for (const t of tabs) {
                chrome.tabs.sendMessage(t.id, { action: next ? "enable" : "disable" })
                    .catch(() => {});
            }
        });
    });
});

// Sync badge when a Keep tab (re)loads — content script sends "init" on startup.
chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.action === "init" && sender.tab) {
        chrome.storage.local.get({ enabled: false }, ({ enabled }) => {
            setBadge(sender.tab.id, enabled);
        });
    }
});
