import {supabase} from '../backend/supabase/supabaseCliente.js';

const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');
const recordarCheck = document.getElementById('recordar');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const selectUsuarios = document.getElementById('usuario-guardado');
const togglePasswordBtn = document.getElementById('toggle-password');
const emailIcon = document.getElementById('email-icon');
const emailMessage = document.getElementById('email-message');
const passwordMessage = document.getElementById('password-message');
const btnText = loginBtn.querySelector('.btn-text');
const btnLoader = loginBtn.querySelector('.btn-loader');
const connectionStatus = document.getElementById('connectionStatus');
const connectionText = document.getElementById('connectionText');
const connectionSpinner = document.getElementById('connectionSpinner');
const errorModal = new bootstrap.Modal(document.getElementById('errorConnectionModal'));
const retryConnectionBtn = document.getElementById('retryConnectionBtn');

// === Validación en tiempo real ===
let emailValid = false;
let passwordValid = false;

emailInput.addEventListener('input', () => {
  validateEmail();
  clearError();
});

emailInput.addEventListener('blur', () => {
  validateEmail();
});

passwordInput.addEventListener('input', () => {
  validatePassword();
  clearError();
});

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && emailValid && passwordValid) {
    handleLogin();
  }
});

function validateEmail() {
  const email = emailInput.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (email === '') {
    emailIcon.innerHTML = '';
    emailMessage.textContent = '';
    emailValid = false;
    return;
  }
  
  if (emailRegex.test(email)) {
    emailIcon.innerHTML = '<i class="bi bi-check-circle-fill"></i>';
    emailIcon.className = 'input-group-text validation-icon valid';
    emailMessage.textContent = 'Correo válido';
    emailMessage.className = 'text-muted validation-message valid';
    emailInput.classList.remove('error');
    emailValid = true;
  } else {
    emailIcon.innerHTML = '<i class="bi bi-x-circle-fill"></i>';
    emailIcon.className = 'input-group-text validation-icon invalid';
    emailMessage.textContent = 'Formato de correo inválido';
    emailMessage.className = 'text-muted validation-message invalid';
    emailInput.classList.add('error');
    emailValid = false;
  }
}

function validatePassword() {
  const password = passwordInput.value.trim();
  
  if (password === '') {
    passwordMessage.textContent = '';
    passwordValid = false;
    return;
  }
  
  if (password.length < 6) {
    passwordMessage.textContent = 'La contraseña debe tener al menos 6 caracteres';
    passwordMessage.className = 'text-muted validation-message invalid';
    passwordInput.classList.add('error');
    passwordValid = false;
  } else {
    passwordMessage.textContent = '';
    passwordInput.classList.remove('error');
    passwordValid = true;
  }
}

function clearError() {
  errorMsg.textContent = '';
  errorMsg.classList.remove('show', 'success');
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.add('show');
  errorMsg.classList.remove('success');
  
  // Agregar clase error a los inputs
  emailInput.classList.add('error');
  passwordInput.classList.add('error');
  
  // Remover después de la animación
  setTimeout(() => {
    emailInput.classList.remove('error');
    passwordInput.classList.remove('error');
  }, 500);
}

function showSuccess(message) {
  errorMsg.textContent = message;
  errorMsg.classList.add('show', 'success');
}

function setLoading(state) {
  if (state) {
    loginBtn.classList.add('loading');
    btnText.classList.add('d-none');
    btnLoader.classList.remove('d-none');
  } else {
    loginBtn.classList.remove('loading');
    btnText.classList.remove('d-none');
    btnLoader.classList.add('d-none');
  }
}

// === Toggle mostrar/ocultar contraseña ===
togglePasswordBtn.addEventListener('click', () => {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  
  const icon = togglePasswordBtn.querySelector('i');
  if (type === 'password') {
    icon.classList.remove('bi-eye-slash');
    icon.classList.add('bi-eye');
  } else {
    icon.classList.remove('bi-eye');
    icon.classList.add('bi-eye-slash');
  }
});

