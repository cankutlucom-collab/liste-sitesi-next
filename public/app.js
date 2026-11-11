// Footer category / city boxes. Choosing a category only fills the city box (all cities are in
// data-footer-cities on the category box, no request); only the Git button navigates.
// Kept first so it works even if a later page-specific block throws. Same rule as public/design.js.
document.addEventListener('change', event => {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) return;
  const kind = select.dataset.footerNav;
  if (kind === 'category') {
    const citySelect = select.parentElement && select.parentElement.querySelector('select[data-footer-nav="city"]');
    if (!citySelect) return;
    let map = Object.create(null);
    try { map = JSON.parse(select.dataset.footerCities || '{}'); } catch (error) { map = Object.create(null); }
    const cities = Object.prototype.hasOwnProperty.call(map, select.value) ? map[select.value] : [];
    citySelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = cities.length ? 'Şehir seçin' : 'Önce kategori seçin';
    citySelect.append(placeholder);
    for (const [name, slug] of cities) {
      const option = document.createElement('option');
      option.value = '/' + select.value + '/' + slug;
      option.textContent = name;
      citySelect.append(option);
    }
    citySelect.disabled = !cities.length;
    const goButton = select.parentElement.querySelector('button[data-footer-nav="go"]');
    if (goButton) goButton.disabled = !Object.prototype.hasOwnProperty.call(map, select.value);
  }
});
// The Git button is the only thing that navigates: /kategori-slug, or /kategori-slug/sehir-slug if a city is chosen.
document.addEventListener('click', event => {
  const button = event.target instanceof Element ? event.target.closest('button[data-footer-nav="go"]') : null;
  if (!button || button.disabled) return;
  const box = button.parentElement;
  const category = box.querySelector('select[data-footer-nav="category"]');
  const city = box.querySelector('select[data-footer-nav="city"]');
  if (!category || !category.value) return;
  const target = city && !city.disabled && city.value ? city.value : '/' + category.value;
  if (!target.startsWith('/') || target.startsWith('//')) return;
  window.location.assign(target);
});

const toggle = document.querySelector('.menu-toggle');
const menu = document.getElementById('ana-menu');
function closeMenu() {
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Menüyü aç');
  menu.classList.remove('is-open');
}
toggle.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.setAttribute('aria-label', expanded ? 'Menüyü kapat' : 'Menüyü aç');
  menu.classList.toggle('is-open', expanded);
});
menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); toggle.focus(); }
});
matchMedia('(min-width:701px)').addEventListener('change', closeMenu);
const dialog = document.getElementById('pending-dialog');
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-pending]');
  if (!link) return;
  event.preventDefault();
  document.getElementById('pending-message').textContent = `${link.textContent.trim() || link.querySelector('[aria-label]')?.getAttribute('aria-label') || 'Firma profili'}: İlk aşamada yalnızca ana sayfa hazırlandı. Bu bağlantının sayfası veya işlemi sonraki aşamada eklenecek.`;
  dialog.showModal();
});

const viewOptions = document.querySelector('.firm-view-options');
if (viewOptions) {
  const buttons = Array.from(viewOptions.querySelectorAll('[data-firm-view]'));
  const setView = (view) => {
    document.body.dataset.firmView = view;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.firmView === view)));
  };
  const storageKey = 'liste-firm-view';
  try {
    const saved = localStorage.getItem(storageKey);
    if (buttons.some(button => button.dataset.firmView === saved)) setView(saved);
  } catch {}
  buttons.forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.firmView;
    setView(view);
    try { localStorage.setItem(storageKey, view); } catch {}
  }));
  viewOptions.hidden = false;
}

// Same-page "Daha fazla gör" / "Kapat" for firm lists. The server renders the initial count
// (data-initial) visible and the rest hidden; nothing here touches the URL or history.
document.querySelectorAll('[data-more-list]').forEach(controls => {
  const section = controls.closest('section');
  const cards = Array.from(section.querySelectorAll('article[data-firm-card]'));
  const initial = Math.min(cards.length, Math.max(0, parseInt(controls.dataset.initial, 10) || 0));
  const step = Math.max(1, parseInt(controls.dataset.step, 10) || 1);
  const more = controls.querySelector('[data-more]');
  const close = controls.querySelector('[data-close]');
  const count = controls.querySelector('[data-more-count]');
  const heading = document.getElementById(section.getAttribute('aria-labelledby'));
  // City pages: the Ekonomik cards sit in their own grid, which stays hidden until one of them is shown.
  const grids = Array.from(section.querySelectorAll('[data-card-grid]'));
  let shown = initial;

  function render() {
    cards.forEach((card, index) => { card.hidden = index >= shown; });
    grids.forEach(grid => { grid.hidden = !grid.querySelector('article[data-firm-card]:not([hidden])'); });
    const remaining = cards.length - shown;
    count.textContent = String(remaining);
    more.hidden = remaining <= 0;
    close.hidden = shown <= initial;
  }

  more.addEventListener('click', () => {
    const firstNew = shown;
    shown = Math.min(cards.length, shown + step);
    render();
    // Keyboard/screen-reader users continue at the first newly revealed firm.
    Array.from(cards[firstNew]?.querySelectorAll('h3 a') ?? [])
      .find(link => link.getClientRects().length > 0)?.focus();
  });

  close.addEventListener('click', () => {
    shown = initial;
    render();
    const target = heading || cards[0];
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  });

  render();
  controls.hidden = false;
});
