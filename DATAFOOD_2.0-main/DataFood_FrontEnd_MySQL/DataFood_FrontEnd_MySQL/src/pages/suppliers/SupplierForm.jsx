import { useState, useEffect } from 'react';
import { createSupplier, getSupplier, updateSupplier } from '../../api/supplierApi';

/* ── Toast inline ───────────────────────────────────────────────────────────── */
function Toast({ toasts }) {
    return (
        <div style={{
            position: 'fixed', bottom: '1.5rem', right: '1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.6rem', zIndex: 99999,
            pointerEvents: 'none',
        }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    background: '#fff', borderRadius: '12px',
                    padding: '0.85rem 1.1rem',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
                    borderLeft: `4px solid ${t.type === 'ok' ? '#14b8a6' : '#ef4444'}`,
                    minWidth: '260px', maxWidth: '340px',
                    animation: 'toastIn 0.25s ease',
                    pointerEvents: 'auto',
                }}>
                    <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>
                        {t.type === 'ok' ? '✅' : '❌'}
                    </span>
                    <span style={{ fontSize: '0.88rem', color: '#1f2937', lineHeight: 1.4 }}>
                        {t.text}
                    </span>
                </div>
            ))}
            <style>{`
                @keyframes toastIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default function SupplierForm({ id, onClose }) {
    const isEdit = Boolean(id);

    const [toasts, setToasts] = useState([]);

    const flash = (text, type = 'ok') => {
        const tid = Date.now();
        setToasts(prev => [...prev, { id: tid, text, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 3500);
    };

    const [form, setForm] = useState({
        name:        '',
        company:     '',
        description: '',
        status:      1,
        phones:      ['', ''],
        addresses:   [''],
    });

    const formatPhone = (value) => {
        const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
        if (digits.length <= 4) return digits;
        return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    };

    const cleanPhone = (value) => String(value ?? '').replace(/\D/g, '');

    useEffect(() => {
        if (isEdit) {
            getSupplier(id).then(({ data }) => {
                const rawPhones = Array.isArray(data.phones) ? data.phones : [];
                setForm({
                    name:        data.name        ?? '',
                    company:     data.company     ?? '',
                    description: data.description ?? '',
                    status:      data.status      ?? 1,
                    phones:      [formatPhone(rawPhones[0] ?? ''), formatPhone(rawPhones[1] ?? '')],
                    addresses:   Array.isArray(data.addresses) && data.addresses.length
                        ? data.addresses : [''],
                });
            });
        }
    }, [id]);

    const handleChange  = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePhone   = (index, value) => setForm(prev => {
        const phones = [...prev.phones];
        phones[index] = formatPhone(value);
        return { ...prev, phones };
    });

    const handleAddress = (index, value) => setForm(prev => {
        const addresses = [...prev.addresses];
        addresses[index] = value;
        return { ...prev, addresses };
    });

    const handleSubmit = async () => {
        const phone1 = cleanPhone(form.phones[0]);
        const phone2 = cleanPhone(form.phones[1]);

        if (phone1 && phone1.length !== 8) {
            flash('El Teléfono 1 debe tener exactamente 8 dígitos.', 'err');
            return;
        }
        if (phone2 && phone2.length !== 8) {
            flash('El Teléfono 2 debe tener exactamente 8 dígitos.', 'err');
            return;
        }
        if (!form.name.trim()) {
            flash('El nombre del proveedor es obligatorio.', 'err');
            return;
        }

        const payload = {
            ...form,
            phones:    [phone1, phone2].filter(p => p !== ''),
            // Filtrar strings vacíos para que el backend haga clear() correctamente
            addresses: form.addresses.map(a => a.trim()).filter(a => a !== ''),
        };

        try {
            if (isEdit) {
                await updateSupplier(id, payload);
                flash('Proveedor actualizado correctamente', 'ok');
            } else {
                await createSupplier(payload);
                flash('Proveedor creado correctamente', 'ok');
            }
            setTimeout(() => onClose(), 1200);
        } catch (err) {
            console.error(err);
            flash(err.response?.data?.message || 'Error al guardar el proveedor.', 'err');
        }
    };

    return (
        <>
            <Toast toasts={toasts} />

            <div style={{ fontFamily: 'sans-serif', fontSize: '0.93rem', color: '#333' }}>

                <div style={sectionTitle}>Información Básica</div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>Nombre completo</label>
                    <input name="name" value={form.name} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>Nombre Compañía</label>
                    <input name="company" value={form.company} onChange={handleChange} style={inputStyle} />
                </div>

                <div style={{ ...sectionTitle, marginTop: '1rem' }}>Contacto</div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>Teléfono 1</label>
                    <input
                        value={form.phones[0]}
                        onChange={e => handlePhone(0, e.target.value)}
                        style={inputStyle}
                        maxLength={9}
                        placeholder="Ej. 8888-8888"
                    />
                </div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>Teléfono 2 <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional)</span></label>
                    <input
                        value={form.phones[1]}
                        onChange={e => handlePhone(1, e.target.value)}
                        style={inputStyle}
                        maxLength={9}
                        placeholder="Ej. 8888-8888"
                    />
                </div>

                <div style={{ ...sectionTitle, marginTop: '1rem' }}>Ubicación</div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>Dirección</label>
                    <input
                        value={form.addresses[0]}
                        onChange={e => handleAddress(0, e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div style={{ ...sectionTitle, marginTop: '1rem' }}>Estado</div>
                <div style={{ display: 'flex', gap: '1.5rem', margin: '0.5rem 0 1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                        <input type="radio" name="status" value={1} checked={form.status === 1}
                               onChange={() => setForm(prev => ({ ...prev, status: 1 }))} />
                        Activo
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                        <input type="radio" name="status" value={0} checked={form.status === 0}
                               onChange={() => setForm(prev => ({ ...prev, status: 0 }))} />
                        Inactivo
                    </label>
                </div>

                <div style={fieldGroup}>
                    <label style={labelStyle}>Descripción</label>
                    <textarea
                        rows={3} name="description" value={form.description}
                        onChange={handleChange}
                        style={{ ...inputStyle, resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button onClick={onClose} style={btnCancel}>Cancelar</button>
                    <button onClick={handleSubmit} style={btnSave}>Guardar</button>
                </div>
            </div>
        </>
    );
}

const sectionTitle = {
    fontWeight: 'bold', fontSize: '0.9rem', color: '#333',
    marginBottom: '0.5rem', borderBottom: '1px solid #e0c9b0', paddingBottom: '0.25rem',
};
const fieldGroup  = { display: 'flex', alignItems: 'center', marginBottom: '0.6rem', gap: '0.75rem' };
const labelStyle  = { width: '130px', minWidth: '130px', fontSize: '0.88rem', color: '#555' };
const inputStyle  = { flex: 1, padding: '0.45rem 0.7rem', borderRadius: '6px', border: '1.5px solid #ccc', fontSize: '0.9rem', outline: 'none', background: 'white' };
const btnCancel   = { padding: '0.5rem 1.2rem', borderRadius: '6px', border: '1.5px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };
const btnSave     = { padding: '0.5rem 1.2rem', borderRadius: '6px', border: 'none', background: '#4ec4c4', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' };