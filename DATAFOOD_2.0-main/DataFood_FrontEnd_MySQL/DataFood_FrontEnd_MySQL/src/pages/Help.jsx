import { useState } from "react";
import { useNavigate } from "react-router-dom";

import imgInicio      from '../assets/help/Inicio.png';
import imgVentas      from '../assets/help/Ventas.png';
import imgDomicilio   from '../assets/help/Domicilio.png';
import imgHistorial   from '../assets/help/Historial.png';
import imgCaja        from '../assets/help/Caja.png';
import imgRetiro      from '../assets/help/Retiro.png';
import imgEmpleados   from '../assets/help/Empleados.png';
import imgReportes    from '../assets/help/Reportes.png';
import imgInsumos     from '../assets/help/Insumos.png';
import imgProveedores from '../assets/help/Proveedores.png';
import imgProductos   from '../assets/help/Productos.png';

const helpSections = [
    {
        id: "inicio",
        label: "Inicio",
        icon: "🏠",
        image: imgInicio,
        title: "Pantalla Principal",
        description:
            "La pantalla de inicio es el punto de partida del sistema. Desde aquí puedes acceder a todos los módulos disponibles según tu rol.",
        steps: [
            "Al iniciar sesión verás un saludo con tu nombre y la fecha actual.",
            "Las tarjetas naranja representan cada módulo del sistema. Haz clic en cualquiera para acceder.",
            "En el panel izquierdo encontrarás el menú de navegación con accesos rápidos a Insumos, Proveedores y Productos.",
            "El botón **Cerrar Sesión** en la parte inferior izquierda finaliza tu sesión de forma segura.",
        ],
        tips: "Los módulos disponibles dependen de tu rol. Los administradores tienen acceso completo.",
    },
    {
        id: "ventas",
        label: "Ventas",
        icon: "🛒",
        image: imgVentas,
        title: "Módulo de Ventas",
        description:
            "El módulo de Ventas permite registrar las ventas del comedor de forma rápida y eficiente.",
        steps: [
            "Selecciona los productos que el cliente desea comprar desde el catálogo.",
            "Ajusta la cantidad de cada producto usando los controles + y –.",
            "Revisa el resumen del pedido en el panel derecho antes de confirmar.",
            "Presiona **Confirmar Venta** para registrar la transacción. Se generará un comprobante.",
            "La caja debe estar abierta para poder registrar ventas.",
        ],
        tips: "Si la caja no está abierta, el sistema te pedirá que la abras antes de continuar.",
    },
    {
        id: "domicilio",
        label: "Domicilio",
        icon: "🛵",
        image: imgDomicilio,
        title: "Módulo de Domicilio",
        description:
            "Gestiona los pedidos a domicilio, asignando repartidores y registrando la dirección del cliente.",
        steps: [
            "Ingresa los datos del cliente: nombre, teléfono y dirección de entrega.",
            "Agrega los productos del pedido igual que en ventas.",
            "Asigna un repartidor disponible de la lista.",
            "Confirma el pedido. Quedará en estado **Pendiente** hasta que sea entregado.",
            "Una vez entregado, marca el pedido como completado para cerrar la orden.",
        ],
        tips: "Puedes ver el historial de domicilios desde el módulo de Historial de Ventas.",
    },
    {
        id: "historial",
        label: "Historial",
        icon: "📋",
        image: imgHistorial,
        title: "Historial de Ventas",
        description:
            "Consulta todas las ventas y pedidos realizados, con filtros por fecha y tipo de venta.",
        steps: [
            "Usa los filtros de fecha para buscar ventas en un rango específico.",
            "Filtra por tipo: ventas en local o domicilios.",
            "Haz clic en cualquier registro para ver el detalle completo de esa venta.",
            "Desde el detalle puedes imprimir o descargar el comprobante.",
            "Los registros no pueden eliminarse para mantener la integridad contable.",
        ],
        tips: "El historial está disponible solo para administradores y supervisores.",
    },
    {
        id: "caja",
        label: "Abrir / Cerrar Caja",
        icon: "💰",
        image: imgCaja,
        title: "Control de Caja",
        description:
            "La caja controla el flujo de dinero diario. Debe abrirse al inicio del turno y cerrarse al finalizarlo.",
        steps: [
            "**Abrir Caja:** Ingresa el monto inicial en efectivo con el que comienzas el turno y confirma.",
            "Con la caja abierta, el sistema habilitará el registro de ventas.",
            "**Cerrar Caja:** Al finalizar el turno, selecciona Cierre de Caja e ingresa el monto físico contado.",
            "El sistema calculará automáticamente si hay diferencia entre el esperado y el contado.",
            "El cierre queda registrado con fecha, hora y usuario que realizó el corte.",
        ],
        tips: "Solo puede haber una caja abierta a la vez por usuario. Asegúrate de cerrarla al finalizar el día.",
    },
    {
        id: "retiro",
        label: "Retiro / Depósito",
        icon: "⚖️",
        image: imgRetiro,
        title: "Retiros y Depósitos",
        description:
            "Registra movimientos de efectivo fuera de ventas, como retiros para gastos o depósitos adicionales.",
        steps: [
            "Selecciona el tipo de movimiento: **Retiro** (salida de efectivo) o **Depósito** (entrada de efectivo).",
            "Ingresa el monto y una descripción del motivo del movimiento.",
            "Confirma la operación. Se registrará con tu usuario y la hora actual.",
            "Todos los movimientos afectan el saldo de la caja en tiempo real.",
            "Al hacer el cierre de caja, estos movimientos aparecerán desglosados en el resumen.",
        ],
        tips: "Siempre agrega una descripción clara para facilitar la auditoría posterior.",
    },
    {
        id: "empleados",
        label: "Empleados",
        icon: "👤",
        image: imgEmpleados,
        title: "Gestión de Empleados",
        description:
            "Administra el personal del comedor: crea usuarios, asigna roles y gestiona el acceso al sistema.",
        steps: [
            "Desde la lista de empleados puedes ver todos los usuarios registrados.",
            "Haz clic en **Nuevo Empleado** para agregar un colaborador.",
            "Completa los datos: nombre, usuario, contraseña y rol (Administrador, Cajero, Repartidor).",
            "Para editar, haz clic en el ícono de lápiz junto al empleado.",
            "Para desactivar un acceso, usa el interruptor de estado en lugar de eliminar el usuario.",
        ],
        tips: "El rol determina qué módulos puede ver y usar cada empleado en el sistema.",
    },
    {
        id: "reportes",
        label: "Reportes",
        icon: "📊",
        image: imgReportes,
        title: "Módulo de Reportes",
        description:
            "Genera informes detallados de ventas, ingresos y movimientos para la toma de decisiones.",
        steps: [
            "Selecciona el tipo de reporte: ventas diarias, semanales, mensuales o personalizadas.",
            "Aplica filtros adicionales como empleado, producto o tipo de venta.",
            "El sistema generará gráficas y tablas con los datos del periodo seleccionado.",
            "Puedes exportar el reporte a PDF o Excel con el botón **Exportar**.",
            "Los reportes incluyen totales de ventas, número de transacciones y ticket promedio.",
        ],
        tips: "Los reportes son solo de lectura y no afectan ningún dato del sistema.",
    },
    {
        id: "insumos",
        label: "Insumos",
        icon: "📦",
        image: imgInsumos,
        title: "Control de Insumos",
        description:
            "Gestiona el inventario de materias primas e insumos necesarios para la operación del comedor.",
        steps: [
            "La lista muestra todos los insumos con su stock actual y unidad de medida.",
            "Haz clic en **Nuevo Insumo** para registrar un nuevo artículo.",
            "Puedes registrar entradas de stock al recibir mercancía de un proveedor.",
            "El sistema alerta con un indicador rojo cuando un insumo está bajo el nivel mínimo configurado.",
            "Edita un insumo para ajustar su nombre, unidad, stock mínimo o proveedor asociado.",
        ],
        tips: "Mantén actualizado el stock mínimo para recibir alertas a tiempo y evitar desabasto.",
    },
    {
        id: "proveedores",
        label: "Proveedores",
        icon: "🏭",
        image: imgProveedores,
        title: "Gestión de Proveedores",
        description:
            "Registra y administra los proveedores que abastecen al comedor.",
        steps: [
            "Consulta la lista de proveedores activos con su información de contacto.",
            "Haz clic en **Nuevo Proveedor** para agregar uno.",
            "Completa los datos: nombre, teléfono, dirección y productos que suministra.",
            "Puedes asociar cada insumo a un proveedor desde el módulo de Insumos.",
            "Edita o desactiva proveedores según sea necesario.",
        ],
        tips: "Tener proveedores bien registrados facilita la gestión de compras y el control de insumos.",
    },
    {
        id: "productos",
        label: "Productos",
        icon: "🍽️",
        image: imgProductos,
        title: "Catálogo de Productos",
        description:
            "Administra el menú y los productos disponibles para la venta en el comedor.",
        steps: [
            "La lista muestra todos los productos con su precio y estado (activo/inactivo).",
            "Haz clic en **Nuevo Producto** para agregar un platillo o artículo al menú.",
            "Sube una imagen del producto para que aparezca en el módulo de ventas.",
            "Ajusta el precio en cualquier momento editando el producto.",
            "Desactiva productos temporalmente sin eliminarlos para mantener el historial.",
        ],
        tips: "Solo los productos activos aparecen disponibles en el módulo de Ventas.",
    },
];

