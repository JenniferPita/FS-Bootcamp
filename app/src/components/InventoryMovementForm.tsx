
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert,
  Button,
  Container,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { supabase } from '../lib/supabase';

type MovementType = 'entry' | 'exit';

type Product = {
  id: string;
  code: string;
  name: string;
  unit: string;
};

type PendingMovement = {
  version: 1;
  userId: string;
  companyId: string;
  productId: string;
  productLabel: string;
  unit: string;
  quantity: string;
  movementType: MovementType;
  idempotencyKey: string;
  createdAt: string;
};

type MovementResult = {
  movement_id: string;
  resulting_stock: number | string;
  was_replayed: boolean;
};

type Props = {
  movementType: MovementType;
};

const STORAGE_PREFIX = 'stockflow:pending-movement:v1';

function storageKey(userId: string, companyId: string) {
  return `${STORAGE_PREFIX}:${userId}:${companyId}`;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function isPendingMovement(
  value: unknown
): value is PendingMovement {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    item.version === 1 &&
    isUuid(item.userId) &&
    isUuid(item.companyId) &&
    isUuid(item.productId) &&
    isUuid(item.idempotencyKey) &&
    typeof item.productLabel === 'string' &&
    item.productLabel.length > 0 &&
    typeof item.unit === 'string' &&
    typeof item.quantity === 'string' &&
    item.quantity.length > 0 &&
    (item.movementType === 'entry' ||
      item.movementType === 'exit') &&
    typeof item.createdAt === 'string'
  );
}

function validateQuantity(
  value: string,
  unit: string
): string {
  const clean = value.trim();

  const expression =
    unit === 'unidades'
      ? /^\d+$/
      : /^\d+(?:\.\d{1,2})?$/;

  if (!expression.test(clean)) {
    throw new Error(
      unit === 'unidades'
        ? 'La cantidad debe ser un número entero.'
        : 'La cantidad admite hasta dos decimales.'
    );
  }

  const integerPart =
    clean.split('.')[0].replace(/^0+/, '') || '0';

  if (integerPart.length > 18) {
    throw new Error('La cantidad es demasiado grande.');
  }

  if (!/[1-9]/.test(clean)) {
    throw new Error('La cantidad debe ser mayor que cero.');
  }

  return clean;
}

