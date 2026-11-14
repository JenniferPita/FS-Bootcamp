
import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  ChangeEvent,
  FormEvent,
} from 'react';

import { useNavigate } from 'react-router';

import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';

import { supabase } from '../lib/supabase';

// =============================================
// TIPOS
// =============================================

type Category = {
  id: string;
  name: string;
};

type Unit = 'unidades' | 'kg' | 'L' | 'm';

type RegisteredProduct = {
  code: string;
  name: string;
  quantity: number;
  unit: Unit;
};

// =============================================
// CONSTANTES
// =============================================

const MAX_IMAGE_FILE_BYTES = 12 * 1024 * 1024;

const MAX_BASE64_LENGTH = 550000;

const MAX_IMAGE_DIMENSION = 800;

const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const UNIT_OPTIONS = [
  {
    value: 'unidades',
    label: 'Unidades',
  },
  {
    value: 'kg',
    label: 'Kilogramos (kg)',
  },
  {
    value: 'L',
    label: 'Litros (L)',
  },
  {
    value: 'm',
    label: 'Metros (m)',
  },
];

// =============================================
// FUNCIONES AUXILIARES
// =============================================

function formatQuantity(quantity: number) {
  return new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: 2,
  }).format(quantity);
}

/**
 * Convierte una imagen a Base64 JPEG.
 * Reduce dimensiones y calidad hasta cumplir
 * el límite permitido por PostgreSQL.
 */
