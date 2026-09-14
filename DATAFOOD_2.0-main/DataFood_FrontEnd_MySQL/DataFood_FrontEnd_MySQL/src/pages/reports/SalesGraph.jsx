import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import './SalesGraph.css';

Chart.register(...registerables);

/* ─── Helpers ─── */
const money = (n) =>
    Number(n ?? 0).toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('es-NI', { dateStyle: 'short' }) : '—';

const PALETTE = [
    '#f97316', '#fb923c', '#fdba74', '#fed7aa',
    '#ea580c', '#c2410c', '#fbbf24', '#fcd34d',
];

/* Groups sales by employee → { name: totalC$ } */
function groupByEmployee(sales) {
    const map = {};
    sales.forEach((s) => {
        const name = s.employeeName ?? 'Sin empleado';
        map[name] = (map[name] ?? 0) + Number(s.total ?? 0);
    });
    return map;
}

/* Groups by product */
function groupByProduct(sales) {
    const map = {};
    sales.forEach((s) => {
        (s.details ?? []).forEach((d) => {
            const name = d.productName ?? 'Sin producto';
            map[name] = (map[name] ?? 0) + Number(d.subtotal ?? 0);
        });
    });
    return map;
}

/* Groups by sale type */
function groupByType(sales) {
    const map = {};
    sales.forEach((s) => {
        const type = s.saleType ?? 'Sin tipo';
        map[type] = (map[type] ?? 0) + Number(s.total ?? 0);
    });
    return map;
}

/* Groups by day for line/bar */
function groupByDay(sales) {
    const map = {};
    sales.forEach((s) => {
        const day = fmt(s.saleDate);
        map[day] = (map[day] ?? 0) + Number(s.total ?? 0);
    });
    const sorted = Object.entries(map).sort(
        (a, b) => new Date(a[0].split('/').reverse().join('-')) - new Date(b[0].split('/').reverse().join('-'))
    );
    return Object.fromEntries(sorted);
}

