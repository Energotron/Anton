export function soundButtonState(text) {
  const muted = String(text || '').includes('🔇');
  return muted
    ? { muted: true, title: 'Включить звук', label: 'Звук выключен. Нажмите, чтобы включить.' }
    : { muted: false, title: 'Выключить звук', label: 'Звук включён. Нажмите, чтобы выключить.' };
}

function bootAudioGuard() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const contexts = new Set();
  const media = new Set();

  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const Native = window[name];
    if (!Native || Native.__kr3Guarded) continue;
    function GuardedAudioContext(...args) {
      const ctx = new Native(...args);
      contexts.add(ctx);
      return ctx;
    }
    GuardedAudioContext.prototype = Native.prototype;
    Object.setPrototypeOf(GuardedAudioContext, Native);
    GuardedAudioContext.__kr3Guarded = true;
    window[name] = GuardedAudioContext;
  }

  const NativeAudio = window.Audio;
  if (NativeAudio && !NativeAudio.__kr3Guarded) {
    function GuardedAudio(...args) {
      const a = new NativeAudio(...args);
      media.add(a);
      return a;
    }
    GuardedAudio.prototype = NativeAudio.prototype;
    Object.setPrototypeOf(GuardedAudio, NativeAudio);
    GuardedAudio.__kr3Guarded = true;
    window.Audio = GuardedAudio;
  }

  const resumeAudio = async () => {
    for (const ctx of contexts) {
      try { if (ctx.state === 'suspended') await ctx.resume(); } catch (_) {}
    }
  };

  const refreshButton = () => {
    const btn = document.getElementById('sndBtn');
    if (!btn) return;
    const state = soundButtonState(btn.textContent);
    btn.title = state.title;
    btn.setAttribute('aria-label', state.label);
    btn.dataset.soundState = state.muted ? 'off' : 'on';
  };

  document.addEventListener('pointerdown', resumeAudio, { passive: true });
  document.addEventListener('keydown', resumeAudio);
  document.getElementById('sndBtn')?.addEventListener('click', () => {
    setTimeout(async () => {
      refreshButton();
      const btn = document.getElementById('sndBtn');
      if (btn?.dataset.soundState === 'on') {
        await resumeAudio();
        const candidates = [...media].filter(a => a && a.src && a.paused && !a.ended);
        const latest = candidates[candidates.length - 1];
        if (latest) { try { await latest.play(); } catch (_) {} }
      }
    }, 0);
  });
  refreshButton();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootAudioGuard, { once: true }); else bootAudioGuard();
}
