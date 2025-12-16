import { obtenerRoles } from '../backend/endpoints/rolBackend.js';
import { obtenerSucursales } from '../backend/endpoints/sucursalBackend.js';
import { actualizarUsuario, agregarUsuario, eliminarUsuario, obtenerUsuarios } from '../backend/endpoints/usuarioBackend.js';
import { supabase } from '../backend/supabase/supabaseCliente.js';

let usuariosGlobal = []; // Declara variable para guardar datos de los productos

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

    // Lógica para mostrar/ocultar sucursal
    function toggleSucursal() {
        const rol = $('#umSelect').val();
        if (rol == 2) { // Asumiendo que 2 es el ID del rol Sucursal
            $('#containerSucursal').show();
            $('#sucursalSelect').attr('required', true);
        } else {
            $('#containerSucursal').hide();
            $('#sucursalSelect').attr('required', false);
            $('#sucursalSelect').val('').trigger('change');
        }
    }

    $('#umSelect').on('change', toggleSucursal);
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
        { data: 'email', title: 'Email' },
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
            let usuarios = await obtenerUsuarios();
            callback({ data: usuarios });
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
        const usuarios = await obtenerUsuarios(); // Obtiene los datos nuevos

        table.clear().rows.add(usuarios).draw(); // Actualiza los datos
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
        $('#umSelect').val('').trigger('change'); // Resetea select2 y dispara el evento para ocultar sucursal
        $('#sucursalSelect').val('').trigger('change');
        $('#password').attr('required', true); // Contraseña requerida al agregar
        // Mostrar el modal 
        $('#modalFormulario').modal('show');
    });

    // Toggle de visibilidad de contraseña
    $('#togglePassword').on('click', function () {
        const passwordInput = $('#password');
        const icon = $(this).find('i');

        if (passwordInput.attr('type') === 'password') {
            passwordInput.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            passwordInput.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });

    $('#tablaProductos tbody').on('click', '.btnEditar', async function () {
        $('#formulario')[0].reset();
        modo = "editar";  // Cambiamos el modo a "editar"
        idProductoEditar = $(this).data('id');  // Guardamos el ID del producto a editar
        usuariosGlobal = await obtenerUsuarios();
        console.log('usuario a editar', idProductoEditar)
        let usuarios = usuariosGlobal.find(p => p.id == idProductoEditar);
        console.log(usuarios)
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
        const username = usuarios.email.replace('@foncepan.com', '');
        $("#username").val(username);
        $("#nombre").val(usuarios.nombre_usuario);
        $("#umSelect").val(usuarios.id_rol).trigger('change'); // trigger change para select2 y actualiza visibilidad

        // Esperamos un momento para que se procese el cambio de visibilidad antes de setear el valor
        setTimeout(() => {
            if (usuarios.id_rol == 2) {
                $("#sucursalSelect").val(usuarios.id_sucursal).trigger('change');
            }
        }, 100);

        $("#password").val(''); // No mostramos el password por seguridad, o lo dejamos vacío para no editarlo

        $('#password').attr('required', false); // Contraseña opcional al editar
        $('#modalFormulario').modal('show');
    });

    $('#formulario').off('submit').on('submit', async function (e) {
        e.preventDefault();
        const username = $('#username').val();
        const email = `${username}@foncepan.com`;
        const nombre = $('#nombre').val();
        const um = $('#umSelect').val();
        // Si no es sucursal, el valor será null/vacío, lo cual está bien si la DB lo admite o si backend lo maneja.
        // Aseguramos que si no está visible, mandamos null
        const sucursal = (um == 2) ? $('#sucursalSelect').val() : null;

        const password = $('#password').val();

        // Validar contraseña
        if (modo === "agregar") {
            if (!password || password.length < 6) {
                alert("La contraseña es obligatoria y debe tener al menos 6 caracteres.");
                return;
            }
        } else if (modo === "editar") {
            if (password && password.length < 6) {
                alert("Si va a cambiar la contraseña, debe tener al menos 6 caracteres.");
                return;
            }
        }

        if (modo === "agregar") {
            await agregarUsuario(username, nombre, um, sucursal, password);
        } else if (modo === "editar" && idProductoEditar !== null) {
            await actualizarUsuario(idProductoEditar, email, nombre, um, sucursal, password);
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
