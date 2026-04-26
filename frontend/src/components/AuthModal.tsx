import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Lock, User as UserIcon, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth.api';

export default function AuthModal() {
  const { isModalOpen, modalView, closeModal, openModal, login, register, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/changes view
  useEffect(() => {
    if (isModalOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setPhone('');
      setConfirmPassword('');
      setIsSubmitting(false);
    }
  }, [isModalOpen, modalView]);

  if (!isModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (modalView === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          alert(res.message);
        } else if ((res as any).profile) {
          const roles = (res as any).profile.vai_tros || [];
          if (roles.includes('ADMIN') || roles.includes('STAFF')) {
            navigate('/admin');
          }
        }
      } else if (modalView === 'register') {
        if (password !== confirmPassword) {
          alert('Mật khẩu xác nhận không khớp');
          setIsSubmitting(false);
          return;
        }
        if (!/^0\d{9}$/.test(phone)) {
          alert('Số điện thoại phải bắt đầu bằng số 0 và có độ dài chính xác là 10 chữ số');
          setIsSubmitting(false);
          return;
        }
        const res = await register({ ho_ten: name, email, mat_khau: password, so_dien_thoai: phone });
        if (!res.success) {
          alert(res.message);
        } else if ((res as any).profile) {
          const roles = (res as any).profile.vai_tros || [];
          if (roles.includes('ADMIN') || roles.includes('STAFF')) {
            navigate('/admin');
          }
        }
      } else if (modalView === 'forgot-password') {
        if (password !== confirmPassword) {
          alert('Mật khẩu xác nhận không khớp');
          setIsSubmitting(false);
          return;
        }
        if (!/^0\d{9}$/.test(phone)) {
          alert('Số điện thoại hợp lệ phải có 10 chữ số và bắt đầu bằng số 0');
          setIsSubmitting(false);
          return;
        }
        const res = await forgotPassword(email, phone, password);
        if (res.success) {
          alert('Mật khẩu đã được thay đổi thành công. Vui lòng đăng nhập lại.');
          openModal('login');
        } else {
          alert(res.message);
        }
      }
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-primary/5">
          <h2 className="text-2xl font-serif text-primary">
            {modalView === 'login' ? 'Đăng nhập' : modalView === 'register' ? 'Đăng ký' : 'Quên mật khẩu'}
          </h2>
          <button onClick={closeModal} className="text-text-muted hover:text-primary transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {modalView === 'register' && (
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">Họ và tên *</label>
                <div className="relative">
                  <input 
                    required 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" 
                    placeholder="Nhập họ tên" 
                  />
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
            )}

            {(modalView === 'register' || modalView === 'forgot-password') && (
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">Số điện thoại *</label>
                <div className="relative">
                  <input 
                    required={modalView === 'forgot-password'}
                    type="tel" 
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.replace(/\D/g, '').length > 10 || val.length > 10) {
                        alert('Số điện thoại chỉ có tối đa 10 số');
                        return;
                      }
                      setPhone(val.replace(/\D/g, ''));
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" 
                    placeholder="Nhập số điện thoại" 
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">Email *</label>
              <div className="relative">
                <input 
                  required 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" 
                  placeholder="Nhập email" 
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                {modalView === 'forgot-password' ? 'Mật khẩu mới *' : 'Mật khẩu *'}
              </label>
              <div className="relative">
                <input 
                  required 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" 
                  placeholder="Nhập mật khẩu" 
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            {(modalView === 'register' || modalView === 'forgot-password') && (
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">
                  {modalView === 'forgot-password' ? 'Xác nhận mật khẩu mới *' : 'Xác nhận mật khẩu *'}
                </label>
                <div className="relative">
                  <input 
                    required 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" 
                    placeholder="Nhập lại mật khẩu" 
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
            )}

            {modalView === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => openModal('forgot-password')} className="text-sm text-accent hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-primary text-white hover:bg-secondary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                modalView === 'login' ? 'Đăng nhập' : modalView === 'register' ? 'Đăng ký' : 'Xác nhận đổi mật khẩu'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-muted">
            {modalView === 'login' ? (
              <>
                Chưa có tài khoản?{' '}
                <button 
                  onClick={() => openModal('register')} 
                  className="text-primary font-medium hover:underline"
                >
                  Đăng ký ngay
                </button>
              </>
            ) : (
              <>
                Đã có tài khoản?{' '}
                <button 
                  onClick={() => openModal('login')} 
                  className="text-primary font-medium hover:underline"
                >
                  Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
