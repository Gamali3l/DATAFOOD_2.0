import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSuppliers, toggleSupplier } from '../../api/supplierApi';
import SupplierForm from './SupplierForm';
import './SupplierList.css';

export default function SupplierList() {

    const navigate = useNavigate();

    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState('');

    const [filter, setFilter] = useState('all');
    const [filterLetter, setFilterLetter] = useState('ALL');

    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [viewSupplier, setViewSupplier] = useState(null);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        const { data } = await getSuppliers();
        setSuppliers(data);
    };

    const handleToggle = async (id) => {
        await toggleSupplier(id);
        fetchSuppliers();
    };

    const openNew = () => {
        setEditId(null);
        setShowModal(true);
    };

    const openEdit = (id) => {
        setEditId(id);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditId(null);
        fetchSuppliers();
    };

    const formatPhone = (value) => {

        const digits = String(value ?? '')
            .replace(/\D/g, '')
            .slice(0, 8);

        if (digits.length <= 4) return digits;

        return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    };

    const formatPhones = (phones) => {

        if (!Array.isArray(phones)) return '—';

        const filled = phones
            .slice(0, 2)
            .filter(p => p && String(p).trim() !== '')
            .map(formatPhone);

        return filled.length > 0
            ? filled.join(' / ')
            : '—';
    };

    const filtered = suppliers
        .filter(s => {

            const matchSearch = s.name
                .toLowerCase()
                .includes(search.toLowerCase());

            const matchStatus =
                filter === 'all'
                    ? true
                    : filter === 'active'
                        ? s.status === 1
                        : s.status === 0;

            const matchLetter =
                filterLetter === 'ALL'
                    ? true
                    : s.name?.toUpperCase().startsWith(filterLetter);

            return matchSearch && matchStatus && matchLetter;
        });

    return (

        <div className="supplier-page">

            <div className="supplier-header">

                <div>

                    <h1
                        style={{
                            margin: 0,
                            fontSize: '2rem',
                            color: '#222',
                            fontWeight: '700'
                        }}
                    >
                        Lista De Proveedores
                    </h1>

                    <p
                        style={{
                            marginTop: '0.25rem',
                            color: '#777',
                            fontSize: '0.9rem'
                        }}
                    >
                        Gestión de proveedores
                    </p>

                </div>

                <div style={{ display: 'flex', gap: '0.8rem' }}>

                    <button
                        className="btn-back"
                        onClick={() => navigate('/')}
                    >
                        Principal
                    </button>

                    <button
                        className="btn-add"
                        onClick={openNew}
                    >
                        Agregar Proveedor
                    </button>

                </div>

            </div>

            <div className="supplier-filters">

                <div className="search-box">

                    <span className="search-icon">🔍</span>

                    <input
                        type="text"
                        placeholder="Buscar proveedor..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />

                </div>

                <select
                    className="btn-sort"
                    value={filterLetter}
                    onChange={e => setFilterLetter(e.target.value)}
                >

                    <option value="ALL">A-Z</option>

                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                        .split('')
                        .map(letter => (

                            <option
                                key={letter}
                                value={letter}
                            >
                                {letter}
                            </option>

                        ))}

                </select>

                <select
                    className="filter-select"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                >

                    <option value="all">Estado</option>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>

                </select>

            </div>

            <table className="supplier-table">

                <thead>

                <tr>

                    <th>Nombre Proveedor</th>
                    <th>Teléfono</th>
                    <th>Compañía</th>
                    <th>Dirección</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th>Acciones</th>

                </tr>

                </thead>

                <tbody>

                {filtered.map(s => (

                    <tr key={s.supplierId}>

                        <td>{s.name}</td>

                        <td>{formatPhones(s.phones)}</td>

                        <td>{s.company || '—'}</td>

                        <td>{s.addresses?.[0] || '—'}</td>

                        <td>{s.description || '—'}</td>

                        <td>

                            <label className="toggle-switch">

                                <input
                                    type="checkbox"
                                    checked={s.status === 1}
                                    onChange={() => handleToggle(s.supplierId)}
                                />

                                <span className="slider"></span>

                                <span className="toggle-label">

                                    {s.status === 1
                                        ? 'Activo'
                                        : 'Inactivo'}

                                </span>

                            </label>

                        </td>

                        <td className="actions">

                            <button
                                className="btn-icon"
                                title="Editar"
                                onClick={() => openEdit(s.supplierId)}
                            >
                                ✏️
                            </button>

                            <button
                                className="btn-icon"
                                title="Ver detalles"
                                onClick={() => setViewSupplier(s)}
                            >
                                👤
                            </button>

                        </td>

                    </tr>

                ))}

                {filtered.length === 0 && (

                    <tr>

                        <td
                            colSpan={7}
                            style={{
                                textAlign: 'center',
                                padding: '2rem'
                            }}
                        >
                            Sin resultados
                        </td>

                    </tr>

                )}

                </tbody>

            </table>

            {showModal && (

                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                >

                    <div
                        style={{
                            background: '#fdf6ee',
                            borderRadius: '14px',
                            padding: '2rem',
                            width: '460px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                            position: 'relative'
                        }}
                    >

                        <h3
                            style={{
                                textAlign: 'center',
                                marginBottom: '1.5rem',
                                color: '#333'
                            }}
                        >
                            {editId
                                ? 'Editar Proveedor'
                                : 'Nuevo Proveedor'}
                        </h3>

                        <SupplierForm
                            id={editId}
                            onClose={closeModal}
                        />

                    </div>

                </div>

            )}

            {viewSupplier && (

                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                >

                    <div
                        style={{
                            background: '#fdf6ee',
                            borderRadius: '14px',
                            padding: '2rem',
                            width: '460px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        }}
                    >

                        <h3
                            style={{
                                textAlign: 'center',
                                marginBottom: '1.5rem',
                                color: '#333'
                            }}
                        >
                            Información Proveedor
                        </h3>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                color: '#444'
                            }}
                        >

                            <div>
                                <strong>Nombre:</strong> {viewSupplier.name}
                            </div>

                            <div>
                                <strong>Teléfono:</strong>{' '}
                                {formatPhones(viewSupplier.phones)}
                            </div>

                            <div>
                                <strong>Compañía:</strong>{' '}
                                {viewSupplier.company || '—'}
                            </div>

                            <div>
                                <strong>Dirección:</strong>{' '}
                                {viewSupplier.addresses?.[0] || '—'}
                            </div>

                            <div>
                                <strong>Notas:</strong>{' '}
                                {viewSupplier.description || '—'}
                            </div>

                            <div>

                                <strong>Estado:</strong>{' '}

                                <span
                                    style={{
                                        color: viewSupplier.status === 1
                                            ? 'green'
                                            : 'gray',
                                        fontWeight: 600
                                    }}
                                >
                                    {viewSupplier.status === 1
                                        ? 'Activo'
                                        : 'Inactivo'}
                                </span>

                            </div>

                        </div>

                        <div
                            style={{
                                textAlign: 'center',
                                marginTop: '2rem'
                            }}
                        >

                            <button
                                onClick={() => setViewSupplier(null)}
                                style={{
                                    background: '#20b2aa',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.6rem 2rem',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Cerrar
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}