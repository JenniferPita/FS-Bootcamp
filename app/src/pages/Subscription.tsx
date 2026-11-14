
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';

import { supabase } from '../lib/supabase';

type SubscriptionOverview = {
  plan_code: string;
  plan_name: string;
  status: string;
  billing_period: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  paid_until: string | null;
  payment_confirmed: boolean;
  is_current_period: boolean;
  products_used: number;
  products_limit: number | null;
  active_users_used: number;
  active_users_limit: number | null;
};

function formatDate(value: string | null): string {
  if (!value) return 'No aplica';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'long',
    timeZone: 'America/Guayaquil',
  }).format(date);
}

function getRemainingDays(
  dateValue: string | null
): number | null {
  if (!dateValue) return null;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return null;

  return Math.max(
    0,
    Math.ceil(
      (date.getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
    )
  );
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'trialing':
      return 'Prueba gratuita';
    case 'active':
      return 'Activo';
    case 'expired':
      return 'Vencido';
    case 'canceled':
      return 'Cancelado';
    case 'past_due':
      return 'Pago pendiente';
    default:
      return status;
  }
}

function getBillingLabel(
  period: string | null
): string {
  if (!period) return 'No aplica';

  switch (period) {
    case 'monthly':
      return 'Mensual';
    case 'annual':
    case 'yearly':
      return 'Anual';
    default:
      return period;
  }
}

