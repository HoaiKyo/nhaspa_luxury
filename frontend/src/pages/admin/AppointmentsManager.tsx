import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';

import { appointmentsApi, productsApi, staffApi } from '../../api/admin.api';
import {
  generateBookingSlots,
  getBookingDateBounds,
  isDateWithinBookingWindow,
  isValidBookingSlot,
} from '../../utils/bookingRules';

type AppointmentBucket = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type PeriodFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
type StatusFilter = 'ALL' | AppointmentBucket;

interface AppointmentDetail {
  ma_chi_tiet: number;
  ma_san_pham: number;
  ten_san_pham?: string | null;
  ma_nhan_vien?: number | null;
  ho_ten_nhan_vien?: string | null;
  gio_bat_dau?: string | null;
  gio_ket_thuc?: string | null;
  gia?: number | string | null;
  ghi_chu?: string | null;
}

interface AppointmentRecord {
  ma_lich_hen: number;
  ma_khach_hang: number;
  ho_ten_khach?: string | null;
  so_dien_thoai_khach?: string | null;
  ngay_hen: string;
  gio_bat_dau: string;
  gio_ket_thuc?: string | null;
  trang_thai: string;
  ghi_chu?: string | null;
  ngay_tao?: string | null;
  chi_tiets?: AppointmentDetail[];
}

interface ServicePrice {
  gia?: number | string | null;
}

interface ServiceItem {
  ma_san_pham: number;
  ten_san_pham: string;
  loai?: string;
  thoi_luong?: number | null;
  trang_thai?: boolean;
  bang_gias?: ServicePrice[];
}

interface AppointmentForm {
  customerName: string;
  customerPhone: string;
  companions: CompanionFormItem[];
  assignments: AssignmentItem[];
  date: string;
  time: string;
  note: string;
  status: string;
}

interface CompanionFormItem {
  id: string;
  name: string;
  phone: string;
  note: string;
}

interface AssignmentItem {
  id: string;
  appointmentDetailId?: number;
  personKey: string;
  serviceId: number;
  staffId: number | null;
}

interface StaffOptionItem {
  ma_nhan_vien: number;
  ho_ten?: string | null;
  chuc_vu?: string | null;
}

const PAGE_SIZE = 10;
const FETCH_PAGE_SIZE = 120;

const COLORS = {
  bg: 'transparent',
  surface: 'var(--admin-card)',
  border: 'var(--admin-border)',
  borderStrong: 'var(--admin-border)',
  borderSoft: 'var(--admin-table-border)',
  textMain: 'var(--admin-text)',
  textMuted: 'var(--admin-text-muted)',
  textHeading: 'var(--admin-text-heading)',
  accent: 'var(--admin-accent)',
  accentSoft: 'rgba(16, 185, 129, 0.15)',
  inputBg: 'var(--admin-input-bg)',
  tableHeaderBg: 'var(--admin-table-header-bg)',
  info: 'var(--admin-info)',
  warning: 'var(--admin-warning)',
  danger: 'var(--admin-danger)',
};

const STATUS_META: Record<AppointmentBucket, { label: string; bg: string; border: string; text: string; pulse?: boolean }> = {
  COMPLETED: {
    label: 'Hoàn thành',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    text: 'var(--admin-accent)',
  },
  PENDING: {
    label: 'Chờ xác nhận',
    bg: 'rgba(245, 158, 11, 0.16)',
    border: 'rgba(245, 158, 11, 0.35)',
    text: 'var(--admin-warning)',
    pulse: true,
  },
  IN_PROGRESS: {
    label: 'Đang thực hiện',
    bg: 'rgba(59, 130, 246, 0.16)',
    border: 'rgba(59, 130, 246, 0.35)',
    text: 'var(--admin-info)',
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.35)',
    text: 'var(--admin-danger)',
  },
};

const PERIOD_FILTERS: Array<{ key: PeriodFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'TODAY', label: 'Hôm nay' },
  { key: 'WEEK', label: 'Tuần này' },
  { key: 'MONTH', label: 'Tháng này' },
];

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

const UPDATE_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
] as const;

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeekMonday = (date: Date): Date => {
  const d = startOfDay(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};

const formatMoney = (amount: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);

const formatDateVN = (dateISO?: string | null): string => {
  if (!dateISO) return '—';
  const d = new Date(`${String(dateISO).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
};

const formatTime = (raw?: string | null): string => {
  if (!raw) return '—';
  const s = String(raw);
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return '—';
};

const toTimeInput = (raw?: string | null): string => {
  const time = formatTime(raw);
  return /^\d{2}:\d{2}$/.test(time) ? time : '09:00';
};

const toTimeApi = (time: string): string => {
  const normalized = String(time).slice(0, 5);
  return /^\d{2}:\d{2}$/.test(normalized) ? `${normalized}:00` : '09:00:00';
};

const toDateTimeValue = (dateISO?: string | null, time?: string | null): number => {
  if (!dateISO) return 0;
  const datePart = String(dateISO).slice(0, 10);
  const timePart = formatTime(time);
  const dt = new Date(`${datePart}T${/^\d{2}:\d{2}$/.test(timePart) ? `${timePart}:00` : '00:00:00'}`);
  if (Number.isNaN(dt.getTime())) return 0;
  return dt.getTime();
};

const parseMinutes = (time?: string | null): number | null => {
  if (!time) return null;
  const formatted = formatTime(time);
  if (!/^\d{2}:\d{2}$/.test(formatted)) return null;
  const [h, m] = formatted.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const durationMinutes = (start?: string | null, end?: string | null): number | null => {
  const from = parseMinutes(start);
  const to = parseMinutes(end);
  if (from === null || to === null || to <= from) return null;
  return to - from;
};

const normalizeStatus = (status: string): AppointmentBucket => {
  const key = String(status || '').toUpperCase();
  if (['COMPLETED', 'DONE', 'FINISHED', 'PAID'].includes(key)) return 'COMPLETED';
  if (['IN_PROGRESS', 'PROCESSING', 'CONFIRMED'].includes(key)) return 'IN_PROGRESS';
  if (['CANCELLED', 'CANCELED', 'NO_SHOW', 'REJECTED'].includes(key)) return 'CANCELLED';
  return 'PENDING';
};

const statusLabel = (status: string): string => {
  const key = String(status || '').toUpperCase();
  if (key === 'CONFIRMED') return 'Đã xác nhận';
  return STATUS_META[normalizeStatus(status)].label;
};

const avatarGradient = (name: string): { from: string; to: string } => {
  const palettes = [
    { from: '#3b2f1f', to: '#c9a96e' },
    { from: '#2a2f3f', to: '#7892d0' },
    { from: '#2b4434', to: '#7cb68c' },
    { from: '#452a3a', to: '#d78ec0' },
  ];
  const seed = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palettes[seed % palettes.length];
};

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const grad = avatarGradient(name);

  return (
    <div
      className="rounded-full flex items-center justify-center text-white text-xs font-semibold"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)`,
      }}
    >
      {initials || 'KH'}
    </div>
  );
}

