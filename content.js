// AI Background — sets a custom image as the real page background on Claude, ChatGPT and Gemini.
//
// How it works:
//  1. A fixed image layer is inserted at the very bottom of the page's stacking order.
//  2. Large surfaces (chat pane, sidebar, header, the area around the composer) are made
//     transparent so the image shows through. This includes backdrop blurs, gradients and
//     ::before/::after pseudo-elements. Divider borders and lines are faded out.
//  3. The message composer becomes "frosted glass" so text scrolling behind it stays out of the way.
//  Message bubbles, code blocks, menus and dialogs keep their own backgrounds.

const LAYER_ID = "ai-bg-extension-layer";
const STYLE_ID = "ai-bg-extension-style";
const MARK = "aibg";            // data-aibg: stores the original inline values so they can be restored
const PSEUDO = "aibgPseudo";    // data-aibg-pseudo: clears the background of ::before/::after

const SITE_KEYS = {
  "claude.ai": "claude",
  "chatgpt.com": "chatgpt",
  "chat.openai.com": "chatgpt",
  "gemini.google.com": "gemini",
};
const siteKey = SITE_KEYS[location.hostname];

const DEFAULTS = {
  image: null,
  imageId: null,
  dim: 0,
  blur: 0,
  fit: "cover",
  glass: 0.6,
  sites: { claude: true, chatgpt: true, gemini: true },
};

// Inline properties we override (and restore when disabled)
const PROPS = ["background-color", "background-image", "backdrop-filter", "-webkit-backdrop-filter", "border-color", "box-shadow"];
const FAINT_BORDER = "rgba(128,128,128,0.06)";

let settings = { ...DEFAULTS };
let active = false;
let blobUrl = null, blobFor = null;
let seen = new WeakSet();

// ---------- Helpers ----------

/** Returns the alpha channel of a computed CSS color (0 = fully transparent). */
function alphaOf(color) {
  if (!color || color === "transparent") return 0;
  const slash = color.match(/\/\s*([\d.]+)(%?)\s*\)$/);
  if (slash) return slash[2] ? parseFloat(slash[1]) / 100 : parseFloat(slash[1]);
  const rgba = color.match(/^rgba\(([^)]+)\)$/);
  if (rgba) {
    const parts = rgba[1].split(",");
    return parts.length > 3 ? parseFloat(parts[3]) : 1;
  }
  return 1;
}

const hasBlurFx = (cs) =>
  (cs.backdropFilter && cs.backdropFilter !== "none") ||
  (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== "none");

/** True if the element paints something that would hide the image behind it. */
const paints = (cs) =>
  alphaOf(cs.backgroundColor) > 0.02 || cs.backgroundImage.includes("gradient") || hasBlurFx(cs);

const hasBorder = (cs) =>
  parseFloat(cs.borderTopWidth) || parseFloat(cs.borderRightWidth) ||
  parseFloat(cs.borderBottomWidth) || parseFloat(cs.borderLeftWidth);

