import { useState, useEffect } from 'react';
import './Register.css';

export default function CloseRegister({ onClose, employeeId, employeeName }) {
    const [efectivoContado,   setEfectivoContado]   = useState('');
    const [observacion,       setObservacion]        = useState('');
    const [loading,           setLoading]            = useState(false);
    const [checking,          setChecking]           = useState(true);
    const [success,           setSuccess]            = useState(false);
    const [error,             setError]              = useState('');
    const [cashRegisterId,    setCashRegisterId]     = useState(null);
    const [cajaAbierta,       setCajaAbierta]        = useState(null);

    // Datos reales del resumen del turno
    const [summary, setSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Al montar: obtener la caja activa global
    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL}/api/cashregister/active-any`)
            .then(r => {
                if (r.status === 204) return null;
                if (r.ok)            return r.json();
                return null;
            })
            .then(data => {
                if (!data) {
                    setCajaAbierta(null);
                    return;
                }
                setCajaAbierta(data);
                setCashRegisterId(data.cashRegisterId);
            })
            .catch(() => setCajaAbierta(null))
            .finally(() => setChecking(false));
    }, []);

    // Cuando tenemos el cashRegisterId, cargamos el resumen real
    useEffect(() => {
        if (!cashRegisterId) return;
        setLoadingSummary(true);
        fetch(`${import.meta.env.VITE_API_URL}/api/cashregister/summary/${cashRegisterId}`)
            .then(r => {
                if (r.ok) return r.json();
                return null;
            })
            .then(data => setSummary(data))
            .catch(() => setSummary(null))
            .finally(() => setLoadingSummary(false));
    }, [cashRegisterId]);

    // Efectivo esperado viene del summary (openingAmount + ventas efectivo local)
    const efectivoEsperado = summary?.expectedAmount != null
        ? Number(summary.expectedAmount)
        : (cajaAbierta?.openingAmount != null ? Number(cajaAbierta.openingAmount) : 0);

    const contado         = parseFloat(efectivoContado) || 0;
    const diferencia      = efectivoContado !== '' ? contado - efectivoEsperado : null;
    const cajaCuadrada    = diferencia === 0;
    const hayDescuadre    = diferencia !== null && !cajaCuadrada;

    // Solo se puede cerrar si la caja está cuadrada
    const puedesCerrar = efectivoContado !== '' && cajaCuadrada && !loading && !success;

    const fmt = (val) =>
        Number(val ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2 });

    const handleCerrar = async () => {
        if (!cashRegisterId) {
            setError('No hay una caja abierta para cerrar.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/cashregister/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cashRegisterId,
                    employeeId,
                    closingAmount: contado,
                    note: observacion || null,
                }),
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Error del servidor');
            }

            setSuccess(true);
            setTimeout(() => onClose(), 800);
        } catch (e) {
            setError(e.message || 'No se pudo cerrar la caja. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // ── Verificando ───────────────────────────────────────────
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

    // ── No hay caja abierta ───────────────────────────────────
    if (!cajaAbierta) {
        return (
            <div className="cajaModel-overlay">
                <div className="cajaModel-container">
                    <div className="caja-panel">
                        <div className="caja-panel-header">Sin caja abierta</div>
                        <div className="caja-panel-body" style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0 }}>No hay ninguna caja abierta en este momento.</p>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.88rem', color: '#666' }}>
                                Abre la caja primero antes de intentar cerrarla.
                            </p>
                        </div>
                    </div>
                    <div className="caja-actions">
                        <button className="caja-btn teal"   onClick={onClose}>Dashboard</button>
                        <button className="caja-btn orange" onClick={onClose}>Cancelar</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Formulario de cierre ──────────────────────────────────
    return (
        <div className="cajaModel-overlay">
            <div className="cajaModel-container large">
                <div className="caja-grid-2-col">

                    {/* Columna izquierda */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="caja-panel">
                            <div className="caja-panel-header">Datos de Cierre</div>
                            <div className="caja-panel-body">
                                <p><strong>Usuario:</strong> {employeeName || 'Empleado'}</p>
                                <p><strong>Abrió la caja:</strong> {cajaAbierta.employeeName}</p>
                                <p><strong>Fecha:</strong> {new Date().toLocaleDateString()}</p>
                                <p>
                                    <strong>Hora cierre:</strong>{' '}
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {cajaAbierta.openTime && (
                                    <p style={{ fontSize: '0.85rem', color: '#666' }}>
                                        <strong>Apertura:</strong>{' '}
                                        {new Date(cajaAbierta.openTime).toLocaleTimeString([], {
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="caja-panel">
                            <div className="caja-panel-header light">Resumen del día</div>
                            <div className="caja-panel-body">
                                {loadingSummary ? (
                                    <p style={{ textAlign: 'center', color: '#f07c2a', margin: 0 }}>
                                        Cargando resumen...
                                    </p>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Ventas en efectivo (local):</span>
                                            <strong>C$ {fmt(summary?.cashSales)}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Ventas a domicilio:</span>
                                            <strong>C$ {fmt(summary?.deliverySales)}</strong>
                                        </div>
                                        {summary?.deliveryFees > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Cobros de envios a domicilio:</span>
                                                <strong>C$ {fmt(summary?.deliveryFees)}</strong>
                                            </div>
                                        )}
                                        <hr style={{ border: '0.5px solid #f3d5b8', width: '100%' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Total ventas ({summary?.totalOrders ?? 0} órdenes):</span>
                                            <strong>C$ {fmt(summary?.totalSales)}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Monto apertura:</span>
                                            <strong>C$ {fmt(cajaAbierta?.openingAmount)}</strong>
                                        </div>
                                        <hr style={{ border: '0.5px solid #f3d5b8', width: '100%' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                                            <span><strong>Efectivo esperado:</strong></span>
                                            <strong>C$ {fmt(efectivoEsperado)}</strong>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Columna derecha */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="caja-input-group">
                            <label style={{ color: '#f07c2a' }}>1. Conteo físico</label>
                            <input
                                type="number"
                                className="caja-input"
                                placeholder="C$ Efectivo contado"
                                value={efectivoContado}
                                onChange={e => setEfectivoContado(e.target.value)}
                            />
                        </div>

                        <div className="caja-panel" style={{ background: '#fff' }}>
                            <div className="caja-panel-header light">2. Resultado</div>
                            <div className="caja-panel-body">
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Efectivo esperado:</span>
                                    <strong>C$ {fmt(efectivoEsperado)}</strong>
                                </div>
                                <span><strong>Diferencia:</strong></span>
                                <div className={`caja-resumen-box ${
                                    efectivoContado === '' ? '' : (cajaCuadrada ? 'green' : 'red')
                                }`}>
                                    <span>
                                        {efectivoContado === ''
                                            ? 'Esperando ingreso...'
                                            : cajaCuadrada
                                                ? '✔ Caja cuadrada'
                                                : '✘ Caja descuadrada — no se puede cerrar'}
                                    </span>
                                    <span>C$ {diferencia !== null ? diferencia.toFixed(2) : '0.00'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="caja-input-group">
                            <label style={{ color: '#f07c2a' }}>3. Observación</label>
                            <textarea
                                className="caja-textarea"
                                placeholder="Agrega una observación si existe diferencia..."
                                value={observacion}
                                onChange={e => { setObservacion(e.target.value); setError(''); }}
                            />
                        </div>

                        {error   && <p style={{ color: '#dc2626', fontSize: '.85rem', margin: 0 }}>⚠ {error}</p>}
                        {success && <p style={{ color: '#15803d', fontSize: '.85rem', margin: 0 }}>✔ Caja cerrada correctamente</p>}
                    </div>
                </div>

                <div className="caja-actions">
                    <button className="caja-btn teal"   onClick={onClose}      disabled={loading}>Principal</button>
                    <button
                        className="caja-btn teal"
                        onClick={handleCerrar}
                        disabled={!puedesCerrar}
                        title={hayDescuadre ? 'La caja tiene descuadre, no se puede cerrar' : ''}
                    >
                        {loading ? 'Cerrando...' : 'Cerrar Caja'}
                    </button>
                    <button className="caja-btn orange" onClick={onClose}      disabled={loading}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}