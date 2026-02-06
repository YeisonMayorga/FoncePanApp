import { obtenerPedidoSucursal } from '../backend/endpoints/pedidoBackend.js';
import {supabase} from '../supabase/supabaseCliente.js';
import {  } from '../backend/endpoints/detallePedidoBackend.js';

$(document).ready(async () => {
    // Evita que se muestre la página antes de tiempo
    document.body.classList.remove('loaded');

    const tabla = $('#tablaPedidoSucursal').DataTable({
        ajax: async (data, callback) => {
            const datos = await obtenerPedidoSucursal();
            // Formatear fechas

            callback({ data: datos });
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
        order: [[1, 'desc']],
        columns: [
            { data: 'id_pedido' },
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
            { data: 'fecha_entrega' ,
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
            { data: 'cliente_nombre' },  
            { data: 'cliente_documento' },                                 
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



            {
                data: null,
                render: (row) => {
                    return `
                    <button class="btn btn-primary btn-sm ver-detalle" data-id="${row.id_pedido}" data-estado="${row.estado}">Ver</button>
                    
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
        console.log('este ese l id', id)
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
                            data-enviado="${p.cantidad_enviada ?? 0}"
                            value="${p.cantidad_recibida ?? 0}" 
                            ${['pendiente', 'recibido', 'finalizado'].includes(estadoDespachoActual) ? 'disabled' : ''}
                            >
                            <div class="invalid-feedback d-none"></div>
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

        // Validación en tiempo real para recepción
        $('.recibido').off('input').on('input', function () {
            const input = $(this);
            const valor = parseInt(input.val());
            const enviado = parseInt(input.data('enviado'));
            const feedback = input.next('.invalid-feedback');

            if (isNaN(valor) || valor < 0) {
                input.addClass('is-invalid');
                feedback.text('Debe ser mayor o igual a 0').removeClass('d-none');
            } else if (valor > enviado) {
                input.addClass('is-invalid');
                feedback.text(`No puedes recibir más de lo enviado (${enviado})`).removeClass('d-none');
            } else {
                input.removeClass('is-invalid');
                feedback.addClass('d-none');
            }
        });
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
        let hayError = false;
        const actualizaciones = [];
        inputs.forEach(input => {
            const valor = parseInt(input.value);
            const enviado = parseInt(input.dataset.enviado);

            if (input.classList.contains('is-invalid') || valor > enviado || valor < 0) {
                hayError = true;
                input.classList.add('is-invalid'); // Asegurar visualización del error
                const feedback = input.nextElementSibling;
                if (feedback) {
                    feedback.textContent = valor > enviado ? `No puedes recibir más de lo enviado (${enviado})` : 'Debe ser mayor o igual a 0';
                    feedback.classList.remove('d-none');
                }
            }

            actualizaciones.push({
                id_detalle: input.dataset.id,
                cantidad_recibida: valor
            });
        });

        if (hayError) {
            alert('Hay errores en las cantidades recibidas. Por favor verifique.');
            return;
        }
        for (const item of actualizaciones) {
            await confirmarRecepcion(item.id_detalle, item.cantidad_recibida);
        }
        await confirmarRecepcion(despachoActual, null, 'recibido');
        $('#modalDetalleSucursal').modal('hide');
        $('#tablaDespachosSucursal').DataTable().ajax.reload();
    });
});

$(document).ready(async () => {
    await cargarTablasProductos();
    let enviandoSolicitud = false; // Bandera para prevenir múltiples clics
    
    $('#btnEnviarSolicitud').click(async () => {
        // Prevenir múltiples clics
        if (enviandoSolicitud) {
            return;
        }

        const btn = $('#btnEnviarSolicitud');
        const textoOriginal = btn.html();
        
        // Deshabilitar botón y mostrar indicador de carga
        enviandoSolicitud = true;
        btn.prop('disabled', true);
        btn.html('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Enviando...');

        try {
            const cantidades = document.querySelectorAll('.cantidad-solicitada');
            const productosSolicitados = [];
            let hayError = false;
            cantidades.forEach(input => {
                const cantidad = parseInt(input.value);
                const stock = parseInt(input.dataset.stock);

                if (input.classList.contains('is-invalid') || cantidad > stock) {
                    hayError = true;
                    return;
                }

                if (cantidad > 0) {
                    productosSolicitados.push({
                        id_producto: input.dataset.id,
                        cantidad
                    });
                }
            });

            if (hayError) {
                alert('Hay productos solicitados que exceden el stock disponible o son inválidos.');
                // Rehabilitar botón y restaurar texto original
                enviandoSolicitud = false;
                btn.prop('disabled', false);
                btn.html(textoOriginal);
                return;
            }
            if (productosSolicitados.length === 0) {
                alert('Debes seleccionar al menos un producto con cantidad mayor a 0.');
                // Rehabilitar botón y restaurar texto original
                enviandoSolicitud = false;
                btn.prop('disabled', false);
                btn.html(textoOriginal);
                return;
            }
            
            const exito = await crearDespachoConDetalles(productosSolicitados);
            if (exito) {
                alert('Solicitud enviada correctamente.');
                $('#modalNuevaSolicitud').modal('hide');
                $('.modal-backdrop').remove(); // Elimina el fondo gris
                $('body').removeClass('modal-open'); // Restaura el scroll
                
                // Limpiar los campos después de enviar exitosamente
                cantidades.forEach(input => {
                    input.value = 0;
                });
            } else {
                alert('Error al enviar la solicitud.');
            }
        } catch (error) {
            console.error('Error al enviar solicitud:', error);
            alert('Error al enviar la solicitud.');
        } finally {
            // Rehabilitar botón y restaurar texto original
            enviandoSolicitud = false;
            btn.prop('disabled', false);
            btn.html(textoOriginal);
        }
    });
});
