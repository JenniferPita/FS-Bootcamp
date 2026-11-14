
import { useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { supabase } from '../lib/supabase';

type TestResponse = {
  success: boolean;
  productId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export default function TestConcurrency() {
  // Prueba 1: código duplicado
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [testCode, setTestCode] = useState('');

  // Prueba 2: concurrencia de cuota
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaResult, setQuotaResult] = useState('');
  const [quotaCodes, setQuotaCodes] = useState<string[]>([]);
  const [quotaAttempted, setQuotaAttempted] = useState(false);

  // =====================================================
  // FUNCIONES AUXILIARES
  // =====================================================

  async function getAuthorizedCategory() {
    const { data: auth, error: authError } =
      await supabase.auth.getUser();

    if (authError || !auth.user) {
      throw new Error('Debes iniciar sesión.');
    }

    const { data: profile, error: profileError } =
      await supabase
        .from('company_users')
        .select('company_id, role, is_active')
        .eq('id', auth.user.id)
        .single();

    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      !['administrator', 'supervisor'].includes(profile.role)
    ) {
      throw new Error('Usuario no autorizado.');
    }

    const { data: categories, error: categoryError } =
      await supabase
        .from('categories')
        .select('id')
        .limit(1);

    if (categoryError || !categories?.length) {
      throw new Error('No se encontró una categoría.');
    }

    return {
      companyId: profile.company_id,
      categoryId: categories[0].id,
    };
  }

  function formatResponses(
    responses: Array<{
      data: string | null;
      error: {
        code?: string;
        message: string;
      } | null;
    }>
  ): string {
    const details: TestResponse[] = responses.map(
      (response) => ({
        success: !response.error && Boolean(response.data),
        productId: response.data ?? null,
        errorCode: response.error?.code ?? null,
        errorMessage: response.error?.message ?? null,
      })
    );

    return JSON.stringify(details, null, 2);
  }

  // =====================================================
  // PRUEBA 1: CÓDIGOS DUPLICADOS
  // =====================================================

  async function runTest() {
    setLoading(true);
    setResult('');
    setTestCode('');

    try {
      const { categoryId } = await getAuthorizedCategory();

      const code =
        'CONC-' +
        crypto.randomUUID().slice(0, 8).toUpperCase();

      setTestCode(code);

      const params = {
        p_code: code,
        p_name: 'Producto de concurrencia',
        p_description: 'Prueba técnica ET-04',
        p_category_id: categoryId,
        p_unit: 'unidades',
        p_initial_quantity: '10',
        p_minimum_stock: '2',
      };

      // Ejecutar dos solicitudes simultáneas
      const [first, second] = await Promise.all([
        supabase.rpc('create_product', params),
        supabase.rpc('create_product', params),
      ]);

      const responses = [first, second];

      const successes = responses.filter(
        (response) => !response.error && Boolean(response.data)
      );

      const duplicateErrors = responses.filter(
        (response) => response.error?.code === '23505'
      );

      if (
        successes.length === 1 &&
        duplicateErrors.length === 1
      ) {
        setResult(
          'CORRECTO: se creó exactamente un producto ' +
          'y la segunda solicitud fue rechazada ' +
          'por código duplicado.'
        );
      } else {
        setResult(
          'REVISAR: resultado inesperado.\n' +
          formatResponses(responses)
        );
      }
    } catch (error) {
      setResult(
        'ERROR: ' +
          (error instanceof Error
            ? error.message
            : 'Error inesperado.')
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // PRUEBA 2: CONCURRENCIA DEL LÍMITE DE PRODUCTOS
  // =====================================================

  async function runQuotaConcurrencyTest() {
    setQuotaLoading(true);
    setQuotaResult('');
    setQuotaCodes([]);
    setQuotaAttempted(true);

    try {
      const { companyId, categoryId } =
        await getAuthorizedCategory();

      // Confirmar plan Inicial
      const { data: subscription, error: subError } =
        await supabase
          .from('company_subscriptions')
          .select('plan_code')
          .eq('company_id', companyId)
          .single();

      if (subError || subscription?.plan_code !== 'initial') {
        throw new Error(
          'La prueba requiere una empresa con plan Inicial.'
        );
      }

      // Cada solicitud utiliza un código diferente.
      const suffix = crypto.randomUUID()
        .slice(0, 8)
        .toUpperCase();

      const codeA = `QT-A-${suffix}`;
      const codeB = `QT-B-${suffix}`;

      setQuotaCodes([codeA, codeB]);

      const commonParams = {
        p_description: 'Prueba concurrencia de cuota ET-04',
        p_category_id: categoryId,
        p_unit: 'unidades',
        p_initial_quantity: '0',
        p_minimum_stock: '0',
      };

      // Enviar ambas solicitudes sin esperar
      // a que termine la primera.
      const [responseA, responseB] = await Promise.all([
        supabase.rpc('create_product', {
          ...commonParams,
          p_code: codeA,
          p_name: 'Prueba cuota A',
        }),
        supabase.rpc('create_product', {
          ...commonParams,
          p_code: codeB,
          p_name: 'Prueba cuota B',
        }),
      ]);

      const responses = [responseA, responseB];

      const successes = responses.filter(
        (response) => !response.error && Boolean(response.data)
      );

      const quotaFailures = responses.filter(
        (response) =>
          response.error?.message?.includes(
            'Has alcanzado el límite'
          )
      );

      if (
        successes.length === 1 &&
        quotaFailures.length === 1
      ) {
        setQuotaResult(
          'CORRECTO: una solicitud creó el producto ' +
          'y la otra fue rechazada por el límite ' +
          'de 100 productos del plan Inicial.'
        );
      } else {
        setQuotaResult(
          'REVISAR: resultado inesperado.\n' +
          formatResponses(responses)
        );
      }
    } catch (error) {
      setQuotaResult(
        'ERROR: ' +
          (error instanceof Error
            ? error.message
            : 'Error inesperado.')
      );
    } finally {
      setQuotaLoading(false);
    }
  }

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <Paper withBorder p="xl" radius="md">
      <Stack gap="lg">
        <Title order={2}>
          Pruebas de concurrencia ET-04
        </Title>

        <Text size="sm" c="dimmed">
          Herramienta temporal de desarrollo para
          comprobar la creación concurrente de productos
          y el cumplimiento de cuotas.
        </Text>

        {/* PRUEBA 1 */}

        <Title order={3}>
          1. Creación con código duplicado
        </Title>

        <Text size="sm">
          Se envían dos solicitudes con el mismo código.
          Una debe ser aceptada y la otra rechazada.
        </Text>

        <Button
          onClick={runTest}
          loading={loading}
          disabled={quotaLoading}
        >
          Probar código duplicado
        </Button>

        {testCode && (
          <Text size="sm">
            <strong>Código utilizado:</strong> {testCode}
          </Text>
        )}

        {result && (
          <Alert
            color={result.startsWith('CORRECTO') ? 'green' : 'red'}
            title="Resultado de código duplicado"
          >
            <Text style={{ whiteSpace: 'pre-wrap' }}>
              {result}
            </Text>
          </Alert>
        )}

        <Divider />

        {/* PRUEBA 2 */}

        <Title order={3}>
          2. Concurrencia de cuota — Plan Inicial
        </Title>

        <Text size="sm">
          Esta prueba requiere que StockFlow Prueba 01
          tenga exactamente 99 productos antes de iniciar.
          Las dos solicitudes utilizan códigos diferentes
          y compiten por el último cupo.
        </Text>

        <Alert color="yellow" title="Atención">
          Ejecuta esta prueba una sola vez. Si tiene éxito,
          la empresa llegará a 100 productos.
          No ejecutes primero la prueba de código duplicado,
          porque también crea un producto.
        </Alert>

        <Button
          color="orange"
          loading={quotaLoading}
          disabled={loading || quotaAttempted}
          onClick={runQuotaConcurrencyTest}
        >
          Probar límite de 100 productos
        </Button>

        {quotaCodes.length > 0 && (
          <Text size="sm">
            <strong>Códigos utilizados:</strong>{' '}
            {quotaCodes.join(' / ')}
          </Text>
        )}

        {quotaResult && (
          <Alert
            color={
              quotaResult.startsWith('CORRECTO')
                ? 'green'
                : 'red'
            }
            title="Resultado de concurrencia de cuota"
          >
            <Text style={{ whiteSpace: 'pre-wrap' }}>
              {quotaResult}
            </Text>
          </Alert>
        )}

      </Stack>
    </Paper>
  );
}

