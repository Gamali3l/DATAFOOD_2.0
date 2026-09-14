import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/employees`;

export const employeeApi = {
    getAll: async () => {
        const response = await axios.get(API_URL);
        return response.data;
    },
    create: async (employeeData) => {
        const response = await axios.post(API_URL, employeeData);
        return response.data;
    },
    update: async (id, employeeData) => {
        const response = await axios.put(`${API_URL}/${id}`, employeeData);
        return response.data;
    },

    toggleStatus: (id, reason) =>
        axios.patch(`${API_URL}/${id}/toggle-status`, { reason })

};