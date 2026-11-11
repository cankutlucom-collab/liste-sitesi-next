const normalize = (value) => value.toLocaleLowerCase("tr")
  .normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("ı", "i").trim();

document.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.matches('input[id$="-il-ara"]')) return;

  const view = input.closest(".desktop-design, .mobile-design");
  if (!view) return;

  let suggestions = view.querySelector("[data-city-suggestions]");
  if (!suggestions) {
    suggestions = document.createElement("div");
    suggestions.dataset.citySuggestions = "";
    input.parentElement.insertAdjacentElement("afterend", suggestions);
  }

  const query = normalize(input.value);
  suggestions.replaceChildren();
  suggestions.hidden = !query;
  const seen = new Set();
  for (const link of view.querySelectorAll("[data-demo-link], [data-city-link]")) {
    if (suggestions.contains(link)) continue;
    const cityName = (link.firstChild?.textContent ?? link.textContent).trim();
    link.hidden = !normalize(cityName).startsWith(query);
    if (!query || link.hidden || seen.has(cityName)) continue;

    seen.add(cityName);
    const suggestion = document.createElement("a");
    suggestion.textContent = cityName;
    suggestion.href = link.getAttribute("href");
    if (link.hasAttribute("data-demo-link")) {
      suggestion.addEventListener("click", (click) => {
        click.preventDefault();
        link.click();
      });
    }
    suggestions.append(suggestion);
  }
  if (query && !seen.size) suggestions.textContent = "Sonuç bulunamadı.";
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-demo-link]")) {
    event.preventDefault();
    window.alert("Bu şehir için firma verileri henüz eklenmedi.");
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.matches("form[data-complaint], form[data-firm-application]")) return;
  event.preventDefault();
  window.alert("Bu form bir önizlemedir. Bilgiler gönderilmedi.");
});
// Mobile header menu: the panel lives only inside .mobile-design, so the desktop nav is never duplicated.
const setMobileMenu = (toggle, open) => {
  const panel = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!panel) return;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
  panel.hidden = !open;
};
const mobileMenuToggles = () => document.querySelectorAll('button[aria-controls="m-mobil-menu"]');

document.addEventListener("click", (event) => {
  const toggle = event.target.closest('button[aria-controls="m-mobil-menu"]');
  if (toggle) setMobileMenu(toggle, toggle.getAttribute("aria-expanded") !== "true");
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  for (const toggle of mobileMenuToggles()) {
    if (toggle.getAttribute("aria-expanded") !== "true") continue;
    setMobileMenu(toggle, false);
    toggle.focus();
  }
});
matchMedia("(min-width: 701px)").addEventListener("change", (event) => {
  if (event.matches) for (const toggle of mobileMenuToggles()) setMobileMenu(toggle, false);
});

for (const button of document.querySelectorAll('button[aria-controls$="-sikayet"]')) {
  button.addEventListener("click", () => {
    const isOpen = button.getAttribute("aria-expanded") === "true";
    const section = button.getAttribute("aria-controls");
    window.location.assign(isOpen ? "/iletisim" : "/iletisim/sikayet#" + section);
  });
}
