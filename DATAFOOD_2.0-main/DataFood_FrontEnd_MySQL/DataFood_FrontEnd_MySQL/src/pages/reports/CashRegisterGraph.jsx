import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import './CashRegisterGraph.css';

Chart.register(...registerables);

/* ─── Helpers ─── */
const money = (n) =>
    Number(n ?? 0).toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('es-NI', { dateStyle: 'short' }) : '—';

const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString('es-NI', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true,
    }) : '—';

const getDurationMinutes = (open, close) => {
    if (!open || !close) return 0;
    return Math.round((new Date(close) - new Date(open)) / 60000);
};

/* ─── Colores — paleta naranja/crema de CashRegisterReport ─── */
const C = {
    primary:  '#f97316',   // naranja principal (botones, acento)
    primary2: '#ea6c0a',   // naranja oscuro
    accent:   '#fdba74',   // naranja claro / fill
    warm:     '#fdf4ec',   // fondo crema
    border:   '#f0e8df',   // borde cálido
    red:      '#dc2626',   // error / retiro
    green:    '#15803d',   // ok / cuadrado
    gray:     '#6b7280',   // texto secundario
    dark:     '#111827',   // texto principal
    mid:      '#374151',   // texto medio
};
/* Paleta para pie/donut — tonos del mismo rango cálido */
const PIE_PALETTE = [
    '#f97316', // naranja base
    '#fb923c', // naranja medio
    '#fdba74', // naranja claro
    '#fcd34d', // amarillo-naranja
    '#ea580c', // naranja quemado
    '#c2410c', // siena
    '#fed7aa', // durazno
    '#fbbf24', // ámbar
];

/* ─── Agrupadores ─── */
function groupByDay(sessions) {
    const map = {};
    sessions.forEach((s) => {
        const day = fmt(s.openTime);
        if (!map[day]) map[day] = { sales: 0, openings: 0, withdrawals: 0, deposits: 0 };
        map[day].sales     += Number(s.totalSales ?? 0);
        map[day].openings  += 1;
        map[day].withdrawals += (s.movements ?? [])
            .filter(m => m.movementType === 'Retiro')
            .reduce((a, m) => a + Number(m.amount ?? 0), 0);
        map[day].deposits += (s.movements ?? [])
            .filter(m => m.movementType === 'Deposito')
            .reduce((a, m) => a + Number(m.amount ?? 0), 0);
    });
    return map;
}

function groupByEmployee(sessions) {
    const map = {};
    sessions.forEach((s) => {
        const emp = s.employeeName ?? 'Sin empleado';
        if (!map[emp]) map[emp] = { sessions: 0, sales: 0, squared: 0, diff: 0 };
        map[emp].sessions++;
        map[emp].sales += Number(s.totalSales ?? 0);
        map[emp].diff  += Number(s.difference ?? 0);
        const isClosed = ['Cerrado', 'Cerrada'].includes(s.status);
        if (Number(s.difference ?? 0) === 0 && isClosed) map[emp].squared++;
    });
    return map;
}

function groupByHour(sessions) {
    const map = {};
    for (let h = 0; h < 24; h++) map[`${h}:00`] = 0;
    sessions.forEach((s) => {
        if (!s.openTime) return;
        const h = new Date(s.openTime).getHours();
        map[`${h}:00`] += Number(s.totalSales ?? 0);
    });
    return map;
}

/* ─── Canvas chart wrapper ─── */
function CanvasChart({ height = 240, builder, deps, small }) {
    const ref  = useRef(null);
    const inst = useRef(null);

    useEffect(() => {
        if (!ref.current) return;
        if (inst.current) { inst.current.destroy(); inst.current = null; }
        inst.current = builder(ref.current.getContext('2d'));
        return () => { if (inst.current) { inst.current.destroy(); inst.current = null; } };
    }, deps);

    return (
        <div className={small ? 'crg-canvas-wrap crg-canvas-wrap--sm' : 'crg-canvas-wrap'}>
            <canvas ref={ref} />
        </div>
    );
}

