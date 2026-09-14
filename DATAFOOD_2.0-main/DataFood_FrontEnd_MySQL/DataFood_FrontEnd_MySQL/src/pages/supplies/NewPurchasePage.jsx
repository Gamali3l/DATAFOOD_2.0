import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
    getSupplies,
    createPurchase,
    updatePurchase,
    getPurchase
} from '../../api/Supplyapi.js';

import { getSuppliers } from '../../api/supplierApi.js';

import './NewPurchasePage.css';

/* ══════════════════════════════════════════════
   MODAL DE SELECCIÓN con búsqueda y scroll
   ══════════════════════════════════════════════ */
function SelectModal({ title, items, labelKey, onSelect, onClose }) {
    const [search, setSearch] = useState('');

    const filtered = items.filter(item =>
        item[labelKey].toLowerCase().includes(search.toLowerCase())
    );

    /* Cierra con Escape */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: '#fff', borderRadius: '12px',
                width: '360px', maxHeight: '480px',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#2d4a45', color: '#fff',
                    padding: '0.75rem 1rem'
                }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', color: '#fff',
                            fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1,
                            padding: '0 2px'
                        }}
                    >✕</button>
                </div>

                {/* Buscador */}
                <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #eee' }}>
                    <input
                        autoFocus
                        placeholder={`🔍 Buscar ${title.toLowerCase()}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '0.42rem 0.75rem',
                            border: '1px solid #ccc', borderRadius: '7px',
                            fontSize: '0.87rem', outline: 'none'
                        }}
                    />
                </div>

                {/* Lista con scroll */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {filtered.length === 0 && (
                        <div style={{
                            padding: '1.8rem', textAlign: 'center',
                            color: '#aaa', fontSize: '0.87rem'
                        }}>
                            Sin resultados
                        </div>
                    )}
                    {filtered.map((item, i) => (
                        <div
                            key={i}
                            onClick={() => { onSelect(item); onClose(); }}
                            style={{
                                padding: '0.65rem 1rem',
                                borderBottom: '1px solid #f5f0eb',
                                cursor: 'pointer', fontSize: '0.9rem',
                                transition: 'background 0.12s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fff3e0'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                            {item[labelKey]}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════
   Botón que reemplaza al <select>
   ══════════════════════════════════════════════ */
function PickerButton({ label, hasError, onClick, style = {} }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: '0.42rem 0.75rem',
                borderRadius: '7px',
                border: `1.5px solid ${hasError ? '#e53e3e' : '#ccc'}`,
                background: '#fff',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.87rem',
                color: label ? '#333' : '#999',
                width: '100%',
                ...style
            }}
        >
            {label || '-- Seleccionar --'}
        </button>
    );
}


/* ══════════════════════════════════════════════
   PÁGINA PRINCIPAL
   ══════════════════════════════════════════════ */
export default function NewPurchasePage() {

    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [supplies,     setSupplies]     = useState([]);
    const [suppliers,    setSuppliers]    = useState([]);
    const [items,        setItems]        = useState([]);
    const [selectedRow,  setSelectedRow]  = useState(null);

    const [supplyId,     setSupplyId]     = useState('');
    const [quantity,     setQuantity]     = useState('');
    const [unitPrice,    setUnitPrice]    = useState('');
    const [itemSupplier, setItemSupplier] = useState('');

    const [supplierId,   setSupplierId]   = useState('');
    const [payMethod,    setPayMethod]    = useState('Efectivo');
    const [taxRate,      setTaxRate]      = useState('18');
    const [isEditing,    setIsEditing]    = useState(false);

    const [mode,         setMode]         = useState('single');
    const [modeLocked,   setModeLocked]   = useState(false);

    const [errors,       setErrors]       = useState({});

    /* modal: 'supplier' | 'supply' | 'itemSupplier' | null */
    const [modal, setModal] = useState(null);

    /* ── Carga inicial ── */
    useEffect(() => {
        const loadData = async () => {
            try {
                const [suppliesRes, suppliersRes] = await Promise.all([
                    getSupplies(),
                    getSuppliers()
                ]);

                setSupplies(suppliesRes.data);
                setSuppliers(suppliersRes.data.filter(s => s.status === 1));

                if (id) {
                    const purchaseRes = await getPurchase(id);
                    const purchase    = purchaseRes.data;

                    setSupplierId(String(purchase.supplierId ?? ''));
                    setPayMethod(purchase.paymentMethod ?? 'Efectivo');
                    setTaxRate(String(purchase.taxRate ?? 18));

                    const loadedItems = (purchase.details ?? []).map((d) => ({
                        supplyId:      d.supplyId,
                        supplyName:    d.supplyName,
                        category:      d.supplyCategory ?? '',
                        unitOfMeasure: d.unitOfMeasure  ?? '',
                        quantity:      d.quantity,
                        unitPrice:     d.unitPrice,
                        subtotal:      d.subtotal,
                        supplierId:    d.supplierId    ?? null,
                        supplierName:  d.supplierName  ?? '',
                    }));

                    setItems(loadedItems);

                    const detectedMode = loadedItems.some(i => i.supplierId) ? 'multi' : 'single';
                    setMode(detectedMode);
                    setModeLocked(true);
                }
            } catch (error) {
                console.error(error);
            }
        };

        loadData();
    }, [id]);

    const selectedSupply = supplies.find(
        (s) => String(s.supplyId) === String(supplyId)
    );

    /* ── Validación ítem ── */
    const validateItem = () => {
        const e = {};
        if (!supplyId)                              e.supplyId     = 'Selecciona un insumo.';
        if (!quantity  || Number(quantity)  <= 0)   e.quantity     = 'Cantidad debe ser mayor a 0.';
        if (!unitPrice || Number(unitPrice) <= 0)   e.unitPrice    = 'Precio debe ser mayor a 0.';
        if (mode === 'multi' && !itemSupplier)      e.itemSupplier = 'Selecciona un proveedor para este ítem.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ── Items ── */
    const addItem = () => {
        if (!validateItem()) return;

        const sup     = supplies.find( s => String(s.supplyId)   === String(supplyId));
        const supData = suppliers.find(s => String(s.supplierId) === String(itemSupplier));

        const newItem = {
            supplyId:      Number(supplyId),
            supplyName:    sup?.name           ?? '',
            category:      sup?.categoryName   ?? '',
            unitOfMeasure: sup?.unitOfMeasure  ?? '',
            quantity:      Number(quantity),
            unitPrice:     Number(unitPrice),
            subtotal:      Number(quantity) * Number(unitPrice),
            supplierId:    mode === 'multi' ? Number(itemSupplier) : null,
            supplierName:  mode === 'multi' ? (supData?.name ?? '') : '',
        };

        if (isEditing && selectedRow !== null) {
            const updated = [...items];
            updated[selectedRow] = newItem;
            setItems(updated);
            setIsEditing(false);
            setSelectedRow(null);
        } else {
            setItems([...items, newItem]);
        }

        resetForm();
    };

    const editItem = () => {
        if (selectedRow === null) return;
        const item = items[selectedRow];
        setSupplyId(String(item.supplyId));
        setQuantity(String(item.quantity));
        setUnitPrice(String(item.unitPrice));
        if (mode === 'multi') setItemSupplier(String(item.supplierId ?? ''));
        setIsEditing(true);
        setErrors({});
    };

    const deleteItem = () => {
        if (selectedRow === null) return;
        setItems(items.filter((_, i) => i !== selectedRow));
        setSelectedRow(null);
    };

    const resetForm = () => {
        setSupplyId('');
        setQuantity('');
        setUnitPrice('');
        setItemSupplier('');
        setErrors({});
    };

    /* ── Totales ── */
    const subtotal = items.reduce((acc, item) => acc + Number(item.subtotal), 0);
    const taxPct   = parseFloat(taxRate) || 0;
    const tax      = subtotal * (taxPct / 100);
    const total    = subtotal + tax;

    /* ── Validación submit ── */
    const validateSubmit = () => {
        const e = {};
        if (mode === 'single' && !supplierId)       e.supplierId = 'Selecciona un proveedor.';
        if (items.length === 0)                     e.items      = 'Agrega al menos un insumo.';
        if (taxPct < 0 || taxPct > 100)             e.taxRate    = 'El IVA debe estar entre 0 y 100.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ── Submit ── */
    const handleSubmit = async () => {
        if (!validateSubmit()) return;

        const payload = {
            supplierId:    mode === 'single' ? Number(supplierId) : null,
            employeeId:    1,
            paymentMethod: payMethod,
            invoiceNumber: null,
            taxRate:       taxPct,
            status:        'Recibido',
            details: items.map((i) => ({
                supplyId:  i.supplyId,
                quantity:  Number(i.quantity),
                unitPrice: Number(i.unitPrice),
                ...(mode === 'multi' && { supplierId: i.supplierId }),
            }))
        };

        try {
            if (id) {
                await updatePurchase(id, payload);
            } else {
                await createPurchase(payload);
            }
            navigate('/supplies/purchases');
        } catch (error) {
            console.error('Error payload:', payload);
            console.error('Error response:', error?.response?.data);
            alert(`Error al ${id ? 'editar' : 'registrar'} la compra: ${error?.response?.data?.message ?? error.message}`);
        }
    };

    const errStyle = { color: '#e53e3e', fontSize: '0.78rem', marginTop: '-0.4rem', marginBottom: '0.4rem' };

    /* Nombres para mostrar en botones */
    const selectedSupplierName  = suppliers.find(s => String(s.supplierId) === String(supplierId))?.name;
    const selectedItemSupName   = suppliers.find(s => String(s.supplierId) === String(itemSupplier))?.name;
    const selectedSupplyName    = supplies.find(s => String(s.supplyId)    === String(supplyId))?.name;

    return (
        <div className="ncp-page">

            <h2 className="ncp-title">
                {isEdit ? 'Editar Compra' : 'Agregar una Nueva Compra'}
            </h2>

            {/* ── SELECTOR DE MODO ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>Modo de compra:</span>

                {modeLocked ? (
                    <span style={{
                        fontSize: '0.88rem', fontWeight: 600,
                        color: '#f97316',
                        background: '#fff7ed', border: '1px solid #f97316',
                        borderRadius: '6px', padding: '2px 12px'
                    }}>
                        {mode === 'multi' ? '🔒 Múltiples proveedores' : '🔒 Un proveedor'}
                    </span>
                ) : (
                    <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                            <input
                                type="radio" name="mode" value="single"
                                checked={mode === 'single'}
                                onChange={() => { setMode('single'); resetForm(); setItems([]); }}
                            />
                            Un proveedor
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                            <input
                                type="radio" name="mode" value="multi"
                                checked={mode === 'multi'}
                                onChange={() => { setMode('multi'); setSupplierId(''); resetForm(); setItems([]); }}
                            />
                            Múltiples proveedores
                        </label>
                        {mode === 'multi' && (
                            <span style={{
                                background: '#fff3cd', border: '1px solid #f97316',
                                borderRadius: '6px', padding: '2px 10px',
                                fontSize: '0.78rem', color: '#7a4400'
                            }}>
                                Cada ítem tendrá su propio proveedor
                            </span>
                        )}
                    </>
                )}
            </div>

            {/* ── HEADER ── */}
            <div className="ncp-header-form">

                {mode === 'single' && (
                    <div className="ncp-field">
                        <label>Proveedor</label>
                        <PickerButton
                            label={selectedSupplierName}
                            hasError={!!errors.supplierId}
                            onClick={() => setModal('supplier')}
                            style={{ padding: '0.45rem 0.7rem', fontSize: '0.88rem' }}
                        />
                        {errors.supplierId && <div style={errStyle}>⚠ {errors.supplierId}</div>}
                    </div>
                )}

                <div className="ncp-field">
                    <label>Método de pago</label>
                    <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                        <option>Efectivo</option>
                    </select>
                </div>

                <div className="ncp-field">
                    <label>IVA (%)</label>
                    <input
                        type="number" min={0} max={100} step={0.5}
                        value={taxRate}
                        onChange={(e) => { setTaxRate(e.target.value); setErrors(p => ({...p, taxRate: ''})); }}
                        style={{ border: errors.taxRate ? '1.5px solid #e53e3e' : undefined }}
                    />
                    {errors.taxRate && <div style={errStyle}>⚠ {errors.taxRate}</div>}
                </div>

                <div className="ncp-field" style={{ flex: 2 }}>
                    <label>N° Factura</label>
                    <input value="Auto-generado" readOnly style={{ color: '#aaa', cursor: 'not-allowed' }} />
                </div>

            </div>

            {/* ── BOTONES ── */}
            <div className="ncp-actions-row">
                <button className="btn-action btn-action--wide" onClick={editItem} disabled={selectedRow === null}>
                    Editar
                </button>
                <button className="btn-action btn-action--wide" onClick={deleteItem} disabled={selectedRow === null}>
                    Eliminar
                </button>
            </div>

            {errors.items && (
                <div style={{ ...errStyle, paddingLeft: '0.5rem', marginBottom: '0.5rem' }}>⚠ {errors.items}</div>
            )}

            <div className="ncp-body">

                {/* ── IZQUIERDA ── */}
                <div className="ncp-left">

                    <div className="ncp-item-form">

                        {/* Proveedor del ítem (modo multi) */}
                        {mode === 'multi' && (
                            <div className="ncp-item-field">
                                <label>Proveedor del ítem</label>
                                <PickerButton
                                    label={selectedItemSupName}
                                    hasError={!!errors.itemSupplier}
                                    onClick={() => setModal('itemSupplier')}
                                />
                                {errors.itemSupplier && <div style={errStyle}>⚠ {errors.itemSupplier}</div>}
                            </div>
                        )}

                        {/* Insumo */}
                        <div className="ncp-item-field">
                            <label>Insumo</label>
                            <PickerButton
                                label={selectedSupplyName}
                                hasError={!!errors.supplyId}
                                onClick={() => setModal('supply')}
                            />
                            {errors.supplyId && <div style={errStyle}>⚠ {errors.supplyId}</div>}
                        </div>

                        {selectedSupply && (
                            <div className="ncp-autocomplete">
                                <span>Categoría: <strong>{selectedSupply.categoryName}</strong></span>
                                <span>Unidad: <strong>{selectedSupply.unitOfMeasure}</strong></span>
                            </div>
                        )}

                        <div className="ncp-item-field">
                            <label>Cantidad</label>
                            <input
                                type="number" min={0.01} step={0.01}
                                value={quantity}
                                onChange={(e) => { setQuantity(e.target.value); setErrors(p => ({...p, quantity: ''})); }}
                                style={{ border: errors.quantity ? '1.5px solid #e53e3e' : undefined }}
                            />
                            {errors.quantity && <div style={errStyle}>⚠ {errors.quantity}</div>}
                        </div>

                        <div className="ncp-item-field">
                            <label>Precio Unitario (C$)</label>
                            <input
                                type="number" min={0} step={0.01}
                                value={unitPrice}
                                onChange={(e) => { setUnitPrice(e.target.value); setErrors(p => ({...p, unitPrice: ''})); }}
                                style={{ border: errors.unitPrice ? '1.5px solid #e53e3e' : undefined }}
                            />
                            {errors.unitPrice && <div style={errStyle}>⚠ {errors.unitPrice}</div>}
                        </div>

                        <button className="btn-add-item" onClick={addItem}>
                            {isEditing ? '✔ Guardar cambio' : '+ Agregar'}
                        </button>

                    </div>

                    {/* Tabla con scroll */}
                    <div style={{ maxHeight: '320px', overflowY: 'auto', borderRadius: '8px' }}>
                        <table className="ncp-table" style={{ marginBottom: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr>
                                {mode === 'multi' && <th>Proveedor</th>}
                                <th>Insumo</th>
                                <th>Categoría</th>
                                <th>Cantidad</th>
                                <th>U.Medida</th>
                                <th>Precio Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((item, i) => (
                                <tr
                                    key={i}
                                    className={selectedRow === i ? 'row-selected-ncp' : ''}
                                    onClick={() => setSelectedRow(selectedRow === i ? null : i)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {mode === 'multi' && (
                                        <td style={{ fontSize: '0.82rem', color: '#f97316', fontWeight: 600 }}>
                                            {item.supplierName || '—'}
                                        </td>
                                    )}
                                    <td><strong>{item.supplyName}</strong></td>
                                    <td>{item.category}</td>
                                    <td>{item.quantity}</td>
                                    <td>{item.unitOfMeasure}</td>
                                    <td>C${Number(item.unitPrice).toFixed(2)}</td>
                                    <td>C${Number(item.subtotal).toFixed(2)}</td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={mode === 'multi' ? 7 : 6} className="ncp-empty">
                                        Agrega insumos
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* ── RESUMEN ── */}
                <div className="ncp-summary">
                    <h4>Productos</h4>
                    <hr />
                    <div className="ncp-summary-items">
                        {items.map((it, i) => (
                            <div key={i} className="ncp-summary-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1px', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{it.supplyName}</span>
                                <span style={{ fontSize: '0.78rem', color: '#888' }}>
                                    <span title="Cantidad a comprar">{it.quantity} {it.unitOfMeasure}</span>
                                    {' × '}
                                    <span title="Precio unitario">C${Number(it.unitPrice).toFixed(2)}</span>
                                    <span style={{ marginLeft: '0.5rem', color: '#f97316', fontWeight: 600 }}>
                                        = C${Number(it.subtotal).toFixed(2)}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                    <hr />
                    <div className="ncp-summary-totals">
                        <div className="ncp-total-row">
                            <span>Subtotal:</span>
                            <span>C${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="ncp-total-row">
                            <span>IVA ({taxPct}%):</span>
                            <span>C${tax.toFixed(2)}</span>
                        </div>
                        <div className="ncp-total-row total-final">
                            <span>TOTAL:</span>
                            <span>C${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* ── FOOTER ── */}
            <div className="ncp-footer">
                <div className="ncp-count">
                    Productos adquiridos: <strong>{items.length}</strong>
                </div>
                <button className="btn-regresar-ncp" onClick={() => navigate('/supplies/purchases')}>
                    Regresar
                </button>
                <button className="btn-registrar-ncp" onClick={handleSubmit}>
                    {isEdit ? 'Guardar Cambios' : 'Registrar Compra'}
                </button>
            </div>

            {/* ══════════════════════════════
                MODALES
            ══════════════════════════════ */}
            {modal === 'supplier' && (
                <SelectModal
                    title="Seleccionar Proveedor"
                    items={suppliers}
                    labelKey="name"
                    onSelect={(s) => {
                        setSupplierId(String(s.supplierId));
                        setErrors(p => ({ ...p, supplierId: '' }));
                    }}
                    onClose={() => setModal(null)}
                />
            )}

            {modal === 'itemSupplier' && (
                <SelectModal
                    title="Proveedor del ítem"
                    items={suppliers}
                    labelKey="name"
                    onSelect={(s) => {
                        setItemSupplier(String(s.supplierId));
                        setErrors(p => ({ ...p, itemSupplier: '' }));
                    }}
                    onClose={() => setModal(null)}
                />
            )}

            {modal === 'supply' && (
                <SelectModal
                    title="Seleccionar Insumo"
                    items={supplies}
                    labelKey="name"
                    onSelect={(s) => {
                        setSupplyId(String(s.supplyId));
                        setErrors(p => ({ ...p, supplyId: '' }));
                    }}
                    onClose={() => setModal(null)}
                />
            )}

        </div>
    );
}