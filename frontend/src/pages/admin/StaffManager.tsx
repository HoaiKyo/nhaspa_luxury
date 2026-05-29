import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  LayoutGrid,
  List,
  Mail,
  PenSquare,
  Phone,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Upload,
  UserRound,
  X,
} from 'lucide-react';

import '../../specialization.css';

import {
  appointmentsApi,
  categoriesApi,
  leavesApi,
  productsApi,
  schedulesApi,
  shiftsApi,
  staffApi,
  usersApi,
} from '../../api/admin.api';
import { apiClient } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

type ViewMode = 'LIST' | 'SCHEDULE';
type ShiftSlot = 'MORNING' | 'EVENING';
type DetailTab = 'PROFILE' | 'SCHEDULE';

const STAFF_TITLE_OPTIONS = ['admin', 'lễ tân', 'nhân viên'] as const;
type StaffTitle = typeof STAFF_TITLE_OPTIONS[number];

interface StaffExtraMeta {
  cccd: string;
  specializations: string[];
  salaryBase: number;
  defaultShifts: ShiftSlot[];
}

interface AppointmentSlotItem {
  appointmentId: number;
  staffId: number;
  date: string;
  slot: ShiftSlot;
  startTime: string;
  endTime: string;
  customerName: string;
  serviceName: string;
  status: string;
}

interface StaffProfile {
  id: number;
  userId: number;
  code: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  startDate: string;
  active: boolean;
  avatarUrl: string;
  initials: string;
  cccd: string;
  specializations: string[];
  salaryBase: number;
  defaultShifts: ShiftSlot[];
  shiftsWeek: number;
  appointmentsWeek: number;
  onShiftNow: boolean;
  hasShiftToday: boolean;
  onLeaveToday: boolean;
}

interface StaffFormState {
  staffId: number | null;
  userId: number | null;
  fullName: string;
  title: string;
  department: string;
  phone: string;
  email: string;
  cccd: string;
  specializations: string[];
  startDate: string;
  salaryBase: number;
  staffCode: string;
  defaultShifts: ShiftSlot[];
  active: boolean;
  avatarUrl: string;
  avatarFile: File | null;
  avatarPreview: string;
}

interface ScheduleCellDetail {
  staff: StaffProfile;
  day: Date;
  slots: Array<{
    slot: ShiftSlot;
    hasShift: boolean;
    shiftNames: string[];
    appointments: AppointmentSlotItem[];
  }>;
}

const STAFF_META_STORAGE_KEY = 'spa_staff_meta_v2'; // Updated to v2 to clear old garbage data
const SHIFT_SLOT_ORDER: ShiftSlot[] = ['MORNING', 'EVENING'];
// Removed SPECIALIZATION_LIBRARY as we use real data now

const SLOT_META: Record<ShiftSlot, { label: string; short: string; range: [number, number]; className: string }> = {
  MORNING: { label: 'Ca sáng', short: 'Sáng', range: [8 * 60, 16 * 60], className: 'morning' },
  EVENING: { label: 'Ca tối', short: 'Tối', range: [14 * 60, 22 * 60], className: 'evening' },
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').trim();
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toDateKey = (value: any): string => {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const d = toDateSafe(value);
  if (!d) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseTimeToMinutes = (value: any): number | null => {
  if (!value) return null;
  const raw = String(value);

  if (/^\d{2}:\d{2}/.test(raw)) {
    const [h, m] = raw.split(':');
    const hh = Number(h);
    const mm = Number(m);
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      return hh * 60 + mm;
    }
  }

  const date = toDateSafe(value);
  if (!date) return null;
  return date.getHours() * 60 + date.getMinutes();
};

const formatDate = (value: any): string => {
  const d = toDateSafe(value);
  if (!d) return '—';
  return d.toLocaleDateString('vi-VN');
};

const formatDateShort = (value: Date): string =>
  `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}`;

const formatDateYMD = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCurrency = (value: number): string =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`;

const formatNumber = (value: number): string => new Intl.NumberFormat('vi-VN').format(Math.round(value));

const initialsOf = (value: string): string =>
  (value || 'NV')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'NV';

const toAbsoluteMediaUrl = (value: any): string => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${API_ORIGIN}${raw}`;
  return `${API_ORIGIN}/${raw}`;
};

const startOfWeekMonday = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const isBetweenDates = (targetKey: string, from: Date, to: Date): boolean => {
  if (!targetKey) return false;
  const t = toDateSafe(targetKey);
  if (!t) return false;
  const value = t.getTime();
  return value >= from.getTime() && value <= to.getTime();
};

const hoursToText = (minutes: number | null): string => {
  if (minutes === null) return '--:--';
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
};

const getSlotsFromRange = (startMinutes: number | null, endMinutes: number | null): ShiftSlot[] => {
  if (startMinutes === null) return ['MORNING'];
  const finalEnd = endMinutes !== null && endMinutes > startMinutes ? endMinutes : startMinutes + 120;
  if (startMinutes < 14 * 60 && finalEnd <= 16 * 60) return ['MORNING'];
  if (startMinutes >= 14 * 60) return ['EVENING'];
  return startMinutes < 14 * 60 ? ['MORNING'] : ['EVENING'];
};

const getSlotsFromShift = (shift: any): ShiftSlot[] => {
  const name = String(shift?.ten_ca || '').toLowerCase();
  if (name.includes('sáng')) return ['MORNING'];
  if (name.includes('chiều') || name.includes('tối')) return ['EVENING'];
  if (name.includes('cả ngày')) return ['MORNING', 'EVENING'];

  const start = parseTimeToMinutes(shift?.gio_bat_dau);
  const end = parseTimeToMinutes(shift?.gio_ket_thuc);
  return getSlotsFromRange(start, end);
};

const averageOf = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const normalizeStaffTitle = (value: any): StaffTitle => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!normalized) return 'nhân viên';
  if (normalized.includes('admin')) return 'admin';
  if (
    normalized.includes('lễ tân') ||
    normalized.includes('le tan') ||
    normalized.includes('reception')
  ) {
    return 'lễ tân';
  }
  return 'nhân viên';
};

const extractStaffRoleId = (roles: any[]): number | null => {
  const role = roles.find((item) => String(item.ten_vai_tro || '').toUpperCase() === 'STAFF');
  return role ? toNumber(role.ma_vai_tro) : null;
};

