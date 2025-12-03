import {supabase} from '../supabase/supabaseCliente.js';
//CRUD PARA LA TABLA CLIENTE
//CREATE
//READ
//UPDATE
//DELETE
export async function eliminarDespacho(id_despacho) {
    const { error } = await supabase
    .schema('inventario')    
    .from('despachos')
        .delete()
        .eq('id_despacho', id_despacho);

    if (error) {
        console.error('Error al eliminar Despacho:', error);
        return { success: false, error };
    }
    return { success: true };
}