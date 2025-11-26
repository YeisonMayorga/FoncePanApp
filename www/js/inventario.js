import {actualizarProducton, agregarEntradan, agregarProducton, agregarSalidan, eliminarProducton, obtenerProductosn, obtenerStockProducton, obtenerUm, supabase } from './app.js';

let productosGlobal = []; // Declara variable para guardar datos de los productos

$(document).ready(async function () {
    let rolUsuario;
    checkAuthAndRole();
    const idRol = await checkAuthAndRole();
    if (!idRol) return; // Si no hay rol, ya se redirigió
    rolUsuario = idRol;
    //Función para cargar datos en la tabla
    // Umbrales iniciales (pueden ser editados por el usuario)
    $('#productoSelect').select2({
        placeholder: "Selecciona un producto",
        language: "es",
        width: '100%',
        dropdownParent: $('#modalEntradaSalida') // Esto es importante para modales
    });

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

    const columnasTabla = [
        { data: 'nombre_producto', title: 'Nombre' },
        { data: 'provedor_producto', title: 'Proveedor' },
        { data: 'nombre_um', title: 'U M' },
        { data: 'und_producto', title: 'Und' },
        { data: null, title: 'Clr' },
    ];

    // Si el rol permite, se agrega la columna de acciones
    if (mostrarAcciones) {
    columnasTabla.push({
        data: null,
        title: 'Acciones',
        render: function (data, type, row) {
        return `
            <button class='btn btn-warning btnEditar' data-id='${row.id_producto}'>Editar</button>
            <button class='btn btn-danger btnEliminar' data-id='${row.id_producto}'>Eliminar</button>
        `;
        }
    });
    }

    const table = $('#tablaProductos').DataTable({
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
        order: [[4, 'asc']], // Ordenar por el índice de la columna Estado (verde > naranja > rojo)
        columnDefs: [
            {
                targets: 4, // Índice de la columna "Estado"
                type: 'custom-umbrales', // Tipo de ordenamiento personalizado
                render: function (data, type, row) {
                    let color = 'green';
                    let valorOrden = 3; // Verde (mayor valor)

                    if (row.und_producto <= row.umbral_rojo) {
                        color = 'red';
                        valorOrden = 1; // Rojo (menor valor)
                    } else if (row.und_producto <= row.umbral_naranja) {
                        color = 'orange';
                        valorOrden = 2; // Naranja (valor intermedio)
                    }

                    if (type === 'sort') {
                        return valorOrden; // Retorna el valor de ordenación
                    }
                    return `<div class="barra-estado" data-id="${row.id_producto}" style="cursor: pointer; width: 100%; height: 20px; border-radius: 5px; background-color: ${color};"></div>`;
                }
            }
        ],
        ajax: async function (data, callback) {
            let productos = await obtenerProductosn();
            callback({ data: productos });
        },
        columns: columnasTabla
    });
    // Mostrar modal al hacer clic en la barra de estado
    $(document).on("click", ".barra-estado", function() {
        let idProducto = $(this).data("id");
        // Obtener datos del producto en la tabla
        let rowData = table.row($(this).closest("tr")).data();
        $("#umbral-producto-id").val(idProducto);
        $("#umbral-rojo").val(rowData.umbral_rojo);
        $("#umbral-naranja").val(rowData.umbral_naranja);
        $("#modalEditarUmbral").modal("show");
    });
    // Guardar cambios en Supabase
    $("#guardarUmbral").on("click", async function () {
    let idProducto = $("#umbral-producto-id").val();
    let umbralRojo = $("#umbral-rojo").val();
    let umbralNaranja = $("#umbral-naranja").val();
    
    if (umbralNaranja <= 0 || umbralRojo < 0) {
        console.error("Los valores de umbral deben ser mayores que cero.");
        alert("Los valores de umbral deben ser mayores que cero.");
        return;
    }
    const { error } = await supabase
        .schema("inventario")
        .from("umbrales")
        .update([
        {
            id_producto: idProducto,
            umbral_rojo: umbralRojo,
            umbral_naranja: umbralNaranja,
        },
        ])
        .eq("id_producto", idProducto);

    if (error) {
        console.error("Error al actualizar umbrales:", error);
        alert("Hubo un error al guardar los cambios.");
        return;
    }
    // Cerrar modal y recargar la tabla
    $("#modalEditarUmbral").modal("hide");
    actualizarTabla();
    });
    //Función para actualizar datos de la tabla
    async function actualizarTabla() {
        const paginaActual = table.page(); // Guarda la página actual
        const productos = await obtenerProductosn(); // Obtiene los datos nuevos

        table.clear().rows.add(productos).draw(); // Actualiza los datos
        table.page(paginaActual).draw(false);     // 🔄 Vuelve a la misma página
    }
    //Funcion para mostrar mensaje de error cuando algún dato  esta mal insertado
    function mensajeError(mensaje) {
        const mensajeErrorDiv = document.getElementById('mensajeErrorDatos');
        mensajeErrorDiv.textContent = mensaje;
        //Hace que el mesaje se desaparezca luego de 5 segundos
        setTimeout(() => {
            $('#mensajeErrorDatos').fadeOut();
        }, 5000);
    }
    //Algoritmo para actualizar en tiempo real los datos en todos los dispositivos
    console.log('Iniciando suscripción a productos_updates...');

    supabase
    .channel('productos_updates') // Nombre del canal, puede ser cualquier string
    .on(
        'postgres_changes',
        { event: '*', schema: 'inventario', table: 'productosn' },
        (payload) => {
            console.log('Cambio detectado en productos:', payload);
            actualizarTabla(); // Refresca la tabla sin recargar la página
        }
    )
    .subscribe();
    supabase
    .channel('umbrales_updates')
    .on(
        'postgres_changes',
        { event: '*', schema: 'inventario', table: 'umbrales' },
        (payload) => {
            console.log('Cambio detectado en umbrales:', payload);
            actualizarTabla(); // Refresca la tabla cuando cambian los umbrales
        }
    )
    .subscribe();
        
    const um = await obtenerUm();
    console.log("Productos obtenidos:", um); // Verificar que hay productos
    if (!um || um.length === 0) {
        console.error("No hay productos disponibles");
        $('#umSelect').html('<option value="">No hay productos disponibles</option>');
        return;
    }
    $('#umSelect').empty(); // Limpiar la lista antes de añadir opciones
    um.forEach(p => {
        $('#umSelect').append(`<option value="${p.id_um}">${p.nombre_um}</option>`);    
    });
    let modo = "agregar";  // Variable para rastrear la acción (agregar o editar)
    let idProductoEditar = null;  // Guardará el ID del producto a editar
    //Función para abrir modal de agregar producto nuevo
    $('#btnAgregar').click(() => {
        modo = "agregar";  // Cambiamos el modo a "agregar"
        idProductoEditar = null; // No hay ID, ya que es un producto nuevo
        $('#formulario')[0].reset(); // Limpia los campos del formulario para agregar/editar producto
        // Mostrar el modal 
        $('#modalFormulario').modal('show');
    });

    $('#tablaProductos tbody').on('click', '.btnEditar',async function () {
        $('#formulario')[0].reset();
        modo = "editar";  // Cambiamos el modo a "editar"
        idProductoEditar = $(this).data('id');  // Guardamos el ID del producto a editar
        productosGlobal = await obtenerProductosn();
        let productos = productosGlobal.find(p => p.id_producto == idProductoEditar);
        console.log(productos)
        console.log("Editar producto con ID:", idProductoEditar); // Para verificar si se captura el ID
        // Llenar el formulario con los datos actuales
        const um = await obtenerUm();
        console.log("Productos obtenidos:", um); // Verificar que hay productos
        
        if (!um || um.length === 0) {
            console.error("No hay productos disponibles");
            $('#umSelect').html('<option value="">No hay productos disponibles</option>');
            return;
        }
        
        $('#umSelect').empty(); // Limpiar la lista antes de añadir opciones
        um.forEach(p => {
            $('#umSelect').append(`<option value="${p.id_um}">${p.nombre_um}</option>`);    
        });
            
        $("#nombre").val(productos.nombre_producto);
        $("#provedor").val(productos.provedor_producto);
        $("#umSelect").val(productos.id_um);
        $("#und_producto").val(productos.und_producto);
        $('#modalFormulario').modal('show');
    });

    $('#formulario').off('submit').on('submit', async function (e) {
        e.preventDefault();
        const nombre = $('#nombre').val();
        const provedor = $('#provedor').val();
        const um = $('#umSelect').val();
        const unidades = $('#und_producto').val();
        if (modo === "agregar") {
            await agregarProducton(nombre, provedor, um, unidades);
        } else if (modo === "editar" && idProductoEditar !== null) {
            await actualizarProducton(idProductoEditar, nombre, provedor, um, unidades);
        }
        $('#modalFormulario').modal('hide');
        actualizarTabla(); // Refresca la tabla correctamente
    });
    
    $('#tablaProductos tbody').on('click', '.btnEliminar', function () {
        const id = $(this).data('id');
        console.log("Eliminar producto con ID:", id); // Para verificar si se captura el ID
        $('#modalConfirmarEliminar').modal('show');
        $('#btnConfirmarEliminar').off('click').on('click', async function () {
            await eliminarProducton(id);
            $('#modalConfirmarEliminar').modal('hide');
            actualizarTabla(); // Refresca la tabla correctamente
        });
    });

    $('#btnAgregarEntradaSalida').click(async function () {
        $('#formEntradaSalida')[0].reset(); // Limpiar los campos del formulario
        $('#modalEntradaSalida').modal('show');
        $('#mensajeErrorDatos').hide();
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
    });

    $('#formEntradaSalida').submit(async function (event) {
        event.preventDefault(); // Evita el envío del formulario por defecto
        const idProducto = $('#productoSelect').val();
        const unidades = parseInt($('#cantidad').val(), 10);
        const botonPresionado = $(document.activeElement).attr('id'); // Obtiene el id del botón que se presionó
        const hoy = new Date().toISOString().split('T')[0];
        if (botonPresionado === "btnAgregarEntrada") {
            console.log("Se presionó Agregar Entrada");
            await agregarEntradan(idProducto, unidades);
        } else if (botonPresionado === "btnAgregarSalida") {

            const stockDisponible = await obtenerStockProducton(idProducto);
            console.log(stockDisponible);

            if (unidades > stockDisponible) {
                $('#mensajeErrorDatos').show(); // Mostrar mensaje de error
                mensajeError(`⚠️ No puedes registrar una salida de ${unidades} unidades, solo hay ${stockDisponible} en stock.`);

                return;
            }
            console.log("Se presionó Agregar Salida");
            await agregarSalidan(idProducto, unidades);
        }
        actualizarTabla(); // Refresca la tabla correctamente
        $('#modalEntradaSalida').modal('hide');
    });



});
