/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Services from './pages/Services';
import ServiceCategory from './pages/ServiceCategory';
import ServiceDetail from './pages/ServiceDetail';
import Locations from './pages/Locations';
import About from './pages/About';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Profile from './pages/Profile';
import { BookingProvider } from './contexts/BookingContext';
import { AuthProvider } from './contexts/AuthContext';

// Admin CMS
import RequireRole from './components/admin/RequireRole';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import CategoriesManager from './pages/admin/CategoriesManager';
import ProductsManager from './pages/admin/ProductsManager';
import StaffManager from './pages/admin/StaffManager';
import AppointmentsManager from './pages/admin/AppointmentsManager';
import InvoicesManager from './pages/admin/InvoicesManager';
import RevenueAnalyticsReport from './pages/admin/RevenueAnalyticsReport';
import PromotionsManager from './pages/admin/PromotionsManager';
import BannersManager from './pages/admin/BannersManager';
import NewsManager from './pages/admin/NewsManager';
import UsersManager from './pages/admin/UsersManager';
import InventoryManager from './pages/admin/InventoryManager';
import ScheduleView from './pages/admin/ScheduleView';
import LeaveManager from './pages/admin/LeaveManager';
import MembershipVipManager from './pages/admin/MembershipVipManager';
import StaffPerformance from './pages/admin/StaffPerformance';

// Receptionist CMS
import ReceptionistLayout from './modules/receptionist/components/ReceptionistLayout';
import AppointmentListPage from './modules/receptionist/pages/AppointmentListPage';
import AppointmentDetailPage from './modules/receptionist/pages/AppointmentDetailPage';
import AppointmentCreatePage from './modules/receptionist/pages/AppointmentCreatePage';
import LeaveRequestListPage from './modules/receptionist/pages/LeaveRequestListPage';
import InvoiceDetailPage from './modules/receptionist/pages/InvoiceDetailPage';

export default function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <BrowserRouter>
          <Routes>
            {/* Customer-facing routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="dich-vu" element={<Services />} />
              <Route path="dich-vu/:categoryId" element={<ServiceCategory />} />
              <Route path="dich-vu/:categoryId/:productId" element={<ServiceDetail />} />
              <Route path="combo" element={<Navigate to="/dich-vu/combo" replace />} />
              <Route path="co-so" element={<Locations />} />
              <Route path="co-so/:locationSlug" element={<Locations />} />
              <Route path="gioi-thieu" element={<About />} />
              <Route path="khuyen-mai" element={<Navigate to="/tin-tuc?category=Ưu%20đãi" replace />} />
              <Route path="tin-tuc" element={<News />} />
              <Route path="tin-tuc/:slug" element={<NewsDetail />} />
              <Route path="ca-nhan" element={<Profile />} />
            </Route>

            {/* Admin CMS routes */}
            <Route
              path="/admin"
              element={
                <RequireRole roles={['ADMIN', 'STAFF']}>
                  <AdminLayout />
                </RequireRole>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="danh-muc" element={<CategoriesManager />} />
              <Route path="san-pham" element={<ProductsManager />} />
              <Route path="nhan-vien" element={<StaffManager />} />
              <Route path="lich-hen" element={<AppointmentsManager />} />
              <Route path="hoa-don" element={<InvoicesManager />} />
              <Route path="bao-cao-doanh-thu" element={<RevenueAnalyticsReport />} />
              <Route path="khuyen-mai" element={<PromotionsManager />} />
              <Route path="banner" element={<BannersManager />} />
              <Route path="tin-tuc" element={<NewsManager />} />
              <Route path="nguoi-dung" element={<UsersManager />} />
              <Route path="thanh-vien-vip" element={<MembershipVipManager />} />
              <Route path="kho" element={<InventoryManager />} />
              <Route path="lich-lam-viec" element={<ScheduleView />} />
              <Route path="nghi-phep" element={<LeaveManager />} />
              <Route path="hieu-suat-nhan-vien" element={<StaffPerformance />} />
            </Route>

            {/* Receptionist routes */}
            <Route
              path="/receptionist"
              element={
                <RequireRole roles={['ADMIN', 'RECEPTIONIST']}>
                  <ReceptionistLayout />
                </RequireRole>
              }
            >
              <Route index element={<Navigate to="lich-hen" replace />} />
              <Route path="lich-hen" element={<AppointmentListPage />} />
              <Route path="lich-hen/tao-moi" element={<AppointmentCreatePage />} />
              <Route path="lich-hen/:id" element={<AppointmentDetailPage />} />
              <Route path="nghi-phep" element={<LeaveRequestListPage />} />
              <Route path="hoa-don/:id" element={<InvoiceDetailPage />} />
              
              {/* Shared from Admin */}
              <Route path="danh-muc" element={<CategoriesManager />} />
              <Route path="san-pham" element={<ProductsManager />} />
              <Route path="nhan-vien" element={<StaffManager />} />
              <Route path="hoa-don" element={<InvoicesManager />} />
              <Route path="khuyen-mai" element={<PromotionsManager />} />
              <Route path="banner" element={<BannersManager />} />
              <Route path="tin-tuc" element={<NewsManager />} />
              <Route path="lich-lam-viec" element={<ScheduleView />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BookingProvider>
    </AuthProvider>
  );
}
