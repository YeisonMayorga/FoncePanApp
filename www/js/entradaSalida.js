import {actualizarEntradan, actualizarSalidan, agregarEntradan, agregarSalidan, eliminarEntradan, eliminarSalidan, obtenerEntradasn, obtenerProductosn, obtenerProductosUndn, obtenerSalidasn, obtenerStockProducton } from './app.js';
import {supabase} from '../supabase/supabaseCliente.js';
let entradasGlobal = []; 
let salidasGlobal = [];
$(document).ready(async function () {
    // Evita que se muestre la página antes de tiempo
    document.body.classList.remove('loaded');
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
            data: 'fecha_entrada', 
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
            { data: 'nombre_producto', title: 'Nombre' },
            { data: 'provedor_producto', title: 'Proveedor' },
            { data: 'nombre_um', title: 'Unidad Medida' },
            { data: 'und_entrada', title: 'Und' },
        ];
        if (mostrarAcciones) {
            columnasEntradas.push({
            data: null,
            title: 'Acciones',
            render: (data, type, row) => `
                <button class='btn btn-warning btnEditar' data-id='${row.id_entrada}'>Editar</button>
                <button class='btn btn-danger btnEliminar' data-id='${row.id_entrada}'>Eliminar</button>
            `
            });
        }
        
        tableEntradas = $('#tablaEntradas').DataTable({
            ajax: async function (data, callback) {
                entradasGlobal = await obtenerEntradasn();
                console.log(entradasGlobal);
                callback({ data: entradasGlobal });
                // 🟢 QUITAR LOADER CUANDO LA TABLA YA TIENE DATOS
                setTimeout(() => {
                    document.body.classList.add('loaded');
                }, 300);                
            },            
            autoWidth: false,
            responsive: true,
            "language": {
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
            data: 'fecha_salida', 
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
            { data: 'nombre_producto', title: 'Nombre' },
            { data: 'provedor_producto', title: 'Proveedor' },
            { data: 'nombre_um', title: 'Unidad Medida' },
            { data: 'und_salida', title: 'Und' },
        ];
        if (mostrarAcciones) {
            columnasSalidas.push({
            data: null,
            title: 'Acciones',
            render: (data, type, row) => `
                <button class='btn btn-warning btnEditar' data-id='${row.id_salida}'>Editar</button>
                <button class='btn btn-danger btnEliminar' data-id='${row.id_salida}'>Eliminar</button>
            `
            });
        }
        tableSalidas = $('#tablaSalidas').DataTable({
            autoWidth: false,
            responsive: true,
            "language": {
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
            ajax: async function (data, callback) {
                salidasGlobal = await obtenerSalidasn();
                console.log(salidasGlobal);
                console.log('Tamaño de salida',salidasGlobal.length);
                callback({ data: salidasGlobal });
               
            },
            columns: columnasSalidas
        });
    }

    async function actualizarTablaEntradas() {
        const paginaActual = tableEntradas.page(); // Guarda la página actual
        const entradas = await obtenerEntradasn(); // Obtiene datos actualizados
        tableEntradas.clear().rows.add(entradas).draw();
        tableEntradas.page(paginaActual).draw(false);     // 🔄 Vuelve a la misma página
    }
    async function actualizarTablaSalidas() {
        const paginaActual = tableSalidas.page();
        const salidas = await obtenerSalidasn(); // Obtiene datos actualizados
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
        { event: '*', schema: 'inventario', table: 'entradasn' },
        (payload) => {
            console.log('Cambio detectado en entradas:', payload);
            actualizarTablaEntradas(); // Refresca la tabla sin recargar la página
        }
    )
    .subscribe();
    supabase
    .channel('salidas_updates') // Nombre del canal, puede ser cualquier string
    .on(
        'postgres_changes',
        { event: '*', schema: 'inventario', table: 'salidasn' },
        (payload) => {
            console.log('Cambio detectado en salidas:', payload);
            actualizarTablaSalidas(); // Refresca la tabla sin recargar la página
        }
    )
    .subscribe();
    
    let modoEntrada = "agregar";  // Variable para rastrear la acción (agregar o editar)
    let idProductoEditarEntrada = null;  // Guardará el ID del producto a editar
    let modoSalida = "agregar";  // Variable para rastrear la acción (agregar o editar)
    let idProductoEditarSalida = null;  // Guardará el ID del producto a editar

    $('#btnAgregarEntradaSalida').click(async function () {
        modoEntrada = 'agregar';
        idProductoEditarEntrada = null;
        // Limpiar los campos del formulario
        $('#formEntradaSalida')[0].reset();
        // Mostrar el modal
        $('#modalEntradaSalida').modal('show');
        const productos = await obtenerProductosn();
        console.log("Productos obtenidos:", productos); // Verificar que hay productos
        if (!productos || productos.length === 0) {
            console.error("No hay productos disponibles");
            $('#productoSelect').html('<option value="">No hay productos disponibles</option>');
            return;
        }
        $('#productoSelect').empty(); // Limpiar la lista antes de añadir opciones
        productos.forEach(p => {   
            $('#productoSelect').append(`<option value="${p.id_producto}">${p.nombre_producto}  --  (${p.nombre_um}) --  ${p.provedor_producto}</option>`);    
        });
        console.log('se esta ariendo todo')
    });

    $('#btnAgregarSalidaEntrada').click(async function () {
        modoSalida = 'agregar';
        idProductoEditarSalida = null;
        // Limpiar los campos del formulario
        $('#formSalidaEntrada')[0].reset();
        $('#mensajeErrorDatos').hide();
        // Mostrar el modal
        $('#modalSalidaEntrada').modal('show');
        const productos = await obtenerProductosUndn();
        console.log("Productos obtenidos:", productos); // Verificar que hay productos
        if (!productos || productos.length === 0) {
            console.error("No hay productos disponibles");
            $('#productoSelect1').html('<option value="">No hay productos disponibles</option>');
            return;
        }
        $('#productoSelect1').empty(); // Limpiar la lista antes de añadir opciones
        productos.forEach(p => {
            $('#productoSelect1').append(`<option value="${p.id_producto}">${p.nombre_producto}  --  (${p.nombre_um}) --  ${p.provedor_producto}</option>`);
        });
        console.log('se esta ariendo todo')
    });

    $('#tablaEntradas tbody').on('click', '.btnEditar', async function () {
        modoEntrada = 'editar';
        idProductoEditarEntrada = $(this).data('id');
        $('#formEntradaSalida')[0].reset();
        const productos = await obtenerProductosn();
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
        entradasGlobal = await obtenerEntradasn();
        let entradas = entradasGlobal.find(p => p.id_entrada == idProductoEditarEntrada);
        console.log("Entrada seleccionada:", entradas);
        console.log(entradas.und_entrada,entradas.fecha_entrada,entradas.nombre_producto)
        console.log("Editar producto con ID:", idProductoEditarEntrada); // Para verificar si se captura el ID
        // Llenar el formulario con los datos actuales
        console.log("ID del producto a seleccionar:", entradas.id_producto);
        $("#cantidad").val(entradas.und_entrada);
        setTimeout(() => {
            $('#productoSelect').val(entradas.id_producto).change();  // ✅ Esta línea selecciona el producto correcto
        }, 100);
        $('#modalEntradaSalida').modal('show');
    });

    let unidades_salidas = null;
    $('#tablaSalidas tbody').on('click', '.btnEditar', async function () {
        $('#formSalidaEntrada')[0].reset();
        modoSalida = 'editar';
        idProductoEditarSalida = $(this).data('id');
        const productos = await obtenerProductosn();
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
        console.log("Entradas en entradasGlobal:", salidasGlobal);
        salidasGlobal = await obtenerSalidasn();
        let entradas = salidasGlobal.find(p => p.id_salida == idProductoEditarSalida);
        console.log("Entrada seleccionada:", entradas);
        console.log(entradas.und_salida,entradas.fecha_salida,entradas.nombre_producto)
        console.log("Editar producto con ID:", idProductoEditarSalida); // Para verificar si se captura el ID
        // Llenar el formulario con los datos actuales
        console.log("ID del producto a seleccionar:", entradas.id_producto);
        unidades_salidas = entradas.und_salida;
        $("#cantidad1").val(entradas.und_salida);   
        setTimeout(() => {
            $('#productoSelect1').val(entradas.id_producto).change();  // ✅ Esta línea selecciona el producto correcto
        }, 100);
        $('#modalSalidaEntrada').modal('show');
        //$('#modalVerificar').modal('show');
    });

    $('#formEntradaSalida').submit(async function (e) {
        e.preventDefault();
        console.log("Se se va a de insertar");
        const idProducto = $('#productoSelect').val();
        const unidades = $('#cantidad').val();

        if (modoEntrada === "agregar") {
            console.log("Se se va a de insertar");
            await agregarEntradan(idProducto, unidades);
        } else if (modoEntrada === "editar" && idProductoEditarEntrada !== null) {
            console.log("Se se va a editar");
            await actualizarEntradan(idProductoEditarEntrada, idProducto, unidades);;  
        }

        $('#modalEntradaSalida').modal('hide');
        actualizarTablaEntradas(); // Refresca la tabla correctamente
        entradasGlobal = await obtenerEntradasn();
    });

    $('#formSalidaEntrada').submit(async function (e) {
        e.preventDefault();
        console.log("Se se va a de insertar");
        const idProducto = $('#productoSelect1').val();
        const unidades = $('#cantidad1').val();
        if (modoSalida === "agregar") {
            const stockDisponible = await obtenerStockProducton(idProducto);
            console.log(stockDisponible);
            if (unidades > stockDisponible) {
                $('#mensajeErrorDatos').show(); // Mostrar mensaje de error
                mensajeError(`⚠️ No puedes registrar una salida de ${unidades} unidades, solo hay ${stockDisponible} en stock.`);
                return;
            }
            await agregarSalidan(idProducto, unidades);
        } else if (modoSalida === "editar" && idProductoEditarSalida !== null) {
            const stock = await obtenerStockProducton(idProducto);
            const stockDisponible = stock + unidades_salidas;
            console.log(stockDisponible);
            if (unidades > stockDisponible) {
                $('#mensajeErrorDatos').show(); // Mostrar mensaje de error
                mensajeError(`⚠️ No puedes editar una salida de ${unidades} unidades, solo hay ${stockDisponible} en stock.`);  
                return;
            }
            await actualizarSalidan(idProductoEditarSalida, idProducto, unidades);
        }
        $('#modalSalidaEntrada').modal('hide');
        actualizarTablaSalidas(); // Refresca la tabla correctamente
        salidasGlobal = await obtenerSalidasn();
    });

    $('#tablaEntradas tbody').on('click', '.btnEliminar', function () {
        const id = $(this).data('id');
        console.log("Eliminar producto con ID:", id); 
        $('#modalConfirmarEliminar').modal('show');
        //$('#modalVerificar').modal('show');
        $('#btnConfirmarEliminar').off('click').on('click', async function () {
            await eliminarEntradan(id);
            $('#modalConfirmarEliminar').modal('hide');
            actualizarTablaEntradas();
        });
    });
    
    $('#tablaSalidas tbody').on('click', '.btnEliminar', function () {
        const id = $(this).data('id');
        console.log("Eliminar producto con ID:", id); 
        $('#modalConfirmarEliminar').modal('show');
        //$('#modalVerificar').modal('show');
        $('#formularioVerificar').off('submit').on('submit', function (e) {
            e.preventDefault();
        });
        $('#btnConfirmarEliminar').off('click').on('click', async function () {
            await eliminarSalidan(id);
            $('#modalConfirmarEliminar').modal('hide');
            actualizarTablaSalidas();
        });
    });
    
});
