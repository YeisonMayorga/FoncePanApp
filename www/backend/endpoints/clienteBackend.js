import {supabase} from '../supabase/supabaseCliente.js';

//CRUD PARA LA TABLA CLIENTE
//CREATE
export async function agregarCliente(nombre, tipo_documento, documento, telefono, direccion) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('cliente')
        .insert([{ nombre, tipo_documento, documento, telefono, direccion  }])
        .select('*');
    if (error) {
        console.error('Error al agregar Cliente:', error);
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
export async function obtenerClientes() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('cliente') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('nombre', { ascending: true });
    if (error) {
        console.error('Error al obtener Clientes:', error);
        return { success: false, error };
    }
    return data;
}
//UPDATE
export async function actualizarCliente(id_cliente, nuevoNombre, nuevoTipoDocumento, nuevoDocumento, nuevoTelefono, nuevaDireccion) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('cliente')
        .update({ nombre: nuevoNombre, tipo_documento: nuevoTipoDocumento, documento: nuevoDocumento, telefono: nuevoTelefono, direccion: nuevaDireccion })
        .eq('id_cliente', id_cliente)
        .select('*');

    if (error) {
        console.error('Error al actualizar Cliente:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
//DELETE
export async function eliminarCliente(id_cliente) {
    const { error } = await supabase
    .schema('inventario')    
    .from('cliente')
        .delete()
        .eq('id_cliente', id_cliente);

    if (error) {
        console.error('Error al eliminar Cliente:', error);
        return { success: false, error };
    }
    return { success: true };
}