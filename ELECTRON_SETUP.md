# Micro Borderlands — Electron Setup

## One-time setup (5 minutes)

### 1. Install Node.js
Download from https://nodejs.org — pick the LTS version. Install it, restart your terminal.

Verify it worked:
```
node -v
npm -v
```

### 2. Drop these two files into your game folder (same folder as index.html)
- `package.json`
- `electron-main.js`

Your folder should look like:
```
micro-borderlands/
  index.html
  electron-main.js   ← new
  package.json       ← new
  state.js
  combat.js
  loot.js
  ... all your other js files
  sprites/
```

### 3. Open a terminal in your game folder and run:
```
npm install
```
This downloads Electron (~150MB) into a `node_modules` folder. Only needed once.

---

## Running the game

Every time you want to play / test:
```
npm start
```
That's it. A window opens running your game natively.

**Hot reload:** Just edit your JS files and press `Ctrl+R` in the game window to reload — no server needed.

---

## Building a standalone .exe

When you want a proper installer to share or keep:
```
npm run build
```
Outputs to the `dist/` folder:
- `MicroBorderlands Setup 1.0.0.exe` — full installer
- Or run `npm run build-portable` for a single portable `.exe` with no install needed

---

## Tips

- **DevTools:** While developing (`npm start`), DevTools opens automatically detached. Close it if you don't need it.
- **localStorage** works exactly like in the browser — all your save data persists between sessions.
- **Adding new files:** Just drop them in the folder and add `<script>` tags in `index.html` as normal. No bundler, no config changes needed.
- **Icon:** To add a custom window icon, drop a 256x256 `icon.ico` file in the root folder.

---

## Folder to add to .gitignore

Add this to your `.gitignore` so you don't commit the giant node_modules folder:
```
node_modules/
dist/
```
