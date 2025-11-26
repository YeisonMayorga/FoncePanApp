import { obtenerProductosnTrue1, obtenerProductosnTrue2, obtenerProductosnTrue3, obtenerProductosnEstado, actualizarProductonTrue } from './app.js';
let tablaActivos1, tablaModificar;
let productosEstado = [];

async function cargarTablasProductosActivos() {
    try {
    const [productosDisponibles1, productosDisponibles2, productosDisponibles3] = await Promise.all([
        obtenerProductosnTrue1(),
        obtenerProductosnTrue2(),
        obtenerProductosnTrue3()
    ]);

    const cuerpo1 = $('#tablaActivos1 tbody').empty();
    const cuerpo2 = $('#tablaActivos2 tbody').empty();
    const cuerpo3 = $('#tablaActivos3 tbody').empty();

    const renderFila = (p) => `
        <tr>
        <td>${p.nombre_producto}</td>
        <td>${p.provedor_producto}</td>
        <td>${p.nombre_um}</td>
        <td>
            <input type="number" class="form-control form-control-sm cantidad-solicitada" data-id="${p.id_producto}" min="0" value="0">
        </td>
        </tr>
    `;

    productosDisponibles1.forEach(p => cuerpo1.append(renderFila(p)));
    productosDisponibles2.forEach(p => cuerpo2.append(renderFila(p)));
    productosDisponibles3.forEach(p => cuerpo3.append(renderFila(p)));

    } catch (error) {
    console.error("Error cargando productos activos:", error);
    alert("Hubo un error al cargar los productos.");
    }
}

$(document).ready(async () => {
    cargarTablasProductosActivos();
});

async function cargarProductosEstado() {
    productosEstado = await obtenerProductosnEstado();
    tablaModificar.clear();

    productosEstado.forEach(prod => {
    tablaModificar.row.add([
        prod.nombre_producto,
        prod.provedor_producto,
        prod.nombre_um,
        `<input type="checkbox" class="form-check-input toggle-estado" data-id="${prod.id_producto}" ${prod.activo ? 'checked' : ''}>`,
        `<input 
            type="number" 
            class="form-control tipo-producto" 
            data-id="${prod.id_producto}" 
            min="1" 
            max="3" 
            step="1" 
            value="${prod.tipo}" 
            oninput="this.value = (this.value > 3 ? 3 : (this.value < 1 ? 1 : this.value))">`
    ]);
    });

    tablaModificar.draw();
}

$(document).ready(function () {

    tablaModificar = $('#tablaModificar').DataTable({
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
    order: [[0, 'asc']],
    columnDefs: [
        { targets: 3, orderable: false }
    ]
    });

    $('#btnModificar').click(async () => {
    await cargarProductosEstado();
    const modal = new bootstrap.Modal(document.getElementById('modalModificar'));
    modal.show();
    });

    $('#btnActualizar').click(async () => {
        const cambios = [];
        const tabla = $('#tablaModificar').DataTable();

        // Recorre todas las filas del DataTable, incluso las no visibles por paginación
        tabla.rows().every(function () {
        const row = this.node(); // Nodo DOM de la fila
        const checkbox = $(row).find('input.toggle-estado');
        const tipoInput = $(row).find('.tipo-producto');

        const id = checkbox.data('id');
        const activo = checkbox.is(':checked');
        const tipo = parseInt(tipoInput.val());

        const original = productosEstado.find(p => p.id_producto === id);
        if (original && (original.activo !== activo || original.tipo !== tipo)) {
            cambios.push({ id, activo, tipo });
        }
        });

        // Actualizar todos los productos en paralelo
        await Promise.all(cambios.map(c => actualizarProductonTrue(c.id, c.activo, c.tipo)));

        // Recargar tablas y cerrar el modal
        await cargarTablasProductosActivos();
        bootstrap.Modal.getInstance(document.getElementById('modalModificar')).hide();
    });   
});