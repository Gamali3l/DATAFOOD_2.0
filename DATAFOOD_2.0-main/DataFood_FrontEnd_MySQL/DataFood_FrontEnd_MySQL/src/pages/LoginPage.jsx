import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import dataFoodBlanco from '../assets/DataFood_blanco.png';
import { getBusinessLogo } from '../api/businessApi';

export default function LoginPage({ onLoginSuccess }) {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState('');
    const [logoImg,  setLogoImg]  = useState(null);
    const [shake,    setShake]    = useState(false);  // ← animación de error

    useEffect(() => {
        getBusinessLogo().then(url => {
            if (url) setLogoImg(url);
        });
    }, []);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Completa todos los campos.');
            triggerShake();
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Credenciales inválidas.');
            }
            const userData = await res.json();
            login(userData);
            onLoginSuccess(userData);
        } catch (e) {
            setError(e.message || 'Correo o contraseña incorrectos.');
            triggerShake();
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleLogin();
    };

    return (
        <div style={s.overlay}>
            {/* Animación shake en el card cuando hay error */}
            <style>{`
                @keyframes shake {
                    0%,100% { transform: translateX(0); }
                    20%     { transform: translateX(-8px); }
                    40%     { transform: translateX(8px); }
                    60%     { transform: translateX(-5px); }
                    80%     { transform: translateX(5px); }
                }
            `}</style>

            <div style={{
                ...s.card,
                animation: shake ? 'shake 0.5s ease' : 'none',
            }}>

                {/* ── Logo circular ── */}
                <div style={s.logoWrapper}>
                    <div style={s.logoCircle}>
                        {logoImg
                            ? <img src={logoImg} alt="logo" style={s.logoImg} />
                            : <span style={s.logoLetter}>R</span>
                        }
                    </div>
                    <h2 style={s.businessName}>Comedor Raquel</h2>
                </div>

                <div style={s.divider} />
                <p style={s.subheader}>Inicia sesión para continuar</p>

                {/* ── Formulario ── */}
                <div style={s.form}>
                    <div style={s.inputGroup}>
                        <label style={s.label}>Usuario</label>
                        <p style={s.hint}>Ingrese su correo electrónico</p>
                        <input
                            style={{
                                ...s.input,
                                border: error ? '1.5px solid #ef4444' : 'none',
                            }}
                            type="email"
                            placeholder="usuario@datafood.com"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setError(''); }}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>

                    <div style={s.inputGroup}>
                        <label style={s.label}>Ingrese su contraseña</label>
                        <input
                            style={{
                                ...s.input,
                                border: error ? '1.5px solid #ef4444' : 'none',
                            }}
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    {/* ── Error ── */}
                    {error && (
                        <div style={s.errorBox}>
                            <span>⚠</span>
                            <p style={s.errorText}>{error}</p>
                        </div>
                    )}

                    <button
                        style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>

                    {/* ── ¿Olvidaste tu contraseña? ── */}
                    <button
                        style={s.forgotBtn}
                        onClick={() => navigate('/forgot-password')}
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>

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
        gap: '0',
    },
    logoWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.2rem',
    },
    logoCircle: {
        width: '130px',
        height: '130px',
        borderRadius: '50%',
        border: '2.5px solid #20b2aa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#fff',
    },
    logoImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '50%',
    },
    logoLetter: {
        fontSize: '3rem',
        fontWeight: 700,
        color: '#20b2aa',
    },
    businessName: {
        fontSize: '1.4rem',
        fontWeight: 700,
        color: '#222',
        margin: 0,
    },
    divider: {
        width: '100%',
        height: '1px',
        background: '#e0e0e0',
        marginBottom: '0.6rem',
    },
    subheader: {
        fontSize: '0.85rem',
        color: '#20b2aa',
        fontWeight: 600,
        alignSelf: 'flex-start',
        margin: '0 0 1rem 0',
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
    hint: {
        fontSize: '0.78rem',
        color: '#888',
        margin: 0,
    },
    input: {
        padding: '0.65rem 0.9rem',
        borderRadius: '8px',
        border: 'none',
        background: '#f5c9b0',
        fontSize: '0.95rem',
        outline: 'none',
        color: '#333',
        marginTop: '2px',
    },
    btn: {
        padding: '0.75rem',
        borderRadius: '10px',
        border: 'none',
        background: '#f05a1a',
        color: '#fff',
        fontWeight: 700,
        fontSize: '1rem',
        cursor: 'pointer',
        marginTop: '0.5rem',
        alignSelf: 'center',
        width: '60%',
        transition: 'opacity 0.2s',
    },
    forgotBtn: {
        background: 'none',
        border: 'none',
        color: '#20b2aa',
        fontSize: '0.85rem',
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'center',
        textDecoration: 'underline',
        padding: '0',
        alignSelf: 'center',
    },
    errorBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: '8px',
        padding: '0.5rem 0.75rem',
    },
    errorText: {
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