async function convertImageToBase64(
  file: File
): Promise<string> {
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      'Selecciona una imagen JPG, PNG o WebP.'
    );
  }

  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error(
      'La imagen original no puede superar 12 MB.'
    );
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();

      image.onerror = () => {
        reject(
          new Error('No se pudo procesar la imagen.')
        );
      };

      image.src = objectUrl;
    });

    if (!image.width || !image.height) {
      throw new Error(
        'La imagen no tiene dimensiones válidas.'
      );
    }

    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / image.width,
      MAX_IMAGE_DIMENSION / image.height
    );

    let width = Math.max(
      1,
      Math.round(image.width * scale)
    );

    let height = Math.max(
      1,
      Math.round(image.height * scale)
    );

    const canvas = document.createElement('canvas');

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error(
        'Tu navegador no permite procesar la imagen.'
      );
    }

    const qualities = [
      0.8,
      0.65,
      0.5,
      0.35,
    ];

    for (let attempt = 0; attempt < 4; attempt++) {
      canvas.width = width;
      canvas.height = height;

      // Fondo blanco para imágenes transparentes.
      context.fillStyle = '#FFFFFF';

      context.fillRect(
        0,
        0,
        width,
        height
      );

      context.drawImage(
        image,
        0,
        0,
        width,
        height
      );

      for (const quality of qualities) {
        const base64 = canvas.toDataURL(
          'image/jpeg',
          quality
        );

        if (base64.length <= MAX_BASE64_LENGTH) {
          return base64;
        }
      }

      width = Math.max(
        1,
        Math.round(width * 0.75)
      );

      height = Math.max(
        1,
        Math.round(height * 0.75)
      );
    }

    throw new Error(
      'No se pudo reducir la imagen al tamaño permitido.'
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// =============================================
// COMPONENTE PRINCIPAL
// =============================================

export default function Products() {
  const navigate = useNavigate();

  // =============================================
  // DATOS DEL PRODUCTO
  // =============================================

  const [code, setCode] = useState('');

  const [name, setName] = useState('');

  const [description, setDescription] = useState('');

  const [categoryId, setCategoryId] =
    useState<string | null>(null);

  const [unit, setUnit] =
    useState<Unit>('unidades');

  const [initialQuantity, setInitialQuantity] =
    useState<number | string>(0);

  const [minimumStock, setMinimumStock] =
    useState<number | string>(0);

  // =============================================
  // IMAGEN DEL PRODUCTO
  // =============================================

  const [imageBase64, setImageBase64] =
    useState<string | null>(null);

  const [imageName, setImageName] =
    useState('');

  const [imageError, setImageError] =
    useState('');

  const [processingImage, setProcessingImage] =
    useState(false);

  const imageRequestRef = useRef(0);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  // =============================================
  // CATEGORÍAS Y PERMISOS
  // =============================================

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [canCreate, setCanCreate] =
    useState(false);

  // =============================================
  // REGISTRO
  // =============================================

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    registeredProduct,
    setRegisteredProduct,
  ] = useState<RegisteredProduct | null>(null);

  // =============================================
  // CARGAR DATOS INICIALES
  // =============================================

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authData.user) {
          throw new Error(
            'Debes iniciar sesión para registrar productos.'
          );
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from('company_users')
          .select('role, is_active')
          .eq('id', authData.user.id)
          .single();

        if (
          profileError ||
          !profile?.is_active ||
          ![
            'administrator',
            'supervisor',
          ].includes(profile.role)
        ) {
          throw new Error(
            'Solo un Administrador o Supervisor activo puede registrar productos.'
          );
        }

        if (!mounted) return;

        setCanCreate(true);

        const {
          data: categoryData,
          error: categoryError,
        } = await supabase
          .from('categories')
          .select('id, name')
          .order('name');

        if (categoryError) {
          throw categoryError;
        }

        if (!mounted) return;

        setCategories(
          (categoryData ?? []) as Category[]
        );
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el formulario.'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      mounted = false;
      imageRequestRef.current += 1;
    };
  }, []);

  // =============================================
  // SELECCIONAR IMAGEN
  // =============================================

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const requestId =
      ++imageRequestRef.current;

    setImageError('');
    setProcessingImage(true);

    // Permite seleccionar otra vez el mismo archivo.
    event.target.value = '';

    try {
      const base64 =
        await convertImageToBase64(file);

      if (
        requestId !== imageRequestRef.current
      ) {
        return;
      }

      setImageBase64(base64);
      setImageName(file.name);
    } catch (err) {
      if (
        requestId !== imageRequestRef.current
      ) {
        return;
      }

      setImageError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la imagen.'
      );
    } finally {
      if (
        requestId === imageRequestRef.current
      ) {
        setProcessingImage(false);
      }
    }
  }

  // =============================================
  // ELIMINAR IMAGEN
  // =============================================

  function removeImage() {
    imageRequestRef.current += 1;

    setImageBase64(null);
    setImageName('');
    setImageError('');
    setProcessingImage(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // =============================================
  // REGISTRAR PRODUCTO
  // =============================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      saving ||
      loading ||
      processingImage
    ) {
      return;
    }

    setError('');

    if (!canCreate) {
      setError(
        'No tienes permisos para registrar productos.'
      );

      return;
    }

    const normalizedCode =
      code.trim().toUpperCase();

    const normalizedName =
      name.trim();

    if (
      !/^[A-Z0-9_-]{1,30}$/.test(normalizedCode)
    ) {
      setError(
        'El código debe tener entre 1 y 30 caracteres: letras, números, guiones o guion bajo.'
      );

      return;
    }

    if (
      normalizedName.length < 1 ||
      normalizedName.length > 100
    ) {
      setError(
        'El nombre debe tener entre 1 y 100 caracteres.'
      );

      return;
    }

    if (
      description.trim().length > 500
    ) {
      setError(
        'La descripción no puede superar 500 caracteres.'
      );

      return;
    }

    if (!categoryId) {
      setError('Selecciona una categoría.');

      return;
    }

    if (
      typeof initialQuantity !== 'number' ||
      typeof minimumStock !== 'number' ||
      !Number.isFinite(initialQuantity) ||
      !Number.isFinite(minimumStock)
    ) {
      setError(
        'Ingresa cantidades válidas.'
      );

      return;
    }

    if (
      initialQuantity < 0 ||
      minimumStock < 0
    ) {
      setError(
        'Las cantidades no pueden ser negativas.'
      );

      return;
    }

    const hasTwoDecimals = (value: number) =>
      Math.abs(
        value * 100 -
        Math.round(value * 100)
      ) < 1e-7;

    if (
      !hasTwoDecimals(initialQuantity) ||
      !hasTwoDecimals(minimumStock)
    ) {
      setError(
        'Solo se permiten dos decimales.'
      );

      return;
    }

    if (
      unit === 'unidades' &&
      (
        !Number.isInteger(initialQuantity) ||
        !Number.isInteger(minimumStock)
      )
    ) {
      setError(
        'Para unidades debes ingresar números enteros.'
      );

      return;
    }

    if (imageError) {
      setError(
        'Corrige el problema de la imagen antes de continuar.'
      );

      return;
    }

    setSaving(true);

    try {
      const {
        data: productId,
        error: rpcError,
      } = await supabase.rpc(
        'create_product',
        {
          p_code: normalizedCode,
          p_name: normalizedName,
          p_description:
            description.trim() || null,
          p_category_id: categoryId,
          p_unit: unit,
          p_initial_quantity:
            initialQuantity,
          p_minimum_stock:
            minimumStock,
          p_image_base64:
            imageBase64,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!productId) {
        throw new Error(
          'No se pudo confirmar el registro del producto.'
        );
      }

      setRegisteredProduct({
        code: normalizedCode,
        name: normalizedName,
        quantity: initialQuantity,
        unit,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo registrar el producto.'
      );
    } finally {
      setSaving(false);
    }
  }

  // =============================================
  // VOLVER AL LISTADO
  // =============================================

  function goToProducts() {
    setRegisteredProduct(null);

    navigate('/productos');
  }

  // =============================================
  // PANTALLA DE CARGA
  // =============================================

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <Group gap="sm">
          <Loader size="sm" />

          <Text>
            Cargando formulario...
          </Text>
        </Group>
      </div>
    );
  }

  // =============================================
  // INTERFAZ
  // =============================================

  return (
    <section
      className="dashboard-page"
      style={{
        paddingBottom: 40,
      }}
    >
      {/* ENCABEZADO CENTRADO */}
      <div
        className="dashboard-heading"
        style={{
          width: '100%',
          maxWidth: 800,
          margin: '0 auto 24px',
        }}
      >
        <div>
          <span className="eyebrow">
            GESTIÓN DE INVENTARIO
          </span>

          <h1>
            Registrar producto
          </h1>

          <p>
            Ingresa los datos del producto y,
            si lo deseas, agrega una imagen
            de referencia.
          </p>
        </div>
      </div>

      {/* MENSAJES DE ERROR */}
      {error && (
        <Alert
          color="red"
          title="No se pudo completar el registro"
          withCloseButton
          onClose={() => setError('')}
          mb="md"
          style={{
            maxWidth: 800,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {error}
        </Alert>
      )}

      {/* FORMULARIO CENTRADO */}
      {canCreate && (
        <Paper
          withBorder
          radius="lg"
          p="lg"
          style={{
            width: '100%',
            maxWidth: 800,
            margin: '0 auto',
            background: '#fff',
          }}
        >
          <form
            onSubmit={(event) =>
              void handleSubmit(event)
            }
          >
            <Stack gap="lg">

              {/* INFORMACIÓN DEL PRODUCTO */}
              <div>
                <Title order={4} mb="xs">
                  Información del producto
                </Title>

                <Text size="sm" c="dimmed">
                  Los campos marcados con *
                  son obligatorios.
                </Text>
              </div>

              <TextInput
                label="Código del producto"
                placeholder="Ej. PROD-001"
                value={code}
                onChange={(event) =>
                  setCode(
                    event.currentTarget.value.toUpperCase()
                  )
                }
                maxLength={30}
                required
              />

              <TextInput
                label="Nombre del producto"
                placeholder="Ej. Motor eléctrico trifásico"
                value={name}
                onChange={(event) =>
                  setName(event.currentTarget.value)
                }
                maxLength={100}
                required
              />

              <Textarea
                label="Descripción"
                placeholder="Características o información adicional"
                value={description}
                onChange={(event) =>
                  setDescription(event.currentTarget.value)
                }
                maxLength={500}
                minRows={3}
                autosize
              />

              <Select
                label="Categoría"
                placeholder="Selecciona una categoría"
                data={categories.map(
                  (category) => ({
                    value: category.id,
                    label: category.name,
                  })
                )}
                value={categoryId}
                onChange={setCategoryId}
                searchable
                required
                nothingFoundMessage="Sin categorías disponibles"
              />

              <Select
                label="Unidad de medida"
                data={UNIT_OPTIONS}
                value={unit}
                onChange={(value) => {
                  if (value) {
                    setUnit(value as Unit);
                  }
                }}
                allowDeselect={false}
                required
              />

              <Group grow align="start">
                <NumberInput
                  label="Stock inicial"
                  value={initialQuantity}
                  onChange={setInitialQuantity}
                  min={0}
                  decimalScale={2}
                  allowNegative={false}
                  thousandSeparator={false}
                  required
                />

                <NumberInput
                  label="Stock mínimo"
                  value={minimumStock}
                  onChange={setMinimumStock}
                  min={0}
                  decimalScale={2}
                  allowNegative={false}
                  thousandSeparator={false}
                  required
                />
              </Group>

              {/* IMAGEN DE REFERENCIA */}
              <div
                style={{
                  borderTop:
                    '1px solid #e9ecef',
                  paddingTop: 20,
                }}
              >
                <Title order={4} mb={4}>
                  Imagen de referencia
                </Title>

                <Text
                  size="sm"
                  c="dimmed"
                  mb="md"
                >
                  Opcional. Agrega una fotografía
                  para identificar el producto.
                </Text>

                <div
                  className="product-image-area"
                >
                  {/* INPUT OCULTO */}
                  <input
                    ref={fileInputRef}
                    id="product-image-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="product-image-file-input"
                    disabled={
                      saving || processingImage
                    }
                    onChange={(event) =>
                      void handleImageChange(event)
                    }
                    aria-label="Seleccionar imagen del producto"
                  />

                  {/* BOTÓN AZUL PERSONALIZADO */}
                  <Button
                    type="button"
                    className="product-image-select-button"
                    disabled={
                      saving || processingImage
                    }
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    leftSection={
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    }
                  >
                    Seleccionar imagen
                  </Button>

                  {/* PROCESANDO */}
                  {processingImage && (
                    <Group
                      justify="center"
                      gap="sm"
                      mt="md"
                    >
                      <Loader size="xs" />

                      <Text size="sm">
                        Procesando imagen...
                      </Text>
                    </Group>
                  )}

                  {/* VISTA PREVIA */}
                  {imageBase64 && (
                    <Stack
                      align="center"
                      gap="sm"
                      mt="md"
                    >
                      <div
                        className="product-image-preview"
                      >
                        <img
                          src={imageBase64}
                          alt="Vista previa del producto"
                          className="product-image-preview-photo"
                        />

                        {/* BOTÓN ROJO X */}
                        <button
                          type="button"
                          className="product-image-remove-button"
                          onClick={removeImage}
                          disabled={saving}
                          aria-label="Eliminar imagen"
                          title="Eliminar imagen"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      </div>

                      <Text
                        size="xs"
                        c="dimmed"
                        ta="center"
                        style={{
                          overflowWrap:
                            'anywhere',
                        }}
                      >
                        {imageName}
                      </Text>
                    </Stack>
                  )}
                </div>

                {/* ERROR DE IMAGEN */}
                {imageError && (
                  <Alert
                    color="red"
                    mt="sm"
                  >
                    {imageError}
                  </Alert>
                )}
              </div>

              {/* BOTONES DEL FORMULARIO */}
              <Group
                justify="flex-end"
                mt="md"
              >
                <Button
                  type="button"
                  variant="default"
                  disabled={saving}
                  onClick={() =>
                    navigate('/productos')
                  }
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  loading={saving}
                  disabled={
                    !canCreate ||
                    processingImage ||
                    Boolean(imageError)
                  }
                >
                  Registrar producto
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      )}

      {/* MODAL DE REGISTRO EXITOSO */}
      <Modal
        opened={
          registeredProduct !== null
        }
        onClose={goToProducts}
        title="Producto registrado"
        centered
        radius="lg"
        closeOnClickOutside={false}
      >
        {registeredProduct && (
          <Stack gap="md">
            <Text>
              El producto fue registrado
              correctamente.
            </Text>

            <Paper
              withBorder
              radius="md"
              p="md"
              bg="gray.0"
            >
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Código
                  </Text>

                  <Text fw={600}>
                    {registeredProduct.code}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Producto
                  </Text>

                  <Text fw={600}>
                    {registeredProduct.name}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Stock inicial
                  </Text>

                  <Text fw={600}>
                    {formatQuantity(
                      registeredProduct.quantity
                    )}{' '}
                    {registeredProduct.unit}
                  </Text>
                </Group>
              </Stack>
            </Paper>

            <Button
              fullWidth
              onClick={goToProducts}
            >
              Aceptar
            </Button>
          </Stack>
        )}
      </Modal>
    </section>
  );
}
