import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Bloquea overscroll en Edge, Firefox y cualquier navegador
const preventOverscroll = (e) => {
    // Busca el contenedor scrolleable más cercano
    let el = e.target;
    while (el && el !== document.documentElement) {
        const style = getComputedStyle(el);
        const overflow = style.overflow + style.overflowY;
        const canScroll = overflow.includes('auto') || overflow.includes('scroll');

        if (canScroll && el.scrollHeight > el.clientHeight) {
            const atTop    = el.scrollTop <= 0;
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
            const goingUp   = e.deltaY < 0;
            const goingDown = e.deltaY > 0;

            if ((atTop && goingUp) || (atBottom && goingDown)) {
                e.preventDefault();
                e.stopPropagation();
            }
            return; // encontró el contenedor, no sigue subiendo
        }
        el = el.parentElement;
    }
    // Si no encontró contenedor scrolleable, bloquea directo
    e.preventDefault();
};

window.addEventListener('wheel',     preventOverscroll, { passive: false, capture: true });
window.addEventListener('touchmove', preventOverscroll, { passive: false, capture: true });

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)