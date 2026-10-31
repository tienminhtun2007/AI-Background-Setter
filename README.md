# 🖼️ AI Background

A small Chrome extension that puts your own image **behind** the chat on Claude, ChatGPT and Gemini, so the image is the real page background rather than a tinted overlay.

[🇻🇳 Tiếng Việt bên dưới](#tiếng-việt)

## Features

- **Real background:** the image sits behind the content and is shown untouched, with no compression and no resizing.
- **Clean surfaces:** the chat pane, sidebar, header and the area around the composer become transparent, and divider lines are faded out.
- **Frosted-glass composer:** text scrolling behind the message box is blurred so what you type stays readable (adjustable, 0% = fully transparent).
- **Keeps what matters:** message bubbles, code blocks, menus and dialogs keep their own backgrounds.
- **Adjustable:** image tint, image blur and display mode (fill, fit, original size).
- **Per-site toggle** for Claude, ChatGPT and Gemini.
- **English / Tiếng Việt** interface, switchable in the popup.
- Works in both light and dark themes.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` (also works in Edge, Brave, Cốc Cốc and other Chromium browsers).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the repository folder.
5. Pin the extension, click its icon and choose an image.

## How it works

`content.js` inserts a fixed image layer at the bottom of the page's stacking order, then scans the page for elements that would hide it: large surfaces, tall columns like the sidebar, sticky bars, the composer dock, gradient overlays, backdrop blurs and `::before`/`::after` backgrounds. It makes those transparent with inline `!important` styles and remembers the original values so everything is restored when you remove the image or turn a site off.

Because the sites change their DOM constantly, the script rescans when nodes are added, when classes or UI state attributes change, on resize, and every few seconds.

Settings and the image are stored in `chrome.storage.local`; nothing leaves your browser.

## Project structure

```
manifest.json      Extension manifest (Manifest V3)
content.js         Runs on the supported sites and applies the background
popup.html/js      Settings popup
i18n.js            Popup strings (English, Vietnamese)
_locales/          Extension name and description per language
icons/             Toolbar and store icons
```

## Known limitations

- The sites' layouts change often. If a new dark area or line appears after an update, open an issue with a screenshot.
- Very large images (tens of MB) can make the page slower to load.

## License

[MIT](LICENSE)

---

## Tiếng Việt

Extension Chrome đặt ảnh của bạn làm **nền thật** (nằm phía sau nội dung) cho Claude, ChatGPT và Gemini.

**Tính năng:** ảnh giữ nguyên bản; khung chat, sidebar, header và vùng ô nhập trong suốt; ô nhập dạng kính mờ để chữ cuộn phía sau không đè lên chữ đang gõ; chỉnh được độ phủ màu, độ mờ và kiểu hiển thị; bật/tắt riêng từng trang; giao diện tiếng Anh và tiếng Việt.

**Cài đặt:** tải repo về → mở `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn thư mục repo → bấm icon extension và chọn ảnh.

Ảnh và cài đặt chỉ lưu trong trình duyệt của bạn.
