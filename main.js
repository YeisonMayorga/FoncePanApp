const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'www/login.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- MANEJO DE AUTOACTUALIZACIONES ---
autoUpdater.on('checking-for-update', () => {
  console.log('Buscando actualizaciones...');
});

autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Actualización disponible',
    message: `Se encontró una nueva versión (${info.version}). ¿Deseas actualizar ahora?`,
    buttons: ['Sí', 'No']
  }).then(result => {
    if (result.response === 0) autoUpdater.downloadUpdate();
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('No hay nuevas actualizaciones.');
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    title: 'Actualización lista',
    message: 'La actualización se instalará al reiniciar la aplicación.'
  }).then(() => {
    autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', (err) => {
  console.error('Error en autoUpdater:', err);
});

// --- EVENTOS APP ---
app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
