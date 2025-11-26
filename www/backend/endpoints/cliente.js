import {supabase} from '../supabase/supabaseCliente.js';

export async function obtenerEntradas() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_entradasprueba') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('fecha_entrada', { ascending: false });
    if (error) {
        console.error('Error al obtener entradas:', error);
        return { success: false, error };
    }
    return data;
}