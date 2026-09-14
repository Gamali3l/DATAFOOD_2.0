import { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getSuggestedPurchases } from '../../api/Supplyapi.js';
import './LowSupplies.css'; // reutilizamos el mismo estilo de Insumos Bajos

const REASON_LABEL = {
    BAJO_STOCK:   'Stock bajo',
    CONSUMO_ALTO: 'Consumo alto',
};

export default function SuggestedPurchases() {
    const navigate  = useNavigate();
    const [supplies, setSupplies] = useState([]);
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
        getSuggestedPurchases()
            .then(res => setSupplies(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="ib-page">

            <div className="ib-header">
                <div>
                    <h2 className="ib-title">🛒 Lista Sugerida de Compras</h2>
                    <span className="ib-subtitle">
                        {supplies.length} insumo{supplies.length !== 1 ? 's' : ''} sugerido{supplies.length !== 1 ? 's' : ''} para comprar
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
                        <th>Cantidad Sugerida a Comprar</th>
                        <th>Motivo</th>
                        <th>Unidad de Medida</th>
                        <th>Proveedor</th>
                    </tr>
                    </thead>
                    <tbody>
                    {supplies.map(s => (
                        <tr key={s.supplyId}>
                            <td><strong>{s.name}</strong></td>
                            <td>{s.availableQuantity}</td>
                            <td>
                                <span className="ib-qty-low">{s.suggestedQuantity}</span>
                            </td>
                            <td>{REASON_LABEL[s.suggestReason] ?? s.suggestReason ?? '—'}</td>
                            <td>{s.unitOfMeasure}</td>
                            <td>{s.lastSupplierName ?? '—'}</td>
                        </tr>
                    ))}
                    {supplies.length === 0 && (
                        <tr>
                            <td colSpan={6} className="ib-empty">
                                ✅ No hay compras sugeridas por ahora
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