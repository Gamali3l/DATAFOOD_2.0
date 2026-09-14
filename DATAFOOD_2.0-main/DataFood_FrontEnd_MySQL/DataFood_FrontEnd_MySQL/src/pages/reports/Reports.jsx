import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reports.css';

import imgVentas   from '../../assets/Rfacturas.png';
import imgCompras  from '../../assets/Rcompras.png';
import imgCaja     from '../../assets/Rventas.png';
import imgHeader from  '../../assets/mano.png';

const tarjetas = [
    {
        key: 'ventas',
        imagen: imgVentas,
        titulo: 'Reportes de Ventas',
        descripcion: 'Visualiza el rendimiento de las ventas, métodos de pago, productos más vendidos y más.',
        bullets: [
            'Ventas por día, semana o mes',
            'Ventas por método de pago',
            'Top productos y cajeros',
        ],
        boton: 'Ver Reporte de Ventas',
        path: '/reports/SalesReport',
    },
    {
        key: 'compras',
        imagen: imgCompras,
        titulo: 'Reportes de Compras',
        descripcion: 'Controla los gastos en compras, proveedores, insumos adquiridos y tendencias de abastecimiento.',
        bullets: [
            'Compras por día, semana o mes',
            'Compras por proveedor',
            'Insumos más comprados y costos',
        ],
        boton: 'Ver Reporte de Compras',
        path: '/reports/PurchaseReport',
    },
    {
        key: 'caja',
        imagen: imgCaja,
        titulo: 'Sesiones de Caja',
        descripcion: 'Consulta y administra todas las sesiones de caja, movimientos y arqueos del sistema.',
        bullets: [
            'Historial de sesiones de caja',
            'Retiros y depósitos por sesión',
            'Diferencias y arqueos',
        ],
        boton: 'Ver Sesiones de Caja',
        path: '/reports/CashRegisterReport',
    },
];

const money = (n) =>
    Number(n ?? 0).toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

// Compara si una fecha (string o Date) corresponde al día de hoy en hora local
const esHoy = (fechaStr) => {
    if (!fechaStr) return false;
    const d = new Date(fechaStr);
    const ahora = new Date();
    return (
        d.getFullYear() === ahora.getFullYear() &&
        d.getMonth()    === ahora.getMonth()    &&
        d.getDate()     === ahora.getDate()
    );
};

