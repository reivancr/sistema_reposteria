// =====================================================================
//  CONFIGURACIÓN DE GOOGLE FIREBASE — Dulce Menta Bakery System
//  Permite la sincronización en la nube (Cloud Firestore) y publicación
//  directa desde el repositorio de GitHub hacia Firebase Hosting.
// =====================================================================

(function() {
  // 1. Configuración por defecto vinculada al proyecto de Firebase
  const defaultFirebaseConfig = {
    apiKey: "AIzaSyBYXCB5bQebxVTMCQbQLZmWuxn2OJtLH2M",
    authDomain: "mi-panaderia-dd7f4.firebaseapp.com",
    projectId: "mi-panaderia-dd7f4",
    storageBucket: "mi-panaderia-dd7f4.firebasestorage.app",
    messagingSenderId: "452603323199",
    appId: "1:452603323199:web:4a341c24eeb0d31acca98a"
  };

  // 2. Cargar configuración guardada en localStorage si el usuario la ingresó en la app
  function loadStoredConfig() {
    try {
      const raw = localStorage.getItem('dulcementa_firebase_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.projectId && parsed.apiKey && parsed.apiKey.trim() !== '') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error leyendo firebase config de localStorage:', e);
    }
    return defaultFirebaseConfig;
  }

  // Exponer globalmente
  window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || loadStoredConfig();

  window.isFirebaseConfigured = function() {
    const cfg = window.FIREBASE_CONFIG;
    return Boolean(cfg && cfg.projectId && cfg.apiKey && cfg.projectId.trim() !== "");
  };

  window.saveCustomFirebaseConfig = function(configObj) {
    if (!configObj || typeof configObj !== 'object') return false;
    window.FIREBASE_CONFIG = configObj;
    localStorage.setItem('dulcementa_firebase_config', JSON.stringify(configObj));
    return true;
  };
})();
