import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ban,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Eye,
  FileUp,
  Gift,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react';

import { appointmentsApi, invoicesApi, productsApi, staffApi, usersApi } from '../../api/admin.api';

type MembershipTier = 'THUONG' | 'SILVER' | 'GOLD' | 'VIP_PLATINUM';
type ActivityFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'NEW30';
type SortOption = 'NEWEST' | 'SPEND_DESC' | 'LAST_VISIT';
type DetailTab = 'PROFILE' | 'HISTORY' | 'UPCOMING' | 'POINTS';
type HistoryPeriod = 'ALL' | '30D' | '90D' | '1Y';

interface ServiceHistoryItem {
  id: string;
  date: string;
  serviceName: string;
  staffName: string;
  amount: number;
  rating: number;
  status: string;
}

interface UpcomingAppointmentItem {
  id: string;
  date: string;
  status: string;
  services: string[];
}

interface PointsHistoryItem {
  id: string;
  date: string;
  change: number;
  reason: string;
}

interface VoucherItem {
  id: string;
  title: string;
  code: string;
  expireAt: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
}

interface CustomerRecord {
  id: number;
  name: string;
  phone: string;
  email: string;
  birthday?: string;
  address?: string;
  note?: string;
  active: boolean;
  points: number;
  tier: MembershipTier;
  createdAt?: string;
  visits: number;
  totalSpend: number;
  lastVisit?: string;
  favoriteService: string;
  history: ServiceHistoryItem[];
  upcomingAppointments: UpcomingAppointmentItem[];
  pointsHistory: PointsHistoryItem[];
  vouchers: VoucherItem[];
}

interface CustomerFormState {
  name: string;
  email: string;
  phone: string;
  birthday: string;
  address: string;
  note: string;
  password: string;
  active: boolean;
}

const CUSTOMER_NOTE_STORAGE_KEY = 'crm_customer_notes_v1';

const TIER_META: Record<MembershipTier, { label: string; icon: string; className: string; minPoints: number; nextPoints: number }> = {
  THUONG: { label: 'Thường', icon: '•', className: 'thuong', minPoints: 0, nextPoints: 250 },
  SILVER: { label: 'Silver', icon: '🥈', className: 'silver', minPoints: 250, nextPoints: 600 },
  GOLD: { label: 'Gold', icon: '🥇', className: 'gold', minPoints: 600, nextPoints: 1200 },
  VIP_PLATINUM: { label: 'VIP Platinum', icon: '👑', className: 'vip', minPoints: 1200, nextPoints: 1200 },
};

const AVATAR_GRADIENTS = [
  ['#34d399', '#0f766e'],
  ['#60a5fa', '#2563eb'],
  ['#f59e0b', '#d97706'],
  ['#f472b6', '#db2777'],
  ['#a78bfa', '#7c3aed'],
  ['#f97316', '#ea580c'],
  ['#22d3ee', '#0891b2'],
  ['#eab308', '#ca8a04'],
];

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dateToMs = (value?: string | null) => {
  const d = toDate(value);
  return d ? d.getTime() : 0;
};

