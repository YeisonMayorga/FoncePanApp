import { obtenerDespachosSucursal, obtenerDetalleDespacho, confirmarRecepcion, supabase, obtenerEstadoDespacho } from './app.js';

let despachoActual = null;
let estadoDespachoActual = null;
let devoluciones = [];


$(document).ready(async () => {
await cargarDevoluciones();

// Suscripción a cambios en la tabla 'devoluciones'
const channel = supabase
  .channel('devoluciones_changes')
  .on('postgres_changes', {
    event: '*', // Solo para inserciones (ajusta si necesitas UPDATE/DELETE)
    schema: 'inventario',
    table: 'devoluciones'
  }, async (payload) => {
    console.log('Nueva devolución registrada:', payload.new.id_despacho);

    // 1. Actualiza el array local
    if (!devoluciones.includes(payload.new.id_despacho)) {
      devoluciones.push(payload.new.id_despacho);
    }

    // 2. Busca la fila en DataTables y actualiza SU columna de acciones
    const tabla = $('#tablaDespachosSucursal').DataTable();
    const filas = tabla.rows().nodes();
    
    $(filas).each(function() {
      const rowId = $(this).find('.ver-detalle').data('id');
      if (rowId === payload.new.id_despacho) {
        const nuevoBoton = `
          <button class="btn btn-warning btn-sm btn-devolver" 
                  data-id="${payload.new.id_despacho}">
            Ver Devolución
          </button>
        `;
        
        // Actualiza solo la celda de acciones (última celda)
        $(this).find('td:last').html(`
          <button class="btn btn-primary btn-sm ver-detalle" 
                  data-id="${rowId}" 
                  data-estado="${$(this).find('.ver-detalle').data('estado')}">
            Ver
          </button>
          ${nuevoBoton}
        `);
      }
    });
  })
  .subscribe();
// Cargar todas las devoluciones al inicializar la página
async function cargarDevoluciones() {
  const { data, error } = await supabase
    .schema('inventario')
    .from('devoluciones')
    .select('id_despacho');
  
  if (!error) devoluciones = data.map(d => d.id_despacho);
}

  const tabla = $('#tablaDespachosSucursal').DataTable({
    ajax: async (data, callback) => {
      const datos = await obtenerDespachosSucursal();
      // Formatear fechas
const despachosFormateados = datos.map(item => {
  console.log('Fecha 1',item.fecha_solicitud);
  const fecha = new Date(item.fecha_solicitud);
  console.log('Fecha 2',fecha);
  const fechaFormateada = fecha.toLocaleString("es-CO", {
    year: "numeric",
    day: "2-digit",
    month: "2-digit",
    
    hour: "2-digit",
    minute: "2-digit"
  });
  console.log('Fecha 3',fechaFormateada);
  return {
    ...item,
    fecha_solicitud_formateada: fechaFormateada
  };
});

console.log('formateados', despachosFormateados);
      console.log('sin formatear',datos);
      const tipodedato=typeof datos.fecha_solicitud;
      console.log(tipodedato)
      callback({ data: despachosFormateados });
    },
        language: {
        lengthMenu: "Mostrar _MENU_ registros por página",
        zeroRecords: "No se encontraron resultados",
        info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
        infoEmpty: "Mostrando 0 a 0 de 0 registros",
        infoFiltered: "(filtrado de _MAX_ registros totales)",
        search: "Buscar:",
        paginate: {
        first: "Primero",
        last: "Último",
        next: "Siguiente",
        previous: "Anterior"
        }
    },
    order: [[1, 'desc']],
    columns: [
      { data: 'id_despacho' },
      { data: 'fecha_solicitud_formateada' },
      {
  data: 'estado',
  render: function (data) {
    let color = 'secondary';
    switch (data) {
      case 'pendiente': color = 'danger'; break;
      case 'enviado': color = 'warning'; break;
      case 'recibido': color = 'info'; break;
      case 'finalizado': color = 'success'; break;
    }
    return `<span class="badge bg-${color}" style="font-size:0.9em;">${data}</span>`;
  }
},
      { data: 'total_productos' },
      { data: 'total_enviado' },
      { data: 'total_recibido' },
      {
            data: null,
            render: (row) => {
              const existeDevolucion = devoluciones.includes(row.id_despacho);
              const botonDevolver = existeDevolucion 
                ? `<button class="btn btn-warning btn-sm btn-devolver" data-id="${row.id_despacho}">Ver Devolución</button>` 
                : '';
              
              return `
                <button class="btn btn-primary btn-sm ver-detalle" data-id="${row.id_despacho}" data-estado="${row.estado}">Ver</button>
                ${botonDevolver}
              `;
            }
          }
    ]
    
  });

    supabase
        .channel('despachos_updates') // Nombre del canal, puede ser cualquier string
        .on(
            'postgres_changes',
            { event: '*', schema: 'inventario', table: 'despachos' },
            (payload) => {
                console.log('Cambio detectado en despachos:', payload);
                actualizarTabla(); // Refresca la tabla sin recargar la página
            }
        )
        .subscribe();
    async function actualizarTabla() {
        const productos = await obtenerDespachosSucursal(); // Obtiene datos actualizados
        const despachosFormateados = productos.map(item => {
        const fecha = new Date(item.fecha_solicitud);
        const fechaFormateada = fecha.toLocaleString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });

        return {
          ...item,
          fecha_solicitud_formateada: fechaFormateada
        };
      });
        tabla.clear().rows.add(despachosFormateados).draw(); // Reescribe los datos en la tabla
    }