export default function Reports() {
    const navigate = useNavigate();

    const [actividadData, setActividadData] = useState({
        ventasHoy:     null,
        transacciones: null,
        comprasHoy:    null,
        numCompras:    null,
        ultimaFactura: null,
        facturasHoy:   null,
        cajasActivas:  null,
        cajasTotales:  null,
    });
    const [loadingActividad, setLoadingActividad] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [salesRes, cashRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/api/sales`),
                    fetch(`${import.meta.env.VITE_API_URL}/api/cashregister/report`),
                ]);

                // ── Ventas ──
                let ventasHoy = 0, transacciones = 0, ultimaFactura = '—', facturasHoy = 0;
                if (salesRes.ok) {
                    const rawSales = await salesRes.json();
                    const sales = Array.isArray(rawSales) ? rawSales : (rawSales?.data ?? []);
                    const ventasDeHoy = sales.filter(s => esHoy(s.saleDate));
                    ventasHoy     = ventasDeHoy.reduce((acc, s) => acc + Number(s.total ?? 0), 0);
                    transacciones = ventasDeHoy.length;
                    facturasHoy   = ventasDeHoy.filter(s => s.invoiceNumber).length;
                    const ultima  = ventasDeHoy
                        .filter(s => s.invoiceNumber)
                        .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))[0];
                    ultimaFactura = ultima?.invoiceNumber ?? '—';
                }

                // ── Caja ──
                let cajasActivas = 0, cajasTotales = 0;
                if (cashRes.ok) {
                    const rawCash = await cashRes.json();
                    const sessions = Array.isArray(rawCash) ? rawCash : (rawCash?.data ?? []);
                    cajasTotales = sessions.length;
                    cajasActivas = sessions.filter(s =>
                        s.status !== 'Cerrado' && s.status !== 'Cerrada'
                    ).length;
                }

                // ── Compras ──
                let comprasHoy = 0, numCompras = 0;
                try {
                    const { getPurchases } = await import('../../api/Supplyapi.js');
                    const pRes = await getPurchases();
                    const purchases = Array.isArray(pRes.data) ? pRes.data : [];
                    const comprasDeHoy = purchases.filter(p => esHoy(p.purchaseDate));
                    comprasHoy = comprasDeHoy.reduce((acc, p) => acc + Number(p.total ?? 0), 0);
                    numCompras = comprasDeHoy.length;
                } catch (_) {
                    // Supplyapi no disponible
                }

                setActividadData({
                    ventasHoy,
                    transacciones,
                    comprasHoy,
                    numCompras,
                    ultimaFactura,
                    facturasHoy,
                    cajasActivas,
                    cajasTotales,
                });
            } catch (e) {
                console.error('Error cargando actividad reciente:', e);
            } finally {
                setLoadingActividad(false);
            }
        };

        fetchAll();
    }, []);

    const actividad = [
        {
            icono: '📈',
            iconColor: '#22c55e',
            iconBg: '#dcfce7',
            label: 'Ventas hoy',
            valor: actividadData.ventasHoy !== null ? `C$ ${money(actividadData.ventasHoy)}` : '—',
            sub: actividadData.transacciones !== null ? `${actividadData.transacciones} transacciones` : 'Cargando...',
        },
        {
            icono: '🛒',
            iconColor: '#3b82f6',
            iconBg: '#dbeafe',
            label: 'Compras hoy',
            valor: actividadData.comprasHoy !== null ? `C$ ${money(actividadData.comprasHoy)}` : '—',
            sub: actividadData.numCompras !== null ? `${actividadData.numCompras} compras registradas` : 'Cargando...',
        },
        {
            icono: '📄',
            iconColor: '#8b5cf6',
            iconBg: '#ede9fe',
            label: 'Facturas emitidas hoy',
            valor: actividadData.facturasHoy !== null ? String(actividadData.facturasHoy) : '—',
            sub: actividadData.ultimaFactura !== null ? `Última: ${actividadData.ultimaFactura}` : 'Cargando...',
        },
        {
            icono: '🏦',
            iconColor: '#f59e0b',
            iconBg: '#fef3c7',
            label: 'Cajas activas',
            valor: actividadData.cajasActivas !== null ? String(actividadData.cajasActivas) : '—',
            sub: actividadData.cajasTotales !== null ? `De ${actividadData.cajasTotales} registradas` : 'Cargando...',
        },
    ];

    return (
        <div className="rep-page">


            {/* ── Encabezado con botón regresar integrado ── */}
            <header className="rep-header" style={{ position: 'relative' }}>
                <button className="rep-back" onClick={() => navigate('/')}>
                    ← Regresar a Principal
                </button>

                {/* ── BOTÓN NUEVO: Reporte de Ganancias ── */}
                <button
                    className="rep-profit-btn"
                    onClick={() => navigate('/reports/ProfitReport')}
                    title="Ver Reporte de Ganancias"
                >
                    💹 Ganancias
                </button>

                <div className="rep-header-main">
                    <img src={imgHeader} alt="Reportes" className="rep-header-icon" />
                    <div>
                        <h1 className="rep-title">Reportes del Sistema</h1>
                        <p className="rep-subtitle">Consulta y analiza la información del negocio</p>
                    </div>
                </div>
            </header>


            {/* ── Tarjetas de reportes ── */}
            <div className="rep-tarjetas">
                {tarjetas.map((t, i) => (
                    <div className="rep-card" key={t.key} style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="rep-card-icono-wrap">
                            <img
                                src={t.imagen}
                                alt={t.titulo}
                                className="rep-card-imagen"
                            />
                        </div>
                        <h2 className="rep-card-titulo">{t.titulo}</h2>
                        <p className="rep-card-desc">{t.descripcion}</p>
                        <ul className="rep-card-bullets">
                            {t.bullets.map(b => (
                                <li key={b}>
                                    <span className="rep-check">✅</span> {b}
                                </li>
                            ))}
                        </ul>
                        <button
                            className="rep-card-btn"
                            onClick={() => navigate(t.path)}
                        >
                            {t.boton} →
                        </button>
                    </div>
                ))}
            </div>

            {/* ── Actividad reciente ── */}
            <section className="rep-actividad">
                <div className="rep-actividad-titulo">
                    <span>🕐</span> Actividad reciente
                    {loadingActividad && (
                        <span className="rep-actividad-cargando"> · cargando datos...</span>
                    )}
                </div>
                <div className="rep-actividad-grid">
                    {actividad.map(a => (
                        <div className="rep-act-card" key={a.label}>
                            <div
                                className="rep-act-icon"
                                style={{ background: a.iconBg, color: a.iconColor }}
                            >
                                {a.icono}
                            </div>
                            <div className="rep-act-info">
                                <div className="rep-act-label">{a.label}</div>
                                <div className="rep-act-valor" style={{ color: a.iconColor }}>
                                    {a.valor}
                                </div>
                                <div className="rep-act-sub">{a.sub}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Aviso informativo ── */}
            <div className="rep-aviso">
                <span className="rep-aviso-icon">ℹ️</span>
                <p>
                    <strong>Importante:</strong> Todos los reportes se generan con base en los datos
                    registrados en el sistema. Verifica que las fechas seleccionadas sean correctas
                    para obtener información precisa.
                </p>
            </div>

        </div>
    );
}