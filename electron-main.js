/* ==========================================
   ELECTRON-MAIN.JS — Micro Borderlands
   Desktop entry point
   ========================================== */

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// ── Keep a global reference to prevent GC closing the window ──
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    // ── Window size — matches your 800x450 canvas + some chrome ──
    width:  900,
    height: 540,
    minWidth:  800,
    minHeight: 480,

    // ── Appearance ──
    title:           'Micro Borderlands',
    backgroundColor: '#0d0d0d',
    show: false,   // wait until ready-to-show to avoid white flash

    // ── Frame & controls ──
    frame:     true,
    resizable: true,

    webPreferences: {
      // Allow localStorage (same as browser) ──
      nodeIntegration: false,
      contextIsolation: true,

      // Needed so audio works without user gesture on first load ──
      autoplayPolicy: 'no-user-gesture-required',

      // Dev tools available in dev mode ──
      devTools: !app.isPackaged,
    }
  });

  // ── Load your game ──
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // ── Show once ready so there's no white flash ──
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // ── Open external links in the system browser, not a new Electron window ──
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // ── Dev: open DevTools automatically (remove for release) ──
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App lifecycle ──
app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window when dock icon is clicked and no windows open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
