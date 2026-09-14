import { useState, useEffect } from 'react';
import './Register.css';

/**
 * OpenRegister
 * Props:
 *  - onClose       : función para cerrar el modal
 *  - employeeId    : ID del empleado de la sesión activa
 *  - employeeName  : Nombre del empleado de la sesión activa
 */
export default function OpenRegister({ onClose, employeeId, employeeName }) {
    const [monto,        setMonto]        = useState('');
    const [observacion,  setObservacion]  = useState('');
    const [loading,      setLoading]      = useState(false);
    const [checking,     setChecking]     = useState(true);   // verificando estado global
    const [success,      setSuccess]      = useState(false);
    const [error,        setError]        = useState('');
    const [cajaActiva,   setCajaActiva]   = useState(null);   // caja abierta por otro usuario

    // Al montar: verificar si hay alguna caja abierta (de cualquier empleado)
    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL}/api/cashregister/active-any`)
            .then(r => {
                if (r.status === 204) return null;   // sin caja abierta
                if (r.ok)            return r.json();
                return null;
            })
            .then(data => {
                if (data) {
                    // Hay caja abierta
                    setCajaActiva(data);
                }
            })
            .catch(() => {/* ignorar errores de red en la verificación */})
            .finally(() => setChecking(false));
    }, []);

    const handleAbrir = async () => {
        if (!employeeId) {
            setError('No se pudo identificar al empleado. Inicia sesión de nuevo.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/cashregister/open`, {                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId,
                    openingAmount: parseFloat(monto) || 0,
                    note: observacion || null,
                }),
            });

            if (!res.ok) {
                // El backend devuelve el mensaje de error como texto plano
                const msg = await res.text();
                throw new Error(msg || 'Error del servidor');
            }

            setSuccess(true);
            setTimeout(() => onClose(), 800);
        } catch (e) {
            setError(e.message || 'No se pudo abrir la caja. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // ── Render: verificando ───────────────────────────────────
    if (checking) {
        return (
            <div className="cajaModel-overlay">
                <div className="cajaModel-container">
                    <p style={{ textAlign: 'center', padding: '2rem', color: '#f07c2a' }}>
                        Verificando estado de caja...
                    </p>
                </div>
            </div>
        );
    }

    // ── Render: ya hay una caja abierta por otro usuario ──────
    if (cajaActiva && cajaActiva.employeeId !== employeeId) {
        return (
            <div className="cajaModel-overlay">
                <div className="cajaModel-container">
                    <div className="caja-panel">
                        <div className="caja-panel-header">Caja ya abierta</div>
                        <div className="caja-panel-body" style={{ gap: '0.75rem', textAlign: 'center' }}>
                            <p style={{ margin: 0 }}>
                                La caja fue abierta por <strong>{cajaActiva.employeeName}</strong> desde las{' '}
                                <strong>
                                    {cajaActiva.openTime
                                        ? new Date(cajaActiva.openTime).toLocaleString('es-NI', {
                                            day: '2-digit', month: '2-digit', year: '2-digit',
                                            hour: '2-digit', minute: '2-digit', hour12: true
                                        })
                                        : '--'}
                                </strong>.
                            </p>
                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>
                                No es posible abrir una nueva caja mientras haya una activa.
                            </p>
                        </div>
                    </div>
                    <div className="caja-actions">
                        <button className="caja-btn teal"   onClick={onClose}>Principal</button>
                        <button className="caja-btn orange" onClick={onClose}>Cancelar</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: el mismo usuario ya abrió la caja ─────────────
    if (cajaActiva && cajaActiva.employeeId === employeeId) {
        return (
            <div className="cajaModel-overlay">
                <div className="cajaModel-container">
                    <div className="caja-panel">
                        <div className="caja-panel-header">Caja ya abierta</div>
                        <div className="caja-panel-body" style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0 }}>
                                Ya tienes una caja abierta desde las{' '}
                                <strong>
                                    {cajaActiva.openTime
                                        ?new Date(cajaActiva.openTime).toLocaleString('es-NI', {
                                            day: '2-digit', month: '2-digit', year: '2-digit',
                                            hour: '2-digit', minute: '2-digit', hour12: true
                                        })
                                        : '--'}
                                </strong>.
                            </p>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.88rem', color: '#666' }}>
                                Puedes cerrarla desde la opción "Cerrar Caja".
                            </p>
                        </div>
                    </div>
                    <div className="caja-actions">
                        <button className="caja-btn teal"   onClick={onClose}>Principal</button>
                        <button className="caja-btn orange" onClick={onClose}>Cancelar</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: normal (no hay caja abierta) ──────────────────
    return (
        <div className="cajaModel-overlay">
            <div className="cajaModel-container">
                <div className="caja-grid-2-col">

                    {/* Columna izquierda: datos */}
                    <div className="caja-panel">
                        <div className="caja-panel-header">Datos de Apertura</div>
                        <div className="caja-panel-body">
                            {employeeName && (
                                <p><strong>Usuario:</strong> {employeeName}</p>
                            )}
                            <p><strong>Fecha:</strong> {new Date().toLocaleDateString()}</p>
                            <p>
                                <strong>Hora:</strong>{' '}
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    {/* Columna derecha: formulario */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="caja-input-group">
                            <label>Monto inicial:</label>
                            <input
                                type="number"
                                className="caja-input"
                                placeholder="C$ 0.00"
                                value={monto}
                                onChange={e => setMonto(e.target.value)}
                            />
                        </div>
                        <div className="caja-input-group">
                            <label>Observación (opcional):</label>
                            <textarea
                                className="caja-textarea"
                                placeholder="Introduzca el monto de inicio de caja..."
                                value={observacion}
                                onChange={e => setObservacion(e.target.value)}
                            />
                        </div>

                        {error   && <p style={{ color: '#dc2626', fontSize: '.85rem', margin: 0 }}>⚠ {error}</p>}
                        {success && <p style={{ color: '#15803d', fontSize: '.85rem', margin: 0 }}>✔ Caja abierta correctamente</p>}
                    </div>

                </div>

                <div className="caja-actions">
                    <button className="caja-btn teal"   onClick={onClose}    disabled={loading}>Dashboard</button>
                    <button className="caja-btn teal"   onClick={handleAbrir} disabled={loading || success}>
                        {loading ? 'Abriendo...' : 'Abrir Caja'}
                    </button>
                    <button className="caja-btn orange" onClick={onClose}    disabled={loading}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}