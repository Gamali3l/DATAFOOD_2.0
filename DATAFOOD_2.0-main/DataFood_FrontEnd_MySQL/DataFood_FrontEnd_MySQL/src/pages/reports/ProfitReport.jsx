import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './ProfitReport.css';

Chart.register(...registerables);

/* ─── Helpers ─── */
const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('es-NI', { dateStyle: 'short' }) : '—';

const money = (n) =>
    Number(n ?? 0).toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

function getRangeForFilter(filter) {
    const now = new Date();
    const pad = (d) => d.toISOString().split('T')[0];
    if (filter === 'Hoy') { const s = pad(now); return { startDate: s, endDate: s }; }
    if (filter === 'Esta semana') {
        const day = now.getDay() || 7;
        const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
        return { startDate: pad(mon), endDate: pad(now) };
    }
    if (filter === 'Este mes') {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: pad(first), endDate: pad(now) };
    }
    if (filter === 'Este año') {
        const first = new Date(now.getFullYear(), 0, 1);
        return { startDate: pad(first), endDate: pad(now) };
    }
    return { startDate: '', endDate: '' };
}

/* Derive groupBy default from quick filter */
function defaultGroupBy(filtroRapido) {
    if (filtroRapido === 'Hoy' || filtroRapido === 'Esta semana') return 'dia';
    if (filtroRapido === 'Este mes') return 'dia';
    if (filtroRapido === 'Este año') return 'mes';
    return 'dia';
}

/* ─── Group helpers ─── */
function groupByDay(items, dateKey, totalKey) {
    const map = {};
    items.forEach((item) => {
        const d = new Date(item[dateKey]);
        const label = d.toLocaleDateString('es-NI', { dateStyle: 'short' });
        map[label] = (map[label] ?? 0) + Number(item[totalKey] ?? 0);
    });
    return map;
}

function groupByMonth(items, dateKey, totalKey) {
    const map = {};
    items.forEach((item) => {
        const d = new Date(item[dateKey]);
        const label = d.toLocaleDateString('es-NI', { year: 'numeric', month: 'short' });
        map[label] = (map[label] ?? 0) + Number(item[totalKey] ?? 0);
    });
    return map;
}

function groupByYear(items, dateKey, totalKey) {
    const map = {};
    items.forEach((item) => {
        const d = new Date(item[dateKey]);
        const label = String(d.getFullYear());
        map[label] = (map[label] ?? 0) + Number(item[totalKey] ?? 0);
    });
    return map;
}

function getGroupFn(groupBy) {
    if (groupBy === 'mes') return groupByMonth;
    if (groupBy === 'año') return groupByYear;
    return groupByDay;
}

function getUnionDates(salesMap, purchasesMap) {
    return [...new Set([...Object.keys(salesMap), ...Object.keys(purchasesMap)])].sort();
}

/* Label for groupBy */
function groupByLabel(groupBy) {
    if (groupBy === 'mes') return 'Mes';
    if (groupBy === 'año') return 'Año';
    return 'Día';
}

/* ─── Design palette ─── */
const COLORS = {
    orange:  '#f97316',
    teal:    '#1abc9c',
    blue:    '#3b82f6',
    green:   '#16a34a',
    red:     '#dc2626',
    gray:    '#6b7280',
};