function surfaceStyle(borderStrong = false): CSSProperties {
  return {
    background: COLORS.surface,
    border: `1px solid ${borderStrong ? COLORS.borderStrong : COLORS.border}`,
    borderRadius: 14,
  };
}

const createLocalId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyAssignment = (serviceId = 0): AssignmentItem => ({
  id: createLocalId(),
  appointmentDetailId: undefined,
  personKey: 'MAIN',
  serviceId,
  staffId: null,
});

const emptyForm = (defaultDate: string, defaultServiceId = 0, defaultTime = ''): AppointmentForm => ({
  customerName: '',
  customerPhone: '',
  companions: [],
  assignments: defaultServiceId ? [createEmptyAssignment(defaultServiceId)] : [],
  date: defaultDate,
  time: defaultTime,
  note: '',
  status: 'PENDING',
});

export default function AppointmentsManager() {
  const todayISO = toISODate(new Date());
  const dateBounds = useMemo(() => getBookingDateBounds(), []);

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AppointmentRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const initialSlots = useMemo(() => generateBookingSlots(dateBounds.minDate), [dateBounds.minDate]);
  const [form, setForm] = useState<AppointmentForm>(() => emptyForm(dateBounds.minDate, 0, initialSlots[0] || ''));
  const [staffByService, setStaffByService] = useState<Record<number, StaffOptionItem[]>>({});
  const [loadingStaffServices, setLoadingStaffServices] = useState<number[]>([]);

  const availableTimeSlots = useMemo(() => generateBookingSlots(form.date), [form.date]);

  const servicesById = useMemo(() => new Map(services.map((s) => [s.ma_san_pham, s])), [services]);

  const getServiceName = (serviceId?: number | null): string => {
    if (!serviceId) return '—';
    return servicesById.get(serviceId)?.ten_san_pham || `DV #${serviceId}`;
  };

  const getServicePrice = (serviceId?: number | null): number | null => {
    if (!serviceId) return null;
    const service = servicesById.get(serviceId);
    if (!service?.bang_gias || service.bang_gias.length === 0) return null;
    const price = Number(service.bang_gias[0]?.gia);
    return Number.isFinite(price) ? price : null;
  };

  const staffNameOf = (staff: StaffOptionItem): string =>
    String(staff.ho_ten || '').trim() || `NV #${staff.ma_nhan_vien}`;

  const fetchStaffOptionsForService = async (serviceId: number, date?: string, time?: string): Promise<void> => {
    if (!serviceId) return;
    if (loadingStaffServices.includes(serviceId)) return;

    console.log(`[Diagnostic] Fetching staff for service ${serviceId} at ${date} ${time}`);
    setLoadingStaffServices((prev) => [...prev, serviceId]);
    try {
      const res = await staffApi.availableForService(serviceId, date, time);
      console.log(`[Diagnostic] API response for service ${serviceId}:`, res.data);
      if (!res.success || !Array.isArray(res.data)) {
        throw new Error(res.message || 'Không thể tải danh sách nhân viên theo dịch vụ');
      }

      const rows = (res.data as any[])
        .map((row) => ({
          ma_nhan_vien: Number(row.ma_nhan_vien),
          ho_ten: row.ho_ten || null,
          chuc_vu: row.chuc_vu || null,
        }))
        .filter((row) => Number.isFinite(row.ma_nhan_vien) && row.ma_nhan_vien > 0) as StaffOptionItem[];

      // Sync form.assignments: if a selected staff is no longer available, clear them
      setForm((prev) => {
        let changed = false;
        const nextAssignments = prev.assignments.map((assignment) => {
          if (assignment.serviceId === serviceId && assignment.staffId) {
            const isStillAvailable = rows.some((s) => s.ma_nhan_vien === assignment.staffId);
            if (!isStillAvailable) {
              console.warn(`[Diagnostic] Staff ${assignment.staffId} is no longer available for service ${serviceId}. Clearing selection.`);
              changed = true;
              return { ...assignment, staffId: null };
            }
          }
          return assignment;
        });
        
        if (!changed) return prev;
        return { ...prev, assignments: nextAssignments };
      });

      setStaffByService((prev) => ({
        ...prev,
        [serviceId]: rows,
      }));
    } catch (err: any) {
      alert(err?.message || 'Không thể tải danh sách nhân viên cho dịch vụ đã chọn');
    } finally {
      setLoadingStaffServices((prev) => prev.filter((item) => item !== serviceId));
    }
  };

  const getAppointmentServiceNames = (item: AppointmentRecord): string[] => {
    const details = Array.isArray(item.chi_tiets) ? item.chi_tiets : [];
    if (details.length === 0) return ['—'];

    const names = details.map((detail) => {
      if (detail.ten_san_pham) return detail.ten_san_pham;
      return getServiceName(detail.ma_san_pham);
    });

    return [...new Set(names)];
  };

  const getAppointmentStaffName = (item: AppointmentRecord): string => {
    const details = Array.isArray(item.chi_tiets) ? item.chi_tiets : [];
    const names = details
      .map((detail) => {
        if (detail.ho_ten_nhan_vien) return detail.ho_ten_nhan_vien;
        if (detail.ma_nhan_vien) return `NV #${detail.ma_nhan_vien}`;
        return null;
      })
      .filter(Boolean) as string[];

    if (names.length === 0) return 'Chưa phân công';
    return [...new Set(names)].join(', ');
  };

  const getAppointmentDuration = (item: AppointmentRecord): number | null => {
    const details = Array.isArray(item.chi_tiets) ? item.chi_tiets : [];
    if (details.length === 0) return null;

    let total = 0;
    let hasDuration = false;

    details.forEach((detail) => {
      const catalogDuration = Number(servicesById.get(detail.ma_san_pham)?.thoi_luong);
      if (Number.isFinite(catalogDuration) && catalogDuration > 0) {
        total += catalogDuration;
        hasDuration = true;
        return;
      }

      const byTime = durationMinutes(detail.gio_bat_dau, detail.gio_ket_thuc);
      if (byTime !== null) {
        total += byTime;
        hasDuration = true;
      }
    });

    return hasDuration ? total : null;
  };

  const fetchAllAppointments = async (): Promise<AppointmentRecord[]> => {
    const rows: AppointmentRecord[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const res = await appointmentsApi.list(page, FETCH_PAGE_SIZE);
      if (!res.success) {
        throw new Error(res.message || 'Không thể tải danh sách lịch hẹn');
      }

      if (Array.isArray(res.data)) {
        rows.push(...(res.data as AppointmentRecord[]));
      }

      totalPages = res.meta?.total_pages || 1;
      page += 1;
    } while (page <= totalPages);

    return rows;
  };

  const fetchAllServices = async (): Promise<ServiceItem[]> => {
    const rows: ServiceItem[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const res = await productsApi.list(page, FETCH_PAGE_SIZE, undefined, undefined, 'SERVICE');
      if (!res.success) {
        throw new Error(res.message || 'Không thể tải danh sách dịch vụ');
      }

      if (Array.isArray(res.data)) {
        rows.push(...(res.data as ServiceItem[]));
      }

      totalPages = res.meta?.total_pages || 1;
      page += 1;
    } while (page <= totalPages);

    return rows;
  };

  const loadData = async (withLoading = true) => {
    if (withLoading) setLoading(true);
    setError('');

    try {
      const [appointmentRows, serviceRows] = await Promise.all([
        fetchAllAppointments(),
        fetchAllServices(),
      ]);

      setAppointments(appointmentRows);
      setServices(serviceRows);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Không thể tải dữ liệu lịch hẹn từ hệ thống');
    } finally {
      if (withLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const assignmentServiceIdsKey = useMemo(
    () => form.assignments.map((a) => a.serviceId).sort().join(','),
    [form.assignments],
  );

  useEffect(() => {
    if (!isPanelOpen) return;
    const serviceIds = Array.from(
      new Set(
        form.assignments
          .map((item) => Number(item.serviceId))
          .filter((value: number) => Number.isFinite(value) && value > 0),
      ),
    ) as number[];
    serviceIds.forEach((serviceId) => {
      void fetchStaffOptionsForService(serviceId, form.date, toTimeApi(form.time));
    });
  }, [isPanelOpen, assignmentServiceIdsKey, form.date, form.time]);

  // Remove the redundant clear cache effect to prevent flickering and loops
  /*
  useEffect(() => {
    setStaffByService({});
  }, [form.date, form.time]);
  */

  useEffect(() => {
    if (!isPanelOpen) return;
    if (!availableTimeSlots.includes(form.time)) {
      setForm((prev) => ({
        ...prev,
        time: availableTimeSlots[0] || '',
      }));
    }
  }, [isPanelOpen, availableTimeSlots, form.time]);

  const todayAppointments = useMemo(
    () => appointments.filter((item) => item.ngay_hen === todayISO),
    [appointments, todayISO],
  );

  const quickStats = useMemo(() => {
    const total = todayAppointments.length;
    const completed = todayAppointments.filter((a) => normalizeStatus(a.trang_thai) === 'COMPLETED').length;
    const pending = todayAppointments.filter((a) => normalizeStatus(a.trang_thai) === 'PENDING').length;
    const cancelled = todayAppointments.filter((a) => normalizeStatus(a.trang_thai) === 'CANCELLED').length;
    return { total, completed, pending, cancelled };
  }, [todayAppointments]);

  const appointmentDateSet = useMemo(
    () => new Set(appointments.map((item) => String(item.ngay_hen).slice(0, 10))),
    [appointments],
  );

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekDay = (firstDay.getDay() + 6) % 7;

    const cells: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    for (let index = 0; index < 42; index += 1) {
      const dayOffset = index - firstWeekDay + 1;
      const date = new Date(year, month, dayOffset);
      const isCurrentMonth = dayOffset >= 1 && dayOffset <= daysInMonth;
      cells.push({ date, isCurrentMonth });
    }

    return cells;
  }, [calendarMonth]);

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const weekStart = startOfWeekMonday(now);
    const weekEnd = addDays(weekStart, 6);

    return appointments
      .filter((row) => {
        const rowDate = new Date(`${String(row.ngay_hen).slice(0, 10)}T00:00:00`);

        const matchesPeriod = (() => {
          if (periodFilter === 'TODAY') return row.ngay_hen === todayISO;
          if (periodFilter === 'WEEK') return rowDate >= weekStart && rowDate <= weekEnd;
          if (periodFilter === 'MONTH') {
            return rowDate.getFullYear() === now.getFullYear() && rowDate.getMonth() === now.getMonth();
          }
          return true;
        })();

        const matchesDate = selectedDate ? String(row.ngay_hen).slice(0, 10) === selectedDate : true;
        const matchesStatus = statusFilter === 'ALL' ? true : normalizeStatus(row.trang_thai) === statusFilter;

        const serviceText = getAppointmentServiceNames(row).join(' ');
        const searchText = `${row.ho_ten_khach || ''} ${row.ma_khach_hang || ''} ${serviceText}`.toLowerCase();
        const matchesSearch = query ? searchText.includes(query) : true;

        return matchesPeriod && matchesDate && matchesStatus && matchesSearch;
      })
      .sort((a, b) => toDateTimeValue(b.ngay_hen, b.gio_bat_dau) - toDateTimeValue(a.ngay_hen, a.gio_bat_dau));
  }, [appointments, periodFilter, statusFilter, searchQuery, selectedDate, todayISO]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [periodFilter, statusFilter, searchQuery, selectedDate]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedAppointments = useMemo(() => {
    const from = (currentPage - 1) * PAGE_SIZE;
    return filteredAppointments.slice(from, from + PAGE_SIZE);
  }, [filteredAppointments, currentPage]);

  const visibleRangeStart = filteredAppointments.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const visibleRangeEnd = Math.min(currentPage * PAGE_SIZE, filteredAppointments.length);

  const openCreatePanel = () => {
    setEditingItem(null);
    const defaultServiceId = services[0]?.ma_san_pham || 0;
    const defaultDate = selectedDate && isDateWithinBookingWindow(selectedDate) ? selectedDate : dateBounds.minDate;
    const slots = generateBookingSlots(defaultDate);
    setForm(emptyForm(defaultDate, defaultServiceId, slots[0] || ''));
    setIsPanelOpen(true);
    if (defaultServiceId) {
      void fetchStaffOptionsForService(defaultServiceId);
    }
  };

  const openEditPanel = (item: AppointmentRecord) => {
    setEditingItem(item);
    
    // Map existing guests to local form IDs
    const companionMap: Record<number, string> = {};
    const companionFormItems = (item.khach_di_kems || []).map((guest) => {
      const localId = createLocalId();
      companionMap[guest.ma_khach_di_kem] = localId;
      return {
        id: localId,
        name: guest.ho_ten || '',
        phone: guest.so_dien_thoai || '',
        note: guest.ghi_chu || '',
      };
    });

    setForm({
      customerName: item.ho_ten_khach || `KH #${item.ma_khach_hang}`,
      customerPhone: item.so_dien_thoai_khach || '',
      companions: companionFormItems,
      assignments: (item.chi_tiets || []).map((detail) => {
        let personKey = 'MAIN';
        if (detail.ma_khach_di_kem && companionMap[detail.ma_khach_di_kem]) {
          personKey = `COMPANION:${companionMap[detail.ma_khach_di_kem]}`;
        }
        
        return {
          id: createLocalId(),
          appointmentDetailId: detail.ma_chi_tiet,
          personKey,
          serviceId: detail.ma_san_pham,
          staffId: detail.ma_nhan_vien ? Number(detail.ma_nhan_vien) : null,
        };
      }),
      date: String(item.ngay_hen).slice(0, 10),
      time: toTimeInput(item.gio_bat_dau),
      note: item.ghi_chu || '',
      status: item.trang_thai || 'PENDING',
    });
    setIsPanelOpen(true);

    const serviceIds = Array.from(new Set((item.chi_tiets || []).map((detail) => Number(detail.ma_san_pham)).filter(Boolean)));
    serviceIds.forEach((serviceId) => {
      void fetchStaffOptionsForService(serviceId);
    });
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const addCompanion = () => {
    setForm((prev) => ({
      ...prev,
      companions: [
        ...prev.companions,
        {
          id: createLocalId(),
          name: '',
          phone: '',
          note: '',
        },
      ],
    }));
  };

  const updateCompanion = (id: string, key: keyof Omit<CompanionFormItem, 'id'>, value: string) => {
    setForm((prev) => ({
      ...prev,
      companions: prev.companions.map((companion) =>
        companion.id === id ? { ...companion, [key]: value } : companion,
      ),
    }));
  };

  const removeCompanion = (id: string) => {
    setForm((prev) => ({
      ...prev,
      companions: prev.companions.filter((companion) => companion.id !== id),
      assignments: prev.assignments.filter((assignment) => assignment.personKey !== `COMPANION:${id}`),
    }));
  };

  const addAssignment = () => {
    if (services.length === 0) {
      alert('Chưa có dịch vụ nào trong hệ thống');
      return;
    }

    const defaultServiceId = services[0].ma_san_pham;
    setForm((prev) => ({
      ...prev,
      assignments: [...prev.assignments, createEmptyAssignment(defaultServiceId)],
    }));
    void fetchStaffOptionsForService(defaultServiceId);
  };

  const updateAssignment = (id: string, updater: (current: AssignmentItem) => AssignmentItem) => {
    setForm((prev) => ({
      ...prev,
      assignments: prev.assignments.map((assignment) =>
        assignment.id === id ? updater(assignment) : assignment,
      ),
    }));
  };

  const removeAssignment = (id: string) => {
    setForm((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((assignment) => assignment.id !== id),
    }));
  };

  const personOptions = useMemo(
    () => [
      { key: 'MAIN', label: 'Khách chính' },
      ...form.companions.map((companion) => ({
        key: `COMPANION:${companion.id}`,
        label: companion.name.trim() ? companion.name.trim() : 'Khách đi kèm',
      })),
    ],
    [form.companions],
  );

  const saveAppointment = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      if (!isDateWithinBookingWindow(form.date)) {
        alert('Ngày hẹn chỉ được chọn từ hôm nay đến tối đa 1 tuần.');
        return;
      }
      if (!isValidBookingSlot(form.date, form.time)) {
        alert('Khung giờ hẹn không hợp lệ. Vui lòng chọn lại slot 30 phút.');
        return;
      }

      const activeAssignments = form.assignments.filter((item) => item.serviceId);
      if (activeAssignments.length === 0) {
        alert('Vui lòng thêm ít nhất 1 dòng dịch vụ.');
        return;
      }

      const cleanCompanions = form.companions
        .map((item) => ({ ...item, name: item.name.trim() }))
        .filter((item) => item.name);

      if (cleanCompanions.length !== form.companions.length) {
        alert('Vui lòng nhập tên đầy đủ cho tất cả khách đi kèm.');
        return;
      }

      const companionIndexMap = new Map<string, number>();
      cleanCompanions.forEach((item, idx) => {
        companionIndexMap.set(item.id, idx);
      });

      // Validation: staff conflict per person
      const staffByPerson = new Map<number, string>();
      for (const item of activeAssignments) {
        if (!item.staffId) {
          alert('Vui lòng chọn nhân viên cho từng dịch vụ.');
          return;
        }
        const existingPersonKey = staffByPerson.get(item.staffId);
        if (existingPersonKey && existingPersonKey !== item.personKey) {
          alert('Cùng một lịch hẹn, không thể phân công cùng nhân viên cho 2 khách khác nhau.');
          return;
        }
        staffByPerson.set(item.staffId, item.personKey);
      }

      // Map to API payloads
      const chi_tiets = activeAssignments.map((item) => {
        const payload: any = {
          ma_san_pham: item.serviceId,
          ma_nhan_vien: item.staffId,
        };
        // If editing existing detail
        if (item.appointmentDetailId) {
          payload.ma_chi_tiet = item.appointmentDetailId;
        }
        // Link to guest
        if (item.personKey.startsWith('COMPANION:')) {
          const companionId = item.personKey.replace('COMPANION:', '');
          const index = companionIndexMap.get(companionId);
          if (index !== undefined) {
            payload.chi_so_khach_di_kem = index;
          }
        }
        return payload;
      });

      const commonPayload = {
        ngay_hen: form.date,
        gio_bat_dau: toTimeApi(form.time),
        ghi_chu: form.note || undefined,
        khach_di_kems: cleanCompanions.map((item) => ({
          ho_ten: item.name,
          ghi_chu: item.note || undefined,
        })),
        chi_tiets,
      };

      if (editingItem) {
        const updatePayload = {
          ...commonPayload,
          trang_thai: form.status,
          // If customer phone is edited
          so_dien_thoai_khach: form.customerPhone.trim() || undefined,
        };

        const res = await appointmentsApi.update(editingItem.ma_lich_hen, updatePayload);
        if (!res.success) {
          throw new Error(res.message || 'Không thể cập nhật lịch hẹn');
        }

        closePanel();
        await loadData(false);
        const invoiceId = (res.data as any)?.ma_hoa_don;
        if (String(form.status).toUpperCase() === 'COMPLETED' && invoiceId) {
          alert(`Cập nhật thành công. Đã chuyển lịch hẹn sang hóa đơn #${invoiceId}.`);
        } else {
          alert('Cập nhật lịch hẹn thành công');
        }
      } else {
        // Create new
        if (!form.customerName.trim() || !form.customerPhone.trim()) {
          alert('Vui lòng điền tên và số điện thoại khách hàng.');
          return;
        }

        const createPayload = {
          ...commonPayload,
          ho_ten: form.customerName.trim(),
          so_dien_thoai: form.customerPhone.trim(),
        };

        const res = await appointmentsApi.createPublic(createPayload);
        if (!res.success) {
          throw new Error(res.message || 'Không thể tạo lịch hẹn');
        }

        closePanel();
        await loadData(false);
        alert('Tạo lịch hẹn thành công');
      }
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi lưu lịch hẹn');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmAppointment = async (item: AppointmentRecord) => {
    const normalized = normalizeStatus(item.trang_thai);
    let nextStatus: string | null = null;

    if (normalized === 'PENDING') nextStatus = 'IN_PROGRESS';
    if (normalized === 'IN_PROGRESS') nextStatus = 'COMPLETED';
    if (!nextStatus) return;

    try {
      const res = await appointmentsApi.update(item.ma_lich_hen, { trang_thai: nextStatus });
      if (!res.success) {
        throw new Error(res.message || 'Không thể cập nhật trạng thái');
      }

      setAppointments((prev) =>
        prev.map((row) =>
          row.ma_lich_hen === item.ma_lich_hen
            ? { ...row, trang_thai: nextStatus as string }
            : row,
        ),
      );

      const invoiceId = (res.data as any)?.ma_hoa_don;
      if (nextStatus === 'COMPLETED' && invoiceId) {
        alert(`Lịch hẹn đã hoàn thành và đã chuyển sang hóa đơn #${invoiceId}.`);
      }
    } catch (err: any) {
      alert(err?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  const cancelAppointment = async (id: number) => {
    const accepted = window.confirm('Bạn có chắc muốn hủy lịch hẹn này?');
    if (!accepted) return;

    try {
      const res = await appointmentsApi.cancel(id);
      if (!res.success) {
        throw new Error(res.message || 'Không thể hủy lịch hẹn');
      }

      setAppointments((prev) =>
        prev.map((row) => (row.ma_lich_hen === id ? { ...row, trang_thai: 'CANCELLED' } : row)),
      );
    } catch (err: any) {
      alert(err?.message || 'Hủy lịch hẹn thất bại');
    }
  };

  const exportExcel = () => {
    const rows = filteredAppointments.map((item) => {
      const servicesText = getAppointmentServiceNames(item).join(' | ');
      const duration = getAppointmentDuration(item);

      return [
        item.ma_lich_hen,
        item.ho_ten_khach || `KH #${item.ma_khach_hang}`,
        '',
        servicesText,
        getAppointmentStaffName(item),
        formatDateVN(item.ngay_hen),
        formatTime(item.gio_bat_dau),
        duration ? `${duration}` : '',
        statusLabel(item.trang_thai),
        item.ghi_chu || '',
      ];
    });

    const headers = ['ID', 'Khách hàng', 'SĐT', 'Dịch vụ', 'Nhân viên', 'Ngày hẹn', 'Giờ', 'Thời lượng (phút)', 'Trạng thái', 'Ghi chú'];
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lich-hen-spa-${todayISO}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="admin-animate-in space-y-5" style={{ background: COLORS.bg, color: COLORS.textMain, fontFamily: 'inherit' }}>
      <div className="rounded-2xl p-5" style={surfaceStyle(true)}>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div className="space-y-4 flex-1">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'inherit', color: COLORS.textHeading }}>
                Quản lý Lịch hẹn
              </h1>
              <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
                {todayAppointments.length} lịch hẹn hôm nay
              </p>
              {error && (
                <p className="text-sm mt-2" style={{ color: COLORS.danger }}>
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PERIOD_FILTERS.map((filter) => {
                const active = periodFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    onClick={() => {
                      setPeriodFilter(filter.key);
                      setSelectedDate(null);
                    }}
                    className="px-3.5 py-1.5 rounded-full text-sm border transition-colors"
                    style={
                      active
                        ? {
                            background: 'var(--admin-sidebar-link-active-bg)',
                            color: COLORS.accent,
                            borderColor: 'rgba(16, 185, 129, 0.35)',
                            fontWeight: 600,
                          }
                        : {
                            background: COLORS.inputBg,
                            color: COLORS.textMuted,
                            borderColor: COLORS.border,
                          }
                    }
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="px-3 py-2 rounded-lg border text-sm outline-none"
                style={{
                  background: COLORS.inputBg,
                  borderColor: COLORS.border,
                  color: COLORS.textMain,
                }}
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border min-w-[300px]"
                style={{ background: COLORS.inputBg, borderColor: COLORS.border }}
              >
                <Search size={16} style={{ color: COLORS.textMuted }} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm theo tên khách hoặc dịch vụ"
                  className="bg-transparent outline-none text-sm w-full"
                  style={{ color: COLORS.textMain }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={openCreatePanel}
              className="admin-btn admin-btn-primary px-4 py-2.5 text-sm font-semibold"
            >
              <Plus size={16} /> ＋ Tạo lịch hẹn
            </button>
            <button
              onClick={exportExcel}
              className="admin-btn admin-btn-secondary px-4 py-2.5 text-sm font-semibold"
            >
              <Download size={16} /> Xuất Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
        <div className="rounded-2xl p-4" style={surfaceStyle()}>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="p-1.5 rounded-md border"
              style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
            >
              <ChevronLeft size={15} />
            </button>
            <h3 className="text-base capitalize font-semibold" style={{ fontFamily: 'inherit', color: COLORS.textHeading }}>
              {calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="p-1.5 rounded-md border"
              style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-semibold py-1" style={{ color: COLORS.textMuted }}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell, index) => {
              const iso = toISODate(cell.date);
              const isToday = iso === todayISO;
              const isSelected = selectedDate === iso;
              const hasAppointments = appointmentDateSet.has(iso);

              return (
                <button
                  key={`${iso}-${index}`}
                  onClick={() => {
                    setSelectedDate((prev) => (prev === iso ? null : iso));
                    setPeriodFilter('ALL');
                  }}
                  className="relative h-9 rounded-md text-sm transition-colors"
                  style={{
                    background: isSelected ? COLORS.accentSoft : 'transparent',
                    color: cell.isCurrentMonth ? COLORS.textMain : COLORS.textMuted,
                    opacity: cell.isCurrentMonth ? 1 : 0.55,
                    border: `1px solid ${isToday ? COLORS.accent : 'transparent'}`,
                  }}
                >
                  {cell.date.getDate()}
                  {hasAppointments && (
                    <span
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ background: COLORS.accent }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="mt-3 text-xs underline"
              style={{ color: COLORS.accent }}
            >
              Bỏ lọc ngày {formatDateVN(selectedDate)}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-xl p-4" style={surfaceStyle()}>
            <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
              Tổng hôm nay
            </p>
            <p className="text-2xl font-semibold mt-1">{quickStats.total}</p>
          </div>

          <div className="rounded-xl p-4" style={surfaceStyle()}>
            <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.accent }}>
              Hoàn thành
            </p>
            <p className="text-2xl font-semibold mt-1" style={{ color: COLORS.accent }}>
              {quickStats.completed}
            </p>
          </div>

          <div className="rounded-xl p-4" style={surfaceStyle()}>
            <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.warning }}>
              Đang chờ
            </p>
            <p className="text-2xl font-semibold mt-1" style={{ color: COLORS.warning }}>
              {quickStats.pending}
            </p>
          </div>

          <div className="rounded-xl p-4" style={surfaceStyle()}>
            <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.danger }}>
              Đã hủy
            </p>
            <p className="text-2xl font-semibold mt-1" style={{ color: COLORS.danger }}>
              {quickStats.cancelled}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={surfaceStyle()}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1220px] border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase" style={{ color: COLORS.textMuted, background: COLORS.tableHeaderBg }}>
                <th className="py-3.5 px-3.5"># ID</th>
                <th className="py-3.5 px-3.5">Khách hàng</th>
                <th className="py-3.5 px-3.5">Dịch vụ</th>
                <th className="py-3.5 px-3.5">Nhân viên phụ trách</th>
                <th className="py-3.5 px-3.5">Ngày hẹn</th>
                <th className="py-3.5 px-3.5">Giờ</th>
                <th className="py-3.5 px-3.5">Thời lượng</th>
                <th className="py-3.5 px-3.5">Trạng thái</th>
                <th className="py-3.5 px-3.5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="inline-flex items-center gap-2" style={{ color: COLORS.textMuted }}>
                      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLORS.accent, borderTopColor: 'transparent' }} />
                      Đang tải dữ liệu...
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAppointments.map((item) => {
                  const normalizedStatus = normalizeStatus(item.trang_thai);
                  const statusMeta = STATUS_META[normalizedStatus];
                  const isCancelled = normalizedStatus === 'CANCELLED';
                  const serviceNames = getAppointmentServiceNames(item);
                  const duration = getAppointmentDuration(item);

                  return (
                    <tr
                      key={item.ma_lich_hen}
                      className="group border-t"
                      style={{ borderColor: COLORS.borderSoft }}
                    >
                      <td
                        className="py-3.5 px-3.5 border-l-2 border-transparent transition-colors group-hover:border-[var(--admin-accent)]"
                        style={{ color: COLORS.textMain }}
                      >
                        #{item.ma_lich_hen}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={item.ho_ten_khach || `KH ${item.ma_khach_hang}`} />
                          <div>
                            <p className="text-sm" style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
                              {item.ho_ten_khach || `Khách #${item.ma_khach_hang}`}
                            </p>
                            <p className="text-xs" style={{ color: COLORS.textMuted }}>
                              Mã KH: {item.ma_khach_hang}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-sm" style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
                        <div className="space-y-0.5">
                          {serviceNames.map((name) => (
                            <p key={`${item.ma_lich_hen}-${name}`}>{name}</p>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-sm">{getAppointmentStaffName(item)}</td>
                      <td className="py-3.5 px-3.5 text-sm">{formatDateVN(item.ngay_hen)}</td>
                      <td className="py-3.5 px-3.5 text-sm">{formatTime(item.gio_bat_dau)}</td>
                      <td className="py-3.5 px-3.5 text-sm">{duration ? `${duration} phút` : '--'}</td>
                      <td className="py-3.5 px-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${statusMeta.pulse ? 'animate-pulse' : ''}`}
                          style={{
                            background: statusMeta.bg,
                            borderColor: statusMeta.border,
                            color: statusMeta.text,
                            textDecoration: isCancelled ? 'line-through' : 'none',
                          }}
                        >
                          {statusLabel(item.trang_thai)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => openEditPanel(item)}
                            className="w-8 h-8 rounded-md border inline-flex items-center justify-center"
                            style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
                            title="Xem / sửa"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => confirmAppointment(item)}
                            disabled={normalizedStatus === 'COMPLETED' || normalizedStatus === 'CANCELLED'}
                            className="w-8 h-8 rounded-md border inline-flex items-center justify-center disabled:opacity-40"
                            style={{ borderColor: 'rgba(59, 130, 246, 0.35)', color: COLORS.info }}
                            title="Xác nhận"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={() => cancelAppointment(item.ma_lich_hen)}
                            disabled={normalizedStatus === 'COMPLETED' || normalizedStatus === 'CANCELLED'}
                            className="w-8 h-8 rounded-md border inline-flex items-center justify-center disabled:opacity-40"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.35)', color: COLORS.danger }}
                            title="Hủy"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {!loading && paginatedAppointments.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-2" style={{ color: COLORS.textMuted }}>
                      <CalendarDays size={36} />
                      <p className="text-sm">Không có lịch hẹn nào</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          className="px-4 py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          style={{ borderColor: COLORS.borderSoft }}
        >
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            Hiển thị {visibleRangeStart}–{visibleRangeEnd} trong {filteredAppointments.length} lịch hẹn
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-40"
              style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
            >
              Trước
            </button>
            <span className="px-3 py-1.5 text-sm rounded-md" style={{ background: COLORS.accentSoft, color: COLORS.accent }}>
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-40"
              style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {isPanelOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={closePanel} />
          <aside
            className="absolute right-0 top-0 h-full w-[460px] max-w-[95vw] border-l px-5 py-5 overflow-y-auto admin-slide-in-right"
            style={{
              background: 'var(--admin-sidebar)',
              borderColor: COLORS.borderStrong,
              color: COLORS.textMain,
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'inherit', color: COLORS.textHeading }}>
                {editingItem ? `Sửa lịch hẹn #${editingItem.ma_lich_hen}` : 'Tạo lịch hẹn'}
              </h2>
              <button onClick={closePanel} className="p-1.5 rounded-md border" style={{ borderColor: COLORS.border, color: COLORS.textMuted }}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {!editingItem ? (
                <>
                  <div>
                    <label className="text-sm block mb-1.5" style={{ color: COLORS.textMuted }}>
                      Tên khách hàng *
                    </label>
                    <input
                      value={form.customerName}
                      onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
                      placeholder="Nhập tên khách hàng"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                    />
                  </div>

                  <div>
                    <label className="text-sm block mb-1.5" style={{ color: COLORS.textMuted }}>
                      Số điện thoại *
                    </label>
                    <input
                      value={form.customerPhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
                      placeholder="Ví dụ: 0901234567"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm block" style={{ color: COLORS.textMuted }}>
                        Khách đi kèm
                      </label>
                      <button
                        type="button"
                        onClick={addCompanion}
                        className="text-xs"
                        style={{ color: COLORS.accent }}
                      >
                        + Thêm người
                      </button>
                    </div>

                    <div className="space-y-2">
                      {form.companions.length === 0 && (
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>
                          Không có khách đi kèm.
                        </p>
                      )}
                      {form.companions.map((companion) => (
                        <div key={companion.id} className="grid grid-cols-[1fr_auto] gap-2">
                          <input
                            value={companion.name}
                            onChange={(event) => updateCompanion(companion.id, 'name', event.target.value)}
                            placeholder="Tên khách đi kèm"
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                          />
                          <button
                            type="button"
                            onClick={() => removeCompanion(companion.id)}
                            className="w-9 h-9 rounded-md border inline-flex items-center justify-center"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.35)', color: COLORS.danger }}
                            title="Xóa khách đi kèm"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm block" style={{ color: COLORS.textMuted }}>
                        Phân công dịch vụ theo từng người *
                      </label>
                      <button type="button" onClick={addAssignment} className="text-xs" style={{ color: COLORS.accent }}>
                        + Thêm dòng dịch vụ
                      </button>
                    </div>

                    <div className="space-y-2">
                      {form.assignments.map((assignment) => {
                        const eligibleStaff = assignment.serviceId ? (staffByService[assignment.serviceId] || []) : [];
                        const loadingStaff = assignment.serviceId && loadingStaffServices.includes(assignment.serviceId);
                        const staffTakenByOtherPerson = new Set(
                          form.assignments
                            .filter(
                              (item) =>
                                item.id !== assignment.id &&
                                item.personKey !== assignment.personKey &&
                                Boolean(item.staffId),
                            )
                            .map((item) => Number(item.staffId)),
                        );

                        return (
                          <div key={assignment.id} className="rounded-lg border p-2.5 space-y-2" style={{ borderColor: COLORS.border }}>
                            <div className="grid grid-cols-1 gap-2">
                              <select
                                value={assignment.personKey}
                                onChange={(event) =>
                                  updateAssignment(assignment.id, (current) => ({ ...current, personKey: event.target.value }))
                                }
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                              >
                                {personOptions.map((option) => (
                                  <option key={option.key} value={option.key}>{option.label}</option>
                                ))}
                              </select>

                              <select
                                value={assignment.serviceId}
                                onChange={(event) => {
                                  const nextServiceId = Number(event.target.value);
                                  updateAssignment(assignment.id, (current) => ({
                                    ...current,
                                    serviceId: nextServiceId,
                                    staffId: null,
                                  }));
                                  if (nextServiceId) {
                                    void fetchStaffOptionsForService(nextServiceId);
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                              >
                                {services.length === 0 ? (
                                  <option value={0}>Chưa có dịch vụ</option>
                                ) : (
                                  services.map((service) => {
                                    const price = getServicePrice(service.ma_san_pham);
                                    return (
                                      <option key={service.ma_san_pham} value={service.ma_san_pham}>
                                        {service.ten_san_pham}{price ? ` — ${formatMoney(price)}` : ''}
                                      </option>
                                    );
                                  })
                                )}
                              </select>

                              <select
                                value={assignment.staffId || 0}
                                onChange={(event) =>
                                  updateAssignment(assignment.id, (current) => ({
                                    ...current,
                                    staffId: Number(event.target.value) || null,
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                              >
                                <option value={0}>
                                  {loadingStaff ? 'Đang tải nhân viên...' : 'Chọn nhân viên phù hợp'}
                                </option>
                                {eligibleStaff.map((staff) => (
                                  <option
                                    key={`${assignment.id}-staff-${staff.ma_nhan_vien}`}
                                    value={staff.ma_nhan_vien}
                                    disabled={
                                      staffTakenByOtherPerson.has(staff.ma_nhan_vien) &&
                                      staff.ma_nhan_vien !== assignment.staffId
                                    }
                                  >
                                    {staffNameOf(staff)}{staff.chuc_vu ? ` • ${staff.chuc_vu}` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeAssignment(assignment.id)}
                                className="w-9 h-9 rounded-md border inline-flex items-center justify-center"
                                style={{ borderColor: 'rgba(239, 68, 68, 0.35)', color: COLORS.danger }}
                                title="Xóa dòng dịch vụ"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {form.assignments.length === 0 && (
                      <p className="text-xs mt-2" style={{ color: COLORS.warning }}>
                        Cần ít nhất 1 dòng dịch vụ để tạo lịch hẹn.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm block mb-1.5" style={{ color: COLORS.textMuted }}>
                      Tên khách hàng
                    </label>
                    <div className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: COLORS.border, background: COLORS.inputBg }}>
                      {form.customerName}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm block mb-1.5" style={{ color: COLORS.textMuted }}>
                      Số điện thoại
                    </label>
                    <input
                      value={form.customerPhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
                      placeholder="Số điện thoại"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm block" style={{ color: COLORS.textMuted }}>
                        Khách đi kèm
                      </label>
                      <button type="button" onClick={addCompanion} className="text-xs" style={{ color: COLORS.accent }}>
                        + Thêm người
                      </button>
                    </div>
                    <div className="space-y-2">
                      {form.companions.length === 0 && (
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>Không có khách đi kèm.</p>
                      )}
                      {form.companions.map((companion) => (
                        <div key={companion.id} className="grid grid-cols-[1fr_auto] gap-2">
                          <input
                            value={companion.name}
                            onChange={(event) => updateCompanion(companion.id, 'name', event.target.value)}
                            placeholder="Tên khách"
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                          />
                          <button
                            type="button"
                            onClick={() => removeCompanion(companion.id)}
                            className="w-9 h-9 rounded-md border inline-flex items-center justify-center"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.35)', color: COLORS.danger }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm block" style={{ color: COLORS.textMuted }}>
                        Phân công dịch vụ *
                      </label>
                      <button type="button" onClick={addAssignment} className="text-xs" style={{ color: COLORS.accent }}>
                        + Thêm dòng dịch vụ
                      </button>
                    </div>
                    <div className="space-y-2">
                      {form.assignments.map((assignment) => {
                        const eligibleStaff = assignment.serviceId ? (staffByService[assignment.serviceId] || []) : [];
                        const loadingStaff = assignment.serviceId && loadingStaffServices.includes(assignment.serviceId);
                        
                        return (
                          <div key={assignment.id} className="rounded-lg border p-2.5 space-y-2" style={{ borderColor: COLORS.border }}>
                            <div className="grid grid-cols-1 gap-2">
                              <select
                                value={assignment.personKey}
                                onChange={(event) =>
                                  updateAssignment(assignment.id, (current) => ({ ...current, personKey: event.target.value }))
                                }
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                              >
                                {personOptions.map((option) => (
                                  <option key={option.key} value={option.key}>{option.label}</option>
                                ))}
                              </select>

                              <select
                                value={assignment.serviceId}
                                onChange={(event) => {
                                  const nextServiceId = Number(event.target.value);
                                  updateAssignment(assignment.id, (current) => ({
                                    ...current,
                                    serviceId: nextServiceId,
                                    staffId: null,
                                  }));
                                  if (nextServiceId) {
                                    void fetchStaffOptionsForService(nextServiceId, form.date, toTimeApi(form.time));
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                              >
                                {services.map((service) => (
                                  <option key={service.ma_san_pham} value={service.ma_san_pham}>
                                    {service.ten_san_pham}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={assignment.staffId || 0}
                                onChange={(event) =>
                                  updateAssignment(assignment.id, (current) => ({
                                    ...current,
                                    staffId: Number(event.target.value) || null,
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                              >
                                <option value={0}>
                                  {loadingStaff ? 'Đang tải nhân viên...' : 'Chọn nhân viên phù hợp'}
                                </option>
                                {eligibleStaff.map((staff) => (
                                  <option key={staff.ma_nhan_vien} value={staff.ma_nhan_vien}>
                                    {staffNameOf(staff)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeAssignment(assignment.id)}
                                className="w-9 h-9 rounded-md border inline-flex items-center justify-center"
                                style={{ borderColor: 'rgba(239, 68, 68, 0.35)', color: COLORS.danger }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-sm block mb-1.5" style={{ color: COLORS.textMuted }}>
                    Ngày hẹn *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                    min={dateBounds.minDate}
                    max={dateBounds.maxDate}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                  />
                </div>
                <div>
                  <label className="text-sm block mb-1.5" style={{ color: COLORS.textMuted }}>
                    Giờ bắt đầu *
                  </label>
                  <select
                    value={form.time}
                    onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                  >
                    <option value="" disabled>Chọn giờ</option>
                    {availableTimeSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  {availableTimeSlots.length === 0 && (
                    <p className="text-xs mt-1" style={{ color: COLORS.warning }}>
                      Không còn slot khả dụng cho ngày đã chọn.
                    </p>
                  )}
                </div>
              </div>

              {editingItem && (
                <div>
                  <label className="text-sm block mb-1.5" style={{ color: COLORS.textMuted }}>
                    Trạng thái
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                  >
                    {UPDATE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm block mb-1.5" style={{ color: COLORS.textMuted }}>
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: COLORS.border, background: COLORS.inputBg }}
                  placeholder="Yêu cầu thêm của khách hàng..."
                />
              </div>
            </div>

            <div className="pt-5 mt-6 border-t flex items-center justify-end gap-2.5" style={{ borderColor: COLORS.border }}>
              <button
                onClick={closePanel}
                className="admin-btn admin-btn-secondary"
                disabled={isSaving}
              >
                Hủy bỏ
              </button>
              <button
                onClick={saveAppointment}
                className="admin-btn admin-btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu lịch hẹn'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
