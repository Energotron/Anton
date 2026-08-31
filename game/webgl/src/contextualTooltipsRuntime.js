export const CORE_TOOLTIPS = Object.freeze({
  mm: 'Миникарта системы. Курс: обычный клик/тап. Камера: Shift+клик или ПКМ; на мобильном переключите «Курс / Камера». Маркеры показывают планеты, станции, корабли и выбранный курс.',
  bTurn: 'Завершить ваш ход. Корабль выполняет выбранный курс или атаку, затем действуют остальные корабли и проходит один игровой день.',
  bWait: 'Пропустить действие и завершить ход без перемещения. Щиты восстанавливаются после полного цикла хода.',
  bMis: 'Переключить следующий выстрел на ракету. Ракеты имеют увеличенную дальность, расходуют боезапас и применяются при завершении хода.',
  sndBtn: 'Включить или выключить весь игровой звук. Музыка и эффекты прекращаются при отключении.',
  menuBtn: 'В полёте переключает фоновую музыку, не отключая остальные звуковые эффекты.',
  barHull: 'Корпус корабля. При нуле прочности корабль считается уничтоженным и восстанавливается у последней доступной планеты.',
  barShield: 'Защитное поле. Оно принимает урон раньше корпуса и частично регенерирует после завершения хода.',
  res: 'Основные ресурсы: кредиты для торговли и ремонта, топливо для гиперпрыжков, ракеты для дальних атак.',
  sysName: 'Текущая звёздная система. Её фракция, опасность, планеты и связи доступны в инфоцентре.',
  dayRank: 'Календарная дата кампании, номер хода и число уничтоженных противников. Один завершённый ход продвигает календарь на день.',
  phase: 'Текущая фаза игрового цикла: ваш ход, анимация, действия противников, порт или гиперпереход.',
  questLog: 'Контекстная сводка: выбранный курс/цель, ближайший порт и прогресс исследования галактики.',
  galClose: 'Закрыть карту галактики и вернуться в текущую систему.',
  btnNewGame: 'Начать новую кампанию с начальной комплектацией, ресурсами и заново сгенерированной галактикой.',
  contBtn: 'Загрузить выбранное сохранение и продолжить кампанию с сохранённой датой, кораблём и состоянием систем.',
  btnHelp: 'Открыть краткую памятку по управлению кораблём, камерой, картой и боем.',
  shipBonusBtn: 'Открыть паспорт корабля: сравнение текущих модулей со стартовой комплектацией и суммарная стоимость оборудования.',
  careerBtn: 'Открыть историю карьеры и зафиксированные достижения рейнджера.',
  repIntelBtn: 'Показать разведсводку по отношениям и репутации фракций.',
  diplomacyBtn: 'Открыть дипломатические действия, доступность которых зависит от репутации и текущей фракции.'
});

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function tooltipForControl({ id = '', text = '', dataset = {} } = {}) {
  if (CORE_TOOLTIPS[id]) return CORE_TOOLTIPS[id];
  const label = cleanText(text);

  if (dataset.buyg) return 'Купить одну единицу товара. Требуются кредиты, свободное место в трюме и наличие товара на складе планеты.';
  if (dataset.sellg) return 'Продать одну единицу товара по текущей цене продажи. Освободившееся место сразу возвращается в трюм.';
  if (dataset.buy) return 'Купить и установить улучшение корабля. Итоговая цена учитывает зачёт части стоимости установленного модуля.';
  if (dataset.take) return 'Принять контракт. Проверьте свободный трюм и срок: дедлайн считается в игровых днях.';

  if (/ремонт/i.test(label)) return 'Восстанавливает корпус до максимума за кредиты. Цена зависит от недостающей прочности.';
  if (/заправ|полный бак/i.test(label)) return 'Восстанавливает запас топлива. Топливо расходуется при гиперпрыжках между связанными системами.';
  if (/ракеты \+|боезапас/i.test(label)) return 'Пополняет ракетный боезапас за кредиты. Ракеты расходуются только при успешном ракетном выстреле.';
  if (/рынок/i.test(label)) return 'Открыть рынок планеты: цены и наличие зависят от типа местной экономики.';
  if (/оборудован|корабль/i.test(label)) return 'Открыть оборудование корабля и сравнить доступные улучшения по характеристикам и цене.';
  if (/задан|контракт/i.test(label)) return 'Открыть доступные задания. Контракты используют груз, сроки и последствия для прогресса рейнджера.';
  if (/инфо/i.test(label)) return 'Открыть инфоцентр с данными текущей системы, картиной галактики и свежими игровыми новостями.';
  if (/взл[её]т|покинуть порт/i.test(label)) return 'Покинуть планетарный порт и вернуться в обычный космос рядом с планетой.';
  if (/посадк/i.test(label)) return 'Сесть на ближайшую планету с портом, если корабль находится в допустимой дистанции.';
  if (/гиперкарта|карта галактики/i.test(label)) return 'Открыть карту галактики. Прыжок возможен только в напрямую связанную систему и требует топлива.';
  if (/след\.?|камера/i.test(label)) return 'Вернуть камеру к кораблю и снова включить режим следования.';
  if (/сохран/i.test(label)) return 'Сохранить текущее состояние корабля, систем, NPC, контрактов и календаря.';
  if (/закрыть|назад|←/i.test(label)) return 'Закрыть текущую панель или вернуться на предыдущий уровень интерфейса.';

  return '';
}

