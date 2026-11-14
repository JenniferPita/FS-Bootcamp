
import { useState } from 'react';
import {
  Alert,
  Button,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type TestResponse = {
  status: number | null;
  code: string | null;
  message: string;
  passed: boolean;
  role: string;
};

export default function TestInviteAuth() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] =
    useState<TestResponse | null>(null);

  async function runTest() {
    setLoading(true);
    setResult(null);

    try {
      // 1. Comprobar la sesión actual.
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error(
          'Debes iniciar sesión antes de ejecutar la prueba.'
        );
      }

      // 2. Consultar el perfil del usuario.
      const { data: profile, error: profileError } =
        await supabase
          .from('company_users')
          .select('role, is_active')
          .eq('id', auth.user.id)
          .single();

      if (profileError || !profile?.is_active) {
        throw new Error(
          'No se encontró un perfil activo.'
        );
      }

      // 3. Invocar la Edge Function.
      // Las invitaciones están deshabilitadas:
      // NO debería crear una cuenta.
      const { data, error } =
        await supabase.functions.invoke(
          'invite-company-user',
          {
            body: {
              email: 'et03-test@example.com',
              full_name: 'Usuario Prueba ET03',
              role: 'operator',
            },
          }
        );

      let status: number | null = null;
      let body: Record<string, unknown> = {};

      if (error instanceof FunctionsHttpError) {
        status = error.context.status;

        try {
          body = await error.context.json();
        } catch {
          body = {
            error: error.message,
          };
        }
      } else if (error) {
        throw new Error(error.message);
      } else {
        body = (data ?? {}) as Record<string, unknown>;
        status = 200;
      }

      const code =
        typeof body.code === 'string'
          ? body.code
          : null;

      const message =
        typeof body.error === 'string'
          ? body.error
          : typeof body.message === 'string'
            ? body.message
            : 'Respuesta sin mensaje';

      let passed = false;

      if (profile.role === 'administrator') {
        passed =
          status === 503 &&
          code === 'INVITATIONS_DISABLED' &&
          body.authenticated === true &&
          body.administrator === true;
      } else {
        passed = status === 403;
      }

      setResult({
        status,
        code,
        message,
        passed,
        role: profile.role,
      });
    } catch (error) {
      setResult({
        status: null,
        code: null,
        message:
          error instanceof Error
            ? error.message
            : 'Error inesperado',
        passed: false,
        role: 'desconocido',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper withBorder p="xl" radius="md">
      <Stack gap="md">
        <Title order={2}>
          ET-03 — Prueba de Edge Function
        </Title>

        <Alert color="yellow" title="Modo de prueba">
          Las invitaciones deben estar deshabilitadas
          en Supabase antes de ejecutar esta prueba.
          No se deben crear usuarios nuevos.
        </Alert>

        <Text>
          Verificaremos la respuesta de
          invite-company-user según el rol de
          la sesión actual.
        </Text>

        <Button
          loading={loading}
          onClick={() => void runTest()}
        >
          Probar autenticación
        </Button>

        {result && (
          <Alert
            color={result.passed ? 'green' : 'red'}
            title={
              result.passed
                ? 'PRUEBA APROBADA'
                : 'REVISAR RESULTADO'
            }
          >
            <Stack gap="xs">
              <Text>
                <strong>Rol:</strong> {result.role}
              </Text>

              <Text>
                <strong>HTTP:</strong>{' '}
                {result.status ?? 'Sin respuesta HTTP'}
              </Text>

              <Text>
                <strong>Código:</strong>{' '}
                {result.code ?? 'No disponible'}
              </Text>

              <Text>
                <strong>Mensaje:</strong>{' '}
                {result.message}
              </Text>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
