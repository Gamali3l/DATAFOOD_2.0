import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import './PurchaseGraph.css';

Chart.register(...registerables);

/* ─── Helpers ─── */
const money = (n) =>
    Number(n ?? 0).toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('es-NI', { dateStyle: 'short' }) : '—';

/* Colores de la paleta naranja DataFood */
const PALETTE = [
    '#f97316', '#fb923c', '#fdba74', '#fed7aa',
    '#ea580c', '#c2410c', '#fbbf24', '#fcd34d',
];

/* Agrupa compras por proveedor → { nombre: totalC$ } */
function groupBySupplier(purchases) {
    const map = {};
    purchases.forEach((p) => {
        const name = p.supplierName ?? 'Sin proveedor';
        map[name] = (map[name] ?? 0) + Number(p.total ?? 0);
    });
    return map;
}

/* Agrupa por insumo */
function groupByInsumo(purchases) {
    const map = {};
    purchases.forEach((p) => {
        (p.details ?? []).forEach((d) => {
            const name = d.supplyName ?? 'Sin insumo';
            map[name] = (map[name] ?? 0) + Number(d.subtotal ?? 0);
        });
    });
    return map;
}

/* Agrupa por día para línea/barras */
function groupByDay(purchases) {
    const map = {};
    purchases.forEach((p) => {
        const day = fmt(p.purchaseDate);
        map[day] = (map[day] ?? 0) + Number(p.total ?? 0);
    });
    // Ordenar cronológicamente
    const sorted = Object.entries(map).sort(
        (a, b) => new Date(a[0].split('/').reverse().join('-')) - new Date(b[0].split('/').reverse().join('-'))
    );
    return Object.fromEntries(sorted);
}

