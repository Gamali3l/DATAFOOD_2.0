import axios from 'axios';

const API = import.meta.env.VITE_API_URL;
const api = axios.create({ baseURL: `${API}/api` });

// ── SUPPLIES (Insumos) ──
export const getSupplies      = (params)       => api.get('/supplies', { params });
export const getSupply        = (id)           => api.get(`/supplies/${id}`);
export const createSupply     = (data)         => api.post('/supplies', data);
export const updateSupply     = (id, data)     => api.put(`/supplies/${id}`, data);
export const deleteSupply = (id) =>
    fetch(`${API}/api/supplies/${id}`, { method: 'DELETE' });

export const decreaseStock = (id, quantity, reason = 'Ajuste manual', employeeId = 1) =>
    api.patch(`/supplies/${id}/decrease`, { quantity, reason, employeeId });


// Ajustar stock manualmente enviando la nueva cantidad, motivo y ID del empleado
export const adjustStock = (id, newQuantity, reason = 'Ajuste de inventario', employeeId = 1) =>
    api.patch(`/supplies/${id}/adjust`, {
        newQuantity,
        reason,
        employeeId
    });

// INVENTORY ANALYTICS mejora de Inventario
export const getInventoryAnalytics = () => api.get('/inventory-analytics');
export const getLowStock           = () => api.get('/inventory-analytics/low-stock');
export const getSuggestedPurchases = () => api.get('/inventory-analytics/suggested-purchases');


// ── CATEGORIES ──
export const getSupplyCategories  = ()         => api.get('/supply-categories');
export const createSupplyCategory = (data)     => api.post('/supply-categories', data);
export const updateSupplyCategory = (id, data) => api.put(`/supply-categories/${id}`, data);
export const deleteSupplyCategory = (id)       => api.delete(`/supply-categories/${id}`);

// ── PURCHASES (Compras) ──
export const getPurchases   = (params)    => api.get('/purchases', { params });
export const getPurchase    = (id)        => api.get(`/purchases/${id}`);
export const createPurchase = (data)      => api.post('/purchases', data);
export const updatePurchase = (id, data)  => api.put(`/purchases/${id}`, data);

/**
 * Anular compra — PATCH /purchases/{id}/cancel
 * Envía el motivo en el body y el empleado como query param.
 */
export const cancelPurchase = (id, empId = 1, reason = 'Sin motivo especificado') =>
    api.patch(
        `/purchases/${id}/cancel`,
        { reason },
        { params: { employeeId: empId } }
    );

// Alias para compatibilidad con código legacy
export const deletePurchase = cancelPurchase;