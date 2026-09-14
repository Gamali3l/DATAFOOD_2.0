import { useEffect, useState } from 'react';
import { adjustStock }  from '../../api/Supplyapi.js';
import { useAuth }      from '../AuthContext';

export default function SupplyForm({ supply, categories, onClose }) {
    const { user } = useAuth();

    const [availableQuantity, setAvailableQuantity] = useState(0);
    const [confirm,           setConfirm]           = useState(false);

    useEffect(() => {
        if (supply) {
            setAvailableQuantity(supply.availableQuantity ?? 0);
        }
        setConfirm(false);
    }, [supply]);

    const readonlyStyle = {
        width: '100%', padding: '0.5rem 0.8rem',
        borderRadius: '8px', border: '1px solid #e0e0e0',
        fontSize: '0.9rem', marginBottom: '1rem',
        background: '#f5f5f5', color: '#888', cursor: 'not-allowed',
    };
    const editableStyle = {
        width: '100%', padding: '0.5rem 0.8rem',
        borderRadius: '8px', border: '1px solid #f97316',
        fontSize: '0.9rem', marginBottom: '1rem',
    };
    const labelStyle = {
        fontSize: '0.85rem', fontWeight: 600, color: '#555',
        display: 'block', marginBottom: '4px',
    };
    const labelReadonly = {
        ...labelStyle, color: '#aaa',
    };

    const handleQuantityChange = (e) => {
        const val = Number(e.target.value);
        // Solo permite disminuir (no puede superar el original)
        if (val <= (supply?.availableQuantity ?? 0)) {
            setAvailableQuantity(val);
        }
    };

    const handleGuardar = () => {
        if (!confirm) {
            setConfirm(true);
            return;
        }
        handleSubmit();
    };

    //mejora inventario
    const handleSubmit = async () => {
        try {
            await adjustStock(
                supply.supplyId,
                Number(availableQuantity),
                'Ajuste manual desde Inventario General',
                user?.employeeId ?? 1 // usa el empleado real de la sesión, con 1 como respaldo
            );
            onClose();
        } catch (err) { console.error(err); }
    };

    return (
        <div>
            {/* Nombre — solo lectura */}
            <label style={labelReadonly}>Nombre</label>
            <input style={readonlyStyle} value={supply?.name ?? ''} readOnly />

            {/* Unidad de Medida — solo lectura */}
            <label style={labelReadonly}>Unidad de Medida</label>
            <input style={readonlyStyle} value={supply?.unitOfMeasure ?? ''} readOnly />

            {/* Cantidad Disponible — editable solo para disminuir */}
            <label style={labelStyle}>
                Cantidad Disponible
                <span style={{ fontWeight: 400, color: '#f97316', marginLeft: 6, fontSize: '0.8rem' }}>
                    (solo puede disminuir · máx: {supply?.availableQuantity ?? 0})
                </span>
            </label>
            <input
                style={editableStyle}
                type="number"
                min={0}
                max={supply?.availableQuantity ?? 0}
                value={availableQuantity}
                onChange={handleQuantityChange}
            />

            {/* Cantidad Mínima — solo lectura */}
            <label style={labelReadonly}>Cantidad Mínima</label>
            <input style={readonlyStyle} value={supply?.minimumQuantity ?? 0} readOnly />

            {/* Confirmación */}
            {confirm && (
                <div style={{
                    background: '#fff3cd', border: '1px solid #f97316',
                    borderRadius: '8px', padding: '0.7rem 1rem',
                    marginBottom: '1rem', fontSize: '0.88rem', color: '#7a4400',
                }}>
                    ⚠️ ¿Confirmas disminuir la cantidad de{' '}
                    <strong>{supply?.availableQuantity}</strong> a{' '}
                    <strong>{availableQuantity}</strong>? Esta acción no se puede deshacer.
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                    type="button"
                    onClick={() => { setConfirm(false); onClose(); }}
                    style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}
                >
                    Cancelar
                </button>
                {confirm && (
                    <button
                        type="button"
                        onClick={() => setConfirm(false)}
                        style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: '1px solid #ef4444', cursor: 'pointer', background: '#fff', color: '#ef4444', fontWeight: 700 }}
                    >
                        No, volver
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleGuardar}
                    style={{ padding: '0.5rem 1.4rem', borderRadius: '8px', border: 'none', background: confirm ? '#ef4444' : '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                    {confirm ? '⚠️ Sí, confirmar' : 'Guardar'}
                </button>
            </div>
        </div>
    );
}