import {supabase} from '../supabase/supabaseCliente.js';


//CRUD PARA LA TABLA CLIENTE
//CREATE
export async function agregarMovimiento(tipo ,id_producto, und_movimiento) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('movimiento_producto')
        .insert([{ tipo, id_producto, und_movimiento }])
        .select('*');
    if (error) {
        console.error('Error al agregar Movimiento:', error);
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
export async function obtenerMovimiento(tipoMovimiento, tipoProducto) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('movimiento_producto')
        .select(`
            *,
            producto:producto!inner (
                id_producto,
                nombre_producto,
                tipo
            )
        `)
        .eq('tipo', tipoMovimiento)      
        .eq('producto.tipo', tipoProducto)
        .order('fecha_movimiento', { ascending: false })
        .limit(500);

    if (error) {
        console.error('Error al obtener movimientos:', error);
        return { success: false, error };
    }

    return data;
}

//UPDATE
export async function actualizarMovimiento(id_movimiento, nuevoProducto, nuevasUnidades) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('movimiento_producto')
        .update({ id_producto: nuevoProducto, und_movimiento: nuevasUnidades })
        .eq('id_movimiento', id_movimiento)
        .select('*');

    if (error) {
        console.error('Error al actualizar Movimiento:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
//DELETE
export async function eliminarMovimiento(id_movimiento) {
    const { error } = await supabase
    .schema('inventario')    
    .from('movimiento_producto')
        .delete()
        .eq('id_movimiento', id_movimiento);

    if (error) {
        console.error('Error al eliminar Movimiento:', error);
        return { success: false, error };
    }
    return { success: true };
}