const loadMetaStorage = (): Record<number, StaffExtraMeta> => {
  try {
    const raw = localStorage.getItem(STAFF_META_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const result: Record<number, StaffExtraMeta> = {};

    Object.entries(parsed).forEach(([key, value]) => {
      const id = toNumber(key);
      if (!id || typeof value !== 'object' || !value) return;
      const row = value as StaffExtraMeta;

      result[id] = {
        cccd: String(row.cccd || ''),
        specializations: Array.isArray(row.specializations)
          ? row.specializations.map((item) => String(item || '')).filter(Boolean)
          : [],
        salaryBase: Math.max(0, toNumber(row.salaryBase)),
        defaultShifts: Array.isArray(row.defaultShifts)
          ? row.defaultShifts.filter((item) => SHIFT_SLOT_ORDER.includes(item as ShiftSlot)).slice(0, 2) as ShiftSlot[]
          : [],
      };
    });

    return result;
  } catch {
    return {};
  }
};

const buildDefaultMeta = (staffId: number, title: string): StaffExtraMeta => {
  const normalized = String(title || '').toLowerCase();

  const baselineSalary =
    normalized.includes('trưởng') ? 18000000 :
    normalized.includes('senior') ? 15000000 :
    normalized.includes('chuyên') ? 13000000 :
    10000000;

  const specializations: string[] = [];

  const shiftSeed = staffId % 3;
  const defaultShifts: ShiftSlot[] =
    shiftSeed === 0 ? ['MORNING', 'EVENING'] :
    shiftSeed === 1 ? ['MORNING'] :
    ['EVENING'];

  return {
    cccd: '',
    specializations,
    salaryBase: baselineSalary,
    defaultShifts,
  };
};

const createEmptyForm = (): StaffFormState => ({
  staffId: null,
  userId: null,
  fullName: '',
  title: 'nhân viên',
  department: 'Spa Service',
  phone: '',
  email: '',
  cccd: '',
  specializations: [],
  startDate: '',
  salaryBase: 10000000,
  staffCode: '',
  defaultShifts: ['MORNING', 'EVENING'],
  active: true,
  avatarUrl: '',
  avatarFile: null,
  avatarPreview: '',
});

const fetchAllPages = async (
  fetcher: (page: number, pageSize: number) => Promise<any>,
  pageSize = 120,
): Promise<any[]> => {
  const rows: any[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await fetcher(page, pageSize);
    if (!res?.success) {
      throw new Error(res?.message || 'Không thể tải dữ liệu');
    }
    rows.push(...(Array.isArray(res.data) ? res.data : []));
    totalPages = Math.max(1, toNumber(res?.meta?.total_pages || 1));
    page += 1;
  } while (page <= totalPages);

  return rows;
};

const buildSampleDataset = () => {
  const names = [
    'Nguyễn Hồng Nhung',
    'Trần Minh Tú',
    'Lê Gia Bảo',
    'Phạm Mai Khanh',
    'Võ Thanh Tâm',
    'Đặng Yến Nhi',
    'Bùi Hoàng Vũ',
    'Ngô Khánh Ngân',
    'Phan Đức Huy',
    'Hoàng Lan Chi',
  ];

  const titles: StaffTitle[] = ['nhân viên', 'nhân viên', 'lễ tân', 'admin'];

  const now = new Date();
  const weekStart = startOfWeekMonday(now);

  const staffRows = names.map((name, idx) => ({
    ma_nhan_vien: 400 + idx,
    ma_nguoi_dung: 1100 + idx,
    ma_nhan_vien_code: `NV${String(400 + idx).padStart(3, '0')}`,
    chuc_vu: titles[idx % titles.length],
    phong_ban: idx % 2 === 0 ? 'Wellness' : 'Beauty',
    ngay_vao_lam: formatDateYMD(addDays(now, -(420 - idx * 18))),
    trang_thai: idx !== 8,
    ho_ten: name,
    email: `staff.${idx + 1}@nhaspa.vn`,
    so_dien_thoai: `09${String(12300000 + idx * 531).slice(-8)}`,
  }));

  const usersRows = staffRows.map((row) => ({
    ma_nguoi_dung: row.ma_nguoi_dung,
    ho_ten: row.ho_ten,
    email: row.email,
    so_dien_thoai: row.so_dien_thoai,
    anh_dai_dien: '',
  }));

  const shiftsRows = [
    { ma_ca: 1, ten_ca: 'Ca sáng', gio_bat_dau: '08:00:00', gio_ket_thuc: '16:00:00', trang_thai: true },
    { ma_ca: 2, ten_ca: 'Ca tối', gio_bat_dau: '14:00:00', gio_ket_thuc: '22:00:00', trang_thai: true },
  ];

  const schedulesRows: any[] = [];
  const appointmentsRows: any[] = [];
  const leavesRows: any[] = [];

  staffRows.forEach((staff, index) => {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = addDays(weekStart, dayIndex);
      const dateKey = formatDateYMD(day);

      const primaryShift = ((index + dayIndex) % 2) + 1;
      schedulesRows.push({
        ma_lich: Number(`${staff.ma_nhan_vien}${dayIndex}1`),
        ma_nhan_vien: staff.ma_nhan_vien,
        ma_ca: primaryShift,
        ngay_lam_viec: dateKey,
        ten_ca: shiftsRows[primaryShift - 1].ten_ca,
      });

      if ((index + dayIndex) % 4 === 0) {
        const secondShift = primaryShift === 2 ? 1 : 2;
        schedulesRows.push({
          ma_lich: Number(`${staff.ma_nhan_vien}${dayIndex}2`),
          ma_nhan_vien: staff.ma_nhan_vien,
          ma_ca: secondShift,
          ngay_lam_viec: dateKey,
          ten_ca: shiftsRows[secondShift - 1].ten_ca,
        });
      }

      const appointmentCount = 1 + ((index + dayIndex) % 3);
      for (let i = 0; i < appointmentCount; i += 1) {
        const startHour = 9 + ((i + index + dayIndex) % 10);

        appointmentsRows.push({
          ma_lich_hen: Number(`${staff.ma_nhan_vien}${dayIndex}${i}5`),
          ma_khach_hang: 900 + i,
          ho_ten_khach: `Khách ${i + 1 + dayIndex}`,
          ngay_hen: dateKey,
          gio_bat_dau: `${String(startHour).padStart(2, '0')}:00:00`,
          gio_ket_thuc: `${String(Math.min(startHour + 1, 22)).padStart(2, '0')}:00:00`,
          trang_thai: (i + dayIndex) % 6 === 0 ? 'PENDING' : 'COMPLETED',
          chi_tiets: [
            {
              ma_chi_tiet: Number(`${staff.ma_nhan_vien}${dayIndex}${i}`),
              ma_san_pham: 1 + ((i + index) % 8),
              ten_san_pham:
                (i + index) % 3 === 0 ? 'Massage đá nóng 90p' :
                (i + index) % 3 === 1 ? 'Chăm sóc da chuyên sâu' :
                'Detox body thư giãn',
              ma_nhan_vien: staff.ma_nhan_vien,
              gio_bat_dau: `${String(startHour).padStart(2, '0')}:00:00`,
              gio_ket_thuc: `${String(Math.min(startHour + 1, 22)).padStart(2, '0')}:00:00`,
            },
          ],
        });

      }
    }
  });

  leavesRows.push({
    ma_nghi_phep: 1,
    ma_nhan_vien: staffRows[2].ma_nhan_vien,
    ngay_bat_dau: formatDateYMD(addDays(now, -1)),
    ngay_ket_thuc: formatDateYMD(addDays(now, 1)),
    ly_do: 'Nghỉ phép cá nhân',
    trang_thai: 'APPROVED',
  });

  leavesRows.push({
    ma_nghi_phep: 2,
    ma_nhan_vien: staffRows[6].ma_nhan_vien,
    ngay_bat_dau: formatDateYMD(addDays(now, 2)),
    ngay_ket_thuc: formatDateYMD(addDays(now, 3)),
    ly_do: 'Nghỉ gia đình',
    trang_thai: 'APPROVED',
  });

  return {
    staffRows,
    usersRows,
    schedulesRows,
    shiftsRows,
    appointmentsRows,
    leavesRows,
  };
};

