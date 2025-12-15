import {supabase} from '../supabase/supabaseCliente.js';
//CRUD PARA LA TABLA ROL
//CREATE
//READ
export async function obtenerRoles() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('rol') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('nombre_rol', { ascending: true });
    if (error) {
        console.error('Error al obtener Usuarios:', error);
        return { success: false, error };
    }
    return data;
}
//UPDATE
//DELETE