/** Detects dark mode from the text color: light text means a dark theme. */
function isDarkTheme() {
  const c = getComputedStyle(document.body).color.match(/[\d.]+/g);
  if (!c || c.length < 3) return false;
  const [r, g, b] = c.map(Number);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

/** Converts the stored data URL into a blob URL so the browser decodes it only once. */
function dataUrlToBlobUrl(dataUrl) {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/data:([^;]+)/)?.[1] || "image/png";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

function getImageUrl() {
  const key = settings.imageId || settings.image.length;
  if (blobFor !== key) {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = dataUrlToBlobUrl(settings.image);
    blobFor = key;
  }
  return blobUrl;
}

// ---------- Saving / restoring inline styles ----------

function remember(el) {
  if (el.dataset[MARK] !== undefined) return;
  el.dataset[MARK] = JSON.stringify(PROPS.map((p) => [el.style.getPropertyValue(p), el.style.getPropertyPriority(p)]));
}

const setImp = (el, prop, val) => el.style.setProperty(prop, val, "important");

function restoreAll() {
  document.querySelectorAll(`[data-${MARK}]`).forEach((el) => {
    try {
      JSON.parse(el.dataset[MARK]).forEach(([v, pr], i) => {
        v ? el.style.setProperty(PROPS[i], v, pr) : el.style.removeProperty(PROPS[i]);
      });
    } catch {}
    delete el.dataset[MARK];
    delete el.dataset.aibgGlass;
  });
  document.querySelectorAll("[data-aibg-pseudo]").forEach((el) => delete el.dataset[PSEUDO]);
  seen = new WeakSet();
}

// ---------- Image layer & injected CSS ----------

function updateLayerAndStyle() {
  const tint = isDarkTheme() ? "0,0,0" : "255,255,255";

  let el = document.getElementById(LAYER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = LAYER_ID;
    document.documentElement.appendChild(el);
  }
  // Extend the layer when blurred so the soft edges stay off-screen
  const pad = settings.blur > 0 ? settings.blur * 2 : 0;
  Object.assign(el.style, {
    position: "fixed",
    inset: `-${pad}px`,
    zIndex: "-2147483647",
    pointerEvents: "none",
    backgroundImage: `linear-gradient(rgba(${tint},${settings.dim}), rgba(${tint},${settings.dim})), url("${getImageUrl()}")`,
    backgroundSize: `auto, ${settings.fit}`,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    filter: settings.blur > 0 ? `blur(${settings.blur}px)` : "none",
  });

  let st = document.getElementById(STYLE_ID);
  if (!st) {
    st = document.createElement("style");
    st.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(st);
  }
  const g = settings.glass;
  st.textContent = `
    :root {
      --aibg-glass-bg: rgba(${tint}, ${(g * 0.55).toFixed(3)});
      --aibg-glass-blur: blur(${Math.round(g * 24)}px) saturate(1.2);
    }
    html, body { background: transparent !important; }
    hr { border-color: ${FAINT_BORDER} !important; }
    /* Claude switches on a "bg-page" background around the composer while scrolled up (data-cds-dock-masked) */
    [class*="bg-page"]:not([role="dialog"] *, dialog *, [role="menu"] *, [data-radix-popper-content-wrapper] *) {
      background-color: transparent !important;
      background-image: none !important;
    }
    /* Decorative layers inside a sticky bottom dock (ChatGPT shows a solid strip there while scrolled up) */
    [class*="sticky"][class*="bottom-0"] [class*="pointer-events-none"][class*="background-"],
    [class*="footer-"] > [class*="background-"][class*="surface-"] {
      background-color: transparent !important;
      background-image: none !important;
      backdrop-filter: none !important;
    }
    [data-aibg-pseudo]::before, [data-aibg-pseudo]::after {
      background: transparent !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
  `;
}

// ---------- Page scan ----------

const SKIP_TAGS = new Set(["IMG", "VIDEO", "CANVAS", "SVG", "PATH", "PRE", "CODE", "BUTTON", "IFRAME", "TEXTAREA", "INPUT"]);
const SKIP_INSIDE = '[role="dialog"], dialog, [aria-modal="true"], [role="menu"], [role="listbox"], [role="tooltip"], [data-radix-popper-content-wrapper], pre';
const EDITABLE = 'textarea, [contenteditable="true"], .ProseMirror, rich-textarea';

/** True if the element (or a close ancestor) is sticky/fixed, e.g. a header or the composer dock. */
function isPinned(el) {
  for (let n = el, d = 0; n && n !== document.body && d < 12; n = n.parentElement, d++) {
    const pos = getComputedStyle(n).position;
    if (pos === "sticky" || pos === "fixed") return true;
  }
  return false;
}

function clearSurface(el, cs) {
  remember(el);
  setImp(el, "background-color", "transparent");
  if (cs.backgroundImage.includes("gradient")) setImp(el, "background-image", "none");
  setImp(el, "backdrop-filter", "none");
  setImp(el, "-webkit-backdrop-filter", "none");
}

function fadeBorders(el, cs) {
  remember(el);
  if (hasBorder(cs)) setImp(el, "border-color", FAINT_BORDER);
  // Lines drawn with box-shadow: hard shadows (blur = 0) or inset shadows
  if (cs.boxShadow && cs.boxShadow !== "none") {
    const shadows = cs.boxShadow.split(/,(?![^(]*\))/);
    const lineLike = shadows.every((s) => {
      if (/inset/.test(s)) return true;
      const px = s.match(/-?[\d.]+px/g) || [];
      return px.length >= 3 && parseFloat(px[2]) === 0;
    });
    if (lineLike) setImp(el, "box-shadow", "none");
  }
}

function pseudoPaints(el, which) {
  const ps = getComputedStyle(el, which);
  if (!ps.content || ps.content === "none") return false;
  return paints(ps);
}

function scan() {
  if (!active || !document.body) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const minArea = vw * vh * 0.15;
  const all = document.body.getElementsByTagName("*");

  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (seen.has(el) || el.id === LAYER_ID || el.dataset.aibgGlass || SKIP_TAGS.has(el.tagName.toUpperCase())) continue;
    const w = el.offsetWidth, h = el.offsetHeight;
    // Hidden elements are not marked as seen, so they get checked once they appear
    if (!w || !h) continue;
    seen.add(el);
    if (w < 150 && h < 150) continue;
    if (el.closest(SKIP_INSIDE)) continue;

    const cs = getComputedStyle(el);
    const wide = w >= vw * 0.3;

    // Divider lines rendered as thin (1–2px) elements
    if ((w <= 2 && h >= 150) || (h <= 2 && w >= 150)) {
      if (paints(cs)) clearSurface(el, cs);
      continue;
    }

    // Fade the borders of every large box
    if (w >= 200 || h >= 200) {
      if (hasBorder(cs) || (cs.boxShadow && cs.boxShadow !== "none")) fadeBorders(el, cs);
    }

    // Backgrounds painted by ::before / ::after (often a dark gradient at the bottom)
    if (wide && (pseudoPaints(el, "::before") || pseudoPaints(el, "::after"))) {
      el.dataset[PSEUDO] = "1";
    }

    if (!paints(cs)) continue;
    // Large surfaces, or tall columns such as the sidebar (even when narrowed)
    const big = w * h >= minArea || (h >= vh * 0.6 && w >= 120);
    const composerArea = wide && !!el.querySelector(EDITABLE);
    const pinnedBar = wide && isPinned(el);
    const fx = wide && (cs.backgroundImage.includes("gradient") || hasBlurFx(cs));
    // Decorative backdrop layer: absolutely positioned, non-interactive, wide
    // (e.g. ChatGPT's black strip behind the composer while scrolled up)
    const decor = wide && (cs.position === "absolute" || cs.position === "fixed") && cs.pointerEvents === "none";
    if (big || composerArea || pinnedBar || fx || decor) clearSurface(el, cs);
  }

  applyGlass(vw);
}

