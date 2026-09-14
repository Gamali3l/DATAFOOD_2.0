import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SalesGraph from './SalesGraph.jsx';
import './SalesReport.css';

/* ─── Helpers ─── */
const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('es-NI', { dateStyle: 'short' }) : '—';

const money = (n) =>
    Number(n ?? 0).toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

/* Calculates date range for quick filters */
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

/* ─── Sale detail modal ─── */
function VentaModal({ sale, onClose }) {
    if (!sale) return null;

    return (
        <div className="rv-modal-overlay" onClick={onClose}>
            <div className="rv-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rv-modal-header">
                    <h3 className="rv-modal-title">
                        Detalle · <span className="rv-modal-fac">{sale.invoiceNumber || '—'}</span>
                    </h3>
                    <button className="rv-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="rv-modal-grid">
                    <div className="rv-modal-row"><span>N° Venta</span><strong>{sale.saleNumber}</strong></div>
                    <div className="rv-modal-row"><span>Fecha</span><strong>{fmt(sale.saleDate)}</strong></div>
                    <div className="rv-modal-row">
                        <span>Cliente</span>
                        <strong>{sale.clientName || 'Consumidor Final'}</strong>
                    </div>
                    <div className="rv-modal-row"><span>Tipo</span>
                        <strong>
                            <span className={`rv-badge ${sale.saleType === 'Local' ? 'rv-badge-local' : 'rv-badge-domicilio'}`}>
                                {sale.saleType ?? '—'}
                            </span>
                        </strong>
                    </div>
                    <div className="rv-modal-row"><span>Empleado</span><strong>{sale.employeeName ?? '—'}</strong></div>
                    <div className="rv-modal-row"><span>Estado</span>
                        <strong>
                            <span className={`rv-badge ${sale.status === 'Completado' ? 'rv-badge-ok' : 'rv-badge-cancel'}`}>
                                {sale.status}
                            </span>
                        </strong>
                    </div>
                    {sale.address && (
                        <div className="rv-modal-row"><span>Dirección</span><strong>{sale.address}</strong></div>
                    )}
                </div>

                {sale.details?.length > 0 && (
                    <>
                        <div className="rv-modal-section-title">Productos vendidos</div>
                        <table className="rv-modal-table">
                            <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Categoría</th>
                                <th>Cantidad</th>
                                <th>P. Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sale.details.map((d, i) => (
                                <tr key={d.saleDetailId ?? i}>
                                    <td>{d.productName}</td>
                                    <td>{d.categoryName ?? '—'}</td>
                                    <td>{d.quantity}</td>
                                    <td>C$ {money(d.unitPrice)}</td>
                                    <td>C$ {money(d.subtotal)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </>
                )}

                <div className="rv-modal-totals">
                    <div className="rv-total-row"><span>Subtotal</span><span>C$ {money(sale.subtotal)}</span></div>
                    {Number(sale.deliveryFee ?? 0) > 0 && (
                        <div className="rv-total-row"><span>Envío</span><span>C$ {money(sale.deliveryFee)}</span></div>
                    )}
                    <div className="rv-total-row rv-total-final"><span>TOTAL</span><span>C$ {money(sale.total)}</span></div>
                </div>
            </div>
        </div>
    );
}

/* ─── Main component ─── */
export default function ReporteVentas() {
    const navigate = useNavigate();
    const tableRef = useRef(null);

    /* Data */
    const [sales,    setSales]   = useState([]);
    const [loading,  setLoading] = useState(true);
    const [error,    setError]   = useState(null);

    /* Filters */
    const { startDate: initStart, endDate: initEnd } = getRangeForFilter('Este mes');
    const [filtroRapido, setFiltroRapido] = useState('Este mes');
    const [startDate,    setStartDate]    = useState(initStart);
    const [endDate,      setEndDate]      = useState(initEnd);
    const [typeFilter,   setTypeFilter]   = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [empFilter,    setEmpFilter]    = useState('');
    const [prodFilter,   setProdFilter]   = useState('');

    /* UI */
    const [page,        setPage]       = useState(1);
    const [modalItem,   setModalItem]  = useState(null);
    const [showGrafica, setShowGrafica] = useState(false);
    const [showExport,  setShowExport]  = useState(false);
    const [filterKey,   setFilterKey]   = useState(0);
    const exportRef = useRef(null);

    const PAGE_SIZE = 7;

    /* ── Initial load ── */
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sales`);
                if (!res.ok) throw new Error('Error al cargar ventas');
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data?.data ?? []);
                list.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
                setSales(list);
            } catch (e) {
                console.error(e);
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

    /* ── Quick filter handler ── */
    const handleFiltroRapido = (f) => {
        setFiltroRapido(f);
        if (f !== 'Personalizar rango') {
            const { startDate: s, endDate: e } = getRangeForFilter(f);
            setStartDate(s);
            setEndDate(e);
        }
        setPage(1);
    };

    /* ── Build filter options from data ── */
    const allEmployees = [...new Set(sales.map((s) => s.employeeName).filter(Boolean))].sort();
    const allProducts  = [...new Set(
        sales.flatMap((s) => s.details?.map((d) => d.productName) ?? [])
    )].sort();

    /* ── Filtering ── */
    const filtered = sales.filter((s) => {
        const sDate     = new Date(s.saleDate);
        const matchStart  = startDate   ? sDate >= new Date(startDate) : true;
        const matchEnd    = endDate     ? sDate <= new Date(endDate + 'T23:59:59') : true;
        const matchType   = typeFilter  ? s.saleType === typeFilter : true;
        const matchStatus = statusFilter ? s.status  === statusFilter : true;
        const matchEmp    = empFilter   ? s.employeeName === empFilter : true;
        const matchProd   = prodFilter
            ? s.details?.some((d) => d.productName === prodFilter)
            : true;
        return matchStart && matchEnd && matchType && matchStatus && matchEmp && matchProd;
    });

    /* ── Stats ── */
    // FIX: when prodFilter active, sum only the subtotals of the filtered product
    const totalVentas = prodFilter
        ? filtered.reduce((sum, v) => {
            const prodSubtotal = (v.details ?? [])
                .filter(d => d.productName === prodFilter)
                .reduce((acc, d) => acc + Number(d.subtotal ?? 0), 0);
            return sum + prodSubtotal;
        }, 0)
        : filtered.reduce((s, v) => s + Number(v.total ?? 0), 0);

    const numVentas      = filtered.length;
    const productosTipos = new Set(
        filtered.flatMap((s) => s.details?.map((d) => d.productName) ?? [])
    ).size;

    const prevTotal = sales
        .filter((s) => !filtered.includes(s))
        .reduce((s, v) => s + Number(v.total ?? 0), 0);
    const variacion = prevTotal > 0
        ? (((totalVentas - prevTotal) / prevTotal) * 100).toFixed(1)
        : null;

    /* ── Pagination ── */
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    /* ── FIX: Clear filters ── */
    const clearFilters = () => {
        const { startDate: s, endDate: e } = getRangeForFilter('Este mes');
        setFiltroRapido('Este mes');
        setStartDate(s);
        setEndDate(e);
        setTypeFilter('');
        setStatusFilter('');
        setEmpFilter('');
        setProdFilter('');
        setPage(1);
        setFilterKey((k) => k + 1); // force date inputs to re-render with new values
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
        wb.creator = 'Sistema de Ventas';
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
        // FIX: recalculate total for excel taking into account prodFilter
        const totalVentasVal = prodFilter
            ? filtered.reduce((sum, v) => {
                const prodSubtotal = (v.details ?? [])
                    .filter(d => d.productName === prodFilter)
                    .reduce((acc, d) => acc + Number(d.subtotal ?? 0), 0);
                return sum + prodSubtotal;
            }, 0)
            : filtered.reduce((s, v) => s + Number(v.total ?? 0), 0);

        const periodoStr = startDate && endDate
            ? `${fmtDate(startDate)} – ${fmtDate(endDate)}`
            : startDate
                ? `Desde ${fmtDate(startDate)}`
                : endDate
                    ? `Hasta ${fmtDate(endDate)}`
                    : filtroRapido || 'Todo el período';

        const generadoStr = new Date().toLocaleDateString('es-NI', { dateStyle: 'short' });

        // ════ SHEET 1 — SUMMARY ════
        const ws1 = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
        // FIX: increased column F width to 28 so invoice numbers are not truncated
        ws1.columns = [
            { width: 3  },  // A spacer
            { width: 6  },  // B N°
            { width: 12 },  // C Fecha
            { width: 14 },  // D N° Venta
            { width: 22 },  // E Cliente
            { width: 38 },  // F Factura / Ref.  ← ampliar aquí
            { width: 14 },  // G Tipo
            { width: 14 },  // H Estado
            { width: 16 },  // I Total (C$)
        ];

        ws1.getRow(1).height = 8;
        ws1.mergeCells('B2:I3');
        ws1.getRow(2).height = 30;
        ws1.getRow(3).height = 22;
        applyS(ws1.getCell('B2'), hSt(C.tealDark, C.white, 20, true));
        ws1.getCell('B2').value = 'REPORTE DE VENTAS';

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
            { label: 'TOTAL VENTAS (C$)',
                value: `C$ ${totalVentasVal.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: periodoStr },
            { label: 'N° DE VENTAS',     value: String(numVentas),      sub: periodoStr },
            { label: 'PRODUCTOS VENDIDOS', value: String(productosTipos), sub: 'Tipos diferentes' },
            { label: 'VARIACIÓN',
                value: varNum !== null ? `${varNum >= 0 ? '+' : ''}${variacion}%` : '—',
                sub: varNum !== null ? (varNum >= 0 ? 'Aumento ▲' : 'Reducción ▼') : 'Sin comparativa' },
        ];

        ws1.getRow(7).height = 14;
        ws1.getRow(8).height = 26;
        ws1.getRow(9).height = 14;

        const kpiRanges = [
            { startCol: 2, endCol: 3 }, { startCol: 4, endCol: 5 },
            { startCol: 6, endCol: 7 }, { startCol: 8, endCol: 9 },
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
        ws1.getCell('B11').value = '≡  DETALLE DE VENTAS';

        ws1.getRow(12).height = 20;
        const th1 = ['N°', 'Fecha', 'N° Venta', 'Cliente', 'Factura / Ref.', 'Tipo', 'Estado', 'Total (C$)'];
        const tc1  = [2, 3, 4, 5, 6, 7, 8, 9];
        th1.forEach((h, i) => {
            const c = ws1.getCell(12, tc1[i]);
            c.value = h;
            applyS(c, hSt(C.grayHdr, C.white, 10, true));
        });

        filtered.forEach((s, i) => {
            const row = 13 + i;
            ws1.getRow(row).height = 18;
            const bg = i % 2 === 0 ? C.white : C.tealLight;
            // FIX: when prodFilter active, use only that product's subtotal as the row total
            const rowTotal = prodFilter
                ? (s.details ?? [])
                    .filter(d => d.productName === prodFilter)
                    .reduce((acc, d) => acc + Number(d.subtotal ?? 0), 0)
                : Number(s.total ?? 0);
            const vals = [
                i + 1,
                fmtDate(s.saleDate),
                s.saleNumber,
                s.clientName || 'Consumidor Final',
                s.invoiceNumber ?? '—',
                s.saleType ?? '—',
                s.status ?? '—',
                rowTotal,
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
        tv1.value = totalVentasVal;
        applyS(tv1, orangeSt1);
        mFmt(tv1);

        // ════ SHEET 2 — DETAIL BY PRODUCT ════
        const ws2 = wb.addWorksheet('Detalle por Producto', { views: [{ showGridLines: false }] });

        // Columns differ based on filter mode
        // With filter:    B=Fecha C=N°Venta D=ProdFiltrado E=OtrosProductos F=Cant G=P.Unit H=Subtotal(filtrado) I=Total venta
        // Without filter: B=Fecha C=N°Venta D=Todos prods  E=Categorías      F=Cant G=P.Unit H=Subtotal
        if (prodFilter) {
            ws2.columns = [
                { width: 3  }, { width: 12 }, { width: 16 }, { width: 28 },
                { width: 36 }, { width: 10 }, { width: 18 }, { width: 18 }, { width: 18 },
            ];
        } else {
            ws2.columns = [
                { width: 3  }, { width: 12 }, { width: 16 }, { width: 36 },
                { width: 24 }, { width: 10 }, { width: 18 }, { width: 18 },
            ];
        }

        const lastCol2 = prodFilter ? 9 : 8; // last data column number
        const lastColLetter2 = String.fromCharCode(64 + lastCol2);

        ws2.getRow(1).height = 8;
        ws2.mergeCells(`B2:${lastColLetter2}3`);
        ws2.getRow(2).height = 28;
        ws2.getRow(3).height = 22;
        applyS(ws2.getCell('B2'), hSt(C.tealDark, C.white, 16, true));
        ws2.getCell('B2').value = '🛒  DETALLE POR PRODUCTO';

        ws2.mergeCells(`B4:${lastColLetter2}4`);
        ws2.getRow(4).height = 16;
        applyS(ws2.getCell('B4'), hSt(C.grayHdr, C.white, 10, false));
        ws2.getCell('B4').value = `Comedor Raquel   |   Periodo: ${periodoStr}   |   Generado: ${generadoStr}`;

        ws2.getRow(5).height = 8;
        ws2.getRow(6).height = 22;

        let th2, tc2;
        if (prodFilter) {
            th2 = ['Fecha', 'N° Venta', `${prodFilter}`, 'Otros productos en la venta', 'Cantidad', 'P. Unitario (C$)', `Subtotal ${prodFilter} (C$)`, 'Total venta (C$)'];
            tc2 = [2, 3, 4, 5, 6, 7, 8, 9];
        } else {
            th2 = ['Fecha', 'N° Venta', 'Productos', 'Categorías', 'Cant. total', 'P. Unit. ref (C$)', 'Total venta (C$)'];
            tc2 = [2, 3, 4, 5, 6, 7, 8];
        }
        th2.forEach((h, i) => {
            const c = ws2.getCell(6, tc2[i]);
            c.value = h;
            applyS(c, hSt(C.grayHdr, C.white, 10, true));
        });

        let ri2 = 0;
        if (prodFilter) {
            // ONE ROW PER SALE: filtered product info + others in same cell + total of whole sale
            filtered.forEach(s => {
                const allDetails  = s.details ?? [];
                const mainDetail  = allDetails.find(d => d.productName === prodFilter);
                const otherDetails = allDetails.filter(d => d.productName !== prodFilter);
                const otrosTexto  = otherDetails.length > 0
                    ? otherDetails.map(d => `${d.productName} (x${d.quantity})`).join(', ')
                    : '—';
                const ventaTotal  = Number(s.total ?? 0);
                const filtSubtotal = mainDetail ? Number(mainDetail.subtotal ?? 0) : 0;

                const row = 7 + ri2;
                ws2.getRow(row).height = 18;
                const bg = ri2 % 2 === 0 ? C.white : C.tealLight;

                const vals2 = [
                    fmtDate(s.saleDate),
                    s.saleNumber,
                    mainDetail ? `${mainDetail.productName} (x${mainDetail.quantity})` : '—',
                    otrosTexto,
                    mainDetail ? mainDetail.quantity : 0,
                    mainDetail ? Number(mainDetail.unitPrice ?? 0) : 0,
                    filtSubtotal,
                    ventaTotal,
                ];

                vals2.forEach((v, j) => {
                    const cell   = ws2.getCell(row, tc2[j]);
                    cell.value   = v;
                    const isM    = j >= 5;
                    const isLast = j === 7; // Total venta col
                    const isSub  = j === 6; // Subtotal filtrado col
                    applyS(cell, dSt(bg, isLast || isSub, isM ? 'right' : 'left',
                        isLast ? C.orange : isSub ? C.tealDark : C.dark));
                    if (isM) mFmt(cell);
                });
                ri2++;
            });
        } else {
            // ONE ROW PER SALE: all products concatenated, total of the whole sale
            filtered.forEach(s => {
                const allDetails = s.details ?? [];
                const productosTexto  = allDetails.length > 0
                    ? allDetails.map(d => `${d.productName} (x${d.quantity})`).join(', ')
                    : '—';
                const categoriasTexto = allDetails.length > 0
                    ? [...new Set(allDetails.map(d => d.categoryName ?? '—'))].join(', ')
                    : '—';
                const cantTotal   = allDetails.reduce((acc, d) => acc + Number(d.quantity ?? 0), 0);
                const ventaTotal  = Number(s.total ?? 0);

                const row = 7 + ri2;
                ws2.getRow(row).height = 18;
                const bg = ri2 % 2 === 0 ? C.white : C.tealLight;

                const vals2 = [
                    fmtDate(s.saleDate),
                    s.saleNumber,
                    productosTexto,
                    categoriasTexto,
                    cantTotal,
                    '—',       // no single unit price when multiple products
                    ventaTotal,
                ];

                vals2.forEach((v, j) => {
                    const cell   = ws2.getCell(row, tc2[j]);
                    cell.value   = v;
                    const isM    = j >= 5;
                    const isLast = j === 6;
                    applyS(cell, dSt(bg, isLast, isM ? 'right' : 'left',
                        isLast ? C.tealDark : C.dark));
                    if (isM && typeof v === 'number') mFmt(cell);
                });
                ri2++;
            });
        }

        const totalRow2 = 7 + ri2;
        ws2.getRow(totalRow2).height = 22;
        const orangeSt2 = {
            font:      { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
            fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.orange) } },
            alignment: { horizontal: 'right', vertical: 'middle' },
            border,
        };

        if (prodFilter) {
            // Merge B to G, then H=subtotal filtrado, I=total ventas
            ws2.mergeCells(`B${totalRow2}:G${totalRow2}`);
            applyS(ws2.getCell(`B${totalRow2}`), orangeSt2);
            ws2.getCell(`B${totalRow2}`).value = 'TOTALES';

            const tFiltSub = filtered.reduce((acc, s) => {
                const d = (s.details ?? []).find(x => x.productName === prodFilter);
                return acc + (d ? Number(d.subtotal ?? 0) : 0);
            }, 0);
            const tVentaTotal = filtered.reduce((acc, s) => acc + Number(s.total ?? 0), 0);

            const hCell = ws2.getCell(`H${totalRow2}`);
            hCell.value = tFiltSub;
            applyS(hCell, orangeSt2); mFmt(hCell);

            const iCell = ws2.getCell(`I${totalRow2}`);
            iCell.value = tVentaTotal;
            applyS(iCell, orangeSt2); mFmt(iCell);
        } else {
            // Merge B to G, then H=total ventas
            ws2.mergeCells(`B${totalRow2}:G${totalRow2}`);
            applyS(ws2.getCell(`B${totalRow2}`), orangeSt2);
            ws2.getCell(`B${totalRow2}`).value = 'TOTAL GENERAL';

            const tVentaTotal = filtered.reduce((acc, s) => acc + Number(s.total ?? 0), 0);
            const hCell = ws2.getCell(`H${totalRow2}`);
            hCell.value = tVentaTotal;
            applyS(hCell, orangeSt2); mFmt(hCell);
        }

        // ════ SHEET 3 — BY EMPLOYEE ════
        const ws3 = wb.addWorksheet('Por Empleado', { views: [{ showGridLines: false }] });
        ws3.columns = [
            { width: 3  }, { width: 30 }, { width: 14 }, { width: 18 }, { width: 18 },
        ];

        ws3.getRow(1).height = 8;
        ws3.mergeCells('B2:E3');
        ws3.getRow(2).height = 28;
        ws3.getRow(3).height = 22;
        applyS(ws3.getCell('B2'), hSt(C.tealDark, C.white, 16, true));
        ws3.getCell('B2').value = '👤  RESUMEN POR EMPLEADO';

        ws3.mergeCells('B4:E4');
        ws3.getRow(4).height = 16;
        applyS(ws3.getCell('B4'), hSt(C.grayHdr, C.white, 10, false));
        ws3.getCell('B4').value = `Comedor Raquel  |   Periodo: ${periodoStr}   |   Generado: ${generadoStr}`;

        ws3.getRow(5).height = 8;
        ws3.getRow(6).height = 20;
        ['Empleado', 'N° Ventas', 'Subtotal (C$)', 'Total (C$)'].forEach((h, i) => {
            const c = ws3.getCell(6, i + 2);
            c.value = h;
            applyS(c, hSt(C.grayHdr, C.white, 10, true));
        });

        const sm3 = {};
        filtered.forEach(s => {
            const emp = s.employeeName || '—';
            if (!sm3[emp]) sm3[emp] = { sub: 0, tot: 0, n: 0 };
            // FIX: use prodFilter-aware totals for employee sheet too
            const rowSub = prodFilter
                ? (s.details ?? [])
                    .filter(d => d.productName === prodFilter)
                    .reduce((acc, d) => acc + Number(d.subtotal ?? 0), 0)
                : Number(s.subtotal ?? 0);
            const rowTot = prodFilter
                ? rowSub
                : Number(s.total ?? 0);
            sm3[emp].sub += rowSub;
            sm3[emp].tot += rowTot;
            sm3[emp].n++;
        });

        Object.entries(sm3).sort().forEach(([emp, v], i) => {
            const row = 7 + i;
            ws3.getRow(row).height = 17;
            const bg = i % 2 === 0 ? C.white : C.tealLight;
            [emp, v.n, v.sub, v.tot].forEach((val, j) => {
                const cell   = ws3.getCell(row, j + 2);
                cell.value   = val;
                const isM    = j >= 2;
                const isLast = j === 3;
                applyS(cell, dSt(bg, isLast, isM ? 'right' : 'left', isLast ? C.tealDark : C.dark));
                if (isM) mFmt(cell);
            });
        });

        const totalRow3 = 7 + Object.keys(sm3).length;
        ws3.getRow(totalRow3).height = 22;
        const orangeSt3 = {
            font:      { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
            fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.orange) } },
            alignment: { horizontal: 'right', vertical: 'middle' },
            border,
        };

        const labelCell3 = ws3.getCell(`B${totalRow3}`);
        labelCell3.value = 'TOTAL GENERAL';
        applyS(labelCell3, { ...orangeSt3, alignment: { horizontal: 'left', vertical: 'middle' } });

        const nCell3 = ws3.getCell(`C${totalRow3}`);
        nCell3.value = Object.values(sm3).reduce((a, v) => a + v.n, 0);
        applyS(nCell3, orangeSt3);

        const gSub3 = Object.values(sm3).reduce((a, v) => a + v.sub, 0);
        const gTot3 = Object.values(sm3).reduce((a, v) => a + v.tot, 0);

        [[gSub3, 'D'], [gTot3, 'E']].forEach(([val, col]) => {
            const cell = ws3.getCell(`${col}${totalRow3}`);
            cell.value = val;
            applyS(cell, orangeSt3);
            mFmt(cell);
        });

        // ── Download ──
        const buf  = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        const cleanPeriodo = periodoStr
            .replace(/\//g, '-')
            .replace(/\s/g, '_')
            .replace(/–/g, 'al');
        a.download = `Reporte_Ventas_${cleanPeriodo}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ── Export table PNG ── */
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

        const totalVentasVal = prodFilter
            ? filtered.reduce((sum, v) => {
                return sum + (v.details ?? [])
                    .filter(d => d.productName === prodFilter)
                    .reduce((acc, d) => acc + Number(d.subtotal ?? 0), 0);
            }, 0)
            : filtered.reduce((s, v) => s + Number(v.total ?? 0), 0);

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
                REPORTE DE VENTAS
            </div>
            <div style="background:#2E4053; color:white; text-align:center; padding:7px 0; font-size:11px;">
                Comedor Raquel &nbsp;|&nbsp; Periodo: ${periodoStr} &nbsp;|&nbsp; Generado: ${new Date().toLocaleDateString('es-NI', { dateStyle: 'short' })}
            </div>
            <div style="background:#1ABC9C; color:white; text-align:center; padding:8px 0; font-size:13px; font-weight:bold; margin-top:10px;">
                📊 &nbsp; RESUMEN EJECUTIVO
            </div>
            <div style="display:flex; border:1px solid #ccc;">
                ${[
            { label: 'TOTAL VENTAS (C$)', value: `C$ ${money2(totalVentasVal)}`, sub: periodoStr },
            { label: 'N° DE VENTAS',      value: String(numVentas),              sub: periodoStr },
            { label: 'PRODUCTOS VENDIDOS', value: String(productosTipos),         sub: 'Tipos diferentes' },
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
            <div style="background:#1A5276; color:white; text-align:center; padding:8px 0; font-size:13px; font-weight:bold; margin-top:10px;">
                ≡ &nbsp; DETALLE DE VENTAS
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr style="background:#2E4053; color:white;">
                        ${['N°','Fecha','N° Venta','Cliente','Factura / Ref.','Tipo','Estado','Total (C$)']
            .map(h => `<th style="padding:8px 6px; border:1px solid #BDC3C7; text-align:center;">${h}</th>`)
            .join('')}
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map((s, i) => {
            const bg = i % 2 === 0 ? '#FFFFFF' : '#D5F5E3';
            const rowTotal = prodFilter
                ? (s.details ?? [])
                    .filter(d => d.productName === prodFilter)
                    .reduce((acc, d) => acc + Number(d.subtotal ?? 0), 0)
                : Number(s.total ?? 0);
            return `<tr style="background:${bg};">
                            <td style="padding:6px; border:1px solid #BDC3C7; text-align:center;">${i + 1}</td>
                            <td style="padding:6px; border:1px solid #BDC3C7; text-align:center;">${new Date(s.saleDate).toLocaleDateString('es-NI', { dateStyle: 'short' })}</td>
                            <td style="padding:6px; border:1px solid #BDC3C7;">${s.saleNumber}</td>
                            <td style="padding:6px; border:1px solid #BDC3C7;">${s.clientName || 'Consumidor Final'}</td>
                            <td style="padding:6px; border:1px solid #BDC3C7;">${s.invoiceNumber ?? '—'}</td>
                            <td style="padding:6px; border:1px solid #BDC3C7;">${s.saleType ?? '—'}</td>
                            <td style="padding:6px; border:1px solid #BDC3C7;">${s.status ?? '—'}</td>
                            <td style="padding:6px; border:1px solid #BDC3C7; text-align:right; font-weight:bold; color:#1A5276;">C$ ${money2(rowTotal)}</td>
                        </tr>`;
        }).join('')}
                    <tr>
                        <td colspan="7" style="padding:8px; background:#E67E22; color:white; font-weight:bold; text-align:right; border:1px solid #BDC3C7;">
                            TOTAL GENERAL
                        </td>
                        <td style="padding:8px; background:#E67E22; color:white; font-weight:bold; text-align:right; border:1px solid #BDC3C7;">
                            C$ ${money2(totalVentasVal)}
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
        a.download = `Reporte_Ventas_${new Date().toLocaleDateString('es-NI', { dateStyle: 'short' }).replace(/\//g, '-')}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
    };

    /* ── Chart view ── */
    if (showGrafica) {
        return (
            <SalesGraph
                sales={filtered}
                onBack={() => setShowGrafica(false)}
            />
        );
    }

    /* ── Loading / Error ── */
    if (loading) {
        return (
            <div className="rv-page">
                <div className="rv-loading">
                    <div className="rv-spinner" />
                    <p>Cargando reportes...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rv-page">
                <div className="rv-error-box">
                    <span className="rv-error-icon">⚠️</span>
                    <p>{error}</p>
                    <button className="rv-btn-orange" onClick={() => window.location.reload()}>
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="rv-page">

            {/* ── Detail modal ── */}
            {modalItem && (
                <VentaModal
                    sale={modalItem}
                    onClose={() => setModalItem(null)}
                />
            )}

            {/* ── Topbar ── */}
            <div className="rv-topbar">
                <div className="rv-topbar-left">
                    <button className="rv-btn-outline" onClick={() => navigate('/reports')}>
                        ← Volver a Reportes
                    </button>
                    <div className="rv-title-block">
                        <h2 className="rv-title">💰 Reporte de Ventas</h2>
                        <p className="rv-subtitle">Consulta y analiza el comportamiento de las ventas realizadas.</p>
                    </div>
                </div>

                {/* Export dropdown */}
                <div className="rv-export-wrap" ref={exportRef}>
                    <button
                        className="rv-btn-outline rv-btn-export"
                        onClick={() => setShowExport((v) => !v)}
                    >
                        ⬆️ Exportar ▾
                    </button>
                    {showExport && (
                        <div className="rv-export-dropdown">
                            <button className="rv-export-item" onClick={exportExcel}>
                                📊 Exportar CSV / Excel
                            </button>
                            <button className="rv-export-item" onClick={exportTablePNG}>
                                🖼️ Exportar Tabla PNG
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="rv-filters-card">
                <div className="rv-filters-title">🔽 Filtros</div>
                <div className="rv-filters-row">
                    <div className="rv-filter-group">
                        <label>Fecha inicio</label>
                        <input
                            key={`start-${filterKey}-${startDate}`}
                            type="date"
                            defaultValue={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setFiltroRapido('Personalizar rango'); setPage(1); }}
                        />
                    </div>
                    <div className="rv-filter-group">
                        <label>Fecha fin</label>
                        <input
                            key={`end-${filterKey}-${endDate}`}
                            type="date"
                            defaultValue={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setFiltroRapido('Personalizar rango'); setPage(1); }}
                        />
                    </div>
                    <div className="rv-filter-group">
                        <label>Tipo</label>
                        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos los tipos</option>
                            <option value="Local">Local</option>
                            <option value="Domicilio">Domicilio</option>
                        </select>
                    </div>
                    <div className="rv-filter-group">
                        <label>Estado</label>
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos los estados</option>
                            <option value="Completado">Completado</option>
                            <option value="Anulado">Anulado</option>
                        </select>
                    </div>
                    <div className="rv-filter-group">
                        <label>Empleado</label>
                        <select value={empFilter} onChange={(e) => { setEmpFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos los empleados</option>
                            {allEmployees.map((emp) => (
                                <option key={emp} value={emp}>{emp}</option>
                            ))}
                        </select>
                    </div>
                    <div className="rv-filter-group">
                        <label>Producto</label>
                        <select value={prodFilter} onChange={(e) => { setProdFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos los productos</option>
                            {allProducts.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <div className="rv-filter-actions">
                        <button className="rv-btn-orange" onClick={() => setPage(1)}>
                            🔍 Aplicar Filtros
                        </button>
                        <button className="rv-btn-outline" onClick={clearFilters}>
                            🗑️ Limpiar
                        </button>
                    </div>
                </div>

                {/* Quick filters */}
                <div className="rv-quick-filters">
                    {['Hoy', 'Esta semana', 'Este mes', 'Este año'].map((f) => (
                        <button
                            key={f}
                            className={`rv-quick-btn ${filtroRapido === f ? 'rv-quick-btn-active' : ''}`}
                            onClick={() => handleFiltroRapido(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="rv-stats-grid">
                <div className="rv-stat-card">
                    <div className="rv-stat-icon">💰</div>
                    <div>
                        <div className="rv-stat-label">Total Ventas</div>
                        <div className="rv-stat-value">C$ {money(totalVentas)}</div>
                        <div className="rv-stat-sub">Periodo seleccionado</div>
                    </div>
                </div>
                <div className="rv-stat-card">
                    <div className="rv-stat-icon">🧾</div>
                    <div>
                        <div className="rv-stat-label">Número de Ventas</div>
                        <div className="rv-stat-value">{numVentas}</div>
                        <div className="rv-stat-sub">Periodo seleccionado</div>
                    </div>
                </div>
                <div className="rv-stat-card">
                    <div className="rv-stat-icon">🍽️</div>
                    <div>
                        <div className="rv-stat-label">Productos Vendidos</div>
                        <div className="rv-stat-value">{productosTipos}</div>
                        <div className="rv-stat-sub">Tipos diferentes</div>
                    </div>
                </div>
                <div className="rv-stat-card">
                    <div className="rv-stat-icon">📈</div>
                    <div>
                        <div className="rv-stat-label">Variación vs. Periodo Anterior</div>
                        {variacion !== null ? (
                            <div className={`rv-stat-change ${Number(variacion) >= 0 ? 'rv-change-up' : 'rv-change-down'}`}>
                                {Number(variacion) >= 0 ? '+' : ''}{variacion}% {Number(variacion) >= 0 ? '▲' : '▼'}
                            </div>
                        ) : (
                            <div className="rv-stat-change rv-change-up">—</div>
                        )}
                        <div className="rv-stat-sub">{Number(variacion ?? 0) >= 0 ? 'Aumento' : 'Reducción'}</div>
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="rv-table-card" ref={tableRef}>
                <div className="rv-table-header">
                    <h4 className="rv-table-title">≡ Detalle de Ventas</h4>
                    <button className="rv-btn-outline" onClick={() => setShowGrafica(true)}>
                        📊 Ver Gráfica
                    </button>
                </div>

                <div className="rv-table-wrap">
                    <table className="rv-table">
                        <thead>
                        <tr>
                            <th>#</th>
                            <th>Fecha</th>
                            <th>Producto(s)</th>
                            <th>Cantidad</th>
                            <th>Cliente</th>
                            <th>Empleado</th>
                            <th>Total (C$)</th>
                            <th>Factura / Ref.</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="rv-no-results">
                                    No se encontraron ventas con los filtros aplicados.
                                </td>
                            </tr>
                        ) : paginated.map((s, i) => {
                            // FIX: when prodFilter active, show only matching product names and quantities
                            const detallesVisibles = prodFilter
                                ? (s.details ?? []).filter(d => d.productName === prodFilter)
                                : (s.details ?? []);
                            const productos = detallesVisibles.map((d) => d.productName).join(', ') || '—';
                            const cantidad  = detallesVisibles.map((d) => `${d.quantity}`).join(', ') || '—';
                            // FIX: total shown matches the filtered product subtotal
                            const rowTotal = prodFilter
                                ? detallesVisibles.reduce((acc, d) => acc + Number(d.subtotal ?? 0), 0)
                                : Number(s.total ?? 0);

                            return (
                                <tr key={s.saleHeaderId}>
                                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                    <td>{fmt(s.saleDate)}</td>
                                    <td className="rv-td-producto">{productos}</td>
                                    <td>{cantidad}</td>
                                    <td>{s.clientName || 'Consumidor Final'}</td>
                                    <td>{s.employeeName ?? '—'}</td>
                                    <td><strong>C$ {money(rowTotal)}</strong></td>
                                    <td>
                                        <span className="rv-invoice-tag">{s.invoiceNumber ?? '—'}</span>
                                    </td>
                                    <td>
                                        <span className={`rv-badge ${s.status === 'Completado' ? 'rv-badge-ok' : 'rv-badge-cancel'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="rv-btn-ver"
                                            onClick={() => setModalItem(s)}
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

                {/* Pagination */}
                <div className="rv-pagination">
                    <span className="rv-pag-info">
                        Mostrando {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} ventas
                    </span>
                    <div className="rv-pag-btns">
                        <button
                            className="rv-pag-btn"
                            onClick={() => setPage((p) => p - 1)}
                            disabled={page === 1}
                        >‹</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                            <button
                                key={n}
                                className={`rv-pag-btn ${n === page ? 'rv-pag-active' : ''}`}
                                onClick={() => setPage(n)}
                            >
                                {n}
                            </button>
                        ))}
                        <button
                            className="rv-pag-btn"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page === totalPages}
                        >›</button>
                    </div>
                </div>
            </div>

            {/* Note */}
            <div className="rv-note">
                <span>ℹ️</span>
                <p>
                    Los datos mostrados corresponden al periodo seleccionado en los filtros.
                    Puedes exportar la información en Excel o PNG.
                </p>
            </div>

        </div>
    );
}