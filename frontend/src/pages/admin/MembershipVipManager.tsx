import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Crown,
  ExternalLink,
  Gem,
  Medal,
  RefreshCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

import { appointmentsApi, invoicesApi, usersApi } from '../../api/admin.api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

type VipTier = 'THUONG' | 'SILVER' | 'GOLD' | 'VIP_PLATINUM';
type TierTableFilter = 'ALL' | 'SILVER' | 'GOLD' | 'VIP_PLATINUM';

interface TierProgramConfig {
  key: VipTier;
  name: string;
  minSpend: number;
  minPoints: number;
  discountPercent: number;
  priorityBooking: boolean;
  birthdayGift: boolean;
  enabled: boolean;
  benefits: string[];
}

interface SpendEvent {
  date: string;
  amount: number;
  points: number;
}

interface BaseMember {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  totalSpend: number;
  points: number;
  visits: number;
  createdAt: string | null;
  lastVisit: string | null;
  spendEvents: SpendEvent[];
}

interface MemberRecord extends BaseMember {
  tier: VipTier;
  tierReachedDate: string | null;
  tierExpiryDate: string | null;
}

interface PointTransaction {
  id: string;
  customerId: number;
  customerName: string;
  avatar: string;
  delta: number;
  reason: string;
  date: string;
}

const MEMBERSHIP_PROGRAM_STORAGE_KEY = 'spa_membership_program_v1';

const TIER_ORDER: VipTier[] = ['THUONG', 'SILVER', 'GOLD', 'VIP_PLATINUM'];
const TIER_MATCH_ORDER: VipTier[] = ['VIP_PLATINUM', 'GOLD', 'SILVER', 'THUONG'];

const TIER_VISUAL: Record<
  VipTier,
  {
    label: string;
    icon: any;
    cardClass: string;
    badgeClass: string;
  }
> = {
  THUONG: {
    label: 'Thường',
    icon: ShieldCheck,
    cardClass: 'tier-thuong',
    badgeClass: 'thuong',
  },
  SILVER: {
    label: 'Silver',
    icon: Medal,
    cardClass: 'tier-silver',
    badgeClass: 'silver',
  },
  GOLD: {
    label: 'Gold',
    icon: Crown,
    cardClass: 'tier-gold',
    badgeClass: 'gold',
  },
  VIP_PLATINUM: {
    label: 'VIP Platinum',
    icon: Gem,
    cardClass: 'tier-vip',
    badgeClass: 'vip',
  },
};

const DEFAULT_PROGRAM: TierProgramConfig[] = [
  {
    key: 'THUONG',
    name: 'Thường',
    minSpend: 0,
    minPoints: 0,
    discountPercent: 0,
    priorityBooking: false,
    birthdayGift: false,
    enabled: true,
    benefits: ['Tích điểm cơ bản theo hóa đơn', 'Nhận thông báo ưu đãi định kỳ', 'Quà mini vào dịp lễ'],
  },
  {
    key: 'SILVER',
    name: 'Silver',
    minSpend: 7000000,
    minPoints: 250,
    discountPercent: 5,
    priorityBooking: true,
    birthdayGift: true,
    enabled: true,
    benefits: ['Giảm 5% dịch vụ chuẩn', 'Ưu tiên đặt lịch cuối tuần', 'Quà sinh nhật trị giá 200.000đ'],
  },
  {
    key: 'GOLD',
    name: 'Gold',
    minSpend: 15000000,
    minPoints: 600,
    discountPercent: 10,
    priorityBooking: true,
    birthdayGift: true,
    enabled: true,
    benefits: ['Giảm 10% gói trị liệu', 'Check-in nhanh khu vực VIP', 'Combo chăm sóc miễn phí theo quý'],
  },
  {
    key: 'VIP_PLATINUM',
    name: 'VIP Platinum',
    minSpend: 30000000,
    minPoints: 1200,
    discountPercent: 15,
    priorityBooking: true,
    birthdayGift: true,
    enabled: true,
    benefits: ['Giảm 15% mọi dịch vụ', 'Quản lý lịch hẹn riêng 1:1', 'Quà sinh nhật hạng sang + liệu trình đặc biệt'],
  },
];

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('vi-VN');

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toDateMs = (value: any): number => {
  const d = toDateSafe(value);
  return d ? d.getTime() : 0;
};

