import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://gcfyookdsujabsfektuo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZnlvb2tkc3VqYWJzZmVrdHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwMzU1NTAsImV4cCI6MjA1NDYxMTU1MH0.Ha3fFLAIK_WrHAqFgrv_ooDoVUTOrfp8asT9yWEbXfo';
export const supabase = createClient(supabaseUrl, supabaseKey)  
console.log('Supabase conectado:', supabase);
//inventario frio
//funcion para obtener vistas
//


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

export async function obtenerSalidas() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_salidasprueba') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('fecha_salida', { ascending: false });
    if (error) {
        console.error('Error al obtener salidas:', error);
        return { success: false, error };
    }
    return data;
}


export async function obtenerProductos() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('productos') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener productos:', error);
        return { success: false, error };
    }
    return data;
}
export async function obtenerProductosUnd() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('productos') // Reemplaza con tu tabla o vista real
    .select('*')
    .gte('und_producto', 1) // Filtra donde stock >= 1
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener productos:', error);
        return { success: false, error };
    }
    return data;
}
export async function obtenerProductosConUmbrales() {
    const { data, error } = await supabase
        .schema('inventario')
        .from('productosn')
        .select(`
            id_producto, nombre_producto, und_producto,
            umbrales (umbral_rojo, umbral_naranja)
        `);

    if (error) {
        console.error("Error obteniendo productos:", error);
        return [];
    }

    return data;
}

//insertar datos
//insertar entradas

export async function agregarEntrada(id_producto,und_entrada ) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('entradas')
        .insert([{ id_producto, und_entrada }])
        .select('*');


    if (error) {
        console.error('Error al agregar entrada:', error);
        return { success: false, error };
    }
    if (data && data.length > 0) {
        return { success: true, data: data[0] };
    } else {
        console.error('No se recibió ningún dato después de la inserción.');
        return { success: false, data: null };
    }

}

//insertar salidas

export async function agregarSalida(id_producto, und_salida) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('salidas')
        .insert([{ id_producto, und_salida }])
        .select('*');
    if (error) {
        console.error('Error al agregar salida:', error);
        return { success: false, error };
    }
    if (data && data.length > 0) {
        return { success: true, data: data[0] };
    } else {
        console.error('No se recibió ningún dato después de la inserción.');
        return { success: false, data: null };
    }

}
export async function agregarProducto(nombre_producto, und_producto) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('productos')
        .insert([{ nombre_producto, und_producto }])
        .select('*');
    if (error) {
        console.error('Error al agregar productos:', error);
        return { success: false, error };
    }
    if (data && data.length > 0) {
        return { success: true, data: data[0] };
    } else {
        console.error('No se recibió ningún dato después de la inserción.');
        return { success: false, data: null };
    }

}
//actualizar datos
//




// Actualizar datos
export async function actualizarProducto(id_producto, nuevoNombre, nuevasUnidades) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('productos')
        .update({ nombre_producto: nuevoNombre, und_producto: nuevasUnidades })
        .eq('id_producto', id_producto)
        .select('*');

    if (error) {
        console.error('Error al actualizar producto:', error);
        return { success: false, error };
    }
    return { success: true, data };
}