$('#tablaDespachosSucursal tbody').on('click', '.ver-detalle', async function () {
  const id = $(this).data('id');
  console.log('este ese l id',id)
  await cargarYMostrarDetalleSucursal(id);
});
$('#modalNotificaciones').on('click', '.ver-despacho', async function () {
  const id = $(this).data('id');
const idDespacho = this.dataset.id;

$('.modal-backdrop').remove(); // Elimina fondo gris forzadamente
$('body').removeClass('modal-open'); // Restaura scroll y evita bloqueo
  // Escuchar el evento cuando el modal se cierre completamente
  $('#modalNotificaciones').one('hidden.bs.modal', async function () {
    await cargarYMostrarDetalleSucursal(id);
  });

    // Cerrar el modal
  const modalNotificaciones = bootstrap.Modal.getInstance(document.getElementById('modalNotificaciones'));
  if (modalNotificaciones) modalNotificaciones.hide();
});
async function cargarYMostrarDetalleSucursal(idDespacho) {
  despachoActual = idDespacho;

  const despacho = await obtenerEstadoDespacho(idDespacho);
  estadoDespachoActual = despacho[0]?.estado;
 console.log(estadoDespachoActual);
  if (!estadoDespachoActual) {
    alert('No se pudo obtener el estado del despacho.');
    return;
  }

  $('#btnDevoluciones').data('despacho-id', despachoActual);

  const tipo1 = 1, tipo2 = 2, tipo3 = 3;
  const productos1 = await obtenerDetalleDespacho(despachoActual, tipo1);
  const productos2 = await obtenerDetalleDespacho(despachoActual, tipo2);
  const productos3 = await obtenerDetalleDespacho(despachoActual, tipo3);
  const yaExisteDevolucion = await existeDevolucion(despachoActual);

  const cargarProductos = (productos, cuerpoSelector) => {
    const cuerpo = $(cuerpoSelector);
    cuerpo.empty();
    productos.forEach(p => {
      cuerpo.append(`
        <tr>
          <td>${p.nombre_producto} - ${p.productosn.provedor_producto} - ${p.productosn.unidad_medida.nombre_um}</td>
          <td>${p.cantidad_solicitada}</td>
          <td>${p.cantidad_enviada ?? '-'}</td>
          <td>
            <input 
              type="number" 
              class="form-control form-control-sm recibido" 
              data-id="${p.id_detalle_despacho}" 
              value="${p.cantidad_recibida ?? 0}" 
              ${['pendiente', 'recibido', 'finalizado'].includes(estadoDespachoActual) ? 'disabled' : ''}
            >
          </td>
        </tr>
      `);
    });
  };

  cargarProductos(productos1, '#tablaDetalleSucursal tbody');
  cargarProductos(productos2, '#tablaDetalleSucursal2 tbody');
  cargarProductos(productos3, '#tablaDetalleSucursal3 tbody');

  $('#btnConfirmarRecepcion').toggle(estadoDespachoActual === 'enviado');
  $('#btnDevoluciones').toggle(estadoDespachoActual === 'finalizado' && !yaExisteDevolucion);

  const modal = new bootstrap.Modal(document.getElementById('modalDetalleSucursal'));
  modal.show();
}

