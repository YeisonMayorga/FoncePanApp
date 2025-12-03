import {supabase} from '../supabase/supabaseCliente.js';

//CRUD PARA LA TABLA CLIENTE
//CREATE
export async function agregarProducto(nombre_producto, und_producto, tipo) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('producto')
        .insert([{ nombre_producto, und_producto, tipo }])
        .select('*');
    if (error) {
        console.error('Error al agregar Producto:', error);
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
export async function obtenerProductosActivos(tipo) {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('producto') // Reemplaza con tu tabla o vista real
    .select('*')
    .eq('activo', true)
    .eq('tipo', tipo)
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener Productos:', error);
        return { success: false, error };
    }
    return data;
}
export async function obtenerProductosActivosExistentes(tipo) {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('producto') // Reemplaza con tu tabla o vista real
    .select('*')
    .eq('activo', true)
    .eq('tipo', tipo)
    .gte('und_producto', 1)
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener Productos:', error);
        return { success: false, error };
    }
    return data;
}
export async function obtenerProductos(tipo) {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('producto') // Reemplaza con tu tabla o vista real
    .select('*')
    .eq('tipo', tipo)
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener Productos:', error);
        return { success: false, error };
    }
    return data;
}
export async function obtenerStockProducto(idProducto) {
    try {
        const { data, error } = await supabase
            .schema('inventario')
            .from('producto')
            .select('und_producto')
            .eq('id_producto', idProducto)
            .single();

        if (error) {
            console.error("Error al obtener el stock:", error);
            return 0;
        }

        return data.und_producto;
    } catch (err) {
        console.error("Error en la solicitud:", err);
        return 0;
    }
}
//UPDATE
export async function actualizarProducto(id_producto, nuevoNombre, nuevasUnidades) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('producto')
        .update({ nombre_producto: nuevoNombre, und_producto: nuevasUnidades })
        .eq('id_producto', id_producto)
        .select('*');

    if (error) {
        console.error('Error al actualizar Producto:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
export async function actualizarProductoActivo(id_producto, nuevoActivo) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('producto')
        .update({ activo: nuevoActivo })
        .eq('id_producto', id_producto)
        .select('*');

    if (error) {
        console.error('Error al actualizar visibilidad del Producto:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
//DELETE
export async function eliminarProducto(id_producto) {
    const { error } = await supabase
    .schema('inventario')    
    .from('producto')
        .delete()
        .eq('id_producto', id_producto);

    if (error) {
        console.error('Error al eliminar Producto:', error);
        return { success: false, error };
    }
    return { success: true };
}