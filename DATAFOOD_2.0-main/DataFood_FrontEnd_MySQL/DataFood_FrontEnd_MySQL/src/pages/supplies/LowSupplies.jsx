import { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getLowStock }         from '../../api/Supplyapi.js';
import './LowSupplies.css';

const SEMAPHORE_LABEL = { GREEN: '🟢', YELLOW: '🟡', RED: '🔴' };

export default function LowSupplies() {
    const navigate  = useNavigate();
    const [supplies, setSupplies] = useState([]);
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
        getLowStock()
            .then(res => setSupplies(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="ib-page">

            <div className="ib-header">
                <div>
                    <h2 className="ib-title">⚠️ Insumos con Stock Bajo</h2>
                    <span className="ib-subtitle">
                        {supplies.length} insumo{supplies.length !== 1 ? 's' : ''} en alerta, ordenados por urgencia
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="ib-loading">Cargando...</div>
            ) : (
                <table className="ib-table">
                    <thead>
                    <tr>
                        <th>Insumo</th>
                        <th>Cantidad Actual</th>
                        <th>Cantidad Mínima</th>
                        <th>Unidad</th>
                        <th>Días Restantes</th>
                        <th>Categoría</th>
                        <th>Último Proveedor</th>
                    </tr>
                    </thead>
                    <tbody>
                    {supplies.map(s => (
                        <tr key={s.supplyId}>
                            <td><strong>{s.name}</strong></td>
                            <td>
                                <span className="ib-qty-low">{s.availableQuantity}</span>
                            </td>
                            <td>{s.minimumQuantity}</td>
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
                        </tr>
                    ))}
                    {supplies.length === 0 && (
                        <tr>
                            <td colSpan={7} className="ib-empty">
                                ✅ Todos los insumos tienen stock suficiente
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            )}

            <div className="ib-footer">
                <button className="ib-btn-regresar" onClick={() => navigate('/')}>
                    Principal
                </button>
            </div>

        </div>
    );
}