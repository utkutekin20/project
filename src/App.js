import { HashRouter, Route, Routes } from "react-router-dom";
import RouteScrollToTop from "./helper/RouteScrollToTop";

// Üçler Yangın Tüp Takip Sistemi Sayfaları
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import TubesPage from "./pages/TubesPage";
import TubeListPage from "./pages/TubeListPage";
import CertificatesPage from "./pages/CertificatesPage";
import ReportsPage from "./pages/ReportsPage";
import PricesPage from "./pages/PricesPage";
import QuotesPage from "./pages/QuotesPage";
import ContractsPage from "./pages/ContractsPage";
import InvoicesPage from "./pages/InvoicesPage";
import CreateInvoicePage from "./pages/CreateInvoicePage";
import WarningsPage from "./pages/WarningsPage";
import DataImportPage from "./pages/DataImportPage";
import BackupPage from "./pages/BackupPage";
import LogsPage from "./pages/LogsPage";
import SettingsPage from "./pages/SettingsPage";
import ErrorPage from "./pages/ErrorPage";

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RouteScrollToTop />
      <Routes>
        {/* Ana Sayfa */}
        <Route exact path='/' element={<DashboardPage />} />

        {/* Yönetim */}
        <Route exact path='/customers' element={<CustomersPage />} />
        <Route exact path='/tubes' element={<TubesPage />} />
        <Route exact path='/tube-list' element={<TubeListPage />} />
        <Route exact path='/certificates' element={<CertificatesPage />} />
        <Route exact path='/reports' element={<ReportsPage />} />

        {/* Finans */}
        <Route exact path='/prices' element={<PricesPage />} />
        <Route exact path='/quotes' element={<QuotesPage />} />
        <Route exact path='/contracts' element={<ContractsPage />} />
        <Route exact path='/invoices' element={<InvoicesPage />} />
        <Route exact path='/invoices/new' element={<CreateInvoicePage />} />

        {/* Sistem */}
        <Route exact path='/warnings' element={<WarningsPage />} />
        <Route exact path='/data-import' element={<DataImportPage />} />
        <Route exact path='/backup' element={<BackupPage />} />
        <Route exact path='/logs' element={<LogsPage />} />
        <Route exact path='/settings' element={<SettingsPage />} />

        {/* 404 */}
        <Route exact path='*' element={<ErrorPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
