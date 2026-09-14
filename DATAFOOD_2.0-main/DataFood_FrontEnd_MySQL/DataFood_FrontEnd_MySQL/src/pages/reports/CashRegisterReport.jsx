import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CashRegisterGraph from './CashRegisterGraph.jsx';
import './CashRegisterReport.css';

/* ─── Helpers ─── */
const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('es-NI', { dateStyle: 'short' }) : '—';

const fmtTime = (d) =>
    d ? new Date(d).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString('es-NI', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true,
    }) : '—';

const money = (n) =>
    Number(n ?? 0).toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

function getRangeForFilter(filter) {
    const now = new Date();
    const pad = (d) => d.toISOString().split('T')[0];
    if (filter === 'Hoy') {
        const s = pad(now);
        return { startDate: s, endDate: s };
    }
    if (filter === 'Esta semana') {
        const day = now.getDay() || 7;
        const mon = new Date(now);
        mon.setDate(now.getDate() - day + 1);
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

/* ─── Session detail modal ─── */
function SessionModal({ session, onClose }) {
    if (!session) return null;

    const duration = session.openTime && session.closeTime
        ? (() => {
            const diff = new Date(session.closeTime) - new Date(session.openTime);
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            return `${h}h ${m}m`;
        })()
        : session.openTime ? 'En curso' : '—';

    const movements = session.movements ?? [];
    const withdrawals = movements.filter(m => m.movementType === 'Retiro');
    const deposits    = movements.filter(m => m.movementType === 'Deposito');
    const totalWithdrawals = withdrawals.reduce((s, m) => s + Number(m.amount ?? 0), 0);
    const totalDeposits    = deposits.reduce((s, m) => s + Number(m.amount ?? 0), 0);

    return (
        <div className="cr-modal-overlay" onClick={onClose}>
            <div className="cr-modal" onClick={(e) => e.stopPropagation()}>
                <div className="cr-modal-header">
                    <h3 className="cr-modal-title">
                        Detalle de Sesión · <span className="cr-modal-id">#{session.cashRegisterId}</span>
                    </h3>
                    <button className="cr-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Session info grid */}
                {/* Session info grid — reorganizado en bloques lógicos */}
                <div className="cr-modal-grid">

                    {/* ── Fila 1: Empleados ── */}
                    <div className="cr-modal-row">
                        <span>Empleado (apertura)</span>
                        <strong>{session.employeeName ?? '—'}</strong>
                    </div>
                    <div className="cr-modal-row">
                        <span>Empleado (cierre)</span>
                        <strong style={{ color: session.closeEmployeeName ? 'inherit' : '#9ca3af' }}>
                            {['Cerrado','Cerrada'].includes(session.status)
                                ? (session.closeEmployeeName ?? 'No registrado')
                                : '—'}
                        </strong>
                    </div>

                    {/* ── Fila 2: Estado (ocupa toda la fila) ── */}
                    <div className="cr-modal-row cr-modal-row--full">
                        <span>Estado</span>
                        <strong>
            <span className={`cr-badge ${['Cerrado','Cerrada'].includes(session.status) ? 'cr-badge-ok' : 'cr-badge-open'}`}>
                {['Cerrado','Cerrada'].includes(session.status) ? 'Cerrado' : 'Abierto'}
            </span>
                        </strong>
                    </div>

                    {/* ── Fila 3: Fechas ── */}
                    <div className="cr-modal-row">
                        <span>Apertura</span>
                        <strong>{fmtDateTime(session.openTime)}</strong>
                    </div>
                    <div className="cr-modal-row">
                        <span>Cierre</span>
                        <strong>{fmtDateTime(session.closeTime)}</strong>
                    </div>

                    {/* ── Fila 4: Duración (ocupa toda la fila) ── */}
                    <div className="cr-modal-row cr-modal-row--full">
                        <span>Duración</span>
                        <strong>{duration}</strong>
                    </div>

                    {/* ── Fila 5: Montos ── */}
                    <div className="cr-modal-row">
                        <span>Monto apertura</span>
                        <strong>C$ {money(session.openingAmount)}</strong>
                    </div>
                    <div className="cr-modal-row">
                        <span>Monto cierre</span>
                        <strong>C$ {money(session.closingAmount)}</strong>
                    </div>

                    {/* ── Fila 6: Diferencia (ocupa toda la fila) ── */}
                    <div className="cr-modal-row cr-modal-row--full">
                        <span>Diferencia</span>
                        <strong style={{ color: Number(session.difference ?? 0) === 0 ? '#15803d' : '#dc2626' }}>
                            {Number(session.difference ?? 0) >= 0 ? '+' : ''}C$ {money(session.difference)}
                        </strong>
                    </div>

                </div>

                {/* Day summary */}
                <div className="cr-modal-section-title">Resumen del turno</div>
                <div className="cr-modal-summary">
                    <div className="cr-summary-item">
                        <span>Ventas en efectivo (local)</span>
                        <strong>C$ {money(session.cashSales)}</strong>
                    </div>
                    <div className="cr-summary-item">
                        <span>Ventas a domicilio</span>
                        <strong>C$ {money(session.deliverySales)}</strong>
                    </div>
                    {Number(session.deliveryFees ?? 0) > 0 && (
                        <div className="cr-summary-item">
                            <span>Cobros de envío</span>
                            <strong>C$ {money(session.deliveryFees)}</strong>
                        </div>
                    )}
                    <div className="cr-summary-item cr-summary-item--total">
                        <span>Total ventas ({session.totalOrders ?? 0} órdenes)</span>
                        <strong>C$ {money(session.totalSales)}</strong>
                    </div>
                    <div className="cr-summary-item">
                        <span>Retiros del día</span>
                        <strong style={{ color: '#dc2626' }}>-C$ {money(totalWithdrawals)}</strong>
                    </div>
                    <div className="cr-summary-item">
                        <span>Depósitos del día</span>
                        <strong style={{ color: '#15803d' }}>+C$ {money(totalDeposits)}</strong>
                    </div>
                    <div className="cr-summary-item">
                        <span>Efectivo esperado</span>
                        <strong>C$ {money(session.expectedAmount)}</strong>
                    </div>
                </div>

                {/* Movements table */}
                {movements.length > 0 && (
                    <>
                        <div className="cr-modal-section-title">Movimientos de caja</div>
                        <table className="cr-modal-table">
                            <thead>
                            <tr>
                                <th>Hora</th>
                                <th>Tipo</th>
                                <th>Motivo</th>
                                <th>Empleado</th>
                                <th>Monto (C$)</th>
                                <th>Observación</th>
                            </tr>
                            </thead>
                            <tbody>
                            {movements.map((m, i) => (
                                <tr key={m.movementId ?? i}>
                                    <td>{fmtTime(m.createdAt)}</td>
                                    <td>
                                        <span className={`cr-badge ${m.movementType === 'Retiro' ? 'cr-badge-cancel' : 'cr-badge-deposit'}`}>
                                            {m.movementType}
                                        </span>
                                    </td>
                                    <td>{m.reason ?? '—'}</td>
                                    <td>{m.employeeName ?? session.employeeName ?? '—'}</td>
                                    <td>
                                        <strong style={{ color: m.movementType === 'Retiro' ? '#dc2626' : '#15803d' }}>
                                            {m.movementType === 'Retiro' ? '-' : '+'}C$ {money(m.amount)}
                                        </strong>
                                    </td>
                                    <td>{m.note ?? '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </>
                )}

                {/* Notes */}
                {(session.openNote || session.closeNote) && (
                    <>
                        <div className="cr-modal-section-title">Observaciones</div>
                        <div className="cr-modal-notes">
                            {session.openNote && (
                                <div className="cr-note-item">
                                    <span>Apertura:</span> {session.openNote}
                                </div>
                            )}
                            {session.closeNote && (
                                <div className="cr-note-item">
                                    <span>Cierre:</span> {session.closeNote}
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className="cr-modal-totals">
                    <div className="cr-total-row"><span>Efectivo esperado</span><span>C$ {money(session.expectedAmount)}</span></div>
                    <div className="cr-total-row"><span>Efectivo contado</span><span>C$ {money(session.closingAmount)}</span></div>
                    <div className={`cr-total-row cr-total-final ${Number(session.difference ?? 0) !== 0 ? 'cr-total-error' : ''}`}>
                        <span>DIFERENCIA</span>
                        <span>{Number(session.difference ?? 0) >= 0 ? '+' : ''}C$ {money(session.difference)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Main component ─── */
export default function CashRegisterReport() {
    const navigate = useNavigate();
    const tableRef = useRef(null);

    /* Data */
    const [sessions,  setSessions]  = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);

    /* Filters */
    const { startDate: initStart, endDate: initEnd } = getRangeForFilter('Este mes');
    const [filtroRapido, setFiltroRapido] = useState('Este mes');
    const [startDate,    setStartDate]    = useState(initStart);
    const [endDate,      setEndDate]      = useState(initEnd);
    const [statusFilter, setStatusFilter] = useState('');
    const [empFilter,    setEmpFilter]    = useState('');
    const [movTypeFilter, setMovTypeFilter] = useState('');

    /* UI */
    const [page,        setPage]       = useState(1);
    const [modalItem,   setModalItem]  = useState(null);
    const [showGrafica, setShowGrafica] = useState(false);
    const [showExport,  setShowExport]  = useState(false);
    const [activeTab,   setActiveTab]   = useState('sessions');
    const exportRef = useRef(null);

    const PAGE_SIZE = 7;

    /* ── Load data ── */
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/cashregister/report`);
                const text = await res.text();
                if (!res.ok) {
                    console.error('STATUS DEL BACKEND:', res.status);
                    console.error('RESPUESTA DEL BACKEND:', text);
                    throw new Error('Error al cargar datos');
                }
                const data = text ? JSON.parse(text) : [];
                const list = Array.isArray(data) ? data : (data?.data ?? []);
                list.sort((a, b) => new Date(b.openTime) - new Date(a.openTime));
                setSessions(list);
            } catch (e) {
                console.error('ERROR COMPLETO:', e);
                setError('No se pudieron cargar los datos. Verifica la conexión con el servidor.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /* Close export dropdown on outside click */
    useEffect(() => {
        const handler = (e) => {
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setShowExport(false);
            }
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

    /* ── Filter options ── */
    const allEmployees = [...new Set(sessions.map((s) => s.employeeName).filter(Boolean))].sort();

    /* ── Filtered sessions ── */
    const filteredSessions = sessions.filter((s) => {
        const sDate      = new Date(s.openTime);
        const matchStart  = startDate    ? sDate >= new Date(startDate) : true;
        const matchEnd    = endDate      ? sDate <= new Date(endDate + 'T23:59:59') : true;
        const matchStatus = statusFilter ? s.status === statusFilter : true;
        const matchEmp    = empFilter    ? s.employeeName === empFilter : true;
        return matchStart && matchEnd && matchStatus && matchEmp;
    });

    /* ── All movements (flat) — enrich with parent session data ── */
    const allMovements = filteredSessions.flatMap((s) =>
        (s.movements ?? []).map((m) => ({
            ...m,
            // FIX: usar nombre del movimiento, si no hay usar el de la sesión padre
            employeeName: m.employeeName ?? s.employeeName ?? '—',
            sessionId:    s.cashRegisterId,
            sessionDate:  s.openTime,
            // guardar referencia a la sesión padre para abrir el modal
            _parentSession: s,
        }))
    )
        .filter((m) => movTypeFilter ? m.movementType === movTypeFilter : true)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    /* ── Stats ── */
    const totalOpenings    = filteredSessions.length;
    const totalWithdrawals = filteredSessions.reduce((s, sess) =>
        s + (sess.movements ?? []).filter(m => m.movementType === 'Retiro').reduce((a, m) => a + Number(m.amount ?? 0), 0), 0);
    const totalDeposits    = filteredSessions.reduce((s, sess) =>
        s + (sess.movements ?? []).filter(m => m.movementType === 'Deposito').reduce((a, m) => a + Number(m.amount ?? 0), 0), 0);
    const totalDifference  = filteredSessions.reduce((s, sess) => s + Number(sess.difference ?? 0), 0);
    // Reemplaza las líneas 358-361 por esto:
    const squaredSessions = filteredSessions.filter(
        s => Number(s.difference ?? 0) === 0 && ['Cerrado', 'Cerrada'].includes(s.status)
    ).length;
    const closedSessions = filteredSessions.filter(
        s => ['Cerrado', 'Cerrada'].includes(s.status)
    ).length;
    const totalCashSales   = filteredSessions.reduce((s, sess) => s + Number(sess.cashSales ?? 0), 0);

    /* ── Pagination ── */
    const activeData  = activeTab === 'sessions' ? filteredSessions : allMovements;
    const totalPages  = Math.max(1, Math.ceil(activeData.length / PAGE_SIZE));
    const paginated   = activeData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    /* ── Clear filters ── */
    const clearFilters = () => {
        setFiltroRapido('Este mes');
        const { startDate: s, endDate: e } = getRangeForFilter('Este mes');
        setStartDate(s);
        setEndDate(e);
        setStatusFilter('');
        setEmpFilter('');
        setMovTypeFilter('');
        setPage(1);
    };

    /* ── Export Excel ── */
    const exportExcel = async () => {
        setShowExport(false);

        if (!window.ExcelJS) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
                script.onload  = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const ExcelJS = window.ExcelJS;
        const wb = new ExcelJS.Workbook();
        wb.creator = 'Sistema de Caja';
        wb.created = new Date();

        const C = {
            tealDark:  '1A5276',
            tealMed:   '1ABC9C',
            tealLight: 'D5F5E3',
            orange:    'E67E22',
            grayHdr:   '2E4053',
            gray2:     '566573',
            white:     'FFFFFF',
            dark:      '1B2631',
            red:       'E74C3C',
            green:     '27AE60',
        };
        const argb   = (hex) => `FF${hex}`;
        const border = {
            top:    { style: 'thin', color: { argb: 'FFBDC3C7' } },
            bottom: { style: 'thin', color: { argb: 'FFBDC3C7' } },
            left:   { style: 'thin', color: { argb: 'FFBDC3C7' } },
            right:  { style: 'thin', color: { argb: 'FFBDC3C7' } },
        };
        const hSt = (bg, fg = C.white, sz = 11, bold = true) => ({
            font:      { name: 'Arial', size: sz, bold, color: { argb: argb(fg) } },
            fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(bg) } },
            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
            border,
        });
        const dSt = (bg, bold = false, align = 'left', color = C.dark, sz = 10) => ({
            font:      { name: 'Arial', size: sz, bold, color: { argb: argb(color) } },
            fill:      bg ? { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(bg) } } : undefined,
            alignment: { horizontal: align, vertical: 'middle', wrapText: false },
            border,
        });
        const applyS = (cell, st) => {
            if (st.font)      cell.font      = st.font;
            if (st.fill)      cell.fill      = st.fill;
            if (st.alignment) cell.alignment = st.alignment;
            if (st.border)    cell.border    = st.border;
        };
        const mFmt = (cell) => { cell.numFmt = '#,##0.00'; };
        const fmtDate2 = (d) => d ? new Date(d).toLocaleDateString('es-NI', { dateStyle: 'short' }) : '—';
        const fmtDateTime2 = (d) => d ? new Date(d).toLocaleString('es-NI', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: true,
        }) : '—';

        const periodoStr = startDate && endDate
            ? `${fmtDate2(startDate)} – ${fmtDate2(endDate)}`
            : startDate ? `Desde ${fmtDate2(startDate)}`
                : endDate ? `Hasta ${fmtDate2(endDate)}`
                    : filtroRapido || 'Todo el período';
        const generadoStr = new Date().toLocaleDateString('es-NI', { dateStyle: 'short' });

        const orangeSt = {
            font:      { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
            fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.orange) } },
            alignment: { horizontal: 'right', vertical: 'middle' },
            border,
        };

        /* ════ SHEET 1 — RESUMEN DE SESIONES ════
       /* ════ SHEET 1 — RESUMEN DE SESIONES ════
   A(margen) B(#) C(Apertura) D(Cierre) E(Emp.apertura) F(Emp.cierre)
   G(M.apertura) H(M.cierre) I(Diferencia) J(Ventas) K(Total sesión) L(Estado)
*/
        const ws1 = wb.addWorksheet('Resumen de Sesiones', { views: [{ showGridLines: false }] });
        ws1.columns = [
            { width: 3 },  // A — margen
            { width: 5 },  // B — #
            { width: 20 }, // C — Apertura
            { width: 20 }, // D — Cierre
            { width: 20 }, // E — Emp. apertura
            { width: 20 }, // F — Emp. cierre
            { width: 15 }, // G — Monto apertura
            { width: 15 }, // H — Monto cierre
            { width: 15 }, // I — Diferencia
            { width: 15 }, // J — Ventas totales
            { width: 15 }, // K — Total sesión
            { width: 10 }, // L — Estado
        ];

// Título
        ws1.getRow(1).height = 8;
        ws1.mergeCells('B2:L3');
        ws1.getRow(2).height = 30;
        ws1.getRow(3).height = 22;
        applyS(ws1.getCell('B2'), hSt(C.tealDark, C.white, 20, true));
        ws1.getCell('B2').value = 'REPORTE DE CAJA';

        ws1.mergeCells('B4:L4');
        ws1.getRow(4).height = 16;
        applyS(ws1.getCell('B4'), hSt(C.grayHdr, C.white, 10, false));
        ws1.getCell('B4').value = `Comedor Raquel   |   Periodo: ${periodoStr}   |   Generado: ${generadoStr}`;

// KPIs
        ws1.getRow(5).height = 10;
        ws1.mergeCells('B6:L6');
        ws1.getRow(6).height = 20;
        applyS(ws1.getCell('B6'), hSt(C.tealMed, C.white, 11, true));
        ws1.getCell('B6').value = '📊  RESUMEN EJECUTIVO';

        ws1.getRow(7).height = 14;
        ws1.getRow(8).height = 26;
        ws1.getRow(9).height = 14;

        // ── KPIs — agregar ANTES de kpiRanges ──
        const kpis = [
            { label: 'APERTURAS',       value: String(totalOpenings),                  sub: periodoStr },
            { label: 'CAJA CUADRADA',   value: `${squaredSessions}/${closedSessions}`, sub: 'Sesiones cerradas' },
            { label: 'TOTAL RETIROS',   value: `C$ ${money(totalWithdrawals)}`,         sub: periodoStr },
            { label: 'TOTAL DEPÓSITOS', value: `C$ ${money(totalDeposits)}`,            sub: periodoStr },
        ];

        const kpiRanges = [
            { startCol: 2, endCol: 4 }, { startCol: 5, endCol: 7 },
            { startCol: 8, endCol: 10 }, { startCol: 11, endCol: 12 },
        ];

        kpis.forEach(({ label, value, sub }, idx) => {
            const { startCol, endCol } = kpiRanges[idx];
            const colLetter = (n) => n <= 26 ? String.fromCharCode(64 + n) : 'A' + String.fromCharCode(64 + n - 26);
            const startL = colLetter(startCol), endL = colLetter(endCol);
            ws1.mergeCells(`${startL}7:${endL}7`);
            ws1.mergeCells(`${startL}8:${endL}8`);
            ws1.mergeCells(`${startL}9:${endL}9`);
            const r7 = ws1.getCell(`${startL}7`); r7.value = label; applyS(r7, hSt(C.grayHdr, C.white, 9, true));
            const r8 = ws1.getCell(`${startL}8`); r8.value = value; applyS(r8, hSt(C.tealDark, C.white, 13, true));
            const r9 = ws1.getCell(`${startL}9`); r9.value = sub;   applyS(r9, hSt(C.gray2, C.white, 8, false));
        });

// Encabezado tabla
        ws1.getRow(10).height = 12;
        ws1.mergeCells('B11:L11');
        ws1.getRow(11).height = 20;
        applyS(ws1.getCell('B11'), hSt(C.tealDark, C.white, 11, true));
        ws1.getCell('B11').value = '≡  DETALLE DE SESIONES';

        ws1.getRow(12).height = 20;
        const th1 = [
            '#', 'Apertura', 'Cierre',
            'Emp. apertura', 'Emp. cierre',
            'Monto apertura', 'Monto cierre', 'Diferencia',
            'Ventas totales', 'Total sesión', 'Estado'
        ];
        const tc1 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // B…L
        th1.forEach((h, i) => {
            const c = ws1.getCell(12, tc1[i]);
            c.value = h;
            applyS(c, hSt(C.grayHdr, C.white, 10, true));
        });

// Filas de datos
        filteredSessions.forEach((s, i) => {
            const row      = 13 + i;
            ws1.getRow(row).height = 18;
            const bg       = i % 2 === 0 ? C.white : C.tealLight;
            const diff     = Number(s.difference ?? 0);
            const apertura = Number(s.openingAmount ?? 0);
            const ventas   = Number(s.totalSales ?? 0);
            const totalSesion = apertura + ventas; // apertura + lo generado en la sesión
            const isClosed = ['Cerrado', 'Cerrada'].includes(s.status);

            const vals = [
                i + 1,                          // B — #
                fmtDateTime2(s.openTime),       // C — Apertura
                fmtDateTime2(s.closeTime),      // D — Cierre
                s.employeeName ?? '—',          // E — Emp. apertura
                s.closeEmployeeName ?? (isClosed ? 'No registrado' : '—'), // F — Emp. cierre
                apertura,                       // G — Monto apertura
                Number(s.closingAmount ?? 0),   // H — Monto cierre
                diff,                           // I — Diferencia
                ventas,                         // J — Ventas totales
                totalSesion,                    // K — Total sesión
                isClosed ? 'Cerrado' : 'Abierto', // L — Estado
            ];

            vals.forEach((v, j) => {
                const cell  = ws1.getCell(row, tc1[j]);
                cell.value  = v;
                const isM   = j >= 5 && j <= 9; // G a K son montos
                const align = isM ? 'right' : (j === 0 ? 'center' : 'left');
                let color   = C.dark;
                if (j === 7) color = diff < 0 ? C.red : diff > 0 ? C.green : C.dark; // Diferencia
                else if (j === 9) color = C.tealDark; // Total sesión destacado
                else if (isM) color = C.tealDark;
                applyS(cell, dSt(bg, j === 9, align, color)); // Total sesión en bold
                if (isM) mFmt(cell);
            });
        });

// Fila totales — etiqueta B:J, total ventas en K, total sesiones en L
        const totalRow1 = 13 + filteredSessions.length;
        ws1.getRow(totalRow1).height = 24;

// Etiqueta — de B a I
        ws1.mergeCells(`B${totalRow1}:I${totalRow1}`);
        applyS(ws1.getCell(`B${totalRow1}`), { ...orangeSt, alignment: { horizontal: 'right', vertical: 'middle' } });
        ws1.getCell(`B${totalRow1}`).value = 'TOTALES GENERALES';

// Columna J — Total ventas de todas las sesiones
        const tvVentas = ws1.getCell(`J${totalRow1}`);
        tvVentas.value = filteredSessions.reduce((acc, s) => acc + Number(s.totalSales ?? 0), 0);
        applyS(tvVentas, orangeSt);
        mFmt(tvVentas);

// Columna K — Total sesión de todas las sesiones (apertura + ventas)
        const tvTotal = ws1.getCell(`K${totalRow1}`);
        tvTotal.value = filteredSessions.reduce((acc, s) =>
            acc + Number(s.openingAmount ?? 0) + Number(s.totalSales ?? 0), 0);
        applyS(tvTotal, orangeSt);
        mFmt(tvTotal);

// Columna L — celda naranja vacía para completar la fila
        applyS(ws1.getCell(`L${totalRow1}`), orangeSt);
        /* ════ SHEET 2 — MOVIMIENTOS ════
           Columnas: A(margen) B(Fecha) C(Tipo) D(Motivo) E(Empleado)
                     F(Retiros) G(Depósitos) H(Observación)
           Total: B-E etiqueta, F total retiros, G total depósitos
        */
        const ws2 = wb.addWorksheet('Movimientos', { views: [{ showGridLines: false }] });
        ws2.columns = [
            { width: 3 },  // A — margen
            { width: 22 }, // B — Fecha y hora
            { width: 14 }, // C — Tipo
            { width: 22 }, // D — Motivo
            { width: 22 }, // E — Empleado
            { width: 18 }, // F — Retiros
            { width: 18 }, // G — Depósitos
            { width: 28 }, // H — Observación
        ];

        ws2.getRow(1).height = 8;
        ws2.mergeCells('B2:H3');
        ws2.getRow(2).height = 28;
        applyS(ws2.getCell('B2'), hSt(C.tealDark, C.white, 16, true));
        ws2.getCell('B2').value = '💸  MOVIMIENTOS DE CAJA';

        ws2.mergeCells('B4:H4');
        ws2.getRow(4).height = 16;
        applyS(ws2.getCell('B4'), hSt(C.grayHdr, C.white, 10, false));
        ws2.getCell('B4').value = `Comedor Raquel   |   Periodo: ${periodoStr}   |   Generado: ${generadoStr}`;

        ws2.getRow(5).height = 8;
        ws2.getRow(6).height = 22;

        // Headers con columnas separadas de retiros/depósitos
        const th2 = ['Fecha y hora', 'Tipo', 'Motivo', 'Empleado', 'Retiros (C$)', 'Depósitos (C$)', 'Observación'];
        const tc2  = [2, 3, 4, 5, 6, 7, 8]; // B=2 … H=8
        th2.forEach((h, i) => {
            const c = ws2.getCell(6, tc2[i]);
            c.value = h;
            applyS(c, hSt(C.grayHdr, C.white, 10, true));
        });

        // Preparar movimientos planos
        const flatMovements = filteredSessions.flatMap((s) =>
            (s.movements ?? []).map((m) => ({
                ...m,
                sessionDate: s.openTime,
                empName: m.employeeName ?? s.employeeName ?? '—',
            }))
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Calcular totales reales desde flatMovements
        const totalRetirosExcel = flatMovements
            .filter(m => m.movementType === 'Retiro')
            .reduce((acc, m) => acc + Number(m.amount ?? 0), 0);
        const totalDepositosExcel = flatMovements
            .filter(m => ['Deposito', 'Depósito'].includes(m.movementType))
            .reduce((acc, m) => acc + Number(m.amount ?? 0), 0);

        // Filas de movimientos — retiros en col F, depósitos en col G
        flatMovements.forEach((m, i) => {
            const row      = 7 + i;
            ws2.getRow(row).height = 17;
            const bg       = i % 2 === 0 ? C.white : C.tealLight;
            const isRetiro = m.movementType === 'Retiro';
            const monto    = Number(m.amount ?? 0);

            // [Fecha, Tipo, Motivo, Empleado, Retiro, Deposito, Nota]
            const vals2 = [
                fmtDateTime2(m.createdAt),
                m.movementType ?? '—',
                m.reason ?? '—',
                m.empName,
                isRetiro  ? monto : null,   // F — solo si es retiro
                !isRetiro ? monto : null,   // G — solo si es depósito
                m.note ?? '—',
            ];

            vals2.forEach((v, j) => {
                const cell = ws2.getCell(row, tc2[j]);
                cell.value = v ?? '—';
                const isMoneyCol = j === 4 || j === 5;
                const color = j === 1
                    ? (isRetiro ? C.red : C.green)
                    : j === 4 ? C.red
                        : j === 5 ? C.green
                            : C.dark;
                applyS(cell, dSt(bg, isMoneyCol, isMoneyCol ? 'right' : 'left', color));
                if (isMoneyCol && v !== null) mFmt(cell);
            });
        });

        // Fila total — etiqueta B:E, retiros en F, depósitos en G
        const totalRow2 = 7 + flatMovements.length;
        ws2.getRow(totalRow2).height = 22;
        const orangeSt2 = { ...orangeSt, font: { ...orangeSt.font, size: 11 } };

        ws2.mergeCells(`B${totalRow2}:E${totalRow2}`);
        applyS(ws2.getCell(`B${totalRow2}`), { ...orangeSt2, alignment: { horizontal: 'right', vertical: 'middle' } });
        ws2.getCell(`B${totalRow2}`).value = 'TOTALES';

        const retCell = ws2.getCell(`F${totalRow2}`);
        retCell.value = totalRetirosExcel;
        applyS(retCell, orangeSt2);
        mFmt(retCell);

        const depCell = ws2.getCell(`G${totalRow2}`);
        depCell.value = totalDepositosExcel;
        applyS(depCell, orangeSt2);
        mFmt(depCell);

        // Celda vacía H (observación) con estilo naranja para completar la fila
        applyS(ws2.getCell(`H${totalRow2}`), orangeSt2);

        /* ════ SHEET 3 — POR EMPLEADO ════ */
        const ws3 = wb.addWorksheet('Por Empleado', { views: [{ showGridLines: false }] });
        ws3.columns = [
            { width: 3 },  // A — margen
            { width: 30 }, // B — Empleado
            { width: 14 }, // C — N° Sesiones
            { width: 18 }, // D — Total ventas
            { width: 14 }, // E — Caja cuadrada
            { width: 18 }, // F — Diferencia total
        ];

        ws3.getRow(1).height = 8;
        ws3.mergeCells('B2:F3');
        ws3.getRow(2).height = 28;
        applyS(ws3.getCell('B2'), hSt(C.tealDark, C.white, 16, true));
        ws3.getCell('B2').value = '👤  RESUMEN POR EMPLEADO';

        ws3.mergeCells('B4:F4');
        ws3.getRow(4).height = 16;
        applyS(ws3.getCell('B4'), hSt(C.grayHdr, C.white, 10, false));
        ws3.getCell('B4').value = `Comedor Raquel   |   Periodo: ${periodoStr}   |   Generado: ${generadoStr}`;

        ws3.getRow(5).height = 8;
        ws3.getRow(6).height = 20;
        ['Empleado', 'N° Sesiones', 'Total ventas', 'Caja cuadrada', 'Diferencia total'].forEach((h, i) => {
            const c = ws3.getCell(6, i + 2);
            c.value = h;
            applyS(c, hSt(C.grayHdr, C.white, 10, true));
        });

        const sm3 = {};
        filteredSessions.forEach((s) => {
            const emp = s.employeeName || '—';
            if (!sm3[emp]) sm3[emp] = { n: 0, sales: 0, squared: 0, diff: 0 };
            sm3[emp].n++;
            sm3[emp].sales += Number(s.totalSales ?? 0);
            sm3[emp].diff  += Number(s.difference ?? 0);
            const isClosed = ['Cerrado', 'Cerrada'].includes(s.status);
            if (Number(s.difference ?? 0) === 0 && isClosed) sm3[emp].squared++;
        });

        Object.entries(sm3).sort().forEach(([emp, v], i) => {
            const row = 7 + i;
            ws3.getRow(row).height = 17;
            const bg = i % 2 === 0 ? C.white : C.tealLight;
            [emp, v.n, v.sales, `${v.squared}/${v.n}`, v.diff].forEach((val, j) => {
                const cell   = ws3.getCell(row, j + 2);
                cell.value   = val;
                const isM    = j === 2 || j === 4;
                const isLast = j === 4;
                const color  = isLast
                    ? (v.diff < 0 ? C.red : v.diff > 0 ? C.green : C.tealDark)
                    : C.dark;
                applyS(cell, dSt(bg, isLast, isM ? 'right' : 'left', color));
                if (isM) mFmt(cell);
            });
        });

        // Fila total sheet 3
        const totalRow3 = 7 + Object.keys(sm3).length;
        ws3.getRow(totalRow3).height = 22;
        const orangeSt3 = { ...orangeSt, font: { ...orangeSt.font, size: 11 } };

        const lc3 = ws3.getCell(`B${totalRow3}`);
        lc3.value = 'TOTAL GENERAL';
        applyS(lc3, { ...orangeSt3, alignment: { horizontal: 'left', vertical: 'middle' } });

        const nc3 = ws3.getCell(`C${totalRow3}`);
        nc3.value = Object.values(sm3).reduce((a, v) => a + v.n, 0);
        applyS(nc3, { ...orangeSt3, alignment: { horizontal: 'center', vertical: 'middle' } });

        const sc3 = ws3.getCell(`D${totalRow3}`);
        sc3.value = filteredSessions.reduce((a, s) => a + Number(s.totalSales ?? 0), 0);
        applyS(sc3, orangeSt3);
        mFmt(sc3);

        const sqc3 = ws3.getCell(`E${totalRow3}`);
        sqc3.value = `${squaredSessions}/${closedSessions}`;
        applyS(sqc3, { ...orangeSt3, alignment: { horizontal: 'center', vertical: 'middle' } });

        const dc3 = ws3.getCell(`F${totalRow3}`);
        dc3.value = totalDifference;
        applyS(dc3, orangeSt3);
        mFmt(dc3);

        /* ── Descargar ── */
        const buf  = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        const cleanPeriodo = periodoStr.replace(/\//g, '-').replace(/\s/g, '_').replace(/–/g, 'al');
        a.download = `Reporte_Caja_${cleanPeriodo}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ── Export PNG ── */
    const exportTablePNG = async () => {
        setShowExport(false);

        if (!window.html2canvas) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.onload  = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const periodoStr = startDate && endDate
            ? `${new Date(startDate).toLocaleDateString('es-NI', { dateStyle: 'short' })} – ${new Date(endDate).toLocaleDateString('es-NI', { dateStyle: 'short' })}`
            : filtroRapido || 'Todo el período';

        const money2 = (n) => Number(n ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fmtDT2 = (d) => d ? new Date(d).toLocaleString('es-NI', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:1200px;background:white;font-family:Arial,sans-serif;font-size:13px;padding:0;z-index:-1;`;

        wrapper.innerHTML = `
            <div style="background:#1A5276;color:white;text-align:center;padding:18px 0;font-size:22px;font-weight:bold;letter-spacing:1px;">REPORTE DE CAJA</div>
            <div style="background:#2E4053;color:white;text-align:center;padding:7px 0;font-size:11px;">Comedor Raquel &nbsp;|&nbsp; Periodo: ${periodoStr} &nbsp;|&nbsp; Generado: ${new Date().toLocaleDateString('es-NI', { dateStyle: 'short' })}</div>
            <div style="background:#1ABC9C;color:white;text-align:center;padding:8px 0;font-size:13px;font-weight:bold;margin-top:10px;">📊 &nbsp; RESUMEN EJECUTIVO</div>
            <div style="display:flex;border:1px solid #ccc;">
                ${[
            { label: 'APERTURAS DE CAJA',   value: String(totalOpenings),           sub: periodoStr },
            { label: 'SESIONES CUADRADAS',   value: `${squaredSessions}/${closedSessions}`, sub: 'Cerradas' },
            { label: 'TOTAL RETIROS',        value: `C$ ${money2(totalWithdrawals)}`, sub: periodoStr },
            { label: 'TOTAL DEPÓSITOS',      value: `C$ ${money2(totalDeposits)}`,   sub: periodoStr },
        ].map(k => `<div style="flex:1;border-right:1px solid #ccc;"><div style="background:#2E4053;color:white;text-align:center;padding:5px;font-size:10px;font-weight:bold;">${k.label}</div><div style="background:#1A5276;color:white;text-align:center;padding:8px;font-size:16px;font-weight:bold;">${k.value}</div><div style="background:#566573;color:white;text-align:center;padding:4px;font-size:10px;">${k.sub}</div></div>`).join('')}
            </div>
            <div style="background:#1A5276;color:white;text-align:center;padding:8px 0;font-size:13px;font-weight:bold;margin-top:10px;">≡ &nbsp; DETALLE DE SESIONES</div>
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead>
                    <tr style="background:#2E4053;color:white;">
                        ${['#','Apertura','Cierre','Empleado','Monto apertura','Monto cierre','Diferencia','Total ventas','Estado'].map(h=>`<th style="padding:8px 6px;border:1px solid #BDC3C7;text-align:center;">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${filteredSessions.map((s, i) => {
            const bg   = i % 2 === 0 ? '#FFFFFF' : '#D5F5E3';
            const diff = Number(s.difference ?? 0);
            return `<tr style="background:${bg};">
                            <td style="padding:6px;border:1px solid #BDC3C7;text-align:center;">${i+1}</td>
                            <td style="padding:6px;border:1px solid #BDC3C7;">${fmtDT2(s.openTime)}</td>
                            <td style="padding:6px;border:1px solid #BDC3C7;">${fmtDT2(s.closeTime)}</td>
                            <td style="padding:6px;border:1px solid #BDC3C7;">${s.employeeName ?? '—'}</td>
                            <td style="padding:6px;border:1px solid #BDC3C7;text-align:right;">C$ ${money2(s.openingAmount)}</td>
                            <td style="padding:6px;border:1px solid #BDC3C7;text-align:right;">C$ ${money2(s.closingAmount)}</td>
                            <td style="padding:6px;border:1px solid #BDC3C7;text-align:right;font-weight:bold;color:${diff<0?'#E74C3C':diff>0?'#27AE60':'#1A5276'};">${diff>=0?'+':''}C$ ${money2(diff)}</td>
                            <td style="padding:6px;border:1px solid #BDC3C7;text-align:right;font-weight:bold;color:#1A5276;">C$ ${money2(s.totalSales)}</td>
                            <td style="padding:6px;border:1px solid #BDC3C7;text-align:center;font-weight:bold;color:${s.status==='Cerrado'?'#15803d':'#d97706'};">${s.status==='Cerrado'?'Cerrado':'Abierto'}</td>
                        </tr>`;
        }).join('')}
                    <tr>
                        <td colspan="8" style="padding:8px;background:#E67E22;color:white;font-weight:bold;text-align:right;border:1px solid #BDC3C7;">TOTAL VENTAS</td>
                        <td style="padding:8px;background:#E67E22;color:white;font-weight:bold;text-align:right;border:1px solid #BDC3C7;">C$ ${money2(filteredSessions.reduce((s,sess)=>s+Number(sess.totalSales??0),0))}</td>
                    </tr>
                </tbody>
            </table>`;

        document.body.appendChild(wrapper);
        await new Promise(r => setTimeout(r, 200));
        const canvas = await window.html2canvas(wrapper, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, width: 1200 });
        document.body.removeChild(wrapper);

        const a = document.createElement('a');
        a.download = `Reporte_Caja_${new Date().toLocaleDateString('es-NI', { dateStyle: 'short' }).replace(/\//g, '-')}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
    };

    /* ── Chart view ── */
    if (showGrafica) {
        return (
            <CashRegisterGraph
                sessions={filteredSessions}
                onBack={() => setShowGrafica(false)}
            />
        );
    }

    /* ── Loading / Error ── */
    if (loading) {
        return (
            <div className="cr-page">
                <div className="cr-loading">
                    <div className="cr-spinner" />
                    <p>Cargando reportes...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="cr-page">
                <div className="cr-error-box">
                    <span className="cr-error-icon">⚠️</span>
                    <p>{error}</p>
                    <button className="cr-btn-orange" onClick={() => window.location.reload()}>Reintentar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="cr-page">

            {modalItem && <SessionModal session={modalItem} onClose={() => setModalItem(null)} />}

            {/* ── Topbar ── */}
            <div className="cr-topbar">
                <div className="cr-topbar-left">
                    <button className="cr-btn-outline" onClick={() => navigate('/reports')}>← Volver a Reportes</button>
                    <div className="cr-title-block">
                        <h2 className="cr-title">🏦 Reporte de Caja</h2>
                        <p className="cr-subtitle">Consulta sesiones, movimientos y arqueos de caja.</p>
                    </div>
                </div>
                <div className="cr-export-wrap" ref={exportRef}>
                    <button className="cr-btn-outline cr-btn-export" onClick={() => setShowExport((v) => !v)}>
                        ⬆️ Exportar ▾
                    </button>
                    {showExport && (
                        <div className="cr-export-dropdown">
                            <button className="cr-export-item" onClick={exportExcel}>📊 Exportar CSV / Excel</button>
                            <button className="cr-export-item" onClick={exportTablePNG}>🖼️ Exportar Tabla PNG</button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="cr-filters-card">
                <div className="cr-filters-title">🔽 Filtros</div>
                <div className="cr-filters-row">
                    <div className="cr-filter-group">
                        <label>Fecha inicio</label>
                        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setFiltroRapido('Personalizar rango'); setPage(1); }} />
                    </div>
                    <div className="cr-filter-group">
                        <label>Fecha fin</label>
                        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setFiltroRapido('Personalizar rango'); setPage(1); }} />
                    </div>
                    <div className="cr-filter-group">
                        <label>Estado sesión</label>
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos los estados</option>
                            <option value="Abierto">Abierto</option>
                            <option value="Cerrado">Cerrado</option>
                        </select>
                    </div>
                    <div className="cr-filter-group">
                        <label>Empleado</label>
                        <select value={empFilter} onChange={(e) => { setEmpFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos los empleados</option>
                            {allEmployees.map((emp) => <option key={emp} value={emp}>{emp}</option>)}
                        </select>
                    </div>
                    <div className="cr-filter-group">
                        <label>Tipo movimiento</label>
                        <select value={movTypeFilter} onChange={(e) => { setMovTypeFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos</option>
                            <option value="Retiro">Retiro</option>
                            <option value="Deposito">Depósito</option>
                        </select>
                    </div>
                    <div className="cr-filter-actions">
                        <button className="cr-btn-orange" onClick={() => setPage(1)}>🔍 Aplicar Filtros</button>
                        <button className="cr-btn-outline" onClick={clearFilters}>🗑️ Limpiar</button>
                    </div>
                </div>
                <div className="cr-quick-filters">
                    {['Hoy', 'Esta semana', 'Este mes', 'Este año'].map((f) => (
                        <button key={f} className={`cr-quick-btn ${filtroRapido === f ? 'cr-quick-btn-active' : ''}`} onClick={() => handleFiltroRapido(f)}>{f}</button>
                    ))}
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="cr-stats-grid">
                <div className="cr-stat-card">
                    <div className="cr-stat-icon">🏦</div>
                    <div>
                        <div className="cr-stat-label">Aperturas de Caja</div>
                        <div className="cr-stat-value">{totalOpenings}</div>
                        <div className="cr-stat-sub">Sesiones en el periodo</div>
                    </div>
                </div>
                <div className="cr-stat-card">
                    <div className="cr-stat-icon">✅</div>
                    <div>
                        <div className="cr-stat-label">Caja Cuadrada</div>
                        <div className="cr-stat-value">{squaredSessions}<span className="cr-stat-of">/{closedSessions}</span></div>
                        <div className="cr-stat-sub">Sesiones cerradas correctas</div>
                    </div>
                </div>
                <div className="cr-stat-card">
                    <div className="cr-stat-icon">⬇️</div>
                    <div>
                        <div className="cr-stat-label">Total Retiros</div>
                        <div className="cr-stat-value cr-stat-red">C$ {money(totalWithdrawals)}</div>
                        <div className="cr-stat-sub">Periodo seleccionado</div>
                    </div>
                </div>
                <div className="cr-stat-card">
                    <div className="cr-stat-icon">⬆️</div>
                    <div>
                        <div className="cr-stat-label">Total Depósitos</div>
                        <div className="cr-stat-value cr-stat-green">C$ {money(totalDeposits)}</div>
                        <div className="cr-stat-sub">Periodo seleccionado</div>
                    </div>
                </div>
                <div className="cr-stat-card">
                    <div className="cr-stat-icon">💰</div>
                    <div>
                        <div className="cr-stat-label">Ventas en Efectivo</div>
                        <div className="cr-stat-value">C$ {money(totalCashSales)}</div>
                        <div className="cr-stat-sub">Ventas locales</div>
                    </div>
                </div>
                <div className="cr-stat-card">
                    <div className="cr-stat-icon">📊</div>
                    <div>
                        <div className="cr-stat-label">Diferencia Total</div>
                        <div className={`cr-stat-value ${totalDifference < 0 ? 'cr-stat-red' : totalDifference > 0 ? 'cr-stat-green' : ''}`}>
                            {totalDifference >= 0 ? '+' : ''}C$ {money(totalDifference)}
                        </div>
                        <div className="cr-stat-sub">{totalDifference === 0 ? 'Sin descuadre' : 'Descuadre acumulado'}</div>
                    </div>
                </div>
            </div>

            {/* ── Table card with tabs ── */}
            <div className="cr-table-card" ref={tableRef}>
                <div className="cr-table-header">
                    <div className="cr-tabs">
                        <button
                            className={`cr-tab ${activeTab === 'sessions' ? 'cr-tab-active' : ''}`}
                            onClick={() => { setActiveTab('sessions'); setPage(1); }}
                        >
                            🏦 Sesiones de Caja
                        </button>
                        <button
                            className={`cr-tab ${activeTab === 'movements' ? 'cr-tab-active' : ''}`}
                            onClick={() => { setActiveTab('movements'); setPage(1); }}
                        >
                            💸 Movimientos
                        </button>
                    </div>
                    <button className="cr-btn-outline" onClick={() => setShowGrafica(true)}>📊 Ver Gráfica</button>
                </div>

                <div className="cr-table-wrap">

                    {/* ── Sessions tab — SIN columna Retiros/Depósitos ── */}
                    {activeTab === 'sessions' && (
                        <table className="cr-table">
                            <thead>
                            <tr>
                                <th>#</th>
                                <th>Apertura</th>
                                <th>Cierre</th>
                                <th>Empleado</th>
                                <th>Monto apertura</th>
                                <th>Monto cierre</th>
                                <th>Ventas totales</th>
                                <th>Diferencia</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {paginated.length === 0 ? (
                                <tr><td colSpan={10} className="cr-no-results">No se encontraron sesiones con los filtros aplicados.</td></tr>
                            ) : paginated.map((s, i) => {
                                const diff = Number(s.difference ?? 0);
                                return (
                                    <tr key={s.cashRegisterId}>
                                        <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                        <td>{fmtDateTime(s.openTime)}</td>
                                        <td>{s.closeTime ? fmtDateTime(s.closeTime) : <span className="cr-badge cr-badge-open">En curso</span>}</td>
                                        <td>{s.employeeName ?? '—'}</td>
                                        <td>C$ {money(s.openingAmount)}</td>
                                        <td>{s.closingAmount != null ? `C$ ${money(s.closingAmount)}` : '—'}</td>
                                        <td><strong>C$ {money(s.totalSales)}</strong></td>
                                        <td>
                                            <span className={`cr-diff ${diff < 0 ? 'cr-diff-red' : diff > 0 ? 'cr-diff-green' : 'cr-diff-ok'}`}>
                                                {s.status !== 'Cerrado' ? '—' : `${diff >= 0 ? '+' : ''}C$ ${money(diff)}`}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`cr-badge ${s.status === 'Cerrado' ? 'cr-badge-ok' : 'cr-badge-open'}`}>
                                                {s.status === 'Cerrado' ? 'Cerrado' : 'Abierto'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="cr-btn-ver" onClick={() => setModalItem(s)}>👁️ Ver</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    )}

                    {/* ── Movements tab — CON botón Ver sesión ── */}
                    {activeTab === 'movements' && (
                        <table className="cr-table">
                            <thead>
                            <tr>
                                <th>#</th>
                                <th>Fecha y hora</th>
                                <th>Tipo</th>
                                <th>Motivo</th>
                                <th>Empleado</th>
                                <th>Monto (C$)</th>
                                <th>Observación</th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {paginated.length === 0 ? (
                                <tr><td colSpan={8} className="cr-no-results">No se encontraron movimientos con los filtros aplicados.</td></tr>
                            ) : paginated.map((m, i) => (
                                <tr key={m.movementId ?? i}>
                                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                    <td>{fmtDateTime(m.createdAt)}</td>
                                    <td>
                                        <span className={`cr-badge ${m.movementType === 'Retiro' ? 'cr-badge-cancel' : 'cr-badge-deposit'}`}>
                                            {m.movementType}
                                        </span>
                                    </td>
                                    <td>{m.reason ?? '—'}</td>
                                    {/* FIX: nombre real del empleado */}
                                    <td>{m.employeeName ?? '—'}</td>
                                    <td>
                                        <strong className={m.movementType === 'Retiro' ? 'cr-amount-red' : 'cr-amount-green'}>
                                            {m.movementType === 'Retiro' ? '-' : '+'}C$ {money(m.amount)}
                                        </strong>
                                    </td>
                                    <td className="cr-td-note">{m.note ?? '—'}</td>
                                    {/* FIX: botón Ver que abre la sesión padre */}
                                    <td>
                                        <button
                                            className="cr-btn-ver"
                                            onClick={() => setModalItem(m._parentSession)}
                                        >
                                            👁️ Ver sesión
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                <div className="cr-pagination">
                    <span className="cr-pag-info">
                        Mostrando {activeData.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, activeData.length)} de {activeData.length} {activeTab === 'sessions' ? 'sesiones' : 'movimientos'}
                    </span>
                    <div className="cr-pag-btns">
                        <button className="cr-pag-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                            <button key={n} className={`cr-pag-btn ${n === page ? 'cr-pag-active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                        ))}
                        <button className="cr-pag-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
                    </div>
                </div>
            </div>

            <div className="cr-note">
                <span>ℹ️</span>
                <p>Los datos mostrados corresponden al periodo seleccionado en los filtros. Puedes exportar la información en Excel o PNG.</p>
            </div>

        </div>
    );
}