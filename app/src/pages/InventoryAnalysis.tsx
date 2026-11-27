import { useState } from 'react';
import { Alert, Badge, Button, Group, Select, Stack, Text } from '@mantine/core';
import { supabase } from '../lib/supabase';
import { analyzeInventory } from '../lib/ai-analysis';
import type { AnalysisMode, InventoryAnalysisResult } from '../lib/ai-analysis';

export default function InventoryAnalysis() {
  const [mode, setMode] = useState<AnalysisMode>('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<InventoryAnalysisResult | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_dashboard_products');
      if (rpcError) throw new Error('No se pudo consultar el inventario. Intenta nuevamente.');
      setResult(await analyzeInventory(data, mode));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el análisis.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">GESTIÓN DE INVENTARIO</span>
          <h1>Análisis IA</h1>
          <p>Recomendaciones de reposición basadas en las existencias actuales.</p>
        </div>
      </div>
      <article className="dashboard-panel">
        <Stack gap="md">
          <Alert color="blue" title={mode === 'normal' ? 'Google Gemini · IA real' : 'Modo de prueba (mock)'}>
            {mode === 'normal' ? 'Los datos de productos activos se envían a Gemini mediante Supabase. Usa únicamente datos de prueba no confidenciales.' : 'Prueba local sin consultar Gemini ni modificar las existencias.'}
          </Alert>
          <Select label="Modo de prueba" value={mode} disabled={loading} allowDeselect={false}
            data={[{ value: 'normal', label: 'Análisis con Gemini' }, { value: 'mock', label: 'Análisis simulado (mock)' }, { value: 'failure', label: 'Simular fallo del servicio' }, { value: 'invalid', label: 'Simular respuesta inválida' }]}
            onChange={(value) => {
              if (value === 'normal' || value === 'mock' || value === 'failure' || value === 'invalid') {
                setMode(value); setError(''); setResult(null);
              }
            }} />
          <Group>
            <Button loading={loading} onClick={() => void runAnalysis()}>
              {error ? 'Reintentar' : 'Analizar inventario'}
            </Button>
          </Group>
          <div role="status" aria-live="polite">
            {loading ? <Text>Analizando inventario...</Text> : !result && !error ? <Text c="dimmed">Selecciona un modo e inicia el análisis.</Text> : null}
          </div>
          {error && <Alert color="red" title="No se pudo completar el análisis" role="alert">{error}</Alert>}
        </Stack>
      </article>
      {result && (
        <Stack gap="md">
          <div className="dashboard-kpis">
            <article className="dashboard-kpi"><span>Productos activos</span><strong>{result.total}</strong></article>
            <article className="dashboard-kpi"><span>Sin existencias</span><strong>{result.outOfStock}</strong></article>
            <article className="dashboard-kpi"><span>Stock bajo</span><strong>{result.lowStock}</strong></article>
          </div>
          <article className="dashboard-panel">
            <Stack gap="sm">
              <Group justify="space-between"><h2>Resultado del análisis · {mode === 'normal' ? 'Gemini' : 'Mock'}</h2><Badge color={result.risk === 'Alto' ? 'red' : result.risk === 'Medio' ? 'orange' : result.risk === 'Bajo' ? 'green' : 'gray'}>Riesgo: {result.risk}</Badge></Group>
              <Text>{result.summary}</Text>
              <h3>Recomendaciones</h3>
              <ul>{result.recommendations.map((recommendation, index) => <li key={index}>{recommendation}</li>)}</ul>
            </Stack>
          </article>
        </Stack>
      )}
    </section>
  );
}