function UsageCard({
  title,
  used,
  limit,
}: {
  title: string;
  used: number;
  limit: number | null;
}) {
  const hasLimit = limit !== null;

  const percentage =
    hasLimit && limit > 0
      ? Math.min(100, (used / limit) * 100)
      : hasLimit && used > 0
        ? 100
        : 0;

  const isFull = hasLimit && used >= limit;

  return (
    <Paper withBorder radius="lg" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text fw={600}>{title}</Text>

          {isFull && (
            <Badge color="orange" variant="light">
              Límite alcanzado
            </Badge>
          )}
        </Group>

        <Group align="baseline" gap={6}>
          <Title order={2}>{used}</Title>
          <Text c="dimmed" size="sm">
            / {hasLimit ? limit : 'Ilimitado'}
          </Text>
        </Group>

        {hasLimit ? (
          <Progress
            value={percentage}
            size="lg"
            radius="xl"
            color={isFull ? 'orange' : 'blue'}
            aria-label={`Uso de ${title}`}
          />
        ) : (
          <Text c="dimmed" size="sm">
            Tu plan no establece un límite máximo.
          </Text>
        )}

        {hasLimit && (
          <Text size="xs" c="dimmed">
            {Math.max(0, limit - used)} disponibles
            dentro de tu plan.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

function InformationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Group
      justify="space-between"
      align="flex-start"
      gap="md"
      wrap="wrap"
      py="sm"
      style={{
        borderBottom: '1px solid #e9ecef',
      }}
    >
      <Text c="dimmed" size="sm">
        {label}
      </Text>

      <Text fw={600} size="sm" ta="right">
        {value}
      </Text>
    </Group>
  );
}

export default function Subscription() {
  const [subscription, setSubscription] =
    useState<SubscriptionOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSubscription = useCallback(
    async () => {
      setLoading(true);
      setError('');

      try {
        const {
          data,
          error: rpcError,
        } = await supabase.rpc(
          'get_subscription_overview'
        );

        if (rpcError) {
          throw rpcError;
        }

        if (!data || Array.isArray(data)) {
          throw new Error(
            'No se encontró información de la suscripción.'
          );
        }

        setSubscription(
          data as SubscriptionOverview
        );
      } catch (err) {
        setSubscription(null);

        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo consultar la suscripción.'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  const isTrial =
    subscription?.status === 'trialing';

  const expirationDate = subscription
    ? isTrial
      ? subscription.trial_ends_at
      : subscription.paid_until
    : null;

  const remainingDays =
    getRemainingDays(expirationDate);

  const currentPeriod =
    subscription?.is_current_period === true;

  const statusColor =
    !currentPeriod
      ? 'red'
      : isTrial
        ? 'blue'
        : 'green';

  if (loading && !subscription) {
    return (
      <div className="dashboard-loading">
        <Loader size="sm" />
        <span>Cargando suscripción...</span>
      </div>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            ADMINISTRACIÓN
          </span>

          <h1>Suscripción</h1>

          <p>
            Consulta tu plan actual, vigencia
            y consumo de recursos.
          </p>
        </div>

        <Button
          variant="light"
          loading={loading}
          onClick={() => {
            void loadSubscription();
          }}
        >
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert
          color="red"
          title="No se pudo consultar la suscripción"
          mb="md"
        >
          {error}
        </Alert>
      )}

      {subscription && (
        <Stack gap="lg">
          {/* PLAN ACTUAL */}
          <Paper withBorder radius="lg" p="xl">
            <Stack gap="md">
              <Group
                justify="space-between"
                align="center"
                wrap="wrap"
              >
                <div>
                  <Text size="xs" c="dimmed" fw={600}>
                    PLAN ACTUAL
                  </Text>

                  <Title order={2} mt={6}>
                    {subscription.plan_name}
                  </Title>
                </div>

                <Badge
                  size="lg"
                  variant="light"
                  color={statusColor}
                >
                  {currentPeriod
                    ? getStatusLabel(
                        subscription.status
                      )
                    : 'Sin vigencia'}
                </Badge>
              </Group>

              <div>
                <Text c="dimmed" size="sm">
                  {currentPeriod
                    ? 'Tiempo restante del período'
                    : 'Estado del período'}
                </Text>

                <Title order={2} mt={4}>
                  {remainingDays !== null
                    ? `${remainingDays} ${
                        remainingDays === 1
                          ? 'día'
                          : 'días'
                      }`
                    : 'Sin fecha de vencimiento'}
                </Title>
              </div>

              <InformationRow
                label="Estado registrado"
                value={getStatusLabel(
                  subscription.status
                )}
              />

              <InformationRow
                label="Fecha de vencimiento"
                value={formatDate(expirationDate)}
              />

              <InformationRow
                label="Período de facturación"
                value={getBillingLabel(
                  subscription.billing_period
                )}
              />

              {isTrial && (
                <InformationRow
                  label="Inicio de prueba"
                  value={formatDate(
                    subscription.trial_started_at
                  )}
                />
              )}
            </Stack>
          </Paper>

          {/* ADVERTENCIAS */}
          {!currentPeriod && (
            <Alert
              color="red"
              title="Período sin vigencia"
            >
              El período de tu suscripción no está
              vigente. Algunas operaciones podrían
              quedar bloqueadas hasta regularizar
              el servicio.
            </Alert>
          )}

          {subscription.status === 'active' &&
            !subscription.payment_confirmed && (
              <Alert
                color="yellow"
                title="Pago no confirmado"
              >
                No existe una confirmación de pago
                registrada. Algunas funciones,
                como crear productos, pueden requerirla.
              </Alert>
            )}

          {/* CONSUMO DEL PLAN */}
          <div>
            <Title order={3} mb="xs">
              Uso del plan
            </Title>

            <Text c="dimmed" size="sm">
              Recursos utilizados por tu empresa.
            </Text>
          </div>

          <SimpleGrid
            cols={{ base: 1, sm: 2 }}
            spacing="lg"
          >
            <UsageCard
              title="Productos registrados"
              used={subscription.products_used}
              limit={subscription.products_limit}
            />

            <UsageCard
              title="Usuarios activos"
              used={subscription.active_users_used}
              limit={subscription.active_users_limit}
            />
          </SimpleGrid>

          {/* INFORMACIÓN ADICIONAL */}
          <Paper withBorder radius="lg" p="lg">
            <Stack gap="xs">
              <Title order={4}>
                Información de tu suscripción
              </Title>

              <Text size="sm" c="dimmed">
                Los productos desactivados también
                cuentan dentro del límite de tu plan.
                Los usuarios inactivos no ocupan
                cupos de usuarios activos.
              </Text>

              <Text size="sm" c="dimmed">
                La renovación, los cambios de plan
                y los pagos en línea aún no están
                habilitados en esta versión.
              </Text>
            </Stack>
          </Paper>
        </Stack>
      )}
    </section>
  );
}
