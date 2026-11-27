import { useState } from 'react';
import { Alert, Badge, Button, Group, Select, Stack, Text } from '@mantine/core';
import { supabase } from '../lib/supabase';
import { analyzeInventory } from '../lib/ai-analysis';
import type { AnalysisMode, InventoryAnalysisResult } from '../lib/ai-analysis';

type Report = {
  version: '2.0';
  provider: 'Google Gemini' | 'Mock (simulado)';
  generatedAt: string;
  analysis: InventoryAnalysisResult;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'America/Guayaquil',
  }).format(new Date(value));
}

function fileName(report: Report, extension: string) {
  return `stockflow-analisis-${report.generatedAt.replace(/[:.]/g, '-')}.${extension}`;
}

function downloadText(content: string, mimeType: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: string | number) {
  let text = String(value);
  // Evitar que texto generado por IA se interprete como fórmula en Excel.
  if (/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(report: Report) {
  const r = report.analysis;
  const rows: (string | number)[][] = [
    ['Campo', 'Valor'], ['Versión', report.version],
    ['Proveedor', report.provider], ['Fecha y hora (Ecuador)', formatDate(report.generatedAt)],
    ['Productos activos', r.total], ['Sin existencias', r.outOfStock],
    ['Stock bajo', r.lowStock], ['Riesgo', r.risk], ['Resumen', r.summary],
    ...r.recommendations.map((value, index) => [`Recomendación ${index + 1}`, value]),
  ];
  downloadText('\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n'),
    'text/csv;charset=utf-8', fileName(report, 'csv'));
}

// Las fuentes PDF estándar admiten español y caracteres latinos básicos.
function pdfText(value: string) {
  return value.normalize('NFC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/gu, '?');
}

async function downloadPdf(report: Report) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const r = report.analysis;
  const left = 16;
  const right = 194;
  const width = right - left;
  let y = 0;

  function header() {
    doc.setFillColor(23, 65, 199);
    doc.rect(0, 0, 210, 29, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('StockFlow', left, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Informe de análisis de inventario', left, 21);
    doc.text(`V${report.version}`, right, 13, { align: 'right' });
    y = 40;
  }

  function ensureSpace(height: number) {
    if (y + height > 278) {
      doc.addPage();
      header();
    }
  }

  function paragraph(value: string, indent = 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(pdfText(value), width - indent) as string[];
    for (const line of lines) {
      ensureSpace(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(38, 49, 68);
      doc.text(line, left + indent, y);
      y += 5.5;
    }
    y += 3;
  }

  function heading(value: string) {
    ensureSpace(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(23, 65, 199);
    doc.text(value, left, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
  }

  header();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  paragraph(`Proveedor: ${report.provider}`);
  paragraph(`Fecha y hora (Ecuador): ${formatDate(report.generatedAt)}`);
  y += 3;
  const metrics = [
    { label: 'Productos activos', value: r.total },
    { label: 'Sin existencias', value: r.outOfStock },
    { label: 'Stock bajo', value: r.lowStock },
  ];
  const cardWidth = (width - 8) / 3;
  for (const [index, metric] of metrics.entries()) {
    const x = left + index * (cardWidth + 4);
    doc.setFillColor(236, 241, 255);
    doc.roundedRect(x, y, cardWidth, 24, 2, 2, 'F');
    doc.setTextColor(38, 49, 68);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(metric.label, x + 4, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(String(metric.value), x + 4, y + 18);
  }
  y += 34;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  if (r.risk === 'Alto') doc.setTextColor(185, 28, 28);
  else if (r.risk === 'Medio') doc.setTextColor(161, 75, 0);
  else if (r.risk === 'Bajo') doc.setTextColor(21, 128, 61);
  else doc.setTextColor(75, 85, 99);
  doc.text(`Nivel de riesgo: ${r.risk}`, left, y);
  y += 12;
  heading('Resumen del análisis');
  paragraph(r.summary);
  heading('Recomendaciones');
  r.recommendations.forEach((recommendation, index) => {
    paragraph(`${index + 1}. ${recommendation}`, 2);
  });
  heading('Nota');
  paragraph(report.provider === 'Google Gemini'
    ? 'Recomendaciones generadas por IA. Verifique los resultados antes de tomar decisiones de reposición.'
    : 'Informe simulado mediante reglas locales. No fue generado por un modelo de IA.');

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(215, 223, 235);
    doc.line(left, 282, right, 282);
    doc.setTextColor(95, 105, 120);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('StockFlow | Gestión de inventario', left, 288);
    doc.text(`${page} / ${pages}`, right, 288, { align: 'right' });
  }
  doc.setProperties({ title: 'StockFlow - Informe de análisis de inventario', author: 'StockFlow' });
  doc.save(fileName(report, 'pdf'));
}

export default function InventoryAnalysis() {
  const [mode, setMode] = useState<AnalysisMode>('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const result = report?.analysis;

  async function runAnalysis() {
    setLoading(true);
    setError('');
    setExportError('');
    setReport(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_dashboard_products');
      if (rpcError) throw new Error('No se pudo consultar el inventario. Intenta nuevamente.');
      const analysis = await analyzeInventory(data, mode);
      setReport({ version: '2.0', provider: mode === 'normal' ? 'Google Gemini' : 'Mock (simulado)',
        generatedAt: new Date().toISOString(), analysis });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el análisis.');
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(format: 'pdf' | 'json' | 'csv') {
    if (!report || exporting) return;
    setExportError('');
    setExporting(true);
    try {
      if (format === 'pdf') await downloadPdf(report);
      else if (format === 'csv') downloadCsv(report);
      else downloadText(JSON.stringify(report, null, 2), 'application/json;charset=utf-8', fileName(report, 'json'));
    } catch {
      setExportError('No se pudo generar el archivo. Intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">GESTIÓN DE INVENTARIO</span>
          <Group gap="sm"><h1>Análisis IA</h1><Badge variant="light">V2.0</Badge></Group>
          <p>Recomendaciones de reposición y exportación de informes de inventario.</p>
        </div>
      </div>
      <article className="dashboard-panel">
        <Stack gap="md">
          <Alert color="blue" title={mode === 'normal' ? 'Google Gemini · IA real' : 'Modo de prueba (mock)'}>
            {mode === 'normal' ? 'Los datos de productos activos se envían a Gemini mediante Supabase. Usa únicamente datos de prueba no confidenciales.' : 'Prueba local sin consultar Gemini ni modificar las existencias.'}
          </Alert>
          <Select label="Modo de prueba" value={mode} disabled={loading || exporting} allowDeselect={false}
            data={[{ value: 'normal', label: 'Análisis con Gemini' }, { value: 'mock', label: 'Análisis simulado (mock)' }, { value: 'failure', label: 'Simular fallo del servicio' }, { value: 'invalid', label: 'Simular respuesta inválida' }]}
            onChange={(value) => {
              if (value === 'normal' || value === 'mock' || value === 'failure' || value === 'invalid') {
                setMode(value); setError(''); setExportError(''); setReport(null);
              }
            }} />
          <Group>
            <Button loading={loading} disabled={exporting} onClick={() => void runAnalysis()}>
              {error ? 'Reintentar' : 'Analizar inventario'}
            </Button>
          </Group>
          <div role="status" aria-live="polite">
            {loading ? <Text>Analizando inventario...</Text> : !result && !error ? <Text c="dimmed">Selecciona un modo e inicia el análisis.</Text> : null}
          </div>
          {error && <Alert color="red" title="No se pudo completar el análisis" role="alert">{error}</Alert>}
        </Stack>
      </article>
      {report && result && (
        <Stack gap="md">
          <div className="dashboard-kpis">
            <article className="dashboard-kpi"><span>Productos activos</span><strong>{result.total}</strong></article>
            <article className="dashboard-kpi"><span>Sin existencias</span><strong>{result.outOfStock}</strong></article>
            <article className="dashboard-kpi"><span>Stock bajo</span><strong>{result.lowStock}</strong></article>
          </div>
          <article className="dashboard-panel">
            <Stack gap="sm">
              <Group justify="space-between"><h2>Resultado del análisis · {report.provider}</h2><Badge color={result.risk === 'Alto' ? 'red' : result.risk === 'Medio' ? 'orange' : result.risk === 'Bajo' ? 'green' : 'gray'}>Riesgo: {result.risk}</Badge></Group>
              <Text size="sm" c="dimmed">Último análisis: {formatDate(report.generatedAt)} (Ecuador)</Text>
              <Text>{result.summary}</Text>
              <h3>Recomendaciones</h3>
              <ul>{result.recommendations.map((recommendation, index) => <li key={index}>{recommendation}</li>)}</ul>
              <Group>
                <Button loading={exporting} onClick={() => void exportReport('pdf')}>Descargar PDF</Button>
                <Button variant="light" disabled={exporting} onClick={() => void exportReport('json')}>Descargar JSON</Button>
                <Button variant="light" disabled={exporting} onClick={() => void exportReport('csv')}>Descargar CSV</Button>
              </Group>
              {exportError && <Alert color="red" role="alert">{exportError}</Alert>}
            </Stack>
          </article>
        </Stack>
      )}
    </section>
  );
}
