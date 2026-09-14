import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getPurchases,
    cancelPurchase
} from '../../api/Supplyapi.js';
import { getSuppliers } from '../../api/supplierApi';
import './SupplyPurchase.css';

/* ─── GENERADORES DE FACTURA ─── */

function buildInvoiceData(p) {
    const fmt = (d) =>
        d ? new Date(d).toLocaleString('es-NI', { dateStyle: 'short', timeStyle: 'short' }) : '—';

    return {
        purchaseNumber: p.purchaseNumber ?? '—',
        invoiceNumber:  p.invoiceNumber  ?? '—',
        supplierName:   p.supplierName   ?? '—',
        purchaseDate:   fmt(p.purchaseDate),
        paymentMethod:  p.paymentMethod  ?? '—',
        status:         p.status         ?? '—',
        notes:          p.notes          ?? '',
        taxRate:        Number(p.taxRate ?? 18),
        subtotal:       Number(p.subtotal ?? 0).toFixed(2),
        tax:            Number(p.tax     ?? 0).toFixed(2),
        total:          Number(p.total   ?? 0).toFixed(2),
        details:        p.details        ?? [],
    };
}

/* ─── PDF ─── */
function generateAndDownloadPDF(p) {
    const d = buildInvoiceData(p);

    const isMulti = d.details.some(item => item.supplierName);

    let rows = '';
    if (isMulti) {
        const bySupplier = {};
        d.details.forEach(item => {
            const key = item.supplierName || '—';
            if (!bySupplier[key]) bySupplier[key] = [];
            bySupplier[key].push(item);
        });

        Object.entries(bySupplier).forEach(([supplierName, items]) => {
            rows += `
        <tr>
            <td colspan="6" style="background:#fff7ed;color:#f97316;font-weight:700;font-size:12px;padding:8px 12px;">
                📦 Proveedor: ${supplierName}
            </td>
        </tr>`;
            items.forEach(item => {
                rows += `
        <tr>
            <td>${item.supplyName ?? '—'}</td>
            <td>${item.supplyCategory ?? '—'}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:center">${item.unitOfMeasure ?? '—'}</td>
            <td style="text-align:right">C$ ${Number(item.unitPrice ?? 0).toFixed(2)}</td>
            <td style="text-align:right">C$ ${Number(item.subtotal ?? 0).toFixed(2)}</td>
        </tr>`;
            });
        });
    } else {
        rows = d.details.map(item => `
        <tr>
            <td>${item.supplyName ?? '—'}</td>
            <td>${item.supplyCategory ?? '—'}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:center">${item.unitOfMeasure ?? '—'}</td>
            <td style="text-align:right">C$ ${Number(item.unitPrice ?? 0).toFixed(2)}</td>
            <td style="text-align:right">C$ ${Number(item.subtotal ?? 0).toFixed(2)}</td>
        </tr>`).join('');
    }

    const proveedorMeta = isMulti
        ? `<div class="meta-item"><div class="meta-label">Modo</div><div class="meta-val">Múltiples Proveedores</div></div>`
        : `<div class="meta-item"><div class="meta-label">Proveedor</div><div class="meta-val">${d.supplierName}</div></div>`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Factura ${d.invoiceNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #111; padding: 40px; }
  .invoice-wrap { max-width: 820px; margin: 0 auto; border: 2px solid #f97316; border-radius: 12px; overflow: hidden; }
  .inv-header { background: #f97316; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
  .inv-brand { color: white; }
  .inv-brand h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .inv-brand p { font-size: 13px; opacity: 0.85; margin-top: 2px; }
  .inv-badge { background: white; border-radius: 8px; padding: 10px 20px; text-align: right; }
  .inv-badge .label { font-size: 11px; color: #f97316; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .inv-badge .num { font-size: 18px; font-weight: 700; color: #111; }
  .inv-body { padding: 28px 32px; }
  .inv-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 18px; }
  .meta-item .meta-label { font-size: 10px; color: #999; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .meta-item .meta-val { font-size: 13px; font-weight: 600; color: #111; }
  .section-title { font-size: 12px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  table.items { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
  table.items thead tr { background: #f97316; color: white; }
  table.items th { padding: 10px 12px; text-align: left; font-weight: 600; }
  table.items td { padding: 9px 12px; border-bottom: 1px solid #fde8d0; }
  table.items tbody tr:last-child td { border-bottom: none; }
  .totals-box { margin-left: auto; width: 280px; border: 1px solid #fed7aa; border-radius: 10px; overflow: hidden; }
  .total-row { display: flex; justify-content: space-between; padding: 9px 16px; font-size: 13px; background: white; }
  .total-row.final { background: #f97316; color: white; font-weight: 700; font-size: 15px; }
  .inv-footer { border-top: 1px solid #fde8d0; padding: 16px 32px; font-size: 11px; color: #aaa; text-align: center; }
  .status-pill { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 11px; font-weight: 700;
    background: ${d.status === 'Recibido' ? '#dcfce7' : '#fee2e2'}; color: ${d.status === 'Recibido' ? '#15803d' : '#b91c1c'}; }
  @media print {
    body { padding: 0; }
    .invoice-wrap { border: none; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="invoice-wrap">
  <div class="inv-header">
    <div class="inv-brand">
      <h1>Comedor Raquel</h1>
      <p>Sistema de Comedor Raquel</p>
    </div>
    <div class="inv-badge">
      <div class="label">N° Factura</div>
      <div class="num">${d.invoiceNumber}</div>
    </div>
  </div>
  <div class="inv-body">
    <div class="inv-meta">
      <div class="meta-item"><div class="meta-label">N° Compra</div><div class="meta-val">${d.purchaseNumber}</div></div>
      <div class="meta-item"><div class="meta-label">Fecha</div><div class="meta-val">${d.purchaseDate}</div></div>
      ${proveedorMeta}
      <div class="meta-item"><div class="meta-label">Método de Pago</div><div class="meta-val">${d.paymentMethod}</div></div>
      <div class="meta-item"><div class="meta-label">Estado</div><div class="meta-val"><span class="status-pill">${d.status}</span></div></div>
      ${d.notes ? `<div class="meta-item"><div class="meta-label">Notas</div><div class="meta-val">${d.notes}</div></div>` : ''}
    </div>
    <div class="section-title">Detalle de Productos</div>
    <table class="items">
      <thead><tr><th>Insumo</th><th>Categoría</th><th>Cant.</th><th>U.Medida</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals-box">
      <div class="total-row"><span>Subtotal:</span><strong>C$ ${d.subtotal}</strong></div>
      <div class="total-row"><span>IVA (${d.taxRate}%):</span><strong>C$ ${d.tax}</strong></div>
      <div class="total-row final"><span>TOTAL:</span><strong>C$ ${d.total}</strong></div>
    </div>
  </div>
  <div class="inv-footer">
    Comedor Raquel — Comprobante de Compra generado electrónicamente · ${new Date().toLocaleString('es-NI')}
  </div>
</div>
<br>
<div class="no-print" style="text-align:center">
  <button onclick="window.print()" style="background:#f97316;color:white;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer;">
    🖨 Imprimir / Guardar como PDF
  </button>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.focus();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ─── XML ─── */
function generateAndDownloadXML(p) {
    const d   = buildInvoiceData(p);
    const now = new Date().toISOString();
    const isMulti = d.details.some(item => item.supplierName);

    let detallesXml = '';
    if (isMulti) {
        const bySupplier = {};
        d.details.forEach(item => {
            const key = item.supplierName || '—';
            if (!bySupplier[key]) bySupplier[key] = [];
            bySupplier[key].push(item);
        });

        Object.entries(bySupplier).forEach(([supplierName, items]) => {
            detallesXml += `\n    <GrupoProveedor nombre="${escXML(supplierName)}">`;
            items.forEach(item => {
                detallesXml += `
      <DetalleItem>
        <Insumo>${escXML(item.supplyName ?? '—')}</Insumo>
        <Categoria>${escXML(item.supplyCategory ?? '—')}</Categoria>
        <UnidadMedida>${escXML(item.unitOfMeasure ?? '—')}</UnidadMedida>
        <Cantidad>${item.quantity}</Cantidad>
        <PrecioUnitario>${Number(item.unitPrice ?? 0).toFixed(2)}</PrecioUnitario>
        <Subtotal>${Number(item.subtotal ?? 0).toFixed(2)}</Subtotal>
      </DetalleItem>`;
            });
            detallesXml += `\n    </GrupoProveedor>`;
        });
    } else {
        detallesXml = d.details.map(item => `
    <DetalleItem>
      <Insumo>${escXML(item.supplyName ?? '—')}</Insumo>
      <Categoria>${escXML(item.supplyCategory ?? '—')}</Categoria>
      <UnidadMedida>${escXML(item.unitOfMeasure ?? '—')}</UnidadMedida>
      <Cantidad>${item.quantity}</Cantidad>
      <PrecioUnitario>${Number(item.unitPrice ?? 0).toFixed(2)}</PrecioUnitario>
      <Subtotal>${Number(item.subtotal ?? 0).toFixed(2)}</Subtotal>
    </DetalleItem>`).join('');
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  ============================================================
  COMPROBANTE ELECTRÓNICO DE COMPRA
  Sistema: Comedor Raquel
  Generado: ${now}
  ============================================================
-->
<ComprobantdeCompra xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0">

  <!-- ── ENCABEZADO ── -->
  <Encabezado>
    <Sistema>Comedor Raquel</Sistema>
    <TipoDocumento>Comprobante de Compra</TipoDocumento>
    <NumeroComprobante>${escXML(d.purchaseNumber)}</NumeroComprobante>
    <NumeroFactura>${escXML(d.invoiceNumber)}</NumeroFactura>
    <FechaEmision>${escXML(d.purchaseDate)}</FechaEmision>
    <FechaGeneracion>${now}</FechaGeneracion>
  </Encabezado>

  <!-- ── PROVEEDOR ── -->
  <Proveedor>
    ${isMulti
        ? `<Tipo>Múltiples Proveedores</Tipo>`
        : `<Nombre>${escXML(d.supplierName)}</Nombre>`
    }
  </Proveedor>

  <!-- ── TRANSACCIÓN ── -->
  <Transaccion>
    <MetodoPago>${escXML(d.paymentMethod)}</MetodoPago>
    <Estado>${escXML(d.status)}</Estado>
    ${d.notes ? `<Notas>${escXML(d.notes)}</Notas>` : '<!-- Sin notas -->'}
  </Transaccion>

  <!-- ── DETALLE DE PRODUCTOS ── -->
  <DetalleProductos>${detallesXml}
  </DetalleProductos>

  <!-- ── TOTALES ── -->
  <Totales>
    <Moneda>NIO</Moneda>
    <Subtotal>${d.subtotal}</Subtotal>
    <TasaIVA>${d.taxRate.toFixed(2)}</TasaIVA>
    <MontoIVA>${d.tax}</MontoIVA>
    <TotalGeneral>${d.total}</TotalGeneral>
  </Totales>

</ComprobantdeCompra>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Comprobante_${d.purchaseNumber}.xml`;
    a.click();
    URL.revokeObjectURL(url);
}

function escXML(str) {
    return String(str ?? '')
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&apos;');
}

/* ─── MODAL DE DESCARGA ─── */
function DownloadModal({ purchase, onClose }) {
    return (
        <div className="dl-modal-overlay" onClick={onClose}>
            <div className="dl-modal" onClick={e => e.stopPropagation()}>
                <div className="dl-modal-header">
                    <span className="dl-modal-title">Descargar Comprobante</span>
                    <button className="dl-modal-close" onClick={onClose}>✕</button>
                </div>
                <p className="dl-modal-sub">
                    Compra <strong>{purchase.purchaseNumber}</strong> · Factura <strong>{purchase.invoiceNumber || '—'}</strong>
                </p>
                <div className="dl-options">
                    <button
                        className="dl-option-btn dl-pdf"
                        onClick={() => { generateAndDownloadPDF(purchase); onClose(); }}
                    >
                        <span className="dl-icon">📄</span>
                        <span className="dl-opt-label">PDF</span>
                        <span className="dl-opt-desc">Se abre en nueva pestaña para imprimir o guardar</span>
                    </button>
                    <button
                        className="dl-option-btn dl-xml"
                        onClick={() => { generateAndDownloadXML(purchase); onClose(); }}
                    >
                        <span className="dl-icon">🗂</span>
                        <span className="dl-opt-label">XML</span>
                        <span className="dl-opt-desc">Comprobante electrónico · Formato DGI Nicaragua</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── MODAL DE CANCELACIÓN ─── */
function CancelModal({ purchase, onConfirm, onClose }) {
    const [reason, setReason] = useState('');

    return (
        <div className="dl-modal-overlay" onClick={onClose}>
            <div className="dl-modal" onClick={e => e.stopPropagation()}>
                <div className="dl-modal-header">
                    <span className="dl-modal-title">Anular Compra</span>
                    <button className="dl-modal-close" onClick={onClose}>✕</button>
                </div>

                <p className="dl-modal-sub">
                    ¿Está seguro de anular la compra{' '}
                    <strong>{purchase.purchaseNumber}</strong>? Esta acción no se puede deshacer.
                </p>

                <div style={{ padding: '4px 0 20px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#555',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '8px',
                    }}>
                        Motivo de anulación <span style={{ color: '#f97316' }}>*</span>
                    </label>
                    <textarea
                        rows={3}
                        placeholder="Ej: Producto dañado, error en pedido, proveedor canceló entrega..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        style={{
                            width: '100%',
                            borderRadius: '8px',
                            border: '1.5px solid #fed7aa',
                            padding: '10px 12px',
                            fontSize: '13px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={e  => (e.target.style.borderColor = '#f97316')}
                        onBlur={e   => (e.target.style.borderColor = '#fed7aa')}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        className="btn-limpiar-c"
                        style={{ padding: '8px 18px' }}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    {/* ── CORREGIDO: usa btn-cancel-confirm en lugar de btn-icon-c btn-cancel ── */}
                    <button
                        className="btn-cancel-confirm"
                        onClick={() => onConfirm(reason.trim() || 'Sin motivo especificado')}
                    >
                        ⊘ Confirmar Anulación
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── HISTORIAL CON FILTROS ─── */
function HistorySection({ logs = [], fmt }) {
    const [histDateFrom,     setHistDateFrom]     = useState('');
    const [histDateTo,       setHistDateTo]       = useState('');
    const [histActionFilter, setHistActionFilter] = useState('');

    const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))];

    const filteredLogs = logs.filter(log => {
        const raw     = log.logDate || log.createdAt || log.changeDate || log.date || log.created_at;
        const logDate = new Date(raw);
        const matchFrom = histDateFrom ? logDate >= new Date(histDateFrom) : true;
        const matchTo   = histDateTo   ? logDate <= new Date(histDateTo + 'T23:59:59') : true;
        const matchAct  = histActionFilter ? log.action === histActionFilter : true;
        return matchFrom && matchTo && matchAct;
    });

    const hasFilter = histDateFrom || histDateTo || histActionFilter;

    return (
        <div className="history-section">
            <div className="history-header">
                <h3 className="history-title">Historial de Cambios</h3>
                <div className="history-filters">
                    <div className="filter-group">
                        <label>Desde</label>
                        <input
                            type="date"
                            value={histDateFrom}
                            onChange={e => setHistDateFrom(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Hasta</label>
                        <input
                            type="date"
                            value={histDateTo}
                            onChange={e => setHistDateTo(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Acción</label>
                        <select
                            value={histActionFilter}
                            onChange={e => setHistActionFilter(e.target.value)}
                        >
                            <option value="">Todas</option>
                            {uniqueActions.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                    {hasFilter && (
                        <button
                            className="btn-limpiar-c"
                            onClick={() => {
                                setHistDateFrom('');
                                setHistDateTo('');
                                setHistActionFilter('');
                            }}
                        >
                            ▽ Limpiar
                        </button>
                    )}
                    <span className="history-count">{filteredLogs.length} registro(s)</span>
                </div>
            </div>

            <table className="history-table">
                <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Detalle</th>
                </tr>
                </thead>
                <tbody>
                {filteredLogs.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="no-results">
                            Sin registros para los filtros aplicados
                        </td>
                    </tr>
                ) : filteredLogs.map((log, idx) => (
                    <tr key={log.logId ?? idx}>
                        <td>{fmt(log.logDate || log.createdAt || log.changeDate || log.date || log.created_at)}</td>
                        <td>{log.employeeName || log.employee_employeeId || log.employeeId}</td>
                        <td><span className="cl-action-badge">{log.action}</span></td>
                        <td>{log.detail}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

/* ─── COMPONENTE PRINCIPAL ─── */
export default function SupplyPurchase() {
    const navigate = useNavigate();

    const [purchases,          setPurchases]          = useState([]);
    const [suppliers,          setSuppliers]          = useState([]);
    const [selected,           setSelected]           = useState(null);
    const [showDownloadModal,  setShowDownloadModal]  = useState(false);
    const [cancelTarget,       setCancelTarget]       = useState(null);

    const [search,       setSearch]       = useState('');
    const [dateFrom,     setDateFrom]     = useState('');
    const [dateTo,       setDateTo]       = useState('');
    const [provFilter,   setProvFilter]   = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page,         setPage]         = useState(1);

    const PAGE_SIZE = 8;

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const [pRes, sRes] = await Promise.all([getPurchases(), getSuppliers()]);
            setPurchases(pRes.data);
            setSuppliers(sRes.data);
            if (pRes.data.length > 0) setSelected(pRes.data[0]);
        } catch (e) { console.error(e); }
    };

    const handleCancelClick = (purchase) => {
        setCancelTarget(purchase);
    };

    const handleCancelConfirm = async (reason) => {
        if (!cancelTarget) return;
        try {
            await cancelPurchase(cancelTarget.purchaseHeaderId, 1, reason);
            setCancelTarget(null);
            fetchAll();
        } catch (e) {
            console.error(e);
            alert('Error al anular la compra.');
        }
    };

    const clearFilters = () => {
        setSearch(''); setDateFrom(''); setDateTo('');
        setProvFilter(''); setStatusFilter(''); setPage(1);
    };

    const fmt   = (date) =>
        date ? new Date(date).toLocaleString('es-NI', { dateStyle: 'short', timeStyle: 'short' }) : '—';

    const money = (n) => Number(n ?? 0).toFixed(2);

    const filtered = purchases.filter(p => {
        const matchSearch = search
            ? (p.purchaseNumber ?? '').toLowerCase().includes(search.toLowerCase())
            || (p.supplierName  ?? '').toLowerCase().includes(search.toLowerCase())
            : true;
        const matchProv     = provFilter    ? String(p.supplierId) === provFilter     : true;
        const matchStatus   = statusFilter  ? p.status === statusFilter               : true;
        const matchDateFrom = dateFrom      ? new Date(p.purchaseDate) >= new Date(dateFrom) : true;
        const matchDateTo   = dateTo        ? new Date(p.purchaseDate) <= new Date(dateTo + 'T23:59:59') : true;
        return matchSearch && matchProv && matchStatus && matchDateFrom && matchDateTo;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const taxPct = Number(selected?.taxRate ?? 18);

    return (
        <div className="compras-page">

            {/* MODAL DESCARGA */}
            {showDownloadModal && selected && (
                <DownloadModal
                    purchase={selected}
                    onClose={() => setShowDownloadModal(false)}
                />
            )}

            {/* MODAL CANCELACIÓN */}
            {cancelTarget && (
                <CancelModal
                    purchase={cancelTarget}
                    onConfirm={handleCancelConfirm}
                    onClose={() => setCancelTarget(null)}
                />
            )}

            {/* HEADER */}
            <div className="compras-title-bar">
                <div>
                    <h2 className="compras-h2">Compras de Insumos</h2>
                    <span className="compras-sub">Historial de Compras</span>
                </div>
                <div className="compras-actions-top" style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
                    <button className="btn-dashboard"    onClick={() => navigate('/')}>Principal</button>
                    <button className="btn-nueva-compra" onClick={() => navigate('/supplies/purchases/new')}>
                        + Nueva Compra
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="compras-filters">
                <div className="search-box-c">
                    <span>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="filter-group">
                    <label>Desde</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="filter-group">
                    <label>Hasta</label>
                    <input type="date" value={dateTo}   onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="filter-group">
                    <label>Proveedor</label>
                    <select value={provFilter} onChange={(e) => setProvFilter(e.target.value)}>
                        <option value="">Todos</option>
                        {suppliers.map((s) => (
                            <option key={s.supplierId} value={s.supplierId}>{s.name}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Estado</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="Recibido">Recibido</option>
                        <option value="Anulado">Anulado</option>
                    </select>
                </div>
                <button className="btn-limpiar-c" onClick={clearFilters}>▽ Limpiar</button>
            </div>

            {/* LAYOUT */}
            <div className="compras-layout">

                {/* TABLA */}
                <div className="compras-left">
                    <table className="compras-table">
                        <thead>
                        <tr>
                            <th>N° Compra</th>
                            <th>Fecha</th>
                            <th>Proveedor</th>
                            <th>N° Factura</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Método de pago</th>
                            <th>Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {paginated.length === 0 ? (
                            <tr><td colSpan={8} className="no-results">Sin resultados</td></tr>
                        ) : paginated.map((p) => (
                            <tr
                                key={p.purchaseHeaderId}
                                className={selected?.purchaseHeaderId === p.purchaseHeaderId ? 'row-selected' : ''}
                            >
                                <td>{p.purchaseNumber}</td>
                                <td>{fmt(p.purchaseDate)}</td>
                                <td>
                                    {p.supplierName || (
                                        <span style={{ color: '#f97316', fontSize: '0.8rem' }}>Múltiples</span>
                                    )}
                                </td>
                                <td>{p.invoiceNumber || '—'}</td>
                                <td>C${money(p.total)}</td>
                                <td>
                                    <span className={`status-badge ${p.status === 'Recibido' ? 'badge-recibido' : 'badge-anulado'}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td>{p.paymentMethod}</td>
                                <td>
                                    <div className="compras-actions">
                                        <button className="btn-icon-c btn-ver"  onClick={() => setSelected(p)}>👁</button>
                                        {p.status !== 'Anulado' && (
                                            <>
                                                <button
                                                    className="btn-icon-c btn-edit"
                                                    onClick={() => navigate(`/supplies/purchases/edit/${p.purchaseHeaderId}`)}
                                                >✏</button>
                                                <button
                                                    className="btn-icon-c btn-cancel"
                                                    onClick={() => handleCancelClick(p)}
                                                >ⓧ</button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    {/* PAGINACIÓN */}
                    <div className="compras-footer-bar">
                        <span className="compras-count">
                            Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                        </span>
                        <div className="pagination">
                            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                <button key={n} className={n === page ? 'pg-active' : ''} onClick={() => setPage(n)}>{n}</button>
                            ))}
                            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
                        </div>
                    </div>
                </div>

                {/* PANEL DETALLE */}
                {selected && (
                    <div className="compras-detail">
                        <div className="detail-header">
                            <div className="detail-title">Detalle de la Compra</div>
                            <div className="detail-code">{selected.purchaseNumber}</div>
                        </div>

                        <div className="detail-meta-grid">
                            <div className="dmeta-item">
                                <div>
                                    <span className="dmeta-label">PROVEEDOR</span>
                                    {selected.details?.some(d => d.supplierName) ? (
                                        <div className="dmeta-val" style={{ fontSize: '0.8rem' }}>
                                            {[...new Set(selected.details.map(d => d.supplierName).filter(Boolean))].map((s, i) => (
                                                <div key={i} style={{ color: '#f97316' }}>• {s}</div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="dmeta-val">{selected.supplierName}</div>
                                    )}
                                </div>
                            </div>
                            <div className="dmeta-item">
                                <div>
                                    <span className="dmeta-label">ESTADO</span>
                                    <div className="dmeta-val">
                                        <span className={`status-badge ${selected.status === 'Recibido' ? 'badge-recibido' : 'badge-anulado'}`}>
                                            {selected.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="dmeta-item">
                                <div>
                                    <span className="dmeta-label">FECHA</span>
                                    <div className="dmeta-val">{fmt(selected.purchaseDate)}</div>
                                </div>
                            </div>
                            <div className="dmeta-item">
                                <div>
                                    <span className="dmeta-label">N° FACTURA</span>
                                    <div className="dmeta-val">{selected.invoiceNumber || '—'}</div>
                                </div>
                            </div>
                            <div className="dmeta-item">
                                <div>
                                    <span className="dmeta-label">MÉTODO PAGO</span>
                                    <div className="dmeta-val">{selected.paymentMethod}</div>
                                </div>
                            </div>
                            {selected.notes && (
                                <div className="dmeta-item" style={{ gridColumn: '1 / -1' }}>
                                    <div>
                                        <span className="dmeta-label">NOTAS</span>
                                        <div className="dmeta-val">{selected.notes}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PRODUCTOS */}
                        <div className="detail-section-title">Productos Comprados</div>
                        <table className="detail-table">
                            <thead>
                            <tr>
                                {selected.details?.some(d => d.supplierName) && <th>Proveedor</th>}
                                <th>Producto</th>
                                <th>Categoría</th>
                                <th>Cantidad</th>
                                <th>Precio</th>
                                <th>Subtotal</th>
                            </tr>
                            </thead>
                            <tbody>
                            {selected.details?.map((d, i) => (
                                <tr key={d.detailId ?? i}>
                                    {selected.details?.some(det => det.supplierName) && (
                                        <td style={{ fontSize: '0.8rem', color: '#f97316', fontWeight: 600 }}>
                                            {d.supplierName || '—'}
                                        </td>
                                    )}
                                    <td>{d.supplyName}</td>
                                    <td>{d.supplyCategory}</td>
                                    <td>{d.quantity}</td>
                                    <td>C${money(d.unitPrice)}</td>
                                    <td>C${money(d.subtotal)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {/* TOTALES */}
                        <div className="detail-totals">
                            <div className="total-row">
                                <span>Subtotal:</span>
                                <strong>C${money(selected.subtotal)}</strong>
                            </div>
                            <div className="total-row">
                                <span>IVA ({taxPct}%):</span>
                                <strong>C${money(selected.tax)}</strong>
                            </div>
                            <div className="total-row total-final">
                                <span>TOTAL:</span>
                                <strong>C${money(selected.total)}</strong>
                            </div>
                        </div>

                        {/* BOTÓN DESCARGAR */}
                        <button
                            className="btn-download-invoice"
                            onClick={() => setShowDownloadModal(true)}
                        >
                            ⬇ Descargar Comprobante
                        </button>
                    </div>
                )}
            </div>

            {/* HISTORIAL */}
            {selected && (
                <HistorySection
                    logs={selected.changeLogs ?? []}
                    fmt={fmt}
                />
            )}
        </div>
    );
}