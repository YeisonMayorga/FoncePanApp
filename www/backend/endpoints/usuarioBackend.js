import {supabase} from '../supabase/supabaseCliente.js';

//CRUD PARA LA TABLA USUARIO
//CREATE
export async function agregarUsuario(username, nombre_usuario, id_rol, id_sucursal) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('usuarios')
        .insert([{ username, nombre_usuario, id_rol, id_sucursal  }])
        .select('*');
    if (error) {
        console.error('Error al agregar Usuario:', error);
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
export async function obtenerUsuarios() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('usuarios') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('username', { ascending: true });
    if (error) {
        console.error('Error al obtener Usuarios:', error);
        return { success: false, error };
    }
    return data;
}
//UPDATE
export async function actualizarUsuario(id, nuevoUsername, nuevoNombre, nuevoRol, nuevaSucursal) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('usuarios')
        .update({username: nuevoUsername, nombre_usuario: nuevoNombre, id_rol: nuevoRol, id_sucursal: nuevaSucursal })
        .eq('id', id)
        .select('*');

    if (error) {
        console.error('Error al actualizar Usuario:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
//DELETE
export async function eliminarUsuario(id) {
    const { error } = await supabase
    .schema('inventario')    
    .from('usuarios')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error al eliminar Usuario:', error);
        return { success: false, error };
    }
    return { success: true };
}