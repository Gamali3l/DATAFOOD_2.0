import { useState, useEffect } from 'react';
import { getProducts, getProductCategories } from '../../api/productosApi';
import { getMenuInfo, getBusinessLogo } from '../../api/businessApi';
import MenuChatbot from './Menuchatbot';
import './MenuClientes.css';

const API = import.meta.env.VITE_API_URL;

/* Íconos SVG para las tabs por categoría */
const TAB_ICONS = {
    default: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="18" height="18">
            <circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>
        </svg>
    ),
    todo: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="18" height="18">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
    ),
    desayuno: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="18" height="18">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
        </svg>
    ),
    almuerzo: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="18" height="18">
            <path d="M3 11l19-9-9 19-2-8-8-2z"/>
        </svg>
    ),
    cena: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="18" height="18">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
    ),
    bebida: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="18" height="18">
            <path d="M8 2h8l-1 7H9L8 2z"/><path d="M9 9l1 13h4l1-13"/>
        </svg>
    ),
    postre: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="18" height="18">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    ),
};

function getTabIcon(categoryName) {
    if (!categoryName) return TAB_ICONS.todo;
    const n = categoryName.toLowerCase();
    if (n.includes('desayuno'))  return TAB_ICONS.desayuno;
    if (n.includes('almuerzo'))  return TAB_ICONS.almuerzo;
    if (n.includes('cena'))      return TAB_ICONS.cena;
    if (n.includes('bebida'))    return TAB_ICONS.bebida;
    if (n.includes('postre'))    return TAB_ICONS.postre;
    return TAB_ICONS.default;
}

/* Asigna badge Popular/Nuevo según el índice del producto */
function getProductBadge(product, index) {
    if (product.badge) return product.badge;
    if (index % 7 === 0) return 'popular';
    if (index % 7 === 3) return 'nuevo';
    return null;
}

const WA_SVG = (
    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);


function formatWhatsappPhone(value) {
    let clean = String(value || '').replace(/\D/g, '');

    if (clean.length === 8) {
        clean = `505${clean}`;
    }

    return clean;
}

