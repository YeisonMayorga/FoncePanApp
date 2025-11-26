import { supabase } from './app.js';

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
  document.getElementById('contenedor-botones').style.display = 'flex';
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
        //'btn-congelacion',
        //'btn-pedidosProduccion'
      ]);
      break;

    case 2: // sucursal
      mostrar([
        'btn-despachoSucursal',
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
    if (el) el.style.display = 'inline-block';
  });
}

// 🚪 Cerrar sesión
document.getElementById('logout-btn').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error al cerrar sesión:', error.message);
    alert('No se pudo cerrar sesión. Intenta de nuevo.');
  }
  window.location.href = 'login.html';
});
