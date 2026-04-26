import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Save, User } from 'lucide-react';

import { receptionistApi } from '../services/receptionist.api';
import {
  generateBookingSlots,
  getBookingDateBounds,
  isValidBookingSlot,
} from '../../../utils/bookingRules';

type ServiceItem = {
  ma_san_pham: number;
  ten_san_pham?: string;
  loai?: string;
};

type BookingServiceItem = {
  ma_san_pham: number;
};

export default function AppointmentCreatePage() {
  const navigate = useNavigate();
  const dateBounds = useMemo(() => getBookingDateBounds(), []);

  const [customers, setCustomers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const [form, setForm] = useState({
    ho_ten: '',
    so_dien_thoai: '',
    ngay_hen: dateBounds.minDate,
    gio_bat_dau: '',
    ghi_chu: '',
    dich_vu_chi_tiet: [] as BookingServiceItem[],
  });

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const availableSlots = useMemo(
    () => generateBookingSlots(form.ngay_hen),
    [form.ngay_hen],
  );

  useEffect(() => {
    loadLookups();
  }, []);

  const handleSearchCustomer = async (phone: string) => {
    setForm(prev => ({ ...prev, so_dien_thoai: phone }));
    if (phone.length < 3) {
      setCustomers([]);
      return;
    }

    try {
      setSearching(true);
      const res = await receptionistApi.getCustomers(phone);
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = (c: any) => {
    setSelectedCustomer(c);
    setForm(prev => ({
      ...prev,
      ho_ten: c.ho_ten,
      so_dien_thoai: c.so_dien_thoai
    }));
    setCustomers([]);
  };

  useEffect(() => {
    if (!availableSlots.includes(form.gio_bat_dau)) {
      setForm((prev) => ({
        ...prev,
        gio_bat_dau: availableSlots[0] || '',
      }));
    }
  }, [availableSlots, form.gio_bat_dau]);

  const loadLookups = async () => {
    try {
      const svcRes = await receptionistApi.getServiceProducts();
      setServices(Array.isArray(svcRes.data) ? (svcRes.data as ServiceItem[]) : []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddService = () => {
    if (services.length === 0) {
      alert('Hệ thống chưa có dịch vụ nào');
      return;
    }
    setForm((prev) => ({
      ...prev,
      dich_vu_chi_tiet: [
        ...prev.dich_vu_chi_tiet,
        { ma_san_pham: services[0].ma_san_pham },
      ],
    }));
  };

  const handleRemoveService = (index: number) => {
    setForm((prev) => {
      const next = [...prev.dich_vu_chi_tiet];
      next.splice(index, 1);
      return { ...prev, dich_vu_chi_tiet: next };
    });
  };

  const handleServiceChange = (index: number, ma_san_pham: number) => {
    setForm((prev) => {
      const next = [...prev.dich_vu_chi_tiet];
      next[index] = { ma_san_pham };
      return { ...prev, dich_vu_chi_tiet: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ho_ten || !form.so_dien_thoai || !form.ngay_hen || !form.gio_bat_dau) {
      alert('Vui lòng điền đủ Tên, SĐT, ngày và giờ hẹn');
      return;
    }
    if (form.dich_vu_chi_tiet.length === 0) {
      alert('Vui lòng chọn ít nhất 1 dịch vụ');
      return;
    }
    if (!isValidBookingSlot(form.ngay_hen, form.gio_bat_dau)) {
      alert('Khung giờ hẹn không hợp lệ');
      return;
    }

    const payload = {
      ho_ten: form.ho_ten.trim(),
      so_dien_thoai: form.so_dien_thoai.trim(),
      ngay_hen: form.ngay_hen,
      gio_bat_dau: `${form.gio_bat_dau}:00`,
      ghi_chu: form.ghi_chu || undefined,
      chi_tiets: form.dich_vu_chi_tiet.map((dv) => ({
        ma_san_pham: dv.ma_san_pham
      })),
    };

    try {
      setSubmitting(true);
      const res = await receptionistApi.createPublicAppointment(payload);
      if (!res.success) {
        throw new Error(res.message || 'Lỗi khi tạo lịch hẹn');
      }
      alert('Tạo lịch hẹn thành công');

      const apptId = (res.data as any)?.ma_lich_hen;
      if (apptId) {
        navigate(`/receptionist/lich-hen/${apptId}`);
      } else {
        navigate('/receptionist/lich-hen');
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi tạo lịch hẹn');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-animate-in max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/receptionist/lich-hen')}
          className="admin-btn-icon"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text-heading)' }}>
          Tạo Lịch Hẹn Mới
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="admin-card space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b border-[var(--admin-border)] pb-2 flex items-center gap-2">
            <User size={18} /> Thông tin khách hàng & Thời gian
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Họ và tên *</label>
              <input
                required
                type="text"
                className="admin-input"
                value={form.ho_ten}
                onChange={(e) => setForm({ ...form, ho_ten: e.target.value })}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="admin-label">Số điện thoại *</label>
              <div className="relative">
                <input
                  required
                  type="tel"
                  className="admin-input"
                  value={form.so_dien_thoai}
                  onChange={(e) => handleSearchCustomer(e.target.value)}
                  placeholder="090..."
                />
                {searching && <div className="absolute right-3 top-2.5 text-xs text-gray-400">Đang tìm...</div>}
                
                {customers.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                    {customers.map(c => (
                      <button
                        key={c.ma_nguoi_dung}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b last:border-0 border-gray-100"
                      >
                        <div className="font-medium">{c.ho_ten}</div>
                        <div className="text-gray-500 text-xs">{c.so_dien_thoai} {c.hang_thanh_vien ? `- ${c.hang_thanh_vien}` : ''}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="admin-label">Ngày hẹn *</label>
              <input
                required
                type="date"
                min={dateBounds.minDate}
                max={dateBounds.maxDate}
                className="admin-input"
                value={form.ngay_hen}
                onChange={(e) => setForm({ ...form, ngay_hen: e.target.value })}
              />
            </div>
            <div>
              <label className="admin-label">Giờ hẹn (slot 30 phút) *</label>
              <select
                required
                className="admin-select"
                value={form.gio_bat_dau}
                onChange={(e) => setForm({ ...form, gio_bat_dau: e.target.value })}
              >
                <option value="" disabled>Chọn giờ</option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              {availableSlots.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Ngày này không còn slot khả dụng.</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="admin-label">Ghi chú</label>
              <input
                type="text"
                className="admin-input"
                value={form.ghi_chu}
                onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
                placeholder="Khách ABC..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Package size={18} /> Dịch vụ yêu cầu *
            </h3>
            <button
              type="button"
              onClick={handleAddService}
              className="text-sm text-indigo-600 font-medium hover:underline"
            >
              + Thêm dịch vụ
            </button>
          </div>

          <div className="space-y-3">
            {form.dich_vu_chi_tiet.map((dv, idx) => (
              <div
                key={idx}
                className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Dịch vụ
                  </label>
                  <select
                    className="admin-select bg-white py-1.5"
                    value={dv.ma_san_pham}
                    onChange={(e) => handleServiceChange(idx, Number(e.target.value))}
                  >
                    {services.map((s) => (
                      <option key={s.ma_san_pham} value={s.ma_san_pham}>
                        {s.ten_san_pham} {s.loai ? `- ${s.loai}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveService(idx)}
                  className="admin-btn admin-btn-danger py-1.5 h-[34px] px-3 text-xs"
                >
                  Xóa
                </button>
              </div>
            ))}
            {form.dich_vu_chi_tiet.length === 0 && (
              <p className="text-sm text-red-500 italic">Cần chọn ít nhất 1 dịch vụ.</p>
            )}
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-[var(--admin-border)]">
          <button
            type="button"
            onClick={() => navigate('/receptionist/lich-hen')}
            className="admin-btn admin-btn-secondary"
          >
            Hủy
          </button>
          <button type="submit" disabled={submitting} className="admin-btn admin-btn-primary">
            {submitting ? (
              'Đang lưu...'
            ) : (
              <>
                <Save size={16} /> Xác nhận Tạo
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
