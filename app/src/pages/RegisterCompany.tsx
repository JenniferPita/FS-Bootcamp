
import { useState } from 'react';
import {
  Alert,
  Button,
  Container,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { supabase } from '../lib/supabase';

export default function RegisterCompany() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const form = useForm({
    mode: 'controlled',
    initialValues: {
      companyName: '',
      adminName: '',
      email: '',
      password: '',
      confirmPassword: '',
      warehouseName: '',
      planCode: 'initial',
    },

    validate: {
      companyName: (value) =>
        value.trim() ? null : 'Ingresa el nombre de la empresa',

      adminName: (value) =>
        value.trim() ? null : 'Ingresa el nombre del administrador',

      email: (value) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? null
          : 'Ingresa un correo válido',

      password: (value) =>
        value.length >= 8 && value.length <= 128
          ? null
          : 'La contraseña debe tener entre 8 y 128 caracteres',

      confirmPassword: (value, values) =>
        value === values.password
          ? null
          : 'Las contraseñas no coinciden',

      warehouseName: (value) =>
        value.trim() ? null : 'Ingresa el nombre de la bodega',

      planCode: (value) =>
        ['initial', 'professional', 'enterprise'].includes(value)
          ? null
          : 'Selecciona un plan válido',
    },
  });

  async function handleRegister(
    values: typeof form.values
  ) {
    setLoading(true);
    setErrorMessage('');
    setSuccess(false);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        options: {
          data: {
            stockflow_registration: true,
            company_name: values.companyName.trim(),
            admin_name: values.adminName.trim(),
            warehouse_name: values.warehouseName.trim(),
            plan_code: values.planCode,
          },
        },
      });

      if (error) {
        throw error;
      }

      // ET-01 requiere una sesión inmediata.
      if (!data.user || !data.session) {
        setErrorMessage(
          'No se obtuvo una sesión activa. ' +
          'Verifica la configuración de confirmación de correo.'
        );
        return;
      }

      setSuccess(true);
      form.reset();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo completar el registro.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container size="sm" py="xl">
      <Paper withBorder radius="md" p="xl">
        <Title order={2}>Registrar empresa</Title>

        <Text c="dimmed" size="sm" mt="xs" mb="lg">
          Crea tu cuenta de StockFlow con 14 días de
          prueba gratuita.
        </Text>

        <form onSubmit={form.onSubmit(handleRegister)}>
          <Stack gap="md">
            <TextInput
              label="Nombre de la empresa"
              placeholder="Mi Empresa S.A."
              required
              {...form.getInputProps('companyName')}
            />

            <TextInput
              label="Nombre del administrador"
              placeholder="Nombre y apellido"
              required
              {...form.getInputProps('adminName')}
            />

            <TextInput
              label="Correo electrónico"
              placeholder="administrador@empresa.com"
              type="email"
              required
              {...form.getInputProps('email')}
            />

            <PasswordInput
              label="Contraseña"
              required
              {...form.getInputProps('password')}
            />

            <PasswordInput
              label="Confirmar contraseña"
              required
              {...form.getInputProps('confirmPassword')}
            />

            <TextInput
              label="Bodega inicial"
              placeholder="Bodega principal"
              required
              {...form.getInputProps('warehouseName')}
            />

            <Select
              label="Plan"
              required
              allowDeselect={false}
              data={[
                { value: 'initial', label: 'Inicial' },
                { value: 'professional', label: 'Profesional' },
                { value: 'enterprise', label: 'Empresa' },
              ]}
              {...form.getInputProps('planCode')}
            />

            {errorMessage && (
              <Alert color="red" title="Error de registro">
                {errorMessage}
              </Alert>
            )}

            {success && (
              <Alert color="green" title="Registro completado">
                Se creó tu cuenta y se inició sesión
                correctamente.
              </Alert>
            )}

            <Button type="submit" loading={loading} fullWidth>
              Crear empresa
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
