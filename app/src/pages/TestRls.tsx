
import { useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { supabase } from '../lib/supabase';

// Estructura para mostrar los resultados
type TestResult = {
  table: string;
  result: string;
};

// Tablas que el usuario debe poder consultar
const tables = [
  'companies',
  'company_users',
  'warehouses',
  'categories',
  'company_subscriptions',
  'subscription_plans',
] as const;

// Tablas que deben estar aisladas por empresa
const crossCompanyTables = [
  { table: 'companies', field: 'id' },
  { table: 'company_users', field: 'company_id' },
  { table: 'warehouses', field: 'company_id' },
  { table: 'categories', field: 'company_id' },
  { table: 'company_subscriptions', field: 'company_id' },
] as const;

export default function TestRls() {
  // Estados para las consultas normales
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Estados para las pruebas entre empresas
  const [otherCompanyId, setOtherCompanyId] = useState('');
  const [crossResults, setCrossResults] = useState<TestResult[]>([]);
  const [crossLoading, setCrossLoading] = useState(false);

  // =====================================================
  // PRUEBA 1: CONSULTAR DATOS DE LA EMPRESA ACTUAL
  // =====================================================

  async function runTests() {
    setLoading(true);
    setResults([]);
    setMessage('');

    try {
      // Verificar sesión autenticada
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        setMessage(
          'No existe una sesión válida. Inicia sesión primero.'
        );
        return;
      }

      setMessage('Usuario autenticado correctamente.');

      const { data: products, error: productsError } =
        await supabase
            .from('products')
            .select('id, code, name, unit');

        console.log('Productos visibles para el usuario:', {
            products,
            productsError,
        });

      const checks: TestResult[] = [];

      // Consultar las tablas permitidas
      for (const table of tables) {
        const {
          data: rows,
          error: queryError,
        } = await supabase
          .from(table)
          .select('*');

        checks.push({
          table,
          result: queryError
            ? `ERROR: ${queryError.message}`
            : `OK: ${rows?.length ?? 0} registros`,
        });
      }

      setResults(checks);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Error inesperado durante la prueba RLS.'
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // PRUEBA 2: AISLAMIENTO ENTRE EMPRESAS
  // =====================================================

  async function runCrossCompanyTest() {
    const targetId = otherCompanyId.trim();

    setCrossResults([]);

    // Validar formato UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(targetId)) {
      setCrossResults([
        {
          table: 'Validación',
          result: 'ERROR: UUID inválido.',
        },
      ]);
      return;
    }

    setCrossLoading(true);

    try {
      // Verificar la identidad autenticada
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          'No existe una sesión autenticada.'
        );
      }

      // Obtener la empresa del usuario actual
      const {
        data: myProfile,
        error: profileError,
      } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !myProfile) {
        throw new Error(
          'No se pudo identificar la empresa actual.'
        );
      }

      // Evitar consultar la propia empresa
      if (
        myProfile.company_id.toLowerCase() ===
        targetId.toLowerCase()
      ) {
        throw new Error(
          'Debes ingresar el UUID de la OTRA empresa.'
        );
      }

      const checks: TestResult[] = [];

      // Intentar consultar registros
      // pertenecientes a la otra empresa
      for (const item of crossCompanyTables) {
        const {
          data: rows,
          error: queryError,
        } = await supabase
          .from(item.table)
          .select('id')
          .eq(item.field, targetId);

        if (queryError) {
          checks.push({
            table: item.table,
            result: `ERROR: ${queryError.message}`,
          });

          continue;
        }

        const count = rows?.length ?? 0;

        checks.push({
          table: item.table,
          result:
            count === 0
              ? 'BLOQUEADO: 0 registros'
              : `FALLO DE AISLAMIENTO: ${count} registros visibles`,
        });
      }

      setCrossResults(checks);
    } catch (error) {
      setCrossResults([
        {
          table: 'Prueba',
          result:
            error instanceof Error
              ? `ERROR: ${error.message}`
              : 'Error inesperado.',
        },
      ]);
    } finally {
      setCrossLoading(false);
    }
  }

  // =====================================================
  // INTERFAZ DE DIAGNÓSTICO
  // =====================================================

  return (
    <Paper withBorder p="xl" radius="md">
      <Stack gap="lg">

        <Title order={2}>
          Pruebas RLS de StockFlow
        </Title>

        <Text size="sm" c="dimmed">
          Herramienta temporal para verificar
          las políticas de seguridad de Supabase
          y el aislamiento entre empresas.
        </Text>

        {/* PRUEBA 1 */}

        <Title order={3}>
          1. Consultas de la empresa actual
        </Title>

        <Button
          onClick={runTests}
          loading={loading}
        >
          Ejecutar pruebas RLS
        </Button>

        {message && (
          <Alert
            color={
              message.includes('correctamente')
                ? 'green'
                : 'red'
            }
          >
            {message}
          </Alert>
        )}

        {results.map((item) => (
          <Text key={item.table} size="sm">
            <strong>{item.table}:</strong>{' '}
            {item.result}
          </Text>
        ))}

        <Divider />

        {/* PRUEBA 2 */}

        <Title order={3}>
          2. Aislamiento entre empresas
        </Title>

        <Text size="sm" c="dimmed">
          Introduce el UUID de una empresa diferente
          a la que pertenece el usuario autenticado.
          El resultado esperado es cero registros
          en todas las tablas.
        </Text>

        <TextInput
          label="UUID de la otra empresa"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={otherCompanyId}
          onChange={(event) =>
            setOtherCompanyId(
              event.currentTarget.value
            )
          }
        />

        <Button
          variant="outline"
          onClick={runCrossCompanyTest}
          loading={crossLoading}
        >
          Comprobar aislamiento
        </Button>

        {crossResults.map((item) => {
          const isBlocked =
            item.result.startsWith('BLOQUEADO');

          const isFailure =
            item.result.startsWith('FALLO') ||
            item.result.startsWith('ERROR');

          return (
            <Alert
              key={item.table}
              color={
                isBlocked
                  ? 'green'
                  : isFailure
                    ? 'red'
                    : 'blue'
              }
              title={item.table}
            >
              {item.result}
            </Alert>
          );
        })}

      </Stack>
    </Paper>
  );
}
