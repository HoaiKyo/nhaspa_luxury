import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  Phone, MapPin, Menu, X, ChevronDown, Facebook, 
  Instagram, Youtube, Search, MessageCircle, ArrowUp, User, LogOut, LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BookingModal from './BookingModal';
import AuthModal from './AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { publicApi } from '../api/public.api';

export default function Layout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const location = useLocation();
  const { user, openModal, logout } = useAuth();

  useEffect(() => {
    publicApi.getCategories().then(res => {
      if (res.success && res.data) {
        setCategories(res.data);
      }
    });

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-text-dark bg-background">
      {/* Header */}
      <header 
        className={`fixed w-full z-50 transition-all duration-300 border-b border-white/10 ${
          isScrolled ? 'bg-primary shadow-md py-2' : 'bg-transparent py-4'
        }`}
      >
        <div className="container mx-auto px-4">
          {/* Top Bar - Desktop Only */}
          <div className={`hidden lg:flex justify-between items-center text-sm mb-4 transition-all duration-300 ${isScrolled ? 'h-0 overflow-hidden opacity-0 mb-0' : 'opacity-100'}`}>
            <div className="flex items-center gap-4 text-white">
              <a href="#" className="hover:text-accent transition-colors"><Facebook size={16} /></a>
              <a href="#" className="hover:text-accent transition-colors"><Instagram size={16} /></a>
              <a href="#" className="hover:text-accent transition-colors"><MapPin size={16} /></a>
            </div>
            <div className="flex items-center gap-2 text-white font-medium">
              <Phone size={16} className="text-accent" />
              <span>Hotline: 0866 839 985</span>
            </div>
          </div>

          {/* Main Nav */}
          <div className="flex justify-between items-center">
            {/* Mobile Menu Button */}
            <button 
              className={`lg:hidden transition-colors ${isScrolled ? 'text-white' : 'text-white'}`}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={28} />
            </button>

            {/* Desktop Left Nav */}
            <nav className="hidden lg:flex items-center gap-8 font-medium text-white">
              <Link to="/co-so" className="hover:text-accent transition-colors uppercase text-sm tracking-wider">Cơ sở</Link>
              <div className="relative group">
                <Link to="/dich-vu" className="flex items-center gap-1 hover:text-accent transition-colors uppercase text-sm tracking-wider">
                  Dịch Vụ <ChevronDown size={14} />
                </Link>
                <div className="absolute top-full left-0 mt-2 w-48 bg-white text-text-dark shadow-lg rounded-md overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-100 flex flex-col">
                  {categories.map((c: any) => (
                    <Link key={c.ma_danh_muc} to={`/dich-vu/${c.ma_danh_muc}`} className="block px-4 py-3 text-sm hover:bg-primary/5 hover:text-primary border-b border-gray-50 last:border-0">{c.ten_danh_muc}</Link>
                  ))}
                </div>
              </div>
              <Link to="/dich-vu" className="hover:text-accent transition-colors uppercase text-sm tracking-wider">Sản phẩm</Link>
              <Link to="/khuyen-mai" className="hover:text-accent transition-colors uppercase text-sm tracking-wider">Khuyến mãi</Link>
            </nav>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 mx-auto lg:mx-0">
              <img 
                src="/logo.png" 
                alt="Nhà Spa Logo" 
                className={`transition-all duration-300 ${isScrolled ? 'h-12' : 'h-16'}`}
                referrerPolicy="no-referrer"
              />
            </Link>

            {/* Desktop Right Nav */}
            <nav className="hidden lg:flex items-center gap-8 font-medium text-white">
              <Link to="/gioi-thieu" className="hover:text-accent transition-colors uppercase text-sm tracking-wider">Về Nhà Spa</Link>
              <Link to="/tin-tuc" className="hover:text-accent transition-colors uppercase text-sm tracking-wider">Tin tức</Link>
              <Link to="/tin-tuc?category=Ưu đãi" className="hover:text-accent transition-colors uppercase text-sm tracking-wider">Ưu đãi</Link>
              <button className="hover:text-accent transition-colors"><Search size={20} /></button>
              
              {user ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 hover:text-accent transition-colors">
                    <User size={20} />
                    <span className="text-sm font-medium max-w-[100px] truncate">{user.ho_ten}</span>
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white text-text-dark shadow-lg rounded-md overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-100">
                    <Link to="/ca-nhan" className="block px-4 py-3 text-sm hover:bg-primary/5 hover:text-primary border-b border-gray-50 flex items-center gap-2">
                      <User size={16} /> Hồ sơ cá nhân
                    </Link>
                    {(user.vai_tros?.includes('ADMIN') || user.vai_tros?.includes('STAFF')) && (
                      <Link to="/admin" className="block px-4 py-3 text-sm hover:bg-primary/5 hover:text-primary border-b border-gray-50 flex items-center gap-2">
                        <LayoutDashboard size={16} /> Quản trị Admin
                      </Link>
                    )}
                    {user.vai_tros?.includes('RECEPTIONIST') && (
                      <Link to="/receptionist" className="block px-4 py-3 text-sm hover:bg-primary/5 hover:text-primary border-b border-gray-50 flex items-center gap-2">
                        <LayoutDashboard size={16} /> Quản lý Lễ tân
                      </Link>
                    )}
                    <button onClick={logout} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                </div>
              ) : (
                <button id="login-button" onClick={() => openModal('login')} className="hover:text-accent transition-colors flex items-center gap-1">
                  <User size={20} />
                </button>
              )}
            </nav>

            {/* Mobile Search/Phone */}
            <div className="lg:hidden flex items-center gap-4 text-white">
              <a href="tel:0866839985" className="hover:text-accent transition-colors"><Phone size={24} /></a>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 left-0 bottom-0 w-4/5 max-w-sm bg-white z-[70] shadow-2xl overflow-y-auto lg:hidden"
            >
              <div className="p-4 flex justify-between items-center border-b border-gray-100">
                <img 
                  src="/logo.png" 
                  alt="Nhà Spa Logo" 
                  className="h-10"
                  referrerPolicy="no-referrer"
                />
                <button onClick={() => setMobileMenuOpen(false)} className="text-text-muted">
                  <X size={24} />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {user ? (
                  <div className="py-2 border-b border-gray-50 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <User size={20} /> {user.ho_ten}
                      </div>
                      <div className="text-accent font-medium text-sm">{user.diem_tich_luy} điểm</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to="/ca-nhan" onClick={() => setMobileMenuOpen(false)} className="flex-1 bg-primary/10 text-primary py-2 rounded-md text-center text-sm font-medium min-w-[70px]">Hồ sơ</Link>
                      {(user.vai_tros?.includes('ADMIN') || user.vai_tros?.includes('STAFF')) && (
                        <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-md text-center text-sm font-medium min-w-[70px]">Admin</Link>
                      )}
                      {user.vai_tros?.includes('RECEPTIONIST') && (
                        <Link to="/receptionist" onClick={() => setMobileMenuOpen(false)} className="flex-1 bg-teal-50 text-teal-600 py-2 rounded-md text-center text-sm font-medium min-w-[70px]">Lễ tân</Link>
                      )}
                      <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="flex-none px-3 bg-red-50 text-red-600 py-2 rounded-md text-center text-sm font-medium flex items-center justify-center gap-1">
                        <LogOut size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 border-b border-gray-50 flex gap-3">
                    <button id="mobile-login-button" onClick={() => { setMobileMenuOpen(false); openModal('login'); }} className="flex-1 bg-primary/10 text-primary py-2.5 rounded-md font-medium text-sm">Đăng nhập</button>
                    <button onClick={() => { setMobileMenuOpen(false); openModal('register'); }} className="flex-1 bg-primary text-white py-2.5 rounded-md font-medium text-sm">Đăng ký</button>
                  </div>
                )}
                <Link to="/" className="text-lg font-medium text-text-dark py-2 border-b border-gray-50">Trang chủ</Link>
                <div className="py-2 border-b border-gray-50">
                  <Link to="/dich-vu" className="text-lg font-medium text-text-dark block mb-2">Dịch Vụ</Link>
                  <div className="pl-4 flex flex-col gap-3 text-text-muted">
                    {categories.map((c: any) => (
                      <Link key={c.ma_danh_muc} to={`/dich-vu/${c.ma_danh_muc}`} onClick={() => setMobileMenuOpen(false)}>{c.ten_danh_muc}</Link>
                    ))}
                  </div>
                </div>
                <Link to="/dich-vu" className="text-lg font-medium text-text-dark py-2 border-b border-gray-50">Sản phẩm</Link>
                <Link to="/co-so" className="text-lg font-medium text-text-dark py-2 border-b border-gray-50">Cơ sở</Link>
                <Link to="/khuyen-mai" className="text-lg font-medium text-text-dark py-2 border-b border-gray-50">Khuyến mãi</Link>
                <Link to="/gioi-thieu" className="text-lg font-medium text-text-dark py-2 border-b border-gray-50">Về Nhà Spa</Link>
                <Link to="/tin-tuc" className="text-lg font-medium text-text-dark py-2 border-b border-gray-50">Tin tức</Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <img 
                src="/logo.png" 
                alt="Nhà Spa Logo" 
                className="h-16 mb-6"
                referrerPolicy="no-referrer"
              />
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                Nhà Spa - Điểm chạm tinh hoa. Nơi mang đến cho bạn những phút giây thư giãn tuyệt đối, hòa mình vào thiên nhiên với các dịch vụ chăm sóc sức khỏe và sắc đẹp đẳng cấp.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors"><Facebook size={18} /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors"><Instagram size={18} /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors"><Youtube size={18} /></a>
              </div>
            </div>

            {/* Links 1 */}
            <div>
              <h4 className="font-serif text-xl font-medium mb-6 text-accent">Thông tin</h4>
              <ul className="space-y-3 text-white/80 text-sm">
                <li><Link to="/gioi-thieu" className="hover:text-white transition-colors">Về Nhà Spa</Link></li>
                <li><Link to="/co-so" className="hover:text-white transition-colors">Hệ thống cơ sở</Link></li>
                <li><Link to="/tin-tuc" className="hover:text-white transition-colors">Tin tức & Sự kiện</Link></li>
                <li><Link to="/tin-tuc?category=Ưu đãi" className="hover:text-white transition-colors">Chương trình ưu đãi</Link></li>
              </ul>
            </div>

            {/* Links 2 */}
            <div>
              <h4 className="font-serif text-xl font-medium mb-6 text-accent">Danh mục</h4>
              <ul className="space-y-3 text-white/80 text-sm">
                {categories.slice(0, 4).map((c: any) => (
                  <li key={c.ma_danh_muc}><Link to={`/dich-vu/${c.ma_danh_muc}`} className="hover:text-white transition-colors">{c.ten_danh_muc}</Link></li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="font-serif text-xl font-medium mb-6 text-accent">Đăng ký nhận ưu đãi</h4>
              <p className="text-white/80 text-sm mb-4">Để lại email để nhận những thông tin ưu đãi mới nhất từ Nhà Spa.</p>
              <form className="flex flex-col gap-3">
                <input 
                  type="email" 
                  placeholder="Email của bạn" 
                  className="bg-white/10 border border-white/20 rounded-md px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-accent"
                />
                <button 
                  type="button"
                  className="bg-accent text-white font-medium py-3 rounded-md hover:bg-secondary transition-colors text-sm uppercase tracking-wider"
                >
                  Đăng ký
                </button>
              </form>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/60">
            <p>© 2026 Nhà Spa. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white">Điều khoản sử dụng</a>
              <a href="#" className="hover:text-white">Chính sách bảo mật</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating CTAs */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4">
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={scrollToTop}
              className="w-12 h-12 bg-white text-primary rounded-full shadow-lg flex items-center justify-center hover:bg-background transition-colors border border-gray-100"
            >
              <ArrowUp size={20} />
            </motion.button>
          )}
        </AnimatePresence>
        
        <a 
          href="https://zalo.me/0866839985" 
          target="_blank" 
          rel="noreferrer"
          className="w-14 h-14 bg-[#0068FF] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        >
          <MessageCircle size={28} />
        </a>
        
        <a 
          href="tel:0866839985" 
          className="w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-secondary transition-colors animate-bounce"
        >
          <Phone size={28} />
        </a>
      </div>

      <BookingModal />
      <AuthModal />
    </div>
  );
}