const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`;

const formatDate = (value?: string | null) => {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: string | null) => {
  const d = toDate(value);
  if (!d) return '—';
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const initialsOf = (name: string) =>
  (name || 'KH')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'KH';

const avatarGradient = (id: number) => {
  const pair = AVATAR_GRADIENTS[Math.abs(id) % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
};

const normalizeRoles = (roles: any): string[] => {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => (typeof role === 'string' ? role : role?.ten_vai_tro))
    .filter(Boolean)
    .map((role) => String(role).toUpperCase());
};

const isInternalUser = (roles: string[]) => roles.some((role) => ['ADMIN', 'STAFF', 'RECEPTIONIST'].includes(role));

const normalizeTier = (rawTier: string, points: number, totalSpend: number, visits: number): MembershipTier => {
  const value = (rawTier || '').toLowerCase();

  if (value.includes('platinum') || (value.includes('vip') && value.includes('plat'))) return 'VIP_PLATINUM';
  if (value.includes('vip')) return 'VIP_PLATINUM';
  if (value.includes('gold')) return 'GOLD';
  if (value.includes('silver')) return 'SILVER';
  if (value.includes('thường') || value.includes('thuong') || value.includes('mới')) return 'THUONG';

  if (points >= 1200 || totalSpend >= 30000000 || visits >= 24) return 'VIP_PLATINUM';
  if (points >= 600 || totalSpend >= 15000000 || visits >= 14) return 'GOLD';
  if (points >= 250 || totalSpend >= 7000000 || visits >= 8) return 'SILVER';
  return 'THUONG';
};

const getPointsProgress = (customer: CustomerRecord) => {
  const tierMeta = TIER_META[customer.tier];
  if (customer.tier === 'VIP_PLATINUM') {
    return {
      currentLabel: 'VIP Platinum',
      nextLabel: 'Hạng tối đa',
      percent: 100,
      remaining: 0,
    };
  }

  const denominator = Math.max(1, tierMeta.nextPoints - tierMeta.minPoints);
  const percent = Math.max(0, Math.min(100, ((customer.points - tierMeta.minPoints) / denominator) * 100));
  const remaining = Math.max(0, tierMeta.nextPoints - customer.points);
  const nextLabel =
    customer.tier === 'THUONG' ? 'Silver' :
    customer.tier === 'SILVER' ? 'Gold' :
    'VIP Platinum';

  return {
    currentLabel: tierMeta.label,
    nextLabel,
    percent,
    remaining,
  };
};

const loadCustomerNotes = (): Record<number, string> => {
  try {
    const raw = localStorage.getItem(CUSTOMER_NOTE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const normalized: Record<number, string> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const id = toNumber(key);
      if (id > 0) normalized[id] = String(value || '');
    });
    return normalized;
  } catch {
    return {};
  }
};

const saveCustomerNotes = (notes: Record<number, string>) => {
  localStorage.setItem(CUSTOMER_NOTE_STORAGE_KEY, JSON.stringify(notes));
};

const buildVouchers = (tier: MembershipTier, customerId: number): VoucherItem[] => {
  const now = new Date();
  const vouchers: VoucherItem[] = [];

  const addDays = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  vouchers.push({
    id: `welcome-${customerId}`,
    title: 'Ưu đãi sinh nhật',
    code: `BDAY${String(customerId).slice(-4)}`,
    expireAt: addDays(30),
    status: 'ACTIVE',
  });

  if (tier === 'SILVER' || tier === 'GOLD' || tier === 'VIP_PLATINUM') {
    vouchers.push({
      id: `tier-offer-${customerId}`,
      title: tier === 'SILVER' ? 'Giảm 5% dịch vụ' : tier === 'GOLD' ? 'Giảm 10% dịch vụ' : 'Giảm 15% dịch vụ cao cấp',
      code: `TIER${String(customerId).slice(-3)}`,
      expireAt: addDays(45),
      status: 'ACTIVE',
    });
  }

  if (tier === 'VIP_PLATINUM') {
    vouchers.push({
      id: `vip-spa-${customerId}`,
      title: 'Miễn phí nâng cấp liệu trình',
      code: `VIPUP${String(customerId).slice(-2)}`,
      expireAt: addDays(60),
      status: 'ACTIVE',
    });
  }

  return vouchers;
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

const buildSampleCustomers = (): CustomerRecord[] => {
  const names = [
    'Nguyễn Thị Mai Anh', 'Trần Văn Minh', 'Lê Hoàng Yến', 'Phạm Quốc Bảo', 'Đỗ Thu Hà',
    'Võ Gia Hân', 'Bùi Thanh Tùng', 'Ngô Mỹ Linh', 'Phan Khánh Vy', 'Hoàng Đức Long',
    'Đặng Quỳnh Như', 'Lý Minh Khang', 'Tạ Hoài Phương', 'Đinh Bảo Ngọc', 'Vũ Nhật Nam',
    'Mai Thanh Trúc', 'Châu Hải An', 'Đoàn Tuấn Anh', 'Tống Hồng Nhung', 'La Gia Bảo',
  ];

  const servicePool = [
    'Massage thư giãn 90\'',
    'Chăm sóc da chuyên sâu',
    'Liệu trình đá nóng',
    'Gội đầu dưỡng sinh',
    'Nâng cơ mặt RF',
    'Thải độc body detox',
  ];

  const staffPool = ['Lê Thảo My', 'Võ Ngọc Linh', 'Phạm Huy Hoàng', 'Trần An Nhiên'];

  return names.map((name, idx) => {
    const id = 2000 + idx;
    const created = new Date();
    created.setDate(created.getDate() - (idx * 13 + 4));

    const visits = 2 + ((idx * 3) % 15);
    const history: ServiceHistoryItem[] = Array.from({ length: visits }, (_, visitIdx) => {
      const date = new Date();
      date.setDate(date.getDate() - (visitIdx * 9 + idx));
      date.setHours(9 + (visitIdx % 8), (visitIdx % 2) * 30, 0, 0);

      const serviceName = servicePool[(idx + visitIdx) % servicePool.length];
      const amount = 300000 + ((idx + visitIdx) % 9) * 220000;
      return {
        id: `sample-history-${id}-${visitIdx}`,
        date: date.toISOString(),
        serviceName,
        staffName: staffPool[(idx + visitIdx) % staffPool.length],
        amount,
        rating: 3 + ((idx + visitIdx) % 3),
        status: 'COMPLETED',
      };
    }).sort((a, b) => dateToMs(b.date) - dateToMs(a.date));

    const upcomingAppointments: UpcomingAppointmentItem[] = Array.from({ length: idx % 3 }, (_, upIdx) => {
      const date = new Date();
      date.setDate(date.getDate() + upIdx + 2 + (idx % 4));
      date.setHours(10 + upIdx, 0, 0, 0);
      return {
        id: `sample-upcoming-${id}-${upIdx}`,
        date: date.toISOString(),
        status: upIdx % 2 === 0 ? 'CONFIRMED' : 'PENDING',
        services: [servicePool[(idx + upIdx + 1) % servicePool.length]],
      };
    });

    const totalSpend = history.reduce((sum, row) => sum + row.amount, 0);
    const points = Math.floor(totalSpend / 12000);
    const tier = normalizeTier('', points, totalSpend, visits);

    const pointsHistory: PointsHistoryItem[] = history.slice(0, 10).map((row, pointIdx) => ({
      id: `sample-point-${id}-${pointIdx}`,
      date: row.date,
      change: Math.max(8, Math.round(row.amount / 20000)),
      reason: `Tích điểm từ dịch vụ ${row.serviceName}`,
    }));

    return {
      id,
      name,
      phone: `09${String(10000000 + idx * 791).slice(-8)}`,
      email: `${name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z\s]/g, '')
        .trim()
        .replace(/\s+/g, '.')}@nhaspa.com`,
      birthday: `199${idx % 9}-0${(idx % 9) + 1}-1${idx % 9}`,
      address: `${20 + idx} Nguyễn Trãi, Quận ${(idx % 10) + 1}, TP.HCM`,
      note: idx % 2 === 0 ? 'Ưa thích massage đá nóng và lịch cuối tuần.' : 'Khách thường đặt trước 2-3 ngày.',
      active: idx % 9 !== 0,
      points,
      tier,
      createdAt: created.toISOString(),
      visits,
      totalSpend,
      lastVisit: history[0]?.date,
      favoriteService: history[0]?.serviceName || '—',
      history,
      upcomingAppointments,
      pointsHistory,
      vouchers: buildVouchers(tier, id),
    };
  });
};

const defaultCustomerForm = (): CustomerFormState => ({
  name: '',
  email: '',
  phone: '',
  birthday: '',
  address: '',
  note: '',
  password: 'Spa@123456',
  active: true,
});

export default function UsersManager() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [usingSample, setUsingSample] = useState(false);

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customerRoleId, setCustomerRoleId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | MembershipTier>('ALL');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST');

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [detailTab, setDetailTab] = useState<DetailTab>('PROFILE');
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(defaultCustomerForm());

  const [customerNotes, setCustomerNotes] = useState<Record<number, string>>(() => loadCustomerNotes());

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importingFile, setImportingFile] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) || null,
    [customers, selectedCustomerId],
  );

  const fetchAllPages = async (fetchFn: (page: number, pageSize: number) => Promise<any>) => {
    const rows: any[] = [];
    let pageIndex = 1;
    let totalPages = 1;

    do {
      const res = await fetchFn(pageIndex, 120);
      if (!res.success) {
        throw new Error(res.message || 'Không thể tải dữ liệu');
      }
      rows.push(...(Array.isArray(res.data) ? res.data : []));
      totalPages = Math.max(1, toNumber(res?.meta?.total_pages || 1));
      pageIndex += 1;
    } while (pageIndex <= totalPages);

    return rows;
  };

  const loadData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [rolesRes, rawUsers, rawAppointments, rawInvoices, rawStaffs, rawProducts] = await Promise.all([
        usersApi.roles(),
        fetchAllPages((pageIndex, pageSizeValue) => usersApi.list(pageIndex, pageSizeValue)),
        fetchAllPages((pageIndex, pageSizeValue) => appointmentsApi.list(pageIndex, pageSizeValue)),
        fetchAllPages((pageIndex, pageSizeValue) => invoicesApi.list(pageIndex, pageSizeValue)),
        fetchAllPages((pageIndex, pageSizeValue) => staffApi.list(pageIndex, pageSizeValue)),
        fetchAllPages((pageIndex, pageSizeValue) => productsApi.list(pageIndex, pageSizeValue)),
      ]);

      if (rolesRes.success) {
        const roles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
        const customerRole = roles.find((role: any) => String(role.ten_vai_tro || '').toUpperCase() === 'CUSTOMER');
        setCustomerRoleId(customerRole ? toNumber(customerRole.ma_vai_tro) : null);
      }

      const productNameMap = new Map<number, string>();
      const productPriceMap = new Map<number, number>();
      rawProducts.forEach((product: any) => {
        const productId = toNumber(product.ma_san_pham);
        if (productId <= 0) return;
        productNameMap.set(productId, product.ten_san_pham || `Dịch vụ #${productId}`);
        productPriceMap.set(productId, toNumber(product?.bang_gias?.[0]?.gia));
      });

      const staffNameMap = new Map<number, string>();
      rawStaffs.forEach((staff: any) => {
        const staffId = toNumber(staff.ma_nhan_vien);
        if (staffId <= 0) return;
        staffNameMap.set(staffId, staff.ho_ten || `Nhân viên #${staffId}`);
      });

      const appointmentsByCustomer = new Map<number, any[]>();
      rawAppointments.forEach((appt: any) => {
        const customerId = toNumber(appt.ma_khach_hang);
        if (customerId <= 0) return;
        if (!appointmentsByCustomer.has(customerId)) appointmentsByCustomer.set(customerId, []);
        appointmentsByCustomer.get(customerId)!.push(appt);
      });

      const invoicesByCustomer = new Map<number, any[]>();
      rawInvoices.forEach((inv: any) => {
        const customerId = toNumber(inv.ma_khach_hang);
        if (customerId <= 0) return;
        if (!invoicesByCustomer.has(customerId)) invoicesByCustomer.set(customerId, []);
        invoicesByCustomer.get(customerId)!.push(inv);
      });

      const transformedCustomers: CustomerRecord[] = rawUsers
        .map((user: any) => {
          const customerId = toNumber(user.ma_nguoi_dung);
          const roles = normalizeRoles(user.vai_tros);
          if (isInternalUser(roles)) return null;

          const appointments = appointmentsByCustomer.get(customerId) || [];
          const invoices = invoicesByCustomer.get(customerId) || [];

          const history: ServiceHistoryItem[] = [];
          appointments.forEach((appt: any) => {
            const dateValue = `${appt.ngay_hen || ''}T${String(appt.gio_bat_dau || '09:00:00')}`;
            const status = String(appt.trang_thai || '').toUpperCase();
            const details = Array.isArray(appt.chi_tiets) ? appt.chi_tiets : [];

            details.forEach((detail: any, detailIdx: number) => {
              const serviceId = toNumber(detail.ma_san_pham);
              const staffId = toNumber(detail.ma_nhan_vien);
              const amount = Math.max(0, toNumber(detail.gia || productPriceMap.get(serviceId) || 0));
              const serviceName = detail.ten_san_pham || productNameMap.get(serviceId) || `Dịch vụ #${serviceId || 1}`;
              const staffName = detail.ho_ten_nhan_vien || staffNameMap.get(staffId) || 'Chưa gán';
              const rating = 3 + ((customerId + serviceId + detailIdx) % 3);

              history.push({
                id: `history-${appt.ma_lich_hen}-${detail.ma_chi_tiet || detailIdx}`,
                date: dateValue,
                serviceName,
                staffName,
                amount,
                rating,
                status,
              });
            });
          });

          history.sort((a, b) => dateToMs(b.date) - dateToMs(a.date));

          const validAppointmentStatuses = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']);
          const validVisits = appointments.filter((appt: any) => validAppointmentStatuses.has(String(appt.trang_thai || '').toUpperCase()));
          const visits = validVisits.length;

          const lastVisit = history[0]?.date || undefined;

          const now = Date.now();
          const upcomingAppointments: UpcomingAppointmentItem[] = appointments
            .map((appt: any) => {
              const dateValue = `${appt.ngay_hen || ''}T${String(appt.gio_bat_dau || '09:00:00')}`;
              const status = String(appt.trang_thai || '').toUpperCase();
              const appointmentDate = dateToMs(dateValue);
              const details = Array.isArray(appt.chi_tiets) ? appt.chi_tiets : [];
              const services = details.map((detail: any) => {
                const serviceId = toNumber(detail.ma_san_pham);
                return detail.ten_san_pham || productNameMap.get(serviceId) || `Dịch vụ #${serviceId || 1}`;
              });

              return {
                id: `upcoming-${appt.ma_lich_hen}`,
                date: dateValue,
                status,
                services,
                appointmentDate,
              };
            })
            .filter((row: any) => row.appointmentDate > now && !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(row.status))
            .sort((a: any, b: any) => a.appointmentDate - b.appointmentDate)
            .map((row: any) => ({
              id: row.id,
              date: row.date,
              status: row.status,
              services: row.services,
            }));

          let totalSpend = 0;
          invoices.forEach((invoice: any) => {
            const status = String(invoice.trang_thai || '').toUpperCase();
            const amount = Math.max(0, toNumber(invoice.thanh_tien));
            if (status === 'PAID') totalSpend += amount;
            if (status === 'REFUNDED') totalSpend -= amount;
          });
          totalSpend = Math.max(0, totalSpend);

          const points = Math.max(0, toNumber(user.diem_tich_luy));
          const tier = normalizeTier(user.hang_thanh_vien || '', points, totalSpend, visits);

          const favoriteService = (() => {
            const counts = new Map<string, number>();
            history.forEach((row) => {
              counts.set(row.serviceName, (counts.get(row.serviceName) || 0) + 1);
            });
            const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
            return sorted[0]?.[0] || '—';
          })();

          const pointsHistory: PointsHistoryItem[] = [];
          invoices
            .slice()
            .sort((a: any, b: any) => dateToMs(b.ngay_tao) - dateToMs(a.ngay_tao))
            .forEach((invoice: any) => {
              const status = String(invoice.trang_thai || '').toUpperCase();
              const createdAt = invoice.ngay_tao || new Date().toISOString();
              const invoiceCode = `#HD-${invoice.ma_hoa_don}`;

              const earned = Math.max(0, toNumber(invoice.diem_tich_luy));
              if (status === 'PAID' && earned > 0) {
                pointsHistory.push({
                  id: `point-plus-${invoice.ma_hoa_don}`,
                  date: createdAt,
                  change: earned,
                  reason: `Tích điểm từ hóa đơn ${invoiceCode}`,
                });
              }

              const used = Math.max(0, toNumber(invoice.diem_su_dung));
              if (used > 0) {
                pointsHistory.push({
                  id: `point-minus-${invoice.ma_hoa_don}`,
                  date: createdAt,
                  change: -used,
                  reason: `Đổi điểm tại hóa đơn ${invoiceCode}`,
                });
              }

              if (status === 'REFUNDED' && earned > 0) {
                pointsHistory.push({
                  id: `point-refund-${invoice.ma_hoa_don}`,
                  date: createdAt,
                  change: -earned,
                  reason: `Hoàn điểm do hoàn tiền hóa đơn ${invoiceCode}`,
                });
              }
            });

          if (pointsHistory.length === 0) {
            pointsHistory.push({
              id: `point-welcome-${customerId}`,
              date: user.ngay_tao || new Date().toISOString(),
              change: Math.max(0, Math.min(80, points)),
              reason: 'Điểm chào mừng khi đăng ký khách hàng',
            });
          }

          pointsHistory.sort((a, b) => dateToMs(b.date) - dateToMs(a.date));

          return {
            id: customerId,
            name: user.ho_ten || `Khách hàng #${customerId}`,
            phone: user.so_dien_thoai || '—',
            email: user.email || '—',
            birthday: user.ngay_sinh ? String(user.ngay_sinh).slice(0, 10) : '',
            address: user.dia_chi || '',
            note: customerNotes[customerId] || '',
            active: Boolean(user.trang_thai),
            points,
            tier,
            createdAt: user.ngay_tao,
            visits,
            totalSpend,
            lastVisit,
            favoriteService,
            history,
            upcomingAppointments,
            pointsHistory,
            vouchers: buildVouchers(tier, customerId),
          } as CustomerRecord;
        })
        .filter(Boolean) as CustomerRecord[];

      if (transformedCustomers.length === 0) {
        setCustomers(buildSampleCustomers());
        setUsingSample(true);
        setError('DB chưa có dữ liệu khách hàng CRM. Đang hiển thị dữ liệu mẫu 20 khách hàng.');
      } else {
        setCustomers(transformedCustomers);
        setUsingSample(false);
      }
    } catch (err: any) {
      setCustomers(buildSampleCustomers());
      setUsingSample(true);
      setError((err?.message || 'Không thể tải dữ liệu CRM') + '. Đang chuyển sang dữ liệu mẫu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = useMemo(() => {
    const total = customers.length;
    const now = new Date();
    const newThisMonth = customers.filter((customer) => {
      const created = toDate(customer.createdAt);
      return created && created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    const vipCustomers = customers.filter((customer) => customer.tier === 'VIP_PLATINUM').length;

    const visitedCustomers = customers.filter((customer) => customer.visits > 0).length;
    const returnedCustomers = customers.filter((customer) => customer.visits >= 2).length;
    const returnRate = visitedCustomers > 0 ? (returnedCustomers / visitedCustomers) * 100 : 0;

    const averageSpend = total > 0
      ? customers.reduce((sum, customer) => sum + customer.totalSpend, 0) / total
      : 0;

    return {
      total,
      newThisMonth,
      vipCustomers,
      returnRate,
      averageSpend,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let rows = [...customers];

    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter((customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.phone.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term),
      );
    }

    if (tierFilter !== 'ALL') {
      rows = rows.filter((customer) => customer.tier === tierFilter);
    }

    if (activityFilter === 'ACTIVE') {
      rows = rows.filter((customer) => customer.active);
    }
    if (activityFilter === 'INACTIVE') {
      rows = rows.filter((customer) => !customer.active);
    }
    if (activityFilter === 'NEW30') {
      const boundary = Date.now() - 30 * 86400000;
      rows = rows.filter((customer) => dateToMs(customer.createdAt) >= boundary);
    }

    if (sortBy === 'NEWEST') {
      rows.sort((a, b) => dateToMs(b.createdAt) - dateToMs(a.createdAt));
    }
    if (sortBy === 'SPEND_DESC') {
      rows.sort((a, b) => b.totalSpend - a.totalSpend);
    }
    if (sortBy === 'LAST_VISIT') {
      rows.sort((a, b) => dateToMs(b.lastVisit) - dateToMs(a.lastVisit));
    }

    return rows;
  }, [customers, search, tierFilter, activityFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));

  const pagedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page]);

  useEffect(() => {
    setPage(1);
  }, [search, tierFilter, activityFilter, sortBy]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const filteredHistoryForDetail = useMemo(() => {
    if (!selectedCustomer) return [];

    const now = Date.now();
    const boundaries: Record<HistoryPeriod, number> = {
      ALL: 0,
      '30D': now - 30 * 86400000,
      '90D': now - 90 * 86400000,
      '1Y': now - 365 * 86400000,
    };

    const boundary = boundaries[historyPeriod];
    return selectedCustomer.history.filter((record) => (boundary === 0 ? true : dateToMs(record.date) >= boundary));
  }, [selectedCustomer, historyPeriod]);

  const openCreateModal = () => {
    setEditingCustomerId(null);
    setCustomerForm(defaultCustomerForm());
    setShowCustomerModal(true);
  };

  const openEditModal = (customer: CustomerRecord) => {
    setEditingCustomerId(customer.id);
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone === '—' ? '' : customer.phone,
      birthday: customer.birthday || '',
      address: customer.address || '',
      note: customer.note || '',
      password: 'Spa@123456',
      active: customer.active,
    });
    setShowCustomerModal(true);
  };

  const closeCustomerModal = () => {
    setShowCustomerModal(false);
    setSavingCustomer(false);
  };

  const persistNote = (customerId: number, note: string) => {
    const next = { ...customerNotes, [customerId]: note };
    setCustomerNotes(next);
    saveCustomerNotes(next);
  };

  const submitCustomer = async () => {
    const name = customerForm.name.trim();
    const email = customerForm.email.trim();

    if (!name) {
      setError('Vui lòng nhập tên khách hàng');
      return;
    }

    if (!editingCustomerId && !email) {
      setError('Vui lòng nhập email khi tạo khách hàng');
      return;
    }

    setSavingCustomer(true);

    try {
      if (editingCustomerId) {
        if (usingSample) {
          setCustomers((prev) =>
            prev.map((customer) =>
              customer.id === editingCustomerId
                ? {
                    ...customer,
                    name,
                    phone: customerForm.phone.trim() || '—',
                    birthday: customerForm.birthday || '',
                    address: customerForm.address.trim(),
                    active: customerForm.active,
                    note: customerForm.note.trim(),
                  }
                : customer,
            ),
          );
          persistNote(editingCustomerId, customerForm.note.trim());
          closeCustomerModal();
          return;
        }

        const payload: any = {
          ho_ten: name,
          so_dien_thoai: customerForm.phone.trim() || undefined,
          ngay_sinh: customerForm.birthday ? `${customerForm.birthday}T00:00:00` : null,
          dia_chi: customerForm.address.trim() || undefined,
          trang_thai: customerForm.active,
        };

        const res = await usersApi.update(editingCustomerId, payload);
        if (!res.success) {
          throw new Error(res.message || 'Không thể cập nhật khách hàng');
        }

        persistNote(editingCustomerId, customerForm.note.trim());
        closeCustomerModal();
        await loadData(true);
        return;
      }

      const createPayload: any = {
        ho_ten: name,
        email,
        mat_khau: customerForm.password.trim() || 'Spa@123456',
        so_dien_thoai: customerForm.phone.trim() || undefined,
        ngay_sinh: customerForm.birthday ? `${customerForm.birthday}T00:00:00` : undefined,
        dia_chi: customerForm.address.trim() || undefined,
      };

      if (customerRoleId) {
        createPayload.vai_tro_ids = [customerRoleId];
      }

      if (usingSample) {
        const localId = Math.max(1000, ...customers.map((c) => c.id)) + 1;
        const tier = normalizeTier('', 0, 0, 0);

        const created: CustomerRecord = {
          id: localId,
          name,
          email,
          phone: customerForm.phone.trim() || '—',
          birthday: customerForm.birthday || '',
          address: customerForm.address.trim(),
          note: customerForm.note.trim(),
          active: customerForm.active,
          points: 0,
          tier,
          createdAt: new Date().toISOString(),
          visits: 0,
          totalSpend: 0,
          lastVisit: undefined,
          favoriteService: '—',
          history: [],
          upcomingAppointments: [],
          pointsHistory: [
            {
              id: `welcome-${localId}`,
              date: new Date().toISOString(),
              change: 20,
              reason: 'Điểm chào mừng khách hàng mới',
            },
          ],
          vouchers: buildVouchers(tier, localId),
        };

        setCustomers((prev) => [created, ...prev]);
        persistNote(localId, customerForm.note.trim());
        closeCustomerModal();
        return;
      }

      const res = await usersApi.create(createPayload);
      if (!res.success) {
        throw new Error(res.message || 'Không thể tạo khách hàng');
      }

      const newId = toNumber((res as any)?.data?.ma_nguoi_dung);
      if (newId > 0) {
        persistNote(newId, customerForm.note.trim());
      }

      closeCustomerModal();
      await loadData(true);
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu khách hàng');
    } finally {
      setSavingCustomer(false);
    }
  };

  const toggleCustomerStatus = async (customer: CustomerRecord) => {
    const nextStatus = !customer.active;

    if (usingSample) {
      setCustomers((prev) => prev.map((item) => (item.id === customer.id ? { ...item, active: nextStatus } : item)));
      return;
    }

    const res = await usersApi.update(customer.id, { trang_thai: nextStatus });
    if (!res.success) {
      setError(res.message || 'Không thể cập nhật trạng thái khách hàng');
      return;
    }

    setCustomers((prev) => prev.map((item) => (item.id === customer.id ? { ...item, active: nextStatus } : item)));
  };

  const exportCsv = () => {
    const rows = [
      ['ID', 'Tên khách hàng', 'Số điện thoại', 'Email', 'Hạng', 'Số lần đến', 'Tổng chi tiêu', 'Lần đến cuối', 'Điểm tích lũy', 'Trạng thái'],
      ...filteredCustomers.map((customer) => [
        customer.id,
        customer.name,
        customer.phone,
        customer.email,
        TIER_META[customer.tier].label,
        customer.visits,
        Math.round(customer.totalSpend),
        formatDate(customer.lastVisit),
        customer.points,
        customer.active ? 'Hoạt động' : 'Không hoạt động',
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `crm-khach-hang-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportingFile(true);

      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.csv')) {
        setError('Hiện tại nút "Nhập Excel" hỗ trợ CSV (.csv). Vui lòng xuất file Excel thành CSV để import.');
        return;
      }

      const content = await file.text();
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setError('File CSV không có dữ liệu để import.');
        return;
      }

      const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
      const nameIndex = headers.findIndex((header) => ['ho_ten', 'họ tên', 'name', 'ten'].includes(header));
      const emailIndex = headers.findIndex((header) => ['email', 'mail'].includes(header));
      const phoneIndex = headers.findIndex((header) => ['phone', 'so_dien_thoai', 'sdt'].includes(header));
      const addressIndex = headers.findIndex((header) => ['dia_chi', 'address'].includes(header));
      const birthdayIndex = headers.findIndex((header) => ['ngay_sinh', 'birthday'].includes(header));

      if (nameIndex < 0 || emailIndex < 0) {
        setError('CSV cần có tối thiểu cột `ho_ten` (hoặc name) và `email`.');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      const records = lines.slice(1).map((line) => parseCsvLine(line));

      if (usingSample) {
        const appended: CustomerRecord[] = [];
        records.forEach((cells, idx) => {
          const name = cells[nameIndex]?.trim();
          const email = cells[emailIndex]?.trim();
          if (!name || !email) {
            failCount += 1;
            return;
          }

          const localId = Math.max(1000, ...customers.map((c) => c.id), ...appended.map((c) => c.id)) + idx + 1;
          const tier = 'THUONG' as MembershipTier;

          appended.push({
            id: localId,
            name,
            email,
            phone: (phoneIndex >= 0 ? cells[phoneIndex] : '')?.trim() || '—',
            birthday: (birthdayIndex >= 0 ? cells[birthdayIndex] : '')?.trim() || '',
            address: (addressIndex >= 0 ? cells[addressIndex] : '')?.trim() || '',
            note: '',
            active: true,
            points: 0,
            tier,
            createdAt: new Date().toISOString(),
            visits: 0,
            totalSpend: 0,
            favoriteService: '—',
            history: [],
            upcomingAppointments: [],
            pointsHistory: [],
            vouchers: buildVouchers(tier, localId),
          });
          successCount += 1;
        });

        if (appended.length > 0) {
          setCustomers((prev) => [...appended, ...prev]);
        }
      } else {
        for (const cells of records) {
          const name = cells[nameIndex]?.trim();
          const email = cells[emailIndex]?.trim();
          if (!name || !email) {
            failCount += 1;
            continue;
          }

          const payload: any = {
            ho_ten: name,
            email,
            mat_khau: 'Spa@123456',
            so_dien_thoai: (phoneIndex >= 0 ? cells[phoneIndex] : '')?.trim() || undefined,
            dia_chi: (addressIndex >= 0 ? cells[addressIndex] : '')?.trim() || undefined,
          };

          const birthdayRaw = (birthdayIndex >= 0 ? cells[birthdayIndex] : '')?.trim();
          if (birthdayRaw) {
            payload.ngay_sinh = `${birthdayRaw}T00:00:00`;
          }

          if (customerRoleId) {
            payload.vai_tro_ids = [customerRoleId];
          }

          const res = await usersApi.create(payload);
          if (res.success) {
            successCount += 1;
          } else {
            failCount += 1;
          }
        }
      }

      if (!usingSample) {
        await loadData(true);
      }

      setError(`Import hoàn tất: ${successCount} thành công, ${failCount} thất bại.`);
    } catch (err: any) {
      setError(err?.message || 'Không thể import dữ liệu khách hàng từ CSV');
    } finally {
      setImportingFile(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="admin-animate-in flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-crm-page admin-animate-in space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="admin-crm-heading">Quản Lý Khách Hàng</h1>
          <p className="admin-crm-subtitle">
            {customers.length} khách hàng • {usingSample ? 'Dữ liệu mẫu' : 'Nguồn dữ liệu: API thực tế'}
          </p>
        </div>
        <button className="admin-btn admin-btn-secondary" onClick={() => loadData(true)} disabled={refreshing}>
          {refreshing ? 'Đang tải...' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {error && <p className="admin-crm-error">{error}</p>}

      <div className="admin-crm-kpi-grid">
        <div className="admin-crm-kpi-card">
          <div className="admin-crm-kpi-icon"><Plus size={16} /></div>
          <p className="admin-crm-kpi-label">Tổng khách hàng</p>
          <p className="admin-crm-kpi-value">{new Intl.NumberFormat('vi-VN').format(kpis.total)}</p>
          <p className="admin-crm-kpi-note">+ {new Intl.NumberFormat('vi-VN').format(kpis.newThisMonth)} mới tháng này</p>
        </div>

        <div className="admin-crm-kpi-card vip">
          <div className="admin-crm-kpi-icon"><Crown size={16} /></div>
          <p className="admin-crm-kpi-label">Khách VIP</p>
          <p className="admin-crm-kpi-value">{new Intl.NumberFormat('vi-VN').format(kpis.vipCustomers)}</p>
          <p className="admin-crm-kpi-note">VIP Platinum</p>
        </div>

        <div className="admin-crm-kpi-card positive">
          <div className="admin-crm-kpi-icon"><CheckCircle2 size={16} /></div>
          <p className="admin-crm-kpi-label">Tỷ lệ quay lại</p>
          <p className="admin-crm-kpi-value">{kpis.returnRate.toFixed(1)}%</p>
          <p className="admin-crm-kpi-note">Khách có từ 2 lần đến</p>
        </div>

        <div className="admin-crm-kpi-card">
          <div className="admin-crm-kpi-icon"><Download size={16} /></div>
          <p className="admin-crm-kpi-label">Chi tiêu TB / KH</p>
          <p className="admin-crm-kpi-value">{formatVnd(kpis.averageSpend)}</p>
          <p className="admin-crm-kpi-note">Tính trên toàn bộ khách hàng</p>
        </div>
      </div>

      <div className="admin-card admin-crm-filter-bar">
        <div className="admin-crm-filter-grid">
          <div className="admin-crm-search">
            <Search size={16} className="icon" />
            <input
              className="admin-input"
              placeholder="Tìm theo tên / phone / email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select className="admin-select" value={tierFilter} onChange={(event) => setTierFilter(event.target.value as 'ALL' | MembershipTier)}>
            <option value="ALL">Tất cả hạng</option>
            <option value="THUONG">Thường</option>
            <option value="SILVER">Silver</option>
            <option value="GOLD">Gold</option>
            <option value="VIP_PLATINUM">VIP Platinum</option>
          </select>

          <select className="admin-select" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value as ActivityFilter)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Không hoạt động</option>
            <option value="NEW30">Mới (30 ngày)</option>
          </select>

          <select className="admin-select" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
            <option value="NEWEST">Mới nhất</option>
            <option value="SPEND_DESC">Chi tiêu cao nhất</option>
            <option value="LAST_VISIT">Lần đến gần nhất</option>
          </select>

          <div className="admin-crm-action-group">
            <button className="admin-btn admin-crm-btn-gold" onClick={openCreateModal}>
              <Plus size={15} /> Thêm khách hàng
            </button>

            <button className="admin-btn admin-btn-secondary" onClick={() => importInputRef.current?.click()} disabled={importingFile}>
              <FileUp size={15} /> {importingFile ? 'Đang nhập...' : 'Nhập Excel'}
            </button>

            <button className="admin-btn admin-btn-secondary" onClick={exportCsv}>
              <Download size={15} /> Xuất
            </button>

            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>
      </div>

      <div className="admin-card">
        {filteredCustomers.length === 0 ? (
          <div className="admin-empty">
            <p>Không có khách hàng phù hợp bộ lọc.</p>
          </div>
        ) : (
          <>
            <div className="admin-crm-table-wrap">
              <table className="admin-table admin-crm-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Hạng thành viên</th>
                    <th>Số lần đến</th>
                    <th>Tổng chi tiêu</th>
                    <th>Lần đến cuối</th>
                    <th>Điểm tích lũy</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div className="admin-crm-customer-cell">
                          <span className="avatar" style={{ background: avatarGradient(customer.id) }}>
                            {initialsOf(customer.name)}
                          </span>
                          <div>
                            <p className="name">{customer.name}</p>
                            <p className="sub">#{customer.id}</p>
                          </div>
                        </div>
                      </td>
                      <td>{customer.phone}</td>
                      <td>{customer.email}</td>
                      <td>
                        <span className={`admin-crm-tier-badge ${TIER_META[customer.tier].className}`}>
                          {TIER_META[customer.tier].icon} {TIER_META[customer.tier].label}
                        </span>
                      </td>
                      <td>{new Intl.NumberFormat('vi-VN').format(customer.visits)}</td>
                      <td className="money">{formatVnd(customer.totalSpend)}</td>
                      <td>{formatDate(customer.lastVisit)}</td>
                      <td>{new Intl.NumberFormat('vi-VN').format(customer.points)}</td>
                      <td>
                        <div className="admin-crm-row-actions">
                          <button className="admin-btn-icon" title="Xem chi tiết" onClick={() => { setSelectedCustomerId(customer.id); setDetailTab('PROFILE'); }}>
                            <Eye size={15} />
                          </button>
                          <button className="admin-btn-icon" title="Chỉnh sửa" onClick={() => openEditModal(customer)}>
                            <Pencil size={15} />
                          </button>
                          <button
                            className={`admin-btn-icon ${customer.active ? 'warn' : 'success'}`}
                            title={customer.active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            onClick={() => toggleCustomerStatus(customer)}
                          >
                            {customer.active ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <span>Trang {page} / {totalPages} ({filteredCustomers.length} mục)</span>
                <div className="admin-pagination-btns">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                    let startPage = Math.max(1, page - 2);
                    if (startPage + 4 > totalPages) startPage = Math.max(1, totalPages - 4);
                    const pageNumber = startPage + index;
                    return (
                      <button key={`crm-page-${pageNumber}`} onClick={() => setPage(pageNumber)} className={page === pageNumber ? 'active' : ''}>{pageNumber}</button>
                    );
                  })}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedCustomer && (
        <div className="admin-crm-slide-overlay" onClick={() => setSelectedCustomerId(null)}>
          <aside className="admin-crm-slide-panel admin-slide-in-right" onClick={(event) => event.stopPropagation()}>
            <div className="admin-crm-slide-header">
              <div>
                <h3>{selectedCustomer.name}</h3>
                <p>Chi tiết khách hàng</p>
              </div>
              <button className="admin-btn-icon" onClick={() => setSelectedCustomerId(null)}>✕</button>
            </div>

            <div className="admin-crm-slide-tabs">
              <button className={detailTab === 'PROFILE' ? 'active' : ''} onClick={() => setDetailTab('PROFILE')}>Hồ sơ</button>
              <button className={detailTab === 'HISTORY' ? 'active' : ''} onClick={() => setDetailTab('HISTORY')}>Lịch sử dịch vụ</button>
              <button className={detailTab === 'UPCOMING' ? 'active' : ''} onClick={() => setDetailTab('UPCOMING')}>Lịch hẹn sắp tới</button>
              <button className={detailTab === 'POINTS' ? 'active' : ''} onClick={() => setDetailTab('POINTS')}>Điểm & Ưu đãi</button>
            </div>

            <div className="admin-crm-slide-body">
              {detailTab === 'PROFILE' && (() => {
                const progress = getPointsProgress(selectedCustomer);
                return (
                  <div className="space-y-4">
                    <div className="admin-crm-profile-top">
                      <span className="avatar-large" style={{ background: avatarGradient(selectedCustomer.id) }}>
                        {initialsOf(selectedCustomer.name)}
                      </span>
                      <div>
                        <h4>{selectedCustomer.name}</h4>
                        <p className={`admin-crm-tier-badge ${TIER_META[selectedCustomer.tier].className}`}>
                          {TIER_META[selectedCustomer.tier].icon} {TIER_META[selectedCustomer.tier].label}
                        </p>
                        <p className="points">{new Intl.NumberFormat('vi-VN').format(selectedCustomer.points)} điểm</p>
                      </div>
                    </div>

                    <div>
                      <div className="admin-crm-progress-row">
                        <span>{progress.currentLabel}</span>
                        <span>{progress.nextLabel}</span>
                      </div>
                      <div className="admin-crm-progress-track">
                        <span style={{ width: `${progress.percent}%` }} />
                      </div>
                      {selectedCustomer.tier !== 'VIP_PLATINUM' && (
                        <p className="admin-crm-progress-note">Cần thêm {new Intl.NumberFormat('vi-VN').format(progress.remaining)} điểm để lên hạng {progress.nextLabel}</p>
                      )}
                    </div>

                    <div className="admin-crm-info-grid">
                      <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                      <p><strong>Email:</strong> {selectedCustomer.email}</p>
                      <p><strong>Ngày sinh:</strong> {selectedCustomer.birthday || '—'}</p>
                      <p><strong>Địa chỉ:</strong> {selectedCustomer.address || '—'}</p>
                      <p><strong>Ghi chú:</strong> {selectedCustomer.note || '—'}</p>
                    </div>

                    <div className="admin-crm-stat-grid">
                      <div><span>Số lần đến</span><strong>{selectedCustomer.visits}</strong></div>
                      <div><span>Tổng chi tiêu</span><strong>{formatVnd(selectedCustomer.totalSpend)}</strong></div>
                      <div><span>Dịch vụ yêu thích</span><strong>{selectedCustomer.favoriteService}</strong></div>
                      <div><span>Ngày trở thành KH</span><strong>{formatDate(selectedCustomer.createdAt)}</strong></div>
                    </div>
                  </div>
                );
              })()}

              {detailTab === 'HISTORY' && (
                <div className="space-y-4">
                  <div className="admin-crm-history-filter">
                    <select className="admin-select" value={historyPeriod} onChange={(event) => setHistoryPeriod(event.target.value as HistoryPeriod)}>
                      <option value="ALL">Toàn bộ thời gian</option>
                      <option value="30D">30 ngày gần nhất</option>
                      <option value="90D">90 ngày gần nhất</option>
                      <option value="1Y">1 năm gần nhất</option>
                    </select>
                  </div>

                  {filteredHistoryForDetail.length === 0 ? (
                    <div className="admin-empty"><p>Không có lịch sử dịch vụ ở khoảng thời gian này.</p></div>
                  ) : (
                    <div className="admin-crm-history-timeline">
                      {filteredHistoryForDetail.map((record) => (
                        <div key={record.id} className="admin-crm-history-item">
                          <div className="top">
                            <strong>{record.serviceName}</strong>
                            <span>{formatVnd(record.amount)}</span>
                          </div>
                          <div className="meta">
                            <span>{formatDateTime(record.date)}</span>
                            <span>•</span>
                            <span>{record.staffName}</span>
                          </div>
                          <div className="rating">
                            {Array.from({ length: 5 }, (_, idx) => (
                              <Star key={`${record.id}-star-${idx}`} size={13} className={idx < record.rating ? 'filled' : ''} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'UPCOMING' && (
                <div className="space-y-3">
                  {selectedCustomer.upcomingAppointments.length === 0 ? (
                    <div className="admin-empty"><p>Không có lịch hẹn sắp tới.</p></div>
                  ) : (
                    selectedCustomer.upcomingAppointments.map((appt) => (
                      <div className="admin-crm-upcoming-item" key={appt.id}>
                        <div className="top">
                          <strong>{formatDateTime(appt.date)}</strong>
                          <span className={`status ${appt.status.toLowerCase()}`}>{appt.status}</span>
                        </div>
                        <p>{appt.services.join(', ') || 'Dịch vụ chưa xác định'}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === 'POINTS' && (
                <div className="space-y-4">
                  <section>
                    <h4 className="admin-crm-section-heading">Lịch sử tích điểm</h4>
                    <div className="admin-crm-points-list">
                      {selectedCustomer.pointsHistory.map((entry) => (
                        <div key={entry.id} className="admin-crm-point-item">
                          <div>
                            <strong>{entry.change > 0 ? `+${entry.change}` : entry.change} điểm</strong>
                            <p>{entry.reason}</p>
                          </div>
                          <span>{formatDate(entry.date)}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="admin-crm-section-heading">Voucher / ưu đãi</h4>
                    {selectedCustomer.vouchers.length === 0 ? (
                      <div className="admin-empty"><p>Không có ưu đãi hiện tại.</p></div>
                    ) : (
                      <div className="admin-crm-voucher-list">
                        {selectedCustomer.vouchers.map((voucher) => (
                          <div key={voucher.id} className="admin-crm-voucher-item">
                            <div>
                              <p className="title"><Gift size={14} /> {voucher.title}</p>
                              <p className="code">Mã: {voucher.code}</p>
                            </div>
                            <div className="right">
                              <span className={`status ${voucher.status.toLowerCase()}`}>{voucher.status}</span>
                              <small>HSD: {formatDate(voucher.expireAt)}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>

            <div className="admin-crm-slide-footer">
              <button className="admin-btn admin-crm-btn-gold" onClick={() => navigate(`/admin/lich-hen?customer_id=${selectedCustomer.id}`)}>
                <CalendarPlus size={15} /> Tạo lịch hẹn
              </button>
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  if (selectedCustomer.phone && selectedCustomer.phone !== '—') {
                    window.open(`sms:${selectedCustomer.phone}`);
                  } else if (selectedCustomer.email && selectedCustomer.email !== '—') {
                    window.open(`mailto:${selectedCustomer.email}`);
                  }
                }}
              >
                <MessageCircle size={15} /> Gửi tin nhắn
              </button>
              <button className="admin-btn admin-btn-secondary" onClick={() => openEditModal(selectedCustomer)}>
                <Pencil size={15} /> Chỉnh sửa
              </button>
            </div>
          </aside>
        </div>
      )}

      {showCustomerModal && (
        <div className="admin-modal-overlay" onClick={closeCustomerModal}>
          <div className="admin-modal admin-modal-animate admin-crm-customer-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingCustomerId ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}</h3>
              <button className="admin-btn-icon" onClick={closeCustomerModal}>✕</button>
            </div>

            <div className="admin-modal-body space-y-4">
              <div className="admin-crm-form-grid two">
                <div>
                  <label className="admin-label">Tên khách hàng *</label>
                  <input className="admin-input" value={customerForm.name} onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div>
                  <label className="admin-label">Phone</label>
                  <input className="admin-input" value={customerForm.phone} onChange={(event) => setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))} />
                </div>
              </div>

              <div className="admin-crm-form-grid two">
                <div>
                  <label className="admin-label">Email {editingCustomerId ? '' : '*'}</label>
                  <input
                    className="admin-input"
                    value={customerForm.email}
                    disabled={Boolean(editingCustomerId)}
                    onChange={(event) => setCustomerForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Ngày sinh</label>
                  <input type="date" className="admin-input" value={customerForm.birthday} onChange={(event) => setCustomerForm((prev) => ({ ...prev, birthday: event.target.value }))} />
                </div>
              </div>

              {!editingCustomerId && (
                <div>
                  <label className="admin-label">Mật khẩu khởi tạo *</label>
                  <input type="text" className="admin-input" value={customerForm.password} onChange={(event) => setCustomerForm((prev) => ({ ...prev, password: event.target.value }))} />
                </div>
              )}

              <div>
                <label className="admin-label">Địa chỉ</label>
                <input className="admin-input" value={customerForm.address} onChange={(event) => setCustomerForm((prev) => ({ ...prev, address: event.target.value }))} />
              </div>

              <div>
                <label className="admin-label">Ghi chú nội bộ</label>
                <textarea className="admin-input" rows={3} value={customerForm.note} onChange={(event) => setCustomerForm((prev) => ({ ...prev, note: event.target.value }))} />
              </div>

              <label className="admin-crm-status-toggle">
                <input type="checkbox" checked={customerForm.active} onChange={(event) => setCustomerForm((prev) => ({ ...prev, active: event.target.checked }))} />
                <span>{customerForm.active ? 'Hoạt động' : 'Không hoạt động'}</span>
              </label>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={closeCustomerModal}>Hủy</button>
              <button className="admin-btn admin-crm-btn-gold" onClick={submitCustomer} disabled={savingCustomer}>
                {savingCustomer ? 'Đang lưu...' : editingCustomerId ? 'Cập nhật' : 'Tạo khách hàng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