export async function actualizarEntrada(id_entrada, nuevoProducto, nuevasUnidades) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('entradas')
        .update({ id_producto: nuevoProducto, und_entrada: nuevasUnidades})
        .eq('id_entrada', id_entrada)
        .select('*');

    if (error) {
        console.error('Error al actualizar entrada:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
export async function actualizarSalida(id_salida, nuevoProducto, nuevasUnidades) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('salidas')
        .update({ id_producto: nuevoProducto, und_salida: nuevasUnidades})
        .eq('id_salida', id_salida)
        .select('*');

    if (error) {
        console.error('Error al actualizar entrada:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
// Eliminar datos
export async function eliminarProducto(id_producto) {
    const { error } = await supabase
    .schema('inventario')    
    .from('productos')
        .delete()
        .eq('id_producto', id_producto);

    if (error) {
        console.error('Error al eliminar producto:', error);
        return { success: false, error };
    }
    return { success: true };
}

export async function eliminarEntrada(id_entrada) {
    const { error } = await supabase
    .schema('inventario')    
    .from('entradas')
        .delete()
        .eq('id_entrada', id_entrada);

    if (error) {
        console.error('Error al eliminar entrada:', error);
        return { success: false, error };
    }
    return { success: true };
}

export async function eliminarSalida(id_salida) {
    const { error } = await supabase
    .schema('inventario')    
    .from('salidas')
        .delete()
        .eq('id_salida', id_salida);

    if (error) {
        console.error('Error al eliminar salida:', error);
        return { success: false, error };
    }
    return { success: true };
}


//estoy probrando
// Obtener entradas/salidas
export async function obtenerStockProducto(idProducto) {
    try {
        const { data, error } = await supabase
            .schema('inventario')
            .from('productos')
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


//Inventarioo normaaaaal
//
//
//
//

export async function obtenerEntradasn() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_entradasn') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('id_entrada', { ascending: true });
    if (error) {
        console.error('Error al obtener entradas:', error);
        return { success: false, error };
    }
    return data;
}

export async function obtenerSalidasn() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_salidasn') // Reemplaza con tu tabla o vista real
    .select('*', { head: false })
    .order('id_salida', { ascending: true })
    .range(0, 9999); // Devuelve hasta 10,000 filas
    if (error) {
        console.error('Error al obtener salidas:', error);
        return { success: false, error };
    }
    return data; 
}


export async function obtenerProductosn() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_productosn') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener productos:', error);
        return { success: false, error };
    }
    return data;
}
export async function obtenerUm() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('unidad_medida') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('nombre_um', { ascending: true });
    if (error) {
        console.error('Error al obtener productos:', error);
        return { success: false, error };
    }
    return data;
}
export async function obtenerProductosUndn() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_productosn') // Reemplaza con tu tabla o vista real
    .select('*')
    .gte('und_producto', 1) // Filtra donde stock >= 1
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener productos:', error);
        return { success: false, error };
    }
    return data;
}
//insertar datos
//insertar entradas

export async function agregarEntradan(id_producto,und_entrada ) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('entradasn')
        .insert([{ id_producto, und_entrada }])
        .select('*');


    if (error) {
        console.error('Error al agregar entrada:', error);
        return { success: false, error };
    }
    if (data && data.length > 0) {
        return { success: true, data: data[0] };
    } else {
        console.error('No se recibió ningún dato después de la inserción.');
        return { success: false, data: null };
    }

}

//insertar salidas

export async function agregarSalidan(id_producto, und_salida) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('salidasn')
        .insert([{ id_producto, und_salida }])
        .select('*');
    if (error) {
        console.error('Error al agregar salida:', error);
        return { success: false, error };
    }
    if (data && data.length > 0) {
        return { success: true, data: data[0] };
    } else {
        console.error('No se recibió ningún dato después de la inserción.');
        return { success: false, data: null };
    }

}
export async function agregarProducton(nombre_producto, provedor_producto, id_um, und_producto) {
    const { data, error } = await supabase
        .schema('inventario')
        .from('productosn')
        .insert([{ nombre_producto, provedor_producto, id_um, und_producto }])
        .select('*');
    if (error) {
        console.error('Error al agregar productos:', error);
        return { success: false, error };
    }
    if (data && data.length > 0) {
        return { success: true, data: data[0] };
    } else {
        console.error('No se recibió ningún dato después de la inserción.');
        return { success: false, data: null };
    }

}
//actualizar datos
//




// Actualizar datos
export async function actualizarProducton(id_producto, nuevoNombre, nuevoProvedor, nuevoIdUm, nuevasUnidades,) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('productosn')
        .update({ nombre_producto: nuevoNombre, provedor_producto: nuevoProvedor, id_um: nuevoIdUm, und_producto: nuevasUnidades })
        .eq('id_producto', id_producto)
        .select('*');

    if (error) {
        console.error('Error al actualizar producto:', error);
        return { success: false, error };
    }
    return { success: true, data };
}

