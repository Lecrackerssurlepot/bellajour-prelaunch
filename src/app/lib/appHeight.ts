export function initAppHeight() {
  if (typeof window === 'undefined') return;

  let maxHeight = window.innerHeight;
  const root = document.documentElement;

  const update = () => {
    const h = window.innerHeight;
    if (h > maxHeight) maxHeight = h;
    root.style.setProperty('--app-height', `${maxHeight}px`);
  };

  const reset = () => {
    maxHeight = window.innerHeight;
    root.style.setProperty('--app-height', `${maxHeight}px`);
  };

  update();
  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('orientationchange', reset, { passive: true });
}
