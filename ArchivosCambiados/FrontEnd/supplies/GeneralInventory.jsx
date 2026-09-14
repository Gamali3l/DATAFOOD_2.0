import { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getInventoryAnalytics, getSupplyCategories, adjustStock } from '../../api/Supplyapi.js';
import { getSuppliers }        from '../../api/supplierApi';
import SupplyForm              from './Supplyform';
import './GeneralInventory.css';

const SEMAPHORE_LABEL = { GREEN: '🟢', YELLOW: '🟡', RED: '🔴' };

export default function GeneralInventory() {
    const navigate = useNavigate();
    const [supplies,       setSupplies]       = useState([]);
    const [categories,     setCategories]     = useState([]);
    const [suppliers,      setSuppliers]      = useState([]);
    const [search,         setSearch]         = useState('');
    const [catFilter,      setCatFilter]      = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [showSupplierDD, setShowSupplierDD] = useState(false);
    const [showModal,      setShowModal]      = useState(false);
    const [editSupply,     setEditSupply]     = useState(null);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const [sRes, cRes, pRes] = await Promise.all([
                getInventoryAnalytics(),
                getSupplyCategories(),
                getSuppliers(),
            ]);
            setSupplies(sRes.data);
            setCategories(cRes.data);
            setSuppliers(pRes.data);
        } catch (e) { console.error(e); }
    };

    const openEdit   = (supply) => { setEditSupply(supply); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditSupply(null); fetchAll(); };

    const clearFilters = () => {
        setSearch('');
        setCatFilter('');
        setSupplierFilter('');
        setShowSupplierDD(false);
    };

    const filtered = supplies.filter(s => {
        const matchSearch   = s.name.toLowerCase().includes(search.toLowerCase());
        const matchCat      = catFilter      ? String(s.supplyCategoryId) === catFilter  : true;
        const matchSupplier = supplierFilter ? s.lastSupplierName === supplierFilter      : true;
        return matchSearch && matchCat && matchSupplier;
    });

    return (
        <div className="inv-page">

            <div className="inv-header">
                <div className="inv-header-left">
                    <div className="inv-title-block">
                        <h2 className="inv-title">Inventario General de Insumos</h2>
                        <span className="inv-subtitle">
                            Control de stock
                            {supplierFilter && (
                                <span style={{ color: '#f97316', marginLeft: 8 }}>
                                    · Proveedor: <strong>{supplierFilter}</strong>
                                </span>
                            )}
                        </span>
                    </div>
                </div>
                <div className="inv-header-right">
                    <button className="btn-dashboard" onClick={() => navigate('/')}>Principal</button>

                    <div style={{ position: 'relative' }}>
                        <button
                            className="btn-por-proveedor"
                            style={supplierFilter ? { borderColor: '#f97316', color: '#f97316' } : {}}
                            onClick={() => setShowSupplierDD(prev => !prev)}
                        >
                            Por Proveedor {showSupplierDD ? '▲' : '▼'}
                        </button>

                        {showSupplierDD && (
                            <div style={{
                                position: 'absolute', top: '110%', right: 0,
                                background: '#fff', border: '1px solid #e0e0e0',
                                borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                minWidth: '200px', zIndex: 200, overflow: 'hidden',
                            }}>
                                <div
                                    onClick={() => { setSupplierFilter(''); setShowSupplierDD(false); }}
                                    style={{
                                        padding: '0.6rem 1rem', cursor: 'pointer',
                                        fontWeight: !supplierFilter ? 700 : 400,
                                        color: !supplierFilter ? '#f97316' : '#333',
                                        borderBottom: '1px solid #f5f5f5',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    Todos los proveedores
                                </div>
                                {suppliers.map(p => (
                                    <div
                                        key={p.supplierId}
                                        onClick={() => { setSupplierFilter(p.name); setShowSupplierDD(false); }}
                                        style={{
                                            padding: '0.6rem 1rem', cursor: 'pointer',
                                            fontWeight: p.name === supplierFilter ? 700 : 400,
                                            color:      p.name === supplierFilter ? '#f97316' : '#333',
                                            borderBottom: '1px solid #f5f5f5',
                                            fontSize: '0.9rem',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fff5ee'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                    >
                                        {p.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="inv-filters">
                <div className="search-box-inv">
                    <span>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar insumo..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="cat-select"
                    value={catFilter}
                    onChange={e => setCatFilter(e.target.value)}
                >
                    <option value="">Categorías</option>
                    {categories.map(c => (
                        <option key={c.supplyCategoryId} value={String(c.supplyCategoryId)}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <button className="btn-limpiar" onClick={clearFilters}>○ limpiar</button>
            </div>

            {supplierFilter && (
                <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        background: '#fff3e0', border: '1px solid #f97316',
                        borderRadius: '20px', padding: '0.25rem 0.9rem',
                        fontSize: '0.85rem', color: '#f97316', fontWeight: 600,
                    }}>
                        🏭 {supplierFilter}
                        <button
                            onClick={() => setSupplierFilter('')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f97316', marginLeft: 6, fontWeight: 700, fontSize: '1rem' }}
                        >×</button>
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#888' }}>
                        {filtered.length} insumo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
            )}

            <table className="inv-table">
                <thead>
                <tr>
                    <th>Última Compra</th>
                    <th>Insumo</th>
                    <th>Cantidad</th>
                    <th>Unidad Medida</th>
                    <th>Días Restantes</th>
                    <th>Categoría</th>
                    <th>Último Proveedor</th>
                    <th>Acciones</th>
                </tr>
                </thead>
                <tbody>
                {filtered.map(s => (
                    <tr
                        key={s.supplyId}
                        className={s.availableQuantity <= s.minimumQuantity ? 'row-low' : ''}
                    >
                        <td>{s.lastPurchaseDate ? new Date(s.lastPurchaseDate).toLocaleDateString() : '—'}</td>
                        <td>
                            <strong>{s.name}</strong>
                            {s.stockAlert && <span className="badge-alert"> ⚠️ Stock bajo</span>}
                        </td>
                        <td>{s.availableQuantity}</td>
                        <td>{s.unitOfMeasure}</td>
                        <td>
                            {s.daysRemaining != null ? (
                                <span>
                                    {SEMAPHORE_LABEL[s.semaphoreColor] ?? ''} {s.daysRemaining.toFixed(1)} días
                                </span>
                            ) : (
                                <span style={{ color: '#aaa' }}>N/A</span>
                            )}
                        </td>
                        <td>{s.categoryName ?? '—'}</td>
                        <td>{s.lastSupplierName ?? '—'}</td>
                        <td className="inv-actions">
                            <button
                                className="btn-circle btn-edit"
                                title="Editar / Ajustar stock"
                                onClick={() => openEdit(s)}
                            >✏</button>
                        </td>
                    </tr>
                ))}
                {filtered.length === 0 && (
                    <tr><td colSpan={8} className="no-results">Sin resultados</td></tr>
                )}
                </tbody>
            </table>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Editar Insumo</h3>
                        <SupplyForm supply={editSupply} categories={categories} onClose={closeModal} />
                    </div>
                </div>
            )}
        </div>
    );
}