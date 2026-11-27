import { z } from 'zod';
import { supabase } from './supabase';

const productSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().trim().min(1),
  stock: z.number().nonnegative(),
  minimum_stock: z.number().nonnegative(),
  is_active: z.boolean(),
});

export const inventorySchema = z.array(productSchema);
export type AnalysisMode = 'normal' | 'mock' | 'failure' | 'invalid';
const responseSchema = z.object({
  summary: z.string().min(1),
  risk: z.enum(['Bajo', 'Medio', 'Alto', 'Sin datos']),
  total: z.number().int().nonnegative(),
  outOfStock: z.number().int().nonnegative(),
  lowStock: z.number().int().nonnegative(),
  recommendations: z.array(z.string().min(1)).min(1),
}).refine((r) => r.outOfStock + r.lowStock <= r.total);
export type InventoryAnalysisResult = z.infer<typeof responseSchema>;

async function mockService(input: z.infer<typeof inventorySchema>, mode: AnalysisMode): Promise<unknown> {
  await new Promise<void>((resolve) => setTimeout(resolve, 650));
  if (mode === 'failure') throw new Error('Fallo simulado del servicio de análisis. Puedes reintentar.');
  if (mode === 'invalid') return { summary: null, risk: 'unknown' };
  const active = input.filter((p) => p.is_active);
  const empty = active.filter((p) => p.stock === 0);
  const low = active.filter((p) => p.stock > 0 && p.minimum_stock > 0 && p.stock <= p.minimum_stock);
  const recommendations = [
    ...empty.map((p) => `Priorizar reposición de ${p.name} (${p.code}): sin existencias.`),
    ...low.map((p) => `Revisar reposición de ${p.name} (${p.code}): stock ${p.stock}, mínimo ${p.minimum_stock}.`),
  ];
  if (!recommendations.length) recommendations.push(active.length ? 'Mantener seguimiento periódico de las existencias.' : 'Registrar o activar productos antes de evaluar el inventario.');
  return {
    summary: active.length ? `Se analizaron ${active.length} productos activos: ${empty.length} agotados y ${low.length} con stock bajo.` : 'No hay productos activos para analizar.',
    risk: !active.length ? 'Sin datos' : empty.length ? 'Alto' : low.length ? 'Medio' : 'Bajo',
    total: active.length,
    outOfStock: empty.length,
    lowStock: low.length,
    recommendations,
  };
}

export async function analyzeInventory(input: unknown, mode: AnalysisMode): Promise<InventoryAnalysisResult> {
  const parsed = inventorySchema.safeParse(input);
  if (!parsed.success) throw new Error('Los datos del inventario no son válidos. Revisa las existencias.');
  let response: unknown;
  if (mode === 'normal') {
    const active = parsed.data.filter((p) => p.is_active);
    if (!active.length) throw new Error('No hay productos activos para analizar.');
    if (active.length > 200) throw new Error('El análisis admite hasta 200 productos activos.');
    const products = active.map(({ code, name, stock, minimum_stock, unit }) => ({ code, name, stock, minimum_stock, unit }));
    const { data, error } = await supabase.functions.invoke('analyze-inventory', { body: { products } });
    if (error) throw new Error('No se pudo consultar Gemini. Revisa la conexión e intenta nuevamente.');
    const ai = z.object({
      summary: z.string().min(1),
      risk: z.enum(['low', 'medium', 'high']),
      recommendations: z.array(z.string().min(1)).min(1),
    }).safeParse(data);
    if (!ai.success) throw new Error('El servicio devolvió una respuesta inválida. Puedes reintentar.');
    const risks = { low: 'Bajo', medium: 'Medio', high: 'Alto' } as const;
    response = {
      ...ai.data,
      risk: risks[ai.data.risk],
      total: active.length,
      outOfStock: active.filter((p) => p.stock === 0).length,
      lowStock: active.filter((p) => p.stock > 0 && p.minimum_stock > 0 && p.stock <= p.minimum_stock).length,
    };
  } else {
    response = await mockService(parsed.data, mode);
  }
  const result = responseSchema.safeParse(response);
  if (!result.success) throw new Error('El servicio devolvió una respuesta inválida. Puedes reintentar.');
  return result.data;
}
