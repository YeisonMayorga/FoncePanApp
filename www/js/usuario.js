import { obtenerRoles } from '../backend/endpoints/rolBackend.js';
import { obtenerSucursales } from '../backend/endpoints/sucursalBackend.js';
import { actualizarUsuario, agregarUsuario, eliminarUsuario, obtenerUsuarios } from '../backend/endpoints/usuarioBackend.js';
import {supabase} from '../backend/supabase/supabaseCliente.js';

let productosGlobal = []; // Declara variable para guardar datos de los productos

$(document).ready(async function () {
    // Evita que se muestre la página antes de tiempo
    document.body.classList.remove('loaded');

    let rolUsuario;
    checkAuthAndRole();
    const idRol = await checkAuthAndRole();
    if (!idRol) return; // Si no hay rol, ya se redirigió
    rolUsuario = idRol;
    //Función para cargar datos en la tabla
    // Umbrales iniciales (pueden ser editados por el usuario)
    $('#umSelect').select2({
        placeholder: "Selecciona un producto",
        language: "es",
        width: '100%',
        dropdownParent: $('#modalFormulario') // Esto es importante para modales
    });
    $('#sucursalSelect').select2({
        placeholder: "Selecciona un producto",
        language: "es",
        width: '100%',
        dropdownParent: $('#modalFormulario') // Esto es importante para modales
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
        { data: 'username', title: 'UserName' },
        { data: 'nombre_usuario', title: 'Nombre' },
        { data: 'id_rol', title: 'Rol' },
        { data: 'id_sucursal', title: 'Sucursal' },
        { data: 'activo', title: 'Activo' },
    ];

    // Si el rol permite, se agrega la columna de acciones
    if (mostrarAcciones) {
    columnasTabla.push({
        data: null,
        title: 'Acciones',
        render: function (data, type, row) {
        return `
            <button class='btn btn-warning btnEditar' data-id='${row.id}'>Editar</button>
            <button class='btn btn-danger btnEliminar' data-id='${row.id}'>Eliminar</button>
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
        order: [[0, 'asc']],
        ajax: async function (data, callback) {
            let productos = await obtenerUsuarios();
            callback({ data: productos });
            // 🟢 QUITAR LOADER CUANDO LA TABLA YA TIENE DATOS
            setTimeout(() => {
                document.body.classList.add('loaded');
            }, 300);             
        },
        columns: columnasTabla
    });
    //Función para actualizar datos de la tabla
    async function actualizarTabla() {
        const paginaActual = table.page(); // Guarda la página actual
        const productos = await obtenerUsuarios(); // Obtiene los datos nuevos

        table.clear().rows.add(productos).draw(); // Actualiza los datos
        table.page(paginaActual).draw(false);     // 🔄 Vuelve a la misma página
    }
    //Algoritmo para actualizar en tiempo real los datos en todos los dispositivos
    console.log('Iniciando suscripción a productos_updates...');

    supabase
    .channel('productos_updates') // Nombre del canal, puede ser cualquier string
    .on(
        'postgres_changes',
        { event: '*', schema: 'inventario', table: 'usuarios' },
        (payload) => {
            console.log('Cambio detectado en productos:', payload);
            actualizarTabla(); // Refresca la tabla sin recargar la página
        }
    )
    .subscribe();

        
    const um = await obtenerRoles();
    console.log("Roles obtenidos:", um); // Verificar que hay productos
    if (!um || um.length === 0) {
        console.error("No hay productos disponibles");
        $('#umSelect').html('<option value="">No hay productos disponibles</option>');
        return;
    }
    $('#umSelect').empty(); // Limpiar la lista antes de añadir opciones
    um.forEach(p => {
        $('#umSelect').append(`<option value="${p.id_rol}">${p.nombre_rol}</option>`);    
    });
    
    const sucursal = await obtenerSucursales();
    console.log("Sucursales obtenidos:", sucursal); // Verificar que hay productos
    if (!sucursal || sucursal.length === 0) {
        console.error("No hay productos disponibles");
        $('#sucursalSelect').html('<option value="">No hay productos disponibles</option>');
        return;
    }
    $('#sucursalSelect').empty(); // Limpiar la lista antes de añadir opciones
    sucursal.forEach(pa => {
        $('#sucursalSelect').append(`<option value="${pa.id_sucursal}">${pa.nombre_sucursal}</option>`);    
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
        productosGlobal = await obtenerUsuarios();
        console.log('usuario a editar', idProductoEditar)
        let productos = productosGlobal.find(p => p.id == idProductoEditar);
        console.log(productos)
        console.log("Editar producto con ID:", idProductoEditar); // Para verificar si se captura el ID
        // Llenar el formulario con los datos actuales
        const um = await obtenerRoles();
        console.log("Productos obtenidos:", um); // Verificar que hay productos
        
        if (!um || um.length === 0) {
            console.error("No hay productos disponibles");
            $('#umSelect').html('<option value="">No hay productos disponibles</option>');
            return;
        }
        
        $('#umSelect').empty(); // Limpiar la lista antes de añadir opciones
        um.forEach(p => {
            $('#umSelect').append(`<option value="${p.id_rol}">${p.nombre_rol}</option>`);    
        });

        const sucursal = await obtenerSucursales();
        console.log("Productos obtenidos:", sucursal); // Verificar que hay productos
        
        if (!sucursal || sucursal.length === 0) {
            console.error("No hay productos disponibles");
            $('#sucursalSelect').html('<option value="">No hay productos disponibles</option>');
            return;
        }
        
        $('#sucursalSelect').empty(); // Limpiar la lista antes de añadir opciones
        sucursal.forEach(pa => {
            $('#sucursalSelect').append(`<option value="${pa.id_sucursal}">${pa.nombre_sucursal}</option>`);    
        });
        
        $("#username").val(productos.username);
        $("#nombre").val(productos.nombre_usuario);
        $("#umSelect").val(um.nombre_rol);
        $("#sucursalSelect").val(sucursal.id_sucursal);
        $("#password").val(productos.username);
        $('#modalFormulario').modal('show');
    });

    $('#formulario').off('submit').on('submit', async function (e) {
        e.preventDefault();
        const username = $('#username').val();
        const nombre = $('#nombre').val();        
        const um = $('#umSelect').val();
        const sucursal = $('#sucursalSelect').val();
        const password = $('#password').val();
        if (modo === "agregar") {
            await agregarUsuario(username, nombre, um, sucursal);
        } else if (modo === "editar" && idProductoEditar !== null) {
            await actualizarUsuario(idProductoEditar, username, nombre, um, sucursal);
        }
        $('#modalFormulario').modal('hide');
        actualizarTabla(); // Refresca la tabla correctamente
    });
    
    $('#tablaProductos tbody').on('click', '.btnEliminar', function () {
        const id = $(this).data('id');
        console.log("Eliminar producto con ID:", id); // Para verificar si se captura el ID
        $('#modalConfirmarEliminar').modal('show');
        $('#btnConfirmarEliminar').off('click').on('click', async function () {
            await eliminarUsuario(id);
            $('#modalConfirmarEliminar').modal('hide');
            actualizarTabla(); // Refresca la tabla correctamente
        });
    });


});
