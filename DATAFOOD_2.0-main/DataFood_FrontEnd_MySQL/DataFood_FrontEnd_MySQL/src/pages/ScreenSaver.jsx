import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dataFoodNaranja from '../assets/DataFoodNaranja.png';
import './ScreenSaver.css';

const IDLE_SCREENSAVER = 15_000;  // 15 segundos → screensaver
const IDLE_LOGOUT      = 60_000;  // 60 segundos → cerrar sesión

export default function ScreenSaver({ onLogout }) {
    const [state, setState] = useState('active'); // 'active' | 'screensaver' | 'logout'
    const idleTimer    = useRef(null);
    const logoutTimer  = useRef(null);
    const navigate     = useNavigate();

    const clearTimers = () => {
        clearTimeout(idleTimer.current);
        clearTimeout(logoutTimer.current);
    };

    const resetTimers = useCallback(() => {
        clearTimers();
        idleTimer.current = setTimeout(() => {
            setState('screensaver');
            // Desde que aparece el screensaver, da 45s más antes de logout (total 60s)
            logoutTimer.current = setTimeout(() => {
                setState('logout');
            }, IDLE_LOGOUT - IDLE_SCREENSAVER);
        }, IDLE_SCREENSAVER);
    }, []);

    // Iniciar timers y escuchar actividad
    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
        const onActivity = () => {
            if (state === 'logout') return; // ya expiró, no reactivar
            setState('active');
            resetTimers();
        };
        events.forEach(e => window.addEventListener(e, onActivity));
        resetTimers();
        return () => {
            clearTimers();
            events.forEach(e => window.removeEventListener(e, onActivity));
        };
    }, [resetTimers, state]);

    // Cuando llega a 'logout', redirigir al login
    useEffect(() => {
        if (state === 'logout') {
            clearTimers();
            if (onLogout) onLogout();
        }
    }, [state, onLogout]);

    if (state !== 'screensaver') return null;

    return (
        <div className="screensaver-overlay" onClick={() => { setState('active'); resetTimers(); }}>
            <img src={dataFoodNaranja} alt="DataFood" className="screensaver-img" />
            <p className="screensaver-hint">Toca o mueve el mouse para continuar</p>
        </div>
    );
}