export default function Help() {
    const [activeTab, setActiveTab] = useState("inicio");
    const navigate = useNavigate();

    const active = helpSections.find((s) => s.id === activeTab);

    return (
        <div style={styles.container}>

            {/* ── HEADER ── */}
            <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate("/")}>
                    ← Volver al inicio
                </button>
                <div style={styles.headerInfo}>
                    <span style={styles.headerIcon}>❓</span>
                    <div>
                        <h1 style={styles.headerTitle}>Centro de Ayuda</h1>
                        <p style={styles.headerSub}>
                            Guía de uso de DataFood — Sistema de Gestion de Comedor Raquel
                        </p>
                    </div>
                </div>
            </div>

            {/* ── BODY ── */}
            <div style={styles.layout}>

                {/* Sidebar */}
                <div style={styles.sidebar}>
                    {helpSections.map((section) => {
                        const isActive = activeTab === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveTab(section.id)}
                                style={{
                                    ...styles.tabBtn,
                                    backgroundColor: isActive ? "#F97316" : "transparent",
                                    color: isActive ? "#fff" : "#ccc",
                                    fontWeight: isActive ? 700 : 500,
                                    boxShadow: isActive
                                        ? "0 2px 8px rgba(249,115,22,0.4)"
                                        : "none",
                                }}
                            >
                                <span style={styles.tabIcon}>{section.icon}</span>
                                <span style={styles.tabLabel}>{section.label}</span>
                                {isActive && <span style={styles.tabArrow}>›</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                {active && (
                    <div style={styles.content}>
                        <div style={styles.sectionHeader}>
                            <span style={styles.sectionIcon}>{active.icon}</span>
                            <h2 style={styles.sectionTitle}>{active.title}</h2>
                        </div>

                        <p style={styles.description}>{active.description}</p>

                        <div style={styles.imageWrapper}>
                            <img
                                src={active.image}
                                alt={`Vista del módulo ${active.title}`}
                                style={styles.image}
                            />
                        </div>

                        <div style={styles.stepsSection}>
                            <h3 style={styles.stepsTitle}>¿Cómo funciona?</h3>
                            <ol style={styles.stepsList}>
                                {active.steps.map((step, i) => (
                                    <li key={i} style={styles.stepItem}>
                                        <span style={styles.stepNumber}>{i + 1}</span>
                                        <span
                                            style={styles.stepText}
                                            dangerouslySetInnerHTML={{
                                                __html: step.replace(
                                                    /\*\*(.+?)\*\*/g,
                                                    '<strong style="color:#F97316">$1</strong>'
                                                ),
                                            }}
                                        />
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div style={styles.tipBox}>
                            <span style={styles.tipIcon}>💡</span>
                            <p style={styles.tipText}>{active.tips}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: "100vh",
        backgroundColor: "#FAF0E6",
        padding: "24px",
        fontFamily: "'Segoe UI', sans-serif",
        boxSizing: "border-box",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: 20,
        backgroundColor: "#1a1a2e",
        borderRadius: 16,
        padding: "16px 28px",
        marginBottom: 24,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    },
    backBtn: {
        flexShrink: 0,
        padding: "8px 16px",
        backgroundColor: "#F97316",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap",
    },
    headerInfo: {
        display: "flex",
        alignItems: "center",
        gap: 14,
    },
    headerIcon: { fontSize: 38 },
    headerTitle: {
        margin: 0,
        color: "#fff",
        fontSize: 24,
        fontWeight: 700,
    },
    headerSub: {
        margin: "4px 0 0",
        color: "#F97316",
        fontSize: 13,
    },
    layout: {
        display: "flex",
        gap: 20,
        alignItems: "flex-start",
    },
    sidebar: {
        width: 200,
        flexShrink: 0,
        backgroundColor: "#1a1a2e",
        borderRadius: 14,
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
    },
    tabBtn: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 11px",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        textAlign: "left",
        transition: "background-color 0.15s, color 0.15s",
        width: "100%",
    },
    tabIcon: { fontSize: 17, minWidth: 20 },
    tabLabel: { flex: 1 },
    tabArrow: { fontSize: 20, marginLeft: "auto", color: "#fff" },
    content: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: "28px 32px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        minHeight: 500,
    },
    sectionHeader: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    sectionIcon: { fontSize: 32 },
    sectionTitle: {
        margin: 0,
        fontSize: 22,
        fontWeight: 700,
        color: "#1a1a2e",
    },
    description: {
        color: "#555",
        fontSize: 14.5,
        lineHeight: 1.6,
        marginBottom: 20,
        borderLeft: "4px solid #F97316",
        backgroundColor: "#FFF7ED",
        borderRadius: "0 8px 8px 0",
        padding: "10px 14px",
    },
    imageWrapper: {
        marginBottom: 24,
        borderRadius: 12,
        overflow: "hidden",
        border: "2px solid #f0e6d3",
    },
    image: {
        width: "100%",
        height: "auto",
        display: "block",
    },
    stepsSection: { marginBottom: 20 },
    stepsTitle: {
        fontSize: 15,
        fontWeight: 700,
        color: "#1a1a2e",
        marginBottom: 12,
    },
    stepsList: {
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    stepItem: {
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "9px 14px",
        backgroundColor: "#FAFAFA",
        borderRadius: 10,
        border: "1px solid #F0E6D3",
    },
    stepNumber: {
        minWidth: 24,
        height: 24,
        borderRadius: "50%",
        backgroundColor: "#F97316",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
    },
    stepText: {
        color: "#444",
        fontSize: 13.5,
        lineHeight: 1.55,
        paddingTop: 2,
    },
    tipBox: {
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        backgroundColor: "#FFF7ED",
        border: "1px solid #FED7AA",
        borderRadius: 10,
        padding: "12px 16px",
    },
    tipIcon: { fontSize: 18, flexShrink: 0 },
    tipText: {
        margin: 0,
        color: "#92400E",
        fontSize: 13.5,
        lineHeight: 1.55,
    },
};