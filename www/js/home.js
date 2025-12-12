import {supabase} from '../backend/supabase/supabaseCliente.js';

window.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndRole();
});

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
    .select('id_rol')
    .eq('id', userId)
    .single();

  // Si falla o no hay usuario, redirige
  if (error || !user) {
    window.location.href = 'login.html';
    return;
  }

  // ✅ Oculta el loader y muestra el contenedor principal
  document.getElementById('loading').style.display = 'none';
  document.getElementById('app-content').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'block';

  console.log('Rol del usuario',user.id_rol)
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
        'btn-clientes',
        'btn-congelacion',
        'btn-inventario-No-Controlado',
        'btn-pedidosProduccion'
      ]);
      break;

    case 2: // sucursal
      mostrar([
        'btn-despachoSucursal',
        'btn-clientes'
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