async function existeDevolucion(despachoId) {
  try {
    const { data, error } = await supabase
      .schema('inventario')
      .from('devoluciones')
      .select('id_devolucion')  // Solo necesitamos saber si existe al menos un registro
      .eq('id_despacho', despachoId)  // Filtra por el ID del despacho
      .limit(1);  // Solo necesitamos un resultado

    if (error) {
      console.error('Error al verificar devolución:', error);
      return true;  // Por seguridad, ocultamos el botón si hay error
    }

    return data.length > 0;  // Devuelve `true` si existe al menos una devolución
  } catch (error) {
    console.error('Error inesperado:', error);
    return true;
  }
}
  $('#btnConfirmarRecepcion').click(async () => {
    const inputs = document.querySelectorAll('.recibido');
    const actualizaciones = [];

    inputs.forEach(input => {
      actualizaciones.push({
        id_detalle: input.dataset.id,
        cantidad_recibida: parseInt(input.value)
      });
    });

    for (const item of actualizaciones) {
      await confirmarRecepcion(item.id_detalle, item.cantidad_recibida);
    }

    await confirmarRecepcion(despachoActual, null, 'recibido');

    $('#modalDetalleSucursal').modal('hide');
    $('#tablaDespachosSucursal').DataTable().ajax.reload();
  });
});

import { obtenerProductosnTrue1, obtenerProductosnTrue2, obtenerProductosnTrue3, crearDespachoConDetalles } from './app.js';

let productosDisponibles1 = [];
let productosDisponibles2 = [];
let productosDisponibles3 = [];
    supabase
        .channel('productos_updates') // Nombre del canal, puede ser cualquier string
        .on(
            'postgres_changes',
            { event: '*', schema: 'inventario', table: 'productosn' },
            (payload) => {
                console.log('Cambio detectado en productos:', payload);
                cargarTablasProductos(); // Refresca la tabla sin recargar la página
            }
        )
        .subscribe();
        async function cargarTablasProductos() {
  const productosDisponibles1 = await obtenerProductosnTrue1();
  const productosDisponibles2 = await obtenerProductosnTrue2();
  const productosDisponibles3 = await obtenerProductosnTrue3();

  const cuerpo1 = $('#tablaProductosSolicitud1 tbody');
  const cuerpo2 = $('#tablaProductosSolicitud2 tbody');
  const cuerpo3 = $('#tablaProductosSolicitud3 tbody');

  cuerpo1.empty();
  cuerpo2.empty();
  cuerpo3.empty();

  productosDisponibles1.forEach(p => {
    cuerpo1.append(`
      <tr>
        <td>${p.nombre_producto}</td>
        <td>${p.provedor_producto}</td>
        <td>${p.nombre_um}</td>
        <td>
          <input type="number" class="form-control form-control-sm cantidad-solicitada" data-id="${p.id_producto}" min="0" value="0">
        </td>
      </tr>
    `);
  });

  productosDisponibles2.forEach(p => {
    cuerpo2.append(`
      <tr>
        <td>${p.nombre_producto}</td>
        <td>${p.provedor_producto}</td>
        <td>${p.nombre_um}</td>
        <td>
          <input type="number" class="form-control form-control-sm cantidad-solicitada" data-id="${p.id_producto}" min="0" value="0">
        </td>
      </tr>
    `);
  });

  productosDisponibles3.forEach(p => {
    cuerpo3.append(`
      <tr>
        <td>${p.nombre_producto}</td>
        <td>${p.provedor_producto}</td>
        <td>${p.nombre_um}</td>
        <td>
          <input type="number" class="form-control form-control-sm cantidad-solicitada" data-id="${p.id_producto}" min="0" value="0">
        </td>
      </tr>
    `);
  });
}