export default function StaffManager() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.vai_tros?.includes('ADMIN'));

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [usingSample, setUsingSample] = useState(false);

  const [staffRows, setStaffRows] = useState<any[]>([]);
  const [usersRows, setUsersRows] = useState<any[]>([]);
  const [shiftsRows, setShiftsRows] = useState<any[]>([]);
  const [schedulesRows, setSchedulesRows] = useState<any[]>([]);
  const [appointmentsRows, setAppointmentsRows] = useState<any[]>([]);
  const [leavesRows, setLeavesRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);

  const [staffRoleId, setStaffRoleId] = useState<number | null>(null);

  const [metaMap, setMetaMap] = useState<Record<number, StaffExtraMeta>>(() => loadMetaStorage());

  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [searchTerm, setSearchTerm] = useState('');

  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeekMonday(new Date()));
  const [listPage, setListPage] = useState(1);

  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('PROFILE');
  const [detailMonth, setDetailMonth] = useState<Date>(() => startOfMonth(new Date()));

  const [selectedCell, setSelectedCell] = useState<ScheduleCellDetail | null>(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [staffForm, setStaffForm] = useState<StaffFormState>(() => createEmptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const weekStartDate = useMemo(() => startOfWeekMonday(weekAnchor), [weekAnchor]);
  const weekEndDate = useMemo(() => addDays(weekStartDate, 6), [weekStartDate]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, idx) => addDays(weekStartDate, idx)),
    [weekStartDate],
  );

  useEffect(() => {
    localStorage.setItem(STAFF_META_STORAGE_KEY, JSON.stringify(metaMap));
  }, [metaMap]);

  const loadData = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const scheduleFrom = formatDateYMD(addDays(new Date(), -210));
      const scheduleTo = formatDateYMD(addDays(new Date(), 120));

      const [staffData, appointmentData, scheduleRes, shiftRes, leaveRes, categoriesRes, servicesRes] = await Promise.all([
        fetchAllPages((page, pageSize) => staffApi.list(page, pageSize)),
        fetchAllPages((page, pageSize) => appointmentsApi.list(page, pageSize)),
        schedulesApi.list(undefined, scheduleFrom, scheduleTo),
        shiftsApi.list(),
        leavesApi.list(undefined, 'APPROVED'),
        categoriesApi.list(),
        fetchAllPages((page, pageSize) => productsApi.list(page, pageSize, undefined, undefined, 'SERVICE'))
      ]);

      let usersData: any[] = [];

      if (isAdmin) {
        const [usersRes, rolesRes] = await Promise.all([
          fetchAllPages((page, pageSize) => usersApi.list(page, pageSize)),
          usersApi.roles(),
        ]);

        usersData = usersRes;
        if (rolesRes.success && Array.isArray(rolesRes.data)) {
          setStaffRoleId(extractStaffRoleId(rolesRes.data));
        }
      }

      if (staffData.length === 0) {
        const sample = buildSampleDataset();
        setStaffRows(sample.staffRows);
        setUsersRows(sample.usersRows);
        setShiftsRows(sample.shiftsRows);
        setSchedulesRows(sample.schedulesRows);
        setAppointmentsRows(sample.appointmentsRows);
        setLeavesRows(sample.leavesRows);
        setUsingSample(true);
        setError('Chưa có dữ liệu nhân viên thực tế, đang hiển thị dữ liệu mẫu để vận hành trang quản trị.');
      } else {
        setStaffRows(staffData);
        setUsersRows(usersData);
        setShiftsRows(shiftRes?.success ? shiftRes.data || [] : []);
        setSchedulesRows(scheduleRes?.success ? scheduleRes.data || [] : []);
        setAppointmentsRows(appointmentData);
        setLeavesRows(leaveRes?.success ? leaveRes.data || [] : []);
        setCategories(categoriesRes?.success ? categoriesRes.data || [] : []);
        setAllServices(servicesRes);
        setUsingSample(false);
      }
    } catch (err: any) {
      const sample = buildSampleDataset();
      setStaffRows(sample.staffRows);
      setUsersRows(sample.usersRows);
      setShiftsRows(sample.shiftsRows);
      setSchedulesRows(sample.schedulesRows);
      setAppointmentsRows(sample.appointmentsRows);
      setLeavesRows(sample.leavesRows);
      setUsingSample(true);
      setError((err?.message || 'Không thể tải dữ liệu nhân viên') + '. Đã chuyển sang dữ liệu mẫu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setMetaMap((prev) => {
      const next: Record<number, StaffExtraMeta> = { ...prev };
      let changed = false;

      const validServiceNames = new Set(allServices.map(s => s.ten_san_pham));

      staffRows.forEach((staff) => {
        const staffId = toNumber(staff.ma_nhan_vien);
        if (!staffId) return;
        
        const apiSpecs = Array.isArray(staff.specializations) ? staff.specializations : [];

        if (!next[staffId]) {
          next[staffId] = buildDefaultMeta(staffId, staff.chuc_vu || '');
          if (apiSpecs.length > 0) next[staffId].specializations = apiSpecs;
          changed = true;
        } else {
          // Merge or prioritize API specs if they exist and differ from local
          const currentSpecs = next[staffId].specializations;
          
          if (apiSpecs.length > 0) {
            // Check if different
            const isDifferent = apiSpecs.length !== currentSpecs.length || apiSpecs.some(s => !currentSpecs.includes(s));
            if (isDifferent) {
              next[staffId].specializations = apiSpecs;
              changed = true;
            }
          }

          if (allServices.length > 0) {
            const filteredSpecs = next[staffId].specializations.filter(s => validServiceNames.has(s));
            if (filteredSpecs.length !== next[staffId].specializations.length) {
              next[staffId].specializations = filteredSpecs;
              changed = true;
            }
          }
        }
      });

      return changed ? next : prev;
    });
  }, [staffRows, allServices]);

  const shiftsMap = useMemo(() => {
    const map = new Map<number, any>();
    shiftsRows.forEach((shift) => {
      const id = toNumber(shift.ma_ca);
      if (id) map.set(id, shift);
    });
    return map;
  }, [shiftsRows]);

  const usersById = useMemo(() => {
    const map = new Map<number, any>();
    usersRows.forEach((row) => {
      const id = toNumber(row.ma_nguoi_dung);
      if (id) map.set(id, row);
    });
    return map;
  }, [usersRows]);

  const leaveTodayMap = useMemo(() => {
    const map = new Set<number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    leavesRows.forEach((leave) => {
      if (String(leave.trang_thai || '').toUpperCase() !== 'APPROVED') return;

      const staffId = toNumber(leave.ma_nhan_vien);
      if (!staffId) return;

      const from = toDateSafe(leave.ngay_bat_dau);
      const to = toDateSafe(leave.ngay_ket_thuc);
      if (!from || !to) return;

      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);

      if (today.getTime() >= from.getTime() && today.getTime() <= to.getTime()) {
        map.add(staffId);
      }
    });

    return map;
  }, [leavesRows]);

  const analytics = useMemo(() => {
    const scheduleSlotMap = new Map<string, Set<string>>();
    const shiftCountWeekMap = new Map<number, number>();
    const hasShiftToday = new Set<number>();
    const onShiftNow = new Set<number>();

    const appointmentSlotMap = new Map<string, AppointmentSlotItem[]>();
    const appointmentCountWeekMap = new Map<number, number>();
    const serviceCountByStaff = new Map<number, Map<string, number>>();

    const weekStart = weekStartDate.getTime();
    const weekEnd = addDays(weekStartDate, 6).getTime() + 86399999;

    const todayKey = toDateKey(new Date());
    const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    schedulesRows.forEach((schedule) => {
      const staffId = toNumber(schedule.ma_nhan_vien);
      if (!staffId) return;

      const dateKey = toDateKey(schedule.ngay_lam_viec);
      if (!dateKey) return;

      const shiftInfo = shiftsMap.get(toNumber(schedule.ma_ca)) || schedule;
      const slotList = getSlotsFromShift(shiftInfo);
      const shiftName = String(shiftInfo.ten_ca || schedule.ten_ca || `Ca #${schedule.ma_ca}`);

      slotList.forEach((slot) => {
        const key = `${staffId}|${dateKey}|${slot}`;
        if (!scheduleSlotMap.has(key)) scheduleSlotMap.set(key, new Set<string>());
        scheduleSlotMap.get(key)!.add(shiftName);
      });

      const dateObj = toDateSafe(dateKey);
      if (dateObj) {
        const t = dateObj.getTime();
        if (t >= weekStart && t <= weekEnd) {
          shiftCountWeekMap.set(staffId, (shiftCountWeekMap.get(staffId) || 0) + 1);
        }
      }

      if (dateKey === todayKey) {
        hasShiftToday.add(staffId);
        const shiftStart = parseTimeToMinutes(shiftInfo.gio_bat_dau);
        const shiftEnd = parseTimeToMinutes(shiftInfo.gio_ket_thuc);

        if (shiftStart !== null) {
          const end = shiftEnd !== null && shiftEnd > shiftStart ? shiftEnd : shiftStart + 120;
          if (currentMinutes >= shiftStart && currentMinutes < end) {
            onShiftNow.add(staffId);
          }
        }
      }
    });

    appointmentsRows.forEach((appointment) => {
      const dateKey = toDateKey(appointment.ngay_hen);
      if (!dateKey) return;

      const details = Array.isArray(appointment.chi_tiets) ? appointment.chi_tiets : [];
      const customerName = appointment.ho_ten_khach || `KH #${appointment.ma_khach_hang || '—'}`;
      const status = String(appointment.trang_thai || '').toUpperCase();

      details.forEach((detail: any, index: number) => {
        const staffId = toNumber(detail.ma_nhan_vien);
        if (!staffId) return;

        const serviceName = detail.ten_san_pham || `Dịch vụ #${detail.ma_san_pham || index + 1}`;

        const start = parseTimeToMinutes(detail.gio_bat_dau || appointment.gio_bat_dau);
        const end = parseTimeToMinutes(detail.gio_ket_thuc || appointment.gio_ket_thuc);
        const slots = getSlotsFromRange(start, end);

        const startTime = hoursToText(start);
        const endTime = hoursToText(end !== null ? end : (start !== null ? start + 90 : null));

        slots.forEach((slot) => {
          const key = `${staffId}|${dateKey}|${slot}`;
          if (!appointmentSlotMap.has(key)) appointmentSlotMap.set(key, []);
          appointmentSlotMap.get(key)!.push({
            appointmentId: toNumber(appointment.ma_lich_hen),
            staffId,
            date: dateKey,
            slot,
            startTime,
            endTime,
            customerName,
            serviceName,
            status,
          });
        });

        const serviceMap = serviceCountByStaff.get(staffId) || new Map<string, number>();
        serviceMap.set(serviceName, (serviceMap.get(serviceName) || 0) + 1);
        serviceCountByStaff.set(staffId, serviceMap);

        const appointmentDate = toDateSafe(dateKey);
        if (appointmentDate) {
          const t = appointmentDate.getTime();
          if (t >= weekStart && t <= weekEnd && status !== 'CANCELLED' && status !== 'NO_SHOW') {
            appointmentCountWeekMap.set(staffId, (appointmentCountWeekMap.get(staffId) || 0) + 1);
          }
        }
      });
    });

    return {
      scheduleSlotMap,
      shiftCountWeekMap,
      hasShiftToday,
      onShiftNow,
      appointmentSlotMap,
      appointmentCountWeekMap,
      serviceCountByStaff,
    };
  }, [
    schedulesRows,
    shiftsMap,
    appointmentsRows,
    weekStartDate,
  ]);

  const staffProfiles = useMemo<StaffProfile[]>(() => {
    return staffRows
      .map((staff) => {
        const id = toNumber(staff.ma_nhan_vien);
        const userId = toNumber(staff.ma_nguoi_dung);
        if (!id || !userId) return null;

        const userInfo = usersById.get(userId) || {};
        const name = staff.ho_ten || userInfo.ho_ten || `Nhân viên #${id}`;

        const meta = metaMap[id] || buildDefaultMeta(id, staff.chuc_vu || '');

        const servicesFromData = Array.from(analytics.serviceCountByStaff.get(id)?.entries() || [])
          .sort((a, b) => b[1] - a[1])
          .map((entry) => entry[0]);

        const specializations =
          meta.specializations.length > 0
            ? [...meta.specializations]
            : (servicesFromData.length > 0 ? servicesFromData : ['Liệu trình tổng quát']);

        const onLeave = leaveTodayMap.has(id);

        return {
          id,
          userId,
          code: staff.ma_nhan_vien_code || `NV${String(id).padStart(3, '0')}`,
          name,
          title: normalizeStaffTitle(staff.chuc_vu),
          department: staff.phong_ban || 'Spa Service',
          email: staff.email || userInfo.email || '—',
          phone: staff.so_dien_thoai || userInfo.so_dien_thoai || '—',
          startDate: staff.ngay_vao_lam || '',
          active: Boolean(staff.trang_thai),
          avatarUrl: toAbsoluteMediaUrl(userInfo.anh_dai_dien),
          initials: initialsOf(name),
          cccd: meta.cccd,
          specializations,
          salaryBase: meta.salaryBase,
          defaultShifts: meta.defaultShifts.length > 0 ? meta.defaultShifts : ['MORNING', 'EVENING'],
          shiftsWeek: analytics.shiftCountWeekMap.get(id) || 0,
          appointmentsWeek: analytics.appointmentCountWeekMap.get(id) || 0,
          onShiftNow: analytics.onShiftNow.has(id) && !onLeave,
          hasShiftToday: analytics.hasShiftToday.has(id),
          onLeaveToday: onLeave,
        } as StaffProfile;
      })
      .filter(Boolean)
      .sort((a: StaffProfile, b: StaffProfile) => {
        if (a.onShiftNow !== b.onShiftNow) return a.onShiftNow ? -1 : 1;
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [staffRows, usersById, metaMap, analytics, leaveTodayMap]);

  const selectedStaff = useMemo(
    () => staffProfiles.find((staff) => staff.id === selectedStaffId) || null,
    [staffProfiles, selectedStaffId],
  );

  const filteredStaff = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return staffProfiles.filter((staff) => {
      if (!keyword) return true;
      return (
        staff.name.toLowerCase().includes(keyword) ||
        staff.title.toLowerCase().includes(keyword) ||
        staff.department.toLowerCase().includes(keyword) ||
        staff.phone.toLowerCase().includes(keyword) ||
        staff.email.toLowerCase().includes(keyword) ||
        staff.code.toLowerCase().includes(keyword)
      );
    });
  }, [staffProfiles, searchTerm]);

  useEffect(() => {
    setListPage(1);
  }, [searchTerm, viewMode]);

  const listPageSize = 10;
  const listTotalPages = Math.max(1, Math.ceil(filteredStaff.length / listPageSize));

  useEffect(() => {
    if (listPage > listTotalPages) {
      setListPage(listTotalPages);
    }
  }, [listPage, listTotalPages]);

  const pagedListStaff = useMemo(() => {
    const start = (listPage - 1) * listPageSize;
    return filteredStaff.slice(start, start + listPageSize);
  }, [filteredStaff, listPage]);

  const scheduleRowsTop10 = useMemo(() => filteredStaff.slice(0, 10), [filteredStaff]);

  const kpis = useMemo(() => {
    const total = staffProfiles.length;
    const workingToday = staffProfiles.filter((staff) => staff.hasShiftToday && !staff.onLeaveToday).length;
    const onShiftNow = staffProfiles.filter((staff) => staff.onShiftNow).length;
    const onLeave = staffProfiles.filter((staff) => staff.onLeaveToday).length;
    const avgShiftsPerWeek = Number(averageOf(staffProfiles.map((staff) => staff.shiftsWeek)).toFixed(1));

    return {
      total,
      workingToday,
      onShiftNow,
      onLeave,
      avgShiftsPerWeek,
    };
  }, [staffProfiles]);

  const openDetailModal = (staffId: number, tab: DetailTab = 'PROFILE') => {
    setSelectedStaffId(staffId);
    setDetailTab(tab);
    setDetailMonth(startOfMonth(new Date()));
  };

  const toggleSpecialization = (value: string) => {
    setStaffForm((prev) => {
      const exists = prev.specializations.includes(value);
      const next = exists
        ? prev.specializations.filter((item) => item !== value)
        : [...prev.specializations, value];
      return { ...prev, specializations: next };
    });
  };

  const toggleDefaultShift = (slot: ShiftSlot) => {
    setStaffForm((prev) => {
      const exists = prev.defaultShifts.includes(slot);
      const next = exists
        ? prev.defaultShifts.filter((item) => item !== slot)
        : [...prev.defaultShifts, slot];
      return { ...prev, defaultShifts: next.length > 0 ? next : [slot] };
    });
  };

  const onAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    setStaffForm((prev) => ({
      ...prev,
      avatarFile: file,
      avatarPreview: file ? URL.createObjectURL(file) : prev.avatarUrl,
    }));
  };

  const openCreateModal = () => {
    setFormError('');
    setStaffForm(createEmptyForm());
    setShowFormModal(true);
  };

  const openEditModal = (staff: StaffProfile) => {
    setFormError('');
    setStaffForm({
      staffId: staff.id,
      userId: staff.userId,
      fullName: staff.name,
      title: staff.title,
      department: staff.department,
      phone: staff.phone === '—' ? '' : staff.phone,
      email: staff.email === '—' ? '' : staff.email,
      cccd: staff.cccd,
      specializations: [...staff.specializations],
      startDate: staff.startDate ? String(staff.startDate).slice(0, 10) : '',
      salaryBase: staff.salaryBase,
      staffCode: staff.code,
      defaultShifts: [...staff.defaultShifts],
      active: staff.active,
      avatarUrl: staff.avatarUrl,
      avatarFile: null,
      avatarPreview: staff.avatarUrl,
    });
    setShowFormModal(true);
  };

  const upsertMeta = (staffId: number, form: StaffFormState) => {
    setMetaMap((prev) => ({
      ...prev,
      [staffId]: {
        cccd: form.cccd.trim(),
        specializations: form.specializations.map((item) => item.trim()).filter(Boolean),
        salaryBase: Math.max(0, toNumber(form.salaryBase)),
        defaultShifts: form.defaultShifts.length > 0 ? [...form.defaultShifts] : ['MORNING'],
      },
    }));
  };

  const uploadAvatarIfNeeded = async (): Promise<string | null> => {
    if (!staffForm.avatarFile) return null;

    const formData = new FormData();
    formData.append('file', staffForm.avatarFile);
    formData.append('loai', 'avatars');

    const response = await apiClient.upload<{ url: string }>('/upload/image', formData);
    if (!response.success || !response.data?.url) {
      throw new Error(response.message || 'Không thể upload ảnh nhân viên');
    }

    return response.data.url;
  };

  const createLocalStaff = (avatarPath: string | null) => {
    const newStaffId = Math.max(0, ...staffRows.map((row) => toNumber(row.ma_nhan_vien))) + 1;
    const newUserId = Math.max(0, ...usersRows.map((row) => toNumber(row.ma_nguoi_dung))) + 1;

    setUsersRows((prev) => [
      {
        ma_nguoi_dung: newUserId,
        ho_ten: staffForm.fullName.trim(),
        email: staffForm.email.trim(),
        so_dien_thoai: staffForm.phone.trim(),
        anh_dai_dien: avatarPath,
      },
      ...prev,
    ]);

    setStaffRows((prev) => [
      {
        ma_nhan_vien: newStaffId,
        ma_nguoi_dung: newUserId,
        ma_nhan_vien_code: staffForm.staffCode.trim() || `NV${String(newStaffId).padStart(3, '0')}`,
        chuc_vu: staffForm.title.trim(),
        phong_ban: staffForm.department.trim(),
        ngay_vao_lam: staffForm.startDate || null,
        trang_thai: staffForm.active,
        ho_ten: staffForm.fullName.trim(),
        email: staffForm.email.trim(),
        so_dien_thoai: staffForm.phone.trim(),
      },
      ...prev,
    ]);

    upsertMeta(newStaffId, staffForm);
  };

  const updateLocalStaff = (avatarPath: string | null) => {
    if (!staffForm.staffId || !staffForm.userId) return;

    setUsersRows((prev) =>
      prev.map((row) =>
        toNumber(row.ma_nguoi_dung) === staffForm.userId
          ? {
              ...row,
              ho_ten: staffForm.fullName.trim(),
              so_dien_thoai: staffForm.phone.trim(),
              anh_dai_dien: avatarPath || row.anh_dai_dien,
            }
          : row,
      ),
    );

    setStaffRows((prev) =>
      prev.map((row) =>
        toNumber(row.ma_nhan_vien) === staffForm.staffId
          ? {
              ...row,
              ma_nhan_vien_code: staffForm.staffCode.trim() || row.ma_nhan_vien_code,
              chuc_vu: staffForm.title.trim(),
              phong_ban: staffForm.department.trim(),
              ngay_vao_lam: staffForm.startDate || row.ngay_vao_lam,
              trang_thai: staffForm.active,
              ho_ten: staffForm.fullName.trim(),
              so_dien_thoai: staffForm.phone.trim(),
            }
          : row,
      ),
    );

    upsertMeta(staffForm.staffId, staffForm);
  };

  const saveStaff = async () => {
    setFormError('');

    if (!staffForm.fullName.trim()) {
      setFormError('Vui lòng nhập họ tên nhân viên.');
      return;
    }

    if (!STAFF_TITLE_OPTIONS.includes(staffForm.title as StaffTitle)) {
      setFormError('Vui lòng chọn chức danh hợp lệ: admin, lễ tân hoặc nhân viên.');
      return;
    }

    if (!staffForm.staffId && !staffForm.email.trim()) {
      setFormError('Vui lòng nhập email để tạo hồ sơ nhân viên mới.');
      return;
    }

    if (staffForm.defaultShifts.length === 0) {
      setFormError('Vui lòng chọn tối thiểu một ca làm mặc định.');
      return;
    }

    setSaving(true);

    try {
      const uploadedAvatarPath = await uploadAvatarIfNeeded();

      if (usingSample || !isAdmin) {
        if (staffForm.staffId) {
          updateLocalStaff(uploadedAvatarPath);
        } else {
          createLocalStaff(uploadedAvatarPath);
        }

        setShowFormModal(false);
        return;
      }

      if (staffForm.staffId && staffForm.userId) {
        const userPayload: any = {
          ho_ten: staffForm.fullName.trim(),
          so_dien_thoai: staffForm.phone.trim() || undefined,
          trang_thai: staffForm.active,
        };

        if (uploadedAvatarPath) {
          userPayload.anh_dai_dien = uploadedAvatarPath;
        }

        const userRes = await usersApi.update(staffForm.userId, userPayload);
        if (!userRes.success) {
          throw new Error(userRes.message || 'Không thể cập nhật thông tin người dùng nhân viên');
        }

        const specIds = staffForm.specializations
          .map(name => allServices.find(s => s.ten_san_pham === name)?.ma_san_pham)
          .filter(Boolean) as number[];

        const staffPayload: any = {
          ma_nhan_vien_code: staffForm.staffCode.trim() || undefined,
          chuc_vu: staffForm.title.trim() || undefined,
          phong_ban: staffForm.department.trim() || undefined,
          ngay_vao_lam: staffForm.startDate || null,
          trang_thai: staffForm.active,
          danh_sach_ma_dich_vu: specIds,
        };

        const staffRes = await staffApi.update(staffForm.staffId, staffPayload);
        if (!staffRes.success) {
          throw new Error(staffRes.message || 'Không thể cập nhật hồ sơ nhân viên');
        }

        upsertMeta(staffForm.staffId, staffForm);
      } else {
        let roleId = staffRoleId;

        if (!roleId) {
          const roleRes = await usersApi.roles();
          if (roleRes.success && Array.isArray(roleRes.data)) {
            roleId = extractStaffRoleId(roleRes.data);
            setStaffRoleId(roleId);
          }
        }

        const createUserPayload: any = {
          ho_ten: staffForm.fullName.trim(),
          email: staffForm.email.trim(),
          mat_khau: 'Spa@123456',
          so_dien_thoai: staffForm.phone.trim() || undefined,
          vai_tro_ids: roleId ? [roleId] : [],
        };

        const createUserRes = await usersApi.create(createUserPayload);
        if (!createUserRes.success) {
          throw new Error(createUserRes.message || 'Không thể tạo user cho nhân viên');
        }

        const newUserId = toNumber(createUserRes.data?.ma_nguoi_dung);
        if (!newUserId) {
          throw new Error('Không lấy được mã user sau khi tạo nhân viên');
        }

        if (uploadedAvatarPath) {
          await usersApi.update(newUserId, { anh_dai_dien: uploadedAvatarPath });
        }

        const specIds = staffForm.specializations
          .map(name => allServices.find(s => s.ten_san_pham === name)?.ma_san_pham)
          .filter(Boolean) as number[];

        const createStaffPayload = {
          ma_nguoi_dung: newUserId,
          ma_nhan_vien_code: staffForm.staffCode.trim() || undefined,
          chuc_vu: staffForm.title.trim() || undefined,
          phong_ban: staffForm.department.trim() || undefined,
          ngay_vao_lam: staffForm.startDate || null,
          danh_sach_ma_dich_vu: specIds,
        };

        const createStaffRes = await staffApi.create(createStaffPayload);
        if (!createStaffRes.success) {
          throw new Error(createStaffRes.message || 'Không thể tạo hồ sơ nhân viên');
        }

        const newStaffId = toNumber(createStaffRes.data?.ma_nhan_vien);
        if (newStaffId) {
          upsertMeta(newStaffId, staffForm);
        }
      }

      setShowFormModal(false);
      await loadData(true);
    } catch (err: any) {
      setFormError(err?.message || 'Không thể lưu thông tin nhân viên');
    } finally {
      setSaving(false);
    }
  };

  const scheduleCellData = (staffId: number, date: Date) => {
    const dateKey = formatDateYMD(date);

    return SHIFT_SLOT_ORDER.map((slot) => {
      const key = `${staffId}|${dateKey}|${slot}`;
      const shiftSet = analytics.scheduleSlotMap.get(key);
      const appointments = analytics.appointmentSlotMap.get(key) || [];

      return {
        slot,
        hasShift: Boolean(shiftSet && shiftSet.size > 0),
        shiftNames: shiftSet ? (Array.from(shiftSet.values()) as string[]) : [],
        appointments,
      };
    });
  };

  const openScheduleCell = (staff: StaffProfile, day: Date) => {
    setSelectedCell({
      staff,
      day,
      slots: scheduleCellData(staff.id, day),
    });
  };

  const monthlyCalendarDays = useMemo(() => {
    const start = startOfMonth(detailMonth);
    const day = (start.getDay() + 6) % 7;
    const gridStart = addDays(start, -day);

    return Array.from({ length: 42 }, (_, idx) => addDays(gridStart, idx));
  }, [detailMonth]);

  if (loading) {
    return (
      <div className="admin-animate-in flex items-center justify-center h-[64vh]">
        <div className="w-10 h-10 border-4 border-amber-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-staffpro-page admin-animate-in space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="admin-staffpro-heading">Spa Staff Management</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button className="admin-btn admin-btn-secondary" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCcw size={15} /> {refreshing ? 'Đang làm mới...' : 'Làm mới'}
          </button>
          {isAdmin && (
            <button className="admin-btn admin-staffpro-btn-gold" onClick={openCreateModal} disabled={!isAdmin && !usingSample}>
              <Plus size={15} /> Thêm nhân viên
            </button>
          )}
        </div>
      </div>

      {error && <p className="admin-staffpro-alert">{error}</p>}


      <section className="admin-card admin-staffpro-toolbar">
        <div className="admin-staffpro-view-toggle">
          <button className={viewMode === 'LIST' ? 'active' : ''} onClick={() => setViewMode('LIST')}>
            <List size={14} /> List
          </button>
          <button className={viewMode === 'SCHEDULE' ? 'active' : ''} onClick={() => setViewMode('SCHEDULE')}>
            <CalendarDays size={14} /> Lịch làm việc
          </button>
        </div>

        <div className="admin-staffpro-search">
          <Search size={16} className="icon" />
          <input
            className="admin-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo tên, mã NV, chức danh, phone..."
          />
        </div>
      </section>

      {viewMode === 'LIST' && (
        <section className="admin-card admin-staffpro-list-card">
          <div className="admin-staffpro-table-wrap">
            <table className="admin-table admin-staffpro-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Tên</th>
                  <th>Chức danh</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Ca làm / tuần</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pagedListStaff.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="admin-empty py-8">Không tìm thấy nhân viên phù hợp.</div>
                    </td>
                  </tr>
                ) : (
                  pagedListStaff.map((staff) => (
                    <tr key={staff.id}>
                      <td>
                        <div className="admin-staffpro-row-avatar">
                          {staff.avatarUrl ? <img src={staff.avatarUrl} alt={staff.name} /> : <span>{staff.initials}</span>}
                        </div>
                      </td>
                      <td>
                        <p className="name">{staff.name}</p>
                        <p className="meta">{staff.code}</p>
                      </td>
                      <td>{staff.title}</td>
                      <td>{staff.phone}</td>
                      <td>{staff.email}</td>
                      <td>{formatNumber(staff.shiftsWeek)}</td>
                      <td>
                        <span className={`admin-staffpro-status ${staff.onShiftNow ? 'on' : staff.onLeaveToday ? 'leave' : 'off'}`}>
                          {staff.onShiftNow ? 'Đang ca' : staff.onLeaveToday ? 'Nghỉ phép' : 'Sẵn sàng'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-staffpro-row-actions">
                          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => openDetailModal(staff.id)}>
                            <Eye size={14} /> Chi tiết
                          </button>
                          {isAdmin && (
                            <button
                              className="admin-btn admin-staffpro-btn-gold admin-btn-sm"
                              onClick={() => openEditModal(staff)}
                              disabled={!isAdmin && !usingSample}
                            >
                              <PenSquare size={14} /> Sửa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {listTotalPages > 1 && (
            <div className="admin-pagination">
              <span>Trang {listPage} / {listTotalPages} ({filteredStaff.length} nhân viên)</span>
              <div className="admin-pagination-btns">
                <button onClick={() => setListPage((prev) => Math.max(1, prev - 1))} disabled={listPage === 1}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, listTotalPages) }, (_, idx) => {
                  let start = Math.max(1, listPage - 2);
                  if (start + 4 > listTotalPages) start = Math.max(1, listTotalPages - 4);
                  const target = start + idx;
                  return (
                    <button key={target} onClick={() => setListPage(target)} className={listPage === target ? 'active' : ''}>
                      {target}
                    </button>
                  );
                })}
                <button onClick={() => setListPage((prev) => Math.min(listTotalPages, prev + 1))} disabled={listPage === listTotalPages}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {viewMode === 'SCHEDULE' && (
        <section className="admin-card admin-staffpro-schedule-card">
          <div className="admin-staffpro-schedule-head">
            <div>
              <h3>Lịch làm việc tuần</h3>
              <p>
                {formatDateShort(weekStartDate)} - {formatDateShort(weekEndDate)}
              </p>
            </div>

            <div className="admin-staffpro-week-actions">
              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setWeekAnchor((prev) => addDays(prev, -7))}>
                <ChevronLeft size={14} /> Tuần trước
              </button>
              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setWeekAnchor(startOfWeekMonday(new Date()))}>
                Tuần này
              </button>
              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setWeekAnchor((prev) => addDays(prev, 7))}>
                Tuần sau <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="admin-staffpro-schedule-wrap">
            <table className="admin-staffpro-schedule-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  {weekDays.map((day) => (
                    <th key={formatDateYMD(day)}>
                      <p>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][(day.getDay() + 6) % 7]}</p>
                      <span>{formatDateShort(day)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleRowsTop10.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="admin-empty py-8">Không có nhân viên để hiển thị lịch tuần.</div>
                    </td>
                  </tr>
                ) : (
                  scheduleRowsTop10.map((staff) => (
                    <tr key={staff.id}>
                      <td className="staff-col">
                        <div className="staff-cell">
                          <div className="avatar">{staff.avatarUrl ? <img src={staff.avatarUrl} alt={staff.name} /> : staff.initials}</div>
                          <div>
                            <p>{staff.name}</p>
                            <span>{staff.title}</span>
                          </div>
                        </div>
                      </td>

                      {weekDays.map((day) => {
                        const slots = scheduleCellData(staff.id, day);

                        return (
                          <td key={`${staff.id}-${formatDateYMD(day)}`}>
                            <button className="cell-btn" onClick={() => openScheduleCell(staff, day)}>
                              {slots.map((slotRow) => (
                                <span
                                  key={`${staff.id}-${formatDateYMD(day)}-${slotRow.slot}`}
                                  className={`slot ${SLOT_META[slotRow.slot].className} ${slotRow.hasShift ? 'active' : ''}`}
                                >
                                  <strong>{SLOT_META[slotRow.slot].short}</strong>
                                  <em>{slotRow.appointments.length} lịch hẹn</em>
                                </span>
                              ))}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedStaff && (
        <div className="admin-modal-overlay" onClick={() => setSelectedStaffId(null)}>
          <div className="admin-modal admin-staffpro-detail-modal admin-modal-animate" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Chi tiết nhân viên</h3>
              <button className="admin-btn-icon" onClick={() => setSelectedStaffId(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body admin-staffpro-detail-body">
              <div className="admin-staffpro-profile-head">
                <div className="avatar-wrap">
                  {selectedStaff.avatarUrl ? (
                    <img src={selectedStaff.avatarUrl} alt={selectedStaff.name} className="avatar-img" />
                  ) : (
                    <div className="avatar-fallback">{selectedStaff.initials}</div>
                  )}
                </div>
                <div className="info">
                  <h4>{selectedStaff.name}</h4>
                  <p>{selectedStaff.title} • {selectedStaff.department}</p>
                  <div className="quick-meta">
                    <span><Phone size={14} /> {selectedStaff.phone}</span>
                    <span><Mail size={14} /> {selectedStaff.email}</span>
                    <span><CalendarDays size={14} /> Vào làm: {formatDate(selectedStaff.startDate)}</span>
                  </div>
                </div>
              </div>

              <div className="admin-staffpro-detail-tabs">
                <button className={detailTab === 'PROFILE' ? 'active' : ''} onClick={() => setDetailTab('PROFILE')}>Profile</button>
                <button className={detailTab === 'SCHEDULE' ? 'active' : ''} onClick={() => setDetailTab('SCHEDULE')}>Lịch làm việc</button>
              </div>

              {detailTab === 'PROFILE' && (
                <div className="admin-staffpro-profile-grid">
                  <div className="card">
                    <p className="label">Mã nhân viên</p>
                    <p className="value">{selectedStaff.code}</p>
                  </div>
                  <div className="card">
                    <p className="label">CCCD</p>
                    <p className="value">{selectedStaff.cccd || 'Chưa cập nhật'}</p>
                  </div>
                  <div className="card">
                    <p className="label">Lương cơ bản</p>
                    <p className="value">{formatCurrency(selectedStaff.salaryBase)}</p>
                  </div>

                  <div className="card full">
                    <p className="label">Chuyên môn</p>
                    <div className="admin-staffpro-tags mt-2">
                      {selectedStaff.specializations.map((item) => (
                        <span key={`detail-tag-${item}`}>{item}</span>
                      ))}
                    </div>
                  </div>

                  <div className="card full">
                    <p className="label">Ca làm mặc định</p>
                    <div className="admin-staffpro-shift-mini">
                      {selectedStaff.defaultShifts.map((slot) => (
                        <span key={slot}>{SLOT_META[slot].label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'SCHEDULE' && (
                <div className="admin-staffpro-monthly-schedule">
                  <div className="head">
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setDetailMonth((prev) => startOfMonth(addMonths(prev, -1)))}>
                      <ChevronLeft size={14} />
                    </button>
                    <strong>
                      Tháng {detailMonth.getMonth() + 1}/{detailMonth.getFullYear()}
                    </strong>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setDetailMonth((prev) => startOfMonth(addMonths(prev, 1)))}>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="calendar-grid">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((name) => (
                      <div key={`weekday-${name}`} className="weekday">{name}</div>
                    ))}

                    {monthlyCalendarDays.map((day) => {
                      const inMonth = day.getMonth() === detailMonth.getMonth();
                      const slots = scheduleCellData(selectedStaff.id, day);
                      const dateKey = formatDateYMD(day);

                      return (
                        <div key={`calendar-${dateKey}`} className={`day-cell ${inMonth ? '' : 'muted'}`}>
                          <p className="date">{day.getDate()}</p>
                          <div className="slots">
                            {slots.map((slot) => (
                              <span key={`${dateKey}-${slot.slot}`} className={`${SLOT_META[slot.slot].className} ${slot.hasShift ? 'active' : ''}`}>
                                {SLOT_META[slot.slot].short}: {slot.appointments.length}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedCell && (
        <div className="admin-modal-overlay" onClick={() => setSelectedCell(null)}>
          <div className="admin-modal admin-staffpro-cell-modal admin-modal-animate" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                Lịch ca • {selectedCell.staff.name} • {formatDate(selectedCell.day)}
              </h3>
              <button className="admin-btn-icon" onClick={() => setSelectedCell(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body space-y-4">
              {selectedCell.slots.map((slot) => (
                <section key={`slot-detail-${slot.slot}`} className="admin-staffpro-slot-block">
                  <div className="head">
                    <h4>
                      {SLOT_META[slot.slot].label}
                    </h4>
                    <span className={slot.hasShift ? 'active' : ''}>
                      {slot.hasShift ? 'Đã phân ca' : 'Chưa phân ca'}
                    </span>
                  </div>

                  {slot.shiftNames.length > 0 && (
                    <p className="shift-names">Ca: {slot.shiftNames.join(', ')}</p>
                  )}

                  {slot.appointments.length === 0 ? (
                    <p className="empty">Không có lịch hẹn trong khung giờ này.</p>
                  ) : (
                    <div className="appointments">
                      {slot.appointments.map((appointment) => (
                        <div key={`${appointment.appointmentId}-${appointment.slot}`} className="appointment-item">
                          <p className="time">{appointment.startTime} - {appointment.endTime}</p>
                          <p className="service">{appointment.serviceName}</p>
                          <p className="meta">{appointment.customerName} • {appointment.status}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setSelectedCell(null)}>
                Đóng
              </button>
              <button className="admin-btn admin-staffpro-btn-gold" onClick={() => {
                openDetailModal(selectedCell.staff.id, 'SCHEDULE');
                setSelectedCell(null);
              }}>
                Xem chi tiết nhân viên
              </button>
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div className="admin-modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="admin-modal admin-staffpro-form-modal admin-modal-animate" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{staffForm.staffId ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}</h3>
              <button className="admin-btn-icon" onClick={() => setShowFormModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body admin-staffpro-form-body">
              {formError && <p className="admin-staffpro-alert">{formError}</p>}

              <div className="admin-staffpro-form-main-grid">
                {/* Cột trái: Avatar và Thông tin cơ bản */}
                <div className="admin-staffpro-info-side">
                  <div className="avatar-upload">
                    <div className="preview">
                      {staffForm.avatarPreview ? (
                        <img src={staffForm.avatarPreview} alt="Preview" />
                      ) : (
                        <span>{initialsOf(staffForm.fullName || 'NV')}</span>
                      )}
                    </div>
                    <label className="admin-btn admin-btn-secondary admin-btn-sm upload-btn">
                      <Upload size={14} /> Upload ảnh
                      <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="admin-label">Họ tên *</label>
                      <input className="admin-input" value={staffForm.fullName} onChange={(event) => setStaffForm((prev) => ({ ...prev, fullName: event.target.value }))} />
                    </div>

                    <div>
                      <label className="admin-label">Chức danh *</label>
                      <select
                        className="admin-select"
                        value={staffForm.title}
                        onChange={(event) => setStaffForm((prev) => ({ ...prev, title: event.target.value }))}
                      >
                        {STAFF_TITLE_OPTIONS.map((title) => (
                          <option key={`title-${title}`} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="admin-label">Phone</label>
                      <input className="admin-input" value={staffForm.phone} onChange={(event) => setStaffForm((prev) => ({ ...prev, phone: event.target.value }))} />
                    </div>

                    <div>
                      <label className="admin-label">Email {staffForm.staffId ? '(chỉ xem)' : '*'}</label>
                      <input
                        className="admin-input"
                        value={staffForm.email}
                        disabled={Boolean(staffForm.staffId)}
                        onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Cột phải: Chuyên môn */}
                <div className="admin-staffpro-specializations-section">
                  <h4 className="admin-label mb-3">Chuyên môn nhân viên (Chọn dịch vụ)</h4>
                  <div className="admin-staffpro-category-groups">
                    {categories.map((cat) => {
                      const catServices = allServices.filter(s => s.ma_danh_muc === cat.ma_danh_muc);
                      if (catServices.length === 0) return null;
                      
                      return (
                        <div key={`cat-group-${cat.ma_danh_muc}`} className="admin-staffpro-cat-group">
                          <h5 className="cat-name">{cat.ten_danh_muc}</h5>
                          <div className="service-list">
                            {catServices.map((service) => {
                              const active = staffForm.specializations.includes(service.ten_san_pham);
                              return (
                                <label key={`spec-${service.ma_san_pham}`} className="service-checkbox-item">
                                  <input
                                    type="checkbox"
                                    checked={active}
                                    onChange={() => toggleSpecialization(service.ten_san_pham)}
                                  />
                                  <span>{service.ten_san_pham}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dàn hàng ngang phía dưới */}
              <div className="admin-staffpro-bottom-grid">
                <div>
                  <label className="admin-label">CCCD</label>
                  <input className="admin-input" value={staffForm.cccd} onChange={(event) => setStaffForm((prev) => ({ ...prev, cccd: event.target.value }))} />
                </div>

                <div>
                  <label className="admin-label">Ngày bắt đầu</label>
                  <input type="date" className="admin-input" value={staffForm.startDate} onChange={(event) => setStaffForm((prev) => ({ ...prev, startDate: event.target.value }))} />
                </div>

                <div>
                  <label className="admin-label">Lương cơ bản</label>
                  <input
                    type="number"
                    min={0}
                    className="admin-input"
                    value={staffForm.salaryBase}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, salaryBase: Math.max(0, toNumber(event.target.value)) }))}
                  />
                </div>

                <div>
                  <label className="admin-label">Mã nhân viên</label>
                  <input className="admin-input" value={staffForm.staffCode} onChange={(event) => setStaffForm((prev) => ({ ...prev, staffCode: event.target.value }))} />
                </div>

                <div className="full">
                  <label className="admin-label">Phòng ban</label>
                  <input className="admin-input" value={staffForm.department} onChange={(event) => setStaffForm((prev) => ({ ...prev, department: event.target.value }))} />
                </div>

                <div className="full">
                  <label className="admin-label">Ca làm mặc định</label>
                  <div className="admin-staffpro-default-shifts flex gap-4 mt-1">
                    {SHIFT_SLOT_ORDER.map((slot) => (
                      <label key={`default-${slot}`} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-amber-400"
                          checked={staffForm.defaultShifts.includes(slot)}
                          onChange={() => toggleDefaultShift(slot)}
                        />
                        <span className="text-sm text-gray-300">{SLOT_META[slot].label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowFormModal(false)} disabled={saving}>
                Hủy
              </button>
              <button className="admin-btn admin-staffpro-btn-gold" onClick={saveStaff} disabled={saving}>
                <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu nhân viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