export async function actualizarEntradan(id_entrada, nuevoProducto, nuevasUnidades) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('entradasn')
        .update({ id_producto: nuevoProducto, und_entrada: nuevasUnidades})
        .eq('id_entrada', id_entrada)
        .select('*');

    if (error) {
        console.error('Error al actualizar entrada:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
export async function actualizarSalidan(id_salida, nuevoProducto, nuevasUnidades) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('salidasn')
        .update({ id_producto: nuevoProducto, und_salida: nuevasUnidades})
        .eq('id_salida', id_salida)
        .select('*');

    if (error) {
        console.error('Error al actualizar entrada:', error);
        return { success: false, error };
    }
    return { success: true, data };
}
// Eliminar datos
export async function eliminarProducton(id_producto) {
    const { error } = await supabase
    .schema('inventario')    
    .from('productosn')
        .delete()
        .eq('id_producto', id_producto);

    if (error) {
        console.error('Error al eliminar producto:', error);
        return { success: false, error };
    }
    return { success: true };
}

export async function eliminarEntradan(id_entrada) {
    const { error } = await supabase
    .schema('inventario')    
    .from('entradasn')
        .delete()
        .eq('id_entrada', id_entrada);

    if (error) {
        console.error('Error al eliminar entrada:', error);
        return { success: false, error };
    }
    return { success: true };
}

export async function eliminarSalidan(id_salida) {
    const { error } = await supabase
    .schema('inventario')    
    .from('salidasn')
        .delete()
        .eq('id_salida', id_salida);

    if (error) {
        console.error('Error al eliminar salida:', error);
        return { success: false, error };
    }
    return { success: true };
}


//estoy probrando
// Obtener entradas/salidas
export async function obtenerStockProducton(idProducto) {
    try {
        const { data, error } = await supabase
                .schema('inventario')
            .from('productosn')
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
// Despachos
//
//
//
//
//
//
//
//

//Obtener productosn con estado actvio o inactivo
export async function obtenerProductosnEstado() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_productosntrue') // Reemplaza con tu tabla o vista real
    .select('*')
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener productos true:', error);
        return { success: false, error };
    }
    return data;
}
//Obtener productos con estado activo
export async function obtenerProductosnTrue1() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_productosntrue') // Reemplaza con tu tabla o vista real
    .select('*')
    .eq('activo', true)
    .eq('tipo', 1)
    .gt('und_producto', 0) // Agregada la nueva condición
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener productos true:', error);
        return { success: false, error };
    }
    return data;
}
export async function obtenerProductosnTrue2() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_productosntrue') // Reemplaza con tu tabla o vista real
    .select('*')
    .eq('activo', true)
    .eq('tipo', 2)
    .gt('und_producto', 0) // Agregada la nueva condición
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener productos true:', error);
        return { success: false, error };
    }
    return data;
}
export async function obtenerProductosnTrue3() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('vista_productosntrue') // Reemplaza con tu tabla o vista real
    .select('*')
    .eq('activo', true)
    .eq('tipo', 3)
    .gt('und_producto', 0) // Agregada la nueva condición
    .order('nombre_producto', { ascending: true });
    if (error) {
        console.error('Error al obtener productos true:', error);
        return { success: false, error };
    }
    return data;
}
//Actualizar estado de los productosn
export async function actualizarProductonTrue(id_producto, newActivo, newTipo) {
    const { data, error } = await supabase
    .schema('inventario')
        .from('productosn')
        .update({ activo: newActivo, tipo: newTipo })
        .eq('id_producto', id_producto)
        .select('*');

    if (error) {
        console.error('Error al actualizar productonestado:', error);
        return { success: false, error };
    }
    return { success: true, data };
}

///
// Vista para el admin
export async function obtenerDespachosAdmin() {
  const { data, error } = await supabase
    .schema('inventario')
    .from('vista_despachos_admin')
    .select('*')
    .order('fecha_solicitud', { ascending: false });

  if (error) {
    console.error('Error al obtener despachos:', error);
    return [];
  }
  return data;
}

export async function obtenerDetalleDespacho(id_despacho, tipo) {
  const { data, error } = await supabase
    .schema('inventario')
    .from('detalle_despacho')
    .select('*, productosn!inner(nombre_producto,und_producto,unidad_medida(nombre_um),provedor_producto,tipo)')
    .eq('id_despacho', id_despacho)
    .eq('productosn.tipo', tipo);
    
  if (error) {
    console.error('Error al obtener detalle del despacho:', error);
    return [];
  }
  
  return data.map(item => ({
    ...item,
    nombre_producto: item.productosn.nombre_producto
  }));
}

