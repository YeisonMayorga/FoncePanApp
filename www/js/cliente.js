import {agregarCliente, obtenerClientes, actualizarCliente, eliminarCliente} from '../backend/endpoints/clienteBackend.js';
import {supabase} from '../backend/supabase/supabaseCliente.js';

let clientesGlobal = []; // Declara variable para guardar datos de los Clientes
$(document).ready(async function () {
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

    const columnasTabla = [
        { data: 'nombre', title: 'Nombre' },
        { data: 'tipo_documento', title: 'Tipo Documento' },
        { data: 'documento', title: 'Documento' },
        { data: 'telefono', title: 'Telefono' },
        { data: 'direccion', title: 'Dirección' },
    ];

    // Si el rol permite, se agrega la columna de acciones
    if (mostrarAcciones) {
        columnasTabla.push({
            data: null,
            title: 'Acciones',
            render: function (data, type, row) {
            return `
                <button class='btn btn-warning btnEditar' data-id='${row.id_cliente}'>Editar</button>
                <button class='btn btn-danger btnEliminar' data-id='${row.id_cliente}'>Eliminar</button>
            `;
            }
        });
    }

    const table = $('#tablaClientes').DataTable({
        autoWidth: false,
        responsive: true,
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

        ajax: async function (data, callback) {
            clientesGlobal = await obtenerClientes();
            callback({ data: clientesGlobal });
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
        const clientes = await obtenerClientes(); // Obtiene datos actualizados

        table.clear().rows.add(clientes).draw(); // Actualiza los datos
        table.page(paginaActual).draw(false);     // 🔄 Vuelve a la misma página
    }
    //Algoritmo para actualizar en tiempo real los datos en todos los dispositivos
    console.log('Iniciando suscripción a productos_updates...');
    supabase
    .channel('clientes_updates') // Nombre del canal, puede ser cualquier string
    .on(
        'postgres_changes',
        { event: '*', schema: 'inventario', table: 'cliente' },
        (payload) => {
            console.log('Cambio detectado en cliente:', payload);
            actualizarTabla(); // Refresca la tabla sin recargar la página
        }
    )
    .subscribe();

    let modo = "agregar";  // Variable para rastrear la acción (agregar o editar)
    let idClienteEditar = null;  // Guardará el ID del producto a editar

    //Función para abrir modal de agregar producto nuevo
    $('#btnAgregar').click(() => {
        modo = "agregar";  // Cambiamos el modo a "agregar"
        idClienteEditar = null; // No hay ID, ya que es un cliente nuevo

        $('#formulario')[0].reset(); // Limpia los campos del formulario para agregar/editar producto
        // Mostrar el modal 
        $('#modalFormulario').modal('show');
    });

    $('#tablaClientes tbody').on('click', '.btnEditar',async function () {
        $('#formulario')[0].reset();
        modo = "editar";  // Cambiamos el modo a "editar"
        idClienteEditar = $(this).data('id');  // Guardamos el ID del producto a editar
        clientesGlobal = await obtenerClientes();
        let clientes = clientesGlobal.find(c => c.id_cliente == idClienteEditar);
        console.log(clientes)
        console.log("Editar Cliente con ID:", idClienteEditar); // Para verificar si se captura el ID
        // Llenar el formulario con los datos actuales
        $("#nombre").val(clientes.nombre);
        $("#tipoDocumento").val(clientes.tipo_documento);
        $("#documento").val(clientes.documento);
        $("#telefono").val(clientes.telefono);
        $("#direccion").val(clientes.direccion);
        $('#modalFormulario').modal('show');
    });    

    $('#formulario').off('submit').on('submit', async function (e) {
        e.preventDefault();
        
        const nombre = $('#nombre').val();
        const tipoDocumento = $('#tipoDocumento').val();
        const documento = $('#documento').val();
        const telefono = $('#telefono').val();
        const direccion = $('#direccion').val();
        
        if (modo === "agregar") {
            await agregarCliente(nombre, tipoDocumento, documento, telefono, direccion);
        } else if (modo === "editar" && idClienteEditar !== null) {
            await actualizarCliente(idClienteEditar, nombre, tipoDocumento, documento, telefono, direccion);
        }
        
        $('#modalFormulario').modal('hide');
        actualizarTabla(); // Refresca la tabla correctamente
    });

    $('#tablaClientes tbody').on('click', '.btnEliminar', function () {
        const id = $(this).data('id');
        console.log("Eliminar Cliente con ID:", id); // Para verificar si se captura el ID
    
        $('#modalConfirmarEliminar').modal('show');
        
        $('#btnConfirmarEliminar').off('click').on('click', async function () {
            await eliminarCliente(id);
            $('#modalConfirmarEliminar').modal('hide');
            actualizarTabla(); // Refresca la tabla correctamente
        });
    });
});