/** Turns the composer box into frosted glass: text behind it is blurred, typed text stays crisp. */
function applyGlass(vw) {
  document.querySelectorAll(EDITABLE).forEach((ed) => {
    if (ed.closest(SKIP_INSIDE)) return;
    for (let n = ed.parentElement, d = 0; n && n !== document.body && d < 10; n = n.parentElement, d++) {
      if (n.dataset.aibgGlass) return;
      const cs = getComputedStyle(n);
      if (parseFloat(cs.borderTopLeftRadius) >= 8 && n.offsetWidth >= vw * 0.3) {
        remember(n);
        n.dataset.aibgGlass = "1";
        setImp(n, "background-color", "var(--aibg-glass-bg)");
        setImp(n, "backdrop-filter", "var(--aibg-glass-blur)");
        setImp(n, "-webkit-backdrop-filter", "var(--aibg-glass-blur)");
        setImp(n, "border-color", "rgba(128,128,128,0.18)");
        return;
      }
    }
  });
}

let scanTimer = null;
function scheduleScan() {
  if (scanTimer) return;
  scanTimer = setTimeout(() => { scanTimer = null; scan(); }, 250);
}
function fullRescan() { seen = new WeakSet(); scheduleScan(); }

// ---------- Enable / disable ----------

function apply() {
  const shouldBeActive = !!(settings.image && settings.sites[siteKey]);
  if (!shouldBeActive) {
    if (active) {
      active = false;
      document.getElementById(LAYER_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
      restoreAll();
    }
    return;
  }
  active = true;
  updateLayerAndStyle();
  scan();
}

function load() {
  chrome.storage.local.get(Object.keys(DEFAULTS), (stored) => {
    settings = { ...DEFAULTS, ...stored, sites: { ...DEFAULTS.sites, ...(stored.sites || {}) } };
    apply();
  });
}

load();
chrome.storage.onChanged.addListener((_c, area) => { if (area === "local") load(); });

// New nodes (incoming messages, switching chats) => scan them
new MutationObserver(() => {
  if (!active) return;
  if (!document.getElementById(LAYER_ID) || !document.getElementById(STYLE_ID)) updateLayerAndStyle();
  scheduleScan();
}).observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("resize", fullRescan);

// Existing nodes can change class without being replaced => periodically rescan everything
setInterval(() => { if (active) fullRescan(); }, 4000);

// Theme switches or UI state changes (e.g. Claude adds a background to the composer dock
// when scrolling up) => refresh the tint and rescan right away
new MutationObserver((muts) => {
  if (!active) return;
  if (muts.some((m) => m.target === document.documentElement)) updateLayerAndStyle();
  fullRescan();
}).observe(document.documentElement, {
  attributes: true,
  subtree: true,
  attributeFilter: ["class", "data-theme", "data-state", "data-cds-dock-masked", "data-cds-dock-mask"],
});