export default function MenuClientes() {
    const [products,   setProducts]   = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeTab,  setActiveTab]  = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [selected,   setSelected]   = useState(null);
    const [menuLogo,   setMenuLogo]   = useState(null);
    const [bizLogo,    setBizLogo]    = useState(null);
    const [phone,      setPhone]      = useState('');

    useEffect(() => {
        Promise.all([
            getProductCategories(),
            getProducts({}),
            getMenuInfo(),
            getBusinessLogo(),
        ]).then(([cats, prods, info, biz]) => {
            setCategories(cats.data);
            setProducts(prods.data);
            setMenuLogo(info.menuLogoUrl);
            setPhone(info.phone);
            setBizLogo(biz);
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        document.body.style.background = '#fde8d8';
        document.documentElement.style.background = '#fde8d8';
        document.body.style.overflow = 'auto';
        document.body.style.position = 'static';
        document.documentElement.style.overflow = 'auto';
        return () => {
            document.body.style.background = '';
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.background = '';
        };
    }, []);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setSelected(null); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const filtered = activeTab === null
        ? products
        : products.filter(p => p.productCategoryId === activeTab);

    const activos   = filtered.filter(p => p.status === 1);
    const inactivos = filtered.filter(p => p.status === 0);

    const whatsappPhone = formatWhatsappPhone(phone);
    const waMsg = encodeURIComponent('Hola! Vi el menú y quiero hacer un pedido 😊');
    return (
        <div className="menu-page">

            {/* ══ BANNER ══ */}
            <div className="menu-banner-wrap">
                {menuLogo && (
                    <img src={menuLogo} alt="banner" className="menu-banner-img" />
                )}
                <div className="menu-banner-overlay" />
                <div className="menu-banner-content">
                    <div className="menu-banner-eyebrow">Menú del día</div>
                    <div className="menu-banner-name">Comedor<br />Raquel</div>
                    <div className="menu-banner-tagline">Sabor casero, hecho con amor</div>
                    <div className="menu-banner-pills">
                        <span className="menu-banner-pill">🕐 Lun – Sab 7am – 8pm</span>
                        <a
                            href="https://maps.app.goo.gl/djCpTYAwYfxo2eDz9"
                            target="_blank"
                            rel="noreferrer"
                            className="menu-banner-pill menu-banner-pill--link"
                        >
                            📍 Nueva Guinea, Nicaragua
                        </a>
                        <span className="menu-banner-pill">✅ Pedidos por WhatsApp</span>
                    </div>
                </div>
                {phone && (
                    <a
                        href={`https://wa.me/${whatsappPhone}?text=${waMsg}`}
                        target="_blank"
                        rel="noreferrer"
                        className="menu-banner-wa"
                    >
                        {WA_SVG}
                        Escribir por WhatsApp
                    </a>
                )}
            </div>

            {/* ══ HEADER sticky ══ */}
            <header className="menu-header">
                <div className="menu-header-inner">
                    <div className="menu-title-block">
                        {bizLogo
                            ? <img src={bizLogo} alt="logo" className="menu-logo-circle" />
                            : <div className="menu-logo-circle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f05a1a', color: '#fff', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'Segoe UI, sans-serif' }}>CR</div>
                        }
                        <div>
                            <span className="menu-business-name">Comedor Raquel</span>
                            <h1 className="menu-title">Nuestro Menú</h1>
                        </div>
                    </div>
                    <div className="menu-header-right">
                        <div className="menu-badge-row">
                            <span className="menu-badge available">Disponible</span>
                            <span className="menu-badge unavailable">No disponible</span>
                        </div>
                        {phone && (
                            <a
                                href={`https://wa.me/${whatsappPhone}?text=${waMsg}`}
                                target="_blank"
                                rel="noreferrer"
                                className="menu-whatsapp-btn"
                            >
                                {WA_SVG}
                                Pedir por WhatsApp
                            </a>
                        )}
                    </div>
                </div>

                {/* Tabs con íconos */}
                <nav className="menu-tabs">
                    <button
                        className={`menu-tab ${activeTab === null ? 'active' : ''}`}
                        onClick={() => setActiveTab(null)}
                    >
                        {TAB_ICONS.todo}
                        Todo
                    </button>
                    {categories.map(c => (
                        <button
                            key={c.productCategoryId}
                            className={`menu-tab ${activeTab === c.productCategoryId ? 'active' : ''}`}
                            onClick={() => setActiveTab(c.productCategoryId)}
                        >
                            {getTabIcon(c.name)}
                            {c.name}
                        </button>
                    ))}
                </nav>
            </header>

            {/* ══ BARRA DE ESTADÍSTICAS ══ */}
            {!loading && (
                <div className="menu-stats-bar">
                    <div className="menu-stat">
                        <div className="menu-stat-number">{filtered.length}</div>
                        <div className="menu-stat-label">Platillos</div>
                    </div>
                    <div className="menu-stat">
                        <div className="menu-stat-number">{activos.length}</div>
                        <div className="menu-stat-label">Disponibles</div>
                    </div>
                    <div className="menu-stat">
                        <div className="menu-stat-number">{categories.length}</div>
                        <div className="menu-stat-label">Categorías</div>
                    </div>
                    {activos.length > 0 && (
                        <div className="menu-stat">
                            <div className="menu-stat-number">
                                C$ {Math.min(...activos.map(p => Number(p.price))).toFixed(0)}
                            </div>
                            <div className="menu-stat-label">Desde</div>
                        </div>
                    )}
                </div>
            )}

            {/* ══ CONTENIDO ══ */}
            {loading ? (
                <div className="menu-loading">
                    <div className="menu-spinner" />
                    <p>Cargando menú...</p>
                </div>
            ) : (
                <main className="menu-main">

                    {activos.length > 0 && (
                        <section className="menu-section">
                            <div className="menu-section-header">
                                <div className="menu-section-label">Disponibles</div>
                                <div className="menu-section-line" />
                                <div className="menu-section-count">{activos.length} platillos</div>
                            </div>
                            <div className="menu-grid">
                                {activos.map((p, i) => (
                                    <ProductCard
                                        key={p.productId}
                                        product={p}
                                        badge={getProductBadge(p, i)}
                                        style={{ animationDelay: `${i * 40}ms` }}
                                        onClick={() => setSelected(p)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {inactivos.length > 0 && (
                        <section className="menu-section menu-section--inactive">
                            <div className="menu-section-header">
                                <div className="menu-section-label">No disponibles</div>
                                <div className="menu-section-line" />
                                <div className="menu-section-count">{inactivos.length} platillos</div>
                            </div>
                            <div className="menu-grid">
                                {inactivos.map((p, i) => (
                                    <ProductCard
                                        key={p.productId}
                                        product={p}
                                        inactive
                                        style={{ animationDelay: `${i * 40}ms` }}
                                        onClick={() => setSelected(p)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {filtered.length === 0 && (
                        <div className="menu-empty">No hay platillos en esta categoría.</div>
                    )}

                    {/* Botón WhatsApp al fondo — visible en desktop */}
                    {phone && (
                        <div className="menu-whatsapp-fab-wrap">
                            <a
                                href={`https://wa.me/${whatsappPhone}?text=${waMsg}`}
                                target="_blank"
                                rel="noreferrer"
                                className="menu-whatsapp-fab-btn"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                Hacer un pedido por WhatsApp
                            </a>
                        </div>
                    )}

                    {/* FAB fijo en móvil */}
                    {phone && (
                        <a
                            href={`https://wa.me/${whatsappPhone}?text=${waMsg}`}
                            target="_blank"
                            rel="noreferrer"
                            className="menu-whatsapp-fab"
                            title="Escribir por WhatsApp"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        </a>
                    )}
                </main>
            )}

            {selected && (
                <ProductModal
                    product={selected}
                    onClose={() => setSelected(null)}
                    phone={whatsappPhone}
                />
            )}

            {/* ══ CHATBOT ══ */}
            <MenuChatbot products={products} phone={whatsappPhone} />
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   PRODUCT CARD
   ══════════════════════════════════════════════════════════════ */
function ProductCard({ product, inactive, badge, style, onClick }) {
    const imgSrc = product.imageUrl ? `${API}${product.imageUrl}` : null;

    return (
        <div
            className={`menu-card ${inactive ? 'menu-card--inactive' : ''}`}
            style={style}
            onClick={onClick}
        >
            <div className="menu-card-img-wrap">
                {imgSrc
                    ? <img src={imgSrc} alt={product.name} className="menu-card-img" />
                    : <div className="menu-card-img-placeholder">🍽️</div>
                }
                {inactive && <div className="menu-card-overlay">No disponible</div>}

                {/* Badge Popular / Nuevo */}
                {badge === 'popular' && (
                    <div className="menu-card-badge menu-card-badge--popular">
                        🔥 Popular
                    </div>
                )}
                {badge === 'nuevo' && (
                    <div className="menu-card-badge menu-card-badge--nuevo">
                        ✨ Nuevo
                    </div>
                )}

                <div className="menu-card-cat">{product.categoryName}</div>

                <div className={`menu-card-status-dot ${inactive ? 'menu-card-status-dot--off' : 'menu-card-status-dot--on'}`} />
            </div>

            <div className="menu-card-body">
                <h3 className="menu-card-name">{product.name}</h3>
                {product.description && (
                    <p className="menu-card-desc">{product.description}</p>
                )}
                <div className="menu-card-footer">
                    <span className={`menu-card-price ${inactive ? 'menu-card-price--inactive' : ''}`}>
                        C$ {Number(product.price).toFixed(0)}
                    </span>
                    <span className={`menu-card-status ${inactive ? 'status--off' : 'status--on'}`}>
                        {inactive ? 'Agotado' : 'Disponible'}
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   PRODUCT MODAL
   ══════════════════════════════════════════════════════════════ */
function ProductModal({ product, onClose, phone }) {
    const imgSrc   = product.imageUrl ? `${API}${product.imageUrl}` : null;
    const inactive = product.status !== 1;
    const waMsg    = encodeURIComponent(`Hola! Quiero pedir: ${product.name} 😊`);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>

                <div className="modal-img-wrap">
                    {imgSrc
                        ? <img src={imgSrc} alt={product.name} className="modal-img" />
                        : <div className="modal-img-placeholder">🍽️</div>
                    }
                    {inactive && <div className="modal-img-overlay">No disponible</div>}
                    <div className="modal-cat-badge">{product.categoryName}</div>
                </div>

                <div className="modal-body">
                    <h2 className="modal-name">{product.name}</h2>
                    {product.description && (
                        <p className="modal-description">{product.description}</p>
                    )}
                    <div className="modal-footer">
                        <span className="modal-price">C$ {Number(product.price).toFixed(0)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span className={`menu-card-status ${inactive ? 'status--off' : 'status--on'}`}>
                                {inactive ? 'Agotado' : 'Disponible'}
                            </span>
                            {phone && !inactive && (
                                <a
                                    href={`https://wa.me/${phone}?text=${waMsg}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="modal-wa-btn"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    Pedir
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}