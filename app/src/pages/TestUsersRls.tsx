
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { supabase } from '../lib/supabase';

type CompanyUser = {
  id: string;
  company_id: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

type TestResult = {
  authId: string;
  ownCompanyId: string;
  ownRole: string;
  users: CompanyUser[];
  sameCompany: boolean;
  operatorOnlySelf: boolean;
};

export default function TestUsersRls() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error('Debes iniciar sesión primero.');
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('company_users')
          .select('id, company_id, role, is_active')
          .eq('id', auth.user.id)
          .single();

      if (profileError || !profile) {
        throw new Error(
          'No se pudo obtener el perfil activo: ' +
          (profileError?.message ?? 'Sin perfil')
        );
      }

      const { data: users, error: usersError } =
        await supabase
          .from('company_users')
          .select(
            'id, company_id, full_name, role, is_active'
          )
          .order('created_at');

      if (usersError) {
        throw new Error(usersError.message);
      }

      const records = (users ?? []) as CompanyUser[];

      setResult({
        authId: auth.user.id,
        ownCompanyId: profile.company_id,
        ownRole: profile.role,
        users: records,
        sameCompany: records.every(
          (user) =>
            user.company_id === profile.company_id
        ),
        operatorOnlySelf:
          profile.role !== 'operator' ||
          (
            records.length === 1 &&
            records[0].id === auth.user.id
          ),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error inesperado.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runTest();
  }, []);

  return (
    <Paper withBorder p="xl" radius="md">
      <Stack gap="md">
        <Title order={2}>
          ET-03 — Verificación RLS de usuarios
        </Title>

        <Button loading={loading} onClick={runTest}>
          Ejecutar consulta
        </Button>

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {result && (
          <>
            <Text>
              <strong>Rol actual:</strong>{' '}
              {result.ownRole}
            </Text>

            <Text size="sm">
              <strong>Empresa ID:</strong>{' '}
              {result.ownCompanyId}
            </Text>

            <Text>
              <strong>Usuarios visibles:</strong>{' '}
              {result.users.length}
            </Text>

            <Alert
              color={result.sameCompany ? 'green' : 'red'}
            >
              {result.sameCompany
                ? 'Correcto: todos los usuarios visibles pertenecen a la misma empresa.'
                : 'FALLO: hay usuarios de otra empresa.'}
            </Alert>

            {result.ownRole === 'operator' && (
              <Alert
                color={
                  result.operatorOnlySelf ? 'green' : 'red'
                }
              >
                {result.operatorOnlySelf
                  ? 'Correcto: el Operador solo ve su propio perfil.'
                  : 'FALLO: el Operador ve otros usuarios.'}
              </Alert>
            )}

            <Table.ScrollContainer minWidth={550}>
              <Table striped withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nombre</Table.Th>
                    <Table.Th>Rol</Table.Th>
                    <Table.Th>Activo</Table.Th>
                    <Table.Th>Propio</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.users.map((user) => (
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        {user.full_name}
                      </Table.Td>
                      <Table.Td>
                        {user.role}
                      </Table.Td>
                      <Table.Td>
                        {user.is_active ? 'Sí' : 'No'}
                      </Table.Td>
                      <Table.Td>
                        {user.id === result.authId
                          ? 'Sí'
                          : 'No'}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </>
        )}
      </Stack>
    </Paper>
  );
}
