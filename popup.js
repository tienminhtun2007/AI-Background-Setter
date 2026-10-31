// Popup UI: picks the image, edits the settings and stores them in chrome.storage.local.
// The content script listens for storage changes and updates open tabs immediately.

const DEFAULTS = {
  image: null,
  imageId: null,
  dim: 0,
  blur: 0,
  fit: "cover",
  glass: 0.6,
  lang: null,
  sites: { claude: true, chatgpt: true, gemini: true },
};

const $ = (id) => document.getElementById(id);
let state = structuredClone(DEFAULTS);

const t = (key, ...args) => {
  const s = (STRINGS[state.lang] || STRINGS.en)[key];
  return typeof s === "function" ? s(...args) : s;
};

function renderLanguage() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-lang]").forEach((b) => b.classList.toggle("on", b.dataset.lang === state.lang));
}

function render() {
  renderLanguage();
  $("preview").style.backgroundImage = state.image ? `url("${state.image}")` : "none";
  $("preview").textContent = state.image ? "" : t("noImage");
  $("glass").value = state.glass;
  $("glassVal").textContent = Math.round(state.glass * 100) + "%";
  $("dim").value = state.dim;
  $("dimVal").textContent = Math.round(state.dim * 100) + "%";
  $("blur").value = state.blur;
  $("blurVal").textContent = state.blur + "px";
  $("fit").value = state.fit;
  document.querySelectorAll("[data-site]").forEach((cb) => {
    cb.checked = !!state.sites[cb.dataset.site];
  });
}

// Only write the changed keys, so replacing the image keeps every other setting
function save(patch) {
  state = { ...state, ...patch };
  chrome.storage.local.set(patch);
  render();
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

$("pick").onclick = () => $("file").click();

$("file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $("status").textContent = t("loading");
  try {
    // Keep the original file: no compression, no resizing
    const dataUrl = await readAsDataUrl(file);
    save({ image: dataUrl, imageId: Date.now() });
    $("status").textContent = t("saved", (file.size / 1024 / 1024).toFixed(1));
  } catch {
    $("status").textContent = t("readError");
  }
  e.target.value = "";
};

$("clear").onclick = () => {
  save({ image: null, imageId: null });
  $("status").textContent = t("removed");
};

$("glass").oninput = (e) => save({ glass: parseFloat(e.target.value) });
$("dim").oninput = (e) => save({ dim: parseFloat(e.target.value) });
$("blur").oninput = (e) => save({ blur: parseInt(e.target.value, 10) });
$("fit").onchange = (e) => save({ fit: e.target.value });

document.querySelectorAll("[data-site]").forEach((cb) => {
  cb.onchange = () => save({ sites: { ...state.sites, [cb.dataset.site]: cb.checked } });
});

document.querySelectorAll("[data-lang]").forEach((b) => {
  b.onclick = () => { save({ lang: b.dataset.lang }); $("status").textContent = ""; };
});

chrome.storage.local.get(Object.keys(DEFAULTS), (stored) => {
  state = { ...DEFAULTS, ...stored, sites: { ...DEFAULTS.sites, ...(stored.sites || {}) } };
  if (!state.lang) state.lang = defaultLang();
  render();
});
