/**
 * Platform-aware shortcut labels for toolbar tooltips:
 * "Bold (⌘B)" on a Mac, "Bold (Ctrl+B)" everywhere else.
 */
export function isMac() {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
}

const MAC_KEYS = { Mod: "⌘", Shift: "⇧", Alt: "⌥", Tab: "⇥" };
const PC_KEYS = { Mod: "Ctrl", Shift: "Shift", Alt: "Alt", Tab: "Tab" };

/** `keys` is a list of tokens — "Mod", "Shift", "Alt" or a plain key ("B", "]"). */
export function formatShortcut(keys, mac = isMac()) {
    const names = mac ? MAC_KEYS : PC_KEYS;
    const parts = keys.map((key) => names[key] || key);
    return mac ? parts.join("") : parts.join("+");
}