$(document).ready(async () => {
await cargarTablasProductos();
  $('#btnEnviarSolicitud').click(async () => {
    const cantidades = document.querySelectorAll('.cantidad-solicitada');
    const productosSolicitados = [];

    cantidades.forEach(input => {
      const cantidad = parseInt(input.value);
      if (cantidad > 0) {
        productosSolicitados.push({
          id_producto: input.dataset.id,
          cantidad
        });
      }
    });

    if (productosSolicitados.length === 0) {
      alert('Debes seleccionar al menos un producto con cantidad mayor a 0.');
      return;
    }

    const exito = await crearDespachoConDetalles(productosSolicitados);
    if (exito) {
      alert('Solicitud enviada correctamente.');
      $('#modalNuevaSolicitud').modal('hide');
      $('.modal-backdrop').remove(); // Elimina el fondo gris
$('body').removeClass('modal-open'); // Restaura el scroll
    } else {
      alert('Error al enviar la solicitud.');
    }
  });
});

import { obtenerNotificaciones, marcarNotificacionVista } from './app.js';
    supabase
        .channel('notificaciones_updates') // Nombre del canal, puede ser cualquier string
        .on(
            'postgres_changes',
            { event: '*', schema: 'inventario', table: 'notificaciones' },
            (payload) => {
                console.log('Cambio detectado en notificaciones:', payload);
                cargarNotificaciones(); // Refresca la tabla sin recargar la página
            }
        )
        .subscribe();
async function cargarNotificaciones() {
  const notificaciones = await obtenerNotificaciones();

  const lista = document.getElementById('listaNotificaciones');
  lista.innerHTML = '';

  let noLeidas = 0;

  notificaciones.forEach(n => {
    if (!n.visto) noLeidas++;


    const li = document.createElement('li');
    li.className = `list-group-item d-flex justify-content-between align-items-start ${n.visto ? '' : 'fw-bold'}`;
    li.innerHTML = `
      <div class="ms-2 me-auto">
        ${n.mensaje}<br>
        <small class="text-muted">${new Date(n.fecha).toLocaleString('es-CO' , { hour12: true, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'})}</small>
      </div>
      ${n.id_despacho ? `<button class="btn btn-sm btn-link ver-despacho" data-id="${n.id_despacho}" data-noti="${n.id_notificacion}">Ver</button>` : ''}
    `;
    lista.appendChild(li);
  });

  const contador = document.getElementById('contadorNotificaciones');
  if (noLeidas > 0) {
    contador.style.display = 'inline-block';
    contador.textContent = noLeidas;
  } else {
    contador.style.display = 'none';
  }
}

// Escuchar apertura del modal para marcar como visto
$(document).on('click', '.ver-despacho', async function () {
  const idNoti = this.dataset.noti;
  const idDespacho = this.dataset.id;

  await marcarNotificacionVista(idNoti);
  cargarNotificaciones();
  // Cierra el modal de notificaciones

  // Puedes redirigir o abrir modal de detalle si estás en el panel
  console.log('Ver despacho:', idDespacho);
    const modalNotificaciones = bootstrap.Modal.getInstance(document.getElementById('modalNotificaciones'));
  if (modalNotificaciones) modalNotificaciones.hide();
});


// Al abrir el modal de notificaciones, recargar
$('#modalNotificaciones').on('show.bs.modal', () => {
  cargarNotificaciones();
});

// Carga inicial al cargar página
cargarNotificaciones();

//
//
//
//
//

$('#btnDevoluciones').on('click', function() {
  // Obtenemos el despachoId almacenado en el botón
  const despachoId = $(this).data('despacho-id');
  
  if (despachoId) {
    // Cerramos el modal actual (opcional)
    $('#modalDetalleSucursal').modal('hide');
    
    // Abrimos el modal de devolución
    abrirModalDevolucion(despachoId);
  } else {
    console.error('No se encontró el ID del despacho.');
  }
});
  async function abrirModalDevolucion(despachoId) {
  document.getElementById('input_despacho').value = despachoId;
  document.getElementById('productos_devolver').innerHTML = '';

  const { data, error } = await supabase
  .schema('inventario')
    .from('detalle_despacho')
    .select('id_producto, cantidad_recibida, productosn(nombre_producto, provedor_producto, unidad_medida(nombre_um))')
    .eq('id_despacho', despachoId)
    .not('cantidad_recibida', 'is', null);

  if (error) return alert('Error al cargar productos');

  data.forEach(p => {
    document.getElementById('productos_devolver').innerHTML += `
      <div class="mb-2">
        <label>${p.productosn.nombre_producto} - ${p.productosn.provedor_producto} - ${p.productosn.unidad_medida.nombre_um} (recibido: ${p.cantidad_recibida})</label>
        <input type="number" name="prod_${p.id_producto}" max="${p.cantidad_recibida}" min="0" class="form-control" placeholder="Cantidad a devolver">
      </div>
    `;
  });

  const modal = new bootstrap.Modal(document.getElementById('modalDevolucion'));
  modal.show();
}

