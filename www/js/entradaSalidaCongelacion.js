import { actualizarMovimiento, agregarMovimiento, eliminarMovimiento, obtenerMovimiento } from '../backend/endpoints/movimientoProductoBackend.js';
import { obtenerProductosActivos, obtenerProductosActivosExistentes, obtenerStockProducto } from '../backend/endpoints/productoBackend.js';
import {supabase} from '../backend/supabase/supabaseCliente.js';

let entradasGlobal = []; 
let salidasGlobal = [];
const tipoSalida = 'salida';
const tipoEntrada = 'entrada';
const tipoProducto = 'congelacion';

$(document).ready(async function () {
    let tableEntradas;
    let tableSalidas;
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
    inicializarTablas(mostrarAcciones); // 👈 función donde se crean las DataTables

    $('#productoSelect').select2({
        placeholder: "Selecciona un producto",
        language: "es",
        width: '100%', 
        dropdownParent: $('#modalEntradaSalida') // Esto es importante para modales
    });
    $('#productoSelect1').select2({
        placeholder: "Selecciona un producto",
        language: "es",
        width: '100%', 
        dropdownParent: $('#modalSalidaEntrada') // Esto es importante para modales
    });
        
    function inicializarTablas(mostrarAcciones) {
        // --- Tabla Entradas ---
        const columnasEntradas = [
            { 
                data: 'fecha_movimiento', 
                title: 'Fecha',
                render: function(data, type, row) {
                    if (type === 'display' || type === 'filter') {
                        // Convertir la fecha a formato legible
                        const fecha = new Date(data);
                        // Formatear como dd/mm/yyyy, hh:mm AM/PM
                        return fecha.toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });
                    }
                    return data; // Para otros tipos (sort, etc.), devolver el valor original
                }
            },
            { data: 'producto.nombre_producto', title: 'Nombre' },
            { data: 'und_movimiento', title: 'Und' },
        ];

        if (mostrarAcciones) {
            columnasEntradas.push({
            data: null,
            title: 'Acciones',
            render: (data, type, row) => `
                <button class='btn btn-warning btnEditar' data-id='${row.id_movimiento}'>Editar</button>
                <button class='btn btn-danger btnEliminar' data-id='${row.id_movimiento}'>Eliminar</button>
            `
            });
        }

        tableEntradas =  $('#tablaEntradas').DataTable({
            ajax: async (data, callback) => {                
                entradasGlobal = await obtenerMovimiento(tipoEntrada, tipoProducto);
                callback({ data: entradasGlobal });
            },
            autoWidth: false,
            responsive: true,
            language: {
                            "lengthMenu": "Mostrar _MENU_ registros por página",
                    "zeroRecords": "No se encontraron resultados",
                    "info": "Mostrando _START_ a _END_ de _TOTAL_ registros",
                    "infoEmpty": "Mostrando 0 a 0 de 0 registros",
                    "infoFiltered": "(filtrado de _MAX_ registros totales)",
                    "search": "Buscar:",
                    "paginate": {
                        "first": "Primero",
                        "last": "Último",
                        "next": "Siguiente",
                        "previous": "Anterior"
                    }
            },
            order: [[0, 'desc']],
            columns: columnasEntradas
        });
        // --- Tabla Salidas ---
        const columnasSalidas = [
            { 
                data: 'fecha_movimiento', 
                title: 'Fecha',
                render: function(data, type, row) {
                    if (type === 'display' || type === 'filter') {
                        // Convertir la fecha a formato legible
                        const fecha = new Date(data);
                        // Formatear como dd/mm/yyyy, hh:mm AM/PM
                        return fecha.toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });
                    }
                    return data; // Para otros tipos (sort, etc.), devolver el valor original
                }
            },
            { data: 'producto.nombre_producto', title: 'Nombre' },
            { data: 'und_movimiento', title: 'Und' },
        ];

        if (mostrarAcciones) {
            columnasSalidas.push({
            data: null,
            title: 'Acciones',
            render: (data, type, row) => `
                <button class='btn btn-warning btnEditar' data-id='${row.id_movimiento}'>Editar</button>
                <button class='btn btn-danger btnEliminar' data-id='${row.id_movimiento}'>Eliminar</button>
            `
            });
        }

        tableSalidas =   $('#tablaSalidas').DataTable({
            autoWidth: false,
            responsive: true,
            language: {
                            "lengthMenu": "Mostrar _MENU_ registros por página",
                    "zeroRecords": "No se encontraron resultados",
                    "info": "Mostrando _START_ a _END_ de _TOTAL_ registros",
                    "infoEmpty": "Mostrando 0 a 0 de 0 registros",
                    "infoFiltered": "(filtrado de _MAX_ registros totales)",
                    "search": "Buscar:",
                    "paginate": {
                        "first": "Primero",
                        "last": "Último",
                        "next": "Siguiente",
                        "previous": "Anterior"
                    }
            },
            order: [[0, 'desc']],
            ajax: async (data, callback) => {
            salidasGlobal = await obtenerMovimiento(tipoSalida, tipoProducto);
            callback({ data: salidasGlobal });
            },
            columns: columnasSalidas
        });
    }

    async function actualizarTablaEntradas() {
        const paginaActual = tableEntradas.page();
        const entradas = await obtenerMovimiento(tipoEntrada, tipoProducto); // Obtiene datos actualizados
        tableEntradas.clear().rows.add(entradas).draw();
        tableEntradas.page(paginaActual).draw(false);
    }

    async function actualizarTablaSalidas() {
        const paginaActual = tableSalidas.page();
        const salidas = await obtenerMovimiento(tipoSalida, tipoProducto); // Obtiene datos actualizados
        tableSalidas.clear().rows.add(salidas).draw();
        tableSalidas.page(paginaActual).draw(false);
    }

    function mensajeError(mensaje) {
        const mensajeErrorDiv = document.getElementById('mensajeErrorDatos');
        mensajeErrorDiv.textContent = mensaje;
        setTimeout(() => {
            $('#mensajeErrorDatos').fadeOut();
        }, 5000);
    }
    console.log('Iniciando suscripción a productos_updates...');

    supabase
    .channel('entradas_updates') // Nombre del canal, puede ser cualquier string
    .on(
        'postgres_changes',
        { event: '*', schema: 'inventario', table: 'movimiento_producto' },
        (payload) => {
            console.log('Cambio detectado en entradas:', payload);
            actualizarTablaEntradas(); // Refresca la tabla sin recargar la página
            actualizarTablaSalidas(); // Refresca la tabla sin recargar la página
        }
    )
    .subscribe();

    let modoEntrada = "agregar";  // Variable para rastrear la acción (agregar o editar)
    let idProductoEditarEntrada = null;  // Guardará el ID del producto a editar
    let modoSalida = "agregar";  // Variable para rastrear la acción (agregar o editar)
    let idProductoEditarSalida = null;  // Guardará el ID del producto a editar
    $('#btnAgregarEntradaSalida').click(async function () {
        modoEntrada = "agregar";  // Cambiamos el modo a "agregar"
        idProductoEditarEntrada = null; // No hay ID, ya que es un producto nuevo
        // Limpiar los campos del formulario
        $('#formEntradaSalida')[0].reset();
        // Mostrar el modal
        $('#modalEntradaSalida').modal('show');
        const productos = await obtenerProductosActivos(tipoProducto);
        console.log("Productos obtenidos:", productos); // Verificar que hay productos
    
        if (!productos || productos.length === 0) {
            console.error("No hay productos disponibles");
            $('#productoSelect').html('<option value="">No hay productos disponibles</option>');
            return;
        }

        $('#productoSelect').empty(); // Limpiar la lista antes de añadir opciones
        productos.forEach(p => {
            $('#productoSelect').append(`<option value="${p.id_producto}">${p.nombre_producto}</option>`);
        });
        console.log('se esta ariendo todo')
    });

    $('#btnAgregarSalidaEntrada').click(async function () {
        modoSalida = "agregar";  // Cambiamos el modo a "agregar"
        idProductoEditarSalida = null; // No hay ID, ya que es un producto nuevo
        // Limpiar los campos del formulario
        $('#formSalidaEntrada')[0].reset();
        $('#mensajeErrorDatos').hide();
        // Mostrar el modal
        $('#modalSalidaEntrada').modal('show');
        const productos = await obtenerProductosActivosExistentes(tipoProducto);
        console.log("Productos obtenidos:", productos); // Verificar que hay productos
    
        if (!productos || productos.length === 0) {
            console.error("No hay productos disponibles");
            $('#productoSelect1').html('<option value="">No hay productos disponibles</option>');
            return;
        }
    
        $('#productoSelect1').empty(); // Limpiar la lista antes de añadir opciones
        productos.forEach(p => {
            $('#productoSelect1').append(`<option value="${p.id_producto}">${p.nombre_producto}</option>`);
            
        });
        console.log('se esta ariendo todo')
    });

    


    $('#tablaEntradas tbody').on('click', '.btnEditar', async function () {
        modoEntrada = "editar";  // Cambiamos el modo a "editar"
        idProductoEditarEntrada = $(this).data('id');  // Guardamos el ID del producto a editar
        console.log('producto a editar',idProductoEditarEntrada)
        $('#formEntradaSalida')[0].reset();

        const productos = await obtenerProductosActivos(tipoProducto);
        console.log("Productos obtenidos:", productos); // Verificar que hay productos
    
        if (!productos || productos.length === 0) {
            console.error("No hay productos disponibles");
            $('#productoSelect').html('<option value="">No hay productos disponibles</option>');
            return;
        }
    
        $('#productoSelect').empty(); // Limpiar la lista antes de añadir opciones
        productos.forEach(p => {
            $('#productoSelect').append(`<option value="${p.id_producto}">${p.nombre_producto}</option>`);
           
        });
        console.log("Entradas en entradasGlobal:", entradasGlobal);
        entradasGlobal = await obtenerMovimiento(tipoEntrada, tipoProducto);
        let entradas = entradasGlobal.find(p => p.id_movimiento == idProductoEditarEntrada);
        console.log("Entrada seleccionada:", entradas);
        console.log("Editar producto con ID:", idProductoEditarEntrada); // Para verificar si se captura el ID
        // Llenar el formulario con los datos actuales
        
        $("#cantidad").val(entradas.und_movimiento);
            
        setTimeout(() => {
            $('#productoSelect').val(entradas.id_producto).change();  // ✅ Esta línea selecciona el producto correcto
        }, 100); 
        $('#modalEntradaSalida').modal('show');
        //$('#modalVerificar').modal('show');

    });
    let unidades_salidas = null;
    $('#tablaSalidas tbody').on('click', '.btnEditar', async function () {
        
        modoSalida = "editar";  // Cambiamos el modo a "editar"
        idProductoEditarSalida = $(this).data('id');  // Guardamos el ID del producto a editar
        $('#formSalidaEntrada')[0].reset();
        console.log('prueba', idProductoEditarSalida)
        const productos = await obtenerProductosActivos(tipoProducto);
        console.log("Productos obtenidos:", productos); // Verificar que hay productos
    
        if (!productos || productos.length === 0) {
            console.error("No hay productos disponibles");
            $('#productoSelect1').html('<option value="">No hay productos disponibles</option>');
            return;
        }
    
        $('#productoSelect1').empty(); // Limpiar la lista antes de añadir opciones
        productos.forEach(p => {
            $('#productoSelect1').append(`<option value="${p.id_producto}">${p.nombre_producto}</option>`);
           
        });
        
        salidasGlobal = await obtenerMovimiento(tipoSalida, tipoProducto);
        console.log("Entradas en entradasGlobal:", salidasGlobal);
        console.log('Entrada a editar', idProductoEditarSalida);
        let entradas = salidasGlobal.find(p => p.id_movimiento == idProductoEditarSalida);
        console.log("Entrada seleccionada:", entradas);
        
        console.log("Editar producto con ID:", idProductoEditarSalida); // Para verificar si se captura el ID
        // Llenar el formulario con los datos actuales
        console.log('Movimiento a editar', entradas)
        console.log("ID del producto a seleccionar:", entradas.id_producto);
        unidades_salidas = entradas.und_movimiento;
        $("#cantidad1").val(entradas.und_movimiento);
            
        setTimeout(() => {
        $('#productoSelect1').val(entradas.id_producto).change();  // ✅ Esta línea selecciona el producto correcto
        }, 100);
            
        $('#modalSalidaEntrada').modal('show');

    });

    $('#formEntradaSalida').submit(async function (e) {
        e.preventDefault();
        const idProducto = $('#productoSelect').val();
        const unidades = $('#cantidad').val();
        if (modoEntrada === "agregar") {
            console.log("Se se va a de insertar");
            await agregarMovimiento(tipoEntrada, idProducto, unidades);
        } 
        else if (modoEntrada === "editar" && idProductoEditarEntrada !== null) {
            console.log("Se se va a editar");
            await actualizarMovimiento(idProductoEditarEntrada, idProducto, unidades);
        }
        $('#modalEntradaSalida').modal('hide');
        actualizarTablaEntradas(); // Refresca la tabla correctamente
        entradasGlobal = await obtenerMovimiento(tipoEntrada, tipoProducto);
    });

    $('#formSalidaEntrada').submit(async function (e) {
        e.preventDefault();    
        console.log("Se se va a de insertar");
        const idProducto = $('#productoSelect1').val();
        const unidades = $('#cantidad1').val();

        if (modoSalida === "agregar") {
            const stockDisponible = await obtenerStockProducto(idProducto);
            console.log(stockDisponible);
            if (unidades > stockDisponible) {
                $('#mensajeErrorDatos').show(); // Mostrar mensaje de error
                mensajeError(`⚠️ No puedes registrar una salida de ${unidades} unidades, solo hay ${stockDisponible} en stock.`);
                
                return;
            }
            await agregarMovimiento(tipoSalida, idProducto, unidades);

        } 
        else if (modoSalida === "editar" && idProductoEditarSalida !== null) {
            
            const stock = await obtenerStockProducto(idProducto);
            const stockDisponible = stock + unidades_salidas;
            console.log(unidades_salidas);
            console.log(stockDisponible);
    
            if (unidades > stockDisponible) {
                $('#mensajeErrorDatos').show(); // Mostrar mensaje de error
                mensajeError(`⚠️ No puedes editar una salida de ${unidades} unidades, solo hay ${stockDisponible} en stock.`);                
                return;
            }    
            await actualizarMovimiento(idProductoEditarSalida, idProducto, unidades);
        }
        $('#modalSalidaEntrada').modal('hide');
        actualizarTablaSalidas(); // Refresca la tabla correctamente
        salidasGlobal = await obtenerMovimiento(tipoSalida, tipoProducto);
    });

    $('#tablaEntradas tbody').on('click', '.btnEliminar', function () {
        const id = $(this).data('id');
        console.log("Eliminar producto con ID:", id); 
        $('#modalConfirmarEliminar').modal('show');    
        $('#btnConfirmarEliminar').off('click').on('click', async function () {
            await eliminarMovimiento(id);
            $('#modalConfirmarEliminar').modal('hide');
            actualizarTablaEntradas();
        });
    });
    
    $('#tablaSalidas tbody').on('click', '.btnEliminar', function () {
        const id = $(this).data('id');
        console.log("Eliminar producto con ID:", id); 
        $('#modalConfirmarEliminar').modal('show');
        $('#formularioVerificar').off('submit').on('submit', function (e) {
            e.preventDefault();
        });
        $('#btnConfirmarEliminar').off('click').on('click', async function () {
            await eliminarMovimiento(id);
            $('#modalConfirmarEliminar').modal('hide');
            actualizarTablaSalidas();
        });
    });
    
});
