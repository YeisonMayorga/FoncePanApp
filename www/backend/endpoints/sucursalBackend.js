import {supabase} from '../supabase/supabaseCliente.js';
//CRUD PARA LA TABLA SUCURSAL
//CREATE
//READ
export async function obtenerSucursales() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('sucursal') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('nombre_sucursal', { ascending: true });
    if (error) {
        console.error('Error al obtener Sucursal:', error);
        return { success: false, error };
    }
    return data;
}
//UPDATE
//DELETE