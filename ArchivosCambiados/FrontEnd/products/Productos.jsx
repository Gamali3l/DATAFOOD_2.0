import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    getProductCategories, createProductCategory, updateProductCategory, deleteProductCategory,
    getProducts, createProduct, updateProduct, deleteProduct, toggleProductStatus,
    getRecipe, saveRecipe, getCosting
} from '../../api/productosApi';
import { getSupplies } from '../../api/Supplyapi';
import './Productos.css';


const API = import.meta.env.VITE_API_URL;

export default function Productos() {
    const navigate = useNavigate();
    const location = useLocation();
    const [view, setView] = useState(location.state?.view || 'lista');

    const [categories, setCategories] = useState([]);
    const [products,   setProducts]   = useState([]);
    const [loading,    setLoading]    = useState(false);
    const [error,      setError]      = useState('');

    const [selectedCatTab, setSelectedCatTab] = useState(null);
    const [searchList,     setSearchList]     = useState('');
    const [filterStatus,   setFilterStatus]   = useState('');
    const [filterLetter,   setFilterLetter]   = useState('');

    const [catForm,  setCatForm]  = useState({ id: null, name: '' });
    // ── description agregado ──
    const [prodForm, setProdForm] = useState({ id: null, name: '', productCategoryId: '', price: '', description: '' });
    const [errors,   setErrors]   = useState({});

    const [adminSearch,    setAdminSearch]    = useState('');
    const [adminCatFilter, setAdminCatFilter] = useState('');

    const [imageFile,    setImageFile]    = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    // ── Receta (Costeo) ──
    const [supplies,       setSupplies]       = useState([]);
    const [recipeItems,    setRecipeItems]    = useState([]); // [{supplyId, supplyName, unitOfMeasure, quantity, unitCost, subtotal}]
    const [recipeSupplyId, setRecipeSupplyId] = useState('');
    const [recipeQuantity, setRecipeQuantity] = useState('');
    const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }
    const [costingMap, setCostingMap] = useState({}); // { [productId]: { productionCost, marginAmount, marginPercent } }

    useEffect(() => { loadCategories(); }, []);
    useEffect(() => { loadSupplies(); }, []);
    useEffect(() => { loadProducts(); }, [selectedCatTab, filterStatus, searchList, filterLetter]);
    useEffect(() => { if (location.state?.view) setView(location.state.view); }, [location.state]);
    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(''), 4000);
        return () => clearTimeout(timer);
    }, [error]);

    const loadCategories = async () => {
        try {
            const { data } = await getProductCategories();
            setCategories(data);
        } catch { setError('No se pudieron cargar las categorías.'); }
    };

    const loadSupplies = async () => {
        try {
            const { data } = await getSupplies();
            setSupplies(data);
        } catch { /* no bloquea el resto del formulario si falla */ }
    };

    const loadRecipeForProduct = async (productId) => {
        try {
            const { data } = await getRecipe(productId);
            setRecipeItems(data.map(item => ({
                supplyId:      item.supplyId,
                supplyName:    item.supplyName,
                unitOfMeasure: item.unitOfMeasure,
                quantity:      item.quantity,
                unitCost:      item.unitCost,
                subtotal:      item.subtotal,
            })));
        } catch { setRecipeItems([]); }
    };

    const handleAddRecipeItem = () => {
        if (!recipeSupplyId || !recipeQuantity || Number(recipeQuantity) <= 0) return;
        const supply = supplies.find(s => s.supplyId === Number(recipeSupplyId));
        if (!supply) return;

        const quantity = Number(recipeQuantity);
        const unitCost = supply.averageCost ?? 0;
        const newItem = {
            supplyId:      supply.supplyId,
            supplyName:    supply.name,
            unitOfMeasure: supply.unitOfMeasure,
            quantity,
            unitCost,
            subtotal: quantity * unitCost,
        };

        setRecipeItems(prev => {
            const idx = prev.findIndex(i => i.supplyId === supply.supplyId);
            if (idx >= 0) { const copy = [...prev]; copy[idx] = newItem; return copy; }
            return [...prev, newItem];
        });
        if (errors.prodRecipe) setErrors({ ...errors, prodRecipe: '' });
        setRecipeSupplyId('');
        setRecipeQuantity('');
    };

    const handleRemoveRecipeItem = (supplyId) => {
        setRecipeItems(prev => prev.filter(i => i.supplyId !== supplyId));
    };

    const recipeTotal = recipeItems.reduce((sum, i) => sum + i.subtotal, 0);

    const loadCostingForProducts = async (productList) => {
        const entries = await Promise.all(
            productList.map(async (p) => {
                try {
                    const { data } = await getCosting(p.productId);
                    return [p.productId, data];
                } catch {
                    return [p.productId, null]; // sin receta o sin datos — no rompe la tabla
                }
            })
        );
        setCostingMap(Object.fromEntries(entries));
    };

    const loadProducts = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = {};
            if (selectedCatTab !== null) params.categoryId = selectedCatTab;
            if (filterStatus !== '')     params.status     = filterStatus;
            if (searchList.trim())       params.search     = searchList.trim();
            if (filterLetter)            params.letter     = filterLetter;
            const { data } = await getProducts(params);
            const filtered = filterLetter
                ? data.filter(p => p.name.toUpperCase().startsWith(filterLetter))
                : data;
            setProducts(filtered);
            loadCostingForProducts(filtered);
        } catch { setError('No se pudieron cargar los productos.'); }
        finally  { setLoading(false); }
    }, [selectedCatTab, filterStatus, searchList, filterLetter]);

    const handleToggleStatus = async (id) => {
        try {
            const { data: updated } = await toggleProductStatus(id);
            setProducts(prev => prev.map(p => p.productId === id ? updated : p));
        } catch { setError('Error al cambiar el estado del producto.'); }
    };

    const validateCategory = () => {
        const errs = {};
        if (!catForm.name.trim()) errs.catName = 'El nombre es obligatorio.';
        else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(catForm.name)) errs.catName = 'Solo letras.';
        setErrors(errs); return Object.keys(errs).length === 0;
    };

    const validateProduct = () => {
        const errs = {};
        if (!prodForm.name.trim())       errs.prodName     = 'El nombre es obligatorio.';
        if (!prodForm.productCategoryId) errs.prodCategory = 'Seleccione una categoría.';
        if (!prodForm.price || isNaN(prodForm.price) || Number(prodForm.price) <= 0)
            errs.prodPrice = 'Debe ser mayor a 0.';
        if (recipeItems.length === 0)
            errs.prodRecipe = 'Agregue al menos un insumo a la receta.';
        setErrors(errs); return Object.keys(errs).length === 0;
    };

    const uploadImage = async (productId) => {
        if (!imageFile) return;
        const formData = new FormData();
        formData.append('image', imageFile);
        await fetch(`${API}/api/products/${productId}/image`, { method: 'POST', body: formData });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const resetProdForm = () => {
        // ── description incluido en reset ──
        setProdForm({ id: null, name: '', productCategoryId: '', price: '', description: '' });
        setErrors({});
        clearImage();
        setRecipeItems([]);
        setRecipeSupplyId('');
        setRecipeQuantity('');
    };

    const handleSaveNewCat = async () => {
        if (!validateCategory()) return;
        try {
            await createProductCategory({ name: catForm.name });
            setCatForm({ id: null, name: '' }); setErrors({});
            await loadCategories();
        } catch (e) { setError(e.response?.data?.message || 'Error al guardar categoría.'); }
    };

    const handleSaveEditCat = async () => {
        if (!catForm.id || !validateCategory()) return;
        try {
            await updateProductCategory(catForm.id, { name: catForm.name });
            setCatForm({ id: null, name: '' }); setErrors({});
            await loadCategories(); await loadProducts();
        } catch (e) { setError(e.response?.data?.message || 'Error al actualizar categoría.'); }
    };

    const handleDeleteCat = (id) => {
        setConfirmModal({
            message: '¿Eliminar esta categoría?',
            onConfirm: async () => {
                setConfirmModal(null);
                try { await deleteProductCategory(id); await loadCategories(); await loadProducts(); }
                catch { setError('No se puede eliminar: tiene platillos asociados.'); }
            },
        });
    };

    const handleSaveNewProd = async () => {
        if (!validateProduct()) return;
        try {
            const { data: created } = await createProduct({
                name:              prodForm.name,
                productCategoryId: Number(prodForm.productCategoryId),
                price:             Number(prodForm.price),
                description:       prodForm.description.trim() || null, // ── nuevo
            });
            if (imageFile) await uploadImage(created.productId);
            if (recipeItems.length > 0) {
                await saveRecipe(created.productId, recipeItems.map(i => ({ supplyId: i.supplyId, quantity: i.quantity })));
            }
            resetProdForm();
            await loadProducts();
            setView('admin');
        } catch (e) { setError(e.response?.data?.message || 'Error al guardar producto.'); }
    };

    const handleSaveEditProd = async () => {
        if (!prodForm.id || !validateProduct()) return;
        try {
            await updateProduct(prodForm.id, {
                name:              prodForm.name,
                productCategoryId: Number(prodForm.productCategoryId),
                price:             Number(prodForm.price),
                description:       prodForm.description.trim() || null, // ── nuevo
            });
            if (imageFile) await uploadImage(prodForm.id);
            await saveRecipe(prodForm.id, recipeItems.map(i => ({ supplyId: i.supplyId, quantity: i.quantity })));
            resetProdForm();
            await loadProducts();
            setView('admin');
        } catch (e) { setError(e.response?.data?.message || 'Error al actualizar producto.'); }
    };

    const handleDeleteProd = (id) => {
        setConfirmModal({
            message: '¿Eliminar este platillo?',
            onConfirm: async () => {
                setConfirmModal(null);
                try { await deleteProduct(id); await loadProducts(); }
                catch (e) { setError(e.response?.data?.message || 'Error al eliminar el platillo.'); }
            },
        });
    };

    // ── description cargado al editar ──
    const handleEditProd = (prod) => {
        setProdForm({
            id:                prod.productId,
            name:              prod.name,
            productCategoryId: prod.productCategoryId,
            price:             prod.price,
            description:       prod.description || '',
        });
        setErrors({});
        clearImage();
        if (prod.imageUrl) setImagePreview(`${API}${prod.imageUrl}`);
        loadRecipeForProduct(prod.productId);
    };

    const adminFiltered = products.filter(p => {
        const matchName = p.name.toLowerCase().includes(adminSearch.toLowerCase());
        const matchCat  = !adminCatFilter || p.productCategoryId === Number(adminCatFilter);
        return matchName && matchCat;
    });

    const getProductImage = (prod) =>
        prod.imageUrl ? `${API}${prod.imageUrl}` : null;

    // ── Lista pública ordenada por margen de ganancia (de mayor a menor) ──
    const sortedProducts = [...products].sort((a, b) => {
        const marginA = costingMap[a.productId]?.marginAmount ?? -Infinity;
        const marginB = costingMap[b.productId]?.marginAmount ?? -Infinity;
        return marginB - marginA;
    });

    return (
        <div className="prod-page">
            {view !== 'form' && (
                <div className="prod-top-actions">
                    <button className="btn-regresar" onClick={() => navigate('/')}>Principal</button>
                    <button className="btn-admin-toggle" onClick={() => setView(view === 'lista' ? 'admin' : 'lista')}>
                        {view === 'lista' ? '⚙️ Administrar Productos y Categorías' : '📋 Ver Lista de Productos'}
                    </button>
                </div>
            )}

            {error && (
                <div className="prod-error">
                    {error}
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}

            {/* ══════════════ VISTA LISTA ══════════════ */}
            {view === 'lista' && (
                <div className="prod-list-container">
                    <div className="prod-filters">
                        <select className="prod-select" value={selectedCatTab ?? ''} onChange={e => setSelectedCatTab(e.target.value === '' ? null : Number(e.target.value))}>
                            <option value="">Categoría</option>
                            {categories.map(c => <option key={c.productCategoryId} value={c.productCategoryId}>{c.name}</option>)}
                        </select>
                        <select className="prod-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="">Estado</option>
                            <option value="1">Activo</option>
                            <option value="0">Inactivo</option>
                        </select>
                        <select
                            className={`prod-letter-select ${filterLetter ? 'active-filter' : ''}`}
                            value={filterLetter}
                            onChange={e => setFilterLetter(e.target.value)}
                        >
                            <option value="">A – Z</option>
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                                <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                        <div className="prod-search">
                            <span>🔍</span>
                            <input type="text" placeholder="Buscar platillo..." value={searchList} onChange={e => setSearchList(e.target.value)} />
                        </div>
                    </div>

                    <div className="prod-tabs">
                        <button className={`prod-tab ${selectedCatTab === null ? 'active' : ''}`} onClick={() => setSelectedCatTab(null)}>Todos</button>
                        {categories.map(c => (
                            <button key={c.productCategoryId} className={`prod-tab ${selectedCatTab === c.productCategoryId ? 'active' : ''}`} onClick={() => setSelectedCatTab(c.productCategoryId)}>{c.name}</button>
                        ))}
                    </div>

                    {loading ? <p style={{ padding: '20px', textAlign: 'center' }}>Cargando...</p> : (
                        <div className="table-scroll-lg">
                            <table className="prod-table">
                                <thead><tr><th>Imagen</th><th>Categoría</th><th>Nombre Platillo</th><th>Descripción</th><th>Estado</th><th>Precio</th><th>Costo Producción</th><th>Margen C$</th><th>Acciones</th></tr></thead>
                                <tbody>
                                {sortedProducts.map(p => {
                                    const costing = costingMap[p.productId];
                                    return (
                                    <tr key={p.productId}>
                                        <td>
                                            {getProductImage(p)
                                                ? <img src={getProductImage(p)} alt={p.name} className="prod-thumb" />
                                                : <div className="prod-thumb-empty">📷</div>
                                            }
                                        </td>
                                        <td className="cat-highlight">{p.categoryName}</td>
                                        <td className="fw-bold">{p.name}</td>
                                        <td style={{ fontSize: '0.82rem', color: '#666', maxWidth: '180px' }}>
                                            {p.description || <span style={{ color: '#bbb' }}>—</span>}
                                        </td>
                                        <td className={p.status === 1 ? 'text-active' : 'text-inactive'}>{p.status === 1 ? 'ACTIVO' : 'INACTIVO'}</td>
                                        <td>C$ {Number(p.price).toFixed(0)}</td>
                                        <td>{costing ? `C$ ${Number(costing.productionCost).toFixed(2)}` : <span style={{ color: '#bbb' }}>—</span>}</td>
                                        <td style={{ fontWeight: 700, color: costing && costing.marginAmount >= 0 ? '#20b2aa' : '#ef4444' }}>
                                            {costing ? `C$ ${Number(costing.marginAmount).toFixed(2)}` : <span style={{ color: '#bbb', fontWeight: 400 }}>—</span>}
                                        </td>
                                        <td>
                                            <label className="prod-switch">
                                                <input type="checkbox" checked={p.status === 1} onChange={() => handleToggleStatus(p.productId)} />
                                                <span className="prod-slider"></span>
                                            </label>
                                        </td>
                                    </tr>
                                    );
                                })}
                                {products.length === 0 && <tr><td colSpan="9" className="text-center">No hay productos.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="watermark">Platillos</div>
                </div>
            )}

            {/* ══════════════ VISTA ADMIN ══════════════ */}
            {view === 'admin' && (
                <>

                    <div className="prod-admin-grid">

                        {/* ── Panel Categorías ── */}
                        <div className="admin-panel">
                            <div className="admin-header">🗂️ Administrar Categorías</div>
                            <div className="admin-body">
                                <div className="cat-input-row">
                                    <input
                                        type="text"
                                        className={errors.catName ? 'input-error' : ''}
                                        placeholder="Nombre de categoría..."
                                        value={catForm.name}
                                        onChange={e => { setCatForm({ ...catForm, name: e.target.value }); if (errors.catName) setErrors({ ...errors, catName: '' }); }}
                                    />
                                </div>
                                {errors.catName && <span className="error-text" style={{ marginBottom: '8px', display: 'block' }}>{errors.catName}</span>}
                                <div className="cat-action-row">
                                    <button className="btn-save-new" onClick={handleSaveNewCat}>+ Guardar Nuevo</button>
                                    <button className="btn-save-edit" onClick={handleSaveEditCat} disabled={!catForm.id}>✏️ Guardar Cambios</button>
                                </div>

                                <div className="table-scroll">
                                    <table className="admin-table">
                                        <thead>
                                        <tr>
                                            <th style={{ background: '#444' }}>Categoría</th>
                                            <th style={{ background: '#444', width: '72px', textAlign: 'right' }}>Acc.</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {categories.map(c => (
                                            <tr key={c.productCategoryId} className={catForm.id === c.productCategoryId ? 'row-selected' : ''}>
                                                <td className="fw-bold">{c.name}</td>
                                                <td>
                                                    <div className="actions-cell">
                                                        <button className="icon-btn" title="Editar" onClick={() => { setCatForm({ id: c.productCategoryId, name: c.name }); setErrors({}); }}>✏️</button>
                                                        <button className="icon-btn" title="Eliminar" onClick={() => handleDeleteCat(c.productCategoryId)}>🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* ── Panel Platillos ── */}
                        <div className="admin-panel">
                            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                🍽️ Administrar Platillos y Precios
                                <button
                                    className="btn-admin-toggle"
                                    style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}
                                    onClick={() => { resetProdForm(); setView('form'); }}
                                >
                                    + Nuevo Producto
                                </button>
                            </div>
                            <div className="admin-body">
                                <div className="admin-filters">
                                    <div className="prod-search" style={{ maxWidth: '180px' }}>
                                        <span>🔍</span>
                                        <input type="text" placeholder="Buscar..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} />
                                    </div>
                                    <select className="prod-select" value={adminCatFilter} onChange={e => setAdminCatFilter(e.target.value)}>
                                        <option value="">Categoría</option>
                                        {categories.map(c => <option key={c.productCategoryId} value={c.productCategoryId}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="table-scroll" style={{ maxHeight: '480px' }}>
                                    <table className="admin-table">
                                        <thead>
                                        <tr>
                                            <th style={{ background: '#444', width: '44px' }}>Img</th>
                                            <th style={{ background: '#444' }}>Platillo</th>
                                            <th style={{ background: '#444' }}>Precio</th>
                                            <th style={{ background: '#444' }}>Cat.</th>
                                            <th style={{ background: '#444', width: '72px', textAlign: 'right' }}>Acc.</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {adminFiltered.map(p => (
                                            <tr key={p.productId} className={prodForm.id === p.productId ? 'row-selected' : ''}>
                                                <td>
                                                    {getProductImage(p)
                                                        ? <img src={getProductImage(p)} alt={p.name} className="prod-thumb" />
                                                        : <div className="prod-thumb-empty">📷</div>
                                                    }
                                                </td>
                                                <td className="fw-bold">{p.name}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>C$ {Number(p.price).toFixed(0)}</td>
                                                <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{p.categoryName}</td>
                                                <td>
                                                    <div className="actions-cell">
                                                        <button className="icon-btn" title="Editar" onClick={() => { handleEditProd(p); setView('form'); }}>✏️</button>
                                                        <button className="icon-btn" title="Eliminar" onClick={() => handleDeleteProd(p.productId)}>🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {adminFiltered.length === 0 && (
                                            <tr><td colSpan="5" className="text-center" style={{ padding: '1.5rem' }}>No hay platillos.</td></tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                    </div>
                </>
            )}

            {/* ══════════════ VISTA FORM (Agregar/Editar Producto + Receta) ══════════════ */}
            {view === 'form' && (
                <div className="prod-form-page">
                    <div className="prod-top-actions">
                        <button className="btn-regresar" onClick={() => { resetProdForm(); setView('admin'); }}>Volver</button>
                        <button className="btn-admin-toggle" onClick={resetProdForm}>+ Nuevo Producto</button>
                    </div>

                    <div className="prod-form-card" style={{ width: '100%' }}>
                        <div className="prod-form-card-header">
                            {prodForm.id ? '✏️ Editando platillo' : '➕ Nuevo platillo'}
                        </div>

                        <div className="prod-form-card-body">

                                            {/* Zona imagen */}
                                            <div className="prod-image-zone" onClick={() => fileInputRef.current?.click()}>
                                                <div className="prod-image-preview">
                                                    {imagePreview
                                                        ? <img src={imagePreview} alt="preview" />
                                                        : <span className="prod-image-placeholder">📷</span>
                                                    }
                                                </div>
                                                <div className="prod-image-info">
                                                    <strong>{imagePreview ? 'Imagen seleccionada' : 'Sin imagen'}</strong>
                                                    <p>JPG, PNG o WebP · máx 2 MB</p>
                                                </div>
                                                <div className="prod-image-btns" onClick={e => e.stopPropagation()}>
                                                    <button className="btn-img-pick" onClick={() => fileInputRef.current?.click()}>
                                                        {imagePreview ? 'Cambiar' : 'Subir'}
                                                    </button>
                                                    {imagePreview && (
                                                        <button className="btn-img-clear" onClick={clearImage}>✕ Quitar</button>
                                                    )}
                                                </div>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={handleImageChange}
                                                />
                                            </div>

                                            {/* Campos */}
                                            <div className="prod-form-fields">
                                                <div className="prod-form-field">
                                                    <label>Nombre</label>
                                                    <input
                                                        type="text"
                                                        className={`prod-input ${errors.prodName ? 'input-error' : ''}`}
                                                        placeholder="Nombre del platillo"
                                                        value={prodForm.name}
                                                        onChange={e => { setProdForm({ ...prodForm, name: e.target.value }); if (errors.prodName) setErrors({ ...errors, prodName: '' }); }}
                                                    />
                                                    {errors.prodName && <span className="error-text">{errors.prodName}</span>}
                                                </div>

                                                {/* ── Campo descripción ── */}
                                                <div className="prod-form-field">
                                                    <label>Descripción <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional)</span></label>
                                                    <textarea
                                                        className="prod-input"
                                                        placeholder="Ej: Servido con arroz, ensalada y tortillas..."
                                                        value={prodForm.description}
                                                        rows={2}
                                                        onChange={e => setProdForm({ ...prodForm, description: e.target.value })}
                                                        style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }}
                                                    />
                                                </div>

                                                <div className="prod-form-row-2">
                                                    <div className="prod-form-field">
                                                        <label>Categoría</label>
                                                        <select
                                                            className={`prod-select ${errors.prodCategory ? 'input-error' : ''}`}
                                                            value={prodForm.productCategoryId}
                                                            onChange={e => { setProdForm({ ...prodForm, productCategoryId: e.target.value }); if (errors.prodCategory) setErrors({ ...errors, prodCategory: '' }); }}
                                                        >
                                                            <option value="">-- Seleccionar --</option>
                                                            {categories.map(c => <option key={c.productCategoryId} value={c.productCategoryId}>{c.name}</option>)}
                                                        </select>
                                                        {errors.prodCategory && <span className="error-text">{errors.prodCategory}</span>}
                                                    </div>
                                                    <div className="prod-form-field">
                                                        <label>Precio (C$)</label>
                                                        <input
                                                            type="number"
                                                            className={`prod-input ${errors.prodPrice ? 'input-error' : ''}`}
                                                            placeholder="0"
                                                            value={prodForm.price}
                                                            onChange={e => { setProdForm({ ...prodForm, price: e.target.value }); if (errors.prodPrice) setErrors({ ...errors, prodPrice: '' }); }}
                                                        />
                                                        {errors.prodPrice && <span className="error-text">{errors.prodPrice}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── RECETA ── */}
                                            <div style={{ marginTop: '1.2rem', border: '1px solid #f0d9c0', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ background: '#20b2aa', color: '#fff', padding: '0.6rem 1rem', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                                                    RECETA
                                                </div>
                                                <div style={{ padding: '1rem', background: '#fff' }}>
                                                    <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.9rem' }}>
                                                        <select
                                                            className="prod-select"
                                                            style={{ flex: 2 }}
                                                            value={recipeSupplyId}
                                                            onChange={e => setRecipeSupplyId(e.target.value)}
                                                        >
                                                            <option value="">Seleccionar / Buscar insumo</option>
                                                            {supplies.map(s => (
                                                                <option key={s.supplyId} value={s.supplyId}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="prod-input"
                                                            style={{ flex: 1 }}
                                                            placeholder="Cantidad"
                                                            value={recipeQuantity}
                                                            onChange={e => setRecipeQuantity(e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddRecipeItem}
                                                            style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 1.1rem', fontWeight: 700, cursor: 'pointer' }}
                                                        >
                                                            Agregar
                                                        </button>
                                                    </div>

                                                    {recipeItems.length > 0 && (
                                                        <div style={{ overflowX: 'auto' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                                <thead>
                                                                <tr style={{ background: '#f97316', color: '#fff', textAlign: 'left' }}>
                                                                    <th style={{ padding: '0.5rem 0.7rem' }}>Insumo</th>
                                                                    <th style={{ padding: '0.5rem 0.7rem' }}>Cantidad</th>
                                                                    <th style={{ padding: '0.5rem 0.7rem' }}>Unidad</th>
                                                                    <th style={{ padding: '0.5rem 0.7rem' }}>Costo Unitario</th>
                                                                    <th style={{ padding: '0.5rem 0.7rem' }}>Subtotal</th>
                                                                    <th style={{ padding: '0.5rem 0.7rem' }}></th>
                                                                </tr>
                                                                </thead>
                                                                <tbody>
                                                                {recipeItems.map(item => (
                                                                    <tr key={item.supplyId} style={{ borderBottom: '1px solid #f0e5d8' }}>
                                                                        <td style={{ padding: '0.5rem 0.7rem' }}>{item.supplyName}</td>
                                                                        <td style={{ padding: '0.5rem 0.7rem' }}>{item.quantity}</td>
                                                                        <td style={{ padding: '0.5rem 0.7rem' }}>{item.unitOfMeasure}</td>
                                                                        <td style={{ padding: '0.5rem 0.7rem' }}>C$ {Number(item.unitCost).toFixed(2)}</td>
                                                                        <td style={{ padding: '0.5rem 0.7rem', fontWeight: 700 }}>C$ {Number(item.subtotal).toFixed(2)}</td>
                                                                        <td style={{ padding: '0.5rem 0.7rem' }}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveRecipeItem(item.supplyId)}
                                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                                                title="Quitar insumo"
                                                                            >🗑️</button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                </tbody>
                                                            </table>
                                                            <div style={{ textAlign: 'right', marginTop: '0.6rem', fontWeight: 700, color: '#20b2aa' }}>
                                                                Costo de producción: C$ {recipeTotal.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {recipeItems.length === 0 && (
                                                        <p style={{ color: errors.prodRecipe ? '#ef4444' : '#aaa', fontSize: '0.85rem', margin: 0, fontWeight: errors.prodRecipe ? 600 : 400 }}>
                                                            {errors.prodRecipe || 'Aún no hay insumos agregados a la receta.'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Botones acción */}
                                            <div className={`form-action-btns ${prodForm.id ? 'with-cancel' : ''}`}>
                                                {prodForm.id && (
                                                    <button className="btn-cancel-form" onClick={() => { resetProdForm(); setView('admin'); }}>✕</button>
                                                )}
                                                <button className="btn-save-new" onClick={handleSaveNewProd} disabled={!!prodForm.id}>+ Nuevo</button>
                                                <button className="btn-save-edit" onClick={handleSaveEditProd} disabled={!prodForm.id}>✏️ Guardar</button>
                                            </div>
                        </div>
                    </div>
                </div>
            )}
        {confirmModal && (
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }}>
                <div style={{
                    background: '#fff', borderRadius: '12px', padding: '1.8rem 2rem',
                    minWidth: '320px', maxWidth: '90vw', boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
                    textAlign: 'center',
                }}>
                    <p style={{ fontSize: '1rem', color: '#333', margin: '0 0 1.4rem' }}>{confirmModal.message}</p>
                    <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
                        <button
                            onClick={() => setConfirmModal(null)}
                            style={{ padding: '0.5rem 1.4rem', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmModal.onConfirm}
                            style={{ padding: '0.5rem 1.4rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}