export default function PurchaseGraph({ purchases = [], suppliers = [], onBack }) {
    const chartRef  = useRef(null);
    const chartInst = useRef(null);

    const [chartType,   setChartType]   = useState('pie');
    const [groupBy,     setGroupBy]     = useState('proveedor'); // proveedor | insumo | dia
    const [startDate,   setStartDate]   = useState('');
    const [endDate,     setEndDate]     = useState('');

    /* ── Filtro local de fechas ── */
    const filteredPurchases = purchases.filter((p) => {
        const pDate = new Date(p.purchaseDate);
        const matchStart = startDate ? pDate >= new Date(startDate) : true;
        const matchEnd   = endDate   ? pDate <= new Date(endDate + 'T23:59:59') : true;
        return matchStart && matchEnd;
    });

    /* ── Stats ── */
    const totalMes   = filteredPurchases.reduce((s, p) => s + Number(p.total ?? 0), 0);
    const insumosBajos = new Set(
        filteredPurchases.flatMap((p) => (p.details ?? []).map((d) => d.supplyName))
    ).size;

    const prevTotal = purchases
        .filter((p) => !filteredPurchases.includes(p))
        .reduce((s, p) => s + Number(p.total ?? 0), 0);
    const variacion = prevTotal > 0
        ? (((totalMes - prevTotal) / prevTotal) * 100).toFixed(1)
        : null;

    /* ── Proveedores Top ── */
    const supplierMap = groupBySupplier(filteredPurchases);
    const topProveedores = Object.entries(supplierMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    /* ── Últimas transacciones ── */
    const lastTxns = [...filteredPurchases]
        .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
        .slice(0, 8);

    /* ── Datos del gráfico según agrupación ── */
    const getChartData = () => {
        let dataMap;
        if (groupBy === 'proveedor') dataMap = groupBySupplier(filteredPurchases);
        else if (groupBy === 'insumo') dataMap = groupByInsumo(filteredPurchases);
        else dataMap = groupByDay(filteredPurchases);

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

        const ctx = chartRef.current.getContext('2d');
        const isLinear = chartType === 'bar' || chartType === 'line';

        chartInst.current = new Chart(ctx, {
            type: chartType,
            data: {
                labels,
                datasets: [{
                    label: 'Compras (C$)',
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
                        text: `Estadísticas de Compras — por ${groupBy === 'proveedor' ? 'Proveedor' : groupBy === 'insumo' ? 'Insumo' : 'Día'}`,
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
    }, [chartType, groupBy, startDate, endDate, purchases]);

    /* ── Exportar gráfica PNG ── */
    const exportChartPNG = () => {
        if (!chartInst.current) return;
        const a = document.createElement('a');
        a.download = 'Grafica_Compras.png';
        a.href = chartInst.current.toBase64Image('image/png', 1);
        a.click();
    };

    return (
        <div className="gc-page">

            {/* ── Header ── */}
            <div className="gc-header">
                <div className="gc-header-left">
                    <button className="gc-btn-back" onClick={onBack}>← Regresar</button>
                    <h2 className="gc-title">Estadísticas de Compras</h2>
                </div>
                <button className="gc-btn-export" onClick={exportChartPNG}>
                    🖼️ Exportar Gráfico PNG
                </button>
            </div>

            {/* ── Layout 3 columnas ── */}
            <div className="gc-layout">

                {/* ── Sidebar izquierdo ── */}
                <div className="gc-sidebar">

                    {/* Filtro de fechas */}
                    <div className="gc-panel">
                        <div className="gc-panel-title">Rango de Fechas</div>
                        <div className="gc-date-group">
                            <label>Fecha de Inicio</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="gc-date-group" style={{ marginTop: 10 }}>
                            <label>Fecha Final</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                className="gc-btn-clear"
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                            >
                                ✕ Limpiar fechas
                            </button>
                        )}
                    </div>

                    {/* Últimas transacciones */}
                    <div className="gc-panel gc-panel-txn">
                        <div className="gc-panel-title">Últimas Transacciones</div>
                        <div className="gc-txn-head">
                            <span>Fecha</span>
                            <span>Insumo</span>
                            <span>Prov.</span>
                            <span>Total</span>
                        </div>
                        <div className="gc-txn-list">
                            {lastTxns.length === 0 ? (
                                <p className="gc-empty">Sin datos</p>
                            ) : lastTxns.map((p) => (
                                <div className="gc-txn-row" key={p.purchaseHeaderId}>
                                    <span>{fmt(p.purchaseDate)}</span>
                                    <span>{(p.details?.[0]?.supplyName ?? '—').slice(0, 10)}</span>
                                    <span>{(p.supplierName ?? '—').split(' ')[0]}</span>
                                    <span>C${money(p.total).split('.')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Proveedores top */}
                    <div className="gc-panel">
                        <div className="gc-panel-title">Proveedores Top</div>
                        <table className="gc-top-table">
                            <thead>
                            <tr><th>Nombre</th><th>Total (C$)</th></tr>
                            </thead>
                            <tbody>
                            {topProveedores.length === 0 ? (
                                <tr><td colSpan={2} className="gc-empty">Sin datos</td></tr>
                            ) : topProveedores.map(([name, total]) => (
                                <tr key={name}>
                                    <td>{name}</td>
                                    <td>{money(total)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Área principal ── */}
                <div className="gc-main">
                    <div className="gc-chart-card">

                        {/* Controles del gráfico */}
                        <div className="gc-chart-controls">
                            <div className="gc-control-group">
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
                            <div className="gc-control-group">
                                <label>Agrupar por</label>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value)}
                                >
                                    <option value="proveedor">Proveedor</option>
                                    <option value="insumo">Insumo</option>
                                    <option value="dia">Día</option>
                                </select>
                            </div>
                        </div>

                        {/* Canvas */}
                        <div className="gc-canvas-wrap">
                            {filteredPurchases.length === 0 ? (
                                <div className="gc-chart-empty">
                                    <span>📊</span>
                                    <p>No hay datos para mostrar en el periodo seleccionado.</p>
                                </div>
                            ) : (
                                <canvas ref={chartRef} />
                            )}
                        </div>

                        {/* Mini stats */}
                        <div className="gc-mini-stats">
                            <div className="gc-mini-stat">
                                <span className="gc-ms-icon">🛒</span>
                                <div>
                                    <div className="gc-ms-label">Total de Compras (Periodo)</div>
                                    <div className="gc-ms-value">C$ {money(totalMes)}</div>
                                </div>
                            </div>
                            <div className="gc-mini-stat">
                                <span className="gc-ms-icon">📦</span>
                                <div>
                                    <div className="gc-ms-label">Insumos en Periodo</div>
                                    <div className="gc-ms-value">{insumosBajos}</div>
                                </div>
                            </div>
                            <div className="gc-mini-stat">
                                <span className="gc-ms-icon">📈</span>
                                <div>
                                    <div className="gc-ms-label">Variación vs. Periodo Anterior</div>
                                    <div className={`gc-ms-value ${Number(variacion ?? 0) >= 0 ? 'gc-up' : 'gc-down'}`}>
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