import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dataFoodBlanco from '../assets/DataFood_blanco.png';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword]     = useState('');
    const [confirm, setConfirm]             = useState('');
    const [showNew, setShowNew]             = useState(false);
    const [showConfirm, setShowConfirm]     = useState(false);
    const [loading, setLoading]             = useState(false);
    const [done, setDone]                   = useState(false);
    const [error, setError]                 = useState('');

    // Si no hay token, redirigir al login
    useEffect(() => {
        if (!token) {
            navigate('/');
        }
    }, [token, navigate]);

    const strength = (() => {
        if (!newPassword) return 0;
        let score = 0;
        if (newPassword.length >= 6)  score++;
        if (newPassword.length >= 10) score++;
        if (/[A-Z]/.test(newPassword)) score++;
        if (/[0-9]/.test(newPassword)) score++;
        if (/[^A-Za-z0-9]/.test(newPassword)) score++;
        return score;
    })();

    const strengthLabel = ['', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'][strength];
    const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#15803d'][strength];

    const handleReset = async () => {
        if (!token) {
            setError('Token inválido. Solicita un nuevo enlace de recuperación.');
            return;
        }
        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Token inválido o expirado.');
            }
            setDone(true);
            setTimeout(() => navigate('/'), 3000);
        } catch (e) {
            setError(e.message || 'Error al restablecer la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.overlay}>
            <div style={s.card}>

                <div style={s.iconWrapper}>
                    <div style={s.iconCircle}>
                        {done ? '✅' : '🔑'}
                    </div>
                </div>

                {done ? (
                    <div style={s.doneBox}>
                        <h2 style={s.title}>¡Contraseña actualizada!</h2>
                        <p style={s.desc}>
                            Tu contraseña fue cambiada correctamente.
                            Serás redirigido al inicio de sesión en unos segundos...
                        </p>
                        <div style={s.countdown}>
                            <div style={s.progressBar} />
                        </div>
                        <button style={s.btnSecondary} onClick={() => navigate('/')}>
                            Ir al inicio de sesión →
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 style={s.title}>Nueva contraseña</h2>
                        <p style={s.desc}>Elige una contraseña segura para tu cuenta.</p>

                        <div style={s.form}>
                            <div style={s.inputGroup}>
                                <label style={s.label}>Nueva contraseña</label>
                                <div style={s.inputWrapper}>
                                    <input
                                        style={s.input}
                                        type={showNew ? 'text' : 'password'}
                                        placeholder="Mínimo 6 caracteres"
                                        value={newPassword}
                                        onChange={e => { setNewPassword(e.target.value); setError(''); }}
                                        autoFocus
                                    />
                                    <button style={s.eyeBtn} onClick={() => setShowNew(!showNew)} type="button">
                                        {showNew ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {newPassword && (
                                    <div style={s.strengthWrapper}>
                                        <div style={s.strengthBar}>
                                            {[1,2,3,4,5].map(i => (
                                                <div key={i} style={{
                                                    ...s.strengthSegment,
                                                    background: i <= strength ? strengthColor : '#e5e7eb',
                                                }} />
                                            ))}
                                        </div>
                                        <span style={{ ...s.strengthLabel, color: strengthColor }}>
                                            {strengthLabel}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div style={s.inputGroup}>
                                <label style={s.label}>Confirmar contraseña</label>
                                <div style={s.inputWrapper}>
                                    <input
                                        style={{
                                            ...s.input,
                                            border: confirm && confirm !== newPassword
                                                ? '1.5px solid #ef4444'
                                                : confirm && confirm === newPassword
                                                    ? '1.5px solid #22c55e'
                                                    : 'none',
                                        }}
                                        type={showConfirm ? 'text' : 'password'}
                                        placeholder="Repite la contraseña"
                                        value={confirm}
                                        onChange={e => { setConfirm(e.target.value); setError(''); }}
                                        onKeyDown={e => e.key === 'Enter' && handleReset()}
                                    />
                                    <button style={s.eyeBtn} onClick={() => setShowConfirm(!showConfirm)} type="button">
                                        {showConfirm ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {confirm && confirm !== newPassword && (
                                    <span style={s.matchMsg}>❌ Las contraseñas no coinciden</span>
                                )}
                                {confirm && confirm === newPassword && (
                                    <span style={{ ...s.matchMsg, color: '#22c55e' }}>✅ Las contraseñas coinciden</span>
                                )}
                            </div>

                            {error && <p style={s.error}>⚠ {error}</p>}

                            <button
                                style={{ ...s.btn, opacity: loading || !newPassword || !confirm ? 0.7 : 1 }}
                                onClick={handleReset}
                                disabled={loading || !newPassword || !confirm}
                            >
                                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                            </button>

                            <button style={s.link} onClick={() => navigate('/')}>
                                ← Volver al inicio de sesión
                            </button>
                        </div>
                    </>
                )}

                <div style={s.footer}>
                    <img src={dataFoodBlanco} alt="DataFood" style={s.footerLogo} />
                </div>
            </div>
        </div>
    );
}

const s = {
    overlay: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fde8d8',
        fontFamily: "'Segoe UI', sans-serif",
    },
    card: {
        background: '#fff5f0',
        borderRadius: '16px',
        boxShadow: '0 6px 32px rgba(0,0,0,0.10)',
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem 2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    iconWrapper: { marginBottom: '1.2rem' },
    iconCircle: {
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        border: '2.5px solid #20b2aa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2.5rem',
        background: '#fff',
        boxShadow: '0 4px 16px rgba(32,178,170,0.15)',
    },
    title: {
        fontSize: '1.4rem',
        fontWeight: 700,
        color: '#222',
        margin: '0 0 0.5rem 0',
        textAlign: 'center',
    },
    desc: {
        fontSize: '0.88rem',
        color: '#666',
        textAlign: 'center',
        margin: '0 0 1.5rem 0',
        lineHeight: '1.5',
    },
    doneBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        width: '100%',
    },
    countdown: {
        width: '100%',
        height: '4px',
        background: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        width: '100%',
        background: '#20b2aa',
        borderRadius: '4px',
        animation: 'shrink 3s linear forwards',
    },
    form: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    label: {
        fontSize: '0.88rem',
        fontWeight: 600,
        color: '#333',
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    input: {
        width: '100%',
        padding: '0.65rem 2.5rem 0.65rem 0.9rem',
        borderRadius: '8px',
        border: 'none',
        background: '#f5c9b0',
        fontSize: '0.95rem',
        outline: 'none',
        color: '#333',
        marginTop: '2px',
        boxSizing: 'border-box',
    },
    eyeBtn: {
        position: 'absolute',
        right: '10px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
        padding: '0',
        lineHeight: '1',
    },
    strengthWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.3rem',
    },
    strengthBar: {
        display: 'flex',
        gap: '3px',
        flex: 1,
    },
    strengthSegment: {
        flex: 1,
        height: '4px',
        borderRadius: '4px',
        transition: 'background 0.3s',
    },
    strengthLabel: {
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
    },
    matchMsg: {
        fontSize: '0.78rem',
        color: '#ef4444',
        marginTop: '2px',
    },
    btn: {
        padding: '0.75rem',
        borderRadius: '10px',
        border: 'none',
        background: '#f05a1a',
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.95rem',
        cursor: 'pointer',
        width: '100%',
        transition: 'opacity 0.2s',
    },
    btnSecondary: {
        padding: '0.65rem 1.5rem',
        borderRadius: '10px',
        border: '2px solid #20b2aa',
        background: 'transparent',
        color: '#20b2aa',
        fontWeight: 600,
        fontSize: '0.9rem',
        cursor: 'pointer',
    },
    link: {
        background: 'none',
        border: 'none',
        color: '#20b2aa',
        fontSize: '0.88rem',
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'center',
        padding: '0.25rem',
        textDecoration: 'underline',
    },
    error: {
        color: '#dc2626',
        fontSize: '0.85rem',
        margin: 0,
    },
    footer: {
        marginTop: '1.8rem',
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        borderTop: '1px solid #e8d0bc',
        paddingTop: '1rem',
    },
    footerLogo: {
        height: '200px',
        objectFit: 'contain',
        opacity: 0.85,
    },
};