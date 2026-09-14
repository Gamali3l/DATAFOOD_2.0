import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import './Register.css';

const BASE = `${import.meta.env.VITE_API_URL}/api/cashregister`;

const REASONS = {
    Retiro:   ['Pago a proveedor', 'Gastos varios', 'Pago de servicios', 'Otro'],
    Deposito: ['Ingreso extra', 'Préstamo', 'Corrección de saldo', 'Otro'],
};

const fmt = (val) =>
    Number(val ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2 });

/* ─── hook ─────────────────────────────────────────────────── */
function useCashData(refreshKey) {
    const [balance,    setBalance]    = useState(null);
    const [activeReg,  setActiveReg]  = useState(undefined);
    const [loading,    setLoading]    = useState(true);
    const [fetchError, setFetchError] = useState('');

    useEffect(() => {
        setLoading(true);
        setFetchError('');
        Promise.all([
            fetch(`${BASE}/movement/balance`).then(r => {
                if (!r.ok) throw new Error('Error al cargar saldo');
                return r.json();
            }),
            fetch(`${BASE}/active-any`).then(r =>
                r.status === 204 ? false : r.json()
            ),
        ])
            .then(([bal, reg]) => {
                setBalance(bal);
                setActiveReg(reg ?? false);
            })
            .catch(e => setFetchError(e.message))
            .finally(() => setLoading(false));
    }, [refreshKey]);

    return { balance, activeReg, loading, fetchError };
}

