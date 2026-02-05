//CRUD PARA LA TABLA DETALLE PEDIDO
//CREATE
export async function agregarDetallePedido(id_pedido, id_producto, cantidad, relleno, mensaje, observaciones, tipoTorta) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('detalle_pedido')
        .insert([{ id_pedido, id_producto, cantidad, relleno, mensaje, observaciones, tipoTorta }])
        .select('*');
    if (error) {
        console.error('Error al agregar detalle Pedido:', error);
        return { success: false, error };
    }
    if (data && data.length > 0) {
        return { success: true, data: data[0] };
    } else {
        console.error('No se recibió ningún dato después de la inserción.');
        return { success: false, data: null };
    }
}
//READ
export async function obtenerDetallePedido(id_pedido) {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('detalle_pedido') // Reemplaza con tu tabla o vista real
    .select('*, producto!inner(nombre_producto,und_producto)')
    .eq('id_pedido', id_pedido);
    if (error) {
        console.error('Error al obtener detalle pedido pedido:', error);
        return { success: false, error };
    }
    return data;
}
//UPDATE

//DELETE