// Obfuscated class — inspect .IZ65Hb-n0tgWb in DevTools if this breaks.
// No stable aria/data attributes exist on Keep note cards (verified 2026-06).
const NOTE_CLASS = "IZ65Hb-n0tgWb";
// Keep renders each label chip as a <label> element; rely on the semantic tag
// rather than its obfuscated class so label detection survives CSS renames.
const LABEL_SELECTOR = "label";

function hasLabel(note) {
    return Array.from(note.querySelectorAll(LABEL_SELECTOR))
        .some(el => el.textContent.trim() !== "");
}

let observer = null;

function enable() {
    const notes = document.getElementsByClassName(NOTE_CLASS);
    if (notes.length === 0) {
        console.warn(
            "[keep-no-label] No note cards found — NOTE_CLASS may need updating.\n" +
            "Open DevTools on keep.google.com, run:\n" +
            "  document.querySelector('.IZ65Hb-n0tgWb')\n" +
            "If null, find the new class by inspecting a note card and update NOTE_CLASS in content.js."
        );
    }
    for (let i = 0; i < notes.length; i++) {
        if (hasLabel(notes[i])) notes[i].style.display = "none";
    }

    if (observer) return;
    observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                // New note card added directly
                if (node.classList.contains(NOTE_CLASS) && hasLabel(node)) {
                    node.style.display = "none";
                }
                // New note cards added inside a container
                for (const child of Array.from(node.getElementsByClassName(NOTE_CLASS))) {
                    if (hasLabel(child)) child.style.display = "none";
                }
                // Label added to an already-existing note (two-phase render)
                const parentNote = node.closest("." + NOTE_CLASS);
                if (parentNote && hasLabel(parentNote)) {
                    parentNote.style.display = "none";
                }
            }

            // Label removed from an existing note: re-evaluate its visibility.
            // mutation.target is still in the DOM so closest() works here.
            if (mutation.removedNodes.length > 0) {
                const parentNote = mutation.target.closest("." + NOTE_CLASS);
                if (parentNote && !hasLabel(parentNote)) {
                    parentNote.style.display = "";
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function disable() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    const notes = document.getElementsByClassName(NOTE_CLASS);
    for (let i = 0; i < notes.length; i++) {
        notes[i].style.display = "";
    }
}

// Apply saved state on load, then tell the background to sync the badge.
chrome.storage.local.get({ enabled: false }, ({ enabled }) => {
    if (enabled) enable();
    chrome.runtime.sendMessage({ action: "init" }).catch(() => {});
});

// Listen for toggle commands from the background script.
chrome.runtime.onMessage.addListener(({ action }) => {
    if (action === "enable") enable();
    else if (action === "disable") disable();
});
