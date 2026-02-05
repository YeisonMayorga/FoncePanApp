import { eliminarDespacho } from '../backend/endpoints/despachoBackend.js';
import { obtenerDespachosAdmin, obtenerDetalleDespacho, supabase, actualizarEstadoDespacho, obtenerEstadoDespacho } from './app.js';
let idDespachoSeleccionado = null;
let estadoDespachoActual = null;
let devoluciones = [];
$(document).ready(async () => {
    // Evita que se muestre la página antes de tiempo
    document.body.classList.remove('loaded');
    let rolUsuario;
    checkAuthAndRole();
    const idRol = await checkAuthAndRole();
    if (!idRol) return; // Si no hay rol, ya se redirigió
    rolUsuario = idRol;
    async function checkAuthAndRole() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }
        const userId = session.user.id;
        console.log('ID del usuario logeado:', userId);
        const { data: user, error } = await supabase
            .schema('inventario')
            .from('usuarios')
            .select('id_rol')
            .eq('id', userId)
            .single();
        if (error || !user) {
            console.error('Error al obtener usuario o no existe');
            window.location.href = 'login.html';
            return null;
        }
        return user.id_rol;  // ✅ Retorna el id_rol directamente
    }
    const mostrarAcciones = rolUsuario === 1 || rolUsuario === 4;
    await cargarDevoluciones();
    // Cargar todas las devoluciones al inicializar la página
    async function cargarDevoluciones() {
        const { data, error } = await supabase
            .schema('inventario')
            .from('devoluciones')
            .select('id_despacho');

        if (!error) devoluciones = data.map(d => d.id_despacho);
    }
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
            const tabla = $('#tablaDespachosAdmin').DataTable();
            const filas = tabla.rows().nodes();

            $(filas).each(function () {
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

    const tabla = $('#tablaDespachosAdmin').DataTable({
        ajax: async (data, callback) => {
            const datos = await obtenerDespachosAdmin();
            // Para cada despacho, trae los productos asociados (solo sus nombres)
            const despachosFormateados = await Promise.all(
                datos.map(async item => {
                    const { data: productos, error } = await supabase
                        .schema('inventario')
                        .from('detalle_despacho')
                        .select('productosn(nombre_producto)')
                        .eq('id_despacho', item.id_despacho);

                    const nombresProductos = productos?.map(p => p.productosn.nombre_producto).join(', ') || '';

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
                        fecha_solicitud_formateada: fechaFormateada,
                        productos_texto: nombresProductos.toLowerCase() // 🔍 agregamos para búsqueda
                    };
                })
            );
            callback({ data: despachosFormateados });
            // Al final de la carga inicial de la tabla, después del callback
            setTimeout(() => {
                document.body.classList.add('loaded');
            }, 300);
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
        order: [[2, 'desc']],
        columns: [
            { data: 'id_despacho' },
            { data: 'nombre_sucursal' },
            {
                data: 'fecha_solicitud',
                render: function (data, type, row) {
                    if (type === 'display' || type === 'filter') {
                        const fecha = new Date(data);
                        return fecha.toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });
                    }
                    return data;
                }
            },
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
            { data: 'total_solicitado' },
            {
                data: null,
                render: (row) => {
                    const existeDevolucion = devoluciones.includes(row.id_despacho);
                    const botonDevolver = existeDevolucion
                        ? `<button class="btn btn-warning btn-sm btn-devolver" data-id="${row.id_despacho}">Ver Devolución</button>`
                        : '';
                    // 👇 Solo roles 1 o 4 pueden ver este botón
                    const botonEliminar = mostrarAcciones
                        ? `<button class="btn btn-danger btn-sm btnEliminarDespacho" data-id="${row.id_despacho}">Eliminar</button>`
                        : '';
                    return `
                    <button class="btn btn-primary btn-sm ver-detalle" data-id="${row.id_despacho}" data-estado="${row.estado}">Ver</button>
                    ${botonDevolver}
                    ${botonEliminar}
                    `;
                }
            }
        ]
    });
    // 🔍 Buscador personalizado
    // 🔍 Buscador personalizado corregido
    $.fn.dataTable.ext.search.push(
        function (settings, data, dataIndex) {
            // Solo aplicar al tablaDespachosAdmin
            if (settings.nTable.id !== 'tablaDespachosAdmin') {
                return true;
            }

            const filtro = $('#buscadorProductos').val().toLowerCase().trim();
            if (!filtro) return true;

            // Obtener los datos de la fila usando la API de DataTables
            const api = new $.fn.dataTable.Api(settings);
            const rowData = api.row(dataIndex).data();

            if (!rowData) return true;

            // Construir texto general de búsqueda desde los datos visibles
            const textoGeneral = Object.values(rowData)
                .filter(v => v != null && typeof v !== 'object' && typeof v !== 'function')
                .join(' ')
                .toLowerCase();

            // Obtener productos_texto si existe (este campo contiene los nombres de productos de detalle_despacho)
            const productosTexto = (rowData.productos_texto || '').toLowerCase();

            // Buscar en el texto general (sucursal, fecha, estado, etc.) o en los productos
            return textoGeneral.includes(filtro) || productosTexto.includes(filtro);
        }
    );

    $('#buscadorProductos').on('input', function () {
        $('#tablaDespachosAdmin').DataTable().draw();
    });
    console.log(obtenerDespachosAdmin());
    // Mostrar modal con detalle
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
        const productos = await obtenerDespachosAdmin(); // Obtiene datos actualizados
        // Para cada despacho, trae los productos asociados (solo sus nombres)
        const despachosFormateados = await Promise.all(
            productos.map(async item => {
                const { data: productosDetalle, error } = await supabase
                    .schema('inventario')
                    .from('detalle_despacho')
                    .select('productosn(nombre_producto)')
                    .eq('id_despacho', item.id_despacho);

                const nombresProductos = productosDetalle?.map(p => p.productosn.nombre_producto).join(', ') || '';

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
                    fecha_solicitud_formateada: fechaFormateada,
                    productos_texto: nombresProductos.toLowerCase() // 🔍 agregamos para búsqueda
                };
            })
        );
        tabla.clear().rows.add(despachosFormateados).draw(); // Reescribe los datos en la tabla
    }

    async function cargarYMostrarDetalleDespacho(idDespacho, estadoDespacho) {
        idDespachoSeleccionado = idDespacho;
        estadoDespachoActual = estadoDespacho;
        console.log(idDespachoSeleccionado);
        const tipo1 = 1, tipo2 = 2, tipo3 = 3;
        const productos1 = await obtenerDetalleDespacho(idDespachoSeleccionado, tipo1);
        const cuerpo1 = $('#tablaDetalleProductos tbody');
        cuerpo1.empty();
        productos1.forEach(p => {
            cuerpo1.append(`
                <tr>
                    <td>${p.nombre_producto} - ${p.productosn.provedor_producto} - ${p.productosn.unidad_medida.nombre_um}</td>
                    <td>${p.productosn.und_producto}</td>
                    <td>${p.cantidad_solicitada}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm cantidad-enviada" 
                        data-id="${p.id_detalle_despacho}" 
                        data-stock="${p.productosn.und_producto}" 
                        value="${p.cantidad_enviada || 0}" 
                        ${['enviado', 'recibido', 'finalizado'].includes(estadoDespachoActual) ? 'disabled' : ''}
                        >
                        <div class="invalid-feedback d-none"></div>
                    </td>
                    <td>${p.cantidad_recibida ?? '-'}</td>
                </tr>
            `);
        });
        const productos2 = await obtenerDetalleDespacho(idDespachoSeleccionado, tipo2);
        const cuerpo2 = $('#tablaDetalleProductos2 tbody');
        cuerpo2.empty();
        productos2.forEach(p => {
            cuerpo2.append(`
                <tr>
                    <td>${p.nombre_producto} - ${p.productosn.provedor_producto} - ${p.productosn.unidad_medida.nombre_um}</td>
                    <td>${p.productosn.und_producto}</td>
                    <td>${p.cantidad_solicitada}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm cantidad-enviada" 
                        data-id="${p.id_detalle_despacho}" 
                        data-stock="${p.productosn.und_producto}" 
                        value="${p.cantidad_enviada || 0}" 
                        ${['enviado', 'recibido', 'finalizado'].includes(estadoDespachoActual) ? 'disabled' : ''}
                        >
                        <div class="invalid-feedback d-none"></div>
                    </td>
                    <td>${p.cantidad_recibida ?? '-'}</td>
                </tr>
            `);
        });
        const productos3 = await obtenerDetalleDespacho(idDespachoSeleccionado, tipo3);
        const cuerpo3 = $('#tablaDetalleProductos3 tbody');
        cuerpo3.empty();
        productos3.forEach(p => {
            cuerpo3.append(`
                <tr>
                    <td>${p.nombre_producto} - ${p.productosn.provedor_producto} - ${p.productosn.unidad_medida.nombre_um}</td>
                    <td>${p.productosn.und_producto}</td>
                    <td>${p.cantidad_solicitada}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm cantidad-enviada" 
                        data-id="${p.id_detalle_despacho}" 
                        data-stock="${p.productosn.und_producto}" 
                        value="${p.cantidad_enviada || 0}" 
                        ${['enviado', 'recibido', 'finalizado'].includes(estadoDespachoActual) ? 'disabled' : ''}
                        >
                        <div class="invalid-feedback d-none"></div>
                    </td>
                    <td>${p.cantidad_recibida ?? '-'}</td>
                </tr>
            `);
        });
        // Validación en tiempo real
        $('.cantidad-enviada').on('input', function () {
            const input = $(this);
            const valor = parseInt(input.val());
            const stock = parseInt(input.data('stock'));
            const feedback = input.siblings('.invalid-feedback');
            if (isNaN(valor) || valor < 0) {
                input.addClass('is-invalid');
                feedback.text('La cantidad enviada debe ser mayor que 0.').removeClass('d-none');
            } else if (valor > stock) {
                input.addClass('is-invalid');
                feedback.text(`No puedes enviar más de ${stock} unidades disponibles.`).removeClass('d-none');
            } else {
                input.removeClass('is-invalid');
                feedback.addClass('d-none');
            }
        });
        // Botones según estado
        $('#btnEnviarRespuesta').toggle(estadoDespachoActual === 'pendiente');
        $('#btnFinalizarDespacho').toggle(estadoDespachoActual === 'recibido');
        const modal = new bootstrap.Modal(document.getElementById('modalDetalle'));
        modal.show();
    }

    $('#modalNotificaciones').on('click', '.ver-despacho', async function () {
        const id = $(this).data('id');
        const despacho = await obtenerEstadoDespacho(id);
        const estado = despacho[0]?.estado;
        cargarYMostrarDetalleDespacho(id, estado);
        console.log(despacho)
    });
    $('#tablaDespachosAdmin tbody').on('click', '.ver-detalle', function () {
        const id = $(this).data('id');
        const estado = $(this).data('estado');
        cargarYMostrarDetalleDespacho(id, estado);
    });
    // Enviar respuesta (actualizar cantidades enviadas y estado)
    $('#btnEnviarRespuesta').click(async () => {
        const filas = document.querySelectorAll('.cantidad-enviada');
        let hayError = false;
        const actualizaciones = [];
        filas.forEach(fila => {
            const valor = parseInt(fila.value);
            const stock = parseInt(fila.dataset.stock);
            const feedback = fila.nextElementSibling;

            if (isNaN(valor) || valor < 0) {
                fila.classList.add('is-invalid');
                feedback.textContent = 'La cantidad enviada debe ser mayor que 0.';
                feedback.classList.remove('d-none');
                hayError = true;
            } else if (valor > stock) {
                fila.classList.add('is-invalid');
                feedback.textContent = `No puedes enviar más de ${stock} unidades disponibles.`;
                feedback.classList.remove('d-none');
                hayError = true;
            } else {
                fila.classList.remove('is-invalid');
                feedback.classList.add('d-none');
                actualizaciones.push({
                    id_detalle: fila.dataset.id,
                    cantidad_enviada: valor
                });
            }
        });
        if (hayError) {
            alert('Hay errores en los campos. Corrige los valores antes de continuar.');
            return;
        }
        for (const item of actualizaciones) {
            await actualizarEstadoDespacho(item.id_detalle, item.cantidad_enviada);
        }
        await actualizarEstadoDespacho(idDespachoSeleccionado, null, 'enviado');
        $('#modalDetalle').modal('hide');
        $('#tablaDespachosAdmin').DataTable().ajax.reload();
    });
    // Finalizar despacho (admin)
    $('#btnFinalizarDespacho').click(async () => {
        const confirmado = confirm('¿Estás seguro de finalizar el despacho? Esto descontará del inventario principal.');
        if (!confirmado) return;
        await actualizarEstadoDespacho(idDespachoSeleccionado, null, 'finalizado');
        $('#modalDetalle').modal('hide');
        $('#tablaDespachosAdmin').DataTable().ajax.reload();
    });

    $('#tablaDespachosAdmin tbody').on('click', '.btnEliminarDespacho', function () {
        const id = $(this).data('id');
        console.log("Eliminar despacho con ID:", id);

        $('#modalConfirmarEliminar').modal('show');

        $('#btnConfirmarEliminar').off('click').on('click', async function () {
            await eliminarDespacho(id);
            $('#modalConfirmarEliminar').modal('hide');
            tabla.ajax.reload();
        });
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
            <small class="text-muted">${new Date(n.fecha).toLocaleString('es-CO', { hour12: true, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</small>
        </div>
        ${n.id_despacho ? `<button class="btn btn-sm btn-link ver-despacho" data-id="${n.id_despacho}" data-noti="${n.id_notificacion}">Ver</button>` : ''}
        `;
        lista.appendChild(li);
    });
    //restarHoras(new Date(n.fecha).toLocaleString(), 10)
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
$('#tablaDespachosAdmin').on('click', '.btn-warning', function () {
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