// === Verificación de conexión a Internet ===
async function checkInternetConnection() {
  // Verificar primero si hay conexión de red usando la API de navegador
  if (navigator.onLine === false) {
    return false;
  }
  
  try {
    // Verificar conectividad usando fetch con timeout corto
    // Usamos un endpoint pequeño y rápido
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    // Si fetch falla, puede ser que no haya internet o el navegador bloquee
    // En ese caso, confiamos en navigator.onLine que ya verificamos antes
    return navigator.onLine;
  }
}

// === Verificación de conexión con Supabase ===
async function checkSupabaseConnection() {
  try {
    // Intentar hacer una consulta simple a Supabase con timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    
    const queryPromise = supabase
      .schema('inventario')
      .from('usuarios')
      .select('id')
      .limit(1);
    
    await Promise.race([queryPromise, timeoutPromise]);
    
    // Si llegamos aquí, la consulta se completó (aunque pueda haber errores de permisos)
    // Lo importante es que Supabase respondió
    return true;
  } catch (error) {
    // Verificar si es un error de red/conexión
    if (error.message === 'Timeout' || error.message?.includes('fetch') || error.message?.includes('network')) {
      console.error('Error de conexión con Supabase:', error);
      return false;
    }
    // Otros errores (como permisos) indican que Supabase está funcionando
    return true;
  }
}

// === Función principal de verificación de conexión ===
async function verifyConnection() {
  // Verificar conexión a Internet primero
  const hasInternet = await checkInternetConnection();
  
  if (!hasInternet) {
    updateConnectionStatus('error', 'Sin conexión a internet');
    showConnectionError();
    return false;
  }
  
  // Si hay internet, verificar Supabase
  const supabaseConnected = await checkSupabaseConnection();
  
  if (!supabaseConnected) {
    updateConnectionStatus('error', 'Error de conexión con el servidor');
    showConnectionError();
    return false;
  }
  
  // Todo está bien
  updateConnectionStatus('connected', '<i class="bi bi-wifi me-1"></i>Conectado');
  return true;
}

// === Actualizar estado de conexión en la UI ===
function updateConnectionStatus(status, text) {
  connectionStatus.className = `connection-status ${status}`;
  connectionText.innerHTML = text;
  
  if (status === 'connected' || status === 'error') {
    connectionSpinner.style.display = 'none';
  } else {
    connectionSpinner.style.display = 'inline-block';
  }
}

// === Mostrar modal de error de conexión ===
function showConnectionError() {
  // Deshabilitar formulario
  emailInput.disabled = true;
  passwordInput.disabled = true;
  loginBtn.disabled = true;
  selectUsuarios.disabled = true;
  
  // Mostrar modal después de un pequeño delay para mejor UX
  setTimeout(() => {
    errorModal.show();
  }, 500);
}

// === Ocultar modal y reintentar conexión ===
retryConnectionBtn.addEventListener('click', async () => {
  errorModal.hide();
  updateConnectionStatus('loading', 'Verificando conexión...');
  connectionSpinner.style.display = 'inline-block';
  
  // Rehabilitar formulario
  emailInput.disabled = false;
  passwordInput.disabled = false;
  loginBtn.disabled = false;
  selectUsuarios.disabled = false;
  
  // Reintentar conexión
  const connected = await verifyConnection();
  
  if (!connected) {
    // Si falla, volver a mostrar el modal después de un momento
    setTimeout(() => {
      showConnectionError();
    }, 1000);
  }
});

