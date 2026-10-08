/**
 * CONFIG
 * Quando a integração com Google Sheets estiver pronta, cole aqui a URL do
 * Google Apps Script (Web App) publicado. Até lá, os leads ficam salvos
 * apenas no localStorage do navegador (para teste) e no console.
 */
const CONFIG = {
  SHEETS_WEBHOOK_URL: "", // ex: "https://script.google.com/macros/s/XXXX/exec"
};

document.getElementById("year").textContent = new Date().getFullYear();

document.getElementById("scrollCue").addEventListener("click", () => {
  document.getElementById("mercado").scrollIntoView({ behavior: "smooth" });
});

/* ============ SEO/GEO: ItemList estruturado do acervo ============
 * Gerado a partir do catálogo real (deliverables-data.js) para que os dados
 * estruturados nunca fiquem desatualizados em relação ao que está na tela. */
(function injectDeliverablesJsonLd() {
  const listNode = document.querySelector('script[type="application/ld+json"]');
  const baseUrl = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Acervo de materiais de growth",
    description: "Frameworks, ferramentas e análises gratuitos para otimizar a máquina de receita de qualquer negócio.",
    numberOfItems: DELIVERABLES.length,
    itemListElement: DELIVERABLES.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "CreativeWork",
        "@id": `${baseUrl}#${item.id}`,
        name: item.title,
        description: item.teaser,
        genre: item.typeLabel,
        about: item.categoryLabel,
        isAccessibleForFree: true,
        creator: { "@type": "Person", name: "Guilherme Sanges" },
      },
    })),
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.text = JSON.stringify(itemList);
  document.head.appendChild(script);
})();

/* ============ MÉTODO: DIAGRAMA DE VENN (destaque ao passar o mouse) ============ */
const vennSvg = document.getElementById("vennSvg");
const vennCircles = Array.from(vennSvg.querySelectorAll("circle.ring")).map((c) => ({
  key: c.dataset.key,
  cx: +c.getAttribute("cx"),
  cy: +c.getAttribute("cy"),
  r: +c.getAttribute("r"),
}));

function setMethod(key) {
  vennSvg.querySelectorAll("[data-key]").forEach((el) => el.classList.toggle("is-active", el.dataset.key === key));
}

// Nas interseções, destaca o círculo cujo centro está mais próximo do ponteiro.
function vennKeyAt(evt) {
  const rect = vennSvg.getBoundingClientRect();
  const scale = 400 / rect.width;
  const x = (evt.clientX - rect.left) * scale;
  const y = (evt.clientY - rect.top) * scale;
  let best = null;
  vennCircles.forEach((c) => {
    const d = Math.hypot(x - c.cx, y - c.cy);
    if (d <= c.r && (!best || d < best.d)) best = { key: c.key, d };
  });
  return best && best.key;
}

vennSvg.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  setMethod(vennKeyAt(e));
});
vennSvg.addEventListener("pointerleave", () => setMethod(null));
vennSvg.addEventListener("click", (e) => setMethod(vennKeyAt(e)));


/* ============ FILTERS ============ */
const categorySelect = document.getElementById("filterCategory");
const challengeSelect = document.getElementById("filterChallenge");
let activeCategory = "todos";
let activeChallenge = "todos";

CATEGORIES.forEach((cat) => {
  const opt = document.createElement("option");
  opt.value = cat.id;
  opt.textContent = cat.id === "todos" ? "Todas as áreas" : cat.label;
  categorySelect.appendChild(opt);
});
CHALLENGES.forEach((challenge) => {
  const opt = document.createElement("option");
  opt.value = challenge.id;
  opt.textContent = challenge.id === "todos" ? "Todos os desafios" : challenge.label;
  challengeSelect.appendChild(opt);
});

function countMatches(category, challenge) {
  return DELIVERABLES.filter(
    (d) =>
      (category === "todos" || d.category === category) &&
      (challenge === "todos" || d.challenges.includes(challenge))
  ).length;
}

