
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { NavLink } from 'react-router';

import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';

import { supabase } from '../lib/supabase';

type Product = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category_name: string | null;
  unit: string;
  stock: number;
  minimum_stock: number;
  is_active: boolean;
  image_base64: string | null;
  created_at: string;
};

type StatusFilter = 'active' | 'inactive' | 'all';

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

function formatQuantity(value: number) {
  return new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return 'No disponible';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeZone: 'America/Guayaquil',
  }).format(date);
}

function getStockStatus(product: Product) {
  if (product.stock <= 0) {
    return {
      text: 'Agotado',
      className: 'stock-status-out',
    };
  }

  if (
    product.minimum_stock > 0 &&
    product.stock <= product.minimum_stock
  ) {
    return {
      text: 'Stock bajo',
      className: 'stock-status-low',
    };
  }

  return {
    text: 'Disponible',
    className: 'stock-status-ok',
  };
}

function ProductPhoto({
  image,
  name,
  large = false,
}: {
  image: string | null;
  name: string;
  large?: boolean;
}) {
  return (
    <div
      className={
        large
          ? 'product-detail-photo'
          : 'product-list-photo'
      }
    >
      {image ? (
        <img
          src={image}
          alt={`Imagen de ${name}`}
          loading="lazy"
        />
      ) : (
        <div className="product-photo-placeholder">
          <svg
            width={large ? 46 : 24}
            height={large ? 46 : 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
            />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>

          {large && (
            <Text size="xs" c="dimmed">
              Sin imagen de referencia
            </Text>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="product-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function ProductsList() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [canManage, setCanManage] =
    useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [confirmStatusChange, setConfirmStatusChange] =
    useState(false);

  const [confirmDelete, setConfirmDelete] = 
    useState(false);

  // ========================================
  // CONSULTAR PRODUCTOS
  // ========================================

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        'get_dashboard_products'
      );

      if (rpcError) {
        throw rpcError;
      }

      const result = (data ?? []) as Product[];

      setProducts(result);

      // Actualizar el modal si está abierto.
      setSelectedProduct((previous) => {
        if (!previous) return null;

        return (
          result.find(
            (product) => product.id === previous.id
          ) ?? null
        );
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron consultar los productos.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // PERMISOS DEL USUARIO
  // ========================================

  useEffect(() => {
    let mounted = true;

    async function loadPermissions() {
      const {
        data: auth,
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError || !auth.user) {
        setCanManage(false);
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('company_users')
        .select('role, is_active')
        .eq('id', auth.user.id)
        .single();

      if (!mounted) return;

      setCanManage(
        !profileError &&
        profile?.is_active === true &&
        (
          profile.role === 'administrator' ||
          profile.role === 'supervisor'
        )
      );
    }

    void loadPermissions();
    void loadProducts();

    return () => {
      mounted = false;
    };
  }, [loadProducts]);

  // ========================================
  // FILTRAR PRODUCTOS
  // ========================================

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        product.code.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' ||
        (
          statusFilter === 'active' &&
          product.is_active
        ) ||
        (
          statusFilter === 'inactive' &&
          !product.is_active
        );

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const activeCount = products.filter(
    (product) => product.is_active
  ).length;

  const inactiveCount =
    products.length - activeCount;

  // ========================================
  // ACTIVAR / DESACTIVAR PRODUCTO
  // ========================================

  async function changeProductStatus() {
    if (
      !selectedProduct ||
      !canManage ||
      saving
    ) {
      return;
    }

    const product = selectedProduct;
    const newStatus = !product.is_active;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        'set_product_active',
        {
          p_product_id: product.id,
          p_is_active: newStatus,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const updated = Array.isArray(data)
        ? data[0]
        : null;

      if (
        !updated ||
        updated.product_id !== product.id ||
        updated.active !== newStatus
      ) {
        throw new Error(
          'No se pudo confirmar el cambio de estado.'
        );
      }

      setConfirmStatusChange(false);

      // Actualizar estado inmediatamente.
      setProducts((previous) =>
        previous.map((item) =>
          item.id === product.id
            ? {
                ...item,
                is_active: newStatus,
              }
            : item
        )
      );

      setSelectedProduct({
        ...product,
        is_active: newStatus,
      });

      setNotice(
        newStatus
          ? `Producto ${product.code} reactivado correctamente.`
          : `Producto ${product.code} desactivado correctamente.`
      );

      // Sincronizar con los datos reales.
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el estado del producto.'
      );

      // Consultar nuevamente por si la respuesta
      // se perdió después de ejecutar el cambio.
      setConfirmStatusChange(false);
      await loadProducts();
    } finally {
      setSaving(false);
    }
  }


  async function deleteSelectedProduct() {
    if (
      !selectedProduct ||
      !canManage ||
      saving ||
      !confirmDelete
    ) {
      return;
    }

    const product = selectedProduct;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const { data, error: rpcError } =
        await supabase.rpc('delete_product', {
          p_product_id: product.id,
        });

      if (rpcError) {
        throw rpcError;
      }

      if (data !== product.code) {
        throw new Error(
          'No se pudo confirmar la eliminación.'
        );
      }

      setConfirmDelete(false);
      setSelectedProduct(null);

      setProducts((previous) =>
        previous.filter(
          (item) => item.id !== product.id
        )
      );

      setNotice(
        `El producto ${product.code} fue eliminado definitivamente.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo confirmar la eliminación.'
      );

      // Actualizar el listado si la respuesta del servidor
      // se perdió después de realizar la eliminación.
      await loadProducts();
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <section className="dashboard-page">
      {/* ENCABEZADO */}
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            GESTIÓN DE INVENTARIO
          </span>

          <h1>Productos</h1>

          <p>
            Consulta los productos y su información
            de inventario.
          </p>
        </div>

        <div className="products-page-actions">
          <Button
            variant="light"
            loading={loading}
            onClick={() => {
              setNotice('');
              void loadProducts();
            }}
          >
            Actualizar
          </Button>

          {canManage && (
            <Button
              component={NavLink}
              to="/productos/nuevo"
            >
              + Nuevo producto
            </Button>
          )}
        </div>
      </div>

      {/* MENSAJES */}
      {error && (
        <Alert
          color="red"
          title="No se pudo completar la operación"
          withCloseButton
          onClose={() => setError('')}
          mb="md"
        >
          {error}
        </Alert>
      )}

      {notice && (
        <Alert
          color="green"
          title="Operación completada"
          withCloseButton
          onClose={() => setNotice('')}
          mb="md"
        >
          {notice}
        </Alert>
      )}

      {/* LISTADO */}
      <article className="dashboard-panel">
        <div className="dashboard-products-header">
          <div>
            <h2>Inventario registrado</h2>

            <p>
              {activeCount} activos ·{' '}
              {inactiveCount} inactivos
            </p>
          </div>

          <div className="products-filters">
            <input
              type="search"
              className="dashboard-search"
              placeholder="Buscar código o nombre..."
              aria-label="Buscar productos"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <Select
              aria-label="Filtrar por estado"
              data={STATUS_FILTERS}
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(
                  (value ?? 'active') as StatusFilter
                )
              }
              allowDeselect={false}
              w={155}
            />
          </div>
        </div>

        {loading && products.length === 0 ? (
          <div className="dashboard-loading">
            <Loader size="sm" />
            <span>Cargando productos...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="dashboard-empty">
            {products.length === 0
              ? 'Todavía no hay productos registrados.'
              : 'No hay productos que coincidan con los filtros.'}
          </p>
        ) : (
          <div className="dashboard-table-scroll">
            <table className="dashboard-table products-table">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Stock actual</th>
                  <th>Stock mínimo</th>
                  <th>Inventario</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const stockStatus =
                    getStockStatus(product);

                  return (
                    <tr
                      key={product.id}
                      className="product-clickable-row"
                      tabIndex={0}
                      role="button"
                      aria-label={
                        `Ver detalles de ${product.name}`
                      }
                      onClick={() =>
                        setSelectedProduct(product)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' ||
                          event.key === ' '
                        ) {
                          event.preventDefault();
                          setSelectedProduct(product);
                        }
                      }}
                    >
                      <td>
                        <ProductPhoto
                          image={product.image_base64}
                          name={product.name}
                        />
                      </td>

                      <td>
                        <strong>{product.code}</strong>
                      </td>

                      <td>{product.name}</td>

                      <td>
                        <strong>
                          {formatQuantity(product.stock)}
                        </strong>{' '}
                        {product.unit}
                      </td>

                      <td>
                        {formatQuantity(
                          product.minimum_stock
                        )}{' '}
                        {product.unit}
                      </td>

                      <td>
                        <span
                          className={
                            `stock-status ${stockStatus.className}`
                          }
                        >
                          {stockStatus.text}
                        </span>
                      </td>

                      <td>
                        <Badge
                          color={
                            product.is_active
                              ? 'blue'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {product.is_active
                            ? 'Activo'
                            : 'Inactivo'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* MODAL DE DETALLES */}
      <Modal
        opened={selectedProduct !== null}
        onClose={() => {
          if (!saving && !confirmStatusChange) {
            setSelectedProduct(null);
          }
        }}
        title="Detalle del producto"
        centered
        size="lg"
        radius="lg"
        closeOnClickOutside={!saving}
        closeOnEscape={!saving}
      >
        {selectedProduct && (
          <Stack gap="lg">
            <ProductPhoto
              image={selectedProduct.image_base64}
              name={selectedProduct.name}
              large
            />

            <div className="product-detail-heading">
              <Title order={3}>
                {selectedProduct.name}
              </Title>

              <Badge
                color={
                  selectedProduct.is_active
                    ? 'green'
                    : 'gray'
                }
                variant="light"
              >
                {selectedProduct.is_active
                  ? 'Activo'
                  : 'Inactivo'}
              </Badge>
            </div>

            <div className="product-detail-info">
              <DetailRow
                label="Código"
                value={selectedProduct.code}
              />

              <DetailRow
                label="Categoría"
                value={
                  selectedProduct.category_name ||
                  'Sin categoría'
                }
              />

              <DetailRow
                label="Unidad de medida"
                value={selectedProduct.unit}
              />

              <DetailRow
                label="Stock actual"
                value={
                  `${formatQuantity(selectedProduct.stock)} ${selectedProduct.unit}`
                }
              />

              <DetailRow
                label="Stock mínimo"
                value={
                  `${formatQuantity(selectedProduct.minimum_stock)} ${selectedProduct.unit}`
                }
              />

              <DetailRow
                label="Inventario"
                value={
                  <span
                    className={
                      `stock-status ${
                        getStockStatus(selectedProduct).className
                      }`
                    }
                  >
                    {getStockStatus(selectedProduct).text}
                  </span>
                }
              />

              <DetailRow
                label="Fecha de registro"
                value={formatDate(
                  selectedProduct.created_at
                )}
              />
            </div>

            <div className="product-detail-description">
              <Text size="sm" fw={600}>
                Descripción
              </Text>

              <Text size="sm" c="dimmed">
                {selectedProduct.description?.trim() ||
                  'Este producto no tiene descripción.'}
              </Text>
            </div>

            {/* BOTONES DEL MODAL */}
            
            <div className="product-detail-actions">
              <Button
                variant="default"
                disabled={saving}
                onClick={() => setSelectedProduct(null)}
              >
                Cerrar
              </Button>

              {canManage && (
                <>
                  <Button
                    variant="light"
                    color={selectedProduct.is_active ? 'orange' : 'green'}
                    disabled={saving}
                    onClick={() => setConfirmStatusChange(true)}
                  >
                    {selectedProduct.is_active
                      ? 'Desactivar producto'
                      : 'Reactivar producto'}
                  </Button>

                  <Button
                    color="red"
                    disabled={saving}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Eliminar producto
                  </Button>
                </>
              )}
            </div>

          </Stack>
        )}
      </Modal>

      {/* CONFIRMACIÓN DE CAMBIO DE ESTADO */}
      <Modal
        opened={confirmStatusChange}
        onClose={() => {
          if (!saving) {
            setConfirmStatusChange(false);
          }
        }}
        title={
          selectedProduct?.is_active
            ? 'Confirmar desactivación'
            : 'Confirmar reactivación'
        }
        centered
        radius="lg"
        size="sm"
        closeOnClickOutside={!saving}
        closeOnEscape={!saving}
        withCloseButton={!saving}
        zIndex={300}
      >
        {selectedProduct && (
          <Stack gap="lg">
            <Text size="sm">
              ¿Deseas{' '}
              <strong>
                {selectedProduct.is_active
                  ? 'desactivar'
                  : 'reactivar'}
              </strong>{' '}
              el producto{' '}
              <strong>{selectedProduct.name}</strong>?
            </Text>

            {selectedProduct.is_active && (
              <Alert color="yellow">
                El producto conservará su stock
                y movimientos anteriores, pero no
                permitirá nuevas entradas ni salidas
                mientras esté inactivo.
              </Alert>
            )}

            <Group justify="flex-end">
              <Button
                variant="default"
                disabled={saving}
                onClick={() =>
                  setConfirmStatusChange(false)
                }
              >
                Cancelar
              </Button>

              <Button
                color={
                  selectedProduct.is_active
                    ? 'red'
                    : 'blue'
                }
                loading={saving}
                onClick={() =>
                  void changeProductStatus()
                }
              >
                Confirmar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* CONFIRMACIÓN DE ELIMINACIÓN DEFINITIVA */}
      <Modal
        opened={confirmDelete}
        onClose={() => {
          if (!saving) {
            setConfirmDelete(false);
          }
        }}
        title="Eliminar producto definitivamente"
        centered
        radius="lg"
        size="sm"
        zIndex={400}
        closeOnClickOutside={!saving}
        closeOnEscape={!saving}
        withCloseButton={!saving}
      >
        {selectedProduct && (
          <Stack gap="lg">
            <Text size="sm">
              ¿Estás seguro de que deseas eliminar
              definitivamente el producto{' '}
              <strong>{selectedProduct.name}</strong>
              {' '}({selectedProduct.code})?
            </Text>

            <Alert color="red" title="Esta acción no se puede deshacer">
              Se eliminarán el producto, su imagen y todos
              sus movimientos de inventario asociados.
              También cambiarán las estadísticas e
              indicadores históricos del inventario.
            </Alert>

            <Group justify="flex-end">
              <Button
                variant="default"
                disabled={saving}
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </Button>

              <Button
                color="red"
                loading={saving}
                onClick={() => void deleteSelectedProduct()}
              >
                Sí, eliminar definitivamente
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

    </section>
  );
}

