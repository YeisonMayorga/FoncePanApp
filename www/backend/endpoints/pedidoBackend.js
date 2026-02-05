import {supabase} from '../supabase/supabaseCliente.js';

//CRUD PARA LA TABLA PEDIDO
//CREATE
export async function agregarPedido(fecha_entrega, id_cliente, id_sucursal_solicitud, id_sucursal_entrega, estado, saldo, abono, total, medioDePago, tipoEntrega, direccion) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('pedido')
        .insert([{ fecha_entrega, id_cliente, id_sucursal_solicitud, id_sucursal_entrega, estado, saldo, abono, total, medioDePago, tipoEntrega, direccion }])
        .select('*');
    if (error) {
        console.error('Error al agregar Pedido:', error);
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
export async function obtenerPedidoAdmin() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_pedido_admin') // Reemplaza con tu tabla o vista real
    .select('*');
    if (error) {
        console.error('Error al obtener pedido:', error);
        return { success: false, error };
    }
    return data;
}
export async function obtenerPedidoSucursal() {
  const { data: { session } } = await supabase.auth.getSession();
  const idUsuario = session?.user?.id;

  const { data: usuario } = await supabase
    .schema('inventario')
    .from('usuarios')
    .select('id_sucursal')
    .eq('id', idUsuario)
    .single();

  const { data, error } = await supabase
    .schema('inventario')
    .from('vista_pedido_sucursal')
    .select('*')
    .eq('id_sucursal', usuario.id_sucursal);

  if (error) {
    console.error('Error al obtener pedido sucursal:', error);
    return [];
  }
  return data;
}
//UPDATE
export async function actualizarEstadoPedido(id_pedido, nuevoEstado) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('pedido')
        .update({ estado: nuevoEstado })
        .eq('id_pedido', id_pedido)
        .select('*');

    if (error) {
        console.error('Error al actualizar Estado de Pedido:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
export async function actualizarAbono(id_pedido, nuevoAbono) {
    //Consultar valor de abono para sumarle el nuevo
    const { data, error } = await supabase
    .schema('inventario')
        .from('pedido')
        .update({ estado: nuevoEstado })
        .eq('id_pedido', id_pedido)
        .select('*');

    if (error) {
        console.error('Error al actualizar Estado de Pedido:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
//DELETE
export async function eliminarPedido(id_pedido) {
    const { error } = await supabase
    .schema('inventario')    
    .from('pedido')
        .delete()
        .eq('id_pedido', id_pedido);

    if (error) {
        console.error('Error al eliminar Pedido:', error);
        return { success: false, error };
    }
    return { success: true };
}