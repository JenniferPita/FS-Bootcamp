
import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import {
  Alert,
  Button,
  Loader,
} from '@mantine/core';
import { supabase } from '../lib/supabase';

type ProductMetrics = {
  total: number;
  out_of_stock: number;
  low_stock: number;
};

type MovementMetrics = {
  total: number;
  entries: number;
  exits: number;
  initial: number;
};

type RecentMovement = {
  id: string;
  code: string;
  name: string;
  type: 'initial' | 'entry' | 'exit';
  quantity: number;
  unit: string;
  created_at: string;
  responsible_name: string;
};

type DashboardProduct = {
  id: string;
  code: string;
  name: string;
  unit: string;
  stock: number;
  minimum_stock: number;
};

type DashboardData = {
  products: ProductMetrics;
  movements: MovementMetrics;
  recent: RecentMovement[];
};

type DashboardContext = {
  company_name: string;
  warehouses: string[];
};

const movementLabels: Record<string, string> = {
  initial: 'Stock inicial',
  entry: 'Entrada',
  exit: 'Salida',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Guayaquil',
  }).format(new Date(value));
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [, setProductsList] =
  useState<DashboardProduct[]>([]);
  const [dashboardContext, setDashboardContext] =
  useState<DashboardContext | null>(null);


const loadDashboard = useCallback(async () => {
  setLoading(true);
  setError('');

  try {
    const [dashboardResponse, productsResponse] =
      await Promise.all([
        supabase.rpc('get_inventory_dashboard'),
        supabase.rpc('get_dashboard_products'),
      ]);

    if (dashboardResponse.error) {
      throw dashboardResponse.error;
    }

    if (productsResponse.error) {
      throw productsResponse.error;
    }

    setData(dashboardResponse.data as DashboardData);

    setProductsList(
      (productsResponse.data ?? []) as DashboardProduct[]
    );
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'No se pudo cargar el inventario.'
    );
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const products = data?.products;
  const movements = data?.movements;

  const maxMovements = Math.max(
    movements?.entries ?? 0,
    movements?.exits ?? 0,
    1
  );

  useEffect(() => {
  async function loadDashboardContext() {
    const { data, error } = await supabase.rpc(
      'get_dashboard_context'
    );

    if (error) {
      console.error('Error al cargar empresa y bodega:', error);
      return;
    }

    setDashboardContext(data as DashboardContext | null);
  }

  void loadDashboardContext();
  }, []);

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            ESPACIO DE TRABAJO
          </span>
          <h1>Resumen de inventario</h1>
          <p>
            Consulta los productos registrados y
            los movimientos de tu empresa.
          </p>
        </div>

        <Button
          variant="light"
          loading={loading}
          onClick={() => void loadDashboard()}
        >
          Actualizar
        </Button>
      </div>

      <div className="dashboard-context">
        <div className="dashboard-context-card">
          <span>Empresa</span>
          <strong>
            {dashboardContext?.company_name ?? 'Cargando...'}
          </strong>
        </div>

        <div className="dashboard-context-card">
          <span>Bodega</span>
          <strong>
            {dashboardContext
              ? dashboardContext.warehouses.join(', ') ||
                'Sin bodega registrada'
              : 'Cargando...'}
          </strong>
        </div>
      </div>

      {error && (
        <Alert color="red" title="No se pudo cargar el resumen">
          {error}
        </Alert>
      )}

      {loading && !data && (
        <div className="dashboard-loading">
          <Loader size="sm" />
          <span>Cargando indicadores...</span>
        </div>
      )}

      {data && (
        <>
          <div className="dashboard-kpis">
            <article className="dashboard-kpi">
              <span>Productos registrados</span>
              <strong>{products?.total ?? 0}</strong>
              <small>Catálogo de la empresa</small>
            </article>

            <article className="dashboard-kpi">
              <span>Sin existencias</span>
              <strong>{products?.out_of_stock ?? 0}</strong>
              <small>Productos con stock cero</small>
            </article>

            <article className="dashboard-kpi">
              <span>Bajo stock mínimo</span>
              <strong>{products?.low_stock ?? 0}</strong>
              <small>Con existencias, pero en nivel bajo</small>
            </article>

            <article className="dashboard-kpi">
              <span>Movimientos</span>
              <strong>{movements?.total ?? 0}</strong>
              <small>Últimos 30 días</small>
            </article>
          </div>

          <div className="dashboard-grid">
            <article className="dashboard-panel">
              <div className="dashboard-panel-title">
                <div>
                  <h2>Movimientos por tipo</h2>
                  <p>Últimos 30 días</p>
                </div>
              </div>

              <div className="dashboard-chart-row">
                <div className="dashboard-chart-label">
                  <span>Entradas</span>
                  <strong>{movements?.entries ?? 0}</strong>
                </div>
                <div className="dashboard-track">
                  <div
                    className="dashboard-bar"
                    style={{
                      width: `${
                        ((movements?.entries ?? 0) /
                          maxMovements) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="dashboard-chart-row">
                <div className="dashboard-chart-label">
                  <span>Salidas</span>
                  <strong>{movements?.exits ?? 0}</strong>
                </div>
                <div className="dashboard-track">
                  <div
                    className="dashboard-bar dashboard-bar-exit"
                    style={{
                      width: `${
                        ((movements?.exits ?? 0) /
                          maxMovements) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <p className="dashboard-footnote">
                Movimientos iniciales en el período:{' '}
                {movements?.initial ?? 0}
              </p>
            </article>

            <article className="dashboard-panel">
              <div className="dashboard-panel-title">
                <div>
                  <h2>Accesos rápidos</h2>
                  <p>Operaciones disponibles</p>
                </div>
              </div>

              <div className="dashboard-shortcuts">
                <NavLink to="/productos">
                  Productos
                </NavLink>
                <NavLink to="/entradas">
                  Entradas
                </NavLink>
                <NavLink to="/salidas">
                  Salidas
                </NavLink>
              </div>
              <p className="dashboard-footnote">
                Las operaciones siguen sujetas a
                los permisos de cada rol.
              </p>
            </article>
          </div>

          <article className="dashboard-panel">
            <div className="dashboard-panel-title">
              <div>
                <h2>Últimos movimientos</h2>
                <p>Las 10 operaciones más recientes</p>
              </div>
            </div>

            {data.recent.length === 0 ? (
              <p className="dashboard-empty">
                Todavía no hay movimientos registrados.
              </p>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Fecha</th>
                      <th>Responsable</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.recent.map((movement) => (
                      <tr key={movement.id}>
                        <td>
                          <strong>{movement.code}</strong>
                          <span>{movement.name}</span>
                        </td>
                        <td>
                          {movementLabels[movement.type] ??
                            movement.type}
                        </td>
                        <td>
                          {formatQuantity(movement.quantity)}{' '}
                          {movement.unit}
                        </td>
                        <td>
                          {formatDate(movement.created_at)}
                        </td>
                        <td>
                            {movement.responsible_name || 'Usuario no disponible'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </>
      )}
    </section>
  );
}
