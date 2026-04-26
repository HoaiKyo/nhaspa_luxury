import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  LayoutDashboard, Package, FolderTree, Users, CalendarDays, FileText,
  Percent, Image, Newspaper, UserCog, Clock, CalendarOff, LogOut
} from 'lucide-react';

import '../../../admin.css';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Tổng quan',
    items: [
      { to: '/receptionist/lich-hen', icon: <CalendarDays size={18} />, label: 'Lịch hẹn' },
    ],
  },
  {
    title: 'Quản lý dịch vụ',
    items: [
      { to: '/receptionist/danh-muc', icon: <FolderTree size={18} />, label: 'Danh mục' },
      { to: '/receptionist/san-pham', icon: <Package size={18} />, label: 'Dịch vụ / Sản phẩm' },
    ],
  },
  {
    title: 'Nhân sự',
    items: [
      { to: '/receptionist/nhan-vien', icon: <UserCog size={18} />, label: 'Nhân viên' },
      { to: '/receptionist/lich-lam-viec', icon: <Clock size={18} />, label: 'Lịch làm việc' },
      { to: '/receptionist/nghi-phep', icon: <CalendarOff size={18} />, label: 'Lịch báo phép' },
    ],
  },
  {
    title: 'Kinh doanh',
    items: [
      { to: '/receptionist/hoa-don', icon: <FileText size={18} />, label: 'Hóa đơn' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/receptionist/khuyen-mai', icon: <Percent size={18} />, label: 'Khuyến mãi' },
      { to: '/receptionist/banner', icon: <Image size={18} />, label: 'Banner' },
      { to: '/receptionist/tin-tuc', icon: <Newspaper size={18} />, label: 'Tin tức' },
    ],
  },
];

export default function ReceptionistLayout() {
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
            <p className="text-[0.65rem] uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>Reception</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 py-3 px-3 overflow-y-auto no-scrollbar">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx}>
            {sidebarOpen && <div className="admin-sidebar-section">{section.title}</div>}
            {!sidebarOpen && idx > 0 && <div className="border-t border-[var(--admin-border)] my-2 mx-2" />}
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.ho_ten?.charAt(0) || 'R'}
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
      <aside
        className={`hidden md:flex flex-col border-r border-[var(--admin-border)] transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} relative`}
        style={{ background: 'var(--admin-surface)' }}
      >
        <SidebarContent />
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-end px-4 border-b border-[var(--admin-border)]" style={{ background: 'var(--admin-surface)' }}>
           {/* Add header content as needed */}
           <div className="flex items-center">
             Lễ Tân
           </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6" id="admin-main-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