// === 1. Poblar usuarios recordados y verificar conexión ===
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar conexión inmediatamente
  await verifyConnection();
  
  // Poblar usuarios recordados
  const usuarios = JSON.parse(localStorage.getItem('usuariosRecordados') || '[]');

  usuarios.forEach(u => {
    const option = document.createElement('option');
    option.value = u.email;
    option.textContent = u.email;
    selectUsuarios.appendChild(option);
  });

  selectUsuarios.addEventListener('change', () => {
    const seleccionado = usuarios.find(u => u.email === selectUsuarios.value);
    if (seleccionado) {
      emailInput.value = seleccionado.email;
      passwordInput.value = seleccionado.password;
      validateEmail();
      validatePassword();
      clearError();
    }
  });
  
  // Validar campos si tienen valor inicial
  if (emailInput.value) validateEmail();
  if (passwordInput.value) validatePassword();
  
  // Verificar conexión periódicamente (cada 30 segundos)
  setInterval(async () => {
    const statusClass = connectionStatus.className;
    if (!statusClass.includes('error')) {
      const connected = await verifyConnection();
      if (!connected && !document.querySelector('.modal.show')) {
        showConnectionError();
      }
    }
  }, 30000);
  
  // Listener para cambios en la conexión del navegador
  window.addEventListener('online', async () => {
    updateConnectionStatus('loading', 'Verificando conexión...');
    connectionSpinner.style.display = 'inline-block';
    await verifyConnection();
  });
  
  window.addEventListener('offline', () => {
    updateConnectionStatus('error', 'Sin conexión a internet');
    showConnectionError();
  });
});

// === 2. Login y lógica ===
async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Verificar conexión antes de intentar login
  const isConnected = connectionStatus.className.includes('connected');
  if (!isConnected) {
    showError('Verifica tu conexión antes de iniciar sesión.');
    await verifyConnection();
    if (!connectionStatus.className.includes('connected')) {
      showConnectionError();
      return;
    }
  }

  // Validaciones
  if (!email || !password) {
    showError('Completa ambos campos.');
    return;
  }

  if (!emailValid) {
    showError('Corrige el formato del correo.');
    emailInput.focus();
    return;
  }

  if (!passwordValid) {
    showError('La contraseña debe tener al menos 6 caracteres.');
    passwordInput.focus();
    return;
  }

  setLoading(true);
  clearError();

  try {
    // Login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      showError('Correo o contraseña incorrectos');
      console.error(error);
      return;
    }

    const userId = data.user.id;

    // Verificar si el usuario está activo
    const { data: usuario, error: errUsuario } = await supabase
      .schema('inventario')
      .from('usuarios')
      .select('activo')
      .eq('id', userId)
      .single();

    if (errUsuario || !usuario || !usuario.activo) {
      setLoading(false);
      showError('Cuenta deshabilitada.');
      await supabase.auth.signOut();
      return;
    }

    // Actualizar último login
    const colombiaOffset = -5 * 60; // -5 horas en minutos
    const now = new Date();
    const colombiaDate = new Date(now.getTime() + colombiaOffset * 60 * 1000);
    await supabase
      .schema('inventario')
      .from('usuarios')
      .update({ ultimo_login: colombiaDate.toISOString().slice(0, 19).replace('T', ' ') })
      .eq('id', userId);

    // Guardar usuario en localStorage si se marcó "recordar"
    if (recordarCheck.checked) {
      let guardados = JSON.parse(localStorage.getItem('usuariosRecordados') || '[]');
      guardados = guardados.filter(u => u.email !== email); // Evitar duplicados
      guardados.push({ email, password });
      localStorage.setItem('usuariosRecordados', JSON.stringify(guardados));
    }

    // Mostrar éxito antes de redirigir
    showSuccess('¡Inicio de sesión exitoso!');
    setLoading(false);
    
    // Redirigir después de un breve delay
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 500);

  } catch (error) {
    setLoading(false);
    
    // Verificar si es un error de conexión
    if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
      updateConnectionStatus('error', 'Error de conexión');
      showConnectionError();
    } else {
      showError('Error de conexión. Intenta nuevamente.');
    }
    
    console.error(error);
  }
}

loginBtn.addEventListener('click', handleLogin);