import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Star, Gift, Clock, Calendar, ChevronRight, MapPin, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { appointmentsApi } from '../api/appointments.api';

export default function Profile() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      authApi.getMyAppointments()
        .then(res => {
          if (res.data) setAppointments(res.data);
        })
        .catch(err => console.error("Error fetching appointments:", err))
        .finally(() => setLoadingAppts(false));
    }
  }, [user]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 6) {
      alert('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.changePassword(oldPassword, newPassword);
      if (res.success) {
        alert('Đổi mật khẩu thành công!');
        setIsChangingPassword(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        alert(res.message || 'Mật khẩu hiện tại không đúng');
      }
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAppointment = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) return;
    try {
      const res = await appointmentsApi.cancel(id);
      if (res.success) {
        alert('Đã hủy lịch hẹn thành công');
        setAppointments(prev => prev.map(a => a.ma_lich_hen === id ? { ...a, trang_thai: 'CANCELLED' } : a));
      } else {
        alert(res.message || 'Hủy lịch hẹn thất bại');
      }
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi hủy lịch');
    }
  };

  return (
    <div className="w-full pt-28 pb-20 bg-background min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-serif text-primary mb-8">Tài khoản của tôi</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - User Info & Points */}
          <div className="md:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-primary/5" />
              <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-primary border-4 border-white shadow-sm">
                <User size={40} />
              </div>
              <h2 className="text-xl font-serif text-text-dark mb-1">{user.ho_ten}</h2>
              <p className="text-text-muted text-sm mb-1">{user.email}</p>
              {user.so_dien_thoai && (
                <p className="text-text-muted text-sm mb-3 font-medium">{user.so_dien_thoai}</p>
              )}
            </div>

            {/* Security Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-serif text-lg text-primary mb-4 flex items-center gap-2">
                <Lock size={18} /> Bảo mật
              </h3>
              {!isChangingPassword ? (
                <button 
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full py-2 border border-gray-200 rounded-lg text-sm font-medium text-text-dark hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  Đổi mật khẩu
                </button>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Mật khẩu hiện tại</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Mật khẩu mới</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Xác nhận mật khẩu</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                      }}
                      className="flex-1 py-2 text-xs font-medium text-text-muted hover:text-text-dark"
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] py-2 px-4 bg-primary text-white rounded-lg text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Column - History & Settings */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-serif text-primary mb-6 flex items-center gap-2">
                <Clock size={24} /> Lịch sử đặt lịch
              </h3>
              
              <div className="space-y-4">
                {loadingAppts ? (
                  <p className="text-gray-500 italic p-4 text-center">Đang tải lịch sử...</p>
                ) : appointments.length === 0 ? (
                  <p className="text-gray-500 italic p-4 text-center">Bạn chưa có lịch hẹn nào.</p>
                ) : (
                  appointments.slice(0, 10).map((appt) => (
                    <div key={appt.ma_lich_hen} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary/30 transition-colors">
                      <div className="flex items-start gap-4 mb-4 sm:mb-0">
                        <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center text-primary shrink-0">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <h4 className="font-medium text-text-dark">
                            {appt.chi_tiets?.map((c: any) => c.ten_san_pham).join(", ") || "Dịch vụ"}
                          </h4>
                          <p className="text-sm text-text-muted mt-1 flex items-center gap-1">
                            <Clock size={12} /> {appt.gio_bat_dau ? String(appt.gio_bat_dau).slice(0,5) : '—'} - {new Date(appt.ngay_hen).toLocaleDateString('vi-VN')}
                          </p>
                          <p className="text-sm text-text-muted mt-1 flex items-center gap-1">
                            <MapPin size={12} /> Cơ sở chính
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium mb-2 ${
                            appt.trang_thai === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            appt.trang_thai === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                            appt.trang_thai === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700' // PENDING
                          }`}>
                          {appt.trang_thai === 'COMPLETED' && <CheckCircle2 size={12} />}
                          {appt.trang_thai === 'CANCELLED' && <XCircle size={12} />}
                          {appt.trang_thai === 'PENDING' ? 'Chờ xác nhận' :
                           appt.trang_thai === 'CONFIRMED' ? 'Đã xác nhận' :
                           appt.trang_thai === 'CANCELLED' ? 'Đã Hủy' : 'Hoàn thành'}
                        </div>
                        {appt.trang_thai === 'PENDING' && (
                          <button
                            onClick={() => handleCancelAppointment(appt.ma_lich_hen)}
                            className="text-xs text-red-500 hover:text-red-700 underline font-medium block w-full text-right sm:text-right mt-1"
                          >
                            Hủy lịch
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <button className="w-full mt-6 py-3 text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                Xem tất cả lịch sử <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