document.getElementById('formDevolucion').addEventListener('submit', async function (e) {
  e.preventDefault();
  
  const despachoId = parseInt(document.getElementById('input_despacho').value);
  const observaciones = document.getElementById('observaciones_dev').value.trim();
  const inputs = document.querySelectorAll('#productos_devolver input');
  
  let productos = [];

  inputs.forEach(input => {
    const cantidad = parseInt(input.value);
    if (cantidad > 0) {
      const id_producto = parseInt(input.name.split('_')[1]);
      productos.push({ id_producto, cantidad_devuelta: cantidad });
    }
  });

  if (productos.length === 0) {
    alert("Debe ingresar al menos un producto para devolver.");
    return;
  }

  // Buscar sucursal del despacho
  const { data: despachoData, error: errorDesp } = await supabase
    .schema('inventario')
    .from('despachos')
    .select('id_sucursal')
    .eq('id_despacho', despachoId)
    .single();

  if (errorDesp) return alert('Error buscando sucursal');

  // Insertar devolución
  const { data: devolucion, error: errDev } = await supabase
    .schema('inventario')
    .from('devoluciones')
    .insert({
      id_despacho: despachoId,
      id_sucursal: despachoData.id_sucursal,
      observaciones
    })
    .select()
    .single();

  if (errDev) return alert('Error registrando devolución');

  // Insertar detalles
  for (let p of productos) {
    await supabase.schema('inventario').from('detalle_devolucion').insert({
      id_devolucion: devolucion.id_devolucion,
      id_producto: p.id_producto,
      cantidad_devuelta: p.cantidad_devuelta
    });
  }

  alert("Devolución registrada correctamente.");
  bootstrap.Modal.getInstance(document.getElementById('modalDevolucion')).hide();
});

  $('#tablaDespachosSucursal').on('click', '.btn-warning', function () {
  const despachoId = $(this).closest('tr').find('.ver-detalle').data('id');
  console.log(despachoId)
  abrirModalVerDevolucion(despachoId);
});

async function abrirModalVerDevolucion(despachoId) {
  // Buscar la devolución relacionada a ese despacho
  const { data: devolucion, error: errorDev } = await supabase
    .schema('inventario')
    .from('devoluciones')
    .select('id_devolucion, observaciones')
    .eq('id_despacho', despachoId)
    .limit(1)
    .single();

  if (errorDev || !devolucion) {
    alert('No se encontró devolución para este despacho');
    return;
  }

  // Mostrar observaciones
  document.getElementById('observacionesDevolucion').textContent = devolucion.observaciones || 'Sin observaciones';

  // Obtener detalle de productos devueltos
  const { data: productos, error: errorDet } = await supabase
    .schema('inventario')
    .from('detalle_devolucion')
    .select('cantidad_devuelta, observaciones, productosn(nombre_producto,unidad_medida(nombre_um),provedor_producto)')
    .eq('id_devolucion', devolucion.id_devolucion);

  if (errorDet) {
    alert('Error al cargar productos devueltos');
    return;
  }

  const contenedor = document.getElementById('listaProductosDevueltos');
  contenedor.innerHTML = '';


  productos.forEach(p => {
    contenedor.innerHTML += `
      <div class="mb-2 border-bottom pb-2">
        <strong>${p.productosn.nombre_producto} - ${p.productosn.provedor_producto} - ${p.productosn.unidad_medida.nombre_um}</strong><br>
        Cantidad devuelta: ${p.cantidad_devuelta}<br>
        Observación: ${p.observaciones || 'Sin observación'}
      </div>
    `;
  });

  // Mostrar el modal
  const modal = new bootstrap.Modal(document.getElementById('modalVerDevolucion'));
  modal.show();
}
