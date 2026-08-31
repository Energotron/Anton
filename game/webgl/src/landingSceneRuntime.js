export const LANDING_SCENES = Object.freeze({
  rock: { asset: new URL('../assets/landing/rock.svg', import.meta.url).href, title: 'Каменистый мир', ambience: 'Пыльный космопорт' },
  ice: { asset: new URL('../assets/landing/ice.svg', import.meta.url).href, title: 'Ледяной мир', ambience: 'Полярный космопорт' },
  lava: { asset: new URL('../assets/landing/lava.svg', import.meta.url).href, title: 'Вулканический мир', ambience: 'Термальный космопорт' },
  tech: { asset: new URL('../assets/landing/tech.svg', import.meta.url).href, title: 'Высокотехнологичный мир', ambience: 'Мегаполис-узел' }
});

export function detectPlanetType(text = '') {
  const value = String(text).toLowerCase();
  for (const type of Object.keys(LANDING_SCENES)) {
    if (new RegExp(`(?:^|\\s|·)${type}(?:$|\\s|·)`).test(value)) return type;
  }
  return 'rock';
}

export function landingSceneForType(type) {
  return LANDING_SCENES[type] || LANDING_SCENES.rock;
}

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById('kr3LandingSceneStyles')) return;
  const style = document.createElement('style');
  style.id = 'kr3LandingSceneStyles';
  style.textContent = `
    .kr3-landing-scene{position:relative;height:180px;margin:10px 0 14px;border:1px solid rgba(150,200,255,.34);border-radius:12px;overflow:hidden;background-size:cover;background-position:center;box-shadow:inset 0 -60px 70px rgba(0,0,0,.55),0 8px 24px rgba(0,0,0,.25)}
    .kr3-landing-scene::after{content:"";position:absolute;inset:-40% -60%;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.12) 49%,transparent 56%);animation:kr3LandingSweep 7s linear infinite;pointer-events:none}
    .kr3-landing-caption{position:absolute;left:12px;right:12px;bottom:10px;padding:7px 10px;border-radius:8px;background:rgba(4,10,22,.66);backdrop-filter:blur(4px);font-size:12px;color:#dcecff;border:1px solid rgba(150,200,255,.2)}
    .kr3-landing-caption b{color:#ffd77a}
    @keyframes kr3LandingSweep{from{transform:translateX(-35%)}to{transform:translateX(35%)}}
    @media(max-width:700px){.kr3-landing-scene{height:132px}}
    @media(prefers-reduced-motion:reduce){.kr3-landing-scene::after{animation:none}}
  `;
  document.head.appendChild(style);
}

export function mountLandingScene(panel) {
  if (!panel || panel.querySelector('.kr3-landing-scene')) return false;
  const heading = panel.querySelector('h2');
  if (!heading || !heading.textContent.includes('🛬 Порт')) return false;
  const sub = panel.querySelector('.sub');
  const type = detectPlanetType(sub?.textContent || '');
  const scene = landingSceneForType(type);
  const planetName = heading.textContent.replace(/^.*?—\s*/, '').trim() || 'Неизвестный мир';
  const node = document.createElement('div');
  node.className = 'kr3-landing-scene';
  node.dataset.planetType = type;
  node.style.backgroundImage = `url("${scene.asset}")`;
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', `${scene.title}: ${planetName}`);
  node.innerHTML = `<div class="kr3-landing-caption"><b>${planetName}</b> · ${scene.ambience}</div>`;
  heading.insertAdjacentElement('afterend', node);
  return true;
}

function install() {
  if (typeof document === 'undefined') return;
  ensureStyles();
  const panel = document.getElementById('panel');
  if (!panel) return;
  mountLandingScene(panel);
  const observer = new MutationObserver(() => mountLandingScene(panel));
  observer.observe(panel, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
}
