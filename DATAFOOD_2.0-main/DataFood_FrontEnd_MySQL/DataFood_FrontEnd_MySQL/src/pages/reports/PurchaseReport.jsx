import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getPurchases,
    getSupplyCategories,
} from '../../api/Supplyapi.js';
import { getSuppliers } from '../../api/supplierApi.js';
import PurchaseGraph from './PurchaseGraph.jsx';
import './PurchaseReport.css';

/* ─── Helpers ─── */
const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('es-NI', { dateStyle: 'short' }) : '—';

const money = (n) =>
    Number(n ?? 0).toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

/* Calcula rango de fechas para filtros rápidos */
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

/* ─── Modal detalle factura ─── */
function FacturaModal({ purchase, onClose }) {
    if (!purchase) return null;

    // ✅ FIX 1: Usa el taxRate real de la compra, con fallback a 18
    const taxRate = Number(purchase.taxRate ?? 18);

    // ✅ FIX 2: Detecta si hay múltiples proveedores en los detalles
    const isMultiSupplier = purchase.details?.some(d => d.supplierName);
    const proveedoresUnicos = isMultiSupplier
        ? [...new Set(purchase.details.map(d => d.supplierName).filter(Boolean))]
        : null;

    return (
        <div className="rc-modal-overlay" onClick={onClose}>
            <div className="rc-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rc-modal-header">
                    <h3 className="rc-modal-title">
                        Detalle · <span className="rc-modal-fac">{purchase.invoiceNumber || '—'}</span>
                    </h3>
                    <button className="rc-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="rc-modal-grid">
                    <div className="rc-modal-row"><span>N° Compra</span><strong>{purchase.purchaseNumber}</strong></div>
                    <div className="rc-modal-row"><span>Fecha</span><strong>{fmt(purchase.purchaseDate)}</strong></div>

                    {/* ✅ FIX 2: Muestra todos los proveedores si hay múltiples */}
                    <div className="rc-modal-row">
                        <span>Proveedor</span>
                        <strong>
                            {isMultiSupplier ? (
                                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                    {proveedoresUnicos.map((nombre, i) => (
                                        <span key={i} style={{ color: '#f97316' }}>• {nombre}</span>
                                    ))}
                                </span>
                            ) : (
                                purchase.supplierName ?? '—'
                            )}
                        </strong>
                    </div>

                    <div className="rc-modal-row"><span>Método de Pago</span><strong>{purchase.paymentMethod ?? '—'}</strong></div>
                    <div className="rc-modal-row"><span>Estado</span>
                        <strong>
                            <span className={`rc-badge ${purchase.status === 'Recibido' ? 'rc-badge-ok' : 'rc-badge-cancel'}`}>
                                {purchase.status}
                            </span>
                        </strong>
                    </div>
                    {purchase.notes && (
                        <div className="rc-modal-row"><span>Notas</span><strong>{purchase.notes}</strong></div>
                    )}
                </div>

                {purchase.details?.length > 0 && (
                    <>
                        <div className="rc-modal-section-title">Productos comprados</div>
                        <table className="rc-modal-table">
                            <thead>
                            <tr>
                                {/* ✅ FIX 2: Columna Proveedor solo si es compra multi-proveedor */}
                                {isMultiSupplier && <th>Proveedor</th>}
                                <th>Insumo</th>
                                <th>Categoría</th>
                                <th>Cantidad</th>
                                <th>P. Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                            </thead>
                            <tbody>
                            {purchase.details.map((d, i) => (
                                <tr key={d.detailId ?? i}>
                                    {isMultiSupplier && (
                                        <td style={{ color: '#f97316', fontWeight: 600, fontSize: '0.82rem' }}>
                                            {d.supplierName || '—'}
                                        </td>
                                    )}
                                    <td>{d.supplyName}</td>
                                    <td>{d.supplyCategory}</td>
                                    <td>{d.quantity} {d.unitOfMeasure}</td>
                                    <td>C$ {money(d.unitPrice)}</td>
                                    <td>C$ {money(d.subtotal)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </>
                )}

                <div className="rc-modal-totals">
                    <div className="rc-total-row"><span>Subtotal</span><span>C$ {money(purchase.subtotal)}</span></div>
                    {/* ✅ FIX 1: Muestra el IVA real de la compra */}
                    <div className="rc-total-row"><span>IVA ({taxRate}%)</span><span>C$ {money(purchase.tax)}</span></div>
                    <div className="rc-total-row rc-total-final"><span>TOTAL</span><span>C$ {money(purchase.total)}</span></div>
                </div>
            </div>
        </div>
    );
}

/* ─── Componente principal ─── */
export default function PurchaseReport() {
    const navigate = useNavigate();
    const tableRef = useRef(null);

    /* Datos */
    const [purchases,   setPurchases]   = useState([]);
    const [suppliers,   setSuppliers]   = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);

    /* Filtros */
    const { startDate: initStart, endDate: initEnd } = getRangeForFilter('Este mes');
    const [filtroRapido, setFiltroRapido] = useState('Este mes');
    const [startDate,    setStartDate]    = useState(initStart);
    const [endDate,      setEndDate]      = useState(initEnd);
    const [provFilter,   setProvFilter]   = useState('');
    const [insumoFilter, setInsumoFilter] = useState('');

    /* UI */
    const [page,         setPage]         = useState(1);
    const [modalItem,    setModalItem]     = useState(null);
    const [showGrafica,  setShowGrafica]   = useState(false);
    const [showExport,   setShowExport]    = useState(false);
    const exportRef = useRef(null);

    const PAGE_SIZE = 7;

    /* ── Carga inicial ── */
    useEffect(() => {
        (async () => {
            try {
                const [pRes, sRes] = await Promise.all([getPurchases(), getSuppliers()]);
                setPurchases(pRes.data);
                setSuppliers(sRes.data);
            } catch (e) {
                console.error(e);
                setError('No se pudieron cargar los datos. Verifica la conexión con el servidor.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /* Cierra dropdown de exportar al hacer clic afuera */
    useEffect(() => {
        const handler = (e) => {
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setShowExport(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ── Filtro rápido ── */
    const handleFiltroRapido = (f) => {
        setFiltroRapido(f);
        if (f !== 'Personalizar rango') {
            const { startDate: s, endDate: e } = getRangeForFilter(f);
            setStartDate(s);
            setEndDate(e);
        }
        setPage(1);
    };

    /* ── Filtrado ── */
    const allInsumos = [...new Set(
        purchases.flatMap((p) => p.details?.map((d) => d.supplyName) ?? [])
    )].sort();

    const filtered = purchases.filter((p) => {
        const pDate = new Date(p.purchaseDate);
        const matchStart = startDate ? pDate >= new Date(startDate) : true;
        const matchEnd   = endDate   ? pDate <= new Date(endDate + 'T23:59:59') : true;
        const matchProv  = provFilter
            ? String(p.supplierId) === provFilter
            : true;
        const matchInsumo = insumoFilter
            ? p.details?.some((d) => d.supplyName === insumoFilter)
            : true;
        return matchStart && matchEnd && matchProv && matchInsumo;
    });

    /* ── Stats ── */
    const totalCompras   = filtered.reduce((s, p) => s + Number(p.total ?? 0), 0);
    const numCompras     = filtered.length;
    const insumosTipos   = new Set(
        filtered.flatMap((p) => p.details?.map((d) => d.supplyName) ?? [])
    ).size;

    const prevTotal = purchases
        .filter((p) => !filtered.includes(p))
        .reduce((s, p) => s + Number(p.total ?? 0), 0);
    const variacion = prevTotal > 0
        ? (((totalCompras - prevTotal) / prevTotal) * 100).toFixed(1)
        : null;

    /* ── Paginación ── */
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    /* ── Limpiar filtros ── */
    const clearFilters = () => {
        setFiltroRapido('Este mes');
        const { startDate: s, endDate: e } = getRangeForFilter('Este mes');
        setStartDate(s);
        setEndDate(e);
        setProvFilter('');
        setInsumoFilter('');
        setPage(1);
    };

    /* ── Exportar Excel ── */

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
        wb.creator = 'Sistema de Compras';
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

        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-NI', { dateStyle: 'short' }) : '—';
        const totalComprasVal = filtered.reduce((s, p) => s + Number(p.total ?? 0), 0);

        const periodoStr = startDate && endDate
            ? `${fmtDate(startDate)} – ${fmtDate(endDate)}`
            : startDate
                ? `Desde ${fmtDate(startDate)}`
                : endDate
                    ? `Hasta ${fmtDate(endDate)}`
                    : filtroRapido || 'Todo el período';

        const generadoStr = new Date().toLocaleDateString('es-NI', { dateStyle: 'short' });

        // ════════════════════════════════════════════════
        // HOJA 1 — RESUMEN
        // ════════════════════════════════════════════════
        const ws1 = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] });

        ws1.columns = [
            { width: 3  },  // A spacer
            { width: 18 },  // B
            { width: 18 },  // C
            { width: 18 },  // D
            { width: 18 },  // E
            { width: 28 },  // F  ← Factura / Ref.
            { width: 18 },  // G
            { width: 18 },  // H
            { width: 18 },  // I  Total (C$)
        ];

        ws1.getRow(1).height = 8;

        ws1.mergeCells('B2:I3');
        ws1.getRow(2).height = 30;
        ws1.getRow(3).height = 22;
        applyS(ws1.getCell('B2'), hSt(C.tealDark, C.white, 20, true));
        ws1.getCell('B2').value = 'REPORTE DE COMPRAS';

        ws1.mergeCells('B4:I4');
        ws1.getRow(4).height = 16;
        applyS(ws1.getCell('B4'), hSt(C.grayHdr, C.white, 10, false));
        ws1.getCell('B4').value = `Comedor Raquel   |   Periodo: ${periodoStr}   |   Generado: ${generadoStr}`;

        ws1.getRow(5).height = 10;

        ws1.mergeCells('B6:I6');
        ws1.getRow(6).height = 20;
        applyS(ws1.getCell('B6'), hSt(C.tealMed, C.white, 11, true));
        ws1.getCell('B6').value = '📊  RESUMEN EJECUTIVO';

        const varNum = variacion !== null ? Number(variacion) : null;
        const kpis = [
            { col: 2, label: 'TOTAL COMPRAS (C$)',
                value: `C$ ${totalComprasVal.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: periodoStr },
            { col: 4, label: 'N° DE COMPRAS',    value: String(numCompras),    sub: periodoStr },
            { col: 6, label: 'TIPOS DE INSUMOS', value: String(insumosTipos),  sub: 'Tipos diferentes' },
            { col: 8, label: 'VARIACIÓN',
                value: varNum !== null ? `${varNum >= 0 ? '+' : ''}${variacion}%` : '—',
                sub: varNum !== null ? (varNum >= 0 ? 'Aumento ▲' : 'Reducción ▼') : 'Sin comparativa' },
        ];
        // ESTO (el fix)
        ws1.getRow(7).height = 14;
        ws1.getRow(8).height = 26;
        ws1.getRow(9).height = 14;

        const kpiRanges = [
            { startCol: 2, endCol: 3 },  // B-C
            { startCol: 4, endCol: 5 },  // D-E
            { startCol: 6, endCol: 7 },  // F-G
            { startCol: 8, endCol: 9 },  // H-I
        ];

        kpis.forEach(({ label, value, sub }, idx) => {
            const { startCol, endCol } = kpiRanges[idx];
            const colLetter = (n) => String.fromCharCode(64 + n);
            const startL = colLetter(startCol);
            const endL   = colLetter(endCol);

            ws1.mergeCells(`${startL}7:${endL}7`);
            ws1.mergeCells(`${startL}8:${endL}8`);
            ws1.mergeCells(`${startL}9:${endL}9`);

            const r7 = ws1.getCell(`${startL}7`); r7.value = label; applyS(r7, hSt('2E4053', C.white, 9, true));
            const r8 = ws1.getCell(`${startL}8`); r8.value = value; applyS(r8, hSt(C.tealDark, C.white, 13, true));
            const r9 = ws1.getCell(`${startL}9`); r9.value = sub;   applyS(r9, hSt(C.gray2, C.white, 8, false));
        });

        ws1.getRow(10).height = 12;

        ws1.mergeCells('B11:I11');
        ws1.getRow(11).height = 20;
        applyS(ws1.getCell('B11'), hSt(C.tealDark, C.white, 11, true));
        ws1.getCell('B11').value = '≡  DETALLE DE COMPRAS';

        ws1.getRow(12).height = 20;
        const th1 = ['N°', 'Fecha', 'N° Compra', 'Proveedor(es)', 'Factura / Ref.', 'Pago', 'Estado', 'Total (C$)'];
        const tc1  = [2, 3, 4, 5, 6, 7, 8, 9];
        th1.forEach((h, i) => {
            const c = ws1.getCell(12, tc1[i]);
            c.value = h;
            applyS(c, hSt(C.grayHdr, C.white, 10, true));
        });

        // FIX: filas de datos con proveedor(es) completo y factura sin recorte
        filtered.forEach((p, i) => {
            const row = 13 + i;
            ws1.getRow(row).height = 18;
            const bg = i % 2 === 0 ? C.white : C.tealLight;

            // FIX: si es multi-proveedor, lista todos los nombres separados por " / "
            const isMulti = p.details?.some(d => d.supplierName);
            const proveedoresStr = isMulti
                ? [...new Set(p.details.map(d => d.supplierName).filter(Boolean))].join(' / ')
                : (p.supplierName ?? '—');

            const vals = [
                i + 1,
                fmtDate(p.purchaseDate),
                p.purchaseNumber,
                proveedoresStr,
                p.invoiceNumber ?? '—',
                p.paymentMethod ?? '—',
                p.status ?? '—',
                Number(p.total ?? 0),
            ];

            vals.forEach((v, j) => {
                const cell  = ws1.getCell(row, tc1[j]);
                cell.value  = v;
                const isM   = j === 7;
                const align = isM ? 'right' : (j <= 1 ? 'center' : 'left');
                applyS(cell, dSt(bg, isM, align, isM ? C.tealDark : C.dark));
                if (isM) mFmt(cell);
            });
        });

        // FIX: fila total hoja 1 — merge correcto B→H, valor en I
        const totalRow1 = 13 + filtered.length;
        ws1.getRow(totalRow1).height = 22;
        ws1.mergeCells(`B${totalRow1}:H${totalRow1}`);
        const orangeSt1 = {
            font:      { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
            fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.orange) } },
            alignment: { horizontal: 'right', vertical: 'middle' },
            border,
        };
        applyS(ws1.getCell(`B${totalRow1}`), orangeSt1);
        ws1.getCell(`B${totalRow1}`).value = 'TOTAL GENERAL';
        const tv1 = ws1.getCell(`I${totalRow1}`);
        tv1.value = totalComprasVal;
        applyS(tv1, orangeSt1);
        mFmt(tv1);

        // ════════════════════════════════════════════════
        // HOJA 2 — DETALLE POR INSUMO
        // ════════════════════════════════════════════════
        const ws2 = wb.addWorksheet('Detalle por Insumo', { views: [{ showGridLines: false }] });
        ws2.columns = [
            { width: 3  },  // A spacer
            { width: 12 },  // B  Fecha
            { width: 16 },  // C  N° Compra
            { width: 26 },  // D  Insumo
            { width: 20 },  // E  Categoría
            { width: 24 },  // F  Proveedor
            { width: 10 },  // G  Cantidad
            { width: 10 },  // H  Unidad
            { width: 18 },  // I  P. Unitario
            { width: 16 },  // J  Subtotal
            { width: 16 },  // K  IVA
            { width: 16 },  // L  Total
        ];

        ws2.getRow(1).height = 8;
        ws2.mergeCells('B2:L3');
        ws2.getRow(2).height = 28;
        ws2.getRow(3).height = 22;
        applyS(ws2.getCell('B2'), hSt(C.tealDark, C.white, 16, true));
        ws2.getCell('B2').value = '📦  DETALLE POR INSUMO';

        ws2.mergeCells('B4:L4');
        ws2.getRow(4).height = 16;
        applyS(ws2.getCell('B4'), hSt(C.grayHdr, C.white, 10, false));
        ws2.getCell('B4').value = `Comedor Raquel   |   Periodo: ${periodoStr}   |   Generado: ${generadoStr}`;

        ws2.getRow(5).height = 8;

        const taxRateDisplay = filtered[0]?.taxRate ?? 15;
        const th2 = [
            'Fecha', 'N° Compra', 'Insumo', 'Categoría', 'Proveedor',
            'Cantidad', 'Unidad', 'P. Unitario (C$)', 'Subtotal (C$)',
            'IVA % / Monto (C$)', 'Total (C$)',
        ];
        const tc2 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        ws2.getRow(6).height = 22;
        th2.forEach((h, i) => {
            const c = ws2.getCell(6, tc2[i]);
            c.value = h;
            applyS(c, hSt(C.grayHdr, C.white, 10, true));
        });

// Ahora: agrupa todos los details de una compra en UNA sola fila

        // ── REEMPLAZA todo el bloque: let ri2 = 0; filtered.forEach(p => { ... }); ──

        let ri2 = 0;
        filtered.forEach(p => {
            const details = p.details ?? [];
            if (details.length === 0) return;

            const taxRate    = Number(p.taxRate ?? 0);
            // Usa el subtotal real del header para la proporción
            const headerSub  = Number(p.subtotal ?? 0);
            const headerTax  = Number(p.tax ?? 0);
            const headerTotal = Number(p.total ?? 0);

            details.forEach(d => {
                const row = 7 + ri2;
                ws2.getRow(row).height = 17;
                const bg = ri2 % 2 === 0 ? C.white : C.tealLight;

                const detailSub = Number(d.subtotal ?? 0);

                // Distribuir IVA y Total proporcionalmente al peso del detalle en el subtotal
                const proporcion  = headerSub > 0 ? detailSub / headerSub : 0;
                const detailIva   = headerTax  * proporcion;
                const detailTotal = headerTotal * proporcion;

                // Fecha — col B (2)
                ws2.getCell(row, 2).value = fmtDate(p.purchaseDate);
                applyS(ws2.getCell(row, 2), dSt(bg, false, 'center'));

                // N° Compra — col C (3)
                ws2.getCell(row, 3).value = p.purchaseNumber;
                applyS(ws2.getCell(row, 3), dSt(bg, false, 'left'));

                // Insumo — col D (4)
                ws2.getCell(row, 4).value = d.supplyName ?? '—';
                applyS(ws2.getCell(row, 4), dSt(bg, false, 'left'));

                // Categoría — col E (5)
                ws2.getCell(row, 5).value = d.supplyCategory ?? '—';
                applyS(ws2.getCell(row, 5), dSt(bg, false, 'left'));

                // Proveedor — col F (6)
                ws2.getCell(row, 6).value = d.supplierName || p.supplierName || '—';
                applyS(ws2.getCell(row, 6), dSt(bg, false, 'left'));

                // Cantidad — col G (7)
                ws2.getCell(row, 7).value = Number(d.quantity ?? 0);
                applyS(ws2.getCell(row, 7), dSt(bg, false, 'center'));

                // Unidad — col H (8)
                ws2.getCell(row, 8).value = d.unitOfMeasure ?? '—';
                applyS(ws2.getCell(row, 8), dSt(bg, false, 'center'));

                // P. Unitario — col I (9)
                const cUP = ws2.getCell(row, 9);
                cUP.value = Number(d.unitPrice ?? 0);
                applyS(cUP, dSt(bg, false, 'right'));
                mFmt(cUP);

                // Subtotal — col J (10)
                const cSub = ws2.getCell(row, 10);
                cSub.value = detailSub;
                applyS(cSub, dSt(bg, false, 'right'));
                mFmt(cSub);

                // IVA — col K (11): valor proporcional con % visible en formato
                const cIva = ws2.getCell(row, 11);
                cIva.value = detailIva;
                cIva.numFmt = taxRate > 0
                    ? `"${taxRate}% · " #,##0.00`
                    : '"Exento · " #,##0.00';
                applyS(cIva, dSt(bg, false, 'right', taxRate === 0 ? C.gray2 : C.dark));

                // Total — col L (12)
                const cTot = ws2.getCell(row, 12);
                cTot.value = detailTotal;
                applyS(cTot, dSt(bg, true, 'right', C.tealDark));
                mFmt(cTot);

                ri2++;
            });
        });

// ── Fila TOTALES — usa directamente los totales del header ──
        const totalRow2 = 7 + ri2;
        ws2.getRow(totalRow2).height = 22;
        ws2.mergeCells(`B${totalRow2}:I${totalRow2}`);
        const orangeSt2 = {
            font:      { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
            fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.orange) } },
            alignment: { horizontal: 'right', vertical: 'middle' },
            border,
        };
        applyS(ws2.getCell(`B${totalRow2}`), orangeSt2);
        ws2.getCell(`B${totalRow2}`).value = 'TOTALES';

// Sumar directamente de los headers filtrados — misma fuente que Hoja 1
        const tSub2   = filtered.reduce((s, p) => s + Number(p.subtotal ?? 0), 0);
        const tIva2   = filtered.reduce((s, p) => s + Number(p.tax     ?? 0), 0);
        const tTotal2 = filtered.reduce((s, p) => s + Number(p.total   ?? 0), 0);

        [[tSub2, 10], [tIva2, 11], [tTotal2, 12]].forEach(([v, col]) => {
            const cell = ws2.getCell(totalRow2, col);
            cell.value = v;
            applyS(cell, orangeSt2);
            mFmt(cell);
        });

        // ════════════════════════════════════════════════
        // HOJA 3 — POR PROVEEDOR
        // ════════════════════════════════════════════════
        const ws3 = wb.addWorksheet('Por Proveedor', { views: [{ showGridLines: false }] });

        // FIX: 6 columnas reales (A spacer + B..F datos) → merge y datos deben usar B..F
        ws3.columns = [
            { width: 3  },  // A spacer
            { width: 32 },  // B  Proveedor
            { width: 14 },  // C  N° Compras
            { width: 18 },  // D  Subtotal
            { width: 16 },  // E  IVA
            { width: 18 },  // F  Total
        ];

        ws3.getRow(1).height = 8;
        ws3.mergeCells('B2:F3');
        ws3.getRow(2).height = 28;
        ws3.getRow(3).height = 22;
        applyS(ws3.getCell('B2'), hSt(C.tealDark, C.white, 16, true));
        ws3.getCell('B2').value = '🏢  RESUMEN POR PROVEEDOR';

        ws3.mergeCells('B4:F4');
        ws3.getRow(4).height = 16;
        applyS(ws3.getCell('B4'), hSt(C.grayHdr, C.white, 10, false));
        ws3.getCell('B4').value = `Comedor Raquel  |   Periodo: ${periodoStr}   |   Generado: ${generadoStr}`;

        ws3.getRow(5).height = 8;
        ws3.getRow(6).height = 20;

        // FIX: encabezados columnas B..F (índices 2..6)
        ['Proveedor', 'N° Compras', 'Subtotal (C$)', 'IVA (C$)', 'Total (C$)'].forEach((h, i) => {
            const c = ws3.getCell(6, i + 2);
            c.value = h;
            applyS(c, hSt(C.grayHdr, C.white, 10, true));
        });



        const sm3 = {};
        filtered.forEach(p => {
            const headerSub   = Number(p.subtotal ?? 0);
            const headerTax   = Number(p.tax      ?? 0);
            const headerTotal = Number(p.total    ?? 0);

            (p.details ?? []).forEach(d => {
                const pv = d.supplierName || p.supplierName || '—';
                if (!sm3[pv]) sm3[pv] = { sub: 0, iva: 0, tot: 0, n: 0 };

                const detailSub  = Number(d.subtotal ?? 0);
                // Distribuir IVA y Total proporcional al peso del detalle — igual que ws2
                const proporcion = headerSub > 0 ? detailSub / headerSub : 0;

                sm3[pv].sub += detailSub;
                sm3[pv].iva += headerTax   * proporcion;
                sm3[pv].tot += headerTotal * proporcion;
                sm3[pv].n++;
            });
        });
        Object.entries(sm3).sort().forEach(([pv, v], i) => {
            const row = 7 + i;
            ws3.getRow(row).height = 17;
            const bg = i % 2 === 0 ? C.white : C.tealLight;

            [pv, v.n, v.sub, v.iva, v.tot].forEach((val, j) => {
                const cell   = ws3.getCell(row, j + 2);
                cell.value   = val;
                const isM    = j >= 2;
                const isLast = j === 4;
                applyS(cell, dSt(bg, isLast, isM ? 'right' : 'left', isLast ? C.tealDark : C.dark));
                if (isM) mFmt(cell);
            });
        });

        // FIX: fila total hoja 3 — estilo naranja en TODAS las columnas B..F
        const totalRow3 = 7 + Object.keys(sm3).length;
        ws3.getRow(totalRow3).height = 22;
        const orangeSt3 = {
            font:      { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
            fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.orange) } },
            alignment: { horizontal: 'right', vertical: 'middle' },
            border,
        };

        // FIX: aplicar naranja a CADA celda B..F individualmente (sin merge)
        const gSub3 = filtered.reduce((s, p) => s + Number(p.subtotal ?? 0), 0);
        const gIva3 = filtered.reduce((s, p) => s + Number(p.tax      ?? 0), 0);
        const gTot3 = filtered.reduce((s, p) => s + Number(p.total    ?? 0), 0);

        // Celda B — etiqueta "TOTAL GENERAL"
        const labelCell3 = ws3.getCell(`B${totalRow3}`);
        labelCell3.value = 'TOTAL GENERAL';
        applyS(labelCell3, { ...orangeSt3, alignment: { horizontal: 'left', vertical: 'middle' } });

        // Celda C — N° compras total
        const nCell3 = ws3.getCell(`C${totalRow3}`);
        nCell3.value = Object.values(sm3).reduce((a, v) => a + v.n, 0);
        applyS(nCell3, orangeSt3);

        // Celdas D, E, F — subtotal, IVA, total
        [[gSub3, 'D'], [gIva3, 'E'], [gTot3, 'F']].forEach(([val, col]) => {
            const cell = ws3.getCell(`${col}${totalRow3}`);
            cell.value = val;
            applyS(cell, orangeSt3);
            mFmt(cell);
        });

        // ── Descargar ──
        const buf  = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        const cleanPeriodo = periodoStr
            .replace(/\//g, '-')   // barras → guiones
            .replace(/\s/g, '_')   // espacios → guión bajo
            .replace(/–/g, 'al');  // guión largo → "al"
        a.download = `Reporte_Compras_${cleanPeriodo}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ── Exportar tabla PNG ── */
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

        // ── Construye un div temporal con el mismo estilo del Excel ──
        const periodoStr = startDate && endDate
            ? `${new Date(startDate).toLocaleDateString('es-NI', {dateStyle:'short'})} – ${new Date(endDate).toLocaleDateString('es-NI', {dateStyle:'short'})}`
            : filtroRapido || 'Todo el período';

        const totalComprasVal = filtered.reduce((s, p) => s + Number(p.total ?? 0), 0);
        const money2 = (n) => Number(n ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const varNum = variacion !== null ? Number(variacion) : null;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
        position: fixed; top: -9999px; left: -9999px;
        width: 1100px; background: white;
        font-family: Arial, sans-serif; font-size: 13px;
        padding: 0; z-index: -1;
    `;

        wrapper.innerHTML = `
        <div style="background:#1A5276; color:white; text-align:center; padding:18px 0; font-size:22px; font-weight:bold; letter-spacing:1px;">
            REPORTE DE COMPRAS
        </div>
        <div style="background:#2E4053; color:white; text-align:center; padding:7px 0; font-size:11px;">
            Comedor Raquel &nbsp;|&nbsp; Periodo: ${periodoStr} &nbsp;|&nbsp; Generado: ${new Date().toLocaleDateString('es-NI', {dateStyle:'short'})}
        </div>

        <!-- KPIs -->
        <div style="background:#1ABC9C; color:white; text-align:center; padding:8px 0; font-size:13px; font-weight:bold; margin-top:10px;">
            📊 &nbsp; RESUMEN EJECUTIVO
        </div>
        <div style="display:flex; border:1px solid #ccc;">
            ${[
            { label: 'TOTAL COMPRAS (C$)', value: `C$ ${money2(totalComprasVal)}`, sub: periodoStr },
            { label: 'N° DE COMPRAS',      value: String(numCompras),              sub: periodoStr },
            { label: 'TIPOS DE INSUMOS',   value: String(insumosTipos),            sub: 'Tipos diferentes' },
            { label: 'VARIACIÓN',
                value: varNum !== null ? `${varNum >= 0 ? '+' : ''}${variacion}%` : '—',
                sub: varNum !== null ? (varNum >= 0 ? 'Aumento ▲' : 'Reducción ▼') : 'Sin comparativa' },
        ].map(k => `
                <div style="flex:1; border-right:1px solid #ccc;">
                    <div style="background:#2E4053; color:white; text-align:center; padding:5px; font-size:10px; font-weight:bold;">${k.label}</div>
                    <div style="background:#1A5276; color:white; text-align:center; padding:8px; font-size:16px; font-weight:bold;">${k.value}</div>
                    <div style="background:#566573; color:white; text-align:center; padding:4px; font-size:10px;">${k.sub}</div>
                </div>
            `).join('')}
        </div>

        <!-- Tabla detalle -->
        <div style="background:#1A5276; color:white; text-align:center; padding:8px 0; font-size:13px; font-weight:bold; margin-top:10px;">
            ≡ &nbsp; DETALLE DE COMPRAS
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
                <tr style="background:#2E4053; color:white;">
                    ${['N°','Fecha','N° Compra','Proveedor(es)','Factura / Ref.','Pago','Estado','Total (C$)']
            .map(h => `<th style="padding:8px 6px; border:1px solid #BDC3C7; text-align:center;">${h}</th>`)
            .join('')}
                </tr>
            </thead>
            <tbody>
                ${filtered.map((p, i) => {
            const isMulti = p.details?.some(d => d.supplierName);
            const prov = isMulti
                ? [...new Set(p.details.map(d => d.supplierName).filter(Boolean))].join(' / ')
                : (p.supplierName ?? '—');
            const bg = i % 2 === 0 ? '#FFFFFF' : '#D5F5E3';
            return `<tr style="background:${bg};">
                        <td style="padding:6px; border:1px solid #BDC3C7; text-align:center;">${i+1}</td>
                        <td style="padding:6px; border:1px solid #BDC3C7; text-align:center;">${new Date(p.purchaseDate).toLocaleDateString('es-NI',{dateStyle:'short'})}</td>
                        <td style="padding:6px; border:1px solid #BDC3C7;">${p.purchaseNumber}</td>
                        <td style="padding:6px; border:1px solid #BDC3C7;">${prov}</td>
                        <td style="padding:6px; border:1px solid #BDC3C7;">${p.invoiceNumber ?? '—'}</td>
                        <td style="padding:6px; border:1px solid #BDC3C7;">${p.paymentMethod ?? '—'}</td>
                        <td style="padding:6px; border:1px solid #BDC3C7;">${p.status ?? '—'}</td>
                        <td style="padding:6px; border:1px solid #BDC3C7; text-align:right; font-weight:bold; color:#1A5276;">C$ ${money2(p.total)}</td>
                    </tr>`;
        }).join('')}
                <!-- Fila total -->
                <tr>
                    <td colspan="7" style="padding:8px; background:#E67E22; color:white; font-weight:bold; text-align:right; border:1px solid #BDC3C7;">
                        TOTAL GENERAL
                    </td>
                    <td style="padding:8px; background:#E67E22; color:white; font-weight:bold; text-align:right; border:1px solid #BDC3C7;">
                        C$ ${money2(totalComprasVal)}
                    </td>
                </tr>
            </tbody>
        </table>
    `;

        document.body.appendChild(wrapper);
        await new Promise(r => setTimeout(r, 200));

        const canvas = await window.html2canvas(wrapper, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 1100,
        });

        document.body.removeChild(wrapper);

        const a = document.createElement('a');
        a.download = `Reporte_Compras_${new Date().toLocaleDateString('es-NI',{dateStyle:'short'}).replace(/\//g,'-')}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
    };

    /* ── Vista gráfica ── */
    if (showGrafica) {
        return (
            <PurchaseGraph
                purchases={filtered}
                suppliers={suppliers}
                onBack={() => setShowGrafica(false)}
            />
        );
    }

    /* ── Loading / Error ── */
    if (loading) {
        return (
            <div className="rc-page">
                <div className="rc-loading">
                    <div className="rc-spinner" />
                    <p>Cargando reportes...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rc-page">
                <div className="rc-error-box">
                    <span className="rc-error-icon">⚠️</span>
                    <p>{error}</p>
                    <button className="rc-btn-orange" onClick={() => window.location.reload()}>
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="rc-page">

            {/* ── Modal detalle ── */}
            {modalItem && (
                <FacturaModal
                    purchase={modalItem}
                    onClose={() => setModalItem(null)}
                />
            )}

            {/* ── Topbar ── */}
            <div className="rc-topbar">
                <div className="rc-topbar-left">
                    <button className="rc-btn-outline" onClick={() => navigate('/reports')}>
                        ← Volver a Reportes
                    </button>
                    <div className="rc-title-block">
                        <h2 className="rc-title">📦 Reporte de Compras</h2>
                        <p className="rc-subtitle">Consulta y analiza el comportamiento de las compras realizadas.</p>
                    </div>
                </div>

                {/* Exportar dropdown */}
                <div className="rc-export-wrap" ref={exportRef}>
                    <button
                        className="rc-btn-outline rc-btn-export"
                        onClick={() => setShowExport((v) => !v)}
                    >
                        ⬆️ Exportar ▾
                    </button>
                    {showExport && (
                        <div className="rc-export-dropdown">
                            <button className="rc-export-item" onClick={exportExcel}>
                                📊 Exportar CSV / Excel
                            </button>
                            <button className="rc-export-item" onClick={exportTablePNG}>
                                🖼️ Exportar Tabla PNG
                            </button>
                        </div>
                    )}
                </div>
            </div>




            {/* ── Filtros ── */}
            <div className="rc-filters-card">
                <div className="rc-filters-title">🔽 Filtros</div>
                <div className="rc-filters-row">
                    <div className="rc-filter-group">
                        <label>Fecha inicio</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setFiltroRapido('Personalizar rango'); setPage(1); }}
                        />
                    </div>
                    <div className="rc-filter-group">
                        <label>Fecha fin</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setFiltroRapido('Personalizar rango'); setPage(1); }}
                        />
                    </div>
                    <div className="rc-filter-group">
                        <label>Proveedor</label>
                        <select value={provFilter} onChange={(e) => { setProvFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos los proveedores</option>
                            {suppliers.map((s) => (
                                <option key={s.supplierId} value={s.supplierId}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="rc-filter-group">
                        <label>Insumo</label>
                        <select value={insumoFilter} onChange={(e) => { setInsumoFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos los insumos</option>
                            {allInsumos.map((ins) => (
                                <option key={ins} value={ins}>{ins}</option>
                            ))}
                        </select>
                    </div>
                    <div className="rc-filter-actions">
                        <button className="rc-btn-orange" onClick={() => setPage(1)}>
                            🔍 Aplicar Filtros
                        </button>
                        <button className="rc-btn-outline" onClick={clearFilters}>
                            🗑️ Limpiar
                        </button>
                    </div>
                </div>

                {/* Filtros rápidos */}
                <div className="rc-quick-filters">
                    {['Hoy', 'Esta semana', 'Este mes', 'Este año'].map((f) => (
                        <button
                            key={f}
                            className={`rc-quick-btn ${filtroRapido === f ? 'rc-quick-btn-active' : ''}`}
                            onClick={() => handleFiltroRapido(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="rc-stats-grid">
                <div className="rc-stat-card">
                    <div className="rc-stat-icon">💰</div>
                    <div>
                        <div className="rc-stat-label">Total Compras</div>
                        <div className="rc-stat-value">C$ {money(totalCompras)}</div>
                        <div className="rc-stat-sub">Periodo seleccionado</div>
                    </div>
                </div>
                <div className="rc-stat-card">
                    <div className="rc-stat-icon">🛒</div>
                    <div>
                        <div className="rc-stat-label">Número de Compras</div>
                        <div className="rc-stat-value">{numCompras}</div>
                        <div className="rc-stat-sub">Periodo seleccionado</div>
                    </div>
                </div>
                <div className="rc-stat-card">
                    <div className="rc-stat-icon">📦</div>
                    <div>
                        <div className="rc-stat-label">Insumos Comprados</div>
                        <div className="rc-stat-value">{insumosTipos}</div>
                        <div className="rc-stat-sub">Tipos diferentes</div>
                    </div>
                </div>
                <div className="rc-stat-card">
                    <div className="rc-stat-icon">📈</div>
                    <div>
                        <div className="rc-stat-label">Variación vs. Periodo Anterior</div>
                        {variacion !== null ? (
                            <div className={`rc-stat-change ${Number(variacion) >= 0 ? 'rc-change-up' : 'rc-change-down'}`}>
                                {Number(variacion) >= 0 ? '+' : ''}{variacion}% {Number(variacion) >= 0 ? '▲' : '▼'}
                            </div>
                        ) : (
                            <div className="rc-stat-change rc-change-up">—</div>
                        )}
                        <div className="rc-stat-sub">{Number(variacion ?? 0) >= 0 ? 'Aumento' : 'Reducción'}</div>
                    </div>
                </div>
            </div>

            {/* ── Tabla ── */}
            <div className="rc-table-card" ref={tableRef}>
                <div className="rc-table-header">
                    <h4 className="rc-table-title">≡ Detalle de Compras</h4>
                    <button className="rc-btn-outline" onClick={() => setShowGrafica(true)}>
                        📊 Ver Gráfica
                    </button>
                </div>

                <div className="rc-table-wrap">
                    <table className="rc-table">
                        <thead>
                        <tr>
                            <th>#</th>
                            <th>Fecha</th>
                            <th>Insumo(s)</th>
                            <th>Cantidad</th>
                            <th>Proveedor</th>
                            <th>Costo Unitario (C$)</th>
                            <th>Total (C$)</th>
                            <th>Factura / Ref.</th>
                            <th>Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="rc-no-results">
                                    No se encontraron compras con los filtros aplicados.
                                </td>
                            </tr>
                        ) : paginated.map((p, i) => {
                            const mainDetail = p.details?.[0];
                            const insumos    = p.details?.map((d) => d.supplyName).join(', ') ?? '—';
                            const cantidad   = p.details?.map((d) => `${d.quantity} ${d.unitOfMeasure ?? ''}`).join(', ') ?? '—';

                            // ✅ FIX 2: Muestra "Múltiples" si hay varios proveedores en los detalles
                            const isMulti = p.details?.some(d => d.supplierName);
                            const proveedorCell = isMulti
                                ? <span style={{ color: '#f97316', fontWeight: 600, fontSize: '0.82rem' }}>Múltiples</span>
                                : (p.supplierName ?? '—');

                            return (
                                <tr key={p.purchaseHeaderId}>
                                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                    <td>{fmt(p.purchaseDate)}</td>
                                    <td className="rc-td-insumo">{insumos}</td>
                                    <td>{cantidad}</td>
                                    <td>{proveedorCell}</td>
                                    <td>{mainDetail ? `C$ ${money(mainDetail.unitPrice)}` : '—'}</td>
                                    <td><strong>C$ {money(p.total)}</strong></td>
                                    <td>
                                        <span className="rc-invoice-tag">{p.invoiceNumber ?? '—'}</span>
                                    </td>
                                    <td>
                                        <button
                                            className="rc-btn-ver"
                                            onClick={() => setModalItem(p)}
                                        >
                                            👁️ Ver
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="rc-pagination">
                    <span className="rc-pag-info">
                        Mostrando {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} compras
                    </span>
                    <div className="rc-pag-btns">
                        <button
                            className="rc-pag-btn"
                            onClick={() => setPage((p) => p - 1)}
                            disabled={page === 1}
                        >‹</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                            <button
                                key={n}
                                className={`rc-pag-btn ${n === page ? 'rc-pag-active' : ''}`}
                                onClick={() => setPage(n)}
                            >
                                {n}
                            </button>
                        ))}
                        <button
                            className="rc-pag-btn"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page === totalPages}
                        >›</button>
                    </div>
                </div>
            </div>

            {/* Nota */}
            <div className="rc-note">
                <span>ℹ️</span>
                <p>
                    Los datos mostrados corresponden al periodo seleccionado en los filtros.
                    Puedes exportar la información en Excel o PNG.
                </p>
            </div>

        </div>
    );
}