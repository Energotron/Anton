export const MODAL_ESCAPE_TARGETS = Object.freeze([
  'questBack',
  'tradeBack',
  'shipClose',
  'infoClose',
  'commsBack',
  'commsClose',
]);

export function routeModalEscape(doc = globalThis?.document) {
  const panel = doc?.getElementById?.('panel');
  if (!panel || panel.classList?.contains?.('hidden')) return false;

  for (const id of MODAL_ESCAPE_TARGETS) {
    const button = doc.getElementById?.(id);
    if (!button || button.disabled || typeof button.click !== 'function') continue;
    button.click();
    return true;
  }
  return false;
}

export function installModalEscapeRuntime(win = globalThis?.window) {
  const doc = win?.document;
  if (!doc || doc.documentElement?.dataset?.kr3ModalEscapeRuntime === '1') return false;
  if (doc.documentElement?.dataset) doc.documentElement.dataset.kr3ModalEscapeRuntime = '1';

  doc.addEventListener('keydown', event => {
    if (event?.key !== 'Escape') return;
    if (!routeModalEscape(doc)) return;
    event.preventDefault?.();
    event.stopPropagation?.();
  }, true);
  return true;
}

if (typeof window !== 'undefined') {
  const boot = () => installModalEscapeRuntime(window);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
