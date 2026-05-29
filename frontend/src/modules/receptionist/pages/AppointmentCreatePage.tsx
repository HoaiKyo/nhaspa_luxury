import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, User, X, Package, Search } from 'lucide-react';

import { receptionistApi } from '../services/receptionist.api';
import { publicApi } from '../../../api/public.api';
import {
  generateBookingSlots,
  getBookingDateBounds,
  isValidBookingSlot,
} from '../../../utils/bookingRules';

// --- Types ---
type ServiceItem = {
  ma_san_pham: number;
  ten_san_pham: string;
  loai?: string;
  thoi_luong?: number;
  ma_danh_muc?: number;
  bang_gias?: Array<{ gia?: number | string | null; thoi_luong?: string | null }>;
};

type StaffOptionItem = {
  ma_nhan_vien: number;
  ho_ten?: string | null;
  chuc_vu?: string | null;
};

type CompanionItem = {
  id: string;
  name: string;
  phone: string;
  note: string;
};

type AssignmentItem = {
  id: string;
  personKey: string;
  serviceId: number;
  staffId: number | null;
};

// --- Helpers ---
const createLocalId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);

export default function AppointmentCreatePage() {
  const navigate = useNavigate();
  const dateBounds = useMemo(() => getBookingDateBounds(), []);

  // --- State ---
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    date: dateBounds.minDate,
    time: '',
    note: '',
    companions: [] as CompanionItem[],
    assignments: [] as AssignmentItem[],
  });

  const [staffByAssignment, setStaffByAssignment] = useState<Record<string, StaffOptionItem[]>>({});
  const loadingStaffServicesRef = React.useRef<string[]>([]);
  const [loadingStaffServices, setLoadingStaffServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // --- Memos ---
  const availableSlots = useMemo(() => generateBookingSlots(form.date), [form.date]);
  const servicesById = useMemo(() => new Map(services.map(s => [s.ma_san_pham, s])), [services]);

  const personOptions = useMemo(() => [
    { key: 'MAIN', label: 'Khách chính' },
    ...form.companions.map(c => ({
      key: `COMPANION:${c.id}`,
      label: c.name.trim() ? c.name.trim() : 'Khách đi kèm'
    }))
  ], [form.companions]);

  // --- Effects ---
  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (!availableSlots.includes(form.time)) {
      setForm(prev => ({ ...prev, time: availableSlots[0] || '' }));
    }
  }, [availableSlots, form.time]);

  const addMinutesToTime = (timeStr: string, minutes: number): string => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    const totalMins = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMins / 60) % 24;
    const newMins = totalMins % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  };

  const getCalculatedStartTimes = (
    baseTime: string,
    assignmentsList: AssignmentItem[],
    servicesList: ServiceItem[]
  ): Record<string, string> => {
    const servicesMap = new Map<number, number>();
    servicesList.forEach(s => {
      servicesMap.set(s.ma_san_pham, s.thoi_luong || 30);
    });

    const personNextStart: Record<string, string> = {};
    const calculated: Record<string, string> = {};

    assignmentsList.forEach(a => {
      if (!a.serviceId) return;
      const duration = servicesMap.get(a.serviceId) || 30;
      const currStart = personNextStart[a.personKey] || baseTime;
      calculated[a.id] = currStart;

      // Calculate next start time (add duration)
      personNextStart[a.personKey] = addMinutesToTime(currStart, duration);
    });

    return calculated;
  };

  const getCalculatedEndTimes = (
    baseTime: string,
    assignmentsList: AssignmentItem[],
    servicesList: ServiceItem[]
  ): Record<string, string> => {
    const servicesMap = new Map<number, number>();
    servicesList.forEach(s => {
      servicesMap.set(s.ma_san_pham, s.thoi_luong || 30);
    });

    const personNextStart: Record<string, string> = {};
    const calculated: Record<string, string> = {};

    assignmentsList.forEach(a => {
      if (!a.serviceId) return;
      const duration = servicesMap.get(a.serviceId) || 30;
      const currStart = personNextStart[a.personKey] || baseTime;
      const currEnd = addMinutesToTime(currStart, duration);
      calculated[a.id] = currEnd;

      personNextStart[a.personKey] = currEnd;
    });

    return calculated;
  };

  const fetchStaffOptionsForAssignment = async (
    assignmentId: string,
    serviceId: number,
    date?: string,
    time?: string
  ) => {
    if (!serviceId) return;
    const loadingKey = `${assignmentId}-${serviceId}`;
    // Use ref to avoid stale closure on loadingStaffServices
    if (loadingStaffServicesRef.current.includes(loadingKey)) return;

    loadingStaffServicesRef.current = [...loadingStaffServicesRef.current, loadingKey];
    setLoadingStaffServices([...loadingStaffServicesRef.current]);
    try {
      const targetTime = time || form.time;
      const res = await receptionistApi.getAvailableStaff(
        serviceId,
        date || form.date,
        targetTime.length === 5 ? `${targetTime}:00` : targetTime
      );
      if (res.success && Array.isArray(res.data)) {
        const rows = res.data as StaffOptionItem[];

        // Sync assignments: if a selected staff is no longer available, clear them
        setForm(prev => {
          let changed = false;
          const nextAssignments = prev.assignments.map(a => {
            if (a.id === assignmentId && a.staffId) {
              const isStillAvailable = rows.some(s => s.ma_nhan_vien === a.staffId);
              if (!isStillAvailable) {
                changed = true;
                return { ...a, staffId: null };
              }
            }
            return a;
          });
          if (!changed) return prev;
          return { ...prev, assignments: nextAssignments };
        });

        setStaffByAssignment(prev => ({
          ...prev,
          [assignmentId]: rows,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      loadingStaffServicesRef.current = loadingStaffServicesRef.current.filter(key => key !== loadingKey);
      setLoadingStaffServices([...loadingStaffServicesRef.current]);
    }
  };

  // Reactive Effect to synchronize available staff for all receptionist assignments
  useEffect(() => {
    if (!form.date || !form.time || services.length === 0) return;

    const calculatedStartTimes = getCalculatedStartTimes(form.time, form.assignments, services);

    form.assignments.forEach(a => {
      if (!a.serviceId) return;
      const calcStart = calculatedStartTimes[a.id] || form.time;
      void fetchStaffOptionsForAssignment(
        a.id,
        a.serviceId,
        form.date,
        calcStart
      );
    });
  }, [
    form.date,
    form.time,
    services,
    form.assignments.map(a => `${a.id}-${a.serviceId}`).join(','),
  ]);

  // --- Logic ---
  const loadServices = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        publicApi.getCategories(),
        publicApi.getAllProducts()
      ]);
      
      setCategories(catRes.success ? catRes.data || [] : []);

      const rows = Array.isArray(prodRes.data) ? prodRes.data : [];
      const filtered = rows
        .filter((s: any) => s.loai !== 'PRODUCT')
        .map((s: any) => {
          const basePrices = s.bang_gias?.filter((p: any) => !p.thoi_luong || !p.thoi_luong.includes('90 phút')) || [];
          return {
            ...s,
            bang_gias: basePrices.length > 0 ? basePrices : (s.bang_gias || [])
          };
        });

      setServices(filtered);
      
      // Initialize with one assignment if empty
      if (filtered.length > 0) {
        setForm(prev => ({
          ...prev,
          assignments: [
            { id: createLocalId(), personKey: 'MAIN', serviceId: filtered[0].ma_san_pham, staffId: null }
          ]
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingServices(false);
    }
  };



  const handleSearchCustomer = async (phone: string) => {
    setForm(prev => ({ ...prev, customerPhone: phone }));
    if (phone.length < 3) {
      setCustomers([]);
      return;
    }
    try {
      setSearchingCustomer(true);
      const res = await receptionistApi.getCustomers(phone);
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const selectCustomer = (c: any) => {
    setForm(prev => ({ ...prev, customerName: c.ho_ten, customerPhone: c.so_dien_thoai }));
    setCustomers([]);
  };

  // --- Form Handlers ---
  const addCompanion = () => {
    setForm(prev => ({
      ...prev,
      companions: [...prev.companions, { id: createLocalId(), name: '', phone: '', note: '' }]
    }));
  };

  const removeCompanion = (id: string) => {
    setForm(prev => ({
      ...prev,
      companions: prev.companions.filter(c => c.id !== id),
      assignments: prev.assignments.filter(a => a.personKey !== `COMPANION:${id}`)
    }));
  };

  const addAssignment = () => {
    if (services.length === 0) return;
    setForm(prev => ({
      ...prev,
      assignments: [...prev.assignments, { id: createLocalId(), personKey: 'MAIN', serviceId: services[0].ma_san_pham, staffId: null }]
    }));
  };

  const updateAssignment = (id: string, updates: Partial<AssignmentItem>) => {
    setForm(prev => ({
      ...prev,
      assignments: prev.assignments.map(a => {
        if (a.id !== id) return a;
        const updated = { ...a, ...updates };
        // Reset staffId and clear cached staff options whenever service changes
        if ('serviceId' in updates && updates.serviceId !== a.serviceId) {
          updated.staffId = null;
          setStaffByAssignment(s => { const next = { ...s }; delete next[id]; return next; });
        }
        return updated;
      })
    }));
  };

  const removeAssignment = (id: string) => {
    setForm(prev => ({
      ...prev,
      assignments: prev.assignments.filter(a => a.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validations
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      return alert('Vui lòng điền đủ thông tin khách hàng');
    }
    if (form.assignments.length === 0) {
      return alert('Vui lòng chọn ít nhất 1 dịch vụ');
    }
    if (form.assignments.some(a => !a.staffId)) {
      return alert('Vui lòng phân công nhân viên cho tất cả các dịch vụ');
    }
    
    // Map companions for index lookup
    const companionIndexMap = new Map<string, number>();
    form.companions.forEach((c, idx) => companionIndexMap.set(c.id, idx));

    const payload = {
      ho_ten: form.customerName.trim(),
      so_dien_thoai: form.customerPhone.trim(),
      ngay_hen: form.date,
      gio_bat_dau: `${form.time}:00`,
      ghi_chu: form.note || undefined,
      khach_di_kems: form.companions.map(c => ({
        ho_ten: c.name.trim() || 'Khách đi kèm',
        ghi_chu: c.note || undefined
      })),
      chi_tiets: (() => {
        const calculatedStartTimes = getCalculatedStartTimes(form.time, form.assignments, services);
        const calculatedEndTimes = getCalculatedEndTimes(form.time, form.assignments, services);
        
        return form.assignments.map(a => {
          const startVal = calculatedStartTimes[a.id] || form.time;
          const endVal = calculatedEndTimes[a.id] || form.time;
          const item: any = {
            ma_san_pham: a.serviceId,
            ma_nhan_vien: a.staffId,
            gio_bat_dau: startVal.length === 5 ? `${startVal}:00` : startVal,
            gio_ket_thuc: endVal.length === 5 ? `${endVal}:00` : endVal,
          };
          if (a.personKey.startsWith('COMPANION:')) {
            const cId = a.personKey.replace('COMPANION:', '');
            item.chi_so_khach_di_kem = companionIndexMap.get(cId);
          }
          return item;
        });
      })()
    };

    try {
      setSubmitting(true);
      const res = await receptionistApi.createPublicAppointment(payload);
      if (!res.success) throw new Error(res.message || 'Lỗi khi tạo lịch hẹn');
      alert('Tạo lịch hẹn thành công');
      navigate('../');
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingServices) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="admin-animate-in max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('../')} className="admin-btn-icon">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--admin-text-heading)' }}>Tạo Lịch Hẹn Mới</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info & Time */}
        <div className="lg:col-span-1 space-y-6">
          <div className="admin-card space-y-4">
            <h3 className="font-semibold border-b border-[var(--admin-border)] pb-2 flex items-center gap-2">
              <User size={18} /> Khách hàng & Thời gian
            </h3>
            
            <div>
              <label className="admin-label">Họ tên khách *</label>
              <input
                required
                className="admin-input"
                value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })}
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
                  value={form.customerPhone}
                  onChange={e => handleSearchCustomer(e.target.value)}
                  placeholder="090..."
                />
                {searchingCustomer && <div className="absolute right-3 top-2.5 text-xs text-gray-400">...</div>}
                {customers.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-auto">
                    {customers.map(c => (
                      <button
                        key={c.ma_nguoi_dung}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b last:border-0 border-gray-100"
                      >
                        <div className="font-medium">{c.ho_ten}</div>
                        <div className="text-gray-500 text-xs">{c.so_dien_thoai}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="admin-label">Ngày hẹn</label>
                <input
                  type="date"
                  className="admin-input"
                  min={dateBounds.minDate}
                  max={dateBounds.maxDate}
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label className="admin-label">Giờ hẹn</label>
                <select
                  className="admin-select"
                  value={form.time}
                  onChange={e => setForm({ ...form, time: e.target.value })}
                >
                  {availableSlots.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="admin-label">Ghi chú</label>
              <textarea
                className="admin-input"
                rows={2}
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="Yêu cầu đặc biệt..."
              />
            </div>
          </div>

          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2">
              <h3 className="font-semibold flex items-center gap-2"><Plus size={18} /> Khách đi kèm</h3>
              <button type="button" onClick={addCompanion} className="text-xs text-indigo-600 hover:underline">+ Thêm người</button>
            </div>
            <div className="space-y-3">
              {form.companions.length === 0 && <p className="text-xs text-gray-500 italic">Không có khách đi kèm</p>}
              {form.companions.map(c => (
                <div key={c.id} className="flex gap-2 items-center">
                  <input
                    className="admin-input text-sm py-1.5"
                    placeholder="Tên người đi kèm"
                    value={c.name}
                    onChange={e => setForm({
                      ...form,
                      companions: form.companions.map(x => x.id === c.id ? { ...x, name: e.target.value } : x)
                    })}
                  />
                  <button type="button" onClick={() => removeCompanion(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Services & Assignments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Package size={18} /> Phân công dịch vụ</h3>
              <button type="button" onClick={addAssignment} className="admin-btn admin-btn-secondary py-1 text-xs">+ Thêm dịch vụ</button>
            </div>

            <div className="space-y-4">
              {form.assignments.map((a, idx) => {
                const calculatedStartTimes = getCalculatedStartTimes(form.time, form.assignments, services);
                const calculatedStart = calculatedStartTimes[a.id] || form.time;
                const staffOptions = a.serviceId ? (staffByAssignment[a.id] || []) : [];
                const isLoadingStaff = a.serviceId != null && loadingStaffServices.includes(`${a.id}-${a.serviceId}`);
                const staffTakenByOthers = new Set(
                  form.assignments
                    .filter((item) => item.id !== a.id && Boolean(item.staffId))
                    .map((item) => Number(item.staffId))
                );
                
                return (
                  <div key={a.id} className="p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)] space-y-3 relative group">
                    <button
                      type="button"
                      onClick={() => removeAssignment(a.id)}
                      className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs py-0.5 px-2 rounded-full" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                        Giờ làm việc dự kiến: {calculatedStart}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[var(--admin-text-muted)] mb-1 block">Người làm</label>
                        <select
                          className="admin-select py-1.5 text-sm"
                          value={a.personKey}
                          onChange={e => updateAssignment(a.id, { personKey: e.target.value })}
                        >
                          {personOptions.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[var(--admin-text-muted)] mb-1 block">Dịch vụ</label>
                        <select
                          className="admin-select py-1.5 text-sm"
                          value={a.serviceId}
                          onChange={e => updateAssignment(a.id, { serviceId: Number(e.target.value), staffId: null })}
                        >
                          <option value="">-- Chọn dịch vụ --</option>
                          {categories.map(cat => (
                            <optgroup key={cat.ma_danh_muc} label={cat.ten_danh_muc.toUpperCase()}>
                              {services.filter(s => s.ma_danh_muc === cat.ma_danh_muc).map(s => {
                                const firstPrice = s.bang_gias?.[0]?.gia;
                                return (
                                  <option key={s.ma_san_pham} value={s.ma_san_pham}>
                                    {s.ten_san_pham} {firstPrice ? `(${formatMoney(Number(firstPrice))})` : '(Liên hệ)'}
                                  </option>
                                );
                              })}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[var(--admin-text-muted)] mb-1 block">Nhân viên phụ trách</label>
                        <select
                          required
                          className="admin-select py-1.5 text-sm"
                          value={a.staffId || ''}
                          onChange={e => updateAssignment(a.id, { staffId: Number(e.target.value) })}
                        >
                          <option value="">{isLoadingStaff ? 'Đang tải...' : '--- Chọn nhân viên ---'}</option>
                          {staffOptions.map(s => (
                            <option key={s.ma_nhan_vien} value={s.ma_nhan_vien} disabled={staffTakenByOthers.has(s.ma_nhan_vien)}>
                              {s.ho_ten} {s.chuc_vu ? `• ${s.chuc_vu}` : ''}{staffTakenByOthers.has(s.ma_nhan_vien) ? ' (đã xếp cho người khác)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}

              {form.assignments.length === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-[var(--admin-border)] rounded-xl">
                  <p className="text-gray-400">Chưa có dịch vụ nào được chọn</p>
                  <button type="button" onClick={addAssignment} className="mt-2 text-indigo-600 font-medium">+ Thêm ngay</button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--admin-border)] flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="admin-btn admin-btn-primary px-8 py-2.5 font-bold shadow-lg shadow-indigo-200"
              >
                {submitting ? 'Đang xử lý...' : <><Save size={18} /> Xác nhận Đặt lịch</>}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
