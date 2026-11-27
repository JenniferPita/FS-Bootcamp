import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router';
import { Menu } from '@mantine/core';

import { useSidebarStore } from './stores/sidebar-store';
import AuthGate from './components/AuthGate';
import { supabase } from './lib/supabase';

import Dashboard from './pages/Dashboard';
import RegisterCompany from './pages/RegisterCompany';
import TestRls from './pages/TestRls';
import Login from './pages/Login';
import Products from './pages/Products';
import Entries from './pages/Entries';
import Exits from './pages/Exits';
import TestUsersRls from './pages/TestUsersRls';
import TestInviteAuth from './pages/TestInviteAuth';
import ProductsList from './pages/ProductsList';
import Users from './pages/Users';
import Subscription from './pages/Subscription';
import InventoryAnalysis from './pages/InventoryAnalysis';


const pages = [
  {
    to: '/suscripcion',
    text: 'Suscripción',
    label: 'ET-02',
    description: 'Estado del plan, renovación y cambios programados.',
    roles: 'Administrador',
  },
  {
    to: '/usuarios',
    text: 'Usuarios',
    label: 'ET-03',
    description: 'Creación y administración de cuentas de la empresa.',
    roles: 'Administrador',
  },
  {
    to: '/productos',
    text: 'Productos',
    label: 'ET-04',
    description: 'Registro de productos, unidad y stock inicial.',
    roles: 'Administrador y Supervisor',
  },
  {
    to: '/entradas',
    text: 'Entradas',
    label: 'ET-05',
    description: 'Confirmación de movimientos de entrada.',
    roles: 'Operador',
  },
  {
    to: '/salidas',
    text: 'Salidas',
    label: 'ET-06',
    description: 'Confirmación de salidas con validación de existencias.',
    roles: 'Operador',
  },
  {
    to: '/analisis-ia',
    text: 'Análisis IA',
    label: 'IA-01',
    description: 'Análisis inteligente del inventario.',
    roles: 'Usuarios autenticados',
  },
] as const;

type CurrentUser = {
  name: string;
  role: string;
  email: string;
};

const roleNames: Record<string, string> = {
  administrator: 'Administrador',
  supervisor: 'Supervisor',
  operator: 'Operador',
};

function toggleStockFlowTheme() {
  const html = document.documentElement;

  const current =
    html.getAttribute('data-theme') ||
    (
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    );

  const next = current === 'dark' ? 'light' : 'dark';

  html.setAttribute('data-theme', next);

  try {
    localStorage.setItem('theme', next);
  } catch {
    // Almacenamiento opcional
  }
}