// Se a combinação não tem nenhum material, o filtro anterior volta para "todos"
// e o que o visitante acabou de escolher é preservado.
categorySelect.addEventListener("change", () => {
  activeCategory = categorySelect.value;
  if (countMatches(activeCategory, activeChallenge) === 0) {
    activeChallenge = "todos";
    challengeSelect.value = "todos";
  }
  renderCards();
});
challengeSelect.addEventListener("change", () => {
  activeChallenge = challengeSelect.value;
  if (countMatches(activeCategory, activeChallenge) === 0) {
    activeCategory = "todos";
    categorySelect.value = "todos";
  }
  renderCards();
});

/* ============ CAROUSEL / CARDS ============ */
const carouselEl = document.getElementById("carousel");

function renderCards() {
  carouselEl.innerHTML = "";
  carouselEl.scrollLeft = 0;
  const items = DELIVERABLES.filter((d) => {
    const matchesCategory = activeCategory === "todos" || d.category === activeCategory;
    const matchesChallenge = activeChallenge === "todos" || d.challenges.includes(activeChallenge);
    return matchesCategory && matchesChallenge;
  });

  document.getElementById("carouselEmpty").hidden = items.length > 0;

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card__top">
        <span class="card__type">${item.typeLabel}</span>
        <span class="card__lock">🔒</span>
      </div>
      <div class="card__body">
        <span class="card__category">${item.categoryLabel}</span>
        <h3 class="card__title">${item.title}</h3>
        <p class="card__teaser">${item.teaser}</p>
        <span class="card__cta">Conferir →</span>
      </div>
    `;
    card.addEventListener("click", () => openModal(item));
    carouselEl.appendChild(card);
  });
}
renderCards();

document.getElementById("carouselPrev").addEventListener("click", () => {
  carouselEl.scrollBy({ left: -340, behavior: "smooth" });
});
document.getElementById("carouselNext").addEventListener("click", () => {
  carouselEl.scrollBy({ left: 340, behavior: "smooth" });
});

/* ============ MODAL ============ */
const modalBackdrop = document.getElementById("modalBackdrop");
const modalTag = document.getElementById("modalTag");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const leadForm = document.getElementById("leadForm");
const stepPreview = document.getElementById("modalStepPreview");
const stepSuccess = document.getElementById("modalStepSuccess");
const modalSuccessText = document.getElementById("modalSuccessText");
const modalDownload = document.getElementById("modalDownload");
const modalPendingNote = document.getElementById("modalPendingNote");

let currentItem = null;

function openModal(item) {
  currentItem = item;
  modalTag.textContent = `${item.typeLabel} · ${item.categoryLabel}`;
  modalTitle.textContent = item.title;
  modalDesc.textContent = item.description;
  leadForm.reset();
  stepPreview.hidden = false;
  stepSuccess.hidden = true;
  closePreviewLightbox();
  buildPreviewSlides(item);
  modalBackdrop.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalBackdrop.classList.remove("is-open");
  document.body.style.overflow = "";
  currentItem = null;
}

/* ============ MODAL: PRÉVIA INTERATIVA ============ */
const previewTrigger = document.getElementById("previewTrigger");
const previewBox = document.getElementById("previewBox");
const previewLightbox = document.getElementById("previewLightbox");
const previewStage = document.getElementById("previewStage");
const previewDots = document.getElementById("previewDots");
const previewPageLabel = document.getElementById("previewPageLabel");

let previewSlides = [];
let previewIndex = 0;

function slideMarkup(slide) {
  switch (slide.kind) {
    case "cover":
      return `<h4 class="pv-slide__title">${slide.heading}</h4><p class="pv-slide__text">${slide.text}</p>`;
    case "steps":
      return (
        `<h4 class="pv-slide__title">${slide.heading}</h4>` +
        [1, 2, 3, 4]
          .map((n) => `<div class="pv-slide__step"><span>${n}</span><div class="pv-slide__bar"></div></div>`)
          .join("")
      );
    case "inputs":
      return (
        `<h4 class="pv-slide__title">${slide.heading}</h4>` +
        ["Campo 1", "Campo 2", "Campo 3"]
          .map((l) => `<label class="pv-slide__field">${l}<div class="pv-slide__bar pv-slide__bar--input"></div></label>`)
          .join("")
      );
    case "output":
      return `<h4 class="pv-slide__title">${slide.heading}</h4><div class="pv-slide__result">Resultado calculado automaticamente</div><div class="pv-slide__bar"></div><div class="pv-slide__bar short"></div>`;
    case "findings":
      return `<h4 class="pv-slide__title">${slide.heading}</h4><ul class="pv-slide__list"><li>Achado 1</li><li>Achado 2</li><li>Achado 3</li></ul>`;
    case "apply":
      return `<h4 class="pv-slide__title">${slide.heading}</h4><p class="pv-slide__text">Um passo a passo prático para aplicar isso no seu negócio ainda esta semana.</p>`;
    default:
      return "";
  }
}

function buildPreviewSlides(item) {
  previewSlides = [{ kind: "cover", heading: item.title, text: item.teaser }];
  if (item.type === "framework") {
    previewSlides.push({ kind: "steps", heading: "Etapas do framework" });
    previewSlides.push({ kind: "apply", heading: "Como aplicar essa semana" });
  } else if (item.type === "ferramenta") {
    previewSlides.push({ kind: "inputs", heading: "O que você preenche" });
    previewSlides.push({ kind: "output", heading: "O que você recebe" });
  } else {
    previewSlides.push({ kind: "findings", heading: "Principais achados" });
    previewSlides.push({ kind: "apply", heading: "O que fazer com isso" });
  }
  previewIndex = 0;
}

function renderPreviewSlide() {
  const slide = previewSlides[previewIndex];
  previewStage.innerHTML = slideMarkup(slide);
  previewPageLabel.textContent = `Página ${previewIndex + 1} de ${previewSlides.length}`;
  previewDots.innerHTML = previewSlides
    .map((_, i) => `<span class="${i === previewIndex ? "is-active" : ""}"></span>`)
    .join("");
}

function openPreviewLightbox() {
  renderPreviewSlide();
  previewTrigger.hidden = true;
  previewLightbox.hidden = false;
  previewTrigger.setAttribute("aria-expanded", "true");
}

function closePreviewLightbox() {
  previewLightbox.hidden = true;
  previewTrigger.hidden = false;
  previewTrigger.setAttribute("aria-expanded", "false");
}

previewTrigger.addEventListener("click", openPreviewLightbox);
document.getElementById("previewClose").addEventListener("click", closePreviewLightbox);
document.getElementById("previewPrev").addEventListener("click", () => {
  previewIndex = (previewIndex - 1 + previewSlides.length) % previewSlides.length;
  renderPreviewSlide();
});
document.getElementById("previewNext").addEventListener("click", () => {
  previewIndex = (previewIndex + 1) % previewSlides.length;
  renderPreviewSlide();
});
previewDots.addEventListener("click", (e) => {
  const dots = Array.from(previewDots.children);
  const i = dots.indexOf(e.target);
  if (i > -1) {
    previewIndex = i;
    renderPreviewSlide();
  }
});

document.getElementById("modalClose").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalBackdrop.classList.contains("is-open")) closeModal();
});

leadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentItem) return;

  const formData = new FormData(leadForm);
  const lead = {
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    cargo: formData.get("cargo"),
    segmento: formData.get("segmento"),
    tamanho: formData.get("tamanho"),
    optin: formData.get("optin") === "on",
    material: currentItem.title,
    materialId: currentItem.id,
    origem: "portal-growth-educacao",
    timestamp: new Date().toISOString(),
  };

  const submitBtn = leadForm.querySelector(".lead-form__submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  await saveLead(lead);

  submitBtn.disabled = false;
  submitBtn.textContent = "Acessar material grátis";

  showSuccess(currentItem, lead);
});

async function saveLead(lead) {
  // Fallback local para teste, enquanto o Google Sheets não está integrado.
  try {
    const stored = JSON.parse(localStorage.getItem("leads") || "[]");
    stored.push(lead);
    localStorage.setItem("leads", JSON.stringify(stored));
  } catch (err) {
    console.warn("Não foi possível salvar o lead no localStorage.", err);
  }
  console.info("[lead capturado]", lead);

  if (!CONFIG.SHEETS_WEBHOOK_URL) return;

  try {
    // text/plain evita o preflight de CORS que o Apps Script não responde;
    // o script do lado do Google lê e faz JSON.parse do corpo normalmente.
    await fetch(CONFIG.SHEETS_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(lead),
    });
  } catch (err) {
    console.error("Falha ao enviar lead para o Google Sheets.", err);
  }
}

function showSuccess(item, lead) {
  stepPreview.hidden = true;
  stepSuccess.hidden = false;

  if (item.fileUrl) {
    modalSuccessText.textContent = `${item.title} está pronto para download.`;
    modalDownload.href = item.fileUrl;
    modalDownload.hidden = false;
    modalPendingNote.textContent = "";
  } else {
    modalSuccessText.textContent = `Recebemos seus dados, ${lead.nome.split(" ")[0]}. Assim que "${item.title}" estiver publicado, ele chega no seu e-mail.`;
    modalDownload.hidden = true;
    modalPendingNote.textContent = "Este material ainda está em produção.";
  }
}

/* ============ NAV SHADOW ON SCROLL ============ */
const navEl = document.getElementById("nav");
window.addEventListener(
  "scroll",
  () => {
    navEl.style.borderBottomColor = window.scrollY > 20 ? "rgba(255,107,0,0.35)" : "";
  },
  { passive: true }
);

/* ============ MENU MOBILE (SANDUÍCHE) ============ */
(function initMobileNav() {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMobile");
  if (!nav || !toggle || !menu) return;

  function setOpen(open) {
    nav.classList.toggle("nav--open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("nav--open")));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
  window.matchMedia("(min-width: 860px)").addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
})();

/* ============ CASES: CARROSSEL AUTOMÁTICO NO MOBILE (4s) ============ */
(function initCasesCarousel() {
  const grid = document.querySelector(".cases-grid");
  if (!grid) return;

  const mobile = window.matchMedia("(max-width: 899px)");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timer = null;
  let resumeTimer = null;
  let index = 0;

  const cards = () => grid.querySelectorAll(".case-card");

  function currentIndex() {
    const list = cards();
    if (!list.length) return 0;
    const step = list[0].offsetWidth + (parseFloat(getComputedStyle(grid).columnGap) || 14);
    return Math.max(0, Math.min(list.length - 1, Math.round(grid.scrollLeft / step)));
  }

  function go(n) {
    const list = cards();
    if (!list.length) return;
    index = (n + list.length) % list.length;
    grid.scrollTo({ left: list[index].offsetLeft, behavior: "smooth" });
  }

  function start() {
    if (reduce || timer || !mobile.matches) return;
    timer = setInterval(() => go(currentIndex() + 1), 4000);
  }
  function stop() {
    clearInterval(timer);
    timer = null;
    clearTimeout(resumeTimer);
  }
  function resumeLater() {
    stop();
    resumeTimer = setTimeout(start, 6000);
  }

  grid.addEventListener("touchstart", stop, { passive: true });
  grid.addEventListener("touchend", resumeLater, { passive: true });
  grid.addEventListener("mouseenter", stop);
  grid.addEventListener("mouseleave", start);
  grid.addEventListener("focusin", stop);
  grid.addEventListener("focusout", start);

  mobile.addEventListener("change", () => {
    stop();
    if (mobile.matches) start();
    else grid.scrollLeft = 0;
  });
  start();
})();
