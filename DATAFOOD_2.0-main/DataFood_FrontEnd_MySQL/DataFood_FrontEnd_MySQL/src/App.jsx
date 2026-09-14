import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard        from './pages/Dashboard';
import SupplierList     from './pages/suppliers/SupplierList';
import SupplierForm     from './pages/suppliers/SupplierForm';
import GeneralInventory from './pages/supplies/GeneralInventory';
import AdminSupplies    from './pages/supplies/AdminSupplies';
import SupplyPurchase   from './pages/supplies/SupplyPurchase';
import NewPurchasePage  from './pages/supplies/NewPurchasePage';
import LowSupplies      from './pages/supplies/LowSupplies';
import Productos        from './pages/Productos/Productos';
import Reports          from './pages/reports/Reports.jsx';
import Employees        from './pages/Employees/Employees.jsx';
import Sales            from './pages/Sales/Sales.jsx';
import SaleHistory      from './pages/Sales/SaleHistory';
import CashMovement     from './pages/CashRegister/CashMovement.jsx';
import CajeroView       from './pages/CajeroView.jsx';
import PurchaseReport   from './pages/reports/PurchaseReport.jsx';
import SalesReport      from './pages/reports/SalesReport.jsx';
import CashRegisterReport from './pages/reports/CashRegisterReport.jsx';
import ScreenSaver      from './pages/ScreenSaver';
import MenuConfig       from './pages/Productos/MenuConfigPanel.jsx';
import ProfitReport from './pages/reports/ProfitReport';
import Help from './pages/Help.jsx'


import SuggestedPurchases from './pages/supplies/SuggestedPurchases';



import ForgotPassword from './pages/Forgotpassword';
import ResetPassword  from './pages/Resetpassword';


import MenuClientes     from './pages/Productos/MenuClientes';

import { AuthProvider, useAuth } from './pages/AuthContext';
import LoginPage from './pages/LoginPage';

// ── Importar assets para que Vite los procese correctamente en dev y producción ──
import carritoImg      from './assets/carrito-de-compras.png';
import motoImg         from './assets/moto.png';
import portapapelesImg from './assets/portapapeles.png';
import cajaImg         from './assets/caja-fuerte.png';
import retiroImg       from './assets/retiro-de-dinero.png';
import empleadoImg     from './assets/empleado.png';
import reporteImg      from './assets/reporte.png';
import ayudaImg        from './assets/llave-inglesa.png';
import gananciaImg     from './assets/ganancia.png';
import dataFoodAzul    from './assets/DataFood_Azul.png';
import dataFoodNaranja from './assets/DataFoodNaranja.png';
import dataFoodBlanco  from './assets/DataFood_blanco.png';
import rventasImg      from './assets/Rventas.png';
import rcomprasImg     from './assets/Rcompras.png';
import rfacturasImg    from './assets/Rfacturas.png';

const PRELOAD_ASSETS = [
    carritoImg, motoImg, portapapelesImg, cajaImg, retiroImg,
    empleadoImg, reporteImg, ayudaImg, gananciaImg,
    dataFoodAzul, dataFoodNaranja, dataFoodBlanco,
    rventasImg, rcomprasImg, rfacturasImg,
];



export default function App() {
    PRELOAD_ASSETS.forEach(src => { const img = new Image(); img.src = src; });

    return (
        <AuthProvider>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </AuthProvider>
    );
}

function AppContent() {
    const { user, login, logout } = useAuth();
    const location = useLocation(); // ← AGREGAR ESTO

    // ── Rutas públicas (sin sesión requerida) ──
    if (location.pathname === '/menu') {
        return <MenuClientes />;
    }
    if (location.pathname === '/forgot-password') {
        return <ForgotPassword />;
    }
    if (location.pathname.startsWith('/reset-password')) {
        return <ResetPassword />;
    }

    // ── Sin sesión → login ──
    // ── Sin sesión → login ──
    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<LoginPage onLoginSuccess={login} />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    // Cajero → vista simplificada
    if (user.role === 'Cajero') {
        return (
            <>
                <ScreenSaver onLogout={logout} />
                <Routes>
                    <Route path="/"              element={<CajeroView />} />
                    <Route path="/sales"         element={<Sales isDelivery={false} />} />
                    <Route path="/delivery"      element={<Sales isDelivery={true} />} />
                    <Route path="/sales/history" element={<SaleHistory />} />
                    <Route path="*"              element={<Navigate to="/" replace />} />
                </Routes>
            </>
        );
    }

    // Admin → acceso completo
    return (
        <>
            <ScreenSaver onLogout={logout} />
            <Routes>
                <Route path="/"                            element={<Dashboard />} />
                <Route path="/suppliers"                   element={<SupplierList />} />
                <Route path="/suppliers/new"               element={<SupplierForm />} />
                <Route path="/suppliers/edit/:id"          element={<SupplierForm />} />
                <Route path="/supplies/inventory"          element={<GeneralInventory />} />
                <Route path="/supplies/admin"              element={<AdminSupplies />} />
                <Route path="/supplies/purchases"          element={<SupplyPurchase />} />
                <Route path="/supplies/purchases/new"      element={<NewPurchasePage />} />
                <Route path="/supplies/purchases/edit/:id" element={<NewPurchasePage />} />
                <Route path="/supplies/low-stock"          element={<LowSupplies />} />
                <Route path="/supplies/suggested-purchases" element={<SuggestedPurchases />} />
                <Route path="/productos"                   element={<Productos />} />
                <Route path="/reports"                     element={<Reports />} />
                <Route path="/reports/PurchaseReport"      element={<PurchaseReport />} />
                <Route path="/reports/SalesReport"         element={<SalesReport />} />
                <Route path="/reports/CashRegisterReport"  element={<CashRegisterReport />} />
                <Route path="/employees"                   element={<Employees />} />
                <Route path="/sales"                       element={<Sales isDelivery={false} />} />
                <Route path="/sales/history"               element={<SaleHistory />} />
                <Route path="/delivery"                    element={<Sales isDelivery={true} />} />
                <Route path="/cashregister/movement"       element={<CashMovement />} />
                <Route path="/menu-config"                 element={<MenuConfig />} />
                <Route path="*"                            element={<Navigate to="/" replace />} />
                <Route path="/reports/ProfitReport"        element={<ProfitReport />} />
                <Route path="/Help"                  element={<Help />} />
            </Routes>
        </>
    );
}