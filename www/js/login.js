import { supabase } from './app.js';

const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');
const recordarCheck = document.getElementById('recordar');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const selectUsuarios = document.getElementById('usuario-guardado');

// === 1. Poblar usuarios recordados ===
document.addEventListener('DOMContentLoaded', () => {








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
    }
  });
});

// === 2. Login y lógica ===
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    errorMsg.textContent = 'Completa ambos campos.';
    return;
  }

  // Login
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorMsg.textContent = 'Correo o contraseña incorrectos';
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
    errorMsg.textContent = 'Cuenta deshabilitada.';
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
  .update({ ultimo_login: colombiaDate.toISOString().slice(0, 19).replace('T', ' ') }) // formato 'YYYY-MM-DD HH:MM:SS'
  .eq('id', userId);


  // Guardar usuario en localStorage si se marcó "recordar"
  if (recordarCheck.checked) {
    let guardados = JSON.parse(localStorage.getItem('usuariosRecordados') || '[]');
    guardados = guardados.filter(u => u.email !== email); // Evitar duplicados
    guardados.push({ email, password });
    localStorage.setItem('usuariosRecordados', JSON.stringify(guardados));
  }

  // Redirigir
  window.location.href = 'home.html';
});
