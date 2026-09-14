import axios from 'axios';

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api` });

// ── CATEGORÍAS DE PRODUCTOS ──────────────────────────────────
export const getProductCategories  = ()         => api.get('/product-categories');
export const createProductCategory = (data)     => api.post('/product-categories', data);
export const updateProductCategory = (id, data) => api.put(`/product-categories/${id}`, data);
export const deleteProductCategory = (id)       => api.delete(`/product-categories/${id}`);

// ── PRODUCTOS (Platillos) ────────────────────────────────────
// getProducts acepta filtros: { categoryId, status, search, sortAZ }
export const getProducts     = (params)     => api.get('/products', { params });
export const createProduct   = (data)       => api.post('/products', data);
export const updateProduct   = (id, data)   => api.put(`/products/${id}`, data);
export const deleteProduct   = (id)         => api.delete(`/products/${id}`);
export const toggleProductStatus = (id)     => api.patch(`/products/${id}/toggle-status`);

// ── RECETA (Costeo) ──────────────────────────────────────────
export const getRecipe   = (productId)          => api.get(`/products/${productId}/recipe`);
export const saveRecipe  = (productId, items)   => api.put(`/products/${productId}/recipe`, items);
export const getCosting  = (productId)          => api.get(`/products/${productId}/recipe/costing`);