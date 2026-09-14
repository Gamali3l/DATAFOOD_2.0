import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../../api/productosApi';
import { employeeApi } from '../../api/employeeApi';
import axios from 'axios';
import './Sales.css';

const API = import.meta.env.VITE_API_URL;

export default function Ventas({ isDelivery = false }) {
    const navigate = useNavigate();

    const [cajaAbierta,     setCajaAbierta]     = useState(null);
    const [verificandoCaja, setVerificandoCaja] = useState(true);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL}/api/cashregister/active-any`)
            .then(r => r.status === 204 ? null : r.ok ? r.json() : null)
            .then(data => setCajaAbierta(data))
            .catch(() => setCajaAbierta(null))
            .finally(() => setVerificandoCaja(false));
    }, []);

    const [products,   setProducts]   = useState([]);
    const [employees,  setEmployees]  = useState([]);
    const [categories, setCategories] = useState(['Todos']);
    const [loading,    setLoading]    = useState(true);

    const [cart,        setCart]        = useState([]);
    const [searchTerm,  setSearchTerm]  = useState('');
    const [selectedCat, setSelectedCat] = useState('Todos');
    const [deliveryFee, setDeliveryFee] = useState('');
    const [amountPaid,  setAmountPaid]  = useState('');

    const [clientData, setClientData] = useState({ namePhone: '', address: '', driver: '' });
    const [errors,           setErrors]           = useState({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [prodRes, empData] = await Promise.all([
                    getProducts(),
                    employeeApi.getAll(),
                ]);
                setProducts(prodRes.data);
                const isActiveEmp = (emp) => Number(emp.status) === 1;
                const isMotorista = (emp) => {
                    const cargo = (emp.role || '').toLowerCase();
                    return cargo.includes('motocicl') || cargo.includes('motorista') || cargo.includes('repartidor');
                };
                setEmployees(empData.filter(emp => isMotorista(emp) && isActiveEmp(emp)));
                setCategories(['Todos', ...new Set(prodRes.data.map(p => p.categoryName || p.category))]);
            } catch (err) {
                console.error('Error al cargar datos:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredProducts = products.filter(prod => {
        const categoryName = prod.categoryName || prod.category;
        const matchCat    = selectedCat === 'Todos' || categoryName === selectedCat;
        const matchSearch = prod.name.toLowerCase().includes(searchTerm.toLowerCase());
        const isActive    = prod.status === true || prod.status === 1 ||
            prod.active === true || prod.statusName === 'ACTIVO';
        return matchCat && matchSearch && isActive;
    });

    const addToCart = (product) => {
        setCart(prev => {
            const exists = prev.find(i => i.productId === product.productId);
            if (exists) return prev.map(i => i.productId === product.productId ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...product, qty: 1 }];
        });
        if (errors.cart) setErrors({ ...errors, cart: '' });
    };

    const removeFromCart = (productId) => {
        setCart(prev => {
            const exists = prev.find(i => i.productId === productId);
            if (exists && exists.qty > 1) return prev.map(i => i.productId === productId ? { ...i, qty: i.qty - 1 } : i);
            return prev.filter(i => i.productId !== productId);
        });
    };

    const subTotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
    const fee      = Number(deliveryFee) || 0;
    const total    = subTotal + fee;
    const paid     = Number(amountPaid) || 0;
    const change   = paid >= total ? paid - total : 0;

    const validateSale = () => {
        const e = {};
        if (cart.length === 0) e.cart = 'Agrega productos.';
        if (isDelivery) {
            if (!clientData.namePhone.trim()) e.namePhone = 'Requerido.';
            if (!clientData.address.trim())   e.address   = 'Requerido.';
            if (!clientData.driver)           e.driver    = 'Selecciona motorista.';
        }
        if (!amountPaid || paid < total) e.amountPaid = 'Monto insuficiente.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handlePreSubmit = () => { if (validateSale()) setShowConfirmModal(true); };

    const handleConfirmarVenta = async () => {
        const currentUser = JSON.parse(sessionStorage.getItem('datafood_user') || '{}');
        const empId = currentUser.employeeId || 1;
        const payload = {
            clientName:  clientData.namePhone,
            address:     clientData.address,
            deliveryFee: fee,
            isDelivery,
            employeeId:  empId,
            driverId:    isDelivery ? Number(clientData.driver) : null,
            details: cart.map(i => ({
                productId: i.productId,
                quantity:  Number(i.qty),
                unitPrice: i.price,
            })),
        };
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/sales`, payload);
            setShowConfirmModal(false);
            setShowSuccessModal(true);
            setCart([]);
            setClientData({ namePhone: '', address: '', driver: '' });
            setDeliveryFee('');
            setAmountPaid('');
        } catch (err) {
            console.error(err);
            alert('Error al procesar la venta en el servidor.');
        }
    };

    const selectedDriver = employees.find(e => String(e.id) === String(clientData.driver));
    const driverName     = selectedDriver ? `${selectedDriver.name || ''} ${selectedDriver.lastName || ''}`.trim() : '—';

    const getProductImage = (prod) => prod.imageUrl ? `${API}${prod.imageUrl}` : null;

    if (verificandoCaja) {
        return (
            <div style={bloqueStyle.overlay}>
                <div style={bloqueStyle.card}>
                    <p style={{ color: '#f97316', fontWeight: 700, margin: 0 }}>Verificando estado de caja...</p>
                </div>
            </div>
        );
    }

    if (!cajaAbierta) {
        return (
            <div style={bloqueStyle.overlay}>
                <div style={bloqueStyle.card}>
                    <div style={bloqueStyle.icon}>🔒</div>
                    <h2 style={bloqueStyle.title}>Caja no abierta</h2>
                    <p style={bloqueStyle.text}>No puedes registrar ventas sin una caja abierta.<br />Ve a Principal y abre la caja primero.</p>
                    <button style={bloqueStyle.btn} onClick={() => navigate('/')}>Principal</button>
                </div>
            </div>
        );
    }

    return (
        <div className="ventas-page">

            <div className="ventas-left">
                <div className="ventas-filters-top">
                    <div className="ventas-search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar platillo..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="ventas-tabs">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`tab-btn ${selectedCat === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCat(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="ventas-table-container">
                    {loading ? (
                        <p style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Cargando productos...</p>
                    ) : (
                        <table className="ventas-table">
                            <thead>
                            <tr>
                                <th className="col-img">Imagen</th>
                                <th>Categoría</th>
                                <th>Platillo</th>
                                <th>Precio</th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredProducts.map((prod, idx) => (
                                <tr key={prod.productId} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                                    <td className="col-img">
                                        {getProductImage(prod)
                                            ? <img src={getProductImage(prod)} alt={prod.name} className="ventas-prod-thumb" />
                                            : <div className="ventas-prod-thumb-empty">📷</div>
                                        }
                                    </td>
                                    <td className="col-cat">{prod.categoryName || prod.category}</td>
                                    <td className="col-name">{prod.name}</td>
                                    <td className="col-price">C$ {prod.price}</td>
                                    <td className="col-acc actions-td">
                                        <div className="actions-inner">
                                            <button className="btn-qty plus"  onClick={() => addToCart(prod)}>+</button>
                                            <button className="btn-qty minus" onClick={() => removeFromCart(prod.productId)}>−</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No hay productos.</td></tr>
                            )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="ventas-bottom-left">
                    <button className="btn-regresar-ventas" onClick={() => navigate('/')}>Principal</button>
                </div>
            </div>

            <div className="ventas-right">
                <div className="panel-header">{isDelivery ? 'Venta Domicilio' : 'Venta Local'}</div>

                <div className="receipt-box">
                    <div className="receipt-title">Recibo</div>
                    <div className="receipt-items">
                        {cart.length === 0 ? (
                            <p style={{ color: '#999', textAlign: 'center' }}>Carrito vacío</p>
                        ) : (
                            cart.map((item, idx) => (
                                <div className="receipt-item" key={item.productId}>
                                    <span>{idx + 1}. {item.name} (x{item.qty})</span>
                                    <span>C$ {(item.price * item.qty).toFixed(2)}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="receipt-total-actual">Total: C$ {subTotal.toFixed(2)}</div>
                </div>

                {isDelivery && (
                    <div className="delivery-form">
                        <div className="delivery-grid">
                            <label>Cliente</label>
                            <input className={errors.namePhone ? 'ventas-input-error' : ''} value={clientData.namePhone} onChange={e => setClientData({ ...clientData, namePhone: e.target.value })} placeholder="Nombre y Teléfono" />
                            <label>Dirección</label>
                            <input className={errors.address ? 'ventas-input-error' : ''} value={clientData.address} onChange={e => setClientData({ ...clientData, address: e.target.value })} placeholder="Dirección de entrega" />
                            <label>Motorista</label>
                            <select className={errors.driver ? 'ventas-input-error' : ''} value={clientData.driver} onChange={e => setClientData({ ...clientData, driver: e.target.value })}>
                                <option value="">-- Seleccionar Motorista --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name} {emp.lastName}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="totals-box">
                    <div className="total-row">
                        <span>Sub-total</span>
                        <input type="text" readOnly value={`C$ ${subTotal.toFixed(2)}`} />
                    </div>
                    {isDelivery && (
                        <div className="total-row">
                            <span>Envío (C$)</span>
                            <input type="number" min="0" placeholder="0.00" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} />
                        </div>
                    )}
                    <div className="total-final">
                        <span>Total (C$)</span>
                        <span className="total-amount">C$ {total.toFixed(2)}</span>
                    </div>
                    <div className={`total-row ${errors.amountPaid ? 'row-error' : ''}`}>
                        <span>Monto pagado</span>
                        <input type="number" min="0" placeholder="0.00" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} style={{ borderColor: errors.amountPaid ? '#ef4444' : undefined }} />
                    </div>
                    <div className="total-row cambio-row">
                        <span>Cambio</span>
                        <input type="text" readOnly value={paid >= total && total > 0 ? `C$ ${change.toFixed(2)}` : 'C$ 0.00'}
                               style={{ background: paid >= total && total > 0 ? '#dcfce7' : '#f3f4f6', color: paid >= total && total > 0 ? '#15803d' : '#888', fontWeight: 700 }} />
                    </div>
                </div>

                {errors.amountPaid && (
                    <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', textAlign: 'right' }}>{errors.amountPaid}</p>
                )}

                <button className="btn-finalizar" onClick={handlePreSubmit}>Finalizar Venta</button>
            </div>

            {/* ── MODAL CONFIRMAR ── */}
            {showConfirmModal && (
                <div className="confirm-modal-overlay" onClick={() => setShowConfirmModal(false)}>
                    <div className="confirm-modal-box" onClick={e => e.stopPropagation()}>
                        <div className="cm-header">
                            <span className="cm-icon">🧾</span>
                            <h2 className="cm-title">Confirmar Venta</h2>
                            <button className="cm-close" onClick={() => setShowConfirmModal(false)}>✕</button>
                        </div>
                        <div className="cm-badge-type">{isDelivery ? '🛵 Venta a Domicilio' : '🏠 Venta Local'}</div>
                        <div className="cm-section-title">Productos</div>
                        <div className="cm-items">
                            {cart.map((item, idx) => (
                                <div className="cm-item-row" key={item.productId}>
                                    <span className="cm-item-name">{idx + 1}. {item.name}<span className="cm-item-qty"> ×{item.qty}</span></span>
                                    <span className="cm-item-price">C$ {(item.price * item.qty).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        {isDelivery && (
                            <>
                                <div className="cm-section-title">Entrega</div>
                                <div className="cm-info-grid">
                                    <div className="cm-info-row"><span className="cm-info-label">Cliente</span><span className="cm-info-val">{clientData.namePhone || '—'}</span></div>
                                    <div className="cm-info-row"><span className="cm-info-label">Dirección</span><span className="cm-info-val">{clientData.address || '—'}</span></div>
                                    <div className="cm-info-row"><span className="cm-info-label">Motorista</span><span className="cm-info-val">{driverName}</span></div>
                                </div>
                            </>
                        )}
                        <div className="cm-section-title">Resumen de pago</div>
                        <div className="cm-totals">
                            <div className="cm-total-row"><span>Sub-total</span><strong>C$ {subTotal.toFixed(2)}</strong></div>
                            {isDelivery && fee > 0 && <div className="cm-total-row"><span>Envío</span><strong>C$ {fee.toFixed(2)}</strong></div>}
                            <div className="cm-total-row cm-total-highlight"><span>Total</span><strong>C$ {total.toFixed(2)}</strong></div>
                            <div className="cm-total-row"><span>Monto recibido</span><strong>C$ {paid.toFixed(2)}</strong></div>
                            <div className="cm-total-row cm-cambio-highlight"><span>Cambio</span><strong>C$ {change.toFixed(2)}</strong></div>
                        </div>
                        <div className="cm-actions">
                            <button className="cm-btn-cancel" onClick={() => setShowConfirmModal(false)}>Cancelar</button>
                            <button className="cm-btn-confirm" onClick={handleConfirmarVenta}>✓ Confirmar Venta</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL ÉXITO ── */}
            {showSuccessModal && (
                <div className="confirm-modal-overlay">
                    <div className="confirm-modal-box success-modal">
                        <div className="success-icon-wrapper"><div className="success-check">✓</div></div>
                        <h2 className="success-title">Venta realizada con éxito</h2>
                        <p className="success-text">La venta se guardó correctamente en el sistema.</p>
                        <div className="cm-actions">
                            <button className="cm-btn-confirm" onClick={() => setShowSuccessModal(false)}>Aceptar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const bloqueStyle = {
    overlay: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
    card: { background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '2.5rem', maxWidth: '400px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },
    icon:  { fontSize: '3rem' },
    title: { margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#333' },
    text:  { margin: 0, color: '#666', fontSize: '0.95rem', lineHeight: 1.5 },
    btn:   { marginTop: '0.5rem', padding: '0.7rem 1.8rem', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' },
};