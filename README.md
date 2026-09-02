# 🖥️ TPPage — Windows 95 Style Website

A personal website featuring a **Windows 95** desktop interface, complete with a retro boot screen, draggable windows, live comment system, visitor counter, andStart Menu navigation.

👉 **Live Site:** [tppage.github.io](https://tppage.github.io)  
🐙 **GitHub Repo:** [github.com/tppage/tppage.github.io](https://www.github.com/tppage/tppage.github.io)

---

## 📌 Projects Included

- **`trioxide.exe`**: Fake Win32 virus with OpenGL shaders.
- **`italy.exe`**: Win32/DOS C++ program generating ASCII art of Italy.
- **`ibm_pc_case`**: IBM PC-inspired ATX case (3D `.stl` model + gallery).
- **`comments.log`**: Live terminal-style comment log[cite: 1, 2].

---

## ✨ Key Features

- **🕹️ Retro UI:** Custom Windows 95 theme, CRT scanline effect, and retro fonts (*Press Start 2P*, *VT323*)[cite: 3].
- **🪟 Draggable Windows:** Interactive modals and sidebars[cite: 2].
- **💬 Live Comments:** Serverless backend using Google Apps Script[cite: 2].
- **📊 Visitor Counter:** Real-time visits powered by Cloudflare Workers & GoatCounter[cite: 1, 2].
- **⚡ Vanilla Tech:** Pure HTML5, CSS3, and ES6+ JavaScript (no frameworks)[cite: 1, 2, 3].
- **⌨️ Keyboard Shortcuts:** `F1` for Help, `ESC` to close windows[cite: 1, 2].

---

## 📁 Repository Structure

```text
tppage.github.io/
├── index.html            # Core layout & modal windows
├── script.js             # Drag logic, APIs, time & events
├── style.css             # CRT overlay, retro typography & themes
├── icons/                # Bitmap icons
└── projects/             # Downloads (.zip, .cpp, .stl, images)
