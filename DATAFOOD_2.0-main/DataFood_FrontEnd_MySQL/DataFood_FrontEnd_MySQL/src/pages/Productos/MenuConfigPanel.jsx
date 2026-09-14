import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMenuInfo, savePhone, uploadMenuLogo } from '../../api/businessApi';

/* ─────────────────────────────────────────────
   ImageCropModal
   Permite arrastrar y hacer zoom a la imagen
   antes de confirmar el recorte.
───────────────────────────────────────────── */
function ImageCropModal({ file, onConfirm, onCancel }) {
    const frameRef = useRef(null);
    const imgRef   = useRef(null);
    const drag     = useRef(null);

    const [src,      setSrc]      = useState('');
    const [dScale,   setDScale]   = useState(1);
    const [zoom,     setZoom]     = useState(1.0);
    const [pos,      setPos]      = useState({ x: 0, y: 0 });
    const natRef = useRef({ w: 1, h: 1 });

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const clampPos = (px, py, ds, zm) => {
        const fw = frameRef.current?.offsetWidth  || 1;
        const fh = frameRef.current?.offsetHeight || 1;
        const dispW = natRef.current.w * ds * zm;
        const dispH = natRef.current.h * ds * zm;

        return {
            x: clamp(px, fw - dispW, 0),
            y: clamp(py, fh - dispH, 0),
        };
    };

    const onImgLoad = () => {
        const fw = frameRef.current.offsetWidth;
        const fh = frameRef.current.offsetHeight;
        const iw = imgRef.current.naturalWidth;
        const ih = imgRef.current.naturalHeight;

        natRef.current = { w: iw, h: ih };

        const ds = Math.max(fw / iw, fh / ih);
        setDScale(ds);
        setZoom(1.0);

        const dispW = iw * ds;
        const dispH = ih * ds;

        setPos({
            x: (fw - dispW) / 2,
            y: (fh - dispH) / 2,
        });
    };

    const onSlider = (e) => {
        const newZoom = Number(e.target.value) / 100;
        const fw = frameRef.current.offsetWidth;
        const fh = frameRef.current.offsetHeight;

        setPos(prev => {
            const cx = fw / 2;
            const cy = fh / 2;
            const factor = newZoom / zoom;

            return clampPos(
                cx + (prev.x - cx) * factor,
                cy + (prev.y - cy) * factor,
                dScale,
                newZoom
            );
        });

        setZoom(newZoom);
    };

    const startDrag = (cx, cy) => {
        drag.current = { sx: cx, sy: cy, px: pos.x, py: pos.y };
    };

    const moveDrag = (cx, cy) => {
        if (!drag.current) return;

        const { sx, sy, px, py } = drag.current;

        setPos(clampPos(
            px + cx - sx,
            py + cy - sy,
            dScale,
            zoom
        ));
    };

    const endDrag = () => {
        drag.current = null;
    };

    const handleConfirm = () => {
        const fw = frameRef.current.offsetWidth;
        const fh = frameRef.current.offsetHeight;
        const ds = dScale;
        const zm = zoom;

        const sx = (0 - pos.x) / (ds * zm);
        const sy = (0 - pos.y) / (ds * zm);
        const sw = fw / (ds * zm);
        const sh = fh / (ds * zm);

        const canvas = document.createElement('canvas');
        canvas.width  = 1920;
        canvas.height = 400;

        canvas
            .getContext('2d')
            .drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, 1920, 400);

        canvas.toBlob(blob => onConfirm(blob), 'image/jpeg', 0.92);
    };

    const overlayStyle = {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.80)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
    };

    const modalStyle = {
        background: '#1e1e1e',
        border: '1px solid #3a3a3a',
        borderRadius: '16px',
        padding: '1.5rem',
        width: 'min(520px, 95vw)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxSizing: 'border-box',
    };

    return (
        <div
            style={overlayStyle}
            onMouseUp={endDrag}
            onMouseMove={e => moveDrag(e.clientX, e.clientY)}
        >
            <div style={modalStyle}>

                <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                    🖼️ Ajustar banner del menú
                </p>

                <div
                    ref={frameRef}
                    style={{
                        width: '100%',
                        height: '130px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#111',
                        cursor: 'grab',
                        border: '1.5px solid #444',
                        userSelect: 'none',
                    }}
                    onMouseDown={e => {
                        e.preventDefault();
                        startDrag(e.clientX, e.clientY);
                    }}
                    onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchMove={e => {
                        e.preventDefault();
                        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
                    }}
                    onTouchEnd={endDrag}
                >
                    {src && (
                        <img
                            ref={imgRef}
                            src={src}
                            onLoad={onImgLoad}
                            draggable={false}
                            alt="vista previa banner"
                            style={{
                                position: 'absolute',
                                width:  natRef.current.w * dScale * zoom,
                                height: natRef.current.h * dScale * zoom,
                                left: pos.x,
                                top:  pos.y,
                                userSelect: 'none',
                                pointerEvents: 'none',
                            }}
                        />
                    )}

                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            border: '1.5px solid rgba(255,255,255,0.25)',
                            borderRadius: '9px',
                            pointerEvents: 'none',
                        }}
                    />
                </div>

                <p style={{ margin: 0, color: '#666', fontSize: '0.75rem', textAlign: 'center' }}>
                    Arrastra para mover · Usa el slider para hacer zoom
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1rem' }}>🔍</span>

                    <input
                        type="range"
                        min="100"
                        max="300"
                        step="1"
                        value={Math.round(zoom * 100)}
                        onChange={onSlider}
                        style={{ flex: 1, accentColor: '#f05a1a', cursor: 'pointer' }}
                    />

                    <span style={{ color: '#fff', fontSize: '0.82rem', minWidth: '38px', textAlign: 'right' }}>
                        {zoom.toFixed(1)}×
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'transparent',
                            border: '1px solid #444',
                            color: '#999',
                            borderRadius: '8px',
                            padding: '7px 18px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                        }}
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={handleConfirm}
                        style={{
                            background: '#f05a1a',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '7px 20px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                        }}
                    >
                        ✅ Confirmar recorte
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   MenuConfig
───────────────────────────────────────────── */
export default function MenuConfig() {
    const navigate = useNavigate();

    const [logoUrl,    setLogoUrl]    = useState(null);
    const [phone,      setPhone]      = useState('');
    const [phoneInput, setPhoneInput] = useState('');
    const [saving,     setSaving]     = useState(false);
    const [msg,        setMsg]        = useState({ text: '', type: '' });
    const [cropFile,   setCropFile]   = useState(null);

    const fileRef = useRef(null);

    function formatPhoneInput(value) {
        let digits = String(value || '').replace(/\D/g, '');

        if (digits.startsWith('505')) {
            digits = digits.slice(3);
        }

        digits = digits.slice(0, 8);

        if (digits.length > 4) {
            return `${digits.slice(0, 4)}-${digits.slice(4)}`;
        }

        return digits;
    }

    function formatWhatsappPhone(value) {
        let clean = String(value || '').replace(/\D/g, '');

        if (clean.startsWith('505') && clean.length === 11) {
            return clean;
        }

        if (clean.length === 8) {
            clean = `505${clean}`;
        }

        return clean;
    }

    useEffect(() => {
        getMenuInfo().then(({ phone, menuLogoUrl }) => {
            const cleanPhone = formatWhatsappPhone(phone);

            setPhone(cleanPhone);
            setPhoneInput(formatPhoneInput(cleanPhone));
            setLogoUrl(menuLogoUrl);
        });
    }, []);

    const flash = (text, type = 'ok') => {
        setMsg({ text, type });
        setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        setCropFile(file);
        e.target.value = '';
    };

    const handleCropConfirm = async (blob) => {
        setCropFile(null);
        setSaving(true);

        const croppedFile = new File([blob], 'banner.jpg', { type: 'image/jpeg' });
        const url = await uploadMenuLogo(croppedFile);

        if (url) {
            setLogoUrl(url);
            flash('Logo del menú actualizado', 'ok');
        } else {
            flash('Error al subir el logo', 'err');
        }

        setSaving(false);
    };

    const handleSavePhone = async () => {
        const cleanPhone = formatWhatsappPhone(phoneInput);

        if (!cleanPhone) return;

        if (cleanPhone.length !== 11 || !cleanPhone.startsWith('505')) {
            flash('El número debe tener 8 dígitos. Ej: 8123-0094', 'err');
            return;
        }

        setSaving(true);

        const saved = await savePhone(cleanPhone);

        if (saved !== null) {
            const finalPhone = formatWhatsappPhone(saved);

            setPhone(finalPhone);
            setPhoneInput(formatPhoneInput(finalPhone));
            flash('Teléfono guardado', 'ok');
        } else {
            flash('Error al guardar teléfono', 'err');
        }

        setSaving(false);
    };

    const whatsappPhone = formatWhatsappPhone(phone || phoneInput);
    const waMsg = encodeURIComponent('Hola! Vi el menú y quiero hacer un pedido 😊');

    return (
        <div className="prod-page">

            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    aspectRatio={1920 / 400}
                    onConfirm={handleCropConfirm}
                    onCancel={() => setCropFile(null)}
                />
            )}

            <div className="prod-top-actions">
                <button className="btn-regresar" onClick={() => navigate('/')}>
                    Principal
                </button>
            </div>

            {msg.text && (
                <div
                    className="prod-error"
                    style={{
                        background: msg.type === 'ok' ? '#d1fae5' : undefined,
                        color:      msg.type === 'ok' ? '#065f46' : undefined,
                    }}
                >
                    {msg.type === 'ok' ? '✅' : '⚠'} {msg.text}
                    <button onClick={() => setMsg({ text: '', type: '' })}>✕</button>
                </div>
            )}

            <div className="prod-admin-grid">

                {/* ── Panel Logo ── */}
                <div className="admin-panel">
                    <div className="admin-header">🖼️ Banner del Menú</div>

                    <div className="admin-body" style={{ alignItems: 'center', gap: '1.5rem' }}>

                        <p style={{ color: '#aaa', fontSize: '0.82rem', margin: 0, textAlign: 'center' }}>
                            Imagen horizontal que aparece como portada del menú, foto del local, platillos, etc.
                        </p>

                        <div
                            onClick={() => fileRef.current?.click()}
                            style={{
                                width: '100%',
                                height: '140px',
                                borderRadius: '12px',
                                background: '#3a3a3a',
                                border: '2px dashed #555',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'border-color 0.2s',
                            }}
                        >
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="logo menú"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            ) : (
                                <span style={{ fontSize: '3.5rem' }}>🖼️</span>
                            )}

                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    fontSize: '1.5rem',
                                    color: '#fff',
                                }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0}
                            >
                                📷 Cambiar
                            </div>
                        </div>

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleLogoChange}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                                className="btn-save-new"
                                onClick={() => fileRef.current?.click()}
                                disabled={saving}
                                style={{ width: '140px' }}
                            >
                                {saving ? '⏳ Subiendo…' : logoUrl ? '📷 Cambiar banner' : '📷 Subir banner'}
                            </button>

                            <span style={{ color: '#777', fontSize: '0.75rem' }}>
                                JPG, PNG · recomendado 1920×400px horizontal
                            </span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: '#aaa', fontSize: '0.78rem', marginBottom: '0.4rem' }}>
                                Vista previa del menú:
                            </p>

                            <a
                                href="/menu"
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    color: '#f05a1a',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                }}
                            >
                                🔗 {window.location.origin}/menu
                            </a>
                        </div>
                    </div>
                </div>

                {/* ── Panel WhatsApp ── */}
                <div className="admin-panel">
                    <div className="admin-header">📱 WhatsApp del Negocio</div>

                    <div className="admin-body" style={{ gap: '1.2rem' }}>

                        <p style={{ color: '#aaa', fontSize: '0.82rem', margin: 0 }}>
                            Los clientes podrán escribirte directamente desde el menú. Escribí solo los 8 dígitos;
                            el sistema agregará el código <strong style={{ color: '#fff' }}>505</strong> automáticamente.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#ccc', fontSize: '0.85rem', fontWeight: 600 }}>
                                Número
                            </label>

                            <div className="cat-input-row">
                                <input
                                    type="tel"
                                    placeholder="Ej: 8123-0094"
                                    value={phoneInput}
                                    onChange={e => setPhoneInput(formatPhoneInput(e.target.value))}
                                    onKeyDown={e => e.key === 'Enter' && handleSavePhone()}
                                    maxLength={9}
                                />
                            </div>

                            <span style={{ color: '#666', fontSize: '0.75rem' }}>
                                Se mostrará como 8123-0094 y se guardará como 50581230094
                            </span>
                        </div>

                        <div className="cat-action-row">
                            <button
                                className="btn-save-new"
                                onClick={handleSavePhone}
                                disabled={saving || !phoneInput.trim()}
                            >
                                {saving ? '...' : '💾 Guardar número'}
                            </button>
                        </div>

                        {phone && (
                            <div
                                style={{
                                    background: '#2a2a2a',
                                    borderRadius: '10px',
                                    padding: '1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                }}
                            >
                                <span
                                    style={{
                                        color: '#aaa',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                    }}
                                >
                                    Vista previa
                                </span>

                                <a
                                    href={`https://wa.me/${whatsappPhone}?text=${waMsg}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        background: '#25d366',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '20px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        width: 'fit-content',
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>

                                    Escribir al negocio
                                </a>

                                <span style={{ color: '#666', fontSize: '0.72rem' }}>
                                    Visible: {formatPhoneInput(phone)}
                                </span>

                                <span style={{ color: '#666', fontSize: '0.72rem' }}>
                                    WhatsApp: wa.me/{whatsappPhone}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}