export default function GraficaVentas({ sales = [], onBack }) {
    const chartRef  = useRef(null);
    const chartInst = useRef(null);

    const [chartType, setChartType] = useState('pie');
    const [groupBy,   setGroupBy]   = useState('empleado'); // empleado | producto | tipo | dia
    const [startDate, setStartDate] = useState('');
    const [endDate,   setEndDate]   = useState('');

    /* ── Local date filter ── */
    const filteredSales = sales.filter((s) => {
        const sDate    = new Date(s.saleDate);
        const matchStart = startDate ? sDate >= new Date(startDate) : true;
        const matchEnd   = endDate   ? sDate <= new Date(endDate + 'T23:59:59') : true;
        return matchStart && matchEnd;
    });

    /* ── Stats ── */
    const totalPeriod = filteredSales.reduce((s, v) => s + Number(v.total ?? 0), 0);
    const productosTipos = new Set(
        filteredSales.flatMap((s) => (s.details ?? []).map((d) => d.productName))
    ).size;

    const prevTotal = sales
        .filter((s) => !filteredSales.includes(s))
        .reduce((s, v) => s + Number(v.total ?? 0), 0);
    const variacion = prevTotal > 0
        ? (((totalPeriod - prevTotal) / prevTotal) * 100).toFixed(1)
        : null;

    /* ── Top employees ── */
    const employeeMap = groupByEmployee(filteredSales);
    const topEmpleados = Object.entries(employeeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    /* ── Latest transactions ── */
    const lastTxns = [...filteredSales]
        .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
        .slice(0, 8);

    /* ── Chart data by grouping ── */
    const getChartData = () => {
        let dataMap;
        if (groupBy === 'empleado')  dataMap = groupByEmployee(filteredSales);
        else if (groupBy === 'producto') dataMap = groupByProduct(filteredSales);
        else if (groupBy === 'tipo')     dataMap = groupByType(filteredSales);
        else                             dataMap = groupByDay(filteredSales);

        const labels = Object.keys(dataMap);
        const data   = Object.values(dataMap);
        return { labels, data };
    };

    /* ── Render / update chart ── */
    useEffect(() => {
        if (!chartRef.current) return;

        if (chartInst.current) {
            chartInst.current.destroy();
            chartInst.current = null;
        }

        const { labels, data } = getChartData();
        if (labels.length === 0) return;

        const ctx      = chartRef.current.getContext('2d');
        const isLinear = chartType === 'bar' || chartType === 'line';

        chartInst.current = new Chart(ctx, {
            type: chartType,
            data: {
                labels,
                datasets: [{
                    label: 'Ventas (C$)',
                    data,
                    backgroundColor: isLinear
                        ? 'rgba(249,115,22,0.2)'
                        : labels.map((_, i) => PALETTE[i % PALETTE.length]),
                    borderColor: isLinear
                        ? '#f97316'
                        : labels.map((_, i) => PALETTE[i % PALETTE.length]),
                    borderWidth: 2,
                    tension: 0.4,
                    fill: chartType === 'line',
                    pointBackgroundColor: '#f97316',
                    pointRadius: chartType === 'line' ? 4 : 0,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: isLinear ? 'top' : 'right',
                        labels: { font: { size: 12 }, color: '#374151' },
                    },
                    title: {
                        display: true,
                        text: `Estadísticas de Ventas — por ${
                            groupBy === 'empleado'  ? 'Empleado'  :
                                groupBy === 'producto'  ? 'Producto'  :
                                    groupBy === 'tipo'      ? 'Tipo'      : 'Día'
                        }`,
                        font: { size: 14, weight: 'bold' },
                        color: '#111827',
                        padding: { bottom: 12 },
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` C$ ${money(ctx.parsed.y ?? ctx.parsed)}`,
                        },
                    },
                },
                scales: isLinear ? {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (v) => 'C$ ' + Number(v).toLocaleString('es-NI'),
                            color: '#6b7280',
                        },
                        grid: { color: '#f0e8df' },
                    },
                    x: {
                        ticks: { color: '#6b7280', maxRotation: 45 },
                        grid: { display: false },
                    },
                } : {},
            },
        });

        return () => {
            if (chartInst.current) {
                chartInst.current.destroy();
                chartInst.current = null;
            }
        };
    }, [chartType, groupBy, startDate, endDate, sales]);

    /* ── Export chart PNG ── */
    const exportChartPNG = () => {
        if (!chartInst.current) return;
        const a = document.createElement('a');
        a.download = 'Grafica_Ventas.png';
        a.href = chartInst.current.toBase64Image('image/png', 1);
        a.click();
    };

    return (
        <div className="gv-page">

            {/* ── Header ── */}
            <div className="gv-header">
                <div className="gv-header-left">
                    <button className="gv-btn-back" onClick={onBack}>← Regresar</button>
                    <h2 className="gv-title">Estadísticas de Ventas</h2>
                </div>
                <button className="gv-btn-export" onClick={exportChartPNG}>
                    🖼️ Exportar Gráfico PNG
                </button>
            </div>

            {/* ── 2-column layout ── */}
            <div className="gv-layout">

                {/* ── Left sidebar ── */}
                <div className="gv-sidebar">

                    {/* Date filter */}
                    <div className="gv-panel">
                        <div className="gv-panel-title">Rango de Fechas</div>
                        <div className="gv-date-group">
                            <label>Fecha de Inicio</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="gv-date-group" style={{ marginTop: 10 }}>
                            <label>Fecha Final</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                className="gv-btn-clear"
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                            >
                                ✕ Limpiar fechas
                            </button>
                        )}
                    </div>

                    {/* Latest transactions */}
                    <div className="gv-panel gv-panel-txn">
                        <div className="gv-panel-title">Últimas Transacciones</div>
                        <div className="gv-txn-head">
                            <span>Fecha</span>
                            <span>Producto</span>
                            <span>Empl.</span>
                            <span>Total</span>
                        </div>
                        <div className="gv-txn-list">
                            {lastTxns.length === 0 ? (
                                <p className="gv-empty">Sin datos</p>
                            ) : lastTxns.map((s) => (
                                <div className="gv-txn-row" key={s.saleHeaderId}>
                                    <span>{fmt(s.saleDate)}</span>
                                    <span>{(s.details?.[0]?.productName ?? '—').slice(0, 10)}</span>
                                    <span>{(s.employeeName ?? '—').split(' ')[0]}</span>
                                    <span>C${money(s.total).split('.')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top employees */}
                    <div className="gv-panel">
                        <div className="gv-panel-title">Empleados Top</div>
                        <table className="gv-top-table">
                            <thead>
                            <tr><th>Nombre</th><th>Total (C$)</th></tr>
                            </thead>
                            <tbody>
                            {topEmpleados.length === 0 ? (
                                <tr><td colSpan={2} className="gv-empty">Sin datos</td></tr>
                            ) : topEmpleados.map(([name, total]) => (
                                <tr key={name}>
                                    <td>{name}</td>
                                    <td>{money(total)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Main chart area ── */}
                <div className="gv-main">
                    <div className="gv-chart-card">

                        {/* Chart controls */}
                        <div className="gv-chart-controls">
                            <div className="gv-control-group">
                                <label>Tipo de Gráfico</label>
                                <select
                                    value={chartType}
                                    onChange={(e) => setChartType(e.target.value)}
                                >
                                    <option value="pie">Gráfico de Pastel (Pie)</option>
                                    <option value="doughnut">Gráfico de Dona</option>
                                    <option value="bar">Gráfico de Barras</option>
                                    <option value="line">Gráfico de Líneas</option>
                                </select>
                            </div>
                            <div className="gv-control-group">
                                <label>Agrupar por</label>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value)}
                                >
                                    <option value="empleado">Empleado</option>
                                    <option value="producto">Producto</option>
                                    <option value="tipo">Tipo de Venta</option>
                                    <option value="dia">Día</option>
                                </select>
                            </div>
                        </div>

                        {/* Canvas */}
                        <div className="gv-canvas-wrap">
                            {filteredSales.length === 0 ? (
                                <div className="gv-chart-empty">
                                    <span>📊</span>
                                    <p>No hay datos para mostrar en el periodo seleccionado.</p>
                                </div>
                            ) : (
                                <canvas ref={chartRef} />
                            )}
                        </div>

                        {/* Mini stats */}
                        <div className="gv-mini-stats">
                            <div className="gv-mini-stat">
                                <span className="gv-ms-icon">💰</span>
                                <div>
                                    <div className="gv-ms-label">Total de Ventas (Periodo)</div>
                                    <div className="gv-ms-value">C$ {money(totalPeriod)}</div>
                                </div>
                            </div>
                            <div className="gv-mini-stat">
                                <span className="gv-ms-icon">🍽️</span>
                                <div>
                                    <div className="gv-ms-label">Productos en Periodo</div>
                                    <div className="gv-ms-value">{productosTipos}</div>
                                </div>
                            </div>
                            <div className="gv-mini-stat">
                                <span className="gv-ms-icon">📈</span>
                                <div>
                                    <div className="gv-ms-label">Variación vs. Periodo Anterior</div>
                                    <div className={`gv-ms-value ${Number(variacion ?? 0) >= 0 ? 'gv-up' : 'gv-down'}`}>
                                        {variacion !== null
                                            ? `${Number(variacion) >= 0 ? '+' : ''}${variacion}% ${Number(variacion) >= 0 ? '▲' : '▼'}`
                                            : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}