
import { createClient } from 'npm:@supabase/supabase-js@2';

type InviteRequest = {
  email?: unknown;
  full_name?: unknown;
  role?: unknown;
};

const allowedRoles = [
  'administrator',
  'supervisor',
  'operator',
];

const allowedOrigin =
  Deno.env.get('STOCKFLOW_APP_ORIGIN') ??
  'http://localhost:5173';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Vary': 'Origin',
};

function respond(
  status: number,
  body: Record<string, unknown>
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return respond(405, {
      error: 'Método no permitido',
    });
  }

  // Durante las primeras pruebas no se
  // permite enviar invitaciones reales.
  const invitationsEnabled =
    Deno.env.get('STOCKFLOW_ENABLE_INVITATIONS') === 'true';

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey =
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !secretKey) {
    return respond(500, {
      error: 'Configuración de servidor incompleta',
    });
  }

  const authHeader =
    req.headers.get('Authorization') ?? '';

  const match = /^Bearer\s+(.+)$/i.exec(authHeader);

  if (!match) {
    return respond(401, {
      error: 'Autenticación requerida',
    });
  }

  // Cliente exclusivo de servidor.
  // No adjuntamos el JWT del usuario a este
  // cliente, porque debe conservar su rol
  // administrativo para las operaciones RPC.
  const admin = createClient(
    supabaseUrl,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  try {
    // 1. Validar el token contra Supabase Auth.
    const { data: authData, error: authError } =
      await admin.auth.getUser(match[1]);

    if (authError || !authData.user) {
      return respond(401, {
        error: 'Sesión inválida o vencida',
      });
    }

    const actor = authData.user;

    // 2. Verificar el permiso administrativo.
    const { data: profile, error: profileError } =
      await admin
        .from('company_users')
        .select('company_id, role, is_active')
        .eq('id', actor.id)
        .single();

    if (
      profileError ||
      !profile ||
      profile.role !== 'administrator' ||
      profile.is_active !== true
    ) {
      return respond(403, {
        error: 'Solo un administrador activo puede invitar usuarios',
      });
    }

    // 3. Validar los datos solicitados.
    let input: InviteRequest;

    try {
      input = await req.json() as InviteRequest;
    } catch {
      return respond(400, {
        error: 'JSON inválido',
      });
    }

    const email =
      typeof input.email === 'string'
        ? input.email.trim().toLowerCase()
        : '';

    const fullName =
      typeof input.full_name === 'string'
        ? input.full_name.trim()
        : '';

    const role =
      typeof input.role === 'string'
        ? input.role
        : '';

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return respond(400, {
        error: 'Correo inválido',
      });
    }

    if (
      fullName.length < 1 ||
      fullName.length > 100
    ) {
      return respond(400, {
        error: 'El nombre debe tener entre 1 y 100 caracteres',
      });
    }

    if (!allowedRoles.includes(role)) {
      return respond(400, {
        error: 'Rol inválido',
      });
    }

    // 4. Bloqueo temporal de invitaciones.
    if (!invitationsEnabled) {
      return respond(503, {
        code: 'INVITATIONS_DISABLED',
        error:
          'Las invitaciones están deshabilitadas durante la configuración',
        authenticated: true,
        administrator: true,
      });
    }

    // 5. PostgreSQL valida nuevamente al
    // administrador, la suscripción y el cupo.
    const { data: invitationId, error: reserveError } =
      await admin.rpc(
        'reserve_company_user_invitation',
        {
          p_actor_id: actor.id,
          p_email: email,
          p_full_name: fullName,
          p_role: role,
        }
      );

    if (reserveError || !invitationId) {
      // No repetir automáticamente una reserva
      // cuando su estado es incierto.
      console.error('Reserva fallida:', reserveError);

      return respond(409, {
        code: 'RESERVATION_NOT_CONFIRMED',
        error:
          'No se confirmó la reserva. Verifica su estado antes de reintentar.',
      });
    }

    // 6. Supabase Auth crea y envía
    // la invitación al correo solicitado.
    const { data: invitation, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            full_name: fullName,
            stockflow_invitation_id: invitationId,
            stockflow_registration: false,
          },
        }
      );

    if (inviteError || !invitation.user?.id) {
      console.error(
        'Invitación Auth no confirmada:',
        invitationId,
        inviteError
      );

      // La reserva permanece pendiente.
      // No eliminamos ninguna cuenta de Auth.
      return respond(202, {
        code: 'AUTH_INVITATION_UNCERTAIN',
        invitation_id: invitationId,
        message:
          'La invitación no quedó confirmada. Se requiere reconciliación.',
      });
    }

    // 7. Completar el vínculo con la empresa.
    const { data: linkedUserId, error: linkError } =
      await admin.rpc(
        'complete_company_user_invitation',
        {
          p_invitation_id: invitationId,
          p_auth_user_id: invitation.user.id,
        }
      );

    if (
      linkError ||
      linkedUserId !== invitation.user.id
    ) {
      console.error(
        'Vinculación pendiente:',
        invitationId,
        linkError
      );

      return respond(202, {
        code: 'LINK_PENDING',
        invitation_id: invitationId,
        message:
          'La invitación pudo haberse enviado, pero falta confirmar la vinculación.',
      });
    }

    return respond(201, {
      code: 'INVITATION_COMPLETED',
      invitation_id: invitationId,
      user_id: linkedUserId,
      message: 'Usuario invitado y vinculado a la empresa',
    });
  } catch (error) {
    console.error('Error inesperado:', error);

    return respond(500, {
      code: 'UNEXPECTED_ERROR',
      error:
        'No se pudo completar la solicitud. Verifica su estado antes de reintentar.',
    });
  }
});