export function applyTooltipToElement(el) {
  if (!el || typeof el.setAttribute !== 'function') return false;
  const tooltip = tooltipForControl({
    id: el.id || '',
    text: el.textContent || el.getAttribute?.('aria-label') || '',
    dataset: el.dataset || {}
  });
  if (!tooltip) return false;
  el.setAttribute('data-kr3-tooltip', tooltip);
  el.setAttribute('title', tooltip);
  if ((el.tagName === 'BUTTON' || el.getAttribute?.('role') === 'button') && !el.getAttribute?.('aria-label')) {
    const label = cleanText(el.textContent);
    if (label) el.setAttribute('aria-label', `${label}. ${tooltip}`);
  }
  return true;
}

export function applyContextualTooltips(root) {
  if (!root?.querySelectorAll) return 0;
  const nodes = root.querySelectorAll('[id], button, [data-buy], [data-buyg], [data-sellg], [data-take]');
  let count = 0;
  for (const node of nodes) if (applyTooltipToElement(node)) count++;
  return count;
}

function ensureBubble(doc) {
  let bubble = doc.getElementById('kr3TooltipBubble');
  if (bubble) return bubble;
  bubble = doc.createElement('div');
  bubble.id = 'kr3TooltipBubble';
  bubble.setAttribute('role', 'tooltip');
  bubble.style.cssText = [
    'position:fixed', 'z-index:30', 'max-width:min(360px,80vw)', 'padding:8px 10px',
    'border:1px solid rgba(125,216,255,.55)', 'border-radius:8px',
    'background:rgba(5,10,25,.96)', 'color:#dcecff', 'font:12px/1.35 Exo 2,sans-serif',
    'box-shadow:0 6px 22px rgba(0,0,0,.45)', 'pointer-events:none',
    'opacity:0', 'transform:translateY(4px)', 'transition:opacity .12s,transform .12s'
  ].join(';');
  doc.body.appendChild(bubble);
  return bubble;
}

function targetWithTooltip(target) {
  return target?.closest?.('[data-kr3-tooltip]') || null;
}

export function installContextualTooltips(win = globalThis?.window) {
  const doc = win?.document;
  if (!doc || doc.documentElement?.dataset?.kr3TooltipsInstalled === '1') return false;
  if (doc.documentElement?.dataset) doc.documentElement.dataset.kr3TooltipsInstalled = '1';

  const bubble = ensureBubble(doc);
  let hideTimer = null;
  const hide = () => {
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateY(4px)';
  };
  const show = (target, x, y, sticky = false) => {
    const el = targetWithTooltip(target);
    if (!el) return;
    const text = el.getAttribute('data-kr3-tooltip');
    if (!text) return;
    if (hideTimer) win.clearTimeout(hideTimer);
    bubble.textContent = text;
    const px = Number.isFinite(x) ? x : Math.min(win.innerWidth - 24, 24 + (el.getBoundingClientRect?.().left || 0));
    const py = Number.isFinite(y) ? y : Math.min(win.innerHeight - 24, 24 + (el.getBoundingClientRect?.().bottom || 0));
    bubble.style.left = `${Math.max(8, Math.min(px + 12, win.innerWidth - 380))}px`;
    bubble.style.top = `${Math.max(8, Math.min(py + 12, win.innerHeight - 110))}px`;
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateY(0)';
    if (sticky) hideTimer = win.setTimeout(hide, 1800);
  };

  applyContextualTooltips(doc);
  doc.addEventListener('pointerover', e => show(e.target, e.clientX, e.clientY));
  doc.addEventListener('pointerout', e => {
    const from = targetWithTooltip(e.target);
    const to = targetWithTooltip(e.relatedTarget);
    if (from && from !== to) hide();
  });
  doc.addEventListener('focusin', e => show(e.target));
  doc.addEventListener('focusout', hide);
  doc.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') show(e.target, e.clientX, e.clientY, true);
  }, { capture: true });

  if (typeof win.MutationObserver === 'function') {
    const observer = new win.MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes || []) {
          if (node?.nodeType !== 1) continue;
          applyTooltipToElement(node);
          applyContextualTooltips(node);
        }
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
  }
  return true;
}

if (typeof window !== 'undefined') {
  const boot = () => installContextualTooltips(window);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
