
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error('No se pudo iniciar la sesión.');
      }

      // Comprobar que el usuario tenga un perfil activo.
      const { data: profile, error: profileError } = await supabase
        .from('company_users')
        .select('id, is_active')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile?.is_active) {
        await supabase.auth.signOut();
        throw new Error('La cuenta no está habilitada en StockFlow.');
      }

      navigate('/', { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar sesión.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container size={420} py="xl">
      <Paper withBorder radius="md" p="xl">
        <Title order={2}>Iniciar sesión</Title>

        <Text c="dimmed" size="sm" mt="xs" mb="lg">
          Ingresa con tu cuenta de StockFlow.
        </Text>

        <form onSubmit={handleLogin}>
          <Stack>
            <TextInput
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />

            <PasswordInput
              label="Contraseña"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
            />

            {errorMessage && (
              <Alert color="red" title="Error de acceso">
                {errorMessage}
              </Alert>
            )}

            <Button type="submit" loading={loading} fullWidth>
              Iniciar sesión
            </Button>

            <Anchor href="/registro" size="sm" ta="center">
              Crear una empresa
            </Anchor>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
