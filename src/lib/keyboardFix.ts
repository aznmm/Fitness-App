const FIELD = 'input, textarea, select, [contenteditable="true"]';

/**
 * iOS 26 can leave the visual viewport offset after the keyboard (or a select's
 * picker) closes, mostly in Home Screen apps: the tab bar then floats mid-screen
 * and the top bar slides off the top until something forces a re-layout
 * (WebKit bug 297779). Scrolling the window to where it already is clears the
 * stale offset. It runs twice to cover the keyboard's closing animation, and
 * not at all when focus just moved to another field.
 */
export function installKeyboardFix(): void {
  document.addEventListener('focusout', (e) => {
    if (!(e.target instanceof Element) || !e.target.matches(FIELD)) return;
    const settle = () => {
      if (!document.activeElement?.matches(FIELD)) window.scrollTo(window.scrollX, window.scrollY);
    };
    setTimeout(settle, 50);
    setTimeout(settle, 400);
  });
}
