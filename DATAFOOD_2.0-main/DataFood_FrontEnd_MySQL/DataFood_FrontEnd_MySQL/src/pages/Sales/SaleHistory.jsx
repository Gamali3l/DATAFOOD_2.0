// SaleHistory.jsx  — versión completa corregida
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SaleHistory.css';

const BASE = `${import.meta.env.VITE_API_URL}/api`;

/* ── Helper: obtiene el employeeId real de la sesión ── */
    const getEmpId = () => {
    try {
        return JSON.parse(sessionStorage.getItem('datafood_user') || '{}').employeeId || 1;
    } catch { return 1; }

};

const api = {
    getSales:      ()              => fetch(`${BASE}/sales`).then(r => { if (!r.ok) throw r; return r.json(); }),
    getSaleById:   (id)            => fetch(`${BASE}/sales/${id}`).then(r => { if (!r.ok) throw r; return r.json(); }),
    cancelSale:    (id, reason)    =>
        fetch(`${BASE}/sales/${id}?employeeId=${getEmpId()}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        }).then(r => { if (!r.ok) throw r; }),
    updateSale:    (id, body)      => fetch(`${BASE}/sales/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw r; return r.json(); }),
    getChangeLogs: (id)            => fetch(`${BASE}/sales/${id}/logs`).then(r => { if (!r.ok) throw r; return r.json(); }),
};