const addDaysIso = (value: string | null, days: number): string | null => {
  const d = toDateSafe(value);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const formatCurrency = (value: number): string => vndFormatter.format(Math.round(value));
const formatNumber = (value: number): string => numberFormatter.format(Math.round(value));

const formatDate = (value: string | null): string => {
  const d = toDateSafe(value);
  if (!d) return '—';
  return d.toLocaleDateString('vi-VN');
};

const initialsOf = (name: string): string =>
  (name || 'KH')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'KH';

const normalizeRoles = (roles: any): string[] => {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => (typeof role === 'string' ? role : role?.ten_vai_tro))
    .filter(Boolean)
    .map((role) => String(role).toUpperCase());
};

const isInternalUser = (roles: string[]): boolean => roles.some((role) => ['ADMIN', 'STAFF', 'RECEPTIONIST'].includes(role));

const cloneProgram = (program: TierProgramConfig[]): TierProgramConfig[] =>
  program.map((item) => ({ ...item, benefits: [...item.benefits] }));

const normalizeProgram = (input: TierProgramConfig[]): TierProgramConfig[] => {
  const defaultsMap = new Map(DEFAULT_PROGRAM.map((item) => [item.key, item]));

  return TIER_ORDER.map((tierKey) => {
    const fallback = defaultsMap.get(tierKey)!;
    const fromInput = input.find((item) => item.key === tierKey);

    if (!fromInput) {
      return { ...fallback, benefits: [...fallback.benefits] };
    }

    const cleanBenefits = Array.isArray(fromInput.benefits)
      ? fromInput.benefits.map((text) => String(text || '').trim()).filter(Boolean).slice(0, 5)
      : [...fallback.benefits];

    while (cleanBenefits.length < 3) {
      cleanBenefits.push(fallback.benefits[cleanBenefits.length] || 'Quyền lợi thành viên');
    }

    return {
      ...fallback,
      ...fromInput,
      minSpend: Math.max(0, toNumber(fromInput.minSpend)),
      minPoints: Math.max(0, toNumber(fromInput.minPoints)),
      discountPercent: Math.max(0, toNumber(fromInput.discountPercent)),
      priorityBooking: Boolean(fromInput.priorityBooking),
      birthdayGift: Boolean(fromInput.birthdayGift),
      enabled: Boolean(fromInput.enabled),
      benefits: cleanBenefits,
    };
  });
};

const loadProgramFromStorage = (): TierProgramConfig[] => {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_PROGRAM_STORAGE_KEY);
    if (!raw) return cloneProgram(DEFAULT_PROGRAM);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cloneProgram(DEFAULT_PROGRAM);
    return normalizeProgram(parsed as TierProgramConfig[]);
  } catch {
    return cloneProgram(DEFAULT_PROGRAM);
  }
};

const resolveTier = (totalSpend: number, points: number, program: TierProgramConfig[]): VipTier => {
  const programMap = new Map(program.map((item) => [item.key, item]));

  for (const tier of TIER_MATCH_ORDER) {
    const cfg = programMap.get(tier);
    if (!cfg?.enabled) continue;

    if (tier === 'THUONG') return tier;
    if (totalSpend >= cfg.minSpend || points >= cfg.minPoints) return tier;
  }

  return TIER_ORDER.find((tier) => programMap.get(tier)?.enabled) || 'THUONG';
};

