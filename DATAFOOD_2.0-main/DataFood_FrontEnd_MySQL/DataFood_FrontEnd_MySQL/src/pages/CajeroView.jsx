import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import OpenRegister  from './CashRegister/OpenRegister';
import CloseRegister from './CashRegister/CloseRegister';
import dataFoodLogo from '../assets/DataFood_Azul.png';
import { getBusinessLogo } from '../api/businessApi';
import './CajeroView.css';

import ventasImg    from '../assets/carrito-de-compras.png';
import domicilioImg from '../assets/moto.png';
import cajaImg      from '../assets/caja-fuerte.png';
import abrirCajaImg from '../assets/ganancia.png';
import historialImg from '../assets/portapapeles.png';

const cajeroModules = [
    { label: 'Ventas',              icon: ventasImg,    path: '/sales'         },
    { label: 'Domicilio',           icon: domicilioImg, path: '/delivery'      },
    { label: 'Historial de Ventas', icon: historialImg, path: '/sales/history' },
    { label: 'Abrir Caja',          icon: abrirCajaImg, path: 'modal:open'     },
    { label: 'Cerrar Caja',         icon: cajaImg,      path: 'modal:close'    },
];

/* ── Helpers ────────────────────────────────────────── */
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

function formatCurrency(n) {
    if (n == null) return 'C$ 0';
    return `C$ ${Number(n).toLocaleString('es-NI', { minimumFractionDigits: 0 })}`;
}

function timeAgo(isoString) {
    if (!isoString) return '—';
    const diff = Math.floor((Date.now() - new Date(isoString)) / 60000);
    if (diff < 1)   return 'hace un momento';
    if (diff === 1) return 'hace 1 min';
    if (diff < 60)  return `hace ${diff} min`;
    return `hace ${Math.floor(diff / 60)} h`;
}

/* ── Normaliza cualquier valor truthy/falsy a booleano real ── */
function normalizeBool(val) {
    if (val === true || val === 'true' || val === 1 || val === '1') return true;
    return false;
}

