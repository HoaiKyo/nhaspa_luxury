import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Check, Calendar, Clock, User, FileText,
  ChevronRight, ChevronLeft, Plus, Trash2, Scissors,
  Users,
} from 'lucide-react';
import { useBooking } from '../contexts/BookingContext';
import { publicApi } from '../api/public.api';
import {
  generateBookingSlots,
  getBookingDateBounds,
} from '../utils/bookingRules';

// --- Types ---
interface Service {
  ma_san_pham: number;
  ten_san_pham: string;
  ma_danh_muc: number;
  thoi_luong?: number;
  bang_gias: { gia: number }[];
}

interface Staff {
  ma_nhan_vien: number;
  ho_ten: string;
  chuc_vu: string;
}

interface Companion {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  personKey: string; // 'MAIN' or 'COMPANION:{id}'
  serviceId: number | null;
  staffId: number | null; // null = "Any"
}

const STEPS = [
  { id: 1, title: 'Ngày & Thành viên', icon: Calendar },
  { id: 2, title: 'Dịch vụ & Chuyên viên', icon: Scissors },
  { id: 3, title: 'Xác nhận', icon: FileText },
];

export default function BookingModal() {
  const { isOpen, closeBooking, initialServiceId } = useBooking();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Master Data
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffByAssignment, setStaffByAssignment] = useState<Record<string, Staff[]>>({});
  const loadingStaffServicesRef = React.useRef<string[]>([]);
  const [loadingStaffServices, setLoadingStaffServices] = useState<string[]>([]);

  // Step 1: Date/Time + Guests
  const [bookingDate, setBookingDate] = useState(getBookingDateBounds().minDate);
  const [bookingTime, setBookingTime] = useState('');
  const [occupancy, setOccupancy] = useState<Record<string, number>>({});
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [companions, setCompanions] = useState<Companion[]>([]);

  // Step 2: Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([
    { id: `as-${Date.now()}`, personKey: 'MAIN', serviceId: null, staffId: null },
  ]);

  // Step 3: Contact
  const [contactInfo, setContactInfo] = useState({ hoTen: '', soDienThoai: '', ghiChu: '' });

  const dateBounds = useMemo(() => getBookingDateBounds(), []);
  const timeSlots = useMemo(() => generateBookingSlots(bookingDate), [bookingDate]);

  const personOptions = useMemo(() => [
    { key: 'MAIN', label: 'Tôi (Khách chính)' },
    ...companions.map(c => ({
      key: `COMPANION:${c.id}`,
      label: c.name.trim() || 'Người đi cùng',
    })),
  ], [companions]);

  // --- Effects ---
  useEffect(() => {
    if (isOpen) {
      publicApi.getCategories().then(res => res.success && setCategories(res.data || []));
      publicApi.getAllProducts().then(res => {
        if (res.success && res.data) {
          const filtered = res.data
            .filter((s: any) => s.loai !== 'PRODUCT')
            .map((s: any) => {
              const basePrices = s.bang_gias?.filter((p: any) => !p.thoi_luong || !p.thoi_luong.includes('90 phút')) || [];
              return {
                ...s,
                bang_gias: basePrices.length > 0 ? basePrices : (s.bang_gias || [])
              };
            });
          setServices(filtered);
        }
      });
      publicApi.getMaxCapacity().then(res => res.success && setMaxCapacity(res.data || 10));


      // reset
      setCurrentStep(1);
      setIsSuccess(false);
      setCompanions([]);
      setStaffByAssignment({});
      setAssignments([
        { id: `as-${Date.now()}`, personKey: 'MAIN', serviceId: initialServiceId || null, staffId: null },
      ]);
      setBookingDate(getBookingDateBounds().minDate);
      setBookingTime('');
      setContactInfo({ hoTen: '', soDienThoai: '', ghiChu: '' });
    }
  }, [isOpen, initialServiceId]);

  // Fetch occupancy when date changes
  useEffect(() => {
    if (isOpen && bookingDate) {
      publicApi.getSlotOccupancy(bookingDate).then(res => {
        if (res.success) {
          setOccupancy(res.data || {});
        }
      });
    }
  }, [isOpen, bookingDate]);

  // Clear time if no longer valid after date change
  useEffect(() => {
    if (bookingTime && !timeSlots.includes(bookingTime)) {
      setBookingTime('');
    }
  }, [timeSlots, bookingTime]);

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
    assignmentsList: Assignment[],
    servicesList: Service[]
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
    assignmentsList: Assignment[],
    servicesList: Service[]
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

  const fetchStaffOptionsForAssignment = useCallback(async (
    assignmentId: string,
    serviceId: number,
    date?: string,
    time?: string
  ) => {
    if (!bookingDate || !bookingTime) return;
    const targetDate = date || bookingDate;
    const targetTime = time || bookingTime;
    const loadingKey = `${assignmentId}-${serviceId}`;
    // Use ref to avoid stale closure
    if (loadingStaffServicesRef.current.includes(loadingKey)) return;

    loadingStaffServicesRef.current = [...loadingStaffServicesRef.current, loadingKey];
    setLoadingStaffServices([...loadingStaffServicesRef.current]);
    try {
      const res = await publicApi.getAvailableStaffPublic({
        service_id: serviceId,
        date: targetDate,
        time: targetTime.length === 5 ? `${targetTime}:00` : targetTime,
      });
      if (res.success && Array.isArray(res.data)) {
        const rows = res.data as Staff[];
        
        // Sync assignments: if a selected staff is no longer available, clear them
        setAssignments(prev => {
          let changed = false;
          const nextAssignments = prev.map(a => {
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
          return nextAssignments;
        });

        setStaffByAssignment(prev => ({
          ...prev,
          [assignmentId]: rows,
        }));
      }
    } finally {
      loadingStaffServicesRef.current = loadingStaffServicesRef.current.filter(key => key !== loadingKey);
      setLoadingStaffServices([...loadingStaffServicesRef.current]);
    }
  }, [bookingDate, bookingTime]);

  // Reactive Effect to synchronize available staff for all user assignments
  useEffect(() => {
    if (currentStep !== 2 || !bookingDate || !bookingTime || services.length === 0) return;

    const calculatedStartTimes = getCalculatedStartTimes(bookingTime, assignments, services);

    assignments.forEach(a => {
      if (!a.serviceId) return;
      const calcStart = calculatedStartTimes[a.id] || bookingTime;
      void fetchStaffOptionsForAssignment(
        a.id,
        a.serviceId,
        bookingDate,
        calcStart
      );
    });
  }, [
    currentStep,
    bookingDate,
    bookingTime,
    services,
    assignments.map(a => `${a.id}-${a.serviceId}`).join(','),
  ]);

  // --- Handlers ---
  const addCompanion = () => {
    setCompanions(prev => [...prev, { id: `c-${Date.now()}`, name: '' }]);
  };

  const removeCompanion = (id: string) => {
    setCompanions(prev => prev.filter(c => c.id !== id));
    setAssignments(prev => prev.filter(a => a.personKey !== `COMPANION:${id}`));
  };

  const updateCompanion = (id: string, name: string) => {
    setCompanions(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };

  const handleGroupSizeChange = (count: number) => {
    const safeCount = Math.max(0, Math.min(count, maxCapacity - 1));
    setCompanions(prev => {
      if (safeCount > prev.length) {
        const toAdd = safeCount - prev.length;
        const newOnes = Array.from({ length: toAdd }, (_, i) => ({
          id: `c-${Date.now()}-${i}`,
          name: ''
        }));
        return [...prev, ...newOnes];
      } else if (safeCount < prev.length) {
        return prev.slice(0, safeCount);
      }
      return prev;
    });
  };

  const addAssignment = () => {
    setAssignments(prev => [...prev, { id: `as-${Date.now()}`, personKey: 'MAIN', serviceId: null, staffId: null }]);
  };

  const removeAssignment = (id: string) => {
    if (assignments.length > 1) setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const updateAssignment = (id: string, fields: Partial<Assignment>) => {
    setAssignments(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, ...fields };
      if ('serviceId' in fields) {
        updated.staffId = null;
      }
      return updated;
    }));
  };

  // --- Validation ---
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!bookingTime) {
        alert('Vui lòng chọn khung giờ hẹn.');
        return false;
      }
      if (companions.some(c => !c.name.trim())) {
        alert('Vui lòng điền tên đầy đủ cho tất cả người đi cùng.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (assignments.filter(a => a.serviceId).length === 0) {
        alert('Vui lòng chọn ít nhất 1 dịch vụ.');
        return false;
      }
      // Staff conflict check
      const staffMap = new Map<number, string>();
      for (const a of assignments.filter(a => a.serviceId)) {
        if (a.staffId) {
          if (staffMap.has(a.staffId) && staffMap.get(a.staffId) !== a.personKey) {
            alert('Không thể chọn cùng một nhân viên cho 2 người khác nhau trong cùng thời điểm.');
            return false;
          }
          staffMap.set(a.staffId, a.personKey);
        }
      }
      return true;
    }
    if (step === 3) {
      if (!contactInfo.hoTen.trim()) { alert('Vui lòng điền họ tên.'); return false; }
      if (!contactInfo.soDienThoai.trim()) { alert('Vui lòng điền số điện thoại.'); return false; }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 1) {
        // Auto-generate assignments for each member if they don't have one
        setAssignments(prev => {
          const personKeys = ['MAIN', ...companions.map(c => `COMPANION:${c.id}`)];
          const updated = [...prev];

          personKeys.forEach(key => {
            const exists = updated.some(a => a.personKey === key);
            if (!exists) {
              updated.push({
                id: `as-${Date.now()}-${key}`,
                personKey: key,
                serviceId: initialServiceId || null,
                staffId: null
              });
            }
          });

          // Clean up assignments for removed companions
          return updated.filter(a => personKeys.includes(a.personKey));
        });
      }
      setCurrentStep(prev => prev + 1);
    }
  };
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const totalPrice = useMemo(() =>
    assignments.reduce((sum, a) => {
      const svc = services.find(s => s.ma_san_pham === a.serviceId);
      return sum + (svc?.bang_gias[0]?.gia || 0);
    }, 0),
  [assignments, services]);

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setIsSubmitting(true);
    try {
      const companionIndexMap = new Map<string, number>();
      companions.forEach((c, idx) => companionIndexMap.set(c.id, idx));

      const payload = {
        ho_ten: contactInfo.hoTen,
        so_dien_thoai: contactInfo.soDienThoai,
        ngay_hen: bookingDate,
        gio_bat_dau: `${bookingTime}:00`,
        ghi_chu: contactInfo.ghiChu,
        khach_di_kems: companions.map(c => ({ ho_ten: c.name })),
        chi_tiets: (() => {
          const activeAssignments = assignments.filter(a => a.serviceId);
          const calculatedStartTimes = getCalculatedStartTimes(bookingTime, activeAssignments, services);
          const calculatedEndTimes = getCalculatedEndTimes(bookingTime, activeAssignments, services);
          
          return activeAssignments.map(a => {
            const startVal = calculatedStartTimes[a.id] || bookingTime;
            const endVal = calculatedEndTimes[a.id] || bookingTime;
            const detail: any = {
              ma_san_pham: a.serviceId,
              ma_nhan_vien: a.staffId,
              gio_bat_dau: startVal.length === 5 ? `${startVal}:00` : startVal,
              gio_ket_thuc: endVal.length === 5 ? `${endVal}:00` : endVal,
            };
            if (a.personKey.startsWith('COMPANION:')) {
              const cId = a.personKey.replace('COMPANION:', '');
              detail.chi_so_khach_di_kem = companionIndexMap.get(cId);
            }
            return detail;
          });
        })(),
      };

      const res = await publicApi.createAppointment(payload);
      if (res.success) setIsSuccess(true);
      else alert(res.message || 'Đặt lịch thất bại.');
    } catch {
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // --- Step Renders ---

  const renderStep1 = () => (
    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
      {/* Date & Time */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">Chọn Ngày & Giờ</h3>
        <p className="text-sm text-gray-400 mb-6">Chọn thời gian trước để chúng tôi tìm chuyên viên phù hợp nhất cho bạn.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Ngày hẹn</span>
            <input
              type="date"
              value={bookingDate}
              min={dateBounds.minDate}
              max={dateBounds.maxDate}
              onChange={e => setBookingDate(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-100 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold text-gray-900"
            />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Khung giờ <span className="text-red-400">*</span></span>
            <select
              value={bookingTime}
              onChange={e => setBookingTime(e.target.value)}
              className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-primary/20 outline-none font-bold appearance-none ${bookingTime ? 'border-primary/30 bg-primary/5 text-primary' : 'border-gray-100 bg-white text-gray-400'}`}
            >
              <option value="">-- Chọn khung giờ --</option>
              {timeSlots.map(slot => {
                const currentGuests = occupancy[slot] || 0;
                const isFull = currentGuests >= maxCapacity;
                return (
                  <option key={slot} value={slot} disabled={isFull} className={isFull ? 'text-gray-300' : ''}>
                    {slot} {isFull ? '(Hết chỗ)' : `(${currentGuests}/${maxCapacity} khách)`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        {bookingTime && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-primary/5 rounded-xl animate-in fade-in duration-300">
            <Check size={16} className="text-primary shrink-0" />
            <p className="text-sm text-primary font-bold">
              Bạn đã chọn: <strong>{bookingDate}</strong> lúc <strong>{bookingTime}</strong>. Chuyên viên sẽ được lọc theo khung giờ này.
            </p>
          </div>
        )}
      </div>

      {/* Companions */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Thành viên trong nhóm</h3>
            <p className="text-sm text-gray-400 mt-0.5">Bạn đi một mình hay cùng bạn bè?</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Số người đi cùng:</span>
              <input
                type="number"
                min="0"
                max={maxCapacity - 1}
                value={companions.length}
                onChange={e => handleGroupSizeChange(parseInt(e.target.value) || 0)}
                className="w-14 p-2 rounded-xl border-0 bg-white text-center font-bold text-primary shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <button
              onClick={addCompanion}
              className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={16} /> Thêm người
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Main guest - static */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-sm shrink-0">01</div>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest leading-none mb-0.5">Khách chính</p>
              <p className="text-base font-bold text-gray-900">Tôi</p>
            </div>
          </div>

          {companions.map((c, idx) => (
            <div key={c.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-10 h-10 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                {String(idx + 2).padStart(2, '0')}
              </div>
              <input
                autoFocus
                placeholder="Tên người đi cùng..."
                value={c.name}
                onChange={e => updateCompanion(c.id, e.target.value)}
                className="flex-1 text-base font-bold text-gray-900 placeholder:text-gray-300 bg-transparent border-b-2 border-dashed border-gray-100 focus:border-primary outline-none py-1"
              />
              <button onClick={() => removeCompanion(c.id)} className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {companions.length === 0 && (
            <div className="py-8 text-center rounded-2xl border-2 border-dashed border-gray-100">
              <Users className="mx-auto text-gray-200 mb-2" size={36} />
              <p className="text-gray-400 text-sm">Nhấn "Thêm người" nếu bạn đi theo nhóm.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const calculatedStartTimes = getCalculatedStartTimes(bookingTime, assignments, services);
    const calculatedEndTimes = getCalculatedEndTimes(bookingTime, assignments, services);

    const checkTimeOverlap = (start1: string, end1: string, start2: string, end2: string) => {
      return (start1 < end2 && start2 < end1);
    };

    const staffTakenByOthers = (currentId: string) => {
      const taken = new Set<number>();
      const currStart = calculatedStartTimes[currentId];
      const currEnd = calculatedEndTimes[currentId];
      if (!currStart || !currEnd) return taken;

      assignments.forEach(a => {
        if (a.id !== currentId && a.staffId) {
          const aStart = calculatedStartTimes[a.id];
          const aEnd = calculatedEndTimes[a.id];
          if (aStart && aEnd && checkTimeOverlap(currStart, currEnd, aStart, aEnd)) {
            taken.add(a.staffId);
          }
        }
      });
      return taken;
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Dịch vụ & Chuyên viên</h3>
            <p className="text-sm text-gray-400 mt-1">
              Nhân viên hiển thị đã được lọc theo khung giờ <strong className="text-primary">{bookingTime}, {bookingDate}</strong>.
            </p>
          </div>
          <button
            onClick={addAssignment}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={16} /> Thêm dòng
          </button>
        </div>

        <div className="space-y-4">
          {assignments.map(a => {
            const calculatedStart = calculatedStartTimes[a.id] || bookingTime;
            const eligibleStaff = a.serviceId ? (staffByAssignment[a.id] || []) : [];
            const isLoading = a.serviceId != null && loadingStaffServices.includes(`${a.id}-${a.serviceId}`);
            const takenStaff = staffTakenByOthers(a.id);

            return (
              <div key={a.id} className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-sm group hover:shadow-md transition-shadow">
                <button
                  onClick={() => removeAssignment(a.id)}
                  className="absolute top-4 right-4 text-gray-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <span className="font-semibold text-xs py-0.5 px-2.5 rounded-full" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                    Giờ dự kiến làm việc: {calculatedStart}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Person */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Người nhận</label>
                    <select
                      value={a.personKey}
                      onChange={e => updateAssignment(a.id, { personKey: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {personOptions.map(p => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Service */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Dịch vụ <span className="text-red-400">*</span></label>
                    <select
                      value={a.serviceId || ''}
                      onChange={e => updateAssignment(a.id, { serviceId: Number(e.target.value) || null })}
                      className={`w-full p-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 ${a.serviceId ? 'border-primary/20 bg-primary/5 text-primary' : 'border-gray-100 bg-gray-50 text-gray-500'}`}
                    >
                      <option value="">-- Chọn dịch vụ --</option>
                      {categories.map(cat => (
                        <optgroup key={cat.ma_danh_muc} label={cat.ten_danh_muc.toUpperCase()}>
                          {services.filter(s => s.ma_danh_muc === cat.ma_danh_muc).map(s => {
                            const firstPrice = s.bang_gias?.[0]?.gia;
                            return (
                              <option key={s.ma_san_pham} value={s.ma_san_pham}>
                                {s.ten_san_pham} {firstPrice ? `(${firstPrice.toLocaleString()}₫)` : '(Liên hệ)'}
                              </option>
                            );
                          })}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Staff */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Chuyên viên</label>
                    <select
                      disabled={!a.serviceId || isLoading}
                      value={a.staffId || ''}
                      onChange={e => updateAssignment(a.id, { staffId: Number(e.target.value) || null })}
                      className={`w-full p-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${a.staffId ? 'border-primary/20 bg-primary/5 text-primary' : 'border-gray-100 bg-gray-50 text-gray-500'}`}
                    >
                      <option value="">
                        {isLoading ? 'Đang tải nhân viên...' : (a.serviceId ? `${eligibleStaff.length} nhân viên sẵn sàng` : 'Chọn dịch vụ trước')}
                      </option>
                      {eligibleStaff.map(s => (
                        <option
                          key={s.ma_nhan_vien}
                          value={s.ma_nhan_vien}
                          disabled={takenStaff.has(s.ma_nhan_vien)}
                        >
                          {s.ho_ten}{s.chuc_vu ? ` • ${s.chuc_vu}` : ''}{takenStaff.has(s.ma_nhan_vien) ? ' (đã xếp cho người khác)' : ''}
                        </option>
                      ))}
                    </select>

                    {/* Info badge */}
                    {a.serviceId && !isLoading && eligibleStaff.length === 0 && (
                      <p className="text-[10px] text-amber-500 font-bold pl-1">
                        Không có nhân viên rảnh lúc {calculatedStart} — thử chọn giờ khác
                      </p>
                    )}
                    {a.serviceId && !isLoading && eligibleStaff.length > 0 && !a.staffId && (
                      <p className="text-[10px] text-gray-400 pl-1">Để trống = spa sẽ tự phân công</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Thông tin liên hệ</h3>
            <p className="text-sm text-gray-400">Nhập thông tin để chúng tôi xác nhận lịch hẹn cho bạn.</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Họ và tên <span className="text-red-400">*</span></label>
                <input
                  placeholder="Nguyễn Văn A"
                  value={contactInfo.hoTen}
                  onChange={e => setContactInfo(prev => ({ ...prev, hoTen: e.target.value }))}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Số điện thoại <span className="text-red-400">*</span></label>
                <input
                  placeholder="0912 345 678"
                  value={contactInfo.soDienThoai}
                  onChange={e => setContactInfo(prev => ({ ...prev, soDienThoai: e.target.value }))}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Ghi chú thêm</label>
              <textarea
                placeholder="Yêu cầu đặc biệt, dị ứng, mong muốn riêng..."
                value={contactInfo.ghiChu}
                onChange={e => setContactInfo(prev => ({ ...prev, ghiChu: e.target.value }))}
                rows={3}
                className="w-full p-4 rounded-2xl border border-gray-100 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium resize-none"
              />
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-7 sticky top-0">
            <h4 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <FileText size={18} className="text-primary" /> Tóm tắt đặt lịch
            </h4>

            {/* Time */}
            <div className="flex items-center gap-3 mb-5 p-3 bg-primary/5 rounded-xl">
              <Clock size={16} className="text-primary shrink-0" />
              <p className="text-sm font-bold text-primary">{bookingTime}, {bookingDate}</p>
            </div>

            {/* Assignments */}
            <div className="space-y-3 mb-6">
              {assignments.filter(a => a.serviceId).map(a => {
                const person = personOptions.find(p => p.key === a.personKey);
                const svc = services.find(s => s.ma_san_pham === a.serviceId);
                const staff = a.serviceId && a.staffId ? staffByAssignment[a.id]?.find(s => s.ma_nhan_vien === a.staffId) : null;
                return (
                  <div key={a.id} className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{person?.label}</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{svc?.ten_san_pham}</p>
                      <p className="text-[10px] text-primary">{staff ? `▸ ${staff.ho_ten}` : '▸ Spa tự phân công'}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 shrink-0">{svc?.bang_gias[0]?.gia?.toLocaleString()}₫</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-gray-100 pt-5">
              <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl">
                <span className="font-bold text-primary text-sm">Tổng cộng</span>
                <span className="text-2xl font-serif font-black text-primary">{totalPrice.toLocaleString()}₫</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gradient-to-b from-white to-primary/5">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/15 blur-3xl rounded-full scale-150" />
        <div className="relative w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 animate-in zoom-in duration-500">
          <Check size={48} strokeWidth={3} />
        </div>
      </div>
      <h3 className="text-4xl font-serif text-gray-900 mb-3">Hoàn tất!</h3>
      <div className="w-16 h-1 bg-primary/30 rounded-full mx-auto mb-6" />
      <p className="text-lg text-gray-600 max-w-sm mx-auto mb-10 leading-relaxed">
        Cảm ơn <strong className="text-gray-900">{contactInfo.hoTen}</strong>. Lịch hẹn của bạn vào lúc{' '}
        <strong className="text-primary">{bookingTime}, {bookingDate}</strong> đã được ghi nhận. Chúng tôi sẽ sớm gọi xác nhận!
      </p>
      <button onClick={closeBooking} className="px-12 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-secondary hover:-translate-y-0.5 transition-all">
        Đóng
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight">Đặt lịch Luxury Spa</h2>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">Quy trình chuyên nghiệp</p>
            </div>
          </div>
          <button onClick={closeBooking} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all">
            <X size={22} className="text-gray-300" />
          </button>
        </div>

        {isSuccess ? renderSuccess() : (
          <>
            {/* Steps Nav */}
            <div className="flex items-center px-8 py-4 border-b border-gray-50 bg-gray-50/50 shrink-0 gap-0">
              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                const isActive = currentStep === s.id;
                const isDone = currentStep > s.id;
                return (
                  <div key={s.id} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5 min-w-[56px]">
                      <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
                        isDone ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' :
                        isActive ? 'border-primary text-primary bg-white shadow-md' :
                        'border-gray-200 text-gray-300 bg-white'
                      }`}>
                        {isDone ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                        {s.title}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`h-[2px] flex-1 mx-4 rounded-full transition-all duration-500 ${isDone ? 'bg-primary' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white">
              <div className="max-w-3xl mx-auto">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-gray-50 flex items-center justify-between gap-4 shrink-0 bg-white">
              <button
                onClick={currentStep === 1 ? closeBooking : prevStep}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50 transition-all active:scale-95"
              >
                {currentStep === 1 ? 'Hủy' : <><ChevronLeft size={20} /> Quay lại</>}
              </button>

              <button
                onClick={currentStep === 3 ? handleSubmit : nextStep}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-10 py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:bg-secondary transition-all active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : currentStep === 3 ? (
                  'Đặt lịch ngay'
                ) : (
                  <>Kế tiếp <ChevronRight size={20} /></>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
