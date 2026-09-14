import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dataFoodBlanco from '../assets/DataFood_blanco.png';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep]           = useState(1); // 1=email, 2=código+contraseña
    const [email, setEmail]         = useState('');
    const [code, setCode]           = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm]     = useState('');
    const [showNew, setShowNew]     = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading]     = useState(false);
    const [done, setDone]           = useState(false);
    const [error, setError]         = useState('');

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

    // Paso 1: enviar correo
    const handleSendCode = async () => {
        if (!email.trim()) { setError('Ingresa tu correo.'); return; }
        setLoading(true); setError('');
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            setStep(2); // siempre avanza (no revela si el email existe)
        } catch {
            setError('Error al enviar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // Paso 2: verificar código y cambiar contraseña
    const handleReset = async () => {
        if (code.length !== 6)          { setError('El código debe tener 6 dígitos.'); return; }
        if (newPassword.length < 6)     { setError('Mínimo 6 caracteres.'); return; }
        if (newPassword !== confirm)    { setError('Las contraseñas no coinciden.'); return; }
        setLoading(true); setError('');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: code, newPassword }),
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Código inválido o expirado.');
            }
            setDone(true);
            setTimeout(() => navigate('/'), 3000);
        } catch (e) {
            setError(e.message || 'Error al restablecer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.overlay}>
            <div style={s.card}>
                <div style={s.iconCircle}>
                    {done ? '✅' : step === 1 ? '🔐' : '📬'}
                </div>

                {done ? (
                    <>
                        <h2 style={s.title}>¡Contraseña actualizada!</h2>
                        <p style={s.desc}>Serás redirigido al inicio de sesión en unos segundos...</p>
                        <button style={s.btnSecondary} onClick={() => navigate('/')}>
                            Ir al inicio de sesión →
                        </button>
                    </>
                ) : step === 1 ? (
                    <>
                        <h2 style={s.title}>Recuperar contraseña</h2>
                        <p style={s.desc}>Te enviaremos un código de 6 dígitos a tu correo.</p>
                        <div style={s.form}>
                            <div style={s.inputGroup}>
                                <label style={s.label}>Correo electrónico</label>
                                <input
                                    style={s.input}
                                    type="email"
                                    placeholder="usuario@datafood.com"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                                    autoFocus
                                />
                            </div>
                            {error && <div style={s.errorBox}>⚠ {error}</div>}
                            <button
                                style={{ ...s.btn, opacity: loading || !email.trim() ? 0.7 : 1 }}
                                onClick={handleSendCode}
                                disabled={loading || !email.trim()}
                            >
                                {loading ? 'Enviando...' : 'Enviar código'}
                            </button>
                            <button style={s.link} onClick={() => navigate('/')}>
                                ← Volver al inicio de sesión
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 style={s.title}>Ingresa el código</h2>
                        <p style={s.desc}>
                            Enviamos un código de 6 dígitos a <b>{email}</b>.<br/>
                            Revisa tu bandeja o carpeta de spam.
                        </p>
                        <div style={s.form}>
                            {/* Código */}
                            <div style={s.inputGroup}>
                                <label style={s.label}>Código de verificación</label>
                                <input
                                    style={{ ...s.input, textAlign: 'center', letterSpacing: '8px',
                                        fontSize: '1.4rem', fontWeight: 700 }}
                                    type="text"
                                    placeholder="000000"
                                    maxLength={6}
                                    value={code}
                                    onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                                    autoFocus
                                />
                            </div>

                            {/* Nueva contraseña */}
                            <div style={s.inputGroup}>
                                <label style={s.label}>Nueva contraseña</label>
                                <div style={s.inputWrapper}>
                                    <input
                                        style={s.input}
                                        type={showNew ? 'text' : 'password'}
                                        placeholder="Mínimo 6 caracteres"
                                        value={newPassword}
                                        onChange={e => { setNewPassword(e.target.value); setError(''); }}
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
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: strengthColor }}>
                                            {strengthLabel}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Confirmar contraseña */}
                            <div style={s.inputGroup}>
                                <label style={s.label}>Confirmar contraseña</label>
                                <div style={s.inputWrapper}>
                                    <input
                                        style={{
                                            ...s.input,
                                            border: confirm && confirm !== newPassword ? '1.5px solid #ef4444'
                                                : confirm && confirm === newPassword ? '1.5px solid #22c55e'
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
                                    <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>❌ No coinciden</span>
                                )}
                                {confirm && confirm === newPassword && (
                                    <span style={{ fontSize: '0.78rem', color: '#22c55e' }}>✅ Coinciden</span>
                                )}
                            </div>

                            {error && <div style={s.errorBox}>⚠ {error}</div>}

                            <button
                                style={{ ...s.btn, opacity: loading || !code || !newPassword || !confirm ? 0.7 : 1 }}
                                onClick={handleReset}
                                disabled={loading || !code || !newPassword || !confirm}
                            >
                                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                            </button>

                            <button style={s.link} onClick={() => { setStep(1); setError(''); }}>
                                ← Cambiar correo
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
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#fde8d8',
        fontFamily: "'Segoe UI', sans-serif",
    },
    card: {
        background: '#fff5f0', borderRadius: '16px',
        boxShadow: '0 6px 32px rgba(0,0,0,0.10)', width: '100%',
        maxWidth: '420px', padding: '2.5rem 2rem 1.5rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
    },
    iconCircle: {
        width: '90px', height: '90px', borderRadius: '50%',
        border: '2.5px solid #20b2aa', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '2.5rem', background: '#fff',
        boxShadow: '0 4px 16px rgba(32,178,170,0.15)',
        marginBottom: '1rem',
    },
    title: { fontSize: '1.4rem', fontWeight: 700, color: '#222', margin: '0 0 0.25rem', textAlign: 'center' },
    desc:  { fontSize: '0.88rem', color: '#666', textAlign: 'center', margin: '0 0 1rem', lineHeight: '1.5' },
    form:  { width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    label: { fontSize: '0.88rem', fontWeight: 600, color: '#333' },
    input: {
        padding: '0.65rem 0.9rem', borderRadius: '8px', border: 'none',
        background: '#f5c9b0', fontSize: '0.95rem', outline: 'none',
        color: '#333', marginTop: '2px', width: '100%', boxSizing: 'border-box',
    },
    inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
    eyeBtn: {
        position: 'absolute', right: '10px', background: 'none',
        border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0,
    },
    strengthWrapper: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' },
    strengthBar: { display: 'flex', gap: '3px', flex: 1 },
    strengthSegment: { flex: 1, height: '4px', borderRadius: '4px', transition: 'background 0.3s' },
    btn: {
        padding: '0.75rem', borderRadius: '10px', border: 'none',
        background: '#f05a1a', color: '#fff', fontWeight: 700,
        fontSize: '0.95rem', cursor: 'pointer', width: '100%',
    },
    btnSecondary: {
        padding: '0.65rem 1.5rem', borderRadius: '10px',
        border: '2px solid #20b2aa', background: 'transparent',
        color: '#20b2aa', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
    },
    link: {
        background: 'none', border: 'none', color: '#20b2aa',
        fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
        textAlign: 'center', textDecoration: 'underline', padding: '0.25rem',
    },
    errorBox: {
        background: '#fef2f2', border: '1px solid #fca5a5',
        borderRadius: '8px', padding: '0.5rem 0.75rem',
        color: '#dc2626', fontSize: '0.85rem',
    },
    footer: {
        marginTop: '1.5rem', display: 'flex', justifyContent: 'center',
        width: '100%', borderTop: '1px solid #e8d0bc', paddingTop: '1rem',
    },
    footerLogo: { height: '180px', objectFit: 'contain', opacity: 0.85 },
};