import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  RefreshCcw,
  ShieldCheck,
  ShieldX,
  Users,
  X,
} from 'lucide-react';

import { leavesApi, staffApi } from '../../api/admin.api';
import { useAuth } from '../../contexts/AuthContext';

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID' | 'MATERNITY';

interface StaffMember {
  id: number;
  name: string;
  title: string;
  initials: string;
}

interface LeaveRecord {
  id: number;
  staffId: number;
  staffName: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  submittedAt: string;
  status: LeaveStatus;
  approvedAt: string;
  approvalNote: string;
  attachmentUrl: string;
}

const STATUS_META: Record<LeaveStatus, { label: string; className: string; dotClass: string }> = {
  PENDING: { label: 'Chờ duyệt', className: 'pending', dotClass: 'pending' },
  APPROVED: { label: 'Đã duyệt', className: 'approved', dotClass: 'approved' },
  REJECTED: { label: 'Từ chối', className: 'rejected', dotClass: 'rejected' },
};

const LEAVE_TYPE_META: Record<LeaveType, { label: string; short: string }> = {
  ANNUAL: { label: 'Phép năm', short: 'Phép năm' },
  SICK: { label: 'Ốm', short: 'Ốm' },
  UNPAID: { label: 'Không lương', short: 'Không lương' },
  MATERNITY: { label: 'Thai sản', short: 'Thai sản' },
};

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const ANNUAL_LEAVE_QUOTA = 12;

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

const formatDate = (value: any): string => {
  const d = toDateSafe(value);
  if (!d) return '—';
  return d.toLocaleDateString('vi-VN');
};

const formatDateTime = (value: any): string => {
  const d = toDateSafe(value);
  if (!d) return '—';
  return d.toLocaleString('vi-VN');
};

const startOfMonth = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), 1);

const endOfMonth = (value: Date): Date => new Date(value.getFullYear(), value.getMonth() + 1, 0);

const startOfWeekMonday = (value: Date): Date => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
};

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

const initialsOf = (value: string): string =>
  (value || 'NV')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((item) => item[0]?.toUpperCase() || '')
    .join('') || 'NV';

const normalizeText = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const countDaysInclusive = (fromDate: string, toDate: string): number => {
  const from = toDateSafe(fromDate);
  const to = toDateSafe(toDate);
  if (!from || !to) return 0;
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  if (end.getTime() < start.getTime()) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
};

const countOverlapDaysInYear = (fromDate: string, toDate: string, year: number): number => {
  const from = toDateSafe(fromDate);
  const to = toDateSafe(toDate);
  if (!from || !to) return 0;

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const start = from.getTime() > yearStart.getTime() ? from : yearStart;
  const end = to.getTime() < yearEnd.getTime() ? to : yearEnd;

  const normalizedStart = new Date(start);
  normalizedStart.setHours(0, 0, 0, 0);
  const normalizedEnd = new Date(end);
  normalizedEnd.setHours(0, 0, 0, 0);

  if (normalizedEnd.getTime() < normalizedStart.getTime()) return 0;
  return Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / 86400000) + 1;
};

const truncateText = (value: string, max = 68): string => {
  if (!value) return '—';
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
};

const inferLeaveType = (rawType: any, reason: any): LeaveType => {
  const normalizedType = normalizeText(String(rawType || ''));
  if (normalizedType.includes('maternity') || normalizedType.includes('thai san')) return 'MATERNITY';
  if (normalizedType.includes('unpaid') || normalizedType.includes('khong luong')) return 'UNPAID';
  if (normalizedType.includes('sick') || normalizedType.includes('om')) return 'SICK';
  if (normalizedType.includes('annual') || normalizedType.includes('phep')) return 'ANNUAL';

  const normalizedReason = normalizeText(String(reason || ''));
  if (normalizedReason.includes('thai san') || normalizedReason.includes('sinh con')) return 'MATERNITY';
  if (normalizedReason.includes('khong luong')) return 'UNPAID';
  if (normalizedReason.includes('om') || normalizedReason.includes('benh')) return 'SICK';
  return 'ANNUAL';
};

