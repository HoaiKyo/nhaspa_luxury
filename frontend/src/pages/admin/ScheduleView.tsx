import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Plus,
  RefreshCcw,
  Save,
  X,
} from 'lucide-react';

import {
  appointmentsApi,
  leavesApi,
  schedulesApi,
  shiftsApi,
  staffApi,
} from '../../api/admin.api';
import { useAuth } from '../../contexts/AuthContext';

type ViewMode = 'MONTH' | 'WEEK' | 'DAY';
type SlotPreset = 'MORNING' | 'EVENING';

interface StaffMember {
  id: number;
  code: string;
  name: string;
  shortName: string;
  title: string;
  initials: string;
  active: boolean;
}

interface ShiftItem {
  id: number;
  name: string;
  start: string;
  end: string;
  preset: SlotPreset;
}

interface ScheduleItem {
  id: number;
  staffId: number;
  date: string;
  shiftId: number;
  shiftName: string;
  start: string;
  end: string;
  preset: SlotPreset;
  note: string;
  status: string;
}

interface LeaveItem {
  id: number;
  staffId: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
}

interface AppointmentItem {
  id: number;
  detailId: string;
  staffId: number;
  staffName: string;
  date: string;
  start: string;
  end: string;
  customerName: string;
  serviceName: string;
  status: string;
}

interface ShiftFormState {
  scheduleId: number | null;
  staffId: number;
  date: string;
  preset: SlotPreset;
  start: string;
  end: string;
  note: string;
}

interface TimelineItem {
  type: 'appointment' | 'empty';
  time: string;
  appointment?: AppointmentItem;
}

const PRESET_META: Record<SlotPreset, { label: string; defaultStart: string; defaultEnd: string; badgeClass: string }> = {
  MORNING: { label: 'Sáng', defaultStart: '08:00', defaultEnd: '16:00', badgeClass: 'morning' },
  EVENING: { label: 'Tối', defaultStart: '14:00', defaultEnd: '22:00', badgeClass: 'evening' },
};

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

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
  const d = toDateSafe(value);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseTimeToMinutes = (value: string): number | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const normalizeTime = (value: any, fallback = '08:00'): string => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  const date = toDateSafe(value);
  if (date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  return fallback;
};

const toApiTime = (value: string): string => {
  const clean = normalizeTime(value);
  return `${clean}:00`;
};

const initialsOf = (value: string): string =>
  (value || 'NV')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'NV';

const shortNameOf = (value: string): string => {
  const parts = (value || '').split(' ').filter(Boolean);
  if (parts.length <= 2) return value;
  return parts.slice(-2).join(' ');
};

const formatDate = (value: any): string => {
  const d = toDateSafe(value);
  if (!d) return '—';
  return d.toLocaleDateString('vi-VN');
};

const formatDateShort = (value: Date): string =>
  `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}`;

const startOfWeekMonday = (value: Date): Date => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
};

const startOfMonth = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), 1);
const endOfMonth = (value: Date): Date => new Date(value.getFullYear(), value.getMonth() + 1, 0);

