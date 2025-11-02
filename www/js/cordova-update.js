// --- Este script NO es módulo ---
// Se ejecuta en el scope global y solo actúa si está dentro de Cordova

(function () {
  // Detectar si es entorno Cordova (app instalada)
  const isCordova = typeof window.cordova !== 'undefined';

  if (!isCordova) {
    console.log('🌐 Entorno navegador detectado, Cordova no cargado.');
    return; // En navegador no hace nada
  }

  document.addEventListener('deviceready', async () => {
    console.log('📱 Cordova lista, verificando actualizaciones...');

    try {
      const currentVersion = await new Promise((resolve, reject) => {
        cordova.getAppVersion.getVersionNumber(resolve, reject);
      });

      const res = await fetch('https://updates.sexafeel.com/version.php');
      const data = await res.json();

      const latest = data.android.version;
      const apkUrl = data.android.url;

      if (latest !== currentVersion) {
        if (confirm(`Hay una nueva versión (${latest}) disponible. ¿Deseas actualizar ahora?`)) {
          cordova.InAppBrowser.open(apkUrl, '_system');
        }
      } else {
        console.log(`✅ App actualizada (v${currentVersion})`);
      }
    } catch (err) {
      console.error('❌ Error verificando actualizaciones:', err);
    }
  });
})();
