import {supabase} from '../backend/supabase/supabaseCliente.js';
import {welcomeMessages} from '../backend/listas/mensajesBienvenida.js';

window.addEventListener('DOMContentLoaded', async () => {
  // Evita que se muestre la página antes de tiempo
  document.body.classList.remove('loaded');
  await checkAuthAndRole();
});

// Función para obtener el periodo del día
function getPeriodOfDay() {
  const hour = new Date().getHours();
  console.log('Hora actual: ', hour);
  
  if (hour >= 4 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';
  } else {
    return 'night';
  }
}

// Función para obtener saludo según la hora
function getGreeting() {
  const hour = new Date().getHours();
  
  if (hour >= 4 && hour < 12) {
    return 'Buenos días';
  } else if (hour >= 12 && hour < 18) {
    return 'Buenas tardes';
  } else {
    return 'Buenas noches';
  }
}

// Función para obtener mensaje aleatorio según la hora
function getRandomMessage() {
  const period = getPeriodOfDay();
  const messages = welcomeMessages[period];
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

// Función para mostrar el mensaje de bienvenida
function displayWelcomeMessage(userName) {
  const greetingElement = document.getElementById('welcome-greeting');
  const messageElement = document.getElementById('welcome-message');
  
  const greeting = getGreeting();
  const randomMessage = getRandomMessage();
  
  greetingElement.textContent = `${greeting}, ${userName}`;
  messageElement.textContent = randomMessage;
}

async function checkAuthAndRole() {
  const { data: { session } } = await supabase.auth.getSession();

  // Si no hay sesión, redirige
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const userId = session.user.id;
  const { data: user, error } = await supabase
    .schema('inventario')
    .from('usuarios')
    .select('id_rol, nombre_usuario')
    .eq('id', userId)
    .single();

  // Si falla o no hay usuario, redirige
  if (error || !user) {
    window.location.href = 'login.html';
    return;
  }

  // Mostrar mensaje de bienvenida
  displayWelcomeMessage(user.nombre_usuario);
  
  // ✅ Oculta el loader y muestra el contenedor principal
  setTimeout(() => {
    document.body.classList.add('loaded');  
  }, 300); 
  document.getElementById('app-content').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'block';

  console.log('Rol del usuario',user.id_rol);
  console.log('Nombre del usuario',user.nombre_usuario);
  // 🎯 Mostrar según el rol
  switch (user.id_rol) {
    case 1: // admin
    case 4: // otro rol con mismos permisos
      mostrar([
        'btn-inventario-frio',
        'btn-inventario',
        'btn-estadistica',
        'btn-despachoAdmin',
        'btn-controlDespacho',
        //'btn-clientes',
        //'btn-congelacion',
        //'btn-inventario-No-Controlado',
        //'btn-pedidosProduccion',
        //'btn-usuario'
      ]);
      break;

    case 2: // sucursal
      mostrar([
        'btn-despachoSucursal',
        //'btn-clientes',
        //'btn-pedidosSucursal'
      ]);
      break;

    case 5: // inventario + despacho admin
      mostrar([
        'btn-inventario', 
        'btn-despachoAdmin'
      ]);
      break;

    case 3: // frio
      mostrar(['btn-inventario-frio']);
      break;

    case 6: // Congelación
      mostrar(['btn-congelacion']);
      break; 

    case 7: // Producción
      mostrar(['btn-pedidosProduccion']);
      break;          
    default:
      console.warn('Rol desconocido:', user.id_rol);
  }
}

function mostrar(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex'; // <-- IMPORTANTE
  });
}

function mostrarSoloHabilitados(idsHabilitados) {

  // 1️⃣ Lista de todos los botones que existen
  const todos = [
    'btn-inventario-frio',
    'btn-inventario',
    'btn-estadistica',
    'btn-despachoAdmin',
    'btn-controlDespacho',
    'btn-despachoSucursal',
    'btn-clientes',
    'btn-congelacion',
    'btn-inventario-No-Controlado',
    'btn-pedidosProduccion'
  ];

  // 2️⃣ Mostrar todos los botones
  todos.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = "flex";

      // 3️⃣ Deshabilitar TODOS por defecto
      el.style.pointerEvents = "none";
      el.style.opacity = "1";  // visual más claro de deshabilitado
    }
  });

  // 4️⃣ Habilitar SOLO los permitidos
  idsHabilitados.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.pointerEvents = "auto";
      el.style.opacity = "1";   
    }
  });
}


// 🚪 Cerrar sesión
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesión:', error.message);
      alert('No se pudo cerrar sesión. Intenta de nuevo.');
      return;
    }
    
    // Limpiar cualquier dato local adicional si es necesario
    // (Supabase ya limpia la sesión automáticamente)
    
    // Redirigir al login
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    alert('No se pudo cerrar sesión. Intenta de nuevo.');
  }
});