/* ─── modal de confirmación ─────────────────────────────────── */
function ConfirmModal({ type, amount, reason, currentBalance, newBalance, onConfirm, onCancel }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: '#fff',
                borderRadius: 14,
                padding: '2rem',
                maxWidth: 380,
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    {type === 'Retiro' ? '⬇️' : '⬆️'}
                </div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#1a1a1a', fontSize: '1.1rem' }}>
                    ¿Confirmar {type}?
                </h3>
                <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
                    Revisá los datos antes de confirmar. Esta acción quedará registrada.
                </p>

                <div style={{
                    background: '#fff8f3',
                    border: '1.5px solid #f0cfa8',
                    borderRadius: 10,
                    padding: '0.85rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.88rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    marginBottom: '1.5rem',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Tipo:</span>
                        <strong style={{ color: type === 'Retiro' ? '#dc2626' : '#16a34a' }}>{type}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Motivo:</span>
                        <strong style={{ color: '#333' }}>{reason}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Monto:</span>
                        <strong style={{ color: type === 'Retiro' ? '#dc2626' : '#16a34a' }}>
                            {type === 'Retiro' ? '-' : '+'}C$ {fmt(amount)}
                        </strong>
                    </div>
                    <hr style={{ border: '0.5px solid #f0cfa8', margin: '0.2rem 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Saldo actual:</span>
                        <span>C$ {fmt(currentBalance)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Nuevo saldo:</span>
                        <strong style={{ color: newBalance < 0 ? '#dc2626' : '#15803d', fontSize: '1rem' }}>
                            C$ {fmt(newBalance)}
                        </strong>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.55rem 1.4rem',
                            borderRadius: 8,
                            border: '1.5px solid #d1d5db',
                            background: '#fff',
                            color: '#555',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                        }}
                    >
                        Revisar
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.55rem 1.4rem',
                            borderRadius: 8,
                            border: 'none',
                            background: type === 'Retiro' ? '#dc2626' : '#16a34a',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                        }}
                    >
                        Sí, confirmar {type}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── main component ────────────────────────────────────────── */
export default function CashMovement({ onClose }) {
    const { user } = useAuth();

    const [type,         setType]         = useState('Retiro');
    const [amount,       setAmount]       = useState('');
    const [reason,       setReason]       = useState('');
    const [note,         setNote]         = useState('');
    const [saving,       setSaving]       = useState(false);
    const [formError,    setFormError]    = useState('');
    const [savedOk,      setSavedOk]      = useState(false);
    const [refreshKey,   setRefreshKey]   = useState(0);
    const [showConfirm,  setShowConfirm]  = useState(false);
    const [touched,      setTouched]      = useState({ amount: false, reason: false });

    const { balance, activeReg, loading, fetchError } = useCashData(refreshKey);

    const employeeId   = user?.employeeId;
    const employeeName = user ? `${user.firstName} ${user.lastName}` : '';

    const currentBalance       = Number(balance?.totalBalance ?? 0);
    const amountNum            = parseFloat(amount) || 0;
    const newBalance           = type === 'Retiro' ? currentBalance - amountNum : currentBalance + amountNum;
    const amountExceedsBalance = type === 'Retiro' && amountNum > currentBalance && amountNum > 0;

    /* ── validaciones individuales ── */
    const validations = {
        noCaja:    !loading && activeReg === false,
        noAmount:  touched.amount  && amountNum <= 0,
        noReason:  touched.reason  && !reason,
        overLimit: touched.amount  && amountExceedsBalance,
    };

    const hasError = validations.noCaja || validations.noAmount || validations.noReason || validations.overLimit;

    const canSave = amountNum > 0 && reason && activeReg && !saving && !savedOk && !amountExceedsBalance;

    const fecha = new Date().toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora  = new Date().toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', hour12: true });

    /* ── intentar guardar: primero marcar touched y abrir confirm ── */
    const handleGuardar = () => {
        setTouched({ amount: true, reason: true });
        setFormError('');
        if (!canSave) return;
        setShowConfirm(true);
    };

    /* ── guardar real tras confirmar ── */
    const handleConfirm = async () => {
        setShowConfirm(false);
        setSaving(true);
        setFormError('');
        try {
            const res = await fetch(`${BASE}/movement`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cashRegisterId: activeReg.cashRegisterId,
                    employeeId,
                    movementType: type,
                    amount:       amountNum,
                    reason,
                    note: note || null,
                }),
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Error del servidor');
            }
            setAmount('');
            setReason('');
            setNote('');
            setTouched({ amount: false, reason: false });
            setSavedOk(true);
            setRefreshKey(k => k + 1);
            setTimeout(() => setSavedOk(false), 4000);
        } catch (e) {
            setFormError(e.message);
        } finally {
            setSaving(false);
        }
    };

    /* ── helpers de estilo para campos con error ── */
    const inputStyle = (hasErr) => ({
        borderColor: hasErr ? '#dc2626' : undefined,
        boxShadow:   hasErr ? '0 0 0 2px rgba(220,38,38,0.15)' : undefined,
    });

    return (
        <>
            <div className="cajaModel-overlay">
                <div className="cajaModel-container large">

                    {/* ── Título ── */}
                    <div className="cajaModel-title">
                        <span>💸</span>
                        Movimiento de Caja
                        <span style={{ fontSize: '0.9rem', color: '#f07c2a', fontWeight: 'normal' }}>
                            Retiro / Depósito
                        </span>
                    </div>

                    {/* ── Error de fetch ── */}
                    {fetchError && (
                        <p style={{ color: '#dc2626', fontSize: '.85rem', marginBottom: '0.25rem' }}>
                            ⚠ {fetchError}
                        </p>
                    )}

                    {/* ── Sin caja abierta ── */}
                    {validations.noCaja && (
                        <div style={{
                            background: '#fef2f2',
                            border: '1.5px solid #fca5a5',
                            borderRadius: 8,
                            padding: '0.6rem 0.9rem',
                            fontSize: '0.85rem',
                            color: '#dc2626',
                            fontWeight: 600,
                            marginBottom: '0.25rem',
                        }}>
                            ⚠ No hay una caja abierta. Debés abrir la caja antes de registrar movimientos.
                        </div>
                    )}

                    {/* ── Éxito ── */}
                    {savedOk && (
                        <div style={{
                            background: '#f0fdf4',
                            border: '1.5px solid #86efac',
                            borderRadius: 8,
                            padding: '0.6rem 0.9rem',
                            fontSize: '0.88rem',
                            color: '#15803d',
                            fontWeight: 600,
                            marginBottom: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            ✅ ¡{type === 'Retiro' ? 'Retiro' : 'Depósito'} registrado correctamente!
                        </div>
                    )}

                    {/* ── Grid 2 columnas ── */}
                    <div className="caja-grid-2-col">

                        {/* ── Columna izquierda ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* 1. Datos */}
                            <div className="caja-panel">
                                <div className="caja-panel-header">1. Datos del movimiento</div>
                                <div className="caja-panel-body">
                                    <p><span>👤</span> <strong>Usuario:</strong> {employeeName}</p>
                                    <p><span>📅</span> <strong>Fecha:</strong> {fecha}</p>
                                    <p><span>🕐</span> <strong>Hora:</strong> {hora}</p>
                                </div>
                            </div>

                            {/* 3. Monto */}
                            <div className="caja-input-group">
                                <label style={{ color: validations.noAmount || validations.overLimit ? '#dc2626' : '#f07c2a' }}>
                                    3. Monto {(validations.noAmount || validations.overLimit) && <span>*</span>}
                                </label>
                                <input
                                    type="number"
                                    className="caja-input"
                                    placeholder="C$ 0.00"
                                    min="0"
                                    value={amount}
                                    style={inputStyle(validations.noAmount || validations.overLimit)}
                                    onChange={e => {
                                        setAmount(e.target.value);
                                        setFormError('');
                                        setTouched(t => ({ ...t, amount: true }));
                                    }}
                                    onBlur={() => setTouched(t => ({ ...t, amount: true }))}
                                />
                                {validations.noAmount && (
                                    <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: 3 }}>
                                        ⚠ Ingresá un monto mayor a C$ 0.00
                                    </span>
                                )}
                                {validations.overLimit && (
                                    <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: 3 }}>
                                        ⚠ El monto (C$ {fmt(amountNum)}) supera el saldo disponible (C$ {fmt(currentBalance)})
                                    </span>
                                )}
                            </div>

                            {/* 5. Observación */}
                            <div className="caja-input-group">
                                <label style={{ color: '#f07c2a' }}>
                                    5. Observación{' '}
                                    <span style={{ fontWeight: 400, color: '#999' }}>(opcional)</span>
                                </label>
                                <textarea
                                    className="caja-textarea"
                                    placeholder="Agrega una observación si existe alguna información adicional..."
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* ── Columna derecha ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* 2. Tipo de movimiento */}
                            <div className="caja-input-group">
                                <label style={{ color: '#f07c2a' }}>2. Tipo de movimiento</label>
                                <div className="mov-type-container">
                                    <button
                                        className={`mov-btn retiro ${type === 'Retiro' ? 'active' : ''}`}
                                        onClick={() => { setType('Retiro'); setReason(''); setTouched(t => ({ ...t, reason: false })); }}
                                    >
                                        <span>⬇️</span> Retiro
                                    </button>
                                    <button
                                        className={`mov-btn deposito ${type === 'Deposito' ? 'active' : ''}`}
                                        onClick={() => { setType('Deposito'); setReason(''); setTouched(t => ({ ...t, reason: false })); }}
                                    >
                                        <span>⬆️</span> Depósito
                                    </button>
                                </div>
                            </div>

                            {/* 4. Motivo */}
                            <div className="caja-input-group">
                                <label style={{ color: validations.noReason ? '#dc2626' : '#f07c2a' }}>
                                    4. Motivo {validations.noReason && <span>*</span>}
                                </label>
                                <select
                                    className="caja-input"
                                    value={reason}
                                    style={inputStyle(validations.noReason)}
                                    onChange={e => {
                                        setReason(e.target.value);
                                        setTouched(t => ({ ...t, reason: true }));
                                    }}
                                    onBlur={() => setTouched(t => ({ ...t, reason: true }))}
                                >
                                    <option value="">Seleccionar motivo</option>
                                    {REASONS[type].map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                {validations.noReason && (
                                    <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: 3 }}>
                                        ⚠ Seleccioná un motivo para continuar
                                    </span>
                                )}
                            </div>

                            {/* 6. Resumen */}
                            <div className="caja-panel">
                                <div className="caja-panel-header">6. Resumen del movimiento</div>
                                <div className="caja-panel-body" style={{ background: '#fff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Saldo actual:</span>
                                        <strong>{loading ? '...' : `C$ ${fmt(currentBalance)}`}</strong>
                                    </div>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        color: type === 'Retiro' ? '#dc2626' : '#16a34a',
                                    }}>
                                        <span>{type === 'Retiro' ? 'Retiro:' : 'Depósito:'}</span>
                                        <strong>{type === 'Retiro' ? '-' : '+'}C$ {fmt(amountNum)}</strong>
                                    </div>
                                    <hr style={{ border: '0.5px solid #f3d5b8', width: '100%' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                                        <strong>Nuevo saldo:</strong>
                                        <strong style={{ color: newBalance < 0 ? '#dc2626' : '#15803d' }}>
                                            C$ {fmt(newBalance)}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {/* Error de servidor */}
                            {formError && (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1.5px solid #fca5a5',
                                    borderRadius: 8,
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.82rem',
                                    color: '#dc2626',
                                }}>
                                    ⚠ {formError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Botones ── */}
                    <div className="caja-actions">
                        <button className="caja-btn teal" onClick={onClose} disabled={saving}>
                            Principal
                        </button>
                        <button
                            className="caja-btn teal"
                            onClick={handleGuardar}
                            disabled={saving || savedOk}
                            title={
                                validations.noCaja    ? 'Debe haber una caja abierta'      :
                                    validations.noAmount  ? 'Ingresá un monto'                 :
                                        validations.noReason  ? 'Seleccioná un motivo'             :
                                            validations.overLimit ? 'Monto supera el saldo disponible' : ''
                            }
                        >
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button className="caja-btn orange" onClick={onClose} disabled={saving}>
                            Cancelar
                        </button>
                    </div>

                </div>
            </div>

            {/* ── Modal de confirmación ── */}
            {showConfirm && (
                <ConfirmModal
                    type={type}
                    amount={amountNum}
                    reason={reason}
                    currentBalance={currentBalance}
                    newBalance={newBalance}
                    onConfirm={handleConfirm}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </>
    );
}