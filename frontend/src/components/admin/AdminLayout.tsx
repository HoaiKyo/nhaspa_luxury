import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Package, FolderTree, Users, CalendarDays, FileText,
  Percent, Image, Newspaper, Warehouse, UserCog, Clock, CalendarOff,
  Menu, LogOut, ChevronLeft, Bell, Sun, Moon, TrendingUp
} from 'lucide-react';
import '../../admin.css';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Tổng quan',
    items: [
      { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', roles: ['ADMIN', 'STAFF'] },
    ],
  },
  {
    title: 'Quản lý dịch vụ',
    items: [
      { to: '/admin/danh-muc', icon: <FolderTree size={18} />, label: 'Danh mục', roles: ['ADMIN'] },
      { to: '/admin/san-pham', icon: <Package size={18} />, label: 'Dịch vụ / Sản phẩm', roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Nhân sự',
    items: [
      { to: '/admin/nhan-vien', icon: <UserCog size={18} />, label: 'Nhân viên', roles: ['ADMIN'] },
      { to: '/admin/lich-lam-viec', icon: <Clock size={18} />, label: 'Lịch làm việc', roles: ['ADMIN', 'STAFF'] },
      { to: '/admin/nghi-phep', icon: <CalendarOff size={18} />, label: 'Nghỉ phép', roles: ['ADMIN', 'STAFF'] },
      { to: '/admin/hieu-suat-nhan-vien', icon: <TrendingUp size={18} />, label: 'Hiệu suất nhân viên', roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Kinh doanh',
    items: [
      { to: '/admin/lich-hen', icon: <CalendarDays size={18} />, label: 'Lịch hẹn', roles: ['ADMIN', 'STAFF'] },
      { to: '/admin/hoa-don', icon: <FileText size={18} />, label: 'Hóa đơn', roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/admin/khuyen-mai', icon: <Percent size={18} />, label: 'Khuyến mãi', roles: ['ADMIN'] },
      { to: '/admin/banner', icon: <Image size={18} />, label: 'Banner', roles: ['ADMIN'] },
      { to: '/admin/tin-tuc', icon: <Newspaper size={18} />, label: 'Tin tức', roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { to: '/admin/kho', icon: <Warehouse size={18} />, label: 'Kho & NCC', roles: ['ADMIN'] },
      { to: '/admin/nguoi-dung', icon: <Users size={18} />, label: 'Người dùng', roles: ['ADMIN'] },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('admin-theme') as 'dark' | 'light') || 'dark';
  });

  const userRoles = user?.vai_tros || [];

  useEffect(() => {
    localStorage.setItem('admin-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => item.roles.some(r => userRoles.includes(r))),
  })).filter(section => section.items.length > 0);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--admin-border)]">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'white', padding: '4px' }}>
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-wide" style={{ fontFamily: 'inherit', color: 'var(--admin-text-heading)' }}>Nhà Spa</h1>
            <p className="text-[0.65rem] uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>Admin Panel</p>
          </div>
        )}
      </div>

      {/* Navigation - hidden scrollbar */}
      <nav className="flex-1 min-h-0 py-3 px-3 overflow-y-auto no-scrollbar">
        {filteredSections.map((section, idx) => (
          <div key={idx}>
            {sidebarOpen && <div className="admin-sidebar-section">{section.title}</div>}
            {!sidebarOpen && idx > 0 && <div className="border-t border-[var(--admin-border)] my-2 mx-2" />}
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  `admin-sidebar-link ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-3' : ''}`
                }
                onClick={() => setMobileOpen(false)}
                title={!sidebarOpen ? item.label : undefined}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-[var(--admin-border)] p-4">
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.ho_ten?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate" style={{ color: 'var(--admin-text-heading)' }}>{user?.ho_ten}</p>
              <p className="text-[0.65rem] truncate" style={{ color: 'var(--admin-text-muted)' }}>{userRoles.join(', ')}</p>
            </div>
            <button onClick={handleLogout} className="admin-btn-icon" title="Đăng xuất">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="admin-btn-icon w-full flex justify-center" title="Đăng xuất">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen text-[var(--admin-text)]" style={{ fontFamily: '"Be Vietnam Pro", sans-serif', background: 'var(--admin-bg)' }} data-admin-theme={theme}>
      {/* Desktop sidebar */}
      <aside
        className={`admin-sidebar hidden lg:flex flex-col flex-shrink-0 h-full transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-[4.5rem]'}`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="admin-sidebar relative w-64 h-full z-50 admin-modal-animate">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-14 px-4 lg:px-6 border-b border-[var(--admin-border)] flex-shrink-0" style={{ background: 'var(--admin-sidebar)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="admin-btn-icon lg:hidden"
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="admin-btn-icon hidden lg:flex"
              title={sidebarOpen ? 'Thu gọn' : 'Mở rộng'}
            >
              <ChevronLeft size={18} className={`transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="admin-theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="admin-btn-icon relative">
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
            </button>
            <NavLink to="/" className="admin-btn-secondary admin-btn-sm text-xs" target="_blank">
              Xem Website
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto admin-scrollbar p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
