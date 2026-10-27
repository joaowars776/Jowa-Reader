## 📖 Novel-Reader: ePUB & PDF Reader (Offline, Portable, Multi-Language)

### Wuxia / Xianxia / Xuanhuan Readers, this is for you, but also for everyone else!

A lightweight, offline, customizable reader for EPUB, PDF, MOBI, AZW, and TXT files — built especially for webnovel and light novel fans.
I started this project out of love for Wuxia, Xianxia, Xuanhuan and light novels in general. With sites shutting down and online access becoming fragile, I built my own 100% private and portable solution.

You can also read Manhwas/manga images on this project

💬 Need help? Message me on Discord: **joaowars776**

---

## ✨ What's New & Core Features

### 🌐 20 Supported Languages
Enjoy the entire interface and reading tools in 20 global languages:
<br>
🇺🇸 **English** | 🇧🇷 **Português** | 🇪🇸 **Español** | 🇫🇷 **Français** | 🇩🇪 **Deutsch** | 🇮🇹 **Italiano** | 🇳🇱 **Nederlands** | 🇷🇺 **Русский** | 🇹🇷 **Türkçe** | 🇮🇳 **हिन्दी** | 🇮🇩 **Indonesian** | 🇹🇭 **ไทย** | 🇵🇰 **اردو** | 🇳🇬 **Yoruba** | 🇯🇵 **日本語** | 🇰🇷 **한국어** | 🇨🇳 **中文** | 🇧🇩 **বাংলা** | 🇸🇦 **العربية** | 🇹🇿 **Swahili**

### 🤖 Offline Translation & AI Support
- **Offline Translation (LibreTranslate - No AI):** Translate selected text passages or entire chapters privately and locally using your own LibreTranslate instance, with a one-click startup script (`Start-LibreTranslate.bat`).
- **Full-Book AI Translator (Ollama Support):** Translate entire EPUB/PDF books in the background with local neural models, featuring live progress metrics, persistent state, and an automated EPUB compiler that packages your translated eBook instantly.

### 🏛️ Interface Themes & Styles
Customize the layout and aesthetic of menus, sidebars, and control panels with distinct interface themes:
- **Classic:** Clean, traditional, and high-contrast window styling.
- **Wooden:** Warm, cozy, and textured timber aesthetics.
- **Neon:** Vibrant, cyberpunk-inspired glow accents with custom color pickers.
- **Retro 8-Bit:** Nostalgic pixelated styling and retro window borders.

### 🎨 Visual Themes, Glassmorphism & Atmospheric Effects
- **Visual Color Themes:** Rich reading canvas palettes including Light, Dark, Night mode, Sepia, High Contrast, Rain, Snow, and Aurora sub-themes.
- **Glassmorphism:** Frosted glass blur effects with customizable opacity, blur sliders, backdrop variations, and tint colors.
- **Atmospheric Particle Canvases:** Full-screen animated weather particles including falling Rain (with adjustable intensity), floating Snow, and Aurora petals.
- **Colored Side Margins:** Adjustable lateral book margins (0–150px) framing the reading canvas with custom colors and animated effects (pulse, snow, rain, thunder, sand).

### 📝 Notes & Study Workspace
- **Dedicated Notes Area:** A fully integrated study and note-taking workspace right inside your library and reader. Create unlimited notes with customizable card colors, font families, and sizes, featuring automatic saving, per-profile isolation, unified bookmark aggregation, and a 30-day recycling trash bin.

### 📊 Reading History & Statistics
- **Reading History & Stats Hub:** Track your reading journey in depth. View total reading time, books read, chapters read, current/longest reading streaks, average pace, detailed activity logs, trend charts, and quick chapter continuation history.

### 📖 Reading Experience & Progress Tracking
- **Mark Read Text:** Automatically tracks your reading progression by highlighting paragraphs scrolled past the top viewport for over 3 seconds (with intelligent scroll-back detection and 4 distinct styles: fade, underline, strikethrough, or highlight).
- **Bookmarks & Highlights:** Highlight text passages with custom colors, add notes, and organize everything in a dedicated study workspace.

### 👥 User Profiles & Server-Side Persistence
- **Instant Profile Switcher:** Manage multiple separate user accounts instantly, keeping libraries, reading streaks, notes, favorites, and settings strictly isolated.
- **Server Disk Storage:** Automatic file recovery and persistence under `/UserData/`, ensuring your books and progress are never lost even if the browser cache is cleared.

### 💾 Data Manager & Backup
- **Full ZIP Backup & Restore:** Export your entire reader into a standalone `.zip` archive preserving book files, covers, history, notes, user profiles, favorites, and exact custom preferences.

---

## ⚙️ Installation & Usage

### 🚀 Quick Start (Windows):
1. **Run.bat**: Double-click this to automatically install dependencies (on first run) and start the reader instantly!

### 💻 Manual Installation:
<pre>npm install</pre>
<pre>npm run dev</pre>
Access at: http://localhost:5173/

### 📦 100% Portability Notice:
This project is inherently portable by design, storing all user accounts, settings, notes, and books locally under `/UserData/`. If you want a completely portable Node.js environment, you can download the Node.js portable ZIP archive, extract it into the project folder, and point `Run.bat` to use that specific Node executable. This makes the entire application and runtime 100% self-contained and portable!