export default function InventoryMovementForm({
  movementType,
}: Props) {
  const isEntry = movementType === 'entry';
  const title = isEntry
    ? 'Entrada de inventario'
    : 'Salida de inventario';

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string | null>(
    null
  );
  const [quantity, setQuantity] = useState('');

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [key, setKey] = useState<string | null>(null);

  const [pending, setPending] =
    useState<PendingMovement | null>(null);

  const [blocked, setBlocked] = useState(false);
  const [sending, setSending] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const sendingRef = useRef(false);

  const selectedProduct = products.find(
    (product) => product.id === productId
  );

  const pendingOnThisPage =
    pending?.movementType === movementType;

  // ==========================================
  // 1. AUTENTICACIÓN Y RECUPERACIÓN
  // ==========================================

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError || !auth.user) {
          throw new Error('Debes iniciar sesión.');
        }

        const userId = auth.user.id;

        const { data: profile, error: profileError } =
          await supabase
            .from('company_users')
            .select('company_id, role, is_active')
            .eq('id', userId)
            .single();

        if (
          profileError ||
          !profile?.is_active ||
          !['administrator', 'supervisor', 'operator'].includes(profile.role)
        ) {
          throw new Error(
            'Solo los usuarios activos con un rol autorizado pueden registrar movimientos.'
          );
        }

        const companyId = profile.company_id as string;

        if (!isUuid(companyId)) {
          throw new Error('Empresa del usuario inválida.');
        }

        const currentKey = storageKey(
          userId,
          companyId
        );

        // Leer primero la operación pendiente.
        // No dependemos de que la suscripción siga
        // vigente para intentar recuperar una
        // operación previamente registrada.
        let saved: string | null;

        try {
          saved = window.localStorage.getItem(
            currentKey
          );
        } catch {
          throw new Error(
            'No se puede acceder al almacenamiento local. ' +
            'No se habilitan operaciones para evitar ' +
            'perder la clave de idempotencia.'
          );
        }

        let restored: PendingMovement | null = null;

        if (saved !== null) {
          let parsed: unknown;

          try {
            parsed = JSON.parse(saved) as unknown;
          } catch {
            throw new Error(
              'Hay una solicitud guardada con formato inválido. ' +
              'No se sobrescribirá automáticamente.'
            );
          }

          if (
            !isPendingMovement(parsed) ||
            parsed.userId !== userId ||
            parsed.companyId !== companyId
          ) {
            throw new Error(
              'La solicitud guardada no es válida ' +
              'para esta sesión. No se sobrescribirá.'
            );
          }

          restored = parsed;
        }

        // La consulta de productos puede devolver
        // cero resultados si la suscripción venció.
        // Esto no debe borrar la solicitud pendiente.
        const { data: productData, error: productsError } =
          await supabase
            .from('products')
            .select('id, code, name, unit')
            .order('code');

        if (productsError) {
          throw new Error(productsError.message);
        }

        if (mounted) {
          setKey(currentKey);
          setPending(restored);
          setProducts(productData ?? []);
          setAuthorized(true);
        }
      } catch (error) {
        if (mounted) {
          setBlocked(true);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo preparar el formulario.'
          );
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================
  // 2. PREPARAR Y GUARDAR ANTES DE ENVIAR
  // ==========================================

  async function prepareMovement(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    if (blocked || pending || !key) {
      return;
    }

    if (!selectedProduct) {
      setErrorMessage('Selecciona un producto.');
      return;
    }

    try {
      const cleanQuantity = validateQuantity(
        quantity,
        selectedProduct.unit
      );

      // Refrescar identidad antes de construir
      // una nueva operación.
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error('La sesión ya no está disponible.');
      }

      const { data: profile } =
        await supabase
          .from('company_users')
          .select('company_id, role, is_active')
          .eq('id', auth.user.id)
          .single();

      if (
        !profile ||
        !profile.is_active ||
        !['administrator', 'supervisor', 'operator'].includes(
          profile.role
        )
      ) {
        throw new Error(
          'El usuario ya no está autorizado.'
        );
      }

      const expectedKey = storageKey(
        auth.user.id,
        profile.company_id as string
      );

      if (expectedKey !== key) {
        throw new Error(
          'La sesión cambió. Recarga el formulario.'
        );
      }

      // No sobrescribir solicitudes anteriores.
      const existing = window.localStorage.getItem(
        key
      );

      if (existing !== null) {
        setBlocked(true);
        throw new Error(
          'Ya existe una solicitud pendiente guardada. ' +
          'Recarga la página para recuperarla.'
        );
      }

      const movement: PendingMovement = {
        version: 1,
        userId: auth.user.id,
        companyId: profile.company_id as string,
        productId: selectedProduct.id,
        productLabel:
          `${selectedProduct.code} - ${selectedProduct.name}`,
        unit: selectedProduct.unit,
        quantity: cleanQuantity,
        movementType,
        idempotencyKey: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      // Guardar ANTES de cualquier llamada RPC.
      window.localStorage.setItem(
        key,
        JSON.stringify(movement)
      );

      // Comprobar que realmente quedó guardado.
      if (
        window.localStorage.getItem(key) !==
        JSON.stringify(movement)
      ) {
        throw new Error(
          'No fue posible verificar el guardado local.'
        );
      }

      setPending(movement);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo preparar la operación.'
      );
    }
  }

  // ==========================================
  // 3. ENVIAR O REINTENTAR SIN CAMBIAR LA CLAVE
  // ==========================================

  async function confirmMovement() {
    if (
      !pending ||
      !pendingOnThisPage ||
      !key ||
      sendingRef.current
    ) {
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setErrorMessage('');

    try {
      // Antes de enviar, comprobar que se
      // conserva exactamente la misma solicitud.
      const stored = window.localStorage.getItem(
        key
      );

      if (stored !== JSON.stringify(pending)) {
        throw new Error(
          'La solicitud guardada cambió. ' +
          'Se detuvo el envío por seguridad.'
        );
      }

      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (
        authError ||
        auth.user?.id !== pending.userId
      ) {
        throw new Error(
          'La sesión cambió. No se enviará la operación.'
        );
      }

      const { data, error } = await supabase.rpc(
        'process_inventory_movement',
        {
          p_product_id: pending.productId,
          p_movement_type: pending.movementType,
          p_quantity: pending.quantity,
          p_idempotency_key: pending.idempotencyKey,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const result =
        (data as MovementResult[] | null)?.[0];

      if (!result?.movement_id) {
        throw new Error(
          'El servidor no devolvió un movimiento confirmado.'
        );
      }

      // Solo borramos la solicitud cuando
      // el servidor devuelve un movimiento.
      window.localStorage.removeItem(key);

      setSuccessMessage(
        `${isEntry ? 'Entrada' : 'Salida'} ` +
        (result.was_replayed
          ? 'recuperada correctamente.'
          : 'registrada correctamente.') //+
        //` Movimiento: ${result.movement_id}.` +
        //` Existencia informada: ${result.resulting_stock} ` +
        // pending.unit +
        // (result.was_replayed
        //   ? ' (existencia actual, no necesariamente histórica).'
        //   : '.')
      );

      setPending(null);
      setProductId(null);
      setQuantity('');
    } catch (error) {
      // NUNCA generar una clave nueva aquí.
      // La solicitud permanece en localStorage.
      setErrorMessage(
        (error instanceof Error
          ? error.message
          : 'Error al comunicarse con PostgreSQL.') +
        ' La solicitud pendiente se conserva. ' +
        'Puedes reintentar con la misma clave.'
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  // ==========================================
  // 4. DESCARTE EXPLÍCITO
  // ==========================================

  function discardPending() {
    if (!pending || !key || sendingRef.current) {
      return;
    }

    const accepted = window.confirm(
      'ATENCIÓN: si la operación fue registrada ' +
      'pero su respuesta se perdió, descartarla ' +
      'no revierte el movimiento en PostgreSQL. ' +
      'Si vuelves a realizarla con otra clave, ' +
      'podrías duplicar la operación.\n\n' +
      'Descarta únicamente solicitudes que sabes ' +
      'que no se ejecutaron o después de verificar ' +
      'el historial con un administrador.\n\n' +
      '¿Confirmas el descarte?'
    );

    if (!accepted) return;

    try {
      const stored = window.localStorage.getItem(
        key
      );

      if (stored !== JSON.stringify(pending)) {
        throw new Error(
          'La solicitud cambió. Recarga la página.'
        );
      }

      window.localStorage.removeItem(key);
      setPending(null);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo descartar la solicitud.'
      );
    }
  }

  // ==========================================
  // 5. INTERFAZ
  // ==========================================

  if (checking) {
    return <Text>Preparando movimientos...</Text>;
  }

  if (!authorized || blocked) {
    return (
      <Alert color="red" title="Formulario bloqueado">
        {errorMessage}
      </Alert>
    );
  }

  return (
    <Container size="sm" py="md">
      <Paper withBorder radius="md" p="xl">
        <Stack gap="md">
          <Title order={2}>{title}</Title>

          <Text c="dimmed" size="sm">
            {isEntry ? 'ET-05' : 'ET-06'} ·
            Recuperación segura de solicitudes
          </Text>

          {pending && (
            <Alert
              color="yellow"
              title="Existe una solicitud pendiente"
            >
              <Stack gap="xs">
                <Text size="sm">
                  Hay una operación guardada que
                  todavía no se ha confirmado en
                  esta pantalla.
                </Text>

                <Text size="sm">
                  Producto: {pending.productLabel}
                </Text>

                <Text size="sm">
                  Cantidad: {pending.quantity}{' '}
                  {pending.unit}
                </Text>

                {/* <Text size="xs">
                  Clave: {pending.idempotencyKey}
                </Text> */}

                {pending.movementType !== movementType && (
                  <Text size="sm">
                    La operación pendiente corresponde
                    a una {pending.movementType === 'entry'
                      ? 'entrada'
                      : 'salida'}.
                    Debes resolverla en{' '}
                    <a
                      href={
                        pending.movementType === 'entry'
                          ? '/entradas'
                          : '/salidas'
                      }
                    >
                      su formulario
                    </a>
                    .
                  </Text>
                )}
              </Stack>
            </Alert>
          )}

          {!pending && (
            <form onSubmit={prepareMovement}>
              <Stack gap="md">
                <Select
                  label="Producto"
                  placeholder="Seleccionar producto"
                  searchable
                  required
                  data={products.map((product) => ({
                    value: product.id,
                    label:
                      `${product.code} - ${product.name}`,
                  }))}
                  value={productId}
                  onChange={setProductId}
                />

                <TextInput
                  label={
                    isEntry
                      ? 'Cantidad de entrada'
                      : 'Cantidad de salida'
                  }
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.currentTarget.value)
                  }
                  description={
                    selectedProduct
                      ? `Unidad: ${selectedProduct.unit}`
                      : 'Selecciona un producto.'
                  }
                  placeholder={
                    selectedProduct?.unit === 'unidades'
                      ? '5'
                      : '2.50'
                  }
                  inputMode="decimal"
                  required
                />

                <Button
                  type="submit"
                  disabled={
                    !selectedProduct || !quantity.trim()
                  }
                >
                  {isEntry
                    ? 'Revisar entrada'
                    : 'Revisar salida'}
                </Button>
              </Stack>
            </form>
          )}

          {products.length === 0 && !pending && (
            <Alert color="yellow">
              No hay productos disponibles. Comprueba
              la suscripción de la empresa.
            </Alert>
          )}

          {successMessage && (
            <Alert
              color="green"
              title="Movimiento confirmado"
            >
              {successMessage}
            </Alert>
          )}

          {errorMessage && !pending && (
            <Alert color="red" title="Error">
              {errorMessage}
            </Alert>
          )}
        </Stack>
      </Paper>

      <Modal
        opened={Boolean(pendingOnThisPage)}
        onClose={() => {
          // La solicitud pendiente no se elimina
          // al cerrar el modal.
        }}
        closeOnEscape={false}
        closeOnClickOutside={false}
        withCloseButton={false}
        centered
        title={
          isEntry
            ? 'Confirmar o recuperar entrada'
            : 'Confirmar o recuperar salida'
        }
      >
        {pendingOnThisPage && pending && (
          <Stack gap="md">
            <Text>
              <strong>Producto:</strong>{' '}
              {pending.productLabel}
            </Text>

            <Text>
              <strong>Cantidad:</strong>{' '}
              {pending.quantity} {pending.unit}
            </Text>

            {/* <Text size="xs" c="dimmed">
              Clave de idempotencia:
              {' '}{pending.idempotencyKey}
            </Text> */}

            <Alert color="blue">
              Si esta solicitud ya se registró,
              PostgreSQL devolverá el mismo
              movimiento sin modificar de nuevo
              las existencias.
            </Alert>

            {errorMessage && (
              <Alert
                color="red"
                title="No se confirmó el resultado"
              >
                {errorMessage}
              </Alert>
            )}

            <Button
              loading={sending}
              onClick={() => void confirmMovement()}
            >
              Confirmar o reintentar misma solicitud
            </Button>

            <Group justify="flex-end">
              <Button
                color="red"
                variant="subtle"
                disabled={sending}
                onClick={discardPending}
              >
                Descartar pendiente
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}

