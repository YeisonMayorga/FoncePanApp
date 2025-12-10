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

// === 1. Verificar sesión activa y poblar usuarios recordados ===
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar si hay una sesión activa
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session && !error) {
      // Hay una sesión activa, verificar que el usuario esté activo
      const userId = session.user.id;
      const { data: usuario, error: errUsuario } = await supabase
        .schema('inventario')
        .from('usuarios')
        .select('activo')
        .eq('id', userId)
        .single();

      // Si el usuario existe y está activo, redirigir a home
      if (!errUsuario && usuario && usuario.activo) {
        window.location.href = 'home.html';
        return;
      } else {
        // Si el usuario no está activo, cerrar sesión
        await supabase.auth.signOut();
      }
    }
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    // Si hay error, continuar mostrando el login
  }

  // Listener para cambios en el estado de autenticación
  // Si el usuario inicia sesión en otra pestaña o la sesión se restaura
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Si hay un inicio de sesión, verificar y redirigir
      window.location.href = 'home.html';
    } else if (event === 'SIGNED_OUT') {
      // Si hay cierre de sesión, asegurarse de que estamos en login
      // (no hacer nada si ya estamos en login)
    }
  });

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
});

// === 2. Login y lógica ===
async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

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
    showError('Error de conexión. Intenta nuevamente.');
    console.error(error);
  }
}

loginBtn.addEventListener('click', handleLogin);