/* ════ COMPONENTE PRINCIPAL ════ */
export default function CashRegisterGraph({ sessions = [], onBack }) {

    const [startDate, setStartDate] = useState('');
    const [endDate,   setEndDate]   = useState('');
    const [metricBar, setMetricBar] = useState('sales');
    const [empMetric, setEmpMetric] = useState('sales');

    /* ── Filtro de fecha local ── */
    const filtered = sessions.filter((s) => {
        const d  = new Date(s.openTime);
        const ok1 = startDate ? d >= new Date(startDate) : true;
        const ok2 = endDate   ? d <= new Date(endDate + 'T23:59:59') : true;
        return ok1 && ok2;
    });

    /* ── Agregados ── */
    const totalSales       = filtered.reduce((a, s) => a + Number(s.totalSales ?? 0), 0);
    const totalCash        = filtered.reduce((a, s) => a + Number(s.cashSales ?? 0), 0);
    const totalDelivery    = filtered.reduce((a, s) => a + Number(s.deliverySales ?? 0), 0);
    const totalWithdrawals = filtered.reduce((a, s) =>
        a + (s.movements ?? []).filter(m => m.movementType === 'Retiro')
            .reduce((x, m) => x + Number(m.amount ?? 0), 0), 0);
    const totalDeposits = filtered.reduce((a, s) =>
        a + (s.movements ?? []).filter(m => m.movementType === 'Deposito')
            .reduce((x, m) => x + Number(m.amount ?? 0), 0), 0);
    const totalDiff       = filtered.reduce((a, s) => a + Number(s.difference ?? 0), 0);
    const closedSessions  = filtered.filter(s => ['Cerrado','Cerrada'].includes(s.status)).length;
    const squaredSessions = filtered.filter(s =>
        Number(s.difference ?? 0) === 0 && ['Cerrado','Cerrada'].includes(s.status)).length;
    const avgDuration = filtered.length === 0 ? 0 : Math.round(
        filtered.reduce((a, s) => a + getDurationMinutes(s.openTime, s.closeTime), 0) / filtered.length
    );

    const byDay  = groupByDay(filtered);
    const byEmp  = groupByEmployee(filtered);
    const byHour = groupByHour(filtered);

    const dayLabels = Object.keys(byDay);
    const empLabels = Object.keys(byEmp).sort();

    const hasData = filtered.length > 0;

    /* ── Builders de gráficas ── */
    const METRIC_BAR = {
        sales:       { label: 'Ventas (C$)',    key: 'sales',       color: C.primary },
        openings:    { label: 'Aperturas',       key: 'openings',    color: C.accent },
        withdrawals: { label: 'Retiros (C$)',    key: 'withdrawals', color: C.red },
        deposits:    { label: 'Depósitos (C$)',  key: 'deposits',    color: C.green },
    };
    const bm = METRIC_BAR[metricBar];

    const EMP_METRIC = {
        sales:    { label: 'Total ventas (C$)', fn: v => v.sales,    color: C.primary },
        sessions: { label: 'N° Sesiones',        fn: v => v.sessions, color: C.accent },
        diff:     { label: 'Diferencia (C$)',    fn: v => v.diff,     color: C.gray },
    };
    const em = EMP_METRIC[empMetric];

    const axisDefaults = (isMoney) => ({
        beginAtZero: true,
        ticks: {
            color: C.gray,
            callback: isMoney
                ? (v) => 'C$' + Number(v).toLocaleString('es-NI')
                : (v) => v,
        },
        grid: { color: '#f0e8df' },
    });

    const buildDailyBar = (ctx) => new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets: [{
                label: bm.label,
                data: dayLabels.map(d => byDay[d][bm.key]),
                backgroundColor: bm.color + 'CC',
                borderColor: bm.color,
                borderWidth: 2,
                borderRadius: 6,
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${bm.label}: ${bm.key !== 'openings' ? 'C$ ' + money(c.parsed.y) : c.parsed.y}` } },
            },
            scales: {
                y: axisDefaults(bm.key !== 'openings'),
                x: { ticks: { color: C.gray, maxRotation: 40 }, grid: { display: false } },
            },
        },
    });

    const buildDailyLine = (ctx) => new Chart(ctx, {
        type: 'line',
        data: {
            labels: dayLabels,
            datasets: [
                { label: 'Ventas (C$)',    data: dayLabels.map(d => byDay[d].sales),       borderColor: C.primary,  backgroundColor: C.primary + '22',  tension: 0.4, fill: true,  pointRadius: 4, pointBackgroundColor: C.primary },
                { label: 'Retiros (C$)',   data: dayLabels.map(d => byDay[d].withdrawals), borderColor: C.red,      backgroundColor: 'transparent',      tension: 0.4, fill: false, pointRadius: 3, pointBackgroundColor: C.red,      borderDash: [5, 3] },
                { label: 'Depósitos (C$)', data: dayLabels.map(d => byDay[d].deposits),    borderColor: C.green,    backgroundColor: 'transparent',      tension: 0.4, fill: false, pointRadius: 3, pointBackgroundColor: C.green,    borderDash: [5, 3] },
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#374151', font: { size: 11 } } },
                tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: C$ ${money(c.parsed.y)}` } },
            },
            scales: {
                y: axisDefaults(true),
                x: { ticks: { color: C.gray, maxRotation: 40 }, grid: { display: false } },
            },
        },
    });

    const buildPieLocal = (ctx) => new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ventas locales', 'Ventas a domicilio'],
            datasets: [{ data: [totalCash, totalDelivery], backgroundColor: [C.primary, C.accent], borderWidth: 2, borderColor: '#fff' }],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#374151', font: { size: 11 } } },
                tooltip: { callbacks: { label: (c) => ` C$ ${money(c.parsed)}` } },
            },
            cutout: '62%',
        },
    });

    const buildPieSquared = (ctx) => new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Cuadradas', 'Con diferencia'],
            datasets: [{ data: [squaredSessions, closedSessions - squaredSessions], backgroundColor: [C.green, C.red], borderWidth: 2, borderColor: '#fff' }],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#374151', font: { size: 11 } } },
                tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed} sesiones` } },
            },
            cutout: '62%',
        },
    });

    const buildEmpBar = (ctx) => new Chart(ctx, {
        type: 'bar',
        data: {
            labels: empLabels,
            datasets: [{
                label: em.label,
                data: empLabels.map(e => em.fn(byEmp[e])),
                backgroundColor: empLabels.map((_, i) => PIE_PALETTE[i % PIE_PALETTE.length] + 'CC'),
                borderColor: empLabels.map((_, i) => PIE_PALETTE[i % PIE_PALETTE.length]),
                borderWidth: 2,
                borderRadius: 6,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${em.label}: ${empMetric !== 'sessions' ? 'C$ ' + money(c.parsed.x) : c.parsed.x}` } },
            },
            scales: {
                x: axisDefaults(empMetric !== 'sessions'),
                y: { ticks: { color: C.gray }, grid: { display: false } },
            },
        },
    });

    const buildHourBar = (ctx) => new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(byHour),
            datasets: [{
                label: 'Ventas (C$)',
                data: Object.values(byHour),
                backgroundColor: Object.values(byHour).map(v => v > 0 ? C.primary + 'BB' : '#f0e8df'),
                borderColor: Object.values(byHour).map(v => v > 0 ? C.primary : '#e5e7eb'),
                borderWidth: 1,
                borderRadius: 4,
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` C$ ${money(c.parsed.y)}` } },
            },
            scales: {
                y: axisDefaults(true),
                x: { ticks: { color: C.gray, maxRotation: 60, font: { size: 10 } }, grid: { display: false } },
            },
        },
    });

    const diffLabels = filtered.map((s, i) => `#${i + 1} ${fmt(s.openTime)}`);
    const diffData   = filtered.map(s => Number(s.difference ?? 0));

    const buildDiffLine = (ctx) => new Chart(ctx, {
        type: 'line',
        data: {
            labels: diffLabels,
            datasets: [{
                label: 'Diferencia (C$)',
                data: diffData,
                borderColor: C.primary2,
                backgroundColor: 'transparent',
                tension: 0.3,
                pointRadius: 5,
                pointBackgroundColor: diffData.map(v => v < 0 ? C.red : v > 0 ? C.green : C.primary),
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` Diferencia: C$ ${money(c.parsed.y)}` } },
            },
            scales: {
                y: axisDefaults(true),
                x: { ticks: { color: C.gray, maxRotation: 45, font: { size: 10 } }, grid: { display: false } },
            },
        },
    });

    /* ── Export PNG ── */
    const exportPNG = async () => {
        if (!window.html2canvas) {
            await new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                s.onload = res; s.onerror = rej;
                document.head.appendChild(s);
            });
        }
        const el = document.getElementById('crg-dashboard');
        const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: '#fdf4ec', useCORS: true });
        const a = document.createElement('a');
        a.download = `Grafica_Caja_${new Date().toLocaleDateString('es-NI', { dateStyle: 'short' }).replace(/\//g, '-')}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
    };

    /* ── Últimas 5 sesiones ── */
    const lastSessions = [...filtered]
        .sort((a, b) => new Date(b.openTime) - new Date(a.openTime))
        .slice(0, 5);

    /* ════ RENDER ════ */
    return (
        <div className="crg-page">

            {/* ── Topbar ── */}
            <div className="crg-topbar">
                <div className="crg-topbar-left">
                    <button className="crg-btn-back" onClick={onBack}>← Volver al Reporte de Caja</button>
                    <div className="crg-title-block">
                        <h2 className="crg-title">📊 Estadisticas de Caja</h2>
                        <p className="crg-subtitle">Análisis visual de sesiones, ventas, movimientos y diferencias.</p>
                    </div>
                </div>
                <button className="crg-btn-export" onClick={exportPNG}>🖼️ Exportar PNG</button>
            </div>

            {/* ── Filter bar ── */}
            <div className="crg-filter-bar">
                <div className="crg-filter-group">
                    <label>Fecha inicio</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="crg-filter-group">
                    <label>Fecha fin</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                {(startDate || endDate) && (
                    <button className="crg-btn-clear" onClick={() => { setStartDate(''); setEndDate(''); }}>
                        ✕ Limpiar fechas
                    </button>
                )}
                <div className="crg-filter-meta">
                    <strong>{filtered.length}</strong> sesiones en el periodo
                </div>
            </div>

            {/* ── Dashboard ── */}
            <div id="crg-dashboard" className="crg-body">

                {/* KPI chips */}
                <div className="crg-chips-row">
                    <div className="crg-chip">
                        <span className="crg-chip-icon">💰</span>
                        <div>
                            <div className="crg-chip-label">Total ventas</div>
                            <div className="crg-chip-value crg-chip-value--teal">C$ {money(totalSales)}</div>
                        </div>
                    </div>
                    <div className="crg-chip">
                        <span className="crg-chip-icon">🏦</span>
                        <div>
                            <div className="crg-chip-label">Sesiones</div>
                            <div className="crg-chip-value">{filtered.length}</div>
                        </div>
                    </div>
                    <div className="crg-chip">
                        <span className="crg-chip-icon">✅</span>
                        <div>
                            <div className="crg-chip-label">Caja cuadrada</div>
                            <div className="crg-chip-value crg-chip-value--green">{squaredSessions}/{closedSessions}</div>
                        </div>
                    </div>
                    <div className="crg-chip">
                        <span className="crg-chip-icon">⬇️</span>
                        <div>
                            <div className="crg-chip-label">Total retiros</div>
                            <div className="crg-chip-value crg-chip-value--red">C$ {money(totalWithdrawals)}</div>
                        </div>
                    </div>
                    <div className="crg-chip">
                        <span className="crg-chip-icon">⬆️</span>
                        <div>
                            <div className="crg-chip-label">Total depósitos</div>
                            <div className="crg-chip-value crg-chip-value--green">C$ {money(totalDeposits)}</div>
                        </div>
                    </div>
                    <div className="crg-chip">
                        <span className="crg-chip-icon">📐</span>
                        <div>
                            <div className="crg-chip-label">Diferencia acum.</div>
                            <div className={`crg-chip-value ${totalDiff < 0 ? 'crg-chip-value--red' : totalDiff > 0 ? 'crg-chip-value--green' : 'crg-chip-value--gray'}`}>
                                {totalDiff >= 0 ? '+' : ''}C$ {money(totalDiff)}
                            </div>
                        </div>
                    </div>
                    <div className="crg-chip">
                        <span className="crg-chip-icon">⏱️</span>
                        <div>
                            <div className="crg-chip-label">Duración prom.</div>
                            <div className="crg-chip-value crg-chip-value--orange">{avgDuration} min</div>
                        </div>
                    </div>
                </div>

                {/* Fila 1: Barras por día + Líneas de tendencia */}
                <div className="crg-grid-2">
                    <div className="crg-card">
                        <div className="crg-card-title">
                            <span>📅</span> Actividad por día
                            <div className="crg-card-controls" style={{ marginLeft: 'auto' }}>
                                <select className="crg-select" value={metricBar} onChange={e => setMetricBar(e.target.value)}>
                                    <option value="sales">Ventas (C$)</option>
                                    <option value="openings">Aperturas</option>
                                    <option value="withdrawals">Retiros (C$)</option>
                                    <option value="deposits">Depósitos (C$)</option>
                                </select>
                            </div>
                        </div>
                        {hasData && dayLabels.length > 0
                            ? <CanvasChart builder={buildDailyBar} deps={[filtered, metricBar]} />
                            : <div className="crg-chart-empty"><span>📊</span><span>Sin datos para mostrar</span></div>}
                    </div>

                    <div className="crg-card">
                        <div className="crg-card-title"><span>📈</span> Tendencia: Ventas vs Retiros vs Depósitos</div>
                        {hasData && dayLabels.length > 0
                            ? <CanvasChart builder={buildDailyLine} deps={[filtered]} />
                            : <div className="crg-chart-empty"><span>📈</span><span>Sin datos para mostrar</span></div>}
                    </div>
                </div>

                {/* Fila 2: Dos donuts + Barras por empleado */}
                <div className="crg-grid-3">
                    <div className="crg-card">
                        <div className="crg-card-title"><span>🏪</span> Ventas: Local vs A domicilio</div>
                        {hasData
                            ? <CanvasChart small builder={buildPieLocal} deps={[filtered]} />
                            : <div className="crg-chart-empty"><span>🍕</span><span>Sin datos</span></div>}
                        <div className="crg-donut-legend">
                            <span style={{ color: '#f97316' }}>● Local: C$ {money(totalCash)}</span>
                            <span style={{ color: '#fdba74' }}>● Domicilio: C$ {money(totalDelivery)}</span>
                        </div>
                    </div>

                    <div className="crg-card">
                        <div className="crg-card-title"><span>✅</span> Sesiones cuadradas vs con diferencia</div>
                        {hasData
                            ? <CanvasChart small builder={buildPieSquared} deps={[filtered]} />
                            : <div className="crg-chart-empty"><span>⚖️</span><span>Sin datos</span></div>}
                        <div className="crg-donut-legend">
                            <span style={{ color: '#27AE60' }}>● Cuadradas: {squaredSessions}</span>
                            <span style={{ color: '#E74C3C' }}>● Con diferencia: {closedSessions - squaredSessions}</span>
                        </div>
                    </div>

                    <div className="crg-card">
                        <div className="crg-card-title">
                            <span>👤</span> Por empleado
                            <div className="crg-card-controls" style={{ marginLeft: 'auto' }}>
                                <select className="crg-select" value={empMetric} onChange={e => setEmpMetric(e.target.value)}>
                                    <option value="sales">Total ventas</option>
                                    <option value="sessions">N° Sesiones</option>
                                    <option value="diff">Diferencia</option>
                                </select>
                            </div>
                        </div>
                        {hasData && empLabels.length > 0
                            ? <CanvasChart small builder={buildEmpBar} deps={[filtered, empMetric]} />
                            : <div className="crg-chart-empty"><span>👤</span><span>Sin datos</span></div>}
                    </div>
                </div>

                {/* Fila 3: Diferencia por sesión + Ventas por hora */}
                <div className="crg-grid-2">
                    <div className="crg-card">
                        <div className="crg-card-title"><span>⚖️</span> Diferencia por sesión (arqueo)</div>
                        <p className="crg-card-hint">Verde = sobrante · Rojo = faltante · Neutro = cuadrado</p>
                        {hasData
                            ? <CanvasChart builder={buildDiffLine} deps={[filtered]} />
                            : <div className="crg-chart-empty"><span>⚖️</span><span>Sin datos</span></div>}
                    </div>

                    <div className="crg-card">
                        <div className="crg-card-title"><span>🕐</span> Ventas por hora de apertura</div>
                        <p className="crg-card-hint">Distribución de ventas según la hora de apertura de la sesión</p>
                        {hasData
                            ? <CanvasChart builder={buildHourBar} deps={[filtered]} />
                            : <div className="crg-chart-empty"><span>🕐</span><span>Sin datos</span></div>}
                    </div>
                </div>

                {/* Fila 4: Tabla empleados + Últimas sesiones */}
                <div className="crg-grid-2">
                    <div className="crg-card">
                        <div className="crg-card-title"><span>👥</span> Resumen por empleado</div>
                        <table className="crg-table">
                            <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Empleado</th>
                                <th>Sesiones</th>
                                <th>Ventas (C$)</th>
                                <th>Cuadradas</th>
                                <th>Diferencia (C$)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {empLabels.length === 0 ? (
                                <tr><td colSpan={5} className="crg-td-center" style={{ padding: '20px', color: '#9ca3af' }}>Sin datos</td></tr>
                            ) : empLabels.map((emp, i) => {
                                const v = byEmp[emp];
                                const isOk = v.squared === v.sessions;
                                return (
                                    <tr key={emp} style={{ background: i % 2 === 0 ? '#fff' : '#fffbf5' }}>
                                        <td className="crg-td-name">{emp}</td>
                                        <td className="crg-td-center">{v.sessions}</td>
                                        <td className="crg-td-teal">C$ {money(v.sales)}</td>
                                        <td className="crg-td-center">
                                                <span className={`crg-squared ${isOk ? 'crg-squared--ok' : 'crg-squared--partial'}`}>
                                                    {v.squared}/{v.sessions}
                                                </span>
                                        </td>
                                        <td className={v.diff < 0 ? 'crg-td-red' : v.diff > 0 ? 'crg-td-green' : ''}>
                                            {v.diff >= 0 ? '+' : ''}C$ {money(v.diff)}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    <div className="crg-card">
                        <div className="crg-card-title"><span>🕓</span> Últimas 5 sesiones</div>
                        <table className="crg-table">
                            <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Apertura</th>
                                <th style={{ textAlign: 'left' }}>Empleado</th>
                                <th>Ventas</th>
                                <th>Dif.</th>
                                <th>Estado</th>
                            </tr>
                            </thead>
                            <tbody>
                            {lastSessions.length === 0 ? (
                                <tr><td colSpan={5} className="crg-td-center" style={{ padding: '20px', color: '#9ca3af' }}>Sin datos</td></tr>
                            ) : lastSessions.map((s, i) => {
                                const diff     = Number(s.difference ?? 0);
                                const isClosed = ['Cerrado','Cerrada'].includes(s.status);
                                return (
                                    <tr key={s.cashRegisterId} style={{ background: i % 2 === 0 ? '#fff' : '#fffbf5' }}>
                                        <td style={{ textAlign: 'left' }}>{fmtDateTime(s.openTime)}</td>
                                        <td style={{ textAlign: 'left' }}>{s.employeeName ?? '—'}</td>
                                        <td className="crg-td-teal">C$ {money(s.totalSales)}</td>
                                        <td className={diff < 0 ? 'crg-td-red' : diff > 0 ? 'crg-td-green' : ''}>
                                            {isClosed ? `${diff >= 0 ? '+' : ''}C$ ${money(diff)}` : '—'}
                                        </td>
                                        <td className="crg-td-center">
                                                <span className={`crg-badge ${isClosed ? 'crg-badge--closed' : 'crg-badge--open'}`}>
                                                    {isClosed ? 'Cerrado' : 'Abierto'}
                                                </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}