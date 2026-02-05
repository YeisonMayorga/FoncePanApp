import { supabase, supabaseUrl, supabaseKey } from '../supabase/supabaseCliente.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';

//CRUD PARA LA TABLA USUARIO

//CREATE
export async function agregarUsuario(username, nombre_usuario, id_rol, id_sucursal, password) {
    // 1. Crear usuario en Supabase Auth
    // Usamos un cliente temporal para no cerrar la sesión del administrador actual
    const tempSupabase = createClient(supabaseUrl, supabaseKey);
    const email = `${username}@foncepan.com`;

    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: email,
        password: password,
    });

    if (authError) {
        console.error('Error al crear usuario en Auth:', authError);
        return { success: false, error: authError };
    }

    const userId = authData.user.id;

    // 2. Crear usuario en la tabla inventario.usuarios
    const { data, error } = await supabase
        .schema('inventario')
        .from('usuarios')
        .insert([{
            id: userId, // Usamos el mismo ID que en Auth
            email,
            nombre_usuario,
            id_rol,
            id_sucursal
        }])
        .select('*');

    if (error) {
        console.error('Error al agregar Usuario en DB:', error);
        // Opcional: Podríamos intentar borrar el usuario de Auth si falla la DB, 
        // pero requiere permisos de admin que no tenemos con la clave anon.
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
        .from('usuarios')
        .select('*')
        .order('email', { ascending: true });
    if (error) {
        console.error('Error al obtener Usuarios:', error);
        return { success: false, error };
    }
    return data;
}

//UPDATE
export async function actualizarUsuario(
    id,
    nuevoUsername,
    nuevoNombre,
    nuevoRol,
    nuevaSucursal,
    nuevoPassword
) {

    // 1️⃣ Actualizar DB
    const { data, error } = await supabase
        .schema('inventario')
        .from('usuarios')
        .update({
            email: nuevoUsername,
            nombre_usuario: nuevoNombre,
            id_rol: nuevoRol,
            id_sucursal: nuevaSucursal
        })
        .eq('id', id)
        .select('*');

    if (error) {
        console.error('Error DB:', error);
        return { success: false, error };
    }

    // 2️⃣ Actualizar email en Auth (username@foncepan.com)
    const { error: emailError } =
        await supabase.functions.invoke(
            'actualizar-email',
            {
                body: {
                    user_id: id,
                    username: nuevoUsername
                }
            }
        );

    if (emailError) {
        console.error('Error actualizando email:', emailError);
        return { success: false, error: emailError };
    }

    // 3️⃣ Actualizar password si aplica
    if (nuevoPassword) {
        const { error: passError } =
            await supabase.functions.invoke(
                'actualizar-password',
                {
                    body: {
                        user_id: id,
                        new_password: nuevoPassword
                    }
                }
            );

        if (passError) {
            console.error('Error password:', passError);
            return { success: false, error: passError };
        }
    }

    return { success: true, data };
}


//DELETE
export async function eliminarUsuario(id) {
    const { data, error } = await supabase.functions.invoke(
        'eliminar-usuario',
        {
            body: { user_id: id }
        }
    );

    if (error) {
        console.error('Error eliminando usuario:', error);
        return { success: false, error };
    }

    return { success: true };
}
