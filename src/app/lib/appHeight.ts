export function initAppHeight() {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const getH = () => {
    return window.visualViewport?.height ?? window.innerHeight;
  };

  let maxHeight = getH();

  const apply = () => {
    root.style.setProperty('--app-height', `${maxHeight}px`);
  };

  const update = () => {
    const h = getH();
    if (h > maxHeight) {
      maxHeight = h;
      apply();
    }
  };

  const reset = () => {
    maxHeight = getH();
    apply();
  };

  apply();

  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('orientationchange', reset, { passive: true });
  window.visualViewport?.addEventListener('resize', update, { passive: true });

  let polls = 0;
  const pollInterval = setInterval(() => {
    update();
    polls++;
    if (polls >= 30) clearInterval(pollInterval);
  }, 100);
}