const findTierReachedDate = (
  events: SpendEvent[],
  tier: VipTier,
  programMap: Map<VipTier, TierProgramConfig>,
  fallbackDate: string | null,
): string | null => {
  if (tier === 'THUONG') {
    return fallbackDate;
  }

  const target = programMap.get(tier);
  if (!target) return fallbackDate;

  let runningSpend = 0;
  let runningPoints = 0;

  const sortedEvents = [...events].sort((a, b) => toDateMs(a.date) - toDateMs(b.date));

  for (const event of sortedEvents) {
    runningSpend += Math.max(0, event.amount);
    runningPoints += Math.max(0, event.points);

    if (runningSpend >= target.minSpend || runningPoints >= target.minPoints) {
      return event.date;
    }
  }

  return sortedEvents[sortedEvents.length - 1]?.date || fallbackDate;
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

const buildSampleMembers = (): BaseMember[] => {
  const sampleNames = [
    'Nguyễn Thu Linh',
    'Trần Hoài Nam',
    'Lê Bảo Châu',
    'Phạm Đức Huy',
    'Võ Kim Anh',
    'Đặng Minh Quân',
    'Bùi Nhã Uyên',
    'Ngô Thùy Vân',
    'Phan Gia Hân',
    'Hoàng Khánh Duy',
    'Tạ Diễm My',
    'Đinh Tuấn Khang',
    'Vũ Lan Anh',
    'Mai Thanh Phong',
    'Châu Nhật Vy',
    'Đoàn Minh Khoa',
  ];

  const now = new Date();

  return sampleNames.map((name, index) => {
    const id = 9000 + index;
    const totalSpend = 1_800_000 + index * 2_350_000 + (index % 3) * 350_000;
    const points = Math.floor(totalSpend / 11500) + index * 9;
    const visits = 3 + (index % 14);

    const created = new Date(now);
    created.setDate(created.getDate() - (240 - index * 9));

    const lastVisit = new Date(now);
    lastVisit.setDate(lastVisit.getDate() - (index % 24));

    const eventCount = 4 + (index % 3);
    const chunk = Math.floor(totalSpend / eventCount);
    let remain = totalSpend;

    const spendEvents: SpendEvent[] = [];

    for (let eventIndex = 0; eventIndex < eventCount; eventIndex += 1) {
      const amount = eventIndex === eventCount - 1 ? remain : chunk;
      remain -= amount;

      const eventDate = new Date(created);
      eventDate.setDate(eventDate.getDate() + 22 + eventIndex * 36 + index * 2);
      if (eventDate.getTime() > now.getTime()) {
        eventDate.setDate(now.getDate() - (index % 5) - eventIndex);
      }

      spendEvents.push({
        date: eventDate.toISOString(),
        amount,
        points: Math.max(4, Math.round(amount / 12000)),
      });
    }

    return {
      id,
      name,
      phone: `09${String(20000000 + index * 883).slice(-8)}`,
      avatar: initialsOf(name),
      totalSpend,
      points,
      visits,
      createdAt: created.toISOString(),
      lastVisit: lastVisit.toISOString(),
      spendEvents,
    };
  });
};

const buildSampleTransactions = (members: BaseMember[]): PointTransaction[] => {
  const reasons = ['Tích điểm sau liệu trình thư giãn', 'Đổi quà voucher tinh dầu', 'Tích điểm combo detox', 'Đổi điểm nâng cấp phòng VIP'];
  const now = new Date();

  const rows: PointTransaction[] = [];

  members.slice(0, 12).forEach((member, idx) => {
    const earnedDate = new Date(now);
    earnedDate.setDate(earnedDate.getDate() - idx * 2);

    rows.push({
      id: `sample-plus-${member.id}-${idx}`,
      customerId: member.id,
      customerName: member.name,
      avatar: member.avatar,
      delta: 80 + (idx % 4) * 30,
      reason: reasons[idx % reasons.length],
      date: earnedDate.toISOString(),
    });

    if (idx % 3 === 1) {
      const spentDate = new Date(earnedDate);
      spentDate.setDate(spentDate.getDate() - 1);

      rows.push({
        id: `sample-minus-${member.id}-${idx}`,
        customerId: member.id,
        customerName: member.name,
        avatar: member.avatar,
        delta: -40 - (idx % 2) * 10,
        reason: 'Đổi điểm nhận quà tặng sinh nhật',
        date: spentDate.toISOString(),
      });
    }
  });

  return rows.sort((a, b) => toDateMs(b.date) - toDateMs(a.date));
};

export default function MembershipVipManager() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [usingSample, setUsingSample] = useState(false);

  const [baseMembers, setBaseMembers] = useState<BaseMember[]>([]);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [expiryOverrides, setExpiryOverrides] = useState<Record<number, string>>({});

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<TierTableFilter>('ALL');

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [programConfig, setProgramConfig] = useState<TierProgramConfig[]>(() => loadProgramFromStorage());
  const [draftProgram, setDraftProgram] = useState<TierProgramConfig[]>(() => cloneProgram(DEFAULT_PROGRAM));

  const loadData = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const [usersRaw, appointmentsRaw, invoicesRaw] = await Promise.all([
        fetchAllPages((page, pageSize) => usersApi.list(page, pageSize)),
        fetchAllPages((page, pageSize) => appointmentsApi.list(page, pageSize)),
        fetchAllPages((page, pageSize) => invoicesApi.list(page, pageSize)),
      ]);

      const appointmentsByCustomer = new Map<number, any[]>();
      appointmentsRaw.forEach((appointment: any) => {
        const customerId = toNumber(appointment.ma_khach_hang);
        if (customerId <= 0) return;
        if (!appointmentsByCustomer.has(customerId)) appointmentsByCustomer.set(customerId, []);
        appointmentsByCustomer.get(customerId)!.push(appointment);
      });

      const invoicesByCustomer = new Map<number, any[]>();
      invoicesRaw.forEach((invoice: any) => {
        const customerId = toNumber(invoice.ma_khach_hang);
        if (customerId <= 0) return;
        if (!invoicesByCustomer.has(customerId)) invoicesByCustomer.set(customerId, []);
        invoicesByCustomer.get(customerId)!.push(invoice);
      });

      const baseRows: BaseMember[] = [];
      const userNameMap = new Map<number, string>();

      usersRaw.forEach((user: any) => {
        const id = toNumber(user.ma_nguoi_dung);
        if (id <= 0) return;

        const roles = normalizeRoles(user.vai_tros);
        if (isInternalUser(roles)) return;

        const name = user.ho_ten || `Khách hàng #${id}`;
        userNameMap.set(id, name);

        const invoices = invoicesByCustomer.get(id) || [];
        const appointments = appointmentsByCustomer.get(id) || [];

        let totalSpend = 0;
        const spendEvents: SpendEvent[] = [];

        invoices.forEach((invoice: any) => {
          const status = String(invoice.trang_thai || '').toUpperCase();
          const amount = Math.max(0, toNumber(invoice.thanh_tien || invoice.tong_tien));
          const earnedPoints = Math.max(0, toNumber(invoice.diem_tich_luy));
          const dateValue = invoice.ngay_tao || invoice.ngay_thanh_toan;
          const dateObj = toDateSafe(dateValue);

          if (['PAID', 'PARTIAL'].includes(status)) {
            totalSpend += amount;
            if (dateObj && amount > 0) {
              spendEvents.push({
                date: dateObj.toISOString(),
                amount,
                points: earnedPoints > 0 ? earnedPoints : Math.max(1, Math.floor(amount / 12000)),
              });
            }
          }

          if (status === 'REFUNDED') {
            totalSpend -= amount;
          }
        });

        totalSpend = Math.max(0, totalSpend);

        const inferredPoints = spendEvents.reduce((sum, event) => sum + event.points, 0);
        const userPoints = Math.max(0, toNumber(user.diem_tich_luy));
        const points = userPoints > 0 ? userPoints : inferredPoints;

        const visitStatuses = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']);
        const visits = appointments.filter((appointment: any) =>
          visitStatuses.has(String(appointment.trang_thai || '').toUpperCase()),
        ).length;

        let lastVisit: string | null = null;
        appointments.forEach((appointment: any) => {
          const datePart = String(appointment.ngay_hen || '').slice(0, 10);
          const timePart = String(appointment.gio_bat_dau || '09:00:00').slice(0, 8);
          const date = toDateSafe(`${datePart}T${timePart}`);
          if (!date) return;
          if (!lastVisit || date.getTime() > toDateMs(lastVisit)) {
            lastVisit = date.toISOString();
          }
        });

        baseRows.push({
          id,
          name,
          phone: user.so_dien_thoai || '—',
          avatar: initialsOf(name),
          totalSpend,
          points,
          visits,
          createdAt: toDateSafe(user.ngay_tao)?.toISOString() || null,
          lastVisit,
          spendEvents,
        });
      });

      const pointRows: PointTransaction[] = [];

      invoicesRaw.forEach((invoice: any) => {
        const customerId = toNumber(invoice.ma_khach_hang);
        if (customerId <= 0) return;

        const dateObj = toDateSafe(invoice.ngay_tao || invoice.ngay_thanh_toan);
        if (!dateObj) return;

        const customerName = userNameMap.get(customerId) || `Khách hàng #${customerId}`;
        const avatar = initialsOf(customerName);
        const invoiceCode = invoice.ma_hoa_don ? `#HD-${invoice.ma_hoa_don}` : 'hóa đơn';

        const earned = Math.max(0, toNumber(invoice.diem_tich_luy));
        if (earned > 0) {
          pointRows.push({
            id: `point-plus-${customerId}-${invoice.ma_hoa_don || dateObj.getTime()}`,
            customerId,
            customerName,
            avatar,
            delta: earned,
            reason: `Tích điểm từ ${invoiceCode}`,
            date: dateObj.toISOString(),
          });
        }

        const used = Math.max(0, toNumber(invoice.diem_su_dung));
        if (used > 0) {
          pointRows.push({
            id: `point-minus-${customerId}-${invoice.ma_hoa_don || dateObj.getTime()}`,
            customerId,
            customerName,
            avatar,
            delta: -used,
            reason: `Đổi quà/giảm trừ điểm tại ${invoiceCode}`,
            date: dateObj.toISOString(),
          });
        }
      });

      if (baseRows.length === 0) {
        const fallbackMembers = buildSampleMembers();
        setBaseMembers(fallbackMembers);
        setPointTransactions(buildSampleTransactions(fallbackMembers));
        setUsingSample(true);
        setError('Không có đủ dữ liệu khách hàng từ API, đang hiển thị dữ liệu mẫu.');
      } else {
        setBaseMembers(baseRows);

        const sortedPoints = pointRows
          .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
          .slice(0, 18);

        setPointTransactions(sortedPoints.length > 0 ? sortedPoints : buildSampleTransactions(baseRows));
        setUsingSample(false);
      }
    } catch (err: any) {
      const fallbackMembers = buildSampleMembers();
      setBaseMembers(fallbackMembers);
      setPointTransactions(buildSampleTransactions(fallbackMembers));
      setUsingSample(true);
      setError((err?.message || 'Không thể tải dữ liệu thành viên') + '. Đang chuyển sang dữ liệu mẫu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem(MEMBERSHIP_PROGRAM_STORAGE_KEY, JSON.stringify(programConfig));
  }, [programConfig]);

  const members = useMemo<MemberRecord[]>(() => {
    const programMap = new Map<VipTier, TierProgramConfig>(
      programConfig.map((item) => [item.key, item] as [VipTier, TierProgramConfig]),
    );

    return baseMembers
      .map((member) => {
        const tier = resolveTier(member.totalSpend, member.points, programConfig);
        const tierReachedDate = findTierReachedDate(member.spendEvents, tier, programMap, member.createdAt);
        const tierExpiryDate = tier === 'THUONG' ? null : addDaysIso(tierReachedDate || member.createdAt, 365);

        return {
          ...member,
          tier,
          tierReachedDate,
          tierExpiryDate,
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [baseMembers, programConfig]);

  const totalMembers = members.length;

  const tierCounts = useMemo(() => {
    const counters: Record<VipTier, number> = {
      THUONG: 0,
      SILVER: 0,
      GOLD: 0,
      VIP_PLATINUM: 0,
    };

    members.forEach((member) => {
      counters[member.tier] += 1;
    });

    return counters;
  }, [members]);

  const vipMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return members
      .filter((member) => member.tier !== 'THUONG')
      .filter((member) => (tierFilter === 'ALL' ? true : member.tier === tierFilter))
      .filter((member) => {
        if (!keyword) return true;
        return (
          member.name.toLowerCase().includes(keyword) ||
          member.phone.toLowerCase().includes(keyword) ||
          String(member.id).includes(keyword)
        );
      });
  }, [members, search, tierFilter]);

  const vipGrowth = useMemo(() => {
    const now = new Date();

    const monthRanges = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      return { label, start, end };
    });

    return monthRanges.map((month) => {
      const totalVipByMonth = members.filter((member) => {
        if (member.tier === 'THUONG') return false;
        const reached = toDateSafe(member.tierReachedDate || member.createdAt);
        if (!reached) return false;
        return reached.getTime() <= month.end.getTime();
      }).length;

      return {
        label: month.label,
        value: totalVipByMonth,
      };
    });
  }, [members]);

  const tierBarData = useMemo(() => {
    const labels = TIER_ORDER.map((tier) => TIER_VISUAL[tier].label);

    return {
      labels,
      datasets: [
        {
          label: 'Thành viên',
          data: TIER_ORDER.map((tier) => tierCounts[tier]),
          borderRadius: 10,
          borderSkipped: false,
          backgroundColor: ['#556070', '#c7ccd7', '#d9b16d', '#9c76d4'],
          borderColor: ['#6f7d91', '#d9dde5', '#f2ce8d', '#c9a96e'],
          borderWidth: 1.5,
        },
      ],
    };
  }, [tierCounts]);

  const vipGrowthData = useMemo(
    () => ({
      labels: vipGrowth.map((item) => item.label),
      datasets: [
        {
          label: 'VIP (Silver trở lên)',
          data: vipGrowth.map((item) => item.value),
          borderColor: '#e1be7a',
          backgroundColor: 'rgba(225, 190, 122, 0.2)',
          pointBackgroundColor: '#f6e2bd',
          pointBorderColor: '#e1be7a',
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
        },
      ],
    }),
    [vipGrowth],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#d7cfbf',
            font: { family: 'Be Vietnam Pro', size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#121622',
          borderColor: '#c9a96e',
          borderWidth: 1,
          titleColor: '#faebcf',
          bodyColor: '#dce3ef',
          padding: 10,
        },
      },
      scales: {
        x: {
          ticks: { color: '#aab3c2' },
          grid: { color: 'rgba(201, 169, 110, 0.08)' },
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#aab3c2', precision: 0 },
          grid: { color: 'rgba(201, 169, 110, 0.1)' },
        },
      },
    }),
    [],
  );

  const refreshProgramDraft = () => {
    setDraftProgram(cloneProgram(programConfig));
  };

  const openProgramModal = () => {
    refreshProgramDraft();
    setShowConfigModal(true);
  };

  const patchDraftTier = (tier: VipTier, patch: Partial<TierProgramConfig>) => {
    setDraftProgram((prev) =>
      prev.map((item) => (item.key === tier ? { ...item, ...patch } : item)),
    );
  };

  const patchDraftTierBenefits = (tier: VipTier, raw: string) => {
    const benefits = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);

    patchDraftTier(tier, { benefits });
  };

  const saveProgramConfig = () => {
    const normalized = normalizeProgram(draftProgram);
    setProgramConfig(normalized);
    setShowConfigModal(false);
  };

  const extendTierValidity = (member: MemberRecord) => {
    const baseDate = toDateSafe(expiryOverrides[member.id] || member.tierExpiryDate || new Date().toISOString()) || new Date();
    baseDate.setDate(baseDate.getDate() + 30);

    setExpiryOverrides((prev) => ({
      ...prev,
      [member.id]: baseDate.toISOString(),
    }));
  };

  if (loading) {
    return (
      <div className="admin-animate-in flex items-center justify-center h-[64vh]">
        <div className="w-10 h-10 border-4 border-amber-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-vip-page admin-animate-in space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="admin-vip-heading">Spa VIP Membership Management</h1>
          <p className="admin-vip-subtitle">
            Quản trị chương trình thành viên cao cấp • {formatNumber(totalMembers)} thành viên • {usingSample ? 'Dữ liệu mô phỏng' : 'Dữ liệu API'}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="admin-btn admin-btn-secondary" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCcw size={15} /> {refreshing ? 'Đang làm mới...' : 'Làm mới'}
          </button>
          <button className="admin-btn admin-vip-btn-gold" onClick={openProgramModal}>
            <Settings2 size={15} /> Cấu hình chương trình
          </button>
        </div>
      </div>

      {error && <p className="admin-vip-alert">{error}</p>}

      <section className="admin-vip-tier-grid">
        {TIER_ORDER.map((tierKey) => {
          const Icon = TIER_VISUAL[tierKey].icon;
          const cfg = programConfig.find((item) => item.key === tierKey) || DEFAULT_PROGRAM.find((item) => item.key === tierKey)!;
          const count = tierCounts[tierKey];
          const ratio = totalMembers > 0 ? (count / totalMembers) * 100 : 0;

          return (
            <article key={tierKey} className={`admin-vip-tier-card ${TIER_VISUAL[tierKey].cardClass}`}>
              <div className="admin-vip-card-noise" />
              <div className="admin-vip-tier-head">
                <div className="icon-wrap">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="tier-name">{cfg.name}</p>
                  <p className="tier-status">{cfg.enabled ? 'Đang hoạt động' : 'Đang tắt'}</p>
                </div>
              </div>

              <p className="admin-vip-tier-count">{formatNumber(count)}</p>
              <p className="admin-vip-tier-caption">Số thành viên hiện tại</p>

              <div className="admin-vip-tier-condition">
                <span>Điều kiện:</span>
                <strong>
                  {cfg.minSpend > 0 ? `Chi tiêu ≥ ${formatCurrency(cfg.minSpend)}` : 'Không yêu cầu chi tiêu'}
                  {' • '}
                  Điểm ≥ {formatNumber(cfg.minPoints)}
                </strong>
              </div>

              <ul className="admin-vip-tier-benefits">
                {cfg.benefits.slice(0, 3).map((benefit, idx) => (
                  <li key={`${tierKey}-benefit-${idx}`}>{benefit}</li>
                ))}
              </ul>

              <div className="admin-vip-tier-progress">
                <div className="meta">
                  <span>Tiến độ tier</span>
                  <span>
                    {formatNumber(count)} / {formatNumber(totalMembers)}
                  </span>
                </div>
                <div className="bar">
                  <div className="fill" style={{ width: `${ratio}%` }} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="admin-vip-middle-grid">
        <div className="admin-vip-chart-card">
          <div className="admin-vip-chart-head">
            <h3>Phân bổ thành viên theo hạng</h3>
            <Sparkles size={16} />
          </div>
          <div className="admin-vip-chart-box">
            <Bar data={tierBarData} options={chartOptions as any} />
          </div>
        </div>

        <div className="admin-vip-chart-card">
          <div className="admin-vip-chart-head">
            <h3>Tăng trưởng thành viên VIP theo tháng</h3>
            <CalendarClock size={16} />
          </div>
          <div className="admin-vip-chart-box">
            <Line data={vipGrowthData} options={chartOptions as any} />
          </div>
        </div>
      </section>

      <section className="admin-card admin-vip-table-card">
        <div className="admin-vip-section-head">
          <h3>Danh sách VIP members</h3>
          <div className="admin-vip-table-tools">
            <input
              className="admin-input"
              placeholder="Tìm tên / SĐT / mã thành viên"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select className="admin-select" value={tierFilter} onChange={(event) => setTierFilter(event.target.value as TierTableFilter)}>
              <option value="ALL">Tất cả hạng VIP</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="VIP_PLATINUM">VIP Platinum</option>
            </select>
          </div>
        </div>

        <div className="admin-vip-table-wrap">
          <table className="admin-table admin-vip-table">
            <thead>
              <tr>
                <th>Avatar + Tên</th>
                <th>Hạng</th>
                <th>Ngày đạt hạng</th>
                <th>Điểm hiện tại</th>
                <th>Tổng chi tiêu</th>
                <th>Lần đến cuối</th>
                <th>Ngày hết hạn hạng</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {vipMembers.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="admin-empty py-8">Không có VIP member phù hợp bộ lọc.</div>
                  </td>
                </tr>
              ) : (
                vipMembers.map((member) => {
                  const tierVisual = TIER_VISUAL[member.tier];
                  const expiryDate = expiryOverrides[member.id] || member.tierExpiryDate;

                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="admin-vip-member-cell">
                          <div className="admin-vip-avatar">{member.avatar}</div>
                          <div>
                            <p className="name">{member.name}</p>
                            <p className="meta">#{member.id} • {member.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-vip-tier-badge ${tierVisual.badgeClass}`}>{tierVisual.label}</span>
                      </td>
                      <td>{formatDate(member.tierReachedDate)}</td>
                      <td>{formatNumber(member.points)}</td>
                      <td>{formatCurrency(member.totalSpend)}</td>
                      <td>{formatDate(member.lastVisit)}</td>
                      <td>{formatDate(expiryDate)}</td>
                      <td>
                        <div className="admin-vip-actions">
                          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => navigate(`/admin/nguoi-dung?focus=${member.id}`)}>
                            <ExternalLink size={14} /> Hồ sơ
                          </button>
                          <button className="admin-btn admin-vip-action-btn admin-btn-sm" onClick={() => extendTierValidity(member)}>
                            Gia hạn +30d
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card admin-vip-timeline-card">
        <div className="admin-vip-section-head">
          <h3>Giao dịch điểm gần đây</h3>
          <p className="admin-vip-note">Timeline tích/đổi điểm của khách VIP và khách tiềm năng</p>
        </div>

        <div className="admin-vip-timeline">
          {pointTransactions.slice(0, 12).map((tx) => (
            <div key={tx.id} className="admin-vip-timeline-item">
              <div className="avatar">{tx.avatar}</div>
              <div className="content">
                <div className="top-row">
                  <p className="customer">{tx.customerName}</p>
                  <span className={`delta ${tx.delta >= 0 ? 'plus' : 'minus'}`}>
                    {tx.delta >= 0 ? '+' : ''}
                    {formatNumber(tx.delta)} điểm
                  </span>
                </div>
                <p className="reason">{tx.reason}</p>
                <p className="date">{formatDate(tx.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showConfigModal && (
        <div className="admin-modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="admin-modal admin-vip-modal admin-modal-animate" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Cấu hình chương trình thành viên</h3>
              <button className="admin-btn-icon" onClick={() => setShowConfigModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body admin-vip-modal-body">
              {draftProgram.map((tier) => {
                const visual = TIER_VISUAL[tier.key];
                const Icon = visual.icon;

                return (
                  <div key={tier.key} className={`admin-vip-tier-config ${visual.cardClass}`}>
                    <div className="admin-vip-tier-config-head">
                      <div className="title-wrap">
                        <span className="icon"><Icon size={15} /></span>
                        <div>
                          <p className="title">{tier.name}</p>
                          <p className="subtitle">Điều chỉnh điều kiện, ưu đãi và trạng thái tier</p>
                        </div>
                      </div>

                      <label className="admin-vip-switch">
                        <input
                          type="checkbox"
                          checked={tier.enabled}
                          onChange={(event) => patchDraftTier(tier.key, { enabled: event.target.checked })}
                        />
                        <span />
                      </label>
                    </div>

                    <div className="admin-vip-config-grid">
                      <div>
                        <label className="admin-label">Chi tiêu tối thiểu (VND)</label>
                        <input
                          type="number"
                          min={0}
                          className="admin-input"
                          value={tier.minSpend}
                          onChange={(event) => patchDraftTier(tier.key, { minSpend: Math.max(0, toNumber(event.target.value)) })}
                        />
                      </div>

                      <div>
                        <label className="admin-label">Điểm tích lũy tối thiểu</label>
                        <input
                          type="number"
                          min={0}
                          className="admin-input"
                          value={tier.minPoints}
                          onChange={(event) => patchDraftTier(tier.key, { minPoints: Math.max(0, toNumber(event.target.value)) })}
                        />
                      </div>

                      <div>
                        <label className="admin-label">% giảm giá</label>
                        <input
                          type="number"
                          min={0}
                          className="admin-input"
                          value={tier.discountPercent}
                          onChange={(event) => patchDraftTier(tier.key, { discountPercent: Math.max(0, toNumber(event.target.value)) })}
                        />
                      </div>
                    </div>

                    <div className="admin-vip-benefit-switches">
                      <label>
                        <input
                          type="checkbox"
                          checked={tier.priorityBooking}
                          onChange={(event) => patchDraftTier(tier.key, { priorityBooking: event.target.checked })}
                        />
                        <CalendarClock size={14} /> Ưu tiên đặt lịch
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={tier.birthdayGift}
                          onChange={(event) => patchDraftTier(tier.key, { birthdayGift: event.target.checked })}
                        />
                        <Ticket size={14} /> Quà tặng sinh nhật
                      </label>
                    </div>

                    <div>
                      <label className="admin-label">Quyền lợi chính (mỗi dòng 1 quyền lợi)</label>
                      <textarea
                        className="admin-input admin-vip-benefit-input"
                        rows={3}
                        value={tier.benefits.join('\n')}
                        onChange={(event) => patchDraftTierBenefits(tier.key, event.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowConfigModal(false)}>
                Hủy
              </button>
              <button className="admin-btn admin-vip-btn-gold" onClick={saveProgramConfig}>
                <Save size={15} /> Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