/* ── Componente principal ───────────────────────────── */
export default function CajeroView() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [openCashModal,  setOpenCashModal]  = useState(false);
    const [closeCashModal, setCloseCashModal] = useState(false);
    const [logoImg,        setLogoImg]        = useState(null);

    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError,   setStatsError]   = useState(false);

    const employeeId   = user?.employeeId;
    const employeeName = user ? `${user.firstName} ${user.lastName}` : '';
    const userRole     = user?.role || 'CAJERO';
    const avatarLetter = user?.firstName?.[0]?.toUpperCase() || '?';

    /* Carga logo */
    useEffect(() => {
        getBusinessLogo().then(url => { if (url) setLogoImg(url); });
    }, []);

    /* Función para cargar estadísticas */
    const fetchStats = useCallback(async () => {
        setLoadingStats(true);
        setStatsError(false);
        try {
            // NOTA: Si no usas vercel.json re-writes, cambia '/api/stats/daily'
            // por la URL completa de producción. Ej: 'https://tu-backend.com/api/stats/daily'
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stats/daily`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            // Sincronizar y normalizar estado de la caja de forma segura
            setStats({
                ...data,
                cajaAbierta: data ? normalizeBool(data.cajaAbierta) : false,
            });

            console.log('📊 Stats recibidas:', data);
        } catch (err) {
            console.error('Error cargando estadísticas:', err);
            setStatsError(true);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    /* Carga inicial de estadísticas */
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleClick = (path) => {
        if (path === 'modal:open')  { setOpenCashModal(true);  return; }
        if (path === 'modal:close') { setCloseCashModal(true); return; }
        navigate(path);
    };

    /* Dar tiempo al backend antes de recargar stats */
    const handleOpenModalClose = () => {
        setOpenCashModal(false);
        setTimeout(() => fetchStats(), 300);
    };

    const handleCloseModalClose = () => {
        setCloseCashModal(false);
        setTimeout(() => fetchStats(), 300);
    };

    /* Diferencias vs ayer controlando nulos con seguridad */
    const diffVentas    = stats?.ventasHoy && stats?.ventasAyer ? stats.ventasHoy - stats.ventasAyer : 0;
    const diffIngresos  = stats?.ingresosHoy && stats?.ingresosAyer ? stats.ingresosHoy - stats.ingresosAyer : 0;
    const diffDomicilio = stats?.domiciliosHoy && stats?.domiciliosAyer ? stats.domiciliosHoy - stats.domiciliosAyer : 0;

    /* Texto de tendencia */
    const trendText = (diff) => {
        if (diff > 0) return `▲ +${diff} vs ayer`;
        if (diff < 0) return `▼ ${diff} vs ayer`;
        return '— igual que ayer';
    };
    const trendClass = (diff) =>
        diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';

    return (
        <div className="cajero-layout">

            {/* ── SIDEBAR ── */}
            <aside className="cajero-sidebar">
                <div className="cajero-sidebar-top">

                    {/* Perfil negocio */}
                    <div className="cajero-profile">
                        <div className="cajero-avatar">
                            {logoImg
                                ? <img src={logoImg} alt="logo" className="cajero-avatar-img" />
                                : avatarLetter
                            }
                        </div>
                        <div>
                            <div className="cajero-business">Comedor Raquel</div>
                            <div className="cajero-system">Sistema de Gestión</div>
                        </div>
                    </div>

                    {/* Info cajero */}
                    <div className="cajero-user-info">
                        <div className="cajero-name">{employeeName}</div>
                        <div className="cajero-role">{userRole}</div>
                    </div>

                    {/* Mini-stats */}
                    <div className="cajero-sidebar-stats">
                        <div className="cajero-stat-box">
                            <div className="cajero-stat-label">Ventas hoy</div>
                            <div className="cajero-stat-value">
                                {loadingStats ? '…' : statsError ? '—' : stats?.ventasHoy ?? 0}
                            </div>
                            {!loadingStats && !statsError && stats && (
                                <div className={`cajero-stat-sub ${trendClass(diffVentas)}`}>
                                    {trendText(diffVentas)}
                                </div>
                            )}
                        </div>

                        <div className="cajero-stat-box">
                            <div className="cajero-stat-label">Total del día</div>
                            <div className="cajero-stat-value">
                                {loadingStats ? '…' : statsError ? '—' : formatCurrency(stats?.ingresosHoy)}
                            </div>
                            {!loadingStats && !statsError && stats && (
                                <div className={`cajero-stat-sub ${trendClass(diffIngresos)}`}>
                                    {diffIngresos >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(diffIngresos))}
                                </div>
                            )}
                        </div>

                        <div className="cajero-stat-box">
                            <div className="cajero-stat-label">Caja</div>
                            <div className={`cajero-stat-value caja-status ${
                                loadingStats ? '' : stats?.cajaAbierta ? 'open' : 'closed'
                            }`}>
                                {loadingStats ? '…'
                                    : statsError ? '—'
                                        : stats?.cajaAbierta ? '✓ Abierta' : '✗ Cerrada'}
                            </div>
                            {!loadingStats && !statsError && stats?.horaApertura && stats?.cajaAbierta && (
                                <div className="cajero-stat-sub">
                                    desde {stats.horaApertura}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <button className="cajero-logout-btn" onClick={logout}>
                    Cerrar Sesión
                </button>
            </aside>

            {/* ── MAIN ── */}
            <main className="cajero-main">

                {/* Saludo + fecha */}
                <div className="cajero-topbar">
                    <span className="cajero-greeting">
                        {getGreeting()}, {user?.firstName} 👋
                    </span>
                    <span className="cajero-date-pill">{formatDate()}</span>
                </div>

                {/* Grid módulos */}
                <div className="cajero-grid">
                    {cajeroModules.map(mod => (
                        <button
                            key={mod.path}
                            className="cajero-card"
                            onClick={() => handleClick(mod.path)}
                        >
                            <span className="cajero-card-label">{mod.label}</span>
                            <img src={mod.icon} alt="" className="cajero-module-icon" />
                        </button>
                    ))}

                    {/* 6ta celda: última venta */}
                    <div className="cajero-card cajero-card--info">
                        <span className="cajero-card-label" style={{ color: '#7a4e1a' }}>
                            Última venta
                        </span>
                        <span className="cajero-last-sale-time">
                            {loadingStats ? '…' : statsError ? '—' : timeAgo(stats?.ultimaVenta)}
                        </span>
                    </div>
                </div>

                {/* Barra de métricas inferior */}
                <div className="cajero-bottom-stats">
                    <div className="cajero-bstat">
                        <div className="cajero-bstat-label">🧾 Ventas hoy</div>
                        <div className="cajero-bstat-value">
                            {loadingStats ? '…' : statsError ? '—' : stats?.ventasHoy ?? 0}
                        </div>
                        {!loadingStats && !statsError && stats && (
                            <div className={`cajero-bstat-trend ${trendClass(diffVentas)}`}>
                                {trendText(diffVentas)}
                            </div>
                        )}
                    </div>

                    <div className="cajero-bstat">
                        <div className="cajero-bstat-label">💰 Ingresos</div>
                        <div className="cajero-bstat-value">
                            {loadingStats ? '…' : statsError ? '—' : formatCurrency(stats?.ingresosHoy)}
                        </div>
                        {!loadingStats && !statsError && stats && (
                            <div className={`cajero-bstat-trend ${trendClass(diffIngresos)}`}>
                                {diffIngresos >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(diffIngresos))}
                            </div>
                        )}
                    </div>

                    <div className="cajero-bstat">
                        <div className="cajero-bstat-label">🛵 Domicilios</div>
                        <div className="cajero-bstat-value">
                            {loadingStats ? '…' : statsError ? '—' : stats?.domiciliosHoy ?? 0}
                        </div>
                        {!loadingStats && !statsError && stats && (
                            <div className={`cajero-bstat-trend ${trendClass(diffDomicilio)}`}>
                                {trendText(diffDomicilio)}
                            </div>
                        )}
                    </div>
                </div>

                <img src={dataFoodLogo} alt="DataFood" className="cajero-brand-logo" />
            </main>

            {/* ── MODALS ── */}
            {openCashModal && (
                <OpenRegister
                    employeeId={employeeId}
                    employeeName={employeeName}
                    onClose={handleOpenModalClose}
                />
            )}
            {closeCashModal && (
                <CloseRegister
                    employeeId={employeeId}
                    employeeName={employeeName}
                    onClose={handleCloseModalClose}
                />
            )}
        </div>
    );
}