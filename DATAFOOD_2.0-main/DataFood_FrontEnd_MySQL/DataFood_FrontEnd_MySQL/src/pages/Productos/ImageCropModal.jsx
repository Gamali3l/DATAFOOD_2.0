import { useEffect, useRef, useState, useCallback } from 'react';

export default function ImageCropModal({ file, aspectRatio = 1920/400, onConfirm, onCancel }) {
    const frameRef = useRef(null);
    const imgRef   = useRef(null);
    const [scale, setScale]   = useState(1.2);
    const [pos, setPos]       = useState({ x: 0, y: 0 });
    const [natSize, setNatSize] = useState({ w: 0, h: 0 });
    const drag = useRef(null);

    // Cargar imagen desde File
    const [src, setSrc] = useState('');
    useEffect(() => {
        const url = URL.createObjectURL(file);
        setSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const applyClamp = useCallback((px, py, sc, nw, nh) => {
        const fw = frameRef.current?.offsetWidth  || 0;
        const fh = frameRef.current?.offsetHeight || 0;
        const iw = nw * sc, ih = nh * sc;
        return {
            x: clamp(px, Math.min(0, fw - iw), 0),
            y: clamp(py, Math.min(0, fh - ih), 0),
        };
    }, []);

    const onImgLoad = () => {
        const fw = frameRef.current.offsetWidth;
        const fh = frameRef.current.offsetHeight;
        let nw = fw, nh = fw / aspectRatio;
        if (nh < fh) { nh = fh; nw = fh * aspectRatio; }
        setNatSize({ w: nw, h: nh });
        const initScale = 1.0;
        setScale(initScale);
        setPos(applyClamp(
            (fw - nw * initScale) / 2,
            (fh - nh * initScale) / 2,
            initScale, nw, nh
        ));
    };

    const onSlider = (e) => {
        const newScale = Number(e.target.value) / 100;
        const fw = frameRef.current.offsetWidth;
        const fh = frameRef.current.offsetHeight;
        setPos(prev => applyClamp(
            prev.x - (fw / 2) * (newScale - scale) / scale,
            prev.y - (fh / 2) * (newScale - scale) / scale,
            newScale, natSize.w, natSize.h
        ));
        setScale(newScale);
    };

    const startDrag = (cx, cy) => {
        drag.current = { sx: cx, sy: cy, px: pos.x, py: pos.y };
    };
    const moveDrag = (cx, cy) => {
        if (!drag.current) return;
        const { sx, sy, px, py } = drag.current;
        setPos(applyClamp(px + cx - sx, py + cy - sy, scale, natSize.w, natSize.h));
    };
    const endDrag = () => { drag.current = null; };

    const handleConfirm = () => {
        const fw = frameRef.current.offsetWidth;
        const fh = frameRef.current.offsetHeight;
        const canvas = document.createElement('canvas');
        canvas.width  = 1920;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        const sx = -pos.x / scale;
        const sy = -pos.y / scale;
        const sw = fw / scale;
        const sh = fh / scale;
        ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, 1920, 400);
        canvas.toBlob(blob => onConfirm(blob), 'image/jpeg', 0.92);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
            <div style={{
                background: '#2a2a2a', borderRadius: '14px', padding: '1.5rem',
                width: 'min(500px, 95vw)', display: 'flex', flexDirection: 'column', gap: '1rem',
            }}>
                <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                    🖼️ Ajustar banner
                </p>

                {/* Frame de recorte */}
                <div
                    ref={frameRef}
                    style={{
                        width: '100%', height: '120px', borderRadius: '10px',
                        overflow: 'hidden', position: 'relative', background: '#111',
                        cursor: 'grab', border: '1.5px solid #444',
                    }}
                    onMouseDown={e => startDrag(e.clientX, e.clientY)}
                    onMouseMove={e => moveDrag(e.clientX, e.clientY)}
                    onMouseUp={endDrag}
                    onMouseLeave={endDrag}
                    onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }}
                    onTouchEnd={endDrag}
                >
                    {src && (
                        <img
                            ref={imgRef}
                            src={src}
                            onLoad={onImgLoad}
                            draggable={false}
                            style={{
                                position: 'absolute',
                                width:  natSize.w * scale,
                                height: natSize.h * scale,
                                left: pos.x, top: pos.y,
                                userSelect: 'none', pointerEvents: 'none',
                            }}
                            alt=""
                        />
                    )}
                </div>

                <p style={{ margin: 0, color: '#888', fontSize: '0.75rem', textAlign: 'center' }}>
                    Arrastra para mover · Zoom para ajustar el encuadre
                </p>

                {/* Zoom slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#aaa', fontSize: '0.8rem' }}>🔍 Zoom</span>
                    <input
                        type="range" min="100" max="300" step="1"
                        value={Math.round(scale * 100)}
                        onChange={onSlider}
                        style={{ flex: 1 }}
                    />
                    <span style={{ color: '#fff', fontSize: '0.82rem', minWidth: '36px' }}>
                        {scale.toFixed(1)}×
                    </span>
                </div>

                {/* Botones */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'transparent', border: '1px solid #555',
                            color: '#aaa', borderRadius: '8px', padding: '7px 16px',
                            cursor: 'pointer', fontSize: '0.85rem',
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        style={{
                            background: '#f05a1a', border: 'none', color: '#fff',
                            borderRadius: '8px', padding: '7px 18px',
                            cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                        }}
                    >
                        ✅ Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}