const inferLeaveStatus = (value: any): LeaveStatus => {
  const key = String(value || '').toUpperCase();
  if (key === 'APPROVED') return 'APPROVED';
  if (key === 'REJECTED') return 'REJECTED';
  return 'PENDING';
};

const extractAttachmentUrl = (row: any): string => {
  const direct =
    row?.attachment_url ||
    row?.dinh_kem ||
    row?.file_url ||
    row?.hinh_anh ||
    row?.image_url ||
    '';

  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  const reason = String(row?.ly_do || '');
  const urlMatch = reason.match(/https?:\/\/\S+/i);
  return urlMatch ? urlMatch[0] : '';
};

const createSampleAttachment = (title: string, hue = '#c9a96e'): string => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='880' height='520'>
  <defs>
    <linearGradient id='bg' x1='0' x2='1' y1='0' y2='1'>
      <stop offset='0%' stop-color='#0f172a'/>
      <stop offset='100%' stop-color='#111827'/>
    </linearGradient>
  </defs>
  <rect width='880' height='520' rx='24' fill='url(#bg)'/>
  <rect x='28' y='28' width='824' height='464' rx='18' fill='none' stroke='${hue}' stroke-opacity='0.55' stroke-width='2'/>
  <text x='64' y='120' fill='${hue}' font-size='34' font-family='Verdana'>${title}</text>
  <text x='64' y='176' fill='#94a3b8' font-size='22' font-family='Verdana'>Tài liệu đính kèm mẫu cho demo quản lý nghỉ phép</text>
  <text x='64' y='230' fill='#cbd5e1' font-size='20' font-family='Verdana'>Spa Leave Approval Attachment</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const buildSampleDataset = (staffSource: any[] = []) => {
  const fallbackStaff = [
    { id: 901, name: 'Nguyễn Thị Mai', title: 'Kỹ thuật viên' },
    { id: 902, name: 'Lý Thị Ngọc', title: 'Chuyên viên da liễu' },
    { id: 903, name: 'Phan Thu Yến', title: 'Tư vấn viên' },
    { id: 904, name: 'Bùi Quang Huy', title: 'Trưởng ca' },
    { id: 905, name: 'Đỗ Hoàng Linh', title: 'Kỹ thuật viên' },
    { id: 906, name: 'Võ Trà My', title: 'Chuyên viên chăm sóc da' },
    { id: 907, name: 'Trần Minh Khang', title: 'Kỹ thuật viên' },
    { id: 908, name: 'Ngô Thanh Hà', title: 'Tư vấn viên' },
    { id: 909, name: 'Phạm Gia Hân', title: 'Kỹ thuật viên' },
    { id: 910, name: 'Lê Bảo Châu', title: 'Chuyên viên điều trị' },
  ];

  const staffRows: Array<{ ma_nhan_vien: number; ho_ten: string; chuc_vu: string; trang_thai: boolean }> = [];
  const usedIds = new Set<number>();

  staffSource.forEach((row: any) => {
    const id = toNumber(row?.ma_nhan_vien);
    const name = String(row?.ho_ten || '').trim();
    if (!id || !name || usedIds.has(id)) return;
    if (staffRows.length >= 10) return;
    staffRows.push({
      ma_nhan_vien: id,
      ho_ten: name,
      chuc_vu: row?.chuc_vu || 'Nhân viên Spa',
      trang_thai: Boolean(row?.trang_thai ?? true),
    });
    usedIds.add(id);
  });

  fallbackStaff.forEach((row) => {
    if (staffRows.length >= 10) return;
    if (usedIds.has(row.id)) return;
    staffRows.push({
      ma_nhan_vien: row.id,
      ho_ten: row.name,
      chuc_vu: row.title,
      trang_thai: true,
    });
    usedIds.add(row.id);
  });

  const now = new Date();
  const monthStart = startOfMonth(now);

  const day = (offset: number): string => toDateKey(addDays(monthStart, offset));
  const at = (offset: number, hhmm: string): string => `${day(offset)}T${hhmm}:00`;

  const rows = [
    {
      ma_nghi_phep: 8101,
      ma_nhan_vien: staffRows[0].ma_nhan_vien,
      ngay_bat_dau: day(1),
      ngay_ket_thuc: day(2),
      ly_do: 'Phép năm: về quê thăm gia đình.',
      trang_thai: 'APPROVED',
      ngay_tao: at(0, '09:10'),
      ngay_duyet: at(0, '17:45'),
      ghi_chu_duyet: 'Bàn giao lịch hẹn đầy đủ, phê duyệt.',
      loai_nghi: 'ANNUAL',
    },
    {
      ma_nghi_phep: 8102,
      ma_nhan_vien: staffRows[1].ma_nhan_vien,
      ngay_bat_dau: day(4),
      ngay_ket_thuc: day(4),
      ly_do: 'Ốm sốt virus, cần nghỉ 1 ngày để theo dõi tại nhà.',
      trang_thai: 'PENDING',
      ngay_tao: at(3, '08:30'),
      loai_nghi: 'SICK',
      dinh_kem: createSampleAttachment('Giay Kham Benh - Ly Thi Ngoc', '#7dd3fc'),
    },
    {
      ma_nghi_phep: 8103,
      ma_nhan_vien: staffRows[2].ma_nhan_vien,
      ngay_bat_dau: day(6),
      ngay_ket_thuc: day(8),
      ly_do: 'Không lương: xử lý việc gia đình gấp ở tỉnh.',
      trang_thai: 'REJECTED',
      ngay_tao: at(5, '15:20'),
      ngay_duyet: at(5, '18:05'),
      ghi_chu_duyet: 'Đang thiếu nhân sự tuần cao điểm, đề nghị dời lịch.',
      loai_nghi: 'UNPAID',
    },
    {
      ma_nghi_phep: 8104,
      ma_nhan_vien: staffRows[3].ma_nhan_vien,
      ngay_bat_dau: day(10),
      ngay_ket_thuc: day(13),
      ly_do: 'Thai sản: nghỉ trước sinh theo chỉ định của bác sĩ.',
      trang_thai: 'APPROVED',
      ngay_tao: at(9, '10:50'),
      ngay_duyet: at(9, '16:25'),
      ghi_chu_duyet: 'Đã bố trí nhân sự thay ca đủ thời gian.',
      loai_nghi: 'MATERNITY',
      dinh_kem: createSampleAttachment('Giay Xac Nhan Thai San', '#f9a8d4'),
    },
    {
      ma_nghi_phep: 8105,
      ma_nhan_vien: staffRows[4].ma_nhan_vien,
      ngay_bat_dau: day(13),
      ngay_ket_thuc: day(13),
      ly_do: 'Phép năm: tham gia lễ tốt nghiệp của người thân.',
      trang_thai: 'PENDING',
      ngay_tao: at(12, '20:10'),
      loai_nghi: 'ANNUAL',
    },
    {
      ma_nghi_phep: 8106,
      ma_nhan_vien: staffRows[5].ma_nhan_vien,
      ngay_bat_dau: day(15),
      ngay_ket_thuc: day(17),
      ly_do: 'Ốm: nghỉ theo chỉ định sau khi khám chuyên khoa hô hấp.',
      trang_thai: 'APPROVED',
      ngay_tao: at(14, '07:40'),
      ngay_duyet: at(14, '11:30'),
      ghi_chu_duyet: 'Yêu cầu cung cấp giấy khám đã hoàn tất.',
      loai_nghi: 'SICK',
      dinh_kem: createSampleAttachment('Don Thuoc Bac Si - Vo Tra My', '#93c5fd'),
    },
    {
      ma_nghi_phep: 8107,
      ma_nhan_vien: staffRows[6].ma_nhan_vien,
      ngay_bat_dau: day(17),
      ngay_ket_thuc: day(18),
      ly_do: 'Không lương: hỗ trợ gia đình làm thủ tục hành chính.',
      trang_thai: 'REJECTED',
      ngay_tao: at(16, '13:00'),
      ngay_duyet: at(16, '17:30'),
      ghi_chu_duyet: 'Đề xuất nghỉ trùng lịch workshop bắt buộc.',
      loai_nghi: 'UNPAID',
    },
    {
      ma_nghi_phep: 8108,
      ma_nhan_vien: staffRows[7].ma_nhan_vien,
      ngay_bat_dau: day(19),
      ngay_ket_thuc: day(21),
      ly_do: 'Phép năm: nghỉ dưỡng ngắn ngày đã đăng ký trước.',
      trang_thai: 'APPROVED',
      ngay_tao: at(15, '09:25'),
      ngay_duyet: at(15, '15:12'),
      ghi_chu_duyet: 'Phê duyệt theo kế hoạch nhân sự tháng.',
      loai_nghi: 'ANNUAL',
    },
    {
      ma_nghi_phep: 8109,
      ma_nhan_vien: staffRows[8].ma_nhan_vien,
      ngay_bat_dau: day(23),
      ngay_ket_thuc: day(23),
      ly_do: 'Ốm: tái khám sau tiểu phẫu theo lịch bệnh viện.',
      trang_thai: 'PENDING',
      ngay_tao: at(22, '18:40'),
      loai_nghi: 'SICK',
      dinh_kem: createSampleAttachment('Phieu Tai Kham - Pham Gia Han', '#67e8f9'),
    },
    {
      ma_nghi_phep: 8110,
      ma_nhan_vien: staffRows[9].ma_nhan_vien,
      ngay_bat_dau: day(25),
      ngay_ket_thuc: day(29),
      ly_do: 'Thai sản: nghỉ theo kế hoạch thai kỳ được phê duyệt.',
      trang_thai: 'APPROVED',
      ngay_tao: at(18, '09:00'),
      ngay_duyet: at(18, '11:10'),
      ghi_chu_duyet: 'Đã hoàn tất bàn giao khách VIP và ca trực.',
      loai_nghi: 'MATERNITY',
      dinh_kem: createSampleAttachment('So Kham Thai Dinh Ky', '#f9a8d4'),
    },
  ];

  return {
    staffRows,
    leaveRows: rows,
  };
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

export default function LeaveManager() {
  const { user } = useAuth();
  const canApprove = Boolean(
    user?.vai_tros?.includes('ADMIN') || user?.vai_tros?.includes('RECEPTIONIST'),
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [usingSample, setUsingSample] = useState(false);

  const [staffRows, setStaffRows] = useState<any[]>([]);
  const [leaveRows, setLeaveRows] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeaveStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | LeaveType>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [monthAnchor, setMonthAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [hoveredDayKey, setHoveredDayKey] = useState('');

  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [decisionPreset, setDecisionPreset] = useState<LeaveStatus | null>(null);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();

  const loadData = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const [leaveRes, fetchedStaffRows] = await Promise.all([
        leavesApi.list(undefined, undefined),
        fetchAllPages((pageIndex, pageSizeValue) => staffApi.list(pageIndex, pageSizeValue)),
      ]);

      const fetchedLeaveRows = leaveRes?.success ? leaveRes.data || [] : [];

      if (fetchedLeaveRows.length === 0) {
        const sample = buildSampleDataset(fetchedStaffRows);
        setStaffRows(sample.staffRows);
        setLeaveRows(sample.leaveRows);
        setUsingSample(true);
        setError('Chưa có đơn nghỉ phép thực tế, đang hiển thị dữ liệu mẫu để vận hành giao diện.');
      } else {
        setStaffRows(fetchedStaffRows);
        setLeaveRows(fetchedLeaveRows);
        setUsingSample(false);
      }

      setPage(1);
    } catch (err: any) {
      const sample = buildSampleDataset();
      setStaffRows(sample.staffRows);
      setLeaveRows(sample.leaveRows);
      setUsingSample(true);
      setPage(1);
      setError((err?.message || 'Không thể tải dữ liệu nghỉ phép') + '. Đã chuyển sang dữ liệu mẫu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const staffMembers = useMemo<StaffMember[]>(() => {
    return staffRows
      .map((row) => {
        const id = toNumber(row.ma_nhan_vien);
        if (!id) return null;
        const name = row.ho_ten || `Nhân viên #${id}`;
        return {
          id,
          name,
          title: row.chuc_vu || 'Nhân viên Spa',
          initials: initialsOf(name),
        } as StaffMember;
      })
      .filter(Boolean) as StaffMember[];
  }, [staffRows]);

  const staffById = useMemo(() => {
    const map = new Map<number, StaffMember>();
    staffMembers.forEach((staff) => map.set(staff.id, staff));
    return map;
  }, [staffMembers]);

  const leaveRecords = useMemo<LeaveRecord[]>(() => {
    return leaveRows
      .map((row) => {
        const id = toNumber(row.ma_nghi_phep);
        const staffId = toNumber(row.ma_nhan_vien);
        if (!id || !staffId) return null;

        const staff = staffById.get(staffId);
        const fromDate = toDateKey(row.ngay_bat_dau);
        const toDate = toDateKey(row.ngay_ket_thuc || row.ngay_bat_dau || row.ngay_tao);
        if (!fromDate || !toDate) return null;

        const reason = String(row.ly_do || '').trim();

        return {
          id,
          staffId,
          staffName: staff?.name || row.ho_ten_nhan_vien || `Nhân viên #${staffId}`,
          leaveType: inferLeaveType(row.loai_nghi || row.leave_type, reason),
          fromDate,
          toDate,
          days: countDaysInclusive(fromDate, toDate),
          reason: reason || 'Không có lý do',
          submittedAt: row.ngay_tao || row.created_at || fromDate,
          status: inferLeaveStatus(row.trang_thai),
          approvedAt: row.ngay_duyet || row.approved_at || '',
          approvalNote: String(row.ghi_chu_duyet || '').trim(),
          attachmentUrl: extractAttachmentUrl(row),
        } as LeaveRecord;
      })
      .filter(Boolean)
      .sort((a: LeaveRecord, b: LeaveRecord) => {
        const aTime = toDateSafe(a.submittedAt)?.getTime() || 0;
        const bTime = toDateSafe(b.submittedAt)?.getTime() || 0;
        return bTime - aTime;
      });
  }, [leaveRows, staffById]);

  const kpis = useMemo(() => {
    const month = now.getMonth();
    const year = now.getFullYear();

    const pending = leaveRecords.filter((item) => item.status === 'PENDING').length;
    const approvedThisMonth = leaveRecords.filter((item) => {
      if (item.status !== 'APPROVED') return false;
      const ref = toDateSafe(item.approvedAt || item.submittedAt || item.fromDate);
      return Boolean(ref && ref.getMonth() === month && ref.getFullYear() === year);
    }).length;
    const rejected = leaveRecords.filter((item) => item.status === 'REJECTED').length;
    const usedDaysYear = leaveRecords
      .filter((item) => item.status === 'APPROVED')
      .reduce((sum, item) => sum + countOverlapDaysInYear(item.fromDate, item.toDate, year), 0);

    return {
      pending,
      approvedThisMonth,
      rejected,
      usedDaysYear,
    };
  }, [leaveRecords, now]);

  const filteredRecords = useMemo(() => {
    const keyword = normalizeText(search);

    return leaveRecords.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && item.leaveType !== typeFilter) return false;
      if (!keyword) return true;

      const typeLabel = LEAVE_TYPE_META[item.leaveType].label;
      return (
        normalizeText(item.staffName).includes(keyword) ||
        normalizeText(typeLabel).includes(keyword) ||
        normalizeText(item.reason).includes(keyword)
      );
    });
  }, [leaveRecords, search, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page]);

  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonth(monthAnchor);
    const gridStart = startOfWeekMonday(monthStart);
    return Array.from({ length: 42 }, (_, idx) => addDays(gridStart, idx));
  }, [monthAnchor]);

  const monthLabel = useMemo(
    () => `Tháng ${String(monthAnchor.getMonth() + 1).padStart(2, '0')}/${monthAnchor.getFullYear()}`,
    [monthAnchor],
  );

  const leavesByDay = useMemo(() => {
    const map = new Map<string, LeaveRecord[]>();

    leaveRecords.forEach((leave) => {
      const start = toDateSafe(leave.fromDate);
      const end = toDateSafe(leave.toDate);
      if (!start || !end) return;

      for (let cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
        const key = toDateKey(cursor);
        const list = map.get(key) || [];
        list.push(leave);
        map.set(key, list);
      }
    });

    map.forEach((items) => {
      items.sort((a, b) => a.staffName.localeCompare(b.staffName));
    });

    return map;
  }, [leaveRecords]);

  const teamBalanceRows = useMemo(() => {
    const staffPool = staffMembers.length > 0
      ? staffMembers
      : Array.from(
          new Set(leaveRecords.map((item) => item.staffId)),
        ).map((staffId) => ({
          id: staffId,
          name: leaveRecords.find((item) => item.staffId === staffId)?.staffName || `Nhân viên #${staffId}`,
          title: 'Nhân viên Spa',
          initials: initialsOf(leaveRecords.find((item) => item.staffId === staffId)?.staffName || 'NV'),
        }));

    return staffPool
      .map((staff) => {
        const used = leaveRecords
          .filter((item) => item.status === 'APPROVED' && item.staffId === staff.id)
          .reduce((sum, item) => sum + countOverlapDaysInYear(item.fromDate, item.toDate, currentYear), 0);

        const remaining = Math.max(0, ANNUAL_LEAVE_QUOTA - used);
        const ratio = ANNUAL_LEAVE_QUOTA > 0 ? remaining / ANNUAL_LEAVE_QUOTA : 0;
        const level =
          ratio > 0.5
            ? 'high'
            : ratio > 0.2
              ? 'medium'
              : 'low';

        return {
          staffId: staff.id,
          name: staff.name,
          initials: staff.initials,
          used,
          remaining,
          ratio,
          level,
        };
      })
      .sort((a, b) => a.remaining - b.remaining || a.name.localeCompare(b.name));
  }, [staffMembers, leaveRecords, currentYear]);

  const openLeaveModal = (record: LeaveRecord, preset: LeaveStatus | null = null) => {
    setSelectedLeave(record);
    setDecisionError('');
    setDecisionPreset(preset);
    setDecisionNote(record.approvalNote || '');
  };

  const closeLeaveModal = () => {
    setSelectedLeave(null);
    setDecisionError('');
    setDecisionPreset(null);
    setDecisionNote('');
    setSubmittingDecision(false);
  };

  const canDecideCurrent = Boolean(
    selectedLeave &&
      selectedLeave.status === 'PENDING' &&
      canApprove,
  );

  const handleDecision = async (status: LeaveStatus) => {
    if (!selectedLeave || !canDecideCurrent) return;
    setSubmittingDecision(true);
    setDecisionError('');

    try {
      if (usingSample) {
        setLeaveRows((prev) =>
          prev.map((row) =>
            toNumber(row.ma_nghi_phep) === selectedLeave.id
              ? {
                  ...row,
                  trang_thai: status,
                  ghi_chu_duyet: decisionNote.trim() || null,
                  ngay_duyet: new Date().toISOString(),
                }
              : row,
          ),
        );
      } else {
        const res = await leavesApi.approve(selectedLeave.id, {
          trang_thai: status,
          ghi_chu_duyet: decisionNote.trim() || undefined,
        });

        if (!res?.success) {
          throw new Error(res?.message || 'Không thể cập nhật trạng thái đơn nghỉ phép');
        }
      }

      closeLeaveModal();
      if (!usingSample) {
        await loadData(true);
      }
    } catch (err: any) {
      setDecisionError(err?.message || 'Không thể xử lý yêu cầu nghỉ phép');
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-animate-in flex items-center justify-center h-[64vh]">
        <div className="w-10 h-10 border-4 border-amber-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-leavemgr-page admin-animate-in space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="admin-leavemgr-heading">Spa Leave Request Management</h1>
        </div>

        <button className="admin-btn admin-btn-secondary" onClick={() => loadData(true)} disabled={refreshing}>
          <RefreshCcw size={15} /> {refreshing ? 'Đang làm mới...' : 'Làm mới'}
        </button>
      </div>

      {error && <p className="admin-leavemgr-alert">{error}</p>}


      <div className="admin-leavemgr-main">
        <div className="space-y-4">


          <div className="admin-card admin-leavemgr-table-card">
            <div className="admin-leavemgr-table-head">
              <div>
                <h3>Danh sách đơn nghỉ</h3>
                <p>{filteredRecords.length} đơn phù hợp bộ lọc</p>
              </div>

              <div className="filters">
                <input
                  className="admin-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo tên nhân viên, loại nghỉ, lý do..."
                />
                <select
                  className="admin-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'ALL' | LeaveStatus)}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="APPROVED">Đã duyệt</option>
                  <option value="REJECTED">Từ chối</option>
                </select>
                <select
                  className="admin-select"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as 'ALL' | LeaveType)}
                >
                  <option value="ALL">Tất cả loại nghỉ</option>
                  <option value="ANNUAL">Phép năm</option>
                  <option value="SICK">Ốm</option>
                  <option value="UNPAID">Không lương</option>
                  <option value="MATERNITY">Thai sản</option>
                </select>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="admin-empty min-h-[220px]">
                <CalendarDays className="admin-empty-icon" />
                <p>Không có đơn nghỉ phép phù hợp bộ lọc.</p>
              </div>
            ) : (
              <>
                <div className="admin-leavemgr-table-wrap">
                  <table className="admin-table admin-leavemgr-table">
                    <thead>
                      <tr>
                        <th>Nhân viên</th>
                        <th>Loại nghỉ</th>
                        <th>Từ ngày</th>
                        <th>Đến ngày</th>
                        <th>Số ngày</th>
                        <th>Lý do</th>
                        <th>Ngày gửi</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((leave) => {
                        const statusMeta = STATUS_META[leave.status];
                        const staff = staffById.get(leave.staffId);

                        return (
                          <tr key={`leave-row-${leave.id}`} className={leave.status === 'PENDING' ? 'is-pending' : ''}>
                            <td>
                              <div className="staff-cell">
                                <span className="avatar">{staff?.initials || initialsOf(leave.staffName)}</span>
                                <div>
                                  <p>{leave.staffName}</p>
                                  <span>{staff?.title || 'Nhân viên Spa'}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`type-badge ${leave.leaveType.toLowerCase()}`}>{LEAVE_TYPE_META[leave.leaveType].label}</span>
                            </td>
                            <td>{formatDate(leave.fromDate)}</td>
                            <td>{formatDate(leave.toDate)}</td>
                            <td>{leave.days}</td>
                            <td title={leave.reason}>
                              <span className="reason">{truncateText(leave.reason, 62)}</span>
                            </td>
                            <td>{formatDate(leave.submittedAt)}</td>
                            <td>
                              <span className={`status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
                            </td>
                            <td>
                              <div className="row-actions">
                                {canApprove && leave.status === 'PENDING' && (
                                  <>
                                    <button className="action-btn approve" onClick={() => openLeaveModal(leave, 'APPROVED')}>
                                      <Check size={13} /> Duyệt
                                    </button>
                                    <button className="action-btn reject" onClick={() => openLeaveModal(leave, 'REJECTED')}>
                                      <X size={13} /> Từ chối
                                    </button>
                                  </>
                                )}
                                <button className="action-btn view" onClick={() => openLeaveModal(leave, null)}>
                                  <Eye size={13} /> Xem
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="admin-pagination mt-3">
                    <span>
                      Trang {page} / {totalPages} ({filteredRecords.length} đơn)
                    </span>
                    <div className="admin-pagination-btns">
                      <button onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                        <ChevronLeft size={14} />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                        let startPage = Math.max(1, page - 2);
                        if (startPage + 4 > totalPages) {
                          startPage = Math.max(1, totalPages - 4);
                        }
                        const target = startPage + idx;
                        return (
                          <button
                            key={`page-${target}`}
                            className={target === page ? 'active' : ''}
                            onClick={() => setPage(target)}
                          >
                            {target}
                          </button>
                        );
                      })}
                      <button onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="admin-card admin-leavemgr-balance">
          <div className="head">
            <h3>My Team Leave Balance</h3>
            <p>Năm {currentYear} • Quota {ANNUAL_LEAVE_QUOTA} ngày</p>
          </div>

          <div className="list">
            {teamBalanceRows.map((item) => (
              <div key={`balance-${item.staffId}`} className="item">
                <div className="meta">
                  <span className="avatar">{item.initials}</span>
                  <div className="text">
                    <p>{item.name}</p>
                    <span>
                      Đã dùng {item.used} / Còn lại {item.remaining} ngày
                    </span>
                  </div>
                </div>
                <div className="progress">
                  <div className={`fill ${item.level}`} style={{ width: `${Math.max(0, Math.min(100, item.ratio * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {selectedLeave && (
        <div className="admin-modal-overlay" onClick={closeLeaveModal}>
          <div className="admin-modal admin-modal-animate admin-leavemgr-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Phê duyệt đơn nghỉ phép #{selectedLeave.id}</h3>
              <button className="admin-btn-icon" onClick={closeLeaveModal}>✕</button>
            </div>

            <div className="admin-modal-body admin-leavemgr-modal-body">
              <div className="top">
                <div className="staff">
                  <span className="avatar">{initialsOf(selectedLeave.staffName)}</span>
                  <div>
                    <p>{selectedLeave.staffName}</p>
                    <span>{LEAVE_TYPE_META[selectedLeave.leaveType].label}</span>
                  </div>
                </div>
                <span className={`status-badge ${STATUS_META[selectedLeave.status].className}`}>
                  {STATUS_META[selectedLeave.status].label}
                </span>
              </div>

              <div className="info-grid">
                <div className="card">
                  <p className="label">Từ ngày</p>
                  <p className="value">{formatDate(selectedLeave.fromDate)}</p>
                </div>
                <div className="card">
                  <p className="label">Đến ngày</p>
                  <p className="value">{formatDate(selectedLeave.toDate)}</p>
                </div>
                <div className="card">
                  <p className="label">Số ngày</p>
                  <p className="value">{selectedLeave.days}</p>
                </div>
                <div className="card">
                  <p className="label">Ngày gửi</p>
                  <p className="value">{formatDateTime(selectedLeave.submittedAt)}</p>
                </div>
              </div>

              <div className="section">
                <p className="label">Lý do nghỉ</p>
                <p className="reason">{selectedLeave.reason}</p>
              </div>

              <div className="section">
                <p className="label">Ảnh đính kèm</p>
                {selectedLeave.attachmentUrl ? (
                  <div className="attachment">
                    <img src={selectedLeave.attachmentUrl} alt={`Đính kèm đơn nghỉ ${selectedLeave.id}`} />
                  </div>
                ) : (
                  <div className="attachment-empty">Không có ảnh đính kèm</div>
                )}
              </div>

              <div>
                <label className="admin-label">Ghi chú quyết định</label>
                <textarea
                  className="admin-input"
                  rows={4}
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  placeholder="Nhập ghi chú phê duyệt hoặc lý do từ chối..."
                />
              </div>

              {decisionError && <p className="decision-error">{decisionError}</p>}
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={closeLeaveModal} disabled={submittingDecision}>
                Đóng
              </button>
              <button
                className={`admin-btn admin-leavemgr-btn-reject ${decisionPreset === 'REJECTED' ? 'active' : ''}`}
                onClick={() => handleDecision('REJECTED')}
                disabled={!canDecideCurrent || submittingDecision}
              >
                <X size={14} /> {submittingDecision && decisionPreset === 'REJECTED' ? 'Đang xử lý...' : 'Từ chối'}
              </button>
              <button
                className={`admin-btn admin-leavemgr-btn-approve ${decisionPreset === 'APPROVED' ? 'active' : ''}`}
                onClick={() => handleDecision('APPROVED')}
                disabled={!canDecideCurrent || submittingDecision}
              >
                <Check size={14} /> {submittingDecision && decisionPreset === 'APPROVED' ? 'Đang xử lý...' : 'Phê duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
