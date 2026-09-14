const API = import.meta.env.VITE_API_URL;

// ── Comprimir imagen ──────────────────────────────────────────────────────────
function compressImage(file, maxWidthPx = 400, quality = 0.75) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale   = Math.min(1, maxWidthPx / img.width);
                canvas.width  = img.width  * scale;
                canvas.height = img.height * scale;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
                    'image/jpeg',
                    quality
                );
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ── Helper: parse seguro ──────────────────────────────────────────────────────
async function safeJson(res) {
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
}

// ── Logo del dashboard ────────────────────────────────────────────────────────
export const getBusinessLogo = async () => {
    try {
        const res  = await fetch(`${API}/api/business/logo`);
        const data = await safeJson(res);
        return data?.logoUrl ? `${API}${data.logoUrl}?t=${Date.now()}` : null;
    } catch { return null; }
};

export const uploadBusinessLogo = async (file) => {
    try {
        const compressed = await compressImage(file, 1920, 0.85);
        const form = new FormData();
        form.append('file', compressed);
        const res  = await fetch(`${API}/api/business/logo`, { method: 'POST', body: form });
        const data = await safeJson(res);
        return data?.logoUrl ? `${API}${data.logoUrl}?t=${Date.now()}` : null;
    } catch (err) { console.error('uploadBusinessLogo:', err); return null; }
};

// ── Info del menú (logo menú + teléfono) ─────────────────────────────────────
export const getMenuInfo = async () => {
    try {
        const res  = await fetch(`${API}/api/business/info`);
        const data = await safeJson(res);
        return {
            phone:       data?.phone       || '',
            menuLogoUrl: data?.menuLogoUrl ? `${API}${data.menuLogoUrl}?t=${Date.now()}` : null,
        };
    } catch { return { phone: '', menuLogoUrl: null }; }
};

export const savePhone = async (phone) => {
    try {
        const res  = await fetch(`${API}/api/business/phone`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ phone }),
        });
        const data = await safeJson(res);
        return data?.phone || null;
    } catch (err) { console.error('savePhone:', err); return null; }
};

// El banner del menú viene ya recortado desde el canvas (1920×400).
// NO se vuelve a comprimir porque eso lo reduciría a 600px y quedaría pixelado.
// Solo se reencoda a JPEG con calidad alta para optimizar el peso sin perder nitidez.
export const uploadMenuLogo = async (file) => {
    try {
        // Reencoda a JPEG 92% sin reducir dimensiones
        const reencoded = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width  = img.width;
                    canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    canvas.toBlob(
                        (blob) => resolve(new File([blob], 'banner.jpg', { type: 'image/jpeg' })),
                        'image/jpeg',
                        0.92
                    );
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });

        const form = new FormData();
        form.append('file', reencoded);
        const res  = await fetch(`${API}/api/business/menu-logo`, { method: 'POST', body: form });
        const data = await safeJson(res);
        return data?.menuLogoUrl ? `${API}${data.menuLogoUrl}?t=${Date.now()}` : null;
    } catch (err) { console.error('uploadMenuLogo:', err); return null; }


};