const fmt   = (d) => d ? new Date(d).toLocaleString('es-NI', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const money = (n) => Number(n ?? 0).toFixed(2);

function buildReceiptData(s) {
    const formatDate = (dateValue) => {
        if (!dateValue) return '—';
        return new Date(dateValue).toLocaleString('es-NI', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    };

    const employeeName =
        s.employeeName ||
        s.employee?.name ||
        s.employee?.fullName ||
        s.employee?.firstName ||
        'Empleado';

    return {
        invoiceNumber: s.invoiceNumber || s.saleNumber || '—',
        saleNumber:    s.saleNumber    || '—',
        saleDate:      formatDate(s.saleDate || new Date()),
        clientName:    s.clientName    || 'Consumidor Final',
        saleType:      s.isDelivery    ? 'Domicilio' : (s.saleType || 'Local'),
        employeeName,
        address:       s.address       || '',
        subtotal:      money(s.subtotal   || 0),
        deliveryFee:   money(s.deliveryFee || 0),
        total:         money(s.total       || 0),
        status:        s.status        || '',
        details:       s.details       || [],
    };
}

function generateAndDownloadPDF(s) {
    const d = buildReceiptData(s);

    const screenRows = d.details.map(item => `
        <tr>
            <td class="prod">
                <div class="pname">${item.productName ?? '—'}</div>
                <div class="pcat">${item.categoryName ?? '—'}</div>
            </td>
            <td class="qty">${item.quantity}</td>
            <td class="money">C$ ${money(item.unitPrice)}</td>
            <td class="money">C$ ${money(item.subtotal)}</td>
        </tr>
    `).join('');

    const voucherRows = d.details.map(item => `
        <tr>
            <td class="v-prod">
                <div class="v-pname">${item.productName ?? '—'}</div>
                <div class="v-pcat">${item.categoryName ?? '—'}</div>
            </td>
            <td class="v-qty">${item.quantity}</td>
            <td class="v-money">C$ ${money(item.unitPrice)}</td>
            <td class="v-money">C$ ${money(item.subtotal)}</td>
        </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Comprobante ${d.saleNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Arial, sans-serif; }
  body { min-height: 100vh; }

  /* VISTA EN PANTALLA */
  .screen-shell { width: 100%; display: flex; justify-content: center; padding: 18px 0; }
  .screen-page  { width: 130mm; max-width: 130mm; }
  .screen-receipt { width: 100%; border: 1.5px solid #f97316; border-radius: 10px; overflow: hidden; background: white; }
  .header { background: #f97316; color: white; padding: 14px 18px; text-align: center; }
  .header h1 { font-size: 24px; font-weight: 800; line-height: 1.1; }
  .header p  { font-size: 11px; margin-top: 3px; opacity: .95; }
  .invoice-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; margin: 12px; padding: 11px; text-align: center; }
  .invoice-box .label  { color: #f97316; font-size: 10px; font-weight: 800; text-transform: uppercase; }
  .invoice-box .number { font-size: 17px; font-weight: 800; margin-top: 4px; }
  .content { padding: 0 12px 12px; }
  .meta { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 10px; margin-bottom: 13px; }
  .meta-row { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; font-size: 12px; border-bottom: 1px dashed #fed7aa; }
  .meta-row:last-child { border-bottom: none; }
  .meta-row span:first-child { color: #777; font-weight: 700; text-transform: uppercase; }
  .meta-row span:last-child  { text-align: right; font-weight: 700; max-width: 80mm; word-break: break-word; }
  .section-title { font-size: 12px; font-weight: 800; color: #444; text-transform: uppercase; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #f97316; color: white; }
  th { padding: 8px 6px; text-align: left; font-size: 11px; font-weight: 700; }
  th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
  td { padding: 8px 6px; border-bottom: 1px solid #fde8d0; vertical-align: top; }
  .prod  { width: 45%; }
  .pname { font-weight: 700; font-size: 12px; word-break: break-word; }
  .pcat  { color: #777; font-size: 9px; margin-top: 2px; text-transform: uppercase; word-break: break-word; }
  .qty   { text-align: center; font-weight: 700; white-space: nowrap; }
  .money { text-align: right; white-space: nowrap; }
  .totals { margin-top: 13px; border: 1px solid #fed7aa; border-radius: 8px; overflow: hidden; }
  .total-row { display: flex; justify-content: space-between; padding: 9px 12px; font-size: 13px; background: white; }
  .total-row strong { font-weight: 800; }
  .total-row.final  { background: #f97316; color: white; font-size: 15px; font-weight: 800; }
  .thanks { text-align: center; font-size: 13px; font-weight: 700; margin-top: 15px; }
  .footer { border-top: 1px solid #fde8d0; padding: 10px 12px; font-size: 9px; color: #999; text-align: center; line-height: 1.4; }
  .noprint { text-align: center; margin-top: 14px; }
  .print-btn { background: #f97316; color: white; border: none; border-radius: 8px; padding: 10px 24px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .print-only { display: none; }

  /* IMPRESIÓN */
  @media print {
    @page { size: 80mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; background: white; }
    .screen-shell, .noprint { display: none !important; }
    .print-only { display: block !important; width: 80mm; max-width: 80mm; margin: 0 auto; padding: 0; }
    .voucher { width: 80mm; max-width: 80mm; border: none; border-radius: 0; overflow: hidden; background: white; }
    .v-header { background: #f97316; color: white; padding: 12px 10px; text-align: center; }
    .v-header h1 { font-size: 21px; font-weight: 800; line-height: 1.1; }
    .v-header p  { font-size: 10px; margin-top: 3px; opacity: .95; }
    .v-invoice-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; margin: 10px; padding: 9px; text-align: center; }
    .v-invoice-box .v-label  { color: #f97316; font-size: 9px; font-weight: 800; text-transform: uppercase; }
    .v-invoice-box .v-number { font-size: 14px; font-weight: 800; margin-top: 3px; }
    .v-content { padding: 0 10px 10px; }
    .v-meta { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 8px; margin-bottom: 11px; }
    .v-meta-row { display: flex; justify-content: space-between; gap: 6px; padding: 3px 0; font-size: 10px; border-bottom: 1px dashed #fed7aa; }
    .v-meta-row:last-child { border-bottom: none; }
    .v-meta-row span:first-child { color: #777; font-weight: 700; text-transform: uppercase; }
    .v-meta-row span:last-child  { text-align: right; font-weight: 700; max-width: 45mm; word-break: break-word; }
    .v-section-title { font-size: 10px; font-weight: 800; color: #444; text-transform: uppercase; margin-bottom: 6px; }
    table.v-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    table.v-table thead tr { background: #f97316; color: white; }
    table.v-table th { padding: 6px 3px; text-align: left; font-size: 9px; font-weight: 700; }
    table.v-table th:nth-child(2), table.v-table th:nth-child(3), table.v-table th:nth-child(4) { text-align: right; }
    table.v-table td { padding: 6px 3px; border-bottom: 1px solid #fde8d0; vertical-align: top; }
    .v-prod  { width: 40%; }
    .v-pname { font-weight: 700; font-size: 10px; word-break: break-word; }
    .v-pcat  { color: #777; font-size: 8px; margin-top: 2px; text-transform: uppercase; word-break: break-word; }
    .v-qty   { text-align: center; font-weight: 700; white-space: nowrap; }
    .v-money { text-align: right; white-space: nowrap; }
    .v-totals { margin-top: 11px; border: 1px solid #fed7aa; border-radius: 8px; overflow: hidden; }
    .v-total-row { display: flex; justify-content: space-between; padding: 7px 9px; font-size: 11px; background: white; }
    .v-total-row strong { font-weight: 800; }
    .v-total-row.final  { background: #f97316; color: white; font-size: 13px; font-weight: 800; }
    .v-thanks { text-align: center; font-size: 11px; font-weight: 700; margin-top: 13px; }
    .v-footer { border-top: 1px solid #fde8d0; padding: 9px 10px; font-size: 8px; color: #999; text-align: center; line-height: 1.4; }
  }
</style>
</head>
<body>
  <!-- VISTA EN PANTALLA -->
  <div class="screen-shell">
    <div class="screen-page">
      <div class="screen-receipt">
        <div class="header">
          <h1>DataFood</h1>
          <p>Sistema de Comedor Raquel</p>
        </div>
        <div class="invoice-box">
          <div class="label">N° Factura</div>
          <div class="number">${d.invoiceNumber}</div>
        </div>
        <div class="content">
          <div class="meta">
            <div class="meta-row"><span>N° Venta</span><span>${d.saleNumber}</span></div>
            <div class="meta-row"><span>Fecha</span><span>${d.saleDate}</span></div>
            <div class="meta-row"><span>Cliente</span><span>${d.clientName || 'Consumidor Final'}</span></div>
            <div class="meta-row"><span>Tipo</span><span>${d.saleType}</span></div>
            <div class="meta-row"><span>Empleado</span><span>${d.employeeName}</span></div>
            ${d.address ? `<div class="meta-row"><span>Dirección</span><span>${d.address}</span></div>` : ''}
          </div>
          <div class="section-title">Detalle de Productos</div>
          <table>
            <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
            <tbody>${screenRows}</tbody>
          </table>
          <div class="totals">
            <div class="total-row"><span>Subtotal:</span><strong>C$ ${d.subtotal}</strong></div>
            ${Number(d.deliveryFee) > 0 ? `<div class="total-row"><span>Envío:</span><strong>C$ ${d.deliveryFee}</strong></div>` : ''}
            <div class="total-row final"><span>TOTAL:</span><strong>C$ ${d.total}</strong></div>
          </div>
          <div class="thanks">¡Gracias por su preferencia!</div>
        </div>
        <div class="footer">
          DataFood — Comprobante de Venta generado electrónicamente<br>
          ${new Date().toLocaleString('es-NI')}
        </div>
      </div>
      <div class="noprint">
        <button onclick="window.print()" class="print-btn">🖨 Imprimir / Guardar como PDF</button>
      </div>
    </div>
  </div>

  <!-- SOLO IMPRESIÓN -->
  <div class="print-only">
    <div class="voucher">
      <div class="v-header">
        <h1>Comedor Raquel</h1>
        <p>Sabor casero, hecho con amor!!!</p>
      </div>
      <div class="v-invoice-box">
        <div class="v-label">N° Factura</div>
        <div class="v-number">${d.invoiceNumber}</div>
      </div>
      <div class="v-content">
        <div class="v-meta">
          <div class="v-meta-row"><span>N° Venta</span><span>${d.saleNumber}</span></div>
          <div class="v-meta-row"><span>Fecha</span><span>${d.saleDate}</span></div>
          <div class="v-meta-row"><span>Cliente</span><span>${d.clientName || 'Consumidor Final'}</span></div>
          <div class="v-meta-row"><span>Tipo</span><span>${d.saleType}</span></div>
          <div class="v-meta-row"><span>Empleado</span><span>${d.employeeName}</span></div>
          ${d.address ? `<div class="v-meta-row"><span>Dirección</span><span>${d.address}</span></div>` : ''}
        </div>
        <div class="v-section-title">Detalle de Productos</div>
        <table class="v-table">
          <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
          <tbody>${voucherRows}</tbody>
        </table>
        <div class="v-totals">
          <div class="v-total-row"><span>Subtotal:</span><strong>C$ ${d.subtotal}</strong></div>
          ${Number(d.deliveryFee) > 0 ? `<div class="v-total-row"><span>Envío:</span><strong>C$ ${d.deliveryFee}</strong></div>` : ''}
          <div class="v-total-row final"><span>TOTAL:</span><strong>C$ ${d.total}</strong></div>
        </div>
        <div class="v-thanks">¡Gracias por su preferencia!</div>
      </div>
      <div class="v-footer">
        DataFood — Comprobante de Venta generado electrónicamente<br>
        ${new Date().toLocaleString('es-NI')}
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.focus();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function escXML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function generateAndDownloadXML(s) {
    const d   = buildReceiptData(s);
    const now = new Date().toISOString();
    const detalles = d.details.map(item => `
    <DetalleItem>
      <Producto>${escXML(item.productName ?? '—')}</Producto>
      <Categoria>${escXML(item.categoryName ?? '—')}</Categoria>
      <Cantidad>${item.quantity}</Cantidad>
      <PrecioUnitario>${money(item.unitPrice)}</PrecioUnitario>
      <Subtotal>${money(item.subtotal)}</Subtotal>
    </DetalleItem>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ComprobanteDeVenta version="1.0">
  <Encabezado>
    <Sistema>DataFood</Sistema>
    <TipoDocumento>Comprobante de Venta</TipoDocumento>
    <NumeroVenta>${escXML(d.saleNumber)}</NumeroVenta>
    <NumeroFactura>${escXML(d.invoiceNumber)}</NumeroFactura>
    <FechaEmision>${escXML(d.saleDate)}</FechaEmision>
    <FechaGeneracion>${now}</FechaGeneracion>
  </Encabezado>
  <Cliente>
    <Nombre>${escXML(d.clientName)}</Nombre>
    ${d.address ? `<Direccion>${escXML(d.address)}</Direccion>` : ''}
  </Cliente>
  <Transaccion>
    <TipoVenta>${escXML(d.saleType)}</TipoVenta>
    <Estado>${escXML(d.status)}</Estado>
    <Empleado>${escXML(d.employeeName)}</Empleado>
  </Transaccion>
  <DetalleProductos>${detalles}</DetalleProductos>
  <Totales>
    <Moneda>NIO</Moneda>
    <Subtotal>${d.subtotal}</Subtotal>
    ${Number(d.deliveryFee) > 0 ? `<Envio>${d.deliveryFee}</Envio>` : ''}
    <TotalGeneral>${d.total}</TotalGeneral>
  </Totales>
</ComprobanteDeVenta>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Comprobante_${d.saleNumber}.xml`;
    a.click();
    URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════
   MODAL: DESCARGA
═══════════════════════════════════════════════════ */
function DownloadModal({ sale, onClose }) {
    return (
        <div className="sh-overlay" onClick={onClose}>
            <div className="sh-modal" onClick={e => e.stopPropagation()}>
                <div className="sh-modal-header">
                    <span className="sh-modal-title">Descargar Comprobante</span>
                    <button className="sh-modal-close" onClick={onClose}>✕</button>
                </div>
                <p className="sh-modal-sub">
                    Venta <strong>{sale.saleNumber}</strong> · Factura <strong>{sale.invoiceNumber || '—'}</strong>
                </p>
                <div className="sh-dl-options">
                    <button className="sh-dl-btn sh-dl-pdf" onClick={() => { generateAndDownloadPDF(sale); onClose(); }}>
                        <span className="sh-dl-icon">📄</span>
                        <span className="sh-dl-label">PDF</span>
                        <span className="sh-dl-desc">Se abre en nueva pestaña para imprimir o guardar</span>
                    </button>
                    <button className="sh-dl-btn sh-dl-xml" onClick={() => { generateAndDownloadXML(sale); onClose(); }}>
                        <span className="sh-dl-icon">🗂</span>
                        <span className="sh-dl-label">XML</span>
                        <span className="sh-dl-desc">Comprobante electrónico · Formato DGI Nicaragua</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MODAL: ANULACIÓN
═══════════════════════════════════════════════════ */
function CancelModal({ sale, onClose, onCancelled }) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');

    const handleConfirm = async () => {
        if (!reason.trim()) { setError('Debes ingresar un motivo de anulación.'); return; }
        setSaving(true);
        setError('');
        try {
            await api.cancelSale(sale.saleHeaderId, reason.trim());
            onCancelled();
            onClose();
        } catch (e) {
            console.error(e);
            setError('Error al anular la venta. Verifica que el servidor esté activo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="sh-overlay" onClick={onClose}>
            <div className="sh-modal sh-cancel-modal" onClick={e => e.stopPropagation()}>
                <div className="sh-modal-header">
                    <span className="sh-modal-title">Anular Venta</span>
                    <button className="sh-modal-close" onClick={onClose}>✕</button>
                </div>
                <p className="sh-modal-sub">
                    ¿Está seguro de anular la venta <strong>{sale.saleNumber}</strong>? Esta acción no se puede deshacer.
                </p>
                <div className="sh-cancel-field">
                    <label className="sh-cancel-label">MOTIVO DE ANULACIÓN *</label>
                    <textarea
                        className="sh-cancel-textarea"
                        rows={3}
                        placeholder="Ej: Error en pedido, cliente canceló, producto agotado..."
                        value={reason}
                        onChange={e => { setReason(e.target.value); setError(''); }}
                    />
                    {error && (
                        <p style={{ color: '#dc2626', fontSize: '.82rem', marginTop: '6px' }}>{error}</p>
                    )}
                </div>
                <div className="sh-cancel-actions">
                    <button className="sh-btn-cancel" onClick={onClose} disabled={saving}>
                        Cancelar
                    </button>
                    <button
                        className="sh-btn-confirm-cancel"
                        onClick={handleConfirm}
                        disabled={saving || !reason.trim()}
                    >
                        {saving ? 'Anulando…' : '⊘ Confirmar Anulación'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MODAL: EDICIÓN
═══════════════════════════════════════════════════ */
function EditModal({ sale, onClose, onSaved }) {
    const [form, setForm] = useState({
        customerName: sale.clientName ?? '',
        address:      sale.address    ?? '',
    });

    const [details, setDetails] = useState(
        (sale.details ?? []).map(d => ({ ...d, newQty: d.quantity }))
    );

    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState('');
    const [success, setSuccess] = useState(false);

    const isDelivery = sale.saleType === 'Domicilio';

    const updateQty = (index, val) => {
        const qty = Math.max(1, parseInt(val) || 1);
        setDetails(prev => prev.map((d, i) => i === index ? { ...d, newQty: qty } : d));
    };

    const newSubtotal = details.reduce((acc, d) => acc + (Number(d.unitPrice) * d.newQty), 0);
    const newTotal    = newSubtotal + Number(sale.deliveryFee ?? 0);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const body = {
                employeeId: getEmpId(),   // ← usa el empleado real de la sesión
                details: details.map(d => ({
                    saleDetailId: d.saleDetailId,
                    productId:    d.productId,
                    quantity:     Number(d.newQty),
                    unitPrice:    Number(d.unitPrice),
                })),
            };
            if (isDelivery) {
                body.customerName = form.customerName;
                body.address      = form.address;
            }
            await api.updateSale(sale.saleHeaderId, body);
            setSuccess(true);
            setTimeout(() => { onSaved(); onClose(); }, 800);
        } catch (e) {
            console.error('Error al guardar:', e);
            let msg = 'Error del servidor.';
            try { const text = await e.text?.(); if (text) msg = `Error del servidor: ${text}`; } catch (_) {}
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="sh-overlay" onClick={onClose}>
            <div className="sh-em" onClick={e => e.stopPropagation()}>
                <div className="sh-em-header">
                    <div className="sh-em-header-left">
                        <div className="sh-em-icon-wrap">✏</div>
                        <div>
                            <div className="sh-em-title">Editar Venta</div>
                            <div className="sh-em-subtitle">{sale.saleNumber} · {sale.saleType}</div>
                        </div>
                    </div>
                    <button className="sh-em-close" onClick={onClose}>✕</button>
                </div>

                <div className="sh-em-body">
                    <div className="sh-em-section">
                        <div className="sh-em-section-title">Información general</div>
                        <div className="sh-em-info-grid">
                            <div className="sh-em-field">
                                <label>N° Factura</label>
                                <div className="sh-em-readonly"><span className="sh-em-lock">🔒</span>{sale.invoiceNumber ?? '—'}</div>
                            </div>
                            <div className="sh-em-field">
                                <label>Tipo de venta</label>
                                <div className="sh-em-readonly">
                                    <span className={`sh-badge ${sale.saleType === 'Local' ? 'sh-badge-local' : 'sh-badge-domicilio'}`}>{sale.saleType}</span>
                                </div>
                            </div>
                            <div className="sh-em-field">
                                <label>Fecha</label>
                                <div className="sh-em-readonly">{fmt(sale.saleDate)}</div>
                            </div>
                            <div className="sh-em-field">
                                <label>Empleado</label>
                                <div className="sh-em-readonly">{sale.employeeName ?? '—'}</div>
                            </div>
                            {isDelivery ? (
                                <div className="sh-em-field sh-em-field-full">
                                    <label>Cliente <span className="sh-em-required">*</span></label>
                                    <input
                                        className="sh-em-input"
                                        type="text"
                                        value={form.customerName}
                                        onChange={e => setForm({ ...form, customerName: e.target.value })}
                                        placeholder="Nombre y teléfono del cliente"
                                    />
                                </div>
                            ) : (
                                <div className="sh-em-field sh-em-field-full">
                                    <label>Cliente</label>
                                    <div className="sh-em-readonly">{sale.clientName || 'Consumidor Final'}</div>
                                </div>
                            )}
                            {isDelivery && (
                                <div className="sh-em-field sh-em-field-full">
                                    <label>Dirección <span className="sh-em-required">*</span></label>
                                    <input
                                        className="sh-em-input"
                                        type="text"
                                        value={form.address}
                                        onChange={e => setForm({ ...form, address: e.target.value })}
                                        placeholder="Dirección de entrega"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="sh-em-section">
                        <div className="sh-em-section-title">Productos de la venta</div>
                        <table className="sh-em-table">
                            <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Categoría</th>
                                <th className="sh-em-th-right">Precio unit.</th>
                                <th className="sh-em-th-center">Cantidad</th>
                                <th className="sh-em-th-right">Subtotal</th>
                            </tr>
                            </thead>
                            <tbody>
                            {details.map((d, i) => (
                                <tr key={d.saleDetailId ?? i}>
                                    <td className="sh-em-td-name">{d.productName}</td>
                                    <td className="sh-em-td-cat">{d.categoryName}</td>
                                    <td className="sh-em-td-right">C$ {money(d.unitPrice)}</td>
                                    <td className="sh-em-td-center">
                                        <div className="sh-em-qty-wrap">
                                            <button className="sh-em-qty-btn" onClick={() => updateQty(i, d.newQty - 1)} disabled={d.newQty <= 1}>−</button>
                                            <input className="sh-em-qty-input" type="number" min={1} value={d.newQty} onChange={e => updateQty(i, e.target.value)} />
                                            <button className="sh-em-qty-btn" onClick={() => updateQty(i, d.newQty + 1)}>+</button>
                                        </div>
                                    </td>
                                    <td className="sh-em-td-right sh-em-subtotal">C$ {money(Number(d.unitPrice) * d.newQty)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="sh-em-totals">
                        <div className="sh-em-total-row"><span>Subtotal</span><strong>C$ {money(newSubtotal)}</strong></div>
                        {Number(sale.deliveryFee ?? 0) > 0 && (
                            <div className="sh-em-total-row"><span>Envío</span><strong>C$ {money(sale.deliveryFee)}</strong></div>
                        )}
                        <div className="sh-em-total-row sh-em-total-final"><span>Total</span><strong>C$ {money(newTotal)}</strong></div>
                    </div>

                    {error   && <div className="sh-em-error">⚠ {error}</div>}
                    {success && <div className="sh-em-success">✔ Guardado correctamente</div>}

                    <div className="sh-em-actions">
                        <button className="sh-em-btn-cancel" onClick={onClose} disabled={saving}>Cancelar</button>
                        <button className="sh-em-btn-save" onClick={handleSave} disabled={saving || success}>
                            {saving ? 'Guardando…' : '✔ Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MODAL: HISTORIAL DE CAMBIOS
═══════════════════════════════════════════════════ */
function ChangeLogModal({ sale, onClose }) {
    const [logs,    setLogs]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        api.getChangeLogs(sale.saleHeaderId)
            .then(data => setLogs(Array.isArray(data) ? data : []))
            .catch(() => setError('No se pudo cargar el historial.'))
            .finally(() => setLoading(false));
    }, [sale.saleHeaderId]);

    const iconFor = (action = '') => {
        if (action.includes('Creó'))  return { icon: '✚', cls: 'log-icon-create' };
        if (action.includes('Editó')) return { icon: '✏', cls: 'log-icon-edit' };
        if (action.includes('Anuló')) return { icon: '✕', cls: 'log-icon-cancel' };
        return { icon: '•', cls: 'log-icon-default' };
    };

    return (
        <div className="sh-overlay" onClick={onClose}>
            <div className="sh-log-modal" onClick={e => e.stopPropagation()}>
                <div className="sh-modal-header">
                    <span className="sh-modal-title">Historial de Cambios · {sale.saleNumber}</span>
                    <button className="sh-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="sh-log-body">
                    {loading && <p className="sh-log-empty">Cargando…</p>}
                    {error   && <p className="sh-log-empty sh-log-err">{error}</p>}
                    {!loading && !error && logs.length === 0 && (
                        <p className="sh-log-empty">Sin registros de cambios.</p>
                    )}
                    {!loading && logs.map((log, i) => {
                        const { icon, cls } = iconFor(log.action);
                        return (
                            <div className="sh-log-item" key={log.logId ?? i}>
                                <div className={`sh-log-icon ${cls}`}>{icon}</div>
                                <div className="sh-log-content">
                                    <div className="sh-log-action">{log.action}</div>
                                    <div className="sh-log-detail">{log.detail}</div>
                                    <div className="sh-log-meta">
                                        {fmt(log.logDate)}{log.employeeName ? ` · ${log.employeeName}` : ''}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════ */
export default function SaleHistory() {
    const navigate = useNavigate();

    const [sales,       setSales]       = useState([]);
    const [selected,    setSelected]    = useState(null);
    const [loadingList, setLoadingList] = useState(true);

    // Modales
    const [showDownload,  setShowDownload]  = useState(false);
    const [showEdit,      setShowEdit]      = useState(false);
    const [showChangeLog, setShowChangeLog] = useState(false);
    const [showCancel,    setShowCancel]    = useState(false);

    // Filtros
    const [search,       setSearch]       = useState('');
    const [dateFrom,     setDateFrom]     = useState('');
    const [dateTo,       setDateTo]       = useState('');
    const [typeFilter,   setTypeFilter]   = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page,         setPage]         = useState(1);

    const PAGE_SIZE = 8;

    const fetchAll = async () => {
        setLoadingList(true);
        try {
            const data = await api.getSales();
            const list = Array.isArray(data) ? data : (data?.data ?? []);
            list.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
            setSales(list);
            if (list.length > 0 && !selected) setSelected(list[0]);
        } catch (e) {
            console.error('Error al cargar ventas:', e);
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const clearFilters = () => {
        setSearch(''); setDateFrom(''); setDateTo('');
        setTypeFilter(''); setStatusFilter(''); setPage(1);
    };

    const filtered = sales.filter(s => {
        const q = search.toLowerCase();
        const matchSearch = !search
            || (s.saleNumber    ?? '').toLowerCase().includes(q)
            || (s.clientName    ?? '').toLowerCase().includes(q)
            || (s.employeeName  ?? '').toLowerCase().includes(q)
            || (s.invoiceNumber ?? '').toLowerCase().includes(q);
        const matchType   = !typeFilter   || s.saleType === typeFilter;
        const matchStatus = !statusFilter || s.status   === statusFilter;
        const matchFrom   = !dateFrom     || new Date(s.saleDate) >= new Date(dateFrom);
        const matchTo     = !dateTo       || new Date(s.saleDate) <= new Date(dateTo + 'T23:59:59');
        return matchSearch && matchType && matchStatus && matchFrom && matchTo;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const statusCls = (s) => s === 'Completado' ? 'sh-badge-completado' : 'sh-badge-anulado';
    const typeCls   = (t) => t === 'Local'      ? 'sh-badge-local'      : 'sh-badge-domicilio';

    return (
        <div className="sh-page">

            {/* ── MODALES ── */}
            {showDownload  && selected && <DownloadModal  sale={selected} onClose={() => setShowDownload(false)} />}
            {showEdit      && selected && <EditModal      sale={selected} onClose={() => setShowEdit(false)} onSaved={fetchAll} />}
            {showChangeLog && selected && <ChangeLogModal sale={selected} onClose={() => setShowChangeLog(false)} />}
            {showCancel    && selected && (
                <CancelModal
                    sale={selected}
                    onClose={() => setShowCancel(false)}
                    onCancelled={fetchAll}
                />
            )}

            {/* ── HEADER ── */}
            <div className="sh-title-bar">
                <div>
                    <h2 className="sh-h2">Historial de Ventas</h2>
                    <span className="sh-sub">Registro de todas las ventas realizadas</span>
                </div>
                <button className="sh-btn-dashboard" onClick={() => navigate('/')}>Principal</button>
            </div>

            {/* ── FILTROS ── */}
            <div className="sh-filters">
                <div className="sh-search">
                    <span>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por N° venta, factura, cliente o empleado..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="sh-filter-group">
                    <label>Desde</label>
                    <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
                </div>
                <div className="sh-filter-group">
                    <label>Hasta</label>
                    <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
                </div>
                <div className="sh-filter-group">
                    <label>Tipo</label>
                    <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
                        <option value="">Todos</option>
                        <option value="Local">Local</option>
                        <option value="Domicilio">Domicilio</option>
                    </select>
                </div>
                <div className="sh-filter-group">
                    <label>Estado</label>
                    <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                        <option value="">Todos</option>
                        <option value="Completado">Completado</option>
                        <option value="Anulado">Anulado</option>
                    </select>
                </div>
                <button className="sh-btn-clear" onClick={clearFilters}>▽ Limpiar</button>
            </div>

            {/* ── LAYOUT PRINCIPAL ── */}
            <div className="sh-layout">
                <div className="sh-left">
                    <table className="sh-table">
                        <thead>
                        <tr>
                            <th>N° Venta</th>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>N° Factura</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Tipo</th>
                            <th>Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loadingList ? (
                            <tr><td colSpan={8} className="sh-no-results">Cargando ventas…</td></tr>
                        ) : paginated.length === 0 ? (
                            <tr><td colSpan={8} className="sh-no-results">Sin resultados</td></tr>
                        ) : paginated.map(s => (
                            <tr
                                key={s.saleHeaderId}
                                className={selected?.saleHeaderId === s.saleHeaderId ? 'sh-row-selected' : ''}
                                onClick={() => setSelected(s)}
                            >
                                <td>{s.saleNumber}</td>
                                <td>{fmt(s.saleDate)}</td>
                                <td>{s.clientName || 'Consumidor Final'}</td>
                                <td>{s.invoiceNumber || '—'}</td>
                                <td>C$ {money(s.total)}</td>
                                <td><span className={`sh-badge ${statusCls(s.status)}`}>{s.status}</span></td>
                                <td><span className={`sh-badge ${typeCls(s.saleType)}`}>{s.saleType}</span></td>
                                <td onClick={e => e.stopPropagation()}>
                                    <div className="sh-actions">
                                        <button className="sh-btn-icon sh-btn-ver" title="Ver detalle" onClick={() => setSelected(s)}>👁</button>
                                        {s.status !== 'Anulado' && (
                                            <>
                                                <button
                                                    className="sh-btn-icon sh-btn-edit"
                                                    title="Editar venta"
                                                    onClick={() => { setSelected(s); setShowEdit(true); }}
                                                >✏</button>
                                                <button
                                                    className="sh-btn-icon sh-btn-cancel"
                                                    title="Anular venta"
                                                    onClick={() => { setSelected(s); setShowCancel(true); }}
                                                >ⓧ</button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    {/* ── PAGINACIÓN ── */}
                    <div className="sh-footer">
                        <span className="sh-count">
                            {filtered.length === 0
                                ? 'Sin resultados'
                                : `Mostrando ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
                        </span>
                        <div className="sh-pagination">
                            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                <button key={n} className={n === page ? 'sh-pg-active' : ''} onClick={() => setPage(n)}>{n}</button>
                            ))}
                            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
                        </div>
                    </div>
                </div>

                {/* ── PANEL DETALLE ── */}
                {selected && (
                    <div className="sh-detail">
                        <div className="sh-detail-header">
                            <div className="sh-detail-title">Detalle de la Venta</div>
                            <div className="sh-detail-code">{selected.saleNumber}</div>
                        </div>

                        <div className="sh-meta-grid">
                            <div className="sh-meta-item">
                                <span className="sh-meta-label">CLIENTE</span>
                                <div className="sh-meta-val">{selected.clientName || 'Consumidor Final'}</div>
                            </div>
                            <div className="sh-meta-item">
                                <span className="sh-meta-label">ESTADO</span>
                                <div className="sh-meta-val">
                                    <span className={`sh-badge ${statusCls(selected.status)}`}>{selected.status}</span>
                                </div>
                            </div>
                            <div className="sh-meta-item">
                                <span className="sh-meta-label">FECHA</span>
                                <div className="sh-meta-val">{fmt(selected.saleDate)}</div>
                            </div>
                            <div className="sh-meta-item">
                                <span className="sh-meta-label">N° FACTURA</span>
                                <div className="sh-meta-val">{selected.invoiceNumber || '—'}</div>
                            </div>
                            <div className="sh-meta-item">
                                <span className="sh-meta-label">TIPO</span>
                                <div className="sh-meta-val">
                                    <span className={`sh-badge ${typeCls(selected.saleType)}`}>{selected.saleType}</span>
                                </div>
                            </div>
                            <div className="sh-meta-item">
                                <span className="sh-meta-label">EMPLEADO</span>
                                <div className="sh-meta-val">{selected.employeeName || '—'}</div>
                            </div>
                            {selected.address && (
                                <div className="sh-meta-item sh-meta-full">
                                    <span className="sh-meta-label">DIRECCIÓN</span>
                                    <div className="sh-meta-val">{selected.address}</div>
                                </div>
                            )}
                        </div>

                        <div className="sh-section-title">Productos Vendidos</div>
                        <table className="sh-detail-table">
                            <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Categoría</th>
                                <th>Cant.</th>
                                <th>Precio</th>
                                <th>Subtotal</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(selected.details ?? []).length === 0 ? (
                                <tr><td colSpan={5} className="sh-no-results">Sin productos registrados</td></tr>
                            ) : (selected.details ?? []).map((d, i) => (
                                <tr key={d.saleDetailId ?? i}>
                                    <td>{d.productName}</td>
                                    <td>{d.categoryName}</td>
                                    <td>{d.quantity}</td>
                                    <td>C$ {money(d.unitPrice)}</td>
                                    <td>C$ {money(d.subtotal)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        <div className="sh-totals">
                            <div className="sh-total-row">
                                <span>Subtotal:</span>
                                <strong>C$ {money(selected.subtotal ?? selected.total)}</strong>
                            </div>
                            {Number(selected.deliveryFee ?? 0) > 0 && (
                                <div className="sh-total-row">
                                    <span>Envío:</span>
                                    <strong>C$ {money(selected.deliveryFee)}</strong>
                                </div>
                            )}
                            <div className="sh-total-row sh-total-final">
                                <span>TOTAL:</span>
                                <strong>C$ {money(selected.total)}</strong>
                            </div>
                        </div>

                        <div className="sh-detail-actions">
                            <button className="sh-btn-log" onClick={() => setShowChangeLog(true)}>
                                🕒 Historial de Cambios
                            </button>
                            <button className="sh-btn-download" onClick={() => setShowDownload(true)}>
                                ⬇ Descargar Comprobante
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}