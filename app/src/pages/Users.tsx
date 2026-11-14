
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

import { supabase } from '../lib/supabase';

type UserRole =
  | 'administrator'
  | 'supervisor'
  | 'operator';

type CompanyUser = {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

const ROLE_OPTIONS = [
  { value: 'administrator', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'operator', label: 'Operador' },
];

function roleLabel(role: UserRole) {
  switch (role) {
    case 'administrator':
      return 'Administrador';
    case 'supervisor':
      return 'Supervisor';
    case 'operator':
      return 'Operador';
    default:
      return role;
  }
}

export default function Users() {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedUser, setSelectedUser] =
    useState<CompanyUser | null>(null);

  const [fullName, setFullName] = useState('');
  const [role, setRole] =
    useState<UserRole>('operator');
  const [isActive, setIsActive] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const {
        data: auth,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error('Debes iniciar sesión.');
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('company_users')
        .select('id, role, is_active')
        .eq('id', auth.user.id)
        .single();

      if (
        profileError ||
        !profile ||
        !profile.is_active ||
        profile.role !== 'administrator'
      ) {
        setIsAdmin(false);
        setUsers([]);
        throw new Error(
          'Solo un Administrador activo puede gestionar usuarios.'
        );
      }

      setCurrentUserId(auth.user.id);
      setIsAdmin(true);

      // RLS limita la consulta a usuarios
      // pertenecientes a la misma empresa.
      const {
        data,
        error: usersError,
      } = await supabase
        .from('company_users')
        .select(
          'id, full_name, role, is_active, created_at'
        )
        .order('full_name', {
          ascending: true,
        });

      if (usersError) {
        throw usersError;
      }

      setUsers((data ?? []) as CompanyUser[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los usuarios.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      return (
        user.full_name.toLowerCase().includes(term) ||
        roleLabel(user.role)
          .toLowerCase()
          .includes(term)
      );
    });
  }, [users, search]);

  function openUser(user: CompanyUser) {
    setSelectedUser(user);
    setFullName(user.full_name);
    setRole(user.role);
    setIsActive(user.is_active);
    setError('');
    setNotice('');
  }

  function closeUser() {
    if (saving) return;

    setSelectedUser(null);
  }

  async function saveUser() {
    if (!selectedUser || !isAdmin || saving) {
      return;
    }

    setError('');
    setNotice('');

    const normalizedName = fullName.trim();

    if (
      normalizedName.length < 1 ||
      normalizedName.length > 100
    ) {
      setError(
        'El nombre debe tener entre 1 y 100 caracteres.'
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        'update_company_user',
        {
          p_user_id: selectedUser.id,
          p_full_name: normalizedName,
          p_role: role,
          p_is_active: isActive,
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
        updated.user_id !== selectedUser.id
      ) {
        throw new Error(
          'No se pudo confirmar la actualización.'
        );
      }

      setSelectedUser(null);

      setNotice(
        `Los datos de ${normalizedName} se actualizaron correctamente.`
      );

      await loadUsers();
    } catch (err) {
      // Si falló la conexión tras ejecutar la
      // operación, refrescamos el estado real.
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el usuario.';

      await loadUsers();
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const activeCount = users.filter(
    (user) => user.is_active
  ).length;

  if (loading && users.length === 0) {
    return (
      <div className="dashboard-loading">
        <Loader size="sm" />
        <span>Cargando usuarios...</span>
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

          <h1>Usuarios</h1>

          <p>
            Consulta y administra los usuarios
            registrados en tu empresa.
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="light"
            loading={loading}
            onClick={() => void loadUsers()}
          >
            Actualizar
          </Button>
        )}
      </div>

      {error && (
        <Alert
          color="red"
          title="Atención"
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
          title="Cambios guardados"
          withCloseButton
          onClose={() => setNotice('')}
          mb="md"
        >
          {notice}
        </Alert>
      )}

      {isAdmin && (
        <article className="dashboard-panel">
          <div className="dashboard-products-header">
            <div>
              <h2>Usuarios registrados</h2>
              <p>
                {users.length} registrados ·{' '}
                {activeCount} activos
              </p>
            </div>

            <input
              type="search"
              className="dashboard-search"
              placeholder="Buscar por nombre o rol..."
              aria-label="Buscar usuarios"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          {filteredUsers.length === 0 ? (
            <p className="dashboard-empty">
              No se encontraron usuarios.
            </p>
          ) : (
            <div className="dashboard-table-scroll">
              <table className="dashboard-table users-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <button
                          type="button"
                          className="users-name-button"
                          onClick={() => openUser(user)}
                        >
                          {user.full_name}
                          {user.id === currentUserId
                            ? ' (Tú)'
                            : ''}
                        </button>
                      </td>

                      <td>
                        {roleLabel(user.role)}
                      </td>

                      <td>
                        <Badge
                          color={
                            user.is_active
                              ? 'green'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {user.is_active
                            ? 'Activo'
                            : 'Inactivo'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}

      <Modal
        opened={selectedUser !== null}
        onClose={closeUser}
        title="Detalle del usuario"
        centered
        radius="lg"
        size="md"
        closeOnClickOutside={!saving}
        closeOnEscape={!saving}
        withCloseButton={!saving}
      >
        {selectedUser && (
          <Stack gap="lg">
            <div>
              <Title order={4}>
                {selectedUser.full_name}
              </Title>

              <Text size="sm" c="dimmed">
                Modifica los datos y permisos
                de este usuario.
              </Text>
            </div>

            <TextInput
              label="Nombre completo"
              value={fullName}
              maxLength={100}
              onChange={(event) =>
                setFullName(event.currentTarget.value)
              }
              disabled={saving}
              required
            />

            <Select
              label="Rol"
              data={ROLE_OPTIONS}
              value={role}
              onChange={(value) => {
                if (value) {
                  setRole(value as UserRole);
                }
              }}
              disabled={saving}
              allowDeselect={false}
            />

            <Switch
              label="Usuario activo"
              description={
                isActive
                  ? 'El usuario puede acceder según sus permisos.'
                  : 'El usuario no podrá operar en StockFlow.'
              }
              checked={isActive}
              onChange={(event) =>
                setIsActive(event.currentTarget.checked)
              }
              disabled={saving}
            />

            {selectedUser.id === currentUserId && (
              <Alert color="blue">
                Estás modificando tu propio usuario.
                La base de datos impedirá dejar
                a la empresa sin un Administrador activo.
              </Alert>
            )}

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={closeUser}
                disabled={saving}
              >
                Cancelar
              </Button>

              <Button
                loading={saving}
                onClick={() => void saveUser()}
              >
                Guardar cambios
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </section>
  );
}