export async function actualizarEstadoDespacho(id, cantidad_enviada = null, nuevoEstado = null) {
  if (cantidad_enviada !== null) {
    const { error } = await supabase
      .schema('inventario')
      .from('detalle_despacho')
      .update({ cantidad_enviada })
      .eq('id_detalle_despacho', id);
    if (error) console.error('Error al actualizar cantidad enviada:', error);
  }

  if (nuevoEstado) {
    const { error } = await supabase
      .schema('inventario')
      .from('despachos')
      .update({ estado: nuevoEstado })
      .eq('id_despacho', id);
    if (error) console.error('Error al actualizar estado del despacho:', error);
  }
}
// Vista para sucursal (filtra por la sucursal actual)
export async function obtenerDespachosSucursal() {
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
    .from('vista_despachos_sucursal')
    .select('*')
    .eq('id_sucursal', usuario.id_sucursal)
    .order('fecha_solicitud', { ascending: false });

  if (error) {
    console.error('Error al obtener despachos sucursal:', error);
    return [];
  }
  return data;
}

export async function confirmarRecepcion(id, cantidad_recibida = null, nuevoEstado = null) {
  if (cantidad_recibida !== null) {
    const { error } = await supabase
      .schema('inventario')
      .from('detalle_despacho')
      .update({ cantidad_recibida })
      .eq('id_detalle_despacho', id);
    if (error) console.error('Error al registrar recepción:', error);
  }

  if (nuevoEstado) {
    const { error } = await supabase
      .schema('inventario')
      .from('despachos')
      .update({ estado: nuevoEstado })
      .eq('id_despacho', id);
    if (error) console.error('Error al actualizar estado a recibido:', error);
  }
}
  function obtenerFechaHoraColombia() {
  const opciones = {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false // Cambia a true si prefieres formato 12h con AM/PM
  };

  const formato = new Intl.DateTimeFormat('es-CO', opciones);
  const fechaFormateada = formato.format(new Date());

  return fechaFormateada;
}
// Crear solicitud con productos
export async function crearDespachoConDetalles(productos) {
  const { data: { session } } = await supabase.auth.getSession();
  const idUsuario = session?.user?.id;

  const { data: usuario } = await supabase
    .schema('inventario')
    .from('usuarios')
    .select('id_sucursal')
    .eq('id', idUsuario)
    .single();
  const { data: despacho, error: errDespacho } = await supabase
    .schema('inventario')
    .from('despachos')
    .insert({ id_sucursal: usuario.id_sucursal})
    .select()
    .single();

  if (errDespacho) {
    console.error('Error creando despacho:', errDespacho);
    return false;
  }

  const detalles = productos.map(p => ({
    id_despacho: despacho.id_despacho,
    id_producto: p.id_producto,
    cantidad_solicitada: p.cantidad
  }));

  const { error: errDetalle } = await supabase
    .schema('inventario')
    .from('detalle_despacho')
    .insert(detalles);

  if (errDetalle) {
    console.error('Error insertando detalles:', errDetalle);
    return false;
  }

  return true;
}


// Obtener notificaciones para el usuario logueado
export async function obtenerNotificaciones() {
  const { data: { session } } = await supabase.auth.getSession();
  const idUsuario = session?.user?.id;

  const { data, error } = await supabase
    .schema('inventario')
    .from('notificaciones')
    .select('*')
    .eq('id_usuario_destino', idUsuario)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error al obtener notificaciones:', error);
    return [];
  }

  return data;
}

// Marcar una notificación como vista
export async function marcarNotificacionVista(idNotificacion) {
  const { error } = await supabase
    .schema('inventario')
    .from('notificaciones')
    .update({ visto: true })
    .eq('id_notificacion', idNotificacion);

  if (error) {
    console.error('Error al marcar notificación como vista:', error);
  }
}




export async function obtenerPrueba() {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('prueba') // Reemplaza con tu tabla o vista real
    .select('*');
    
    if (error) {
        console.error('Error al obtener pruebas:', error);
        return { success: false, error };
    }
    return data;
}

export async function obtenerEstadoDespacho(id) {
    const { data, error } = await supabase
    .schema('inventario')    
    .from('despachos') // Reemplaza con tu tabla o vista real
    .select('id_despacho,estado')
    .eq('id_despacho', id);
    
    if (error) {
        console.error('Error al obtener despachos:', error);
        return { success: false, error };
    }
    return data;
}