import axios from 'axios';

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api` });

// ── SALES (Ventas) ──
export const getSales    = (params)    => api.get('/sales', { params });
export const getSale     = (id)        => api.get(`/sales/${id}`);
export const createSale  = (data)      => api.post('/sales', data);
export const updateSale  = (id, data)  => api.put(`/sales/${id}`, data);
export const cancelSale  = (id, empId = 1) =>
    api.delete(`/sales/${id}`, { params: { employeeId: empId } });