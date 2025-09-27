import { supabase } from './app.js';
window.addEventListener('DOMContentLoaded', async () => {
      // Ocultar por defecto (opcional si quieres más control)
  document.getElementById('btn-inventario-frio').style.display = 'none';
  document.getElementById('btn-inventario').style.display = 'none';
  document.getElementById('btn-estadistica').style.display = 'none';
  document.getElementById('btn-despachoSucursal').style.display = 'none';
  document.getElementById('btn-despachoAdmin').style.display = 'none';
    document.getElementById('btn-controlDespacho').style.display = 'none';
});
checkAuthAndRole();

async function checkAuthAndRole() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const userId = session.user.id;
  console.log(userId);
  const { data: user, error } = await supabase
    .schema('inventario')
    .from('usuarios')
    .select('id_rol')
    .eq('id', userId)
    .single();

  if (error || !user) {
    window.location.href = 'login.html';
    console.log('inicio sesion no exitosa usuario');
    return;
  }



    // Mostrar según el rol
  if (user.id_rol === 1) {
    document.getElementById('btn-inventario-frio').style.display = 'inline-block';
    document.getElementById('btn-inventario').style.display = 'inline-block';
    document.getElementById('btn-estadistica').style.display = 'inline-block';
    document.getElementById('btn-despachoAdmin').style.display = 'inline-block';
    
    document.getElementById('btn-controlDespacho').style.display = 'inline-block';
  }
  if (user.id_rol === 4) {
    document.getElementById('btn-inventario-frio').style.display = 'inline-block';
    document.getElementById('btn-inventario').style.display = 'inline-block';
    document.getElementById('btn-estadistica').style.display = 'inline-block';
    document.getElementById('btn-despachoAdmin').style.display = 'inline-block';
    
    document.getElementById('btn-controlDespacho').style.display = 'inline-block';
  }
  if (user.id_rol === 2) {
    document.getElementById('btn-despachoSucursal').style.display = 'inline-block';
  }
  if (user.id_rol === 5) {
    document.getElementById('btn-inventario').style.display = 'inline-block';
    document.getElementById('btn-despachoAdmin').style.display = 'inline-block';
  }
  if (user.id_rol === 3) {
    document.getElementById('btn-inventario-frio').style.display = 'inline-block';
  }

  console.log('inicio sesion exitosa admin');
}


document.getElementById('logout-btn').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error al cerrar sesión:', error.message);
    alert('No se pudo cerrar sesión. Intenta de nuevo.');
    window.location.href = 'login.html';
  } else {
    window.location.href = 'login.html';
  }
});