/* ─── Chart view ─── */
function GraficaGanancias({ sales, purchases, onBack, filtroRapido }) {
    const chartRef      = useRef(null);
    const chartInst     = useRef(null);
    const [chartType,   setChartType]   = useState('bar');
    const [groupBy,     setGroupBy]     = useState(defaultGroupBy(filtroRapido));
    const [localStart,  setLocalStart]  = useState('');
    const [localEnd,    setLocalEnd]    = useState('');

    const filteredSales = sales.filter((s) => {
        const d = new Date(s.saleDate);
        const ok1 = localStart ? d >= new Date(localStart) : true;
        const ok2 = localEnd   ? d <= new Date(localEnd + 'T23:59:59') : true;
        return ok1 && ok2;
    });
    const filteredPurchases = purchases.filter((p) => {
        const d = new Date(p.purchaseDate);
        const ok1 = localStart ? d >= new Date(localStart) : true;
        const ok2 = localEnd   ? d <= new Date(localEnd + 'T23:59:59') : true;
        return ok1 && ok2;
    });

    const totalVentas   = filteredSales.reduce((s, v) => s + Number(v.total ?? 0), 0);
    const totalCompras  = filteredPurchases.reduce((s, p) => s + Number(p.total ?? 0), 0);
    const ganancia      = totalVentas - totalCompras;
    const margen        = totalVentas > 0 ? ((ganancia / totalVentas) * 100).toFixed(1) : 0;
    const ticketProm    = filteredSales.length > 0 ? (totalVentas / filteredSales.length).toFixed(2) : 0;
    const diasConVentas = new Set(filteredSales.map(s => new Date(s.saleDate).toLocaleDateString('es-NI'))).size;
    const ventaPromDia  = diasConVentas > 0 ? (totalVentas / diasConVentas).toFixed(2) : 0;

    useEffect(() => {
        if (!chartRef.current) return;
        if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; }

        const groupFn = getGroupFn(groupBy);
        const sMap = groupFn(filteredSales, 'saleDate', 'total');
        const pMap = groupFn(filteredPurchases, 'purchaseDate', 'total');
        const dates = getUnionDates(sMap, pMap);
        if (dates.length === 0) return;

        const sData = dates.map((d) => sMap[d] ?? 0);
        const pData = dates.map((d) => pMap[d] ?? 0);
        const gData = dates.map((d) => (sMap[d] ?? 0) - (pMap[d] ?? 0));

        const ctx = chartRef.current.getContext('2d');

        /* Doughnut / Pie */
        if (chartType === 'doughnut' || chartType === 'pie') {
            chartInst.current = new Chart(ctx, {
                type: chartType,
                data: {
                    labels: ['Ventas (C$)', 'Compras (C$)'],
                    datasets: [{
                        data: [totalVentas, totalCompras],
                        backgroundColor: [COLORS.teal + 'cc', COLORS.blue + 'cc'],
                        borderColor:     [COLORS.teal, COLORS.blue],
                        borderWidth: 2,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { font: { size: 13 }, color: '#374151' } },
                        title: {
                            display: true,
                            text: 'Proporcion Ventas vs Compras',
                            font: { size: 14, weight: 'bold' }, color: '#111827',
                            padding: { bottom: 12 },
                        },
                        tooltip: { callbacks: { label: (ctx) => ` C$ ${money(ctx.parsed)}` } },
                    },
                },
            });
            return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
        }

        /* Radar */
        if (chartType === 'radar') {
            chartInst.current = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: dates,
                    datasets: [
                        { label: 'Ventas (C$)',  data: sData, backgroundColor: COLORS.teal + '33', borderColor: COLORS.teal, borderWidth: 2, pointBackgroundColor: COLORS.teal },
                        { label: 'Compras (C$)', data: pData, backgroundColor: COLORS.blue + '33', borderColor: COLORS.blue, borderWidth: 2, pointBackgroundColor: COLORS.blue },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { font: { size: 12 }, color: '#374151' } },
                        title: { display: true, text: `Radar — Ventas vs Compras por ${groupByLabel(groupBy)}`, font: { size: 14, weight: 'bold' }, color: '#111827', padding: { bottom: 12 } },
                        tooltip: { callbacks: { label: (ctx) => ` C$ ${money(ctx.parsed.r)}` } },
                    },
                    scales: {
                        r: {
                            ticks: { callback: (v) => 'C$ ' + Number(v).toLocaleString('es-NI'), color: '#6b7280', font: { size: 10 } },
                            grid: { color: '#e5e7eb' },
                            pointLabels: { color: '#374151', font: { size: 10 } },
                        },
                    },
                },
            });
            return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
        }

        /* Barras apiladas */
        if (chartType === 'stacked') {
            chartInst.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: dates,
                    datasets: [
                        { label: 'Ventas (C$)',  data: sData, backgroundColor: COLORS.teal + 'bf', borderColor: COLORS.teal, borderWidth: 1, stack: 'totales' },
                        { label: 'Compras (C$)', data: pData, backgroundColor: COLORS.blue + 'a8', borderColor: COLORS.blue, borderWidth: 1, stack: 'totales' },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', labels: { font: { size: 12 }, color: '#374151' } },
                        title: { display: true, text: `Barras Apiladas — Ventas y Compras por ${groupByLabel(groupBy)}`, font: { size: 14, weight: 'bold' }, color: '#111827', padding: { bottom: 12 } },
                        tooltip: { callbacks: { label: (ctx) => ` C$ ${money(ctx.parsed.y)}` } },
                    },
                    scales: {
                        x: { stacked: true, ticks: { color: '#6b7280', maxRotation: 45 }, grid: { display: false } },
                        y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => 'C$ ' + Number(v).toLocaleString('es-NI'), color: '#6b7280' }, grid: { color: '#f0e8df' } },
                    },
                },
            });
            return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
        }

        /* Lineas / Area / Barras agrupadas */
        const isArea = chartType === 'area';
        const isLine = chartType === 'line' || isArea;

        chartInst.current = new Chart(ctx, {
            type: isLine ? 'line' : 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Ventas (C$)',
                        data: sData,
                        backgroundColor: isLine ? COLORS.teal + '40' : COLORS.teal + 'bf',
                        borderColor: COLORS.teal,
                        borderWidth: 2, tension: 0.4, fill: isArea,
                        pointBackgroundColor: COLORS.teal, pointRadius: isLine ? 4 : 0,
                    },
                    {
                        label: 'Compras (C$)',
                        data: pData,
                        backgroundColor: isLine ? COLORS.blue + '40' : COLORS.blue + 'a8',
                        borderColor: COLORS.blue,
                        borderWidth: 2, tension: 0.4, fill: isArea,
                        pointBackgroundColor: COLORS.blue, pointRadius: isLine ? 4 : 0,
                    },
                    {
                        label: 'Ganancia neta (C$)',
                        data: gData,
                        backgroundColor: isLine
                            ? COLORS.orange + '33'
                            : gData.map((v) => v >= 0 ? COLORS.green + 'bf' : COLORS.red + 'b3'),
                        borderColor: isLine
                            ? COLORS.orange
                            : gData.map((v) => v >= 0 ? COLORS.green : COLORS.red),
                        borderWidth: 2, tension: 0.4, fill: isArea,
                        pointBackgroundColor: COLORS.orange, pointRadius: isLine ? 4 : 0,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 12 }, color: '#374151' } },
                    title: { display: true, text: `Ventas vs Compras vs Ganancia — por ${groupByLabel(groupBy)}`, font: { size: 14, weight: 'bold' }, color: '#111827', padding: { bottom: 12 } },
                    tooltip: { callbacks: { label: (ctx) => ` C$ ${money(ctx.parsed.y ?? ctx.parsed)}` } },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: (v) => 'C$ ' + Number(v).toLocaleString('es-NI'), color: '#6b7280' },
                        grid: { color: '#f0e8df' },
                    },
                    x: { ticks: { color: '#6b7280', maxRotation: 45 }, grid: { display: false } },
                },
            },
        });

        return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
    }, [chartType, groupBy, localStart, localEnd, sales, purchases]);

    const exportChartPNG = () => {
        if (!chartInst.current) return;
        const a = document.createElement('a');
        a.download = 'Grafica_Ganancias.png';
        a.href = chartInst.current.toBase64Image('image/png', 1);
        a.click();
    };

    const hideGroupBy = chartType === 'doughnut' || chartType === 'pie';

    /* ── Periodo top productivo ── */
    const groupFn = getGroupFn(groupBy);
    const sMapAll = groupFn(filteredSales, 'saleDate', 'total');
    const topPeriodo = Object.entries(sMapAll).sort((a,b) => b[1]-a[1])[0];
    const pMapAll = groupFn(filteredPurchases, 'purchaseDate', 'total');
    const topGanancia = Object.entries(
        getUnionDates(sMapAll, pMapAll).reduce((acc, d) => {
            acc[d] = (sMapAll[d] ?? 0) - (pMapAll[d] ?? 0);
            return acc;
        }, {})
    ).sort((a,b) => b[1]-a[1])[0];

    return (
        <div className="rg-graph-page">
            <div className="rg-graph-header">
                <div className="rg-graph-header-left">
                    <button className="rg-btn-outline" onClick={onBack}>← Regresar</button>
                    <h2 className="rg-graph-title"> Estadísticas de Ganancias</h2>
                </div>
                <button className="rg-btn-orange" onClick={exportChartPNG}>🖼️ Exportar Gráfico PNG</button>
            </div>

            <div className="rg-graph-layout">
                {/* Sidebar */}
                <div className="rg-graph-sidebar">
                    <div className="rg-graph-panel">
                        <div className="rg-graph-panel-title">Rango de Fechas</div>
                        <div className="rg-graph-date-group">
                            <label>Fecha de Inicio</label>
                            <input type="date" value={localStart} onChange={(e) => setLocalStart(e.target.value)} />
                        </div>
                        <div className="rg-graph-date-group">
                            <label>Fecha Final</label>
                            <input type="date" value={localEnd} onChange={(e) => setLocalEnd(e.target.value)} />
                        </div>
                        {(localStart || localEnd) && (
                            <button className="rg-graph-clear" onClick={() => { setLocalStart(''); setLocalEnd(''); }}>
                                Limpiar fechas
                            </button>
                        )}
                    </div>

                    {/* Resumen del Periodo */}
                    <div className="rg-graph-panel">
                        <div className="rg-graph-panel-title">Resumen del Periodo</div>
                        <div className="rg-graph-summary-grid">
                            <div className="rg-graph-summary-row ventas">
                                <span className="rg-graph-summary-label">Ventas</span>
                                <span className="rg-graph-summary-value">C$ {money(totalVentas)}</span>
                            </div>
                            <div className="rg-graph-summary-row compras">
                                <span className="rg-graph-summary-label">Compras</span>
                                <span className="rg-graph-summary-value">C$ {money(totalCompras)}</span>
                            </div>
                            <div className={`rg-graph-summary-row ${ganancia >= 0 ? 'ganancia' : 'perdida'}`}>
                                <span className="rg-graph-summary-label">{ganancia >= 0 ? 'Ganancia' : 'Perdida'}</span>
                                <span className="rg-graph-summary-value">C$ {money(Math.abs(ganancia))}</span>
                            </div>
                            <div className="rg-graph-summary-row" style={{ background: '#f3f4f6' }}>
                                <span className="rg-graph-summary-label">Margen</span>
                                <span className="rg-graph-summary-value" style={{ color: Number(margen) >= 0 ? COLORS.green : COLORS.red }}>
                                    {margen}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Estadisticas extra */}
                    <div className="rg-graph-panel">
                        <div className="rg-graph-panel-title">Indicadores Clave</div>
                        <div className="rg-graph-kpi-list">
                            <div className="rg-graph-kpi-item">
                                <span className="rg-graph-kpi-label">Transacciones</span>
                                <span className="rg-graph-kpi-value">{filteredSales.length}</span>
                            </div>
                            <div className="rg-graph-kpi-item">
                                <span className="rg-graph-kpi-label">Ticket promedio</span>
                                <span className="rg-graph-kpi-value">C$ {money(ticketProm)}</span>
                            </div>
                            <div className="rg-graph-kpi-item">
                                <span className="rg-graph-kpi-label">Dias con ventas</span>
                                <span className="rg-graph-kpi-value">{diasConVentas}</span>
                            </div>
                            <div className="rg-graph-kpi-item">
                                <span className="rg-graph-kpi-label">Venta prom / dia</span>
                                <span className="rg-graph-kpi-value">C$ {money(ventaPromDia)}</span>
                            </div>
                            {topPeriodo && (
                                <div className="rg-graph-kpi-item rg-graph-kpi-highlight">
                                    <span className="rg-graph-kpi-label">Mejor {groupByLabel(groupBy).toLowerCase()} (ventas)</span>
                                    <span className="rg-graph-kpi-value" style={{ color: COLORS.teal }}>{topPeriodo[0]}</span>
                                    <span className="rg-graph-kpi-sub">C$ {money(topPeriodo[1])}</span>
                                </div>
                            )}
                            {topGanancia && topGanancia[1] > 0 && (
                                <div className="rg-graph-kpi-item rg-graph-kpi-highlight">
                                    <span className="rg-graph-kpi-label">Mejor {groupByLabel(groupBy).toLowerCase()} (ganancia)</span>
                                    <span className="rg-graph-kpi-value" style={{ color: COLORS.green }}>{topGanancia[0]}</span>
                                    <span className="rg-graph-kpi-sub">C$ {money(topGanancia[1])}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Chart area */}
                <div className="rg-graph-main">
                    <div className="rg-graph-card">
                        <div className="rg-graph-controls">
                            <div className="rg-graph-control-group">
                                <label>Tipo de Grafico</label>
                                <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                                    <option value="bar"> Barras agrupadas</option>
                                    <option value="stacked"> Barras apiladas</option>
                                    <option value="line"> Líneas</option>
                                    <option value="area"> Área</option>
                                    <option value="doughnut"> Dona (Doughnut)</option>
                                    <option value="pie"> Pastel (Pie)</option>
                                    <option value="radar"> Radar</option>
                                </select>
                            </div>
                            {!hideGroupBy && (
                                <div className="rg-graph-control-group">
                                    <label>Agrupar por</label>
                                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                                        <option value="dia">Dia</option>
                                        <option value="mes">Mes</option>
                                        <option value="año">Año</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="rg-graph-canvas-wrap">
                            {filteredSales.length === 0 && filteredPurchases.length === 0 ? (
                                <div className="rg-graph-empty">
                                    <span style={{ fontSize: '2.5rem' }}>—</span>
                                    <p>No hay datos para el periodo seleccionado.</p>
                                </div>
                            ) : (
                                <canvas ref={chartRef} />
                            )}
                        </div>
                    </div>

                    {/* Mini stats debajo del grafico */}
                    <div className="rg-graph-bottom-stats">
                        <div className="rg-graph-bottom-card" style={{ borderLeft: `4px solid ${COLORS.teal}` }}>
                            <div className="rg-graph-bottom-label">Total Ventas</div>
                            <div className="rg-graph-bottom-value" style={{ color: COLORS.teal }}>C$ {money(totalVentas)}</div>
                            <div className="rg-graph-bottom-sub">{filteredSales.length} transacciones</div>
                        </div>
                        <div className="rg-graph-bottom-card" style={{ borderLeft: `4px solid ${COLORS.blue}` }}>
                            <div className="rg-graph-bottom-label">Total Compras</div>
                            <div className="rg-graph-bottom-value" style={{ color: COLORS.blue }}>C$ {money(totalCompras)}</div>
                            <div className="rg-graph-bottom-sub">{filteredSales.length > 0 ? 'periodo filtrado' : '—'}</div>
                        </div>
                        <div className="rg-graph-bottom-card" style={{ borderLeft: `4px solid ${ganancia >= 0 ? COLORS.green : COLORS.red}` }}>
                            <div className="rg-graph-bottom-label">Ganancia Neta</div>
                            <div className="rg-graph-bottom-value" style={{ color: ganancia >= 0 ? COLORS.green : COLORS.red }}>
                                {ganancia >= 0 ? '+' : '-'}C$ {money(Math.abs(ganancia))}
                            </div>
                            <div className="rg-graph-bottom-sub">Ventas − Compras</div>
                        </div>
                        <div className="rg-graph-bottom-card" style={{ borderLeft: `4px solid ${COLORS.orange}` }}>
                            <div className="rg-graph-bottom-label">Margen</div>
                            <div className="rg-graph-bottom-value" style={{ color: Number(margen) >= 0 ? COLORS.green : COLORS.red }}>
                                {margen}%
                            </div>
                            <div className="rg-graph-bottom-sub">Sobre ventas totales</div>
                        </div>
                        <div className="rg-graph-bottom-card" style={{ borderLeft: `4px solid ${COLORS.gray}` }}>
                            <div className="rg-graph-bottom-label">Ticket Promedio</div>
                            <div className="rg-graph-bottom-value" style={{ color: '#111827' }}>C$ {money(ticketProm)}</div>
                            <div className="rg-graph-bottom-sub">Por transaccion</div>
                        </div>
                        <div className="rg-graph-bottom-card" style={{ borderLeft: `4px solid ${COLORS.orange}` }}>
                            <div className="rg-graph-bottom-label">Venta Prom / Dia</div>
                            <div className="rg-graph-bottom-value" style={{ color: '#111827' }}>C$ {money(ventaPromDia)}</div>
                            <div className="rg-graph-bottom-sub">{diasConVentas} dias activos</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Main component ─── */
export default function ProfitReport() {
    const navigate = useNavigate();
    const exportRef = useRef(null);

    const [sales,     setSales]     = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);

    /* Filters */
    const { startDate: initStart, endDate: initEnd } = getRangeForFilter('Este mes');
    const [filtroRapido, setFiltroRapido] = useState('Este mes');
    const [startDate,    setStartDate]    = useState(initStart);
    const [endDate,      setEndDate]      = useState(initEnd);

    /* UI */
    const [page,          setPage]         = useState(1);
    const [showGrafica,   setShowGrafica]   = useState(false);
    const [showExport,    setShowExport]    = useState(false);

    const PAGE_SIZE = 10;

    /* ── Load ── */
    useEffect(() => {
        (async () => {
            try {
                const salesRes = await fetch(`${import.meta.env.VITE_API_URL}/api/sales`);
                let salesList = [];
                if (salesRes.ok) {
                    const raw = await salesRes.json();
                    salesList = Array.isArray(raw) ? raw : (raw?.data ?? []);
                    salesList.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
                }
                setSales(salesList);

                try {
                    const { getPurchases } = await import('../../api/Supplyapi.js');
                    const pRes = await getPurchases();
                    const purList = Array.isArray(pRes.data) ? pRes.data : [];
                    purList.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
                    setPurchases(purList);
                } catch (_) { /* Supplyapi no disponible */ }

            } catch (e) {
                console.error(e);
                setError('No se pudieron cargar los datos. Verifica la conexion con el servidor.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /* Close export on outside click */
    useEffect(() => {
        const handler = (e) => {
            if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ── Quick filter ── */
    const handleFiltroRapido = (f) => {
        setFiltroRapido(f);
        if (f !== 'Personalizar rango') {
            const { startDate: s, endDate: e } = getRangeForFilter(f);
            setStartDate(s);
            setEndDate(e);
        }
        setPage(1);
    };

    /* ── Filtered data ── */
    const filteredSales = sales.filter((s) => {
        const d = new Date(s.saleDate);
        const ok1 = startDate ? d >= new Date(startDate) : true;
        const ok2 = endDate   ? d <= new Date(endDate + 'T23:59:59') : true;
        return ok1 && ok2;
    });
    const filteredPurchases = purchases.filter((p) => {
        const d = new Date(p.purchaseDate);
        const ok1 = startDate ? d >= new Date(startDate) : true;
        const ok2 = endDate   ? d <= new Date(endDate + 'T23:59:59') : true;
        return ok1 && ok2;
    });

    /* ── Build grouped rows — derived from filtroRapido ── */
    const exportGroupBy = filtroRapido === 'Este año' ? 'mes' : filtroRapido === 'Personalizar rango' ? 'dia' : 'dia';
    const rowGroupFn    = getGroupFn(exportGroupBy);
    const salesByDay   = rowGroupFn(filteredSales, 'saleDate', 'total');
    const purchByDay   = rowGroupFn(filteredPurchases, 'purchaseDate', 'total');
    const allDays = [...new Set([...Object.keys(salesByDay), ...Object.keys(purchByDay)])]
        .sort((a, b) => {
            // Try numeric year sort for 'año' grouping
            if (exportGroupBy === 'año') return Number(b) - Number(a);
            // For day labels dd/mm/yy
            const parseDMY = (str) => {
                const parts = str.split('/');
                if (parts.length === 3) {
                    const [d, m, y] = parts;
                    return new Date(Number(y) < 100 ? 2000 + Number(y) : Number(y), Number(m) - 1, Number(d));
                }
                return new Date(str);
            };
            return parseDMY(b) - parseDMY(a);
        });

    const rows = allDays.map((day) => {
        const v = salesByDay[day] ?? 0;
        const c = purchByDay[day] ?? 0;
        const g = v - c;
        const m = v > 0 ? ((g / v) * 100).toFixed(1) : 0;
        return { day, ventas: v, compras: c, ganancia: g, margen: m };
    });

    /* ── Global stats ── */
    const totalVentas  = filteredSales.reduce((s, v) => s + Number(v.total ?? 0), 0);
    const totalCompras = filteredPurchases.reduce((s, p) => s + Number(p.total ?? 0), 0);
    const gananciaNet  = totalVentas - totalCompras;
    const margenNet    = totalVentas > 0 ? ((gananciaNet / totalVentas) * 100).toFixed(1) : 0;
    const numVentas    = filteredSales.length;
    const numCompras   = filteredPurchases.length;

    /* ── Pagination ── */
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const paginated  = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    /* ── Clear ── */
    const clearFilters = () => {
        const { startDate: s, endDate: e } = getRangeForFilter('Este mes');
        setFiltroRapido('Este mes'); setStartDate(s); setEndDate(e); setPage(1);
    };

    /* ── Periodo label for filenames ── */
    const getPeriodoLabel = () => {
        if (filtroRapido === 'Hoy')         return 'Hoy';
        if (filtroRapido === 'Esta semana') return 'Esta_Semana';
        if (filtroRapido === 'Este mes')    return 'Este_Mes';
        if (filtroRapido === 'Este año')    return 'Este_Anio';
        if (startDate && endDate)
            return `${startDate}_al_${endDate}`;
        return 'Todo';
    };

    /* ── Grouping label — derived from filtroRapido ── */
    const getGroupLabel = () => {
        if (exportGroupBy === 'mes') return 'por Mes';
        if (exportGroupBy === 'año') return 'por Año';
        return 'por Dia';
    };

    /* ─── Export Excel ─── */
    const exportExcel = async () => {
        setShowExport(false);
        if (!window.ExcelJS) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
                script.onload = resolve; script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        const ExcelJS = window.ExcelJS;
        const wb = new ExcelJS.Workbook();
        wb.creator = 'Sistema de Reportes'; wb.created = new Date();

        const C = { tealDark:'1A5276', tealMed:'1ABC9C', tealLight:'D5F5E3', orange:'E67E22',
            grayHdr:'2E4053', gray2:'566573', white:'FFFFFF', dark:'1B2631',
            green:'145A32', red:'922B21' };
        const argb = (h) => `FF${h}`;
        const border = {
            top:{style:'thin',color:{argb:'FFBDC3C7'}}, bottom:{style:'thin',color:{argb:'FFBDC3C7'}},
            left:{style:'thin',color:{argb:'FFBDC3C7'}}, right:{style:'thin',color:{argb:'FFBDC3C7'}},
        };
        const hSt = (bg, fg=C.white, sz=11, bold=true) => ({
            font:{name:'Arial',size:sz,bold,color:{argb:argb(fg)}},
            fill:{type:'pattern',pattern:'solid',fgColor:{argb:argb(bg)}},
            alignment:{horizontal:'center',vertical:'middle',wrapText:true}, border,
        });
        const dSt = (bg, bold=false, align='left', color=C.dark) => ({
            font:{name:'Arial',size:10,bold,color:{argb:argb(color)}},
            fill:bg?{type:'pattern',pattern:'solid',fgColor:{argb:argb(bg)}}:undefined,
            alignment:{horizontal:align,vertical:'middle'}, border,
        });
        const applyS = (cell, st) => {
            if(st.font) cell.font=st.font; if(st.fill) cell.fill=st.fill;
            if(st.alignment) cell.alignment=st.alignment; if(st.border) cell.border=st.border;
        };
        const mFmt = (cell) => { cell.numFmt='"C$ "#,##0.00'; };

        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-NI',{dateStyle:'short'}) : '';
        const periodoStr = startDate && endDate
            ? `${fmtDate(startDate)} - ${fmtDate(endDate)}`
            : filtroRapido || 'Todo el periodo';
        const generadoStr = new Date().toLocaleDateString('es-NI',{dateStyle:'short'});
        const groupLbl = getGroupLabel();

        /* Sheet name reflects grouping */
        const sheetName = `Ganancia ${groupLbl}`;

        const ws = wb.addWorksheet(sheetName, {views:[{showGridLines:false}]});
        ws.columns = [
            {width:3},   // A spacer
            {width:20},  // B
            {width:20},  // C
            {width:20},  // D
            {width:20},  // E
            {width:20},  // F
        ];

        ws.getRow(1).height=8;
        ws.mergeCells('B2:F3'); ws.getRow(2).height=34; ws.getRow(3).height=22;
        applyS(ws.getCell('B2'), hSt(C.tealDark,C.white,22,true));
        ws.getCell('B2').value='REPORTE DE GANANCIAS';

        ws.mergeCells('B4:F4'); ws.getRow(4).height=18;
        applyS(ws.getCell('B4'), hSt(C.grayHdr,C.white,10,false));
        ws.getCell('B4').value=`Comedor Raquel   |   Periodo: ${periodoStr}   |   Generado: ${generadoStr}   |   Agrupado: ${groupLbl}`;

        ws.getRow(5).height=10;
        ws.mergeCells('B6:F6'); ws.getRow(6).height=22;
        applyS(ws.getCell('B6'), hSt(C.tealMed,C.white,11,true));
        ws.getCell('B6').value='RESUMEN EJECUTIVO';

        // KPIs: 4 cards spread across B:C, C:D merged pairs → use individual cols B C D E F
        // Each KPI occupies one column; wrapText + wide columns prevent cutoff
        const kpis = [
            {label:'TOTAL VENTAS (C$)',  value:totalVentas,    sub:periodoStr,                               fmtMoney:true},
            {label:'TOTAL COMPRAS (C$)', value:totalCompras,   sub:periodoStr,                               fmtMoney:true},
            {label:'GANANCIA NETA (C$)', value:Math.abs(gananciaNet), sub:gananciaNet>=0?'Ganancia':'Perdida', fmtMoney:true, colorByGanancia:true},
            {label:'MARGEN DE GANANCIA', value:Number(margenNet)/100, sub:gananciaNet>=0?'Rentable':'En numeros rojos', fmtPct:true},
        ];
        ws.getRow(7).height=18; ws.getRow(8).height=30; ws.getRow(9).height=16;
        const kpiCols=['B','C','D','E','F'];
        // Apply background to all 5 cols (B-F) on rows 7-9 to avoid any blank white cell showing
        ['B','C','D','E','F'].forEach(col=>{
            [7,8,9].forEach(rowNum=>{
                const cell=ws.getCell(`${col}${rowNum}`);
                cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:argb(C.tealDark)}};
                cell.border=border;
            });
        });
        kpis.forEach(({label,value,sub,fmtMoney,fmtPct,colorByGanancia},idx)=>{
            const col=kpiCols[idx];
            const r7=ws.getCell(`${col}7`);
            r7.value=label;
            applyS(r7,hSt('2E4053',C.white,9,true));
            const bg8 = colorByGanancia ? (gananciaNet>=0?C.green:C.red) : C.tealDark;
            const r8=ws.getCell(`${col}8`);
            r8.value=value;
            applyS(r8,hSt(bg8,C.white,13,true));
            if(fmtMoney) r8.numFmt='"C$ "#,##0.00';
            if(fmtPct)   r8.numFmt='0.0"%"';
            const r9=ws.getCell(`${col}9`);
            r9.value=sub;
            applyS(r9,hSt(C.gray2,C.white,8,false));
        });
        // 5th column (F) gets a decorative filler with the period label
        const fR7=ws.getCell('F7'); fR7.value='PERIODO'; applyS(fR7,hSt('2E4053',C.white,9,true));
        const fR8=ws.getCell('F8'); fR8.value=periodoStr; applyS(fR8,hSt(C.tealDark,C.white,10,false));
        const fR9=ws.getCell('F9'); fR9.value=generadoStr; applyS(fR9,hSt(C.gray2,C.white,8,false));

        ws.getRow(10).height=12;
        ws.mergeCells('B11:F11'); ws.getRow(11).height=22;
        applyS(ws.getCell('B11'), hSt(C.tealDark,C.white,11,true));
        ws.getCell('B11').value=`DETALLE ${groupLbl.toUpperCase()}`;

        ws.getRow(12).height=22;
        ['Dia','Ventas (C$)','Compras (C$)','Ganancia Neta (C$)','Margen (%)'].forEach((h,i)=>{
            const c=ws.getCell(12,i+2); c.value=h;
            applyS(c,hSt(C.grayHdr,C.white,10,true));
        });

        rows.forEach((r,i)=>{
            const row=13+i; ws.getRow(row).height=20;
            const bg=i%2===0?C.white:C.tealLight;
            const gColor = r.ganancia>=0?C.green:C.red;
            const vals=[r.day, r.ventas, r.compras, r.ganancia, Number(r.margen)/100];
            vals.forEach((v,j)=>{
                const cell=ws.getCell(row,j+2);
                cell.value=v;
                const isM=j>=1; const isG=j===3||j===4;
                applyS(cell, dSt(bg, isG, isM?'right':'left', isG?gColor:C.dark));
                if(j===1||j===2||j===3) mFmt(cell);
                if(j===4) cell.numFmt='0.0"%"';
            });
        });

        const totalRow=13+rows.length; ws.getRow(totalRow).height=24;
        ws.mergeCells(`B${totalRow}:C${totalRow}`);
        const orangeSt={
            font:{name:'Arial',size:12,bold:true,color:{argb:'FFFFFFFF'}},
            fill:{type:'pattern',pattern:'solid',fgColor:{argb:argb(C.orange)}},
            alignment:{horizontal:'right',vertical:'middle'},border,
        };
        applyS(ws.getCell(`B${totalRow}`),orangeSt);
        ws.getCell(`B${totalRow}`).value='TOTALES';
        [[totalVentas,3],[totalCompras,4],[gananciaNet,5],[Number(margenNet)/100,6]].forEach(([v,col])=>{
            const cell=ws.getCell(totalRow,col);
            cell.value=v;
            applyS(cell,orangeSt);
            if(col<6) { cell.numFmt='"C$ "#,##0.00'; }
            else { cell.numFmt='0.0"%"'; }
        });

        const buf=await wb.xlsx.writeBuffer();
        const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        const label = getPeriodoLabel();
        a.download=`Reporte_Ganancias_${label}.xlsx`;
        a.click(); URL.revokeObjectURL(url);
    };

    /* ─── Export PNG ─── */
    const exportTablePNG = async () => {
        setShowExport(false);
        if (!window.html2canvas) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.onload = resolve; script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-NI',{dateStyle:'short'}) : '';
        const periodoStr = startDate && endDate
            ? `${fmtDate(startDate)} - ${fmtDate(endDate)}`
            : filtroRapido || 'Todo el periodo';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:1000px;background:white;font-family:Arial,sans-serif;font-size:13px;padding:0;z-index:-1;`;
        wrapper.innerHTML = `
            <div style="background:#1A5276;color:white;text-align:center;padding:18px 0;font-size:22px;font-weight:bold;letter-spacing:1px;">REPORTE DE GANANCIAS</div>
            <div style="background:#2E4053;color:white;text-align:center;padding:7px 0;font-size:11px;">Comedor Raquel &nbsp;|&nbsp; Periodo: ${periodoStr} &nbsp;|&nbsp; Generado: ${new Date().toLocaleDateString('es-NI',{dateStyle:'short'})}</div>
            <div style="background:#1ABC9C;color:white;text-align:center;padding:8px 0;font-size:13px;font-weight:bold;margin-top:10px;">RESUMEN EJECUTIVO</div>
            <div style="display:flex;border:1px solid #ccc;">
                ${[
            {label:'TOTAL VENTAS (C$)',value:`C$ ${money(totalVentas)}`,sub:periodoStr},
            {label:'TOTAL COMPRAS (C$)',value:`C$ ${money(totalCompras)}`,sub:periodoStr},
            {label:'GANANCIA NETA (C$)',value:`C$ ${money(Math.abs(gananciaNet))}`,sub:gananciaNet>=0?'Ganancia':'Perdida',color:gananciaNet>=0?'#145A32':'#922B21'},
            {label:'MARGEN',value:`${margenNet}%`,sub:'De las ventas',color:Number(margenNet)>=0?'#145A32':'#922B21'},
        ].map(k=>`<div style="flex:1;border-right:1px solid #ccc;">
                    <div style="background:#2E4053;color:white;text-align:center;padding:5px;font-size:10px;font-weight:bold;">${k.label}</div>
                    <div style="background:${k.color||'#1A5276'};color:white;text-align:center;padding:8px;font-size:16px;font-weight:bold;">${k.value}</div>
                    <div style="background:#566573;color:white;text-align:center;padding:4px;font-size:10px;">${k.sub}</div>
                </div>`).join('')}
            </div>
            <div style="background:#1A5276;color:white;text-align:center;padding:8px 0;font-size:13px;font-weight:bold;margin-top:10px;">DETALLE DIARIO</div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead><tr style="background:#2E4053;color:white;">
                    ${['Dia','Ventas (C$)','Compras (C$)','Ganancia Neta (C$)','Margen (%)'].map(h=>`<th style="padding:8px 6px;border:1px solid #BDC3C7;text-align:center;">${h}</th>`).join('')}
                </tr></thead>
                <tbody>
                ${rows.map((r,i)=>{
            const bg=i%2===0?'#FFFFFF':'#D5F5E3';
            const gColor=r.ganancia>=0?'#15803d':'#dc2626';
            return `<tr style="background:${bg};">
                        <td style="padding:6px;border:1px solid #BDC3C7;text-align:center;">${r.day}</td>
                        <td style="padding:6px;border:1px solid #BDC3C7;text-align:right;">C$ ${money(r.ventas)}</td>
                        <td style="padding:6px;border:1px solid #BDC3C7;text-align:right;">C$ ${money(r.compras)}</td>
                        <td style="padding:6px;border:1px solid #BDC3C7;text-align:right;font-weight:bold;color:${gColor};">C$ ${money(r.ganancia)}</td>
                        <td style="padding:6px;border:1px solid #BDC3C7;text-align:center;font-weight:bold;color:${gColor};">${r.margen}%</td>
                    </tr>`;
        }).join('')}
                <tr>
                    <td style="padding:8px;background:#E67E22;color:white;font-weight:bold;border:1px solid #BDC3C7;">TOTALES</td>
                    <td style="padding:8px;background:#E67E22;color:white;font-weight:bold;text-align:right;border:1px solid #BDC3C7;">C$ ${money(totalVentas)}</td>
                    <td style="padding:8px;background:#E67E22;color:white;font-weight:bold;text-align:right;border:1px solid #BDC3C7;">C$ ${money(totalCompras)}</td>
                    <td style="padding:8px;background:#E67E22;color:white;font-weight:bold;text-align:right;border:1px solid #BDC3C7;">C$ ${money(gananciaNet)}</td>
                    <td style="padding:8px;background:#E67E22;color:white;font-weight:bold;text-align:center;border:1px solid #BDC3C7;">${margenNet}%</td>
                </tr>
                </tbody>
            </table>
        `;
        document.body.appendChild(wrapper);
        await new Promise(r=>setTimeout(r,200));
        const canvas = await window.html2canvas(wrapper,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:1000});
        document.body.removeChild(wrapper);
        const a=document.createElement('a');
        const label = getPeriodoLabel();
        a.download=`Reporte_Ganancias_${label}.png`;
        a.href=canvas.toDataURL('image/png');
        a.click();
    };

    /* ── Chart view ── */
    if (showGrafica) {
        return (
            <GraficaGanancias
                sales={filteredSales}
                purchases={filteredPurchases}
                filtroRapido={filtroRapido}
                onBack={() => setShowGrafica(false)}
            />
        );
    }

    if (loading) return (
        <div className="rg-page">
            <div className="rg-loading"><div className="rg-spinner"/><p>Cargando datos...</p></div>
        </div>
    );

    if (error) return (
        <div className="rg-page">
            <div className="rg-error-box">
                <span className="rg-error-icon">!</span>
                <p>{error}</p>
                <button className="rg-btn-orange" onClick={() => window.location.reload()}>Reintentar</button>
            </div>
        </div>
    );

    return (
        <div className="rg-page">

            {/* ── Topbar ── */}
            <div className="rg-topbar">
                <div className="rg-topbar-left">
                    <button className="rg-btn-outline" onClick={() => navigate('/reports')}>← Volver a Reportes</button>
                    <div className="rg-title-block">
                        <h2 className="rg-title">Reporte de Ganancias</h2>
                        <p className="rg-subtitle">Diferencia entre lo generado en ventas y lo gastado en compras.</p>
                    </div>
                </div>
                <div className="rg-export-wrap" ref={exportRef}>
                    <button className="rg-btn-outline rg-btn-export" onClick={() => setShowExport((v) => !v)}>
                        📤 Exportar ▾
                    </button>
                    {showExport && (
                        <div className="rg-export-dropdown">
                            <button className="rg-export-item" onClick={exportExcel}>📊 Exportar CSV / Excel</button>
                            <button className="rg-export-item" onClick={exportTablePNG}>🖼️ Exportar Tabla PNG</button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="rg-filters-card">
                <div className="rg-filters-title">Filtros</div>
                <div className="rg-filters-row">
                    <div className="rg-filter-group">
                        <label>Fecha inicio</label>
                        <input type="date" value={startDate} onChange={(e)=>{ setStartDate(e.target.value); setFiltroRapido('Personalizar rango'); setPage(1); }}/>
                    </div>
                    <div className="rg-filter-group">
                        <label>Fecha fin</label>
                        <input type="date" value={endDate} onChange={(e)=>{ setEndDate(e.target.value); setFiltroRapido('Personalizar rango'); setPage(1); }}/>
                    </div>
                    <div className="rg-filter-actions">
                        <button className="rg-btn-orange" onClick={()=>setPage(1)}>Aplicar</button>
                        <button className="rg-btn-outline" onClick={clearFilters}>Limpiar</button>
                    </div>
                </div>
                <div className="rg-quick-filters">
                    {['Hoy','Esta semana','Este mes','Este año'].map((f)=>(
                        <button key={f} className={`rg-quick-btn ${filtroRapido===f?'rg-quick-btn-active':''}`} onClick={()=>handleFiltroRapido(f)}>{f}</button>
                    ))}
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="rg-stats-grid">
                <div className="rg-stat-card">
                    <div className="rg-stat-icon">💰</div>
                    <div>
                        <div className="rg-stat-label">Total Ventas</div>
                        <div className="rg-stat-value">C$ {money(totalVentas)}</div>
                        <div className="rg-stat-sub">{numVentas} transacciones</div>
                    </div>
                </div>
                <div className="rg-stat-card">
                    <div className="rg-stat-icon">🛒</div>
                    <div>
                        <div className="rg-stat-label">Total Compras</div>
                        <div className="rg-stat-value">C$ {money(totalCompras)}</div>
                        <div className="rg-stat-sub">{numCompras} compras registradas</div>
                    </div>
                </div>
                <div className={`rg-stat-card ${gananciaNet >= 0 ? 'rg-profit-card' : ''}`}>
                    <div className="rg-stat-icon">{gananciaNet >= 0 ? '✅' : '⚠️'}</div>
                    <div>
                        <div className="rg-stat-label">{gananciaNet >= 0 ? 'Ganancia Neta' : 'Perdida Neta'}</div>
                        <div className="rg-stat-value">C$ {money(Math.abs(gananciaNet))}</div>
                        <div className="rg-stat-sub">{gananciaNet >= 0 ? 'Ventas − Compras' : 'Compras superan ventas'}</div>
                        <div className="rg-margin-bar-wrap">
                            <div className="rg-margin-bar-bg">
                                <div
                                    className={`rg-margin-bar-fill ${gananciaNet >= 0 ? 'positive' : 'negative'}`}
                                    style={{ width: `${Math.min(100, Math.abs(Number(margenNet)))}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="rg-stat-card">
                    <div className="rg-stat-icon">📊</div>
                    <div>
                        <div className="rg-stat-label">Margen de Ganancia</div>
                        <div className={`rg-stat-change ${Number(margenNet) >= 0 ? 'rg-change-up' : 'rg-change-down'}`}>
                            {margenNet}% {Number(margenNet) >= 0 ? '▲' : '▼'}
                        </div>
                        <div className="rg-stat-sub">Sobre el total de ventas</div>
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="rg-table-card">
                <div className="rg-table-header">
                    <h4 className="rg-table-title">Desglose {getGroupLabel()} — Ventas vs Compras</h4>
                    <button className="rg-btn-outline" onClick={() => setShowGrafica(true)}>📊 Ver Gráfica</button>
                </div>
                <div className="rg-table-wrap">
                    <table className="rg-table">
                        <thead>
                        <tr>
                            <th>#</th>
                            <th>{exportGroupBy === "dia" ? "Día" : exportGroupBy === "mes" ? "Mes" : "Año"}</th>
                            <th>Ventas (C$)</th>
                            <th>Compras (C$)</th>
                            <th>Ganancia Neta (C$)</th>
                            <th>Margen (%)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {paginated.length === 0 ? (
                            <tr><td colSpan={6} className="rg-no-results">No hay datos para el periodo seleccionado.</td></tr>
                        ) : paginated.map((r, i) => (
                            <tr key={r.day}>
                                <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                <td><strong>{r.day}</strong></td>
                                <td>C$ {money(r.ventas)}</td>
                                <td>C$ {money(r.compras)}</td>
                                <td>
                                    <span className={r.ganancia >= 0 ? 'rg-profit-pos' : 'rg-profit-neg'}>
                                        {r.ganancia >= 0 ? '+' : ''}C$ {money(r.ganancia)}
                                    </span>
                                </td>
                                <td>
                                    <span className={Number(r.margen) >= 0 ? 'rg-profit-pos' : 'rg-profit-neg'}>
                                        {r.margen}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                <div className="rg-pagination">
                    <span className="rg-pag-info">
                        Mostrando {rows.length === 0 ? 0 : (page-1)*PAGE_SIZE+1} a {Math.min(page*PAGE_SIZE,rows.length)} de {rows.length} dias
                    </span>
                    <div className="rg-pag-btns">
                        <button className="rg-pag-btn" onClick={()=>setPage(p=>p-1)} disabled={page===1}>‹</button>
                        {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                            <button key={n} className={`rg-pag-btn ${n===page?'rg-pag-active':''}`} onClick={()=>setPage(n)}>{n}</button>
                        ))}
                        <button className="rg-pag-btn" onClick={()=>setPage(p=>p+1)} disabled={page===totalPages}>›</button>
                    </div>
                </div>
            </div>

            <div className="rg-note">
                <span>ℹ️</span>
                <p>La ganancia neta es la diferencia entre el total generado en ventas y el total gastado en compras por dia. Un margen positivo indica rentabilidad. Puedes exportar en Excel o PNG.</p>
            </div>
        </div>
    );
}