import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    getSupplyCategories,
    createSupplyCategory,
    updateSupplyCategory,
    deleteSupplyCategory,
    getSupplies,
    createSupply,
    updateSupply,
    deleteSupply,
} from '../../api/Supplyapi.js';

import './AdminSupplies.css';

export default function AdminSupplies() {

    const navigate = useNavigate();

    // ── Categorías ─────────────────────────────
    const [categories,  setCategories]  = useState([]);
    const [catSearch,   setCatSearch]   = useState('');
    const [showCatForm, setShowCatForm] = useState(false);
    const [catFormName, setCatFormName] = useState('');
    const [editCatId,   setEditCatId]   = useState(null);

    // ── Insumos ───────────────────────────────
    const [supplies,     setSupplies]     = useState([]);
    const [newSupName,   setNewSupName]   = useState('');
    const [newSupUnit,   setNewSupUnit]   = useState('');
    const [newSupMinQty, setNewSupMinQty] = useState(0);
    const [newSupCatId,  setNewSupCatId]  = useState('');
    const [editSupplyId, setEditSupplyId] = useState(null);

    // ── Modal categoría ───────────────────────
    const [catModalOpen,   setCatModalOpen]   = useState(false);
    const [catDropSearch,  setCatDropSearch]  = useState('');

    // ── FETCH ALL ─────────────────────────────
    const fetchAll = async () => {
        try {
            const [cRes, sRes] = await Promise.all([
                getSupplyCategories(),
                getSupplies(),
            ]);
            setCategories(cRes.data);
            setSupplies(sRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // ── CATEGORÍAS ────────────────────────────

    const openNewCat = () => {
        setEditCatId(null);
        setCatFormName('');
        setShowCatForm(true);
    };

    const openEditCat = (c) => {
        setEditCatId(c.supplyCategoryId);
        setCatFormName(c.name);
        setShowCatForm(true);
    };

    const saveCat = async () => {
        if (!catFormName.trim()) return;
        try {
            if (editCatId) {
                await updateSupplyCategory(editCatId, { name: catFormName });
            } else {
                await createSupplyCategory({ name: catFormName });
            }
            setShowCatForm(false);
            setCatFormName('');
            setEditCatId(null);
            await fetchAll();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteCat = async (id) => {
        if (!window.confirm('¿Eliminar esta categoría?')) return;
        try {
            await deleteSupplyCategory(id);
            await fetchAll();
        } catch (err) {
            console.error(err);
            alert('No se puede eliminar porque tiene insumos asignados.');
        }
    };

    // ── INSUMOS ───────────────────────────────

    const openEditSupply = (s) => {
        setEditSupplyId(s.supplyId);
        setNewSupName(s.name);
        setNewSupUnit(s.unitOfMeasure);
        setNewSupMinQty(s.minimumQuantity);
        setNewSupCatId(String(s.supplyCategoryId));
        document.querySelector('.sup-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const cancelEditSupply = () => {
        setEditSupplyId(null);
        setNewSupName('');
        setNewSupUnit('');
        setNewSupMinQty(0);
        setNewSupCatId('');
    };

    const saveSupply = async () => {
        if (!newSupName.trim() || !newSupCatId) return;
        try {
            const payload = {
                name:              newSupName,
                unitOfMeasure:     newSupUnit || 'Und',
                availableQuantity: 0,
                minimumQuantity:   Number(newSupMinQty),
                supplyCategoryId:  Number(newSupCatId),
            };
            if (editSupplyId) {
                await updateSupply(editSupplyId, payload);
            } else {
                await createSupply(payload);
            }
            cancelEditSupply();
            await fetchAll();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteSupplyItem = async (id) => {
        if (!window.confirm('¿Eliminar este insumo?')) return;
        try {
            await deleteSupply(id);
            if (editSupplyId === id) cancelEditSupply();
            await fetchAll();
        } catch (err) {
            console.error(err);
            alert('No se pudo eliminar el insumo.');
        }
    };

    const closeCatModal = () => {
        setCatModalOpen(false);
        setCatDropSearch('');
    };

    // ── FILTROS ───────────────────────────────
    const filteredCats = categories.filter((c) =>
        c.name.toLowerCase().includes(catSearch.toLowerCase())
    );

    const filteredDropCats = categories.filter((c) =>
        c.name.toLowerCase().includes(catDropSearch.toLowerCase())
    );

    const selectedCatName = newSupCatId
        ? categories.find(c => String(c.supplyCategoryId) === newSupCatId)?.name
        : null;

    // ── RENDER ────────────────────────────────
    return (
        <div className="admin-page">

            <div className="admin-topbar">
                <button className="btn-teal" onClick={() => navigate('/')}>
                    Principal
                </button>
            </div>

            <div className="admin-layout">

                {/* ── PANEL CATEGORÍAS ── */}
                <div className="admin-panel">

                    <div className="admin-panel-header">
                        <h3>Administrar Categorías</h3>
                        <button className="btn-teal" onClick={openNewCat}>
                            + Nueva
                        </button>
                    </div>

                    {showCatForm && (
                        <div className="cat-form-popup">
                            <input
                                placeholder="Nombre de categoría"
                                value={catFormName}
                                onChange={(e) => setCatFormName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveCat()}
                                autoFocus
                            />
                            <div className="cat-form-btns">
                                <button className="btn-save-cat" onClick={saveCat}>
                                    Guardar
                                </button>
                                <button className="btn-cancel-cat" onClick={() => setShowCatForm(false)}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="search-box-admin">
                        <span>🔍</span>
                        <input
                            placeholder="Buscar categoría"
                            value={catSearch}
                            onChange={(e) => setCatSearch(e.target.value)}
                        />
                    </div>

                    <div className="cat-chips">
                        {filteredCats.length === 0 && (
                            <p className="cat-chips-empty">Sin categorías</p>
                        )}
                        {filteredCats.map((c) => (
                            <div key={c.supplyCategoryId} className="cat-chip">
                                <span className="cat-chip-name">{c.name}</span>
                                <button
                                    className="cat-chip-btn edit"
                                    title="Editar"
                                    onClick={() => openEditCat(c)}
                                >✏️</button>
                                <button
                                    className="cat-chip-btn delete"
                                    title="Eliminar"
                                    onClick={() => deleteCat(c.supplyCategoryId)}
                                >🗑️</button>
                            </div>
                        ))}
                    </div>

                </div>

                {/* ── PANEL INSUMOS ── */}
                <div className="admin-panel">

                    <div className="admin-panel-header">
                        <h3>Administrar Insumos</h3>
                    </div>

                    <div className="sup-form">
                        <p className="sup-form-title">
                            {editSupplyId ? '✏️ Editar Insumo' : 'Agregar Nuevo Insumo'}
                        </p>

                        <div className="sup-form-row">

                            <div className="sup-form-group">
                                <label>Nombre</label>
                                <input
                                    value={newSupName}
                                    onChange={(e) => setNewSupName(e.target.value)}
                                />
                            </div>

                            <div className="sup-form-group">
                                <label>Unidad</label>
                                <input
                                    value={newSupUnit}
                                    onChange={(e) => setNewSupUnit(e.target.value)}
                                />
                            </div>

                            <div className="sup-form-group">
                                <label>Stock mínimo</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={newSupMinQty}
                                    onChange={(e) => setNewSupMinQty(e.target.value)}
                                    onBlur={(e) => setNewSupMinQty(Number(e.target.value) || 0)}
                                />
                            </div>

                            <div className="sup-form-group">
                                <label>Categoría</label>
                                <div className="cat-select-row">
                                    <span className="cat-selected-display">
                                        {selectedCatName
                                            ? selectedCatName
                                            : <span className="cat-none">Sin categoría</span>
                                        }
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-teal btn-cat-pick"
                                        onClick={() => setCatModalOpen(true)}
                                    >
                                        {selectedCatName ? 'Cambiar' : 'Seleccionar'}
                                    </button>
                                </div>
                            </div>

                        </div>

                        <div className="sup-form-btns">
                            {editSupplyId && (
                                <button className="btn-cancel-cat" onClick={cancelEditSupply}>
                                    Cancelar
                                </button>
                            )}
                            <button className="btn-teal" onClick={saveSupply}>
                                {editSupplyId ? 'Guardar Cambios' : 'Guardar Nuevo'}
                            </button>
                        </div>
                    </div>

                    <div className="table-scroll">
                        <table className="admin-table">
                            <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Categoría</th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {supplies.map((s) => (
                                <tr
                                    key={s.supplyId}
                                    className={editSupplyId === s.supplyId ? 'row-editing' : ''}
                                >
                                    <td>INS-{String(s.supplyId).padStart(3, '0')}</td>
                                    <td>{s.name}</td>
                                    <td>{s.categoryName ?? '—'}</td>
                                    <td className="admin-actions">
                                        <button onClick={() => openEditSupply(s)}>✏️</button>
                                        <button onClick={() => deleteSupplyItem(s.supplyId)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                            {supplies.length === 0 && (
                                <tr>
                                    <td colSpan={4}>Sin insumos</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

            {/* ── MODAL SELECCIÓN CATEGORÍA ── */}
            {catModalOpen && (
                <div className="cat-modal-backdrop" onClick={closeCatModal}>
                    <div className="cat-modal" onClick={e => e.stopPropagation()}>

                        <div className="cat-modal-header">
                            <span>Seleccionar Categoría</span>
                            <button className="cat-modal-close" onClick={closeCatModal}>✕</button>
                        </div>

                        <div className="cat-modal-search">
                            <span>🔍</span>
                            <input
                                placeholder="Buscar categoría..."
                                value={catDropSearch}
                                onChange={e => setCatDropSearch(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="cat-modal-list">
                            {filteredDropCats.map(c => (
                                <div
                                    key={c.supplyCategoryId}
                                    className={`cat-modal-item ${String(c.supplyCategoryId) === newSupCatId ? 'selected' : ''}`}
                                    onClick={() => {
                                        setNewSupCatId(String(c.supplyCategoryId));
                                        closeCatModal();
                                    }}
                                >
                                    <span>{c.name}</span>
                                    {String(c.supplyCategoryId) === newSupCatId && (
                                        <span className="cat-modal-check">✓</span>
                                    )}
                                </div>
                            ))}
                            {filteredDropCats.length === 0 && (
                                <div className="cat-modal-empty">Sin resultados</div>
                            )}
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}