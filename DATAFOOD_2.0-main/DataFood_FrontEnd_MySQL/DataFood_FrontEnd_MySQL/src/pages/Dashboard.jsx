import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

import OpenRegister  from './CashRegister/OpenRegister';
import CloseRegister from './CashRegister/CloseRegister';
import CashMovement  from './CashRegister/CashMovement';
import './Dashboard.css';

import { getBusinessLogo, uploadBusinessLogo } from '../api/businessApi';
import dataFoodLogo from '../assets/DataFood_Azul.png';

import ventasImg    from '../assets/carrito-de-compras.png';
import domicilioImg from '../assets/moto.png';
import historialImg from '../assets/portapapeles.png';
import cajaImg      from '../assets/caja-fuerte.png';
import retiroImg    from '../assets/retiro-de-dinero.png';
import empleadoImg  from '../assets/empleado.png';
import reporteImg   from '../assets/reporte.png';
import ayudaImg     from '../assets/llave-inglesa.png';
import abrirCajaImg from '../assets/ganancia.png';

const modules = [
  { label: 'Ventas',              icon: ventasImg,     path: '/sales'         },
  { label: 'Domicilio',           icon: domicilioImg,  path: '/delivery'      },
  { label: 'Historial de Ventas', icon: historialImg,  path: '/sales/history' },
  { label: 'Abrir Caja',          icon: abrirCajaImg,  path: 'modal:open'     },
  { label: 'Cierre Caja',         icon: cajaImg,       path: 'modal:close'    },
  { label: 'Retiro/Dep.',         icon: retiroImg,     path: 'modal:movement' },
  { label: 'Empleados',           icon: empleadoImg,   path: '/employees'     },
  { label: 'Reports',             icon: reporteImg,    path: '/reports'       },
  { label: 'Ayuda',               icon: ayudaImg,      path: '/Help'          },
];

const insumosSubMenu = [
  { label: 'Inventario General',        path: '/supplies/inventory',           header: true },
  { label: 'Entradas/Compras',          path: '/supplies/purchases'                        },
  { label: 'Insumos Bajos',             path: '/supplies/low-stock',  badge: true           },
  { label: 'Lista Sugerida de Compras', path: '/supplies/suggested-purchases'              },
  { label: 'Agregar Nuevo',             path: '/supplies/admin'                            },
];

