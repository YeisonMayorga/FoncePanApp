import {obtenerProductos, agregarProducto, actualizarProducto, eliminarProducto, agregarEntrada, agregarSalida, supabase, obtenerStockProducto } from './app.js';

let productosGlobal = []; // Declara variable para guardar datos de los productos
const codigoCorrecto = "1234"; // Declara variable para guardar codigo correcto para derechos de admin

$(document).ready(async function () {
    let rolUsuario;
    checkAuthAndRole();
      const idRol = await checkAuthAndRole();

  if (!idRol) return; // Si no hay rol, ya se redirigió

  rolUsuario = idRol;
    $('#productoSelect').select2({
        placeholder: "Selecciona un producto",
        language: "es",
        dropdownParent: $('#modalEntradaSalida') // Esto es importante para modales
    });
    
    // Cargar productos
    
    //Función para cargar datos en la tabla

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
    { data: 'und_producto', title: 'Und' },
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
        productosGlobal = await obtenerProductos();
        callback({ data: productosGlobal });
    },

    columns: columnasTabla
    });
    //Función para actualizar datos de la tabla
    async function actualizarTabla() {
        const paginaActual = table.page(); // Guarda la página actual
        const productos = await obtenerProductos(); // Obtiene datos actualizados

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
            { event: '*', schema: 'inventario', table: 'productos' },
            (payload) => {
                console.log('Cambio detectado en productos:', payload);
                actualizarTabla(); // Refresca la tabla sin recargar la página
            }
        )
        .subscribe();


        let modo = "agregar";  // Variable para rastrear la acción (agregar o editar)
        let idProductoEditar = null;  // Guardará el ID del producto a editar
    //Función para abrir modal de agregar producto nuevo
    $('#btnAgregar').click(() => {
        modo = "agregar";  // Cambiamos el modo a "agregar"
        idProductoEditar = null; // No hay ID, ya que es un producto nuevo


        //$('#formularioVerificar')[0].reset(); // Limpiar los campos del formulario verificar
        //$('#modalVerificar').modal('show');  //Abre modal del formulario verificar
        $('#formulario')[0].reset(); // Limpia los campos del formulario para agregar/editar producto
        // Mostrar el modal 
        $('#modalFormulario').modal('show');





    });




    $('#tablaProductos tbody').on('click', '.btnEditar',async function () {
        $('#formulario')[0].reset();
        modo = "editar";  // Cambiamos el modo a "editar"
        idProductoEditar = $(this).data('id');  // Guardamos el ID del producto a editar
        productosGlobal = await obtenerProductos();
        let productos = productosGlobal.find(p => p.id_producto == idProductoEditar);
        console.log(productos)
        console.log("Editar producto con ID:", idProductoEditar); // Para verificar si se captura el ID
            // Llenar el formulario con los datos actuales

            $("#nombre").val(productos.nombre_producto);
            $("#und_producto").val(productos.und_producto);
            
        
       $('#modalFormulario').modal('show');
        // $('#modalVerificar').modal('show');
    


        
    

    });    
    $('#formulario').off('submit').on('submit', async function (e) {
            e.preventDefault();
        
            const nombre = $('#nombre').val();
            const unidades = $('#und_producto').val();
        
            if (modo === "agregar") {
                await agregarProducto(nombre, unidades);
            } else if (modo === "editar" && idProductoEditar !== null) {
                await actualizarProducto(idProductoEditar, nombre, unidades);
            }
        
            $('#modalFormulario').modal('hide');
            actualizarTabla(); // Refresca la tabla correctamente
    });

    $('#tablaProductos tbody').on('click', '.btnEliminar', function () {
        const id = $(this).data('id');
        console.log("Eliminar producto con ID:", id); // Para verificar si se captura el ID
    
        
        $('#modalConfirmarEliminar').modal('show');
        //$('#modalVerificar').modal('show');
    

    
        $('#btnConfirmarEliminar').off('click').on('click', async function () {
            await eliminarProducto(id);
            $('#modalConfirmarEliminar').modal('hide');
            actualizarTabla(); // Refresca la tabla correctamente
        });
    });

    

    $('#btnAgregarEntradaSalida').click(async function () {
        $('#formEntradaSalida')[0].reset(); // Limpiar los campos del formulario
        $('#modalEntradaSalida').modal('show');
        $('#mensajeErrorDatos').hide();
        const productos = await obtenerProductos();
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
       

        

    


});

$('#formEntradaSalida').submit(async function (event) {
    event.preventDefault(); // Evita el envío del formulario por defecto

    const idProducto = $('#productoSelect').val();
    const unidades = parseInt($('#cantidad').val(), 10);
    
    const botonPresionado = $(document.activeElement).attr('id'); // Obtiene el id del botón que se presionó
    const hoy = new Date().toISOString().split('T')[0];
    


    


    if (botonPresionado === "btnAgregarEntrada") {
        console.log("Se presionó Agregar Entrada");
        await agregarEntrada(idProducto, unidades);
    } else if (botonPresionado === "btnAgregarSalida") {

        const stockDisponible = await obtenerStockProducto(idProducto);
        console.log(stockDisponible);

        if (unidades > stockDisponible) {
            $('#mensajeErrorDatos').show(); // Mostrar mensaje de error
            mensajeError(`⚠️ No puedes registrar una salida de ${unidades} unidades, solo hay ${stockDisponible} en stock.`);

            return;
        }
        console.log("Se presionó Agregar Salida");
        await agregarSalida(idProducto, unidades);
    }

    actualizarTabla(); // Refresca la tabla correctamente
    $('#modalEntradaSalida').modal('hide');
});



});