function Shell() {
  const open = useSidebarStore((s) => s.open);
  const toggle = useSidebarStore((s) => s.toggle);
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    name: 'Cargando...',
    role: '',
    email: '',
  });

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (!mounted) return;

      if (authError || !auth.user) {
        setCurrentUser({
          name: 'Sin sesión',
          role: '',
          email: '',
        });
        return;
      }

      const email = auth.user.email ?? '';

      const { data: profile, error: profileError } =
        await supabase
          .from('company_users')
          .select('full_name, role, is_active')
          .eq('id', auth.user.id)
          .single();

      if (!mounted) return;

      if (profileError || !profile) {
        setCurrentUser({
          name: email || 'Usuario',
          role: 'Perfil no disponible',
          email,
        });
        return;
      }

      setCurrentUser({
        name: profile.full_name,
        role: profile.is_active
          ? (roleNames[profile.role] ?? profile.role)
          : 'Usuario inactivo',
        email,
      });
    }

    void loadCurrentUser();

    const { data: listener } =
      supabase.auth.onAuthStateChange((event) => {
        if (
          event === 'SIGNED_IN' ||
          event === 'SIGNED_OUT' ||
          event === 'USER_UPDATED'
        ) {
          Promise.resolve().then(() => {
            if (mounted) {
              void loadCurrentUser();
            }
          });
        }
      });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      window.alert(
        'No se pudo cerrar sesión: ' + error.message
      );
      return;
    }

    window.location.assign('/login.html');
  }

  const userInitial =
    currentUser.name.trim().charAt(0).toUpperCase() || 'U';

  const currentPage =
    location.pathname === '/'
      ? 'Resumen'
      : pages.find((p) => p.to === location.pathname)?.text
        ?? location.pathname.slice(1);

  return (
    <div className="app-shell">

      {/* MENÚ LATERAL IZQUIERDO */}
      <aside
        className={open ? 'sidebar' : 'sidebar collapsed'}
        aria-label="Navegación de StockFlow"
      >
        <a href="/index.html" className="brand">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>

          <span className="brand-name">
            StockFlow
          </span>
        </a>

        {open && (
          <>
            <div className="nav-group">
              ESPACIO DE TRABAJO
            </div>

            <nav>
              <NavLink to="/" end>
                Resumen
              </NavLink>

              {pages.map((p) => (
                <NavLink key={p.to} to={p.to}>
                  {p.text}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </aside>

      {/* ÁREA DERECHA */}
      <div className="main-zone">

        {/* BARRA SUPERIOR */}
        <header className="topbar">
          <button
            type="button"
            className="menu-button"
            onClick={toggle}
            aria-label={
              open ? 'Contraer menú' : 'Expandir menú'
            }
            aria-expanded={open}
          >
            ☰
          </button>

          <span className="topbar-current">
            {currentPage}
          </span>

          <div className="topbar-actions">
            <button
              type="button"
              className="menu-button theme-switch"
              onClick={toggleStockFlowTheme}
              aria-label="Alternar tema claro y oscuro"
              title="Cambiar tema"
            >
              ◐
            </button>

            {/* USUARIO ACTUAL */}
            <Menu
              shadow="md"
              width={220}
              position="bottom-end"
              withinPortal
            >
              <Menu.Target>
                <button
                  type="button"
                  className="topbar-user"
                  aria-label="Abrir menú de usuario"
                >
                  <div className="topbar-user-info">
                    <strong>{currentUser.name}</strong>
                    <span>{currentUser.role}</span>
                  </div>

                  <div className="topbar-avatar">
                    {userInitial}
                  </div>
                </button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  {currentUser.email || 'Mi cuenta'}
                </Menu.Label>

                <Menu.Divider />

                <Menu.Item
                  color="red"
                  onClick={() => void handleLogout()}
                >
                  Cerrar sesión
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </header>

        {/* CONTENIDO DE LAS PÁGINAS */}
        <main className="main-content">
          <Routes>

            {/* DASHBOARD DE RESUMEN */}
            <Route
              path="/"
              element={<Dashboard />}
            />

            {/* PÁGINAS DE STOCKFLOW */}
            {pages.map((p) => (
              <Route
                key={p.to}
                path={p.to}
                element={
                  p.to === '/productos'
                    ? <ProductsList />
                    : p.to === '/entradas'
                      ? <Entries />
                      : p.to === '/salidas'
                        ? <Exits />
                        : p.to === '/usuarios'
                          ? <Users />
                          : p.to === '/suscripcion'
                            ? <Subscription />
                            : p.to === '/analisis-ia'
                              ? <InventoryAnalysis />
                              : null
                }
              />
            ))}


            <Route
              path="/productos/nuevo"
              element={<Products />}
            />

            {/* RUTAS DE PRUEBAS Y REGISTRO */}
            <Route
              path="/registro"
              element={<RegisterCompany />}
            />

            <Route
              path="/prueba-rls"
              element={<TestRls />}
            />

            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/prueba-usuarios-rls"
              element={<TestUsersRls />}
            />

            <Route
              path="/prueba-invitacion-auth"
              element={<TestInviteAuth />}
            />

            {/* RUTA NO ENCONTRADA */}
            <Route
              path="*"
              element={
                <section className="content-card">
                  <h2>Ruta no encontrada</h2>
                  <p>
                    La página solicitada no existe.
                  </p>
                  <NavLink to="/">
                    Volver al resumen
                  </NavLink>
                </section>
              }
            />

          </Routes>
        </main>

        {/* PIE DE PÁGINA */}
        <footer className="app-footer">
          StockFlow · Inventario conectado a Supabase
        </footer>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthGate>
      <Shell />
    </AuthGate>
  );
}