/* ── Helpers ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatDate() {
  return new Date().toLocaleDateString('es-NI', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [open,           setOpen]           = useState(false);
  const [menuProductos,  setMenuProductos]  = useState(false);
  const [openCashModal,  setOpenCashModal]  = useState(false);
  const [closeCashModal, setCloseCashModal] = useState(false);
  const [movementModal,  setMovementModal]  = useState(false);
  const [lowStockCount,  setLowStockCount]  = useState(0);
  const [avatarImg,      setAvatarImg]      = useState(null);

  const fileInputRef = useRef(null);
  const btnRef       = useRef(null);
  const popupRef     = useRef(null);

  const isInsumosActive = location.pathname.startsWith('/supplies');

  const employeeId   = user?.employeeId;
  const employeeName = user ? `${user.firstName} ${user.lastName}` : '';
  const userRole     = user?.role || '';
  const avatarLetter = user?.firstName?.[0]?.toUpperCase() || '?';

  useEffect(() => {
    const handler = (e) => {
      if (
          popupRef.current && !popupRef.current.contains(e.target) &&
          btnRef.current   && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    import('../api/Supplyapi.js')
        .then(({ getSupplies }) =>
            getSupplies().then(res => {
              const bajos = res.data.filter(s => s.availableQuantity <= s.minimumQuantity);
              setLowStockCount(bajos.length);
            })
        )
        .catch(() => {});
  }, []);

  useEffect(() => {
    getBusinessLogo().then(url => { if (url) setAvatarImg(url); });
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadBusinessLogo(file).then(url => { if (url) setAvatarImg(url); });
  };

  const handleModuleClick = (path) => {
    if (path === 'modal:open')     { setOpenCashModal(true);  return; }
    if (path === 'modal:close')    { setCloseCashModal(true); return; }
    if (path === 'modal:movement') { setMovementModal(true);  return; }
    navigate(path);
  };

  return (
      <div className="dashboard-layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="sidebar-profile">
              <div
                  className="avatar"
                  onClick={() => fileInputRef.current.click()}
                  title="Cambiar logo del negocio"
              >
                {avatarImg
                    ? <img src={avatarImg} alt="logo" className="avatar-img" />
                    : avatarLetter
                }
                <span className="avatar-overlay">📷</span>
              </div>

              <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
              />

              <div>
                <div className="business-name">Comedor Raquel</div>
                <div className="system-label">Sistema de Gestion</div>
              </div>
            </div>

            <div className="sidebar-user">
              <div className="user-name">{employeeName}</div>
              <div className="user-role">{userRole}</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button
                className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
                onClick={() => navigate('/')}
            >
              Principal
            </button>

            <div style={{ position: 'relative' }}>
              <button
                  ref={btnRef}
                  className={`sidebar-link insumos-btn ${isInsumosActive || open ? 'active' : ''}`}
                  onClick={() => { setOpen(!open); setMenuProductos(false); }}
              >
                <span className="insumos-arrow"></span>
                Insumos
                {lowStockCount > 0 && <span className="sidebar-dot-badge" />}
              </button>

              {open && (
                  <div ref={popupRef} className="insumos-popup">
                    <div className="popup-label">
                      <span className="triangle-orange">▶</span> Insumos info
                    </div>
                    {insumosSubMenu.map(item => (
                        <button
                            key={item.path}
                            className={`popup-item ${item.header ? 'popup-item-header' : ''}`}
                            onClick={() => { navigate(item.path); setOpen(false); }}
                        >
                          {item.label}
                          {item.badge && lowStockCount > 0 && (
                              <span className="low-stock-badge">{lowStockCount}</span>
                          )}
                        </button>
                    ))}
                  </div>
              )}
            </div>

            <button
                className={`sidebar-link ${location.pathname === '/suppliers' ? 'active' : ''}`}
                onClick={() => { setMenuProductos(false); navigate('/suppliers'); }}
            >
              Proveedores
            </button>

            <div style={{ position: 'relative' }}>
              <button
                  className={`sidebar-link ${location.pathname.startsWith('/productos') ? 'active' : ''}`}
                  onClick={() => { setMenuProductos(!menuProductos); setOpen(false); }}
              >
                Productos
              </button>

              {menuProductos && (
                  <div className="insumos-popup">
                    <div className="popup-label">
                      <span className="triangle-orange">▶</span> Productos info
                    </div>
                    <button
                        className="popup-item"
                        onClick={() => { setMenuProductos(false); navigate('/productos', { state: { view: 'lista' } }); }}
                    >
                      Ver Productos
                    </button>
                    <button
                        className="popup-item"
                        onClick={() => { setMenuProductos(false); navigate('/productos', { state: { view: 'admin' } }); }}
                    >
                      Añadir Productos
                    </button>
                    <button
                        className="popup-item"
                        onClick={() => { setMenuProductos(false); navigate('/menu-config', { state: { view: 'admin', scrollToMenu: true } }); }}
                    >
                      🌐 Editar Menú
                    </button>
                  </div>
              )}
            </div>
          </nav>

          <button className="btn-logout" onClick={logout}>Cerrar Sesión</button>
        </aside>

        {/* ── MAIN ── */}
        <main className="dashboard-main">

          {/* Topbar: saludo + fecha */}
          <div className="dashboard-topbar">
          <span className="dashboard-greeting">
            {getGreeting()}, {user?.firstName} 👋
          </span>
            <span className="dashboard-date-pill">{formatDate()}</span>
          </div>

          <div className="modules-grid">
            {modules.map(mod => (
                <button
                    key={mod.path}
                    className="module-card"
                    onClick={() => handleModuleClick(mod.path)}
                >
                  <span className="module-label">{mod.label}</span>
                  <img src={mod.icon} alt={mod.label} className="module-icon" />
                </button>
            ))}
          </div>

          <img src={dataFoodLogo} alt="DataFood" className="dashboard-brand-logo" />
        </main>

        {/* ── MODALS ── */}
        {openCashModal && (
            <OpenRegister
                employeeId={employeeId}
                employeeName={employeeName}
                onClose={() => setOpenCashModal(false)}
            />
        )}
        {closeCashModal && (
            <CloseRegister
                employeeId={employeeId}
                employeeName={employeeName}
                onClose={() => setCloseCashModal(false)}
            />
        )}
        {movementModal && (
            <CashMovement onClose={() => setMovementModal(false)} />
        )}
      </div>
  );
}