const addDays = (value: Date, days: number): Date => {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (value: Date, months: number): Date => {
  const d = new Date(value);
  d.setMonth(d.getMonth() + months);
  return d;
};

const isWithinRange = (targetDateKey: string, from: Date, to: Date): boolean => {
  const target = toDateSafe(targetDateKey);
  if (!target) return false;
  const fromTime = new Date(from).setHours(0, 0, 0, 0);
  const toTime = new Date(to).setHours(23, 59, 59, 999);
  const targetTime = target.getTime();
  return targetTime >= fromTime && targetTime <= toTime;
};

const inferPreset = (shiftName: string, startTime: string): SlotPreset => {
  const normalizedName = String(shiftName || '').toLowerCase();
  if (normalizedName.includes('sáng')) return 'MORNING';
  if (normalizedName.includes('chiều')) return 'EVENING';
  if (normalizedName.includes('tối')) return 'EVENING';

  const startMinutes = parseTimeToMinutes(startTime);
  if (startMinutes === null) return 'MORNING';
  if (startMinutes < 14 * 60) return 'MORNING';
  return 'EVENING';
};

const getWeekRangeLabel = (start: Date, end: Date): string => {
  const startDay = String(start.getDate()).padStart(2, '0');
  const endDay = String(end.getDate()).padStart(2, '0');
  const endMonth = String(end.getMonth() + 1).padStart(2, '0');
  const endYear = end.getFullYear();
  return `Tuần ${startDay}-${endDay}/${endMonth}/${endYear}`;
};

const statusLabel = (status: string): string => {
  const key = String(status || '').toUpperCase();
  if (['COMPLETED', 'DONE', 'PAID'].includes(key)) return 'Done ✓';
  if (['IN_PROGRESS', 'CONFIRMED'].includes(key)) return 'In Progress';
  if (['CANCELLED', 'NO_SHOW'].includes(key)) return 'Cancelled';
  return 'Pending';
};

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

const buildSampleDataset = (from: Date, to: Date) => {
  const names = [
    'Nguyễn Thị Mai',
    'Lý Thị Ngọc',
    'Phan Thu Yến',
    'Đỗ Hoàng Linh',
    'Bùi Quang Huy',
    'Võ Trà My',
    'Trần Minh Khang',
    'Ngô Thanh Hà',
    'Phạm Gia Hân',
    'Lê Bảo Châu',
  ];

  const shifts = [
    { ma_ca: 1, ten_ca: 'Ca sáng', gio_bat_dau: '08:00:00', gio_ket_thuc: '16:00:00', trang_thai: true },
    { ma_ca: 2, ten_ca: 'Ca tối', gio_bat_dau: '14:00:00', gio_ket_thuc: '22:00:00', trang_thai: true },
  ];

  const staffRows = names.map((name, idx) => ({
    ma_nhan_vien: 200 + idx,
    ma_nguoi_dung: 800 + idx,
    ma_nhan_vien_code: `NV${String(200 + idx).padStart(3, '0')}`,
    chuc_vu: idx % 2 === 0 ? 'Kỹ thuật viên' : 'Chuyên viên chăm sóc da',
    phong_ban: idx % 3 === 0 ? 'Wellness' : 'Beauty',
    ngay_vao_lam: toDateKey(addDays(new Date(), -(600 - idx * 25))),
    trang_thai: true,
    ho_ten: name,
    so_dien_thoai: `09${String(17000000 + idx * 567).slice(-8)}`,
    email: `staff.${idx + 1}@nhaspa.vn`,
  }));

  const schedules: any[] = [];
  const appointments: any[] = [];
  const leaves: any[] = [];

  const rangeDays: Date[] = [];
  for (let day = new Date(from); day.getTime() <= to.getTime(); day = addDays(day, 1)) {
    rangeDays.push(new Date(day));
  }

  staffRows.forEach((staff, staffIndex) => {
    rangeDays.forEach((day, dayIndex) => {
      const dateKey = toDateKey(day);
      const leaveToday = (staffIndex === 2 && dayIndex % 9 === 0) || (staffIndex === 7 && dayIndex % 11 === 0);

      if (leaveToday) {
        leaves.push({
          ma_nghi_phep: Number(`${staff.ma_nhan_vien}${dayIndex}1`),
          ma_nhan_vien: staff.ma_nhan_vien,
          ngay_bat_dau: dateKey,
          ngay_ket_thuc: dateKey,
          ly_do: dayIndex % 2 === 0 ? 'Nghỉ phép' : 'Nghỉ lễ',
          trang_thai: 'APPROVED',
        });
        return;
      }

      const shiftIds = dayIndex % 5 === 0 ? [1, 2] : [((staffIndex + dayIndex) % 2) + 1];

      shiftIds.forEach((shiftId, idx) => {
        schedules.push({
          ma_lich: Number(`${staff.ma_nhan_vien}${dayIndex}${idx}`),
          ma_nhan_vien: staff.ma_nhan_vien,
          ma_ca: shiftId,
          ngay_lam_viec: dateKey,
          ghi_chu: '',
          ten_ca: shifts[shiftId - 1].ten_ca,
          ho_ten_nhan_vien: staff.ho_ten,
        });
      });

      const appointmentCount = 1 + ((staffIndex + dayIndex) % 3);
      for (let i = 0; i < appointmentCount; i += 1) {
        const startHour = 8 + ((staffIndex + dayIndex + i * 2) % 11);
        const endHour = Math.min(startHour + 1, 22);

        appointments.push({
          ma_lich_hen: Number(`${staff.ma_nhan_vien}${dayIndex}${i}8`),
          ma_khach_hang: 1000 + i,
          ho_ten_khach: `Khách ${i + 1 + dayIndex}`,
          ngay_hen: dateKey,
          gio_bat_dau: `${String(startHour).padStart(2, '0')}:00:00`,
          gio_ket_thuc: `${String(endHour).padStart(2, '0')}:00:00`,
          trang_thai: (i + dayIndex) % 4 === 0 ? 'COMPLETED' : 'PENDING',
          chi_tiets: [
            {
              ma_chi_tiet: Number(`${staff.ma_nhan_vien}${dayIndex}${i}`),
              ma_nhan_vien: staff.ma_nhan_vien,
              ten_san_pham:
                (i + staffIndex) % 3 === 0
                  ? "Massage 90'"
                  : (i + staffIndex) % 3 === 1
                    ? 'Chăm sóc da'
                    : 'Gội đầu dưỡng sinh',
              gio_bat_dau: `${String(startHour).padStart(2, '0')}:00:00`,
              gio_ket_thuc: `${String(endHour).padStart(2, '0')}:00:00`,
            },
          ],
        });
      }
    });
  });

  return {
    staffRows,
    shiftRows: shifts,
    scheduleRows: schedules,
    leaveRows: leaves,
    appointmentRows: appointments,
  };
};

export default function ScheduleView() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.vai_tros?.some(role => ['ADMIN', 'RECEPTIONIST'].includes(role)));

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [usingSample, setUsingSample] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('WEEK');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => toDateKey(new Date()));
  const [staffFilter, setStaffFilter] = useState<number | 'ALL'>('ALL');
  const [staffPage, setStaffPage] = useState(1);

  const [staffRows, setStaffRows] = useState<any[]>([]);
  const [shiftRows, setShiftRows] = useState<any[]>([]);
  const [scheduleRows, setScheduleRows] = useState<any[]>([]);
  const [leaveRows, setLeaveRows] = useState<any[]>([]);
  const [appointmentRows, setAppointmentRows] = useState<any[]>([]);

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftModalItems, setShiftModalItems] = useState<ScheduleItem[]>([]);
  const [shiftError, setShiftError] = useState('');
  const [savingShift, setSavingShift] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [staffByService, setStaffByService] = useState<Record<number, any[]>>({});

  const [shiftForm, setShiftForm] = useState<ShiftFormState>({
    scheduleId: null,
    staffId: 0,
    date: toDateKey(new Date()),
    preset: 'MORNING',
    start: PRESET_META.MORNING.defaultStart,
    end: PRESET_META.MORNING.defaultEnd,
    note: '',
  });

  const visibleRange = useMemo(() => {
    if (viewMode === 'WEEK') {
      const start = startOfWeekMonday(anchorDate);
      const end = addDays(start, 6);
      return { start, end };
    }

    if (viewMode === 'DAY') {
      const start = new Date(anchorDate);
      start.setHours(0, 0, 0, 0);
      return { start, end: start };
    }

    const start = startOfMonth(anchorDate);
    const end = endOfMonth(anchorDate);
    return { start, end };
  }, [viewMode, anchorDate]);

  const rangeStartKey = useMemo(() => toDateKey(visibleRange.start), [visibleRange.start]);
  const rangeEndKey = useMemo(() => toDateKey(visibleRange.end), [visibleRange.end]);

  const gridDays = useMemo(() => {
    if (viewMode === 'WEEK') {
      return Array.from({ length: 7 }, (_, idx) => addDays(visibleRange.start, idx));
    }
    if (viewMode === 'DAY') {
      return [visibleRange.start];
    }
    return [] as Date[];
  }, [viewMode, visibleRange.start]);

  const monthGridDays = useMemo(() => {
    if (viewMode !== 'MONTH') return [] as Date[];
    const monthStart = startOfMonth(anchorDate);
    const firstCellOffset = (monthStart.getDay() + 6) % 7;
    const firstCell = addDays(monthStart, -firstCellOffset);
    return Array.from({ length: 42 }, (_, idx) => addDays(firstCell, idx));
  }, [viewMode, anchorDate]);

  useEffect(() => {
    const selectedDate = toDateSafe(selectedDayKey);
    if (!selectedDate || !isWithinRange(selectedDayKey, visibleRange.start, visibleRange.end)) {
      setSelectedDayKey(toDateKey(visibleRange.start));
    }
  }, [selectedDayKey, visibleRange.start, visibleRange.end]);

  const loadData = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const fetchFrom = toDateKey(addDays(visibleRange.start, -2));
      const fetchTo = toDateKey(addDays(visibleRange.end, 2));

      const [staffData, shiftsRes, schedulesRes, leavesRes, appointmentData] = await Promise.all([
        fetchAllPages((page, pageSize) => staffApi.list(page, pageSize)),
        shiftsApi.list(),
        schedulesApi.list(undefined, fetchFrom, fetchTo),
        leavesApi.list(undefined, 'APPROVED'),
        fetchAllPages((page, pageSize) =>
          appointmentsApi.list(page, pageSize, {
            from_date: fetchFrom,
            to_date: fetchTo,
          }),
        ),
      ]);

      if (staffData.length === 0) {
        const sample = buildSampleDataset(visibleRange.start, visibleRange.end);
        setStaffRows(sample.staffRows);
        setShiftRows(sample.shiftRows);
        setScheduleRows(sample.scheduleRows);
        setLeaveRows(sample.leaveRows);
        setAppointmentRows(sample.appointmentRows);
        setUsingSample(true);
        setError('Chưa có dữ liệu lịch làm việc thực tế, đang hiển thị dữ liệu mẫu.');
      } else {
        setStaffRows(staffData);
        setShiftRows(shiftsRes?.success ? shiftsRes.data || [] : []);
        setScheduleRows(schedulesRes?.success ? schedulesRes.data || [] : []);
        setLeaveRows(leavesRes?.success ? leavesRes.data || [] : []);
        setAppointmentRows(appointmentData);
        setUsingSample(false);
      }
    } catch (err: any) {
      const sample = buildSampleDataset(visibleRange.start, visibleRange.end);
      setStaffRows(sample.staffRows);
      setShiftRows(sample.shiftRows);
      setScheduleRows(sample.scheduleRows);
      setLeaveRows(sample.leaveRows);
      setAppointmentRows(sample.appointmentRows);
      setUsingSample(true);
      setError((err?.message || 'Không thể tải dữ liệu lịch làm việc') + '. Đang chuyển sang dữ liệu mẫu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(loading === false);
  }, [rangeStartKey, rangeEndKey]);

  useEffect(() => {
    setStaffPage(1);
  }, [staffFilter]);

  const staffMembers = useMemo<StaffMember[]>(() => {
    return staffRows
      .map((row) => {
        const id = toNumber(row.ma_nhan_vien);
        if (!id) return null;
        const name = row.ho_ten || `Nhân viên #${id}`;

        return {
          id,
          code: row.ma_nhan_vien_code || `NV${String(id).padStart(3, '0')}`,
          name,
          shortName: shortNameOf(name),
          title: row.chuc_vu || 'Chuyên viên Spa',
          initials: initialsOf(name),
          active: Boolean(row.trang_thai),
        } as StaffMember;
      })
      .filter(Boolean) as StaffMember[];
  }, [staffRows]);

  useEffect(() => {
    if (staffFilter === 'ALL') return;
    const exists = staffMembers.some((staff) => staff.id === staffFilter);
    if (!exists) {
      setStaffFilter('ALL');
    }
  }, [staffFilter, staffMembers]);

  useEffect(() => {
    if (shiftForm.staffId) return;
    const firstStaff = staffMembers[0];
    if (firstStaff) {
      setShiftForm((prev) => ({ ...prev, staffId: firstStaff.id }));
    }
  }, [staffMembers, shiftForm.staffId]);

  const shifts = useMemo<ShiftItem[]>(() => {
    return shiftRows
      .map((row: any) => {
        const id = toNumber(row.ma_ca);
        if (!id) return null;
        const start = normalizeTime(row.gio_bat_dau, '08:00');
        const end = normalizeTime(row.gio_ket_thuc, '16:00');
        const name = row.ten_ca || `Ca #${id}`;

        return {
          id,
          name,
          start,
          end,
          preset: inferPreset(name, start),
        } as ShiftItem;
      })
      .filter(Boolean) as ShiftItem[];
  }, [shiftRows]);

  const shiftById = useMemo(() => {
    const map = new Map<number, ShiftItem>();
    shifts.forEach((shift) => {
      map.set(shift.id, shift);
    });
    return map;
  }, [shifts]);

  const staffById = useMemo(() => {
    const map = new Map<number, StaffMember>();
    staffMembers.forEach((staff) => {
      map.set(staff.id, staff);
    });
    return map;
  }, [staffMembers]);

  const schedules = useMemo<ScheduleItem[]>(() => {
    return scheduleRows
      .map((row: any) => {
        const id = toNumber(row.ma_lich);
        const staffId = toNumber(row.ma_nhan_vien);
        const shiftId = toNumber(row.ma_ca);
        const date = toDateKey(row.ngay_lam_viec);

        if (!id || !staffId || !shiftId || !date) return null;

        const shift = shiftById.get(shiftId);
        const shiftName = row.ten_ca || shift?.name || `Ca #${shiftId}`;
        const start = shift?.start || PRESET_META.MORNING.defaultStart;
        const end = shift?.end || PRESET_META.MORNING.defaultEnd;

        return {
          id,
          staffId,
          date,
          shiftId,
          shiftName,
          start,
          end,
          preset: inferPreset(shiftName, start),
          note: row.ghi_chu || '',
          status: String(row.trang_thai || 'ACTIVE').toUpperCase(),
        } as ScheduleItem;
      })
      .filter(Boolean) as ScheduleItem[];
  }, [scheduleRows, shiftById]);

  const leaves = useMemo<LeaveItem[]>(() => {
    return leaveRows
      .map((row: any) => {
        const id = toNumber(row.ma_nghi_phep);
        const staffId = toNumber(row.ma_nhan_vien);
        const startDate = toDateKey(row.ngay_bat_dau);
        const endDate = toDateKey(row.ngay_ket_thuc);
        if (!id || !staffId || !startDate || !endDate) return null;

        return {
          id,
          staffId,
          startDate,
          endDate,
          reason: row.ly_do || '',
          status: String(row.trang_thai || '').toUpperCase(),
        } as LeaveItem;
      })
      .filter(Boolean) as LeaveItem[];
  }, [leaveRows]);

  const appointments = useMemo<AppointmentItem[]>(() => {
    const rows: AppointmentItem[] = [];

    appointmentRows.forEach((appointment: any) => {
      const date = toDateKey(appointment.ngay_hen);
      if (!date) return;

      const details = Array.isArray(appointment.chi_tiets) ? appointment.chi_tiets : [];
      if (details.length === 0) return;

      const customerName = appointment.ho_ten_khach || `KH #${appointment.ma_khach_hang || '—'}`;
      const status = String(appointment.trang_thai || '').toUpperCase();
      const appointmentId = toNumber(appointment.ma_lich_hen);

      details.forEach((detail: any, index: number) => {
        const staffId = toNumber(detail.ma_nhan_vien);
        if (!staffId) return;

        const staffName = staffById.get(staffId)?.name || `NV #${staffId}`;
        const start = normalizeTime(detail.gio_bat_dau || appointment.gio_bat_dau, '09:00');
        const end = normalizeTime(detail.gio_ket_thuc || appointment.gio_ket_thuc, '10:00');

        rows.push({
          id: appointmentId,
          detailId: String(detail.ma_chi_tiet || `${appointmentId}-${index}`),
          staffId,
          staffName,
          date,
          start,
          end,
          customerName,
          serviceName: detail.ten_san_pham || `Dịch vụ #${detail.ma_san_pham || index + 1}`,
          status,
        });
      });
    });

    return rows;
  }, [appointmentRows, staffById]);

  const schedulesByStaffDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    schedules.forEach((item) => {
      const key = `${item.staffId}|${item.date}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });

    map.forEach((list) => {
      list.sort((a, b) => (parseTimeToMinutes(a.start) || 0) - (parseTimeToMinutes(b.start) || 0));
    });

    return map;
  }, [schedules]);

  const leaveByStaffDay = useMemo(() => {
    const map = new Map<string, LeaveItem>();

    leaves.forEach((leave) => {
      if (leave.status !== 'APPROVED') return;

      const start = toDateSafe(leave.startDate);
      const end = toDateSafe(leave.endDate);
      if (!start || !end) return;

      for (let day = new Date(start); day.getTime() <= end.getTime(); day = addDays(day, 1)) {
        const key = `${leave.staffId}|${toDateKey(day)}`;
        if (!map.has(key)) {
          map.set(key, leave);
        }
      }
    });

    return map;
  }, [leaves]);

  const appointmentsByStaffDay = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();

    appointments.forEach((item) => {
      const key = `${item.staffId}|${item.date}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });

    map.forEach((list) => {
      list.sort((a, b) => (parseTimeToMinutes(a.start) || 0) - (parseTimeToMinutes(b.start) || 0));
    });

    return map;
  }, [appointments]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();

    appointments.forEach((item) => {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    });

    map.forEach((list) => {
      list.sort((a, b) => (parseTimeToMinutes(a.start) || 0) - (parseTimeToMinutes(b.start) || 0));
    });

    return map;
  }, [appointments]);

  const filteredStaffList = useMemo(() => {
    return staffFilter === 'ALL'
      ? staffMembers
      : staffMembers.filter((staff) => staff.id === staffFilter);
  }, [staffMembers, staffFilter]);

  const totalStaffPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredStaffList.length / 10));
  }, [filteredStaffList]);

  useEffect(() => {
    if (staffPage > totalStaffPages) {
      setStaffPage(totalStaffPages);
    }
  }, [staffPage, totalStaffPages]);

  const visibleStaff = useMemo(() => {
    const fromIndex = (staffPage - 1) * 10;
    return filteredStaffList.slice(fromIndex, fromIndex + 10);
  }, [filteredStaffList, staffPage]);

  const filteredDayAppointments = (dateKey: string): AppointmentItem[] => {
    const rows = appointmentsByDay.get(dateKey) || [];
    if (staffFilter === 'ALL') return rows;
    return rows.filter((item) => item.staffId === staffFilter);
  };

  const getDayBadgeCount = (dateKey: string): number => filteredDayAppointments(dateKey).length;

  const getCellData = (staffId: number, dateKey: string) => {
    const key = `${staffId}|${dateKey}`;
    const leave = leaveByStaffDay.get(key) || null;
    const cellSchedules = schedulesByStaffDay.get(key) || [];
    const cellAppointments = appointmentsByStaffDay.get(key) || [];

    return {
      leave,
      schedules: cellSchedules,
      appointments: cellAppointments,
    };
  };

  const countAppointmentsInShift = (appointmentsInCell: AppointmentItem[], schedule: ScheduleItem): number => {
    const start = parseTimeToMinutes(schedule.start);
    const end = parseTimeToMinutes(schedule.end);

    if (start === null || end === null || end <= start) {
      return appointmentsInCell.length;
    }

    return appointmentsInCell.filter((appointment) => {
      const startMinutes = parseTimeToMinutes(appointment.start);
      if (startMinutes === null) return true;
      return startMinutes >= start && startMinutes < end;
    }).length;
  };

  const selectedDayDate = useMemo(() => toDateSafe(selectedDayKey) || visibleRange.start, [selectedDayKey, visibleRange.start]);
  const selectedDayAppointments = useMemo(() => filteredDayAppointments(selectedDayKey), [selectedDayKey, appointmentsByDay, staffFilter]);

  const selectedDayTimeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    const usedHours = new Set<number>();
    selectedDayAppointments.forEach((appointment) => {
      const minutes = parseTimeToMinutes(appointment.start);
      if (minutes !== null) {
        usedHours.add(Math.floor(minutes / 60));
      }
      items.push({
        type: 'appointment',
        time: appointment.start,
        appointment,
      });
    });

    for (let hour = 8; hour <= 21; hour += 1) {
      if (!usedHours.has(hour)) {
        items.push({
          type: 'empty',
          time: `${String(hour).padStart(2, '0')}:00`,
        });
      }
    }

    return items.sort((a, b) => {
      const aMinutes = parseTimeToMinutes(a.time) || 0;
      const bMinutes = parseTimeToMinutes(b.time) || 0;
      if (aMinutes !== bMinutes) return aMinutes - bMinutes;
      if (a.type === b.type) return 0;
      return a.type === 'appointment' ? -1 : 1;
    });
  }, [selectedDayAppointments]);

  const monthCalendarStats = useMemo(() => {
    const map = new Map<string, { appointments: number; scheduledStaff: number }>();

    const dateKeys = monthGridDays.map((day) => toDateKey(day));
    dateKeys.forEach((key) => {
      map.set(key, { appointments: 0, scheduledStaff: 0 });
    });

    dateKeys.forEach((key) => {
      const dayAppointments = filteredDayAppointments(key);
      const scheduleStaff = new Set<number>();
      staffMembers.forEach((staff) => {
        const data = getCellData(staff.id, key);
        if (data.schedules.length > 0) {
          scheduleStaff.add(staff.id);
        }
      });

      map.set(key, {
        appointments: dayAppointments.length,
        scheduledStaff: scheduleStaff.size,
      });
    });

    return map;
  }, [monthGridDays, selectedDayKey, appointmentsByDay, schedulesByStaffDay, staffMembers, staffFilter]);

  const navLabel = useMemo(() => {
    if (viewMode === 'WEEK') {
      return getWeekRangeLabel(visibleRange.start, visibleRange.end);
    }

    if (viewMode === 'DAY') {
      return `Ngày ${formatDate(visibleRange.start)}`;
    }

    return `Tháng ${String(anchorDate.getMonth() + 1).padStart(2, '0')}/${anchorDate.getFullYear()}`;
  }, [viewMode, visibleRange.start, visibleRange.end, anchorDate]);

  const prevLabel = viewMode === 'WEEK' ? 'Tuần trước' : viewMode === 'DAY' ? 'Ngày trước' : 'Tháng trước';
  const nextLabel = viewMode === 'WEEK' ? 'Tuần sau' : viewMode === 'DAY' ? 'Ngày sau' : 'Tháng sau';

  const goPrev = () => {
    setAnchorDate((prev) => {
      if (viewMode === 'WEEK') return addDays(prev, -7);
      if (viewMode === 'DAY') return addDays(prev, -1);
      return addMonths(prev, -1);
    });
  };

  const goNext = () => {
    setAnchorDate((prev) => {
      if (viewMode === 'WEEK') return addDays(prev, 7);
      if (viewMode === 'DAY') return addDays(prev, 1);
      return addMonths(prev, 1);
    });
  };

  const resolveShiftIdByTime = async (start: string, end: string, preset: SlotPreset): Promise<number> => {
    const normalizedStart = normalizeTime(start);
    const normalizedEnd = normalizeTime(end);

    const matched = shifts.find((shift) => shift.start === normalizedStart && shift.end === normalizedEnd);
    if (matched) {
      return matched.id;
    }

    if (!isAdmin) {
      throw new Error('Bạn không có quyền tạo ca làm mới. Vui lòng dùng khung giờ ca đã có.');
    }

    const shiftName = `Ca ${PRESET_META[preset].label} ${normalizedStart}-${normalizedEnd}`;
    const createRes = await shiftsApi.create({
      ten_ca: shiftName,
      gio_bat_dau: toApiTime(normalizedStart),
      gio_ket_thuc: toApiTime(normalizedEnd),
      mo_ta: `Tạo tự động từ lịch làm việc (${normalizedStart}-${normalizedEnd})`,
    });

    if (!createRes.success) {
      throw new Error(createRes.message || 'Không thể tạo ca mới với khung giờ đã chọn');
    }

    const newShift = createRes.data;
    const newId = toNumber(newShift?.ma_ca);
    if (!newId) {
      throw new Error('Không lấy được mã ca làm mới');
    }

    setShiftRows((prev) => [...prev, newShift]);
    return newId;
  };

  const openCreateShift = (staffId?: number, dateKey?: string) => {
    const fallbackStaff =
      typeof staffId === 'number'
        ? staffId
        : staffFilter !== 'ALL'
          ? staffFilter
          : (visibleStaff[0]?.id || staffMembers[0]?.id || 0);

    setShiftError('');
    setShiftModalItems([]);
    setShiftForm({
      scheduleId: null,
      staffId: fallbackStaff,
      date: dateKey || selectedDayKey || toDateKey(new Date()),
      preset: 'MORNING',
      start: PRESET_META.MORNING.defaultStart,
      end: PRESET_META.MORNING.defaultEnd,
      note: '',
    });
    setShowShiftModal(true);
  };

  const openEditShift = (schedulesInCell: ScheduleItem[]) => {
    const target = schedulesInCell[0];
    if (!target) return;

    setShiftError('');
    setShiftModalItems(schedulesInCell);
    setShiftForm({
      scheduleId: target.id,
      staffId: target.staffId,
      date: target.date,
      preset: target.preset,
      start: target.start,
      end: target.end,
      note: target.note,
    });
    setShowShiftModal(true);
  };

  const applyScheduleToForm = (scheduleId: number) => {
    const target = shiftModalItems.find((item) => item.id === scheduleId);
    if (!target) return;

    setShiftForm((prev) => ({
      ...prev,
      scheduleId: target.id,
      staffId: target.staffId,
      date: target.date,
      preset: target.preset,
      start: target.start,
      end: target.end,
      note: target.note,
    }));
  };

  const saveShift = async () => {
    setShiftError('');

    if (!shiftForm.staffId) {
      setShiftError('Vui lòng chọn nhân viên.');
      return;
    }

    if (!shiftForm.date) {
      setShiftError('Vui lòng chọn ngày làm việc.');
      return;
    }

    if (!shiftForm.start || !shiftForm.end) {
      setShiftError('Vui lòng nhập giờ bắt đầu và kết thúc.');
      return;
    }

    const startMinutes = parseTimeToMinutes(shiftForm.start);
    const endMinutes = parseTimeToMinutes(shiftForm.end);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      setShiftError('Khung giờ không hợp lệ. Giờ kết thúc phải lớn hơn giờ bắt đầu.');
      return;
    }

    setSavingShift(true);

    try {
      const shiftId = await resolveShiftIdByTime(shiftForm.start, shiftForm.end, shiftForm.preset);

      const payload = {
        ma_nhan_vien: shiftForm.staffId,
        ma_ca: shiftId,
        ngay_lam_viec: shiftForm.date,
        ghi_chu: shiftForm.note.trim() || undefined,
      };

      if (usingSample) {
        if (shiftForm.scheduleId) {
          setScheduleRows((prev) =>
            prev.map((row) =>
              toNumber(row.ma_lich) === shiftForm.scheduleId
                ? {
                    ...row,
                    ...payload,
                    ten_ca: shifts.find((shift) => shift.id === shiftId)?.name || row.ten_ca,
                  }
                : row,
            ),
          );
        } else {
          const nextId = Math.max(0, ...scheduleRows.map((row) => toNumber(row.ma_lich))) + 1;
          setScheduleRows((prev) => [
            {
              ma_lich: nextId,
              ...payload,
              ten_ca: shifts.find((shift) => shift.id === shiftId)?.name || `Ca #${shiftId}`,
            },
            ...prev,
          ]);
        }

        setShowShiftModal(false);
        return;
      }

      if (shiftForm.scheduleId) {
        const updateRes = await schedulesApi.update(shiftForm.scheduleId, payload);
        if (!updateRes.success) {
          throw new Error(updateRes.message || 'Không thể cập nhật ca làm');
        }
      } else {
        const createRes = await schedulesApi.create(payload);
        if (!createRes.success) {
          throw new Error(createRes.message || 'Không thể tạo ca làm');
        }
      }

      setShowShiftModal(false);
      await loadData(true);
    } catch (err: any) {
      setShiftError(err?.message || 'Không thể lưu ca làm');
    } finally {
      setSavingShift(false);
    }
  };

  const cancelShift = async () => {
    if (!shiftForm.scheduleId) return;
    const accepted = window.confirm('Bạn có chắc muốn hủy ca làm này?');
    if (!accepted) return;

    setShiftError('');
    setSavingShift(true);
    try {
      if (usingSample) {
        setScheduleRows((prev) =>
          prev.filter((row) => toNumber(row.ma_lich) !== shiftForm.scheduleId),
        );
        setShowShiftModal(false);
        return;
      }

      const res = await schedulesApi.delete(shiftForm.scheduleId);
      if (!res.success) {
        throw new Error(res.message || 'Không thể hủy ca làm');
      }

      setShowShiftModal(false);
      await loadData(true);
    } catch (err: any) {
      setShiftError(err?.message || 'Không thể hủy ca làm');
    } finally {
      setSavingShift(false);
    }
  };

  const exportSchedule = () => {
    const exportDays = viewMode === 'MONTH' ? monthGridDays : gridDays;

    const rows: any[][] = [[
      'Mã NV',
      'Tên nhân viên',
      'Ngày',
      'Ca làm',
      'Số lịch hẹn',
      'Trạng thái',
      'Ghi chú',
    ]];

    filteredStaffList.forEach((staff) => {
      exportDays.forEach((day) => {
        const dateKey = toDateKey(day);
        const data = getCellData(staff.id, dateKey);

        if (data.leave) {
          rows.push([
            staff.code,
            staff.name,
            dateKey,
            '',
            0,
            data.leave.reason?.toLowerCase().includes('lễ') ? 'Nghỉ lễ' : 'Nghỉ phép',
            data.leave.reason || '',
          ]);
          return;
        }

        if (data.schedules.length === 0) {
          rows.push([staff.code, staff.name, dateKey, '', 0, 'Chưa phân ca', '']);
          return;
        }

        data.schedules.forEach((schedule) => {
          const count = countAppointmentsInShift(data.appointments, schedule);
          rows.push([
            staff.code,
            staff.name,
            dateKey,
            `${schedule.start}-${schedule.end}`,
            count,
            'Đã phân ca',
            schedule.note || '',
          ]);
        });
      });
    });

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lich-lam-viec-${rangeStartKey}-to-${rangeEndKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onChangePreset = (preset: SlotPreset) => {
    setShiftForm((prev) => ({
      ...prev,
      preset,
      start: PRESET_META[preset].defaultStart,
      end: PRESET_META[preset].defaultEnd,
    }));
  };

  const selectedDayLabel = useMemo(() => {
    const date = selectedDayDate;
    const weekday = WEEKDAY_LABELS[(date.getDay() + 6) % 7];
    return `${weekday} • ${formatDate(date)}`;
  }, [selectedDayDate]);

  if (loading) {
    return (
      <div className="admin-animate-in flex items-center justify-center h-[64vh]">
        <div className="w-10 h-10 border-4 border-amber-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-worksched-page admin-animate-in space-y-4">
      <div className="admin-worksched-controls admin-card">
        <div className="admin-worksched-tabs">
          <button className={viewMode === 'MONTH' ? 'active' : ''} onClick={() => setViewMode('MONTH')}>Tháng</button>
          <button className={viewMode === 'WEEK' ? 'active' : ''} onClick={() => setViewMode('WEEK')}>Tuần</button>
          <button className={viewMode === 'DAY' ? 'active' : ''} onClick={() => setViewMode('DAY')}>Ngày</button>
        </div>

        <div className="admin-worksched-nav">
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={goPrev}>
            <ChevronLeft size={14} /> {prevLabel}
          </button>
          <div className="range-label">{navLabel}</div>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={goNext}>
            {nextLabel} <ChevronRight size={14} />
          </button>
        </div>

        <div className="admin-worksched-filter-group">
          <select
            className="admin-select"
            value={staffFilter === 'ALL' ? 'ALL' : String(staffFilter)}
            onChange={(event) => {
              const value = event.target.value;
              setStaffFilter(value === 'ALL' ? 'ALL' : toNumber(value));
            }}
          >
            <option value="ALL">Tất cả nhân viên</option>
            {staffMembers.map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
          </select>

          <button className="admin-btn admin-btn-secondary" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCcw size={15} /> {refreshing ? 'Đang tải...' : 'Làm mới'}
          </button>

          <button
            className="admin-btn admin-worksched-btn-gold"
            onClick={() => openCreateShift()}
            disabled={!isAdmin && !usingSample}
          >
            <Plus size={15} /> Tạo ca làm
          </button>

          <button className="admin-btn admin-btn-secondary" onClick={exportSchedule}>
            <Download size={15} /> Xuất lịch
          </button>
        </div>
      </div>

      {error && <p className="admin-worksched-alert">{error}</p>}

      <div className="admin-worksched-main" style={{ gridTemplateColumns: '1fr' }}>
        <section className="admin-worksched-grid-panel admin-card">
          {viewMode === 'MONTH' ? (
            <>
              <div className="admin-worksched-month-head">
                {MONTH_WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="weekday">{label}</div>
                ))}
              </div>

              <div className="admin-worksched-month-grid">
                {monthGridDays.map((day) => {
                  const key = toDateKey(day);
                  const stats = monthCalendarStats.get(key) || { appointments: 0, scheduledStaff: 0 };
                  const inMonth = day.getMonth() === anchorDate.getMonth();
                  const selected = key === selectedDayKey;

                  return (
                    <button
                      key={`month-cell-${key}`}
                      className={`day-cell ${inMonth ? '' : 'muted'} ${selected ? 'selected' : ''}`}
                      onClick={() => setSelectedDayKey(key)}
                    >
                      <p className="date">{day.getDate()}</p>
                      <div className="meta">
                        <span>{stats.appointments} lịch hẹn</span>
                        <span>{stats.scheduledStaff} NV trực</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="admin-worksched-week-grid-wrap">
              <div
                className="admin-worksched-week-grid"
                style={{
                  gridTemplateColumns: `160px repeat(${gridDays.length}, minmax(120px, 1fr))`,
                }}
              >
                <div className="head-cell staff-head">Nhân viên</div>
                {gridDays.map((day) => {
                  const dateKey = toDateKey(day);
                  const badgeCount = getDayBadgeCount(dateKey);
                  const selected = dateKey === selectedDayKey;

                  return (
                    <button
                      key={`head-${dateKey}`}
                      className={`head-cell day-head ${selected ? 'selected' : ''}`}
                      onClick={() => setSelectedDayKey(dateKey)}
                    >
                      <p>{WEEKDAY_LABELS[(day.getDay() + 6) % 7]} • {formatDateShort(day)}</p>
                      <span className="badge">{badgeCount} lịch</span>
                    </button>
                  );
                })}

                {visibleStaff.length === 0 ? (
                  <div className="empty-state" style={{ gridColumn: `1 / span ${gridDays.length + 1}` }}>
                    Không có nhân viên trong bộ lọc hiện tại.
                  </div>
                ) : (
                  visibleStaff.map((staff) => (
                    <Fragment key={`row-${staff.id}`}>
                      <div className="staff-cell">
                        <div className="avatar">{staff.initials}</div>
                        <div>
                          <p>{staff.shortName}</p>
                          <span>{staff.title}</span>
                        </div>
                      </div>

                      {gridDays.map((day) => {
                        const dateKey = toDateKey(day);
                        const data = getCellData(staff.id, dateKey);

                        if (data.leave) {
                          const leaveLabel = data.leave.reason.toLowerCase().includes('lễ') ? 'Nghỉ lễ' : 'Nghỉ phép';
                          return (
                            <button
                              key={`cell-${staff.id}-${dateKey}`}
                              className="grid-cell leave"
                              title="Click để thêm / sửa ca"
                              onClick={() => {
                                setSelectedDayKey(dateKey);
                                openCreateShift(staff.id, dateKey);
                              }}
                            >
                              <span>{leaveLabel}</span>
                            </button>
                          );
                        }

                        if (data.schedules.length === 0) {
                          return (
                            <button
                              key={`cell-${staff.id}-${dateKey}`}
                              className="grid-cell empty"
                              title="Click để thêm / sửa ca"
                              onClick={() => {
                                setSelectedDayKey(dateKey);
                                openCreateShift(staff.id, dateKey);
                              }}
                            >
                              <span>+ Thêm ca</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={`cell-${staff.id}-${dateKey}`}
                            className="grid-cell filled"
                            title="Click để thêm / sửa ca"
                            onClick={() => {
                              setSelectedDayKey(dateKey);
                              openEditShift(data.schedules);
                            }}
                          >
                            {data.schedules.map((schedule) => {
                              const count = countAppointmentsInShift(data.appointments, schedule);
                              return (
                                <span key={`shift-pill-${schedule.id}`} className={`shift-pill ${PRESET_META[schedule.preset].badgeClass} ${schedule.status === 'LOCKED' ? 'locked' : ''}`}>
                                  {schedule.status === 'LOCKED' && <Lock size={10} className="inline mr-1" />}
                                  {schedule.start}–{schedule.end} · {count} lịch
                                </span>
                              );
                            })}
                          </button>
                        );
                      })}
                    </Fragment>
                  ))
                )}
              </div>
            </div>
          )}

          {viewMode !== 'MONTH' && totalStaffPages > 1 && (
            <div className="flex justify-end mt-4 pt-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStaffPage((prev) => Math.max(1, prev - 1))}
                  disabled={staffPage === 1}
                  className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-40 transition-colors"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-input-bg)' }}
                >
                  Trước
                </button>
                <span className="px-3 py-1.5 text-sm rounded-md" style={{ background: 'rgba(201, 169, 110, 0.15)', color: 'var(--worksched-gold-soft)', fontWeight: 600 }}>
                  {staffPage} / {totalStaffPages}
                </span>
                <button
                  onClick={() => setStaffPage((prev) => Math.min(totalStaffPages, prev + 1))}
                  disabled={staffPage === totalStaffPages}
                  className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-40 transition-colors"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-input-bg)' }}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {showShiftModal && (
        <div className="admin-modal-overlay" onClick={() => setShowShiftModal(false)}>
          <div className="admin-modal admin-worksched-modal admin-modal-animate" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{shiftForm.scheduleId ? 'Sửa ca làm' : 'Tạo ca làm'}</h3>
              <button className="admin-btn-icon" onClick={() => setShowShiftModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body admin-worksched-modal-body">
              {shiftError && <p className="admin-worksched-alert mb-2">{shiftError}</p>}

              {shiftModalItems.length > 1 && (
                <div>
                  <label className="admin-label">Ca hiện có trong ô</label>
                  <select
                    className="admin-select"
                    value={shiftForm.scheduleId || 0}
                    onChange={(event) => applyScheduleToForm(toNumber(event.target.value))}
                  >
                    {shiftModalItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.start} - {item.end} ({item.shiftName})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="admin-label">Chọn nhân viên</label>
                <div className="admin-worksched-staff-pick">
                  {staffMembers.map((staff) => (
                    <button
                      key={`staff-pick-${staff.id}`}
                      type="button"
                      className={shiftForm.staffId === staff.id ? 'active' : ''}
                      onClick={() => setShiftForm((prev) => ({ ...prev, staffId: staff.id }))}
                    >
                      <span className="avatar">{staff.initials}</span>
                      <span className="text">{staff.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">Ngày làm việc</label>
                  <input
                    type="date"
                    className="admin-input"
                    value={shiftForm.date}
                    onChange={(event) => setShiftForm((prev) => ({ ...prev, date: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Ghi chú ca</label>
                  <input
                    className="admin-input"
                    value={shiftForm.note}
                    onChange={(event) => setShiftForm((prev) => ({ ...prev, note: event.target.value }))}
                    placeholder="VD: Hỗ trợ khu VIP"
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Ca làm</label>
                <div className="admin-worksched-preset-pick">
                  {(Object.keys(PRESET_META) as SlotPreset[]).map((preset) => (
                    <button
                      key={`preset-${preset}`}
                      type="button"
                      className={shiftForm.preset === preset ? 'active' : ''}
                      onClick={() => onChangePreset(preset)}
                    >
                      {PRESET_META[preset].label} ({PRESET_META[preset].defaultStart}-{PRESET_META[preset].defaultEnd})
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">Giờ bắt đầu</label>
                  <input
                    type="time"
                    className="admin-input"
                    value={shiftForm.start}
                    onChange={(event) => setShiftForm((prev) => ({ ...prev, start: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Giờ kết thúc</label>
                  <input
                    type="time"
                    className="admin-input"
                    value={shiftForm.end}
                    onChange={(event) => setShiftForm((prev) => ({ ...prev, end: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowShiftModal(false)} disabled={savingShift}>
                Hủy
              </button>
              {shiftForm.scheduleId && (
                <button
                  className="admin-btn admin-btn-danger"
                  onClick={cancelShift}
                  disabled={savingShift || (!isAdmin && !usingSample)}
                >
                  <X size={15} /> Hủy ca làm
                </button>
              )}
              <button className="admin-btn admin-worksched-btn-gold" onClick={saveShift} disabled={savingShift || (!isAdmin && !usingSample)}>
                <Save size={15} /> {savingShift ? 'Đang lưu...' : 'Lưu ca làm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
