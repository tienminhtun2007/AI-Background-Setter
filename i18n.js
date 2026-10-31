// UI strings for the popup. To add a language, add a new key here and a button in popup.html.
const STRINGS = {
  en: {
    noImage: "No image yet",
    pick: "Choose image",
    clear: "Remove image",
    loading: "Loading image…",
    saved: (mb) => `Set as background (${mb} MB)`,
    removed: "Image removed.",
    readError: "Could not read this image.",
    glass: "Composer frosted glass",
    glassHint: "Blurs the text scrolling behind the message box.",
    dim: "Image tint",
    dimHint: "0% = original image. Increase if the image is too busy.",
    blur: "Image blur",
    fit: "Display mode",
    fitCover: "Fill the screen",
    fitContain: "Fit (show whole image)",
    fitAuto: "Original size",
    enabledOn: "Enabled on",
  },
  vi: {
    noImage: "Chưa có ảnh",
    pick: "Chọn ảnh",
    clear: "Xóa ảnh",
    loading: "Đang tải ảnh…",
    saved: (mb) => `Đã đặt làm nền (${mb} MB)`,
    removed: "Đã xóa ảnh.",
    readError: "Không đọc được ảnh này.",
    glass: "Kính mờ ô nhập",
    glassHint: "Làm mờ phần chữ cuộn phía sau ô nhập để dễ gõ.",
    dim: "Phủ màu lên ảnh",
    dimHint: "0% = ảnh nguyên bản. Tăng nếu ảnh quá rối.",
    blur: "Làm mờ ảnh",
    fit: "Kiểu hiển thị",
    fitCover: "Phủ kín màn hình",
    fitContain: "Vừa khung (giữ nguyên ảnh)",
    fitAuto: "Kích thước gốc",
    enabledOn: "Bật trên",
  },
};

/** Default language follows the browser: Vietnamese browsers get "vi", everyone else "en". */
const defaultLang = () => (navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en";
