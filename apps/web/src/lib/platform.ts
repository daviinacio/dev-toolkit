/** Apple devices show ⌘ for shortcuts that use Ctrl elsewhere */
export const isApple =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export const modifierKeyLabel = isApple ? "⌘" : "Ctrl";
