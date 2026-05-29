import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  Copy,
  Gift,
  Package,
  Pencil,
  Plus,
  Power,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { combosApi, productsApi, promotionsApi } from '../../api/admin.api';
import { useAuth } from '../../contexts/AuthContext';

type MarketingTabKey = 'PROMOTIONS' | 'VOUCHERS' | 'COMBOS';
type PromotionTimelineStatus = 'RUNNING' | 'UPCOMING' | 'ENDED';
type VoucherTimelineStatus = 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'PAUSED' | 'OUT_OF_QUOTA';

interface PromotionItem {
  ma_khuyen_mai: number;
  ten_khuyen_mai: string;
  mo_ta: string;
  loai_giam: 'PERCENT' | 'AMOUNT';
  gia_tri_giam: number;
  giam_toi_da: number | null;
  don_toi_thieu: number | null;
  ma_code: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  so_luot_su_dung: number | null;
  da_su_dung: number;
  trang_thai: string;
}

interface PromotionFormState {
  ten_khuyen_mai: string;
  mo_ta: string;
  loai_giam: 'PERCENT' | 'AMOUNT';
  gia_tri_giam: string;
  giam_toi_da: string;
  don_toi_thieu: string;
  ma_code: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  so_luot_su_dung: string;
  trang_thai: string;
}

interface VoucherItem {
  id: number;
  code: string;
  discountType: 'PERCENT' | 'AMOUNT';
  value: number;
  minOrder: number;
  startsAt: string;
  endsAt: string;
  used: number;
  limit: number;
  appliesTo: string;
  customerTiers: string[];
  enabled: boolean;
}

interface VoucherFormState {
  codeMode: 'AUTO' | 'CUSTOM';
  code: string;
  discountType: 'PERCENT' | 'AMOUNT';
  value: string;
  minOrder: string;
  appliesTo: string;
  usageLimit: string;
  startsAt: string;
  endsAt: string;
  customerTiers: string[];
  enabled: boolean;
}

interface ComboItem {
  id: number;
  name: string;
  serviceTags: string[];
  originalPrice: number;
  comboPrice: number;
  savedPercent: number;
  savedAmount: number;
  validityDays: number;
  monthlyPurchases: number;
}

const VOUCHER_STORAGE_KEY = 'admin_spa_vouchers_v1';

const TABS: Array<{ key: MarketingTabKey; label: string; icon: ReactNode }> = [
  { key: 'PROMOTIONS', label: 'Khuyến mãi', icon: <Sparkles size={16} /> },
  { key: 'VOUCHERS', label: 'Mã giảm giá (Voucher)', icon: <Gift size={16} /> },
  { key: 'COMBOS', label: 'Gói combo', icon: <Package size={16} /> },
];

const CUSTOMER_TIERS = ['Member', 'Silver', 'Gold', 'Diamond'];

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`;

const formatDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--/--/----';
  return d.toLocaleDateString('vi-VN');
};

const toDateTimeLocal = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const withDayOffsetIso = (days: number, hour = 9) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const normalizeIso = (value: unknown, fallback: string) => {
  const d = new Date(String(value || ''));
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
};

const normalizePromotion = (raw: any): PromotionItem => {
  const fallbackStart = withDayOffsetIso(-2, 9);
  const fallbackEnd = withDayOffsetIso(10, 23);
  const type = String(raw?.loai_giam || 'PERCENT').toUpperCase() === 'AMOUNT' ? 'AMOUNT' : 'PERCENT';

  return {
    ma_khuyen_mai: Math.max(1, toNumber(raw?.ma_khuyen_mai || raw?.id || Date.now())),
    ten_khuyen_mai: String(raw?.ten_khuyen_mai || raw?.name || 'Chương trình ưu đãi'),
    mo_ta: String(raw?.mo_ta || '').trim(),
    loai_giam: type,
    gia_tri_giam: toNumber(raw?.gia_tri_giam),
    giam_toi_da: raw?.giam_toi_da == null ? null : toNumber(raw.giam_toi_da),
    don_toi_thieu: raw?.don_toi_thieu == null ? null : toNumber(raw.don_toi_thieu),
    ma_code: String(raw?.ma_code || ''),
    ngay_bat_dau: normalizeIso(raw?.ngay_bat_dau, fallbackStart),
    ngay_ket_thuc: normalizeIso(raw?.ngay_ket_thuc, fallbackEnd),
    so_luot_su_dung: raw?.so_luot_su_dung == null ? null : toNumber(raw.so_luot_su_dung),
    da_su_dung: Math.max(0, toNumber(raw?.da_su_dung)),
    trang_thai: String(raw?.trang_thai || 'ACTIVE').toUpperCase(),
  };
};

const buildFallbackPromotions = (): PromotionItem[] => [
  normalizePromotion({
    ma_khuyen_mai: 1001,
    ten_khuyen_mai: 'Luminous April Reset',
    mo_ta: 'Tặng ưu đãi liệu trình phục hồi da và massage thư giãn toàn thân.',
    loai_giam: 'PERCENT',
    gia_tri_giam: 20,
    giam_toi_da: 350000,
    don_toi_thieu: 1200000,
    ma_code: 'RESET20',
    ngay_bat_dau: withDayOffsetIso(-6, 9),
    ngay_ket_thuc: withDayOffsetIso(7, 23),
    so_luot_su_dung: 120,
    da_su_dung: 84,
    trang_thai: 'ACTIVE',
  }),
  normalizePromotion({
    ma_khuyen_mai: 1002,
    ten_khuyen_mai: 'Pink Friday Glow',
    mo_ta: 'Flash sale tối thứ 6 cho dịch vụ facial chuyên sâu.',
    loai_giam: 'AMOUNT',
    gia_tri_giam: 250000,
    don_toi_thieu: 900000,
    ma_code: 'PINKFRI',
    ngay_bat_dau: withDayOffsetIso(2, 10),
    ngay_ket_thuc: withDayOffsetIso(12, 22),
    so_luot_su_dung: 60,
    da_su_dung: 0,
    trang_thai: 'ACTIVE',
  }),
  normalizePromotion({
    ma_khuyen_mai: 1003,
    ten_khuyen_mai: 'Golden Serenity Week',
    mo_ta: 'Ưu đãi dành cho combo body detox và ngâm khoáng thư giãn.',
    loai_giam: 'PERCENT',
    gia_tri_giam: 15,
    giam_toi_da: 280000,
    don_toi_thieu: 1500000,
    ma_code: 'SERENITY15',
    ngay_bat_dau: withDayOffsetIso(-28, 9),
    ngay_ket_thuc: withDayOffsetIso(-5, 23),
    so_luot_su_dung: 90,
    da_su_dung: 90,
    trang_thai: 'INACTIVE',
  }),
];

const generateVoucherCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `SPA-${segment()}-${segment()}`;
};

const getDefaultVoucherForm = (): VoucherFormState => {
  const startsAt = toDateTimeLocal(withDayOffsetIso(0, 8));
  const endsAt = toDateTimeLocal(withDayOffsetIso(30, 23));

  return {
    codeMode: 'AUTO',
    code: generateVoucherCode(),
    discountType: 'PERCENT',
    value: '12',
    minOrder: '600000',
    appliesTo: 'Tất cả dịch vụ chăm sóc da',
    usageLimit: '200',
    startsAt,
    endsAt,
    customerTiers: ['Member', 'Silver'],
    enabled: true,
  };
};

const buildDefaultVouchers = (): VoucherItem[] => {
  const nowStart = withDayOffsetIso(0, 8);
  const in20Days = withDayOffsetIso(20, 23);

  return [
    {
      id: 1,
      code: 'SPA-GLOW10',
      discountType: 'PERCENT',
      value: 10,
      minOrder: 500000,
      startsAt: nowStart,
      endsAt: in20Days,
      used: 92,
      limit: 300,
      appliesTo: 'Facial / Skin treatment',
      customerTiers: ['Member', 'Silver', 'Gold'],
      enabled: true,
    },
    {
      id: 2,
      code: 'DETOX-250K',
      discountType: 'AMOUNT',
      value: 250000,
      minOrder: 1200000,
      startsAt: withDayOffsetIso(-3, 8),
      endsAt: withDayOffsetIso(10, 23),
      used: 38,
      limit: 80,
      appliesTo: 'Detox body package',
      customerTiers: ['Gold', 'Diamond'],
      enabled: true,
    },
    {
      id: 3,
      code: 'VIP-PINK',
      discountType: 'PERCENT',
      value: 18,
      minOrder: 900000,
      startsAt: withDayOffsetIso(-18, 8),
      endsAt: withDayOffsetIso(-1, 23),
      used: 64,
      limit: 64,
      appliesTo: 'Phòng VIP + tinh dầu cao cấp',
      customerTiers: ['Diamond'],
      enabled: false,
    },
  ];
};

const loadStoredVouchers = (): VoucherItem[] => {
  try {
    const raw = localStorage.getItem(VOUCHER_STORAGE_KEY);
    if (!raw) return buildDefaultVouchers();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return buildDefaultVouchers();

    return parsed.map((item: any, idx: number) => ({
      id: Math.max(1, toNumber(item?.id || idx + 1)),
      code: String(item?.code || generateVoucherCode()),
      discountType: String(item?.discountType || 'PERCENT').toUpperCase() === 'AMOUNT' ? 'AMOUNT' : 'PERCENT',
      value: Math.max(0, toNumber(item?.value)),
      minOrder: Math.max(0, toNumber(item?.minOrder)),
      startsAt: normalizeIso(item?.startsAt, withDayOffsetIso(0, 8)),
      endsAt: normalizeIso(item?.endsAt, withDayOffsetIso(30, 23)),
      used: Math.max(0, toNumber(item?.used)),
      limit: Math.max(1, toNumber(item?.limit || 100)),
      appliesTo: String(item?.appliesTo || 'Tất cả dịch vụ'),
      customerTiers: Array.isArray(item?.customerTiers)
        ? item.customerTiers.map((tier: any) => String(tier)).filter(Boolean)
        : ['Member'],
      enabled: item?.enabled !== false,
    }));
  } catch {
    return buildDefaultVouchers();
  }
};

const buildFallbackCombos = (): ComboItem[] => [
  {
    id: 9001,
    name: 'Gói Thư Giãn Cuối Tuần',
    serviceTags: ['Massage đá nóng', 'Xông tinh dầu', 'Ngâm chân thảo mộc'],
    originalPrice: 1850000,
    comboPrice: 1390000,
    savedAmount: 460000,
    savedPercent: 25,
    validityDays: 45,
    monthlyPurchases: 34,
  },
  {
    id: 9002,
    name: 'Gói Detox 3 Buổi',
    serviceTags: ['Body detox', 'Peel da toàn thân', 'Liệu trình giảm stress'],
    originalPrice: 3600000,
    comboPrice: 2790000,
    savedAmount: 810000,
    savedPercent: 22,
    validityDays: 60,
    monthlyPurchases: 21,
  },
  {
    id: 9003,
    name: 'Gói Glow Signature',
    serviceTags: ['Facial chuyên sâu', 'RF nâng cơ', 'Mask collagen vàng'],
    originalPrice: 2950000,
    comboPrice: 2290000,
    savedAmount: 660000,
    savedPercent: 22,
    validityDays: 30,
    monthlyPurchases: 18,
  },
];

const getPromotionTimelineStatus = (promotion: PromotionItem): PromotionTimelineStatus => {
  const now = Date.now();
  const startsAt = new Date(promotion.ngay_bat_dau).getTime();
  const endsAt = new Date(promotion.ngay_ket_thuc).getTime();

  if (promotion.trang_thai === 'INACTIVE') return 'ENDED';
  if (now < startsAt) return 'UPCOMING';
  if (now > endsAt) return 'ENDED';
  return 'RUNNING';
};

const getPromotionStatusLabel = (status: PromotionTimelineStatus) => {
  if (status === 'RUNNING') return 'ĐANG CHẠY';
  if (status === 'UPCOMING') return 'SẮP TỚI';
  return 'ĐÃ KẾT THÚC';
};

const getPromotionTimelineMeta = (promotion: PromotionItem) => {
  const now = Date.now();
  const startsAt = new Date(promotion.ngay_bat_dau).getTime();
  const endsAt = new Date(promotion.ngay_ket_thuc).getTime();
  const status = getPromotionTimelineStatus(promotion);

  const totalDuration = Math.max(1, endsAt - startsAt);
  const passedDuration = clamp(((now - startsAt) / totalDuration) * 100);

  let progress = passedDuration;
  if (status === 'UPCOMING') progress = 0;
  if (status === 'ENDED') progress = 100;

  const dayMs = 24 * 60 * 60 * 1000;
  if (status === 'UPCOMING') {
    const days = Math.max(0, Math.ceil((startsAt - now) / dayMs));
    return { progress, note: `Bắt đầu sau ${days} ngày` };
  }
  if (status === 'ENDED') {
    const days = Math.max(0, Math.ceil((now - endsAt) / dayMs));
    return { progress, note: `Kết thúc ${days} ngày trước` };
  }

  const days = Math.max(0, Math.ceil((endsAt - now) / dayMs));
  return { progress, note: `Còn ${days} ngày` };
};

const getVoucherTimelineStatus = (voucher: VoucherItem): VoucherTimelineStatus => {
  const now = Date.now();
  const startsAt = new Date(voucher.startsAt).getTime();
  const endsAt = new Date(voucher.endsAt).getTime();

  if (!voucher.enabled) return 'PAUSED';
  if (voucher.used >= voucher.limit) return 'OUT_OF_QUOTA';
  if (now < startsAt) return 'UPCOMING';
  if (now > endsAt) return 'EXPIRED';
  return 'ACTIVE';
};

const getVoucherStatusLabel = (status: VoucherTimelineStatus) => {
  if (status === 'ACTIVE') return 'Đang chạy';
  if (status === 'UPCOMING') return 'Sắp mở';
  if (status === 'PAUSED') return 'Tạm dừng';
  if (status === 'OUT_OF_QUOTA') return 'Hết lượt';
  return 'Hết hạn';
};

const parseValidityFromText = (text: string) => {
  if (!text) return 60;

  const dayMatch = text.match(/(\d+)\s*ngày/i);
  if (dayMatch) return Math.max(15, toNumber(dayMatch[1]));

  const monthMatch = text.match(/(\d+)\s*tháng/i);
  if (monthMatch) return Math.max(30, toNumber(monthMatch[1]) * 30);

  return 60;
};

const estimatePromoRevenue = (promotion: PromotionItem) => {
  const used = Math.max(0, promotion.da_su_dung);
  if (used === 0) return 0;

  if (promotion.loai_giam === 'AMOUNT') {
    const ticket = Math.max(toNumber(promotion.don_toi_thieu), promotion.gia_tri_giam * 4, 800000);
    return used * ticket;
  }

  const avgTicket = Math.max(toNumber(promotion.don_toi_thieu), 1400000);
  const rawDiscount = (avgTicket * promotion.gia_tri_giam) / 100;
  const limitedDiscount = promotion.giam_toi_da ? Math.min(rawDiscount, promotion.giam_toi_da) : rawDiscount;
  const ratio = clamp(limitedDiscount / avgTicket, 0.02, 0.55);

  return used * Math.max(avgTicket, limitedDiscount / ratio);
};

export default function PromotionsManager() {
  const { user } = useAuth();
  const isAdmin = user?.vai_tros?.includes('ADMIN') || false;
  const [activeTab, setActiveTab] = useState<MarketingTabKey>('PROMOTIONS');

  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [promotionSource, setPromotionSource] = useState<'api' | 'fallback'>('api');
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [promotionError, setPromotionError] = useState('');

  const [combos, setCombos] = useState<ComboItem[]>([]);
  const [loadingCombos, setLoadingCombos] = useState(true);
  const [comboError, setComboError] = useState('');
  const [voucherError, setVoucherError] = useState('');

  const [vouchers, setVouchers] = useState<VoucherItem[]>(() => loadStoredVouchers());
  const [copiedVoucherCode, setCopiedVoucherCode] = useState('');

  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionItem | null>(null);
  const [savingPromotion, setSavingPromotion] = useState(false);

  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherItem | null>(null);

  const [promotionForm, setPromotionForm] = useState<PromotionFormState>(() => {
    const start = toDateTimeLocal(withDayOffsetIso(0, 8));
    const end = toDateTimeLocal(withDayOffsetIso(14, 23));
    return {
      ten_khuyen_mai: '',
      mo_ta: '',
      loai_giam: 'PERCENT',
      gia_tri_giam: '15',
      giam_toi_da: '300000',
      don_toi_thieu: '1000000',
      ma_code: '',
      ngay_bat_dau: start,
      ngay_ket_thuc: end,
      so_luot_su_dung: '150',
      trang_thai: 'ACTIVE',
    };
  });

  const [voucherForm, setVoucherForm] = useState<VoucherFormState>(() => getDefaultVoucherForm());

  useEffect(() => {
    localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(vouchers));
  }, [vouchers]);

  const loadPromotions = async () => {
    setLoadingPromotions(true);
    setPromotionError('');

    try {
      const rows: any[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const res = await promotionsApi.list(page, 80);
        if (!res.success) {
          throw new Error(res.message || 'Không thể tải danh sách khuyến mãi');
        }

        rows.push(...(Array.isArray(res.data) ? res.data : []));
        totalPages = Math.max(1, toNumber(res.meta?.total_pages || 1));
        page += 1;
      } while (page <= totalPages);

      setPromotions(rows.map(normalizePromotion));
      setPromotionSource('api');
    } catch (error: any) {
      setPromotions(buildFallbackPromotions());
      setPromotionSource('fallback');
      setPromotionError(error?.message || 'Không thể tải khuyến mãi từ API, đang dùng dữ liệu mô phỏng.');
    } finally {
      setLoadingPromotions(false);
    }
  };

  const loadCombos = async () => {
    setLoadingCombos(true);
    setComboError('');

    try {
      const allProducts: any[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const res = await productsApi.list(page, 120);
        if (!res.success) {
          throw new Error(res.message || 'Không thể tải dữ liệu sản phẩm để dựng combo');
        }
        allProducts.push(...(Array.isArray(res.data) ? res.data : []));
        totalPages = Math.max(1, toNumber(res.meta?.total_pages || 1));
        page += 1;
      } while (page <= totalPages);

      const priceMap = new Map<number, number>();
      allProducts.forEach((product) => {
        const id = toNumber(product?.ma_san_pham);
        if (id <= 0) return;
        priceMap.set(id, toNumber(product?.bang_gias?.[0]?.gia));
      });

      const packages = allProducts.filter((item) => String(item?.loai || '').toUpperCase() === 'PACKAGE');
      if (packages.length === 0) {
        setCombos(buildFallbackCombos());
        setLoadingCombos(false);
        return;
      }

      const detailsByPackage = await Promise.all(
        packages.map(async (pkg) => {
          const comboId = toNumber(pkg?.ma_san_pham);
          if (comboId <= 0) return [];

          const detailRes = await combosApi.details(comboId);
          if (!detailRes.success || !Array.isArray(detailRes.data)) return [];
          return detailRes.data;
        }),
      );

      const mapped: ComboItem[] = packages.map((pkg, index) => {
        const comboId = toNumber(pkg?.ma_san_pham);
        const comboPrice = Math.max(0, toNumber(pkg?.bang_gias?.[0]?.gia));

        const details = detailsByPackage[index] || [];
        const serviceTags = details
          .map((detail: any) => String(detail?.ten_dich_vu || '').trim())
          .filter(Boolean)
          .slice(0, 5);

        const originalByServices = details.reduce((sum: number, detail: any) => {
          const serviceId = toNumber(detail?.ma_dich_vu);
          const unitPrice = priceMap.get(serviceId) || 0;
          return sum + unitPrice * Math.max(1, toNumber(detail?.so_luong || 1));
        }, 0);

        const originalPrice = Math.max(originalByServices, comboPrice * 1.15, comboPrice);
        const savedAmount = Math.max(0, originalPrice - comboPrice);
        const savedPercent = originalPrice > 0 ? Math.round((savedAmount / originalPrice) * 100) : 0;
        const validityDays = parseValidityFromText(String(pkg?.mo_ta || ''));

        return {
          id: comboId,
          name: String(pkg?.ten_san_pham || `Gói Combo #${comboId}`),
          serviceTags: serviceTags.length > 0 ? serviceTags : ['Liệu trình body', 'Chăm sóc da', 'Thư giãn tinh dầu'],
          originalPrice,
          comboPrice,
          savedPercent,
          savedAmount,
          validityDays,
          monthlyPurchases: 8 + ((comboId * 11) % 23),
        };
      });

      setCombos(mapped);
    } catch (error: any) {
      setCombos(buildFallbackCombos());
      setComboError(error?.message || 'Không thể tải combo từ API, đang dùng dữ liệu mô phỏng.');
    } finally {
      setLoadingCombos(false);
    }
  };

  useEffect(() => {
    void loadPromotions();
    void loadCombos();
  }, []);

  const runningPromotions = useMemo(
    () => promotions.filter((promotion) => getPromotionTimelineStatus(promotion) === 'RUNNING'),
    [promotions],
  );

  const totalVoucherUsage = useMemo(
    () => vouchers.reduce((sum, voucher) => sum + Math.max(0, voucher.used), 0),
    [vouchers],
  );

  const totalPromoUsage = useMemo(
    () => promotions.reduce((sum, promotion) => sum + Math.max(0, promotion.da_su_dung), 0),
    [promotions],
  );

  const comboMonthlyPurchases = useMemo(
    () => combos.reduce((sum, combo) => sum + Math.max(0, combo.monthlyPurchases), 0),
    [combos],
  );

  const kpiMonthlyUsage = totalPromoUsage + totalVoucherUsage + comboMonthlyPurchases;

  const kpiRevenue = useMemo(() => {
    const fromPromotions = promotions.reduce((sum, promotion) => sum + estimatePromoRevenue(promotion), 0);

    const fromVouchers = vouchers.reduce((sum, voucher) => {
      const ticket = Math.max(voucher.minOrder, voucher.value * (voucher.discountType === 'PERCENT' ? 12 : 4), 700000);
      return sum + ticket * Math.max(0, voucher.used);
    }, 0);

    const fromCombos = combos.reduce((sum, combo) => sum + combo.comboPrice * combo.monthlyPurchases, 0);

    return fromPromotions + fromVouchers + fromCombos;
  }, [promotions, vouchers, combos]);

  const pageNotices = [promotionError, comboError, voucherError].filter(Boolean);

  const openCreatePromotionModal = () => {
    setEditingPromotion(null);
    setPromotionForm({
      ten_khuyen_mai: '',
      mo_ta: '',
      loai_giam: 'PERCENT',
      gia_tri_giam: '15',
      giam_toi_da: '300000',
      don_toi_thieu: '1000000',
      ma_code: '',
      ngay_bat_dau: toDateTimeLocal(withDayOffsetIso(0, 8)),
      ngay_ket_thuc: toDateTimeLocal(withDayOffsetIso(14, 23)),
      so_luot_su_dung: '120',
      trang_thai: 'ACTIVE',
    });
    setShowPromotionModal(true);
  };

  const openEditPromotionModal = (promotion: PromotionItem) => {
    setEditingPromotion(promotion);
    setPromotionForm({
      ten_khuyen_mai: promotion.ten_khuyen_mai,
      mo_ta: promotion.mo_ta,
      loai_giam: promotion.loai_giam,
      gia_tri_giam: String(promotion.gia_tri_giam),
      giam_toi_da: promotion.giam_toi_da ? String(promotion.giam_toi_da) : '',
      don_toi_thieu: promotion.don_toi_thieu ? String(promotion.don_toi_thieu) : '',
      ma_code: promotion.ma_code,
      ngay_bat_dau: toDateTimeLocal(promotion.ngay_bat_dau),
      ngay_ket_thuc: toDateTimeLocal(promotion.ngay_ket_thuc),
      so_luot_su_dung: promotion.so_luot_su_dung ? String(promotion.so_luot_su_dung) : '',
      trang_thai: promotion.trang_thai,
    });
    setShowPromotionModal(true);
  };

  const handleSubmitPromotion = async () => {
    const tenKhuyenMai = promotionForm.ten_khuyen_mai.trim();
    const startsAt = new Date(promotionForm.ngay_bat_dau).getTime();
    const endsAt = new Date(promotionForm.ngay_ket_thuc).getTime();

    if (!tenKhuyenMai) {
      setPromotionError('Vui lòng nhập tên chương trình khuyến mãi.');
      return;
    }

    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt >= endsAt) {
      setPromotionError('Khoảng thời gian khuyến mãi chưa hợp lệ.');
      return;
    }

    const payload = {
      ten_khuyen_mai: tenKhuyenMai,
      mo_ta: promotionForm.mo_ta.trim() || null,
      loai_giam: promotionForm.loai_giam,
      gia_tri_giam: Math.max(0, toNumber(promotionForm.gia_tri_giam)),
      giam_toi_da:
        promotionForm.loai_giam === 'PERCENT' && toNumber(promotionForm.giam_toi_da) > 0
          ? toNumber(promotionForm.giam_toi_da)
          : null,
      don_toi_thieu: toNumber(promotionForm.don_toi_thieu) > 0 ? toNumber(promotionForm.don_toi_thieu) : null,
      ma_code: promotionForm.ma_code.trim() || null,
      ngay_bat_dau: new Date(promotionForm.ngay_bat_dau).toISOString(),
      ngay_ket_thuc: new Date(promotionForm.ngay_ket_thuc).toISOString(),
      so_luot_su_dung: toNumber(promotionForm.so_luot_su_dung) > 0 ? toNumber(promotionForm.so_luot_su_dung) : null,
      trang_thai: promotionForm.trang_thai,
    };

    setSavingPromotion(true);
    setPromotionError('');

    try {
      if (editingPromotion) {
        if (promotionSource === 'api' && editingPromotion.ma_khuyen_mai > 0) {
          const res = await promotionsApi.update(editingPromotion.ma_khuyen_mai, payload);
          if (!res.success) {
            throw new Error(res.message || 'Không thể cập nhật khuyến mãi');
          }
          await loadPromotions();
        } else {
          setPromotions((prev) =>
            prev.map((item) =>
              item.ma_khuyen_mai === editingPromotion.ma_khuyen_mai
                ? normalizePromotion({ ...item, ...payload })
                : item,
            ),
          );
        }
      } else if (promotionSource === 'api') {
        const res = await promotionsApi.create(payload);
        if (!res.success) {
          throw new Error(res.message || 'Không thể tạo khuyến mãi');
        }
        await loadPromotions();
      } else {
        const nextId = promotions.reduce((max, promo) => Math.max(max, promo.ma_khuyen_mai), 0) + 1;
        const nextPromo = normalizePromotion({ ...payload, ma_khuyen_mai: nextId, da_su_dung: 0, trang_thai: 'ACTIVE' });
        setPromotions((prev) => [nextPromo, ...prev]);
      }

      setShowPromotionModal(false);
      setEditingPromotion(null);
    } catch (error: any) {
      setPromotionError(error?.message || 'Không thể lưu khuyến mãi.');
    } finally {
      setSavingPromotion(false);
    }
  };

  const handleDuplicatePromotion = async (promotion: PromotionItem) => {
    const duplicatedCode = promotion.ma_code ? `${promotion.ma_code}-${Math.floor(Math.random() * 1000)}` : null;

    const payload = {
      ten_khuyen_mai: `${promotion.ten_khuyen_mai} (Bản sao)`,
      mo_ta: promotion.mo_ta || null,
      loai_giam: promotion.loai_giam,
      gia_tri_giam: promotion.gia_tri_giam,
      giam_toi_da: promotion.giam_toi_da,
      don_toi_thieu: promotion.don_toi_thieu,
      ma_code: duplicatedCode,
      ngay_bat_dau: promotion.ngay_bat_dau,
      ngay_ket_thuc: promotion.ngay_ket_thuc,
      so_luot_su_dung: promotion.so_luot_su_dung,
      trang_thai: 'ACTIVE',
      da_su_dung: 0,
    };

    try {
      if (promotionSource === 'api') {
        const res = await promotionsApi.create(payload);
        if (!res.success) {
          throw new Error(res.message || 'Không thể nhân bản chương trình khuyến mãi');
        }
        await loadPromotions();
      } else {
        const nextId = promotions.reduce((max, promo) => Math.max(max, promo.ma_khuyen_mai), 0) + 1;
        setPromotions((prev) => [normalizePromotion({ ...payload, ma_khuyen_mai: nextId }), ...prev]);
      }
    } catch (error: any) {
      setPromotionError(error?.message || 'Không thể nhân bản khuyến mãi.');
    }
  };

  const handleTogglePromotion = async (promotion: PromotionItem) => {
    const nextStatus = promotion.trang_thai === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      if (promotionSource === 'api') {
        const res = await promotionsApi.update(promotion.ma_khuyen_mai, { trang_thai: nextStatus });
        if (!res.success) {
          throw new Error(res.message || 'Không thể cập nhật trạng thái khuyến mãi');
        }
      }

      setPromotions((prev) =>
        prev.map((item) =>
          item.ma_khuyen_mai === promotion.ma_khuyen_mai ? { ...item, trang_thai: nextStatus } : item,
        ),
      );
    } catch (error: any) {
      setPromotionError(error?.message || 'Không thể đổi trạng thái khuyến mãi.');
    }
  };

  const openCreateVoucherModal = () => {
    setEditingVoucher(null);
    setVoucherForm(getDefaultVoucherForm());
    setVoucherError('');
    setShowVoucherModal(true);
  };

  const openEditVoucherModal = (voucher: VoucherItem) => {
    setEditingVoucher(voucher);
    setVoucherForm({
      codeMode: 'CUSTOM',
      code: voucher.code,
      discountType: voucher.discountType,
      value: String(voucher.value),
      minOrder: String(voucher.minOrder),
      appliesTo: voucher.appliesTo,
      usageLimit: String(voucher.limit),
      startsAt: toDateTimeLocal(voucher.startsAt),
      endsAt: toDateTimeLocal(voucher.endsAt),
      customerTiers: voucher.customerTiers,
      enabled: voucher.enabled,
    });
    setVoucherError('');
    setShowVoucherModal(true);
  };

  const toggleVoucherTier = (tier: string) => {
    setVoucherForm((prev) => {
      const exists = prev.customerTiers.includes(tier);
      return {
        ...prev,
        customerTiers: exists
          ? prev.customerTiers.filter((item) => item !== tier)
          : [...prev.customerTiers, tier],
      };
    });
  };

  const handleSubmitVoucher = () => {
    setVoucherError('');
    const code = voucherForm.codeMode === 'AUTO' ? generateVoucherCode() : voucherForm.code.trim().toUpperCase();

    if (!code) {
      setVoucherError('Voucher cần có mã code trước khi lưu.');
      return;
    }

    const startsMs = new Date(voucherForm.startsAt).getTime();
    const endsMs = new Date(voucherForm.endsAt).getTime();
    if (!Number.isFinite(startsMs) || !Number.isFinite(endsMs) || startsMs >= endsMs) {
      setVoucherError('Khoảng thời gian hiệu lực của voucher chưa hợp lệ.');
      return;
    }

    const startsAt = new Date(startsMs).toISOString();
    const endsAt = new Date(endsMs).toISOString();

    const nextVoucher: VoucherItem = {
      id: editingVoucher ? editingVoucher.id : vouchers.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      code,
      discountType: voucherForm.discountType,
      value: Math.max(0, toNumber(voucherForm.value)),
      minOrder: Math.max(0, toNumber(voucherForm.minOrder)),
      startsAt,
      endsAt,
      used: editingVoucher ? editingVoucher.used : 0,
      limit: Math.max(1, toNumber(voucherForm.usageLimit || 1)),
      appliesTo: voucherForm.appliesTo.trim() || 'Tất cả dịch vụ',
      customerTiers: voucherForm.customerTiers.length > 0 ? voucherForm.customerTiers : ['Member'],
      enabled: voucherForm.enabled,
    };

    setVouchers((prev) => {
      if (!editingVoucher) return [nextVoucher, ...prev];
      return prev.map((item) => (item.id === editingVoucher.id ? nextVoucher : item));
    });

    setShowVoucherModal(false);
    setEditingVoucher(null);
  };

  const handleDeleteVoucher = (voucherId: number) => {
    if (!window.confirm('Xóa voucher này khỏi danh sách quản lý?')) return;
    setVouchers((prev) => prev.filter((item) => item.id !== voucherId));
  };

  const handleCopyVoucher = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedVoucherCode(code);
      window.setTimeout(() => setCopiedVoucherCode(''), 1800);
    } catch {
      setCopiedVoucherCode('');
    }
  };

  return (
    <div className="admin-animate-in admin-promo-page space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="admin-promo-heading">Spa Promotion & Discount Management</h1>
          <p className="admin-promo-subheading">Bảng điều khiển marketing theo phong cách dark luxury: ưu đãi, voucher và gói combo.</p>
        </div>

        <div className="admin-promo-header-actions">
          {isAdmin && activeTab === 'PROMOTIONS' && (
            <button className="admin-btn admin-promo-btn-gold" onClick={openCreatePromotionModal}>
              <Plus size={16} /> Tạo khuyến mãi
            </button>
          )}

          {isAdmin && activeTab === 'VOUCHERS' && (
            <button className="admin-btn admin-promo-btn-gold" onClick={openCreateVoucherModal}>
              <Plus size={16} /> Tạo voucher
            </button>
          )}
        </div>
      </div>

      {pageNotices.length > 0 && (
        <div className="admin-promo-notice-wrap">
          {pageNotices.map((notice) => (
            <div key={notice} className="admin-promo-notice">{notice}</div>
          ))}
        </div>
      )}

      <section className="admin-promo-kpi-grid">
        <article className="admin-promo-kpi-card is-running">
          <div className="label">Khuyến mãi đang chạy</div>
          <div className="value green">{runningPromotions.length}</div>
          <div className="note">Đang hoạt động theo lịch</div>
        </article>

        <article className="admin-promo-kpi-card">
          <div className="label">Lượt sử dụng tháng này</div>
          <div className="value">{new Intl.NumberFormat('vi-VN').format(kpiMonthlyUsage)}</div>
          <div className="note">Gồm promo, voucher và combo</div>
        </article>

        <article className="admin-promo-kpi-card">
          <div className="label">Doanh thu từ KM</div>
          <div className="value gold">{formatVnd(kpiRevenue)}</div>
          <div className="note">Ước tính theo lượt dùng hiện tại</div>
        </article>
      </section>

      <section className="admin-promo-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`admin-promo-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </section>

      {activeTab === 'PROMOTIONS' && (
        <section className="admin-card admin-promo-voucher-wrap">
          <div className="overflow-x-auto">
            <table className="admin-table admin-service-list-table">
              <thead>
                <tr>
                  <th>Tên chương trình</th>
                  <th>Mã code</th>
                  <th>Loại giảm</th>
                  <th>Giá trị giảm</th>
                  <th>Điều kiện tối thiểu</th>
                  <th>Hạn sử dụng</th>
                  <th>Đã dùng / Giới hạn</th>
                  <th>Trạng thái</th>
                  {isAdmin && <th className="text-right">Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {loadingPromotions ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-sm admin-muted-text">
                      Đang tải danh sách khuyến mãi...
                    </td>
                  </tr>
                ) : promotions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10">
                      Chưa có chương trình khuyến mãi nào.
                    </td>
                  </tr>
                ) : (
                  promotions.map((promotion) => {
                    const timelineStatus = getPromotionTimelineStatus(promotion);
                    const statusClass = timelineStatus.toLowerCase();
                    const usageLimit = promotion.so_luot_su_dung || 0;

                    return (
                      <tr key={promotion.ma_khuyen_mai}>
                        <td className="name-cell">
                          <span>{promotion.ten_khuyen_mai}</span>
                          <small>{promotion.mo_ta || 'Tăng doanh thu bằng ưu đãi linh hoạt.'}</small>
                        </td>
                        <td>
                          <code>{promotion.ma_code || '—'}</code>
                        </td>
                        <td>{promotion.loai_giam === 'PERCENT' ? 'Phần trăm (%)' : 'Số tiền cố định'}</td>
                        <td className="price">
                          {promotion.loai_giam === 'PERCENT'
                            ? `${promotion.gia_tri_giam}%`
                            : formatVnd(promotion.gia_tri_giam)}
                        </td>
                        <td>{promotion.don_toi_thieu ? formatVnd(promotion.don_toi_thieu) : 'Không yêu cầu'}</td>
                        <td>
                          {formatDate(promotion.ngay_bat_dau)} - {formatDate(promotion.ngay_ket_thuc)}
                        </td>
                        <td>
                          {promotion.da_su_dung} / {usageLimit > 0 ? usageLimit : '∞'}
                        </td>
                        <td>
                          <span className={`admin-promo-voucher-status ${statusClass}`}>
                            {getPromotionStatusLabel(timelineStatus)}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="text-right">
                            <div className="admin-service-list-actions justify-end gap-2">
                              <button className="admin-btn-icon" onClick={() => openEditPromotionModal(promotion)} title="Sửa">
                                <Pencil size={14} />
                              </button>
                              <button className="admin-btn-icon" onClick={() => handleDuplicatePromotion(promotion)} title="Nhân bản">
                                <Copy size={14} />
                              </button>
                              <button
                                className={`admin-service-status-switch small ${promotion.trang_thai === 'ACTIVE' ? 'active' : ''}`}
                                onClick={() => handleTogglePromotion(promotion)}
                                title={promotion.trang_thai === 'ACTIVE' ? 'Dừng hoạt động' : 'Kích hoạt'}
                              >
                                <span className="dot" />
                                {promotion.trang_thai === 'ACTIVE' ? 'Đang chạy' : 'Tạm dừng'}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'VOUCHERS' && (
        <section className="admin-card admin-promo-voucher-wrap">
          <div className="overflow-x-auto">
            <table className="admin-table admin-service-list-table">
              <thead>
                <tr>
                  <th>Mã Voucher</th>
                  <th>Loại</th>
                  <th>Giá trị</th>
                  <th>Điều kiện tối thiểu</th>
                  <th>Hạn sử dụng</th>
                  <th>Lượt dùng / Giới hạn</th>
                  <th>Áp dụng cho</th>
                  <th>Trạng thái</th>
                  {isAdmin && <th className="text-right">Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => {
                  const status = getVoucherTimelineStatus(voucher);
                  const statusClass = status.toLowerCase();

                  return (
                    <tr key={voucher.id}>
                      <td>
                        <div className="admin-promo-code-cell">
                          <code>{voucher.code}</code>
                          <button
                            className="admin-promo-copy-btn"
                            onClick={() => handleCopyVoucher(voucher.code)}
                            title="Copy mã"
                          >
                            {copiedVoucherCode === voucher.code ? 'Đã copy' : 'Copy'}
                          </button>
                        </div>
                      </td>
                      <td>{voucher.discountType === 'PERCENT' ? 'Phần trăm (%)' : 'Số tiền cố định'}</td>
                      <td className="price">
                        {voucher.discountType === 'PERCENT'
                          ? `${voucher.value}%`
                          : formatVnd(voucher.value)}
                      </td>
                      <td>{formatVnd(voucher.minOrder)}</td>
                      <td>
                        {formatDate(voucher.startsAt)} - {formatDate(voucher.endsAt)}
                      </td>
                      <td>
                        {voucher.used} / {voucher.limit}
                      </td>
                      <td>
                        <div className="admin-promo-voucher-target">
                          <span>{voucher.appliesTo}</span>
                          <small>{voucher.customerTiers.join(', ')}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-promo-voucher-status ${statusClass}`}>
                          {getVoucherStatusLabel(status)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="text-right">
                          <div className="admin-service-list-actions justify-end gap-2">
                            <button className="admin-btn-icon" onClick={() => openEditVoucherModal(voucher)} title="Sửa">
                              <Pencil size={14} />
                            </button>
                            <button
                              className="admin-btn-icon admin-danger-soft text-rose-400 hover:bg-rose-500/10"
                              onClick={() => handleDeleteVoucher(voucher.id)}
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'COMBOS' && (
        <section className="admin-card admin-promo-voucher-wrap">
          <div className="overflow-x-auto">
            <table className="admin-table admin-service-list-table">
              <thead>
                <tr>
                  <th>Tên gói Combo</th>
                  <th>Dịch vụ bao gồm</th>
                  <th>Giá gốc</th>
                  <th>Giá Combo</th>
                  <th>Tiết kiệm</th>
                  <th>Thời hạn sử dụng</th>
                  <th>Lượt mua tháng này</th>
                </tr>
              </thead>
              <tbody>
                {loadingCombos ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-sm admin-muted-text">
                      Đang tải danh sách combo...
                    </td>
                  </tr>
                ) : combos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10">
                      Chưa có gói combo nào.
                    </td>
                  </tr>
                ) : (
                  combos.map((combo) => (
                    <tr key={combo.id}>
                      <td className="name-cell">
                        <span>{combo.name}</span>
                        <small>Gói combo tiết kiệm đặc biệt</small>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {combo.serviceTags.map((tag) => (
                            <span key={`${combo.id}-${tag}`} className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#1e293b] text-[#cbd5e1] border border-[#334155]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-slate-400 line-through">
                        {formatVnd(combo.originalPrice)}
                      </td>
                      <td className="price text-emerald-400 font-bold">
                        {formatVnd(combo.comboPrice)}
                      </td>
                      <td>
                        <div className="text-emerald-500 font-medium">
                          {combo.savedPercent}% ({formatVnd(combo.savedAmount)})
                        </div>
                      </td>
                      <td>{combo.validityDays} ngày sau mua</td>
                      <td>{combo.monthlyPurchases} lượt</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showPromotionModal && (
        <div className="admin-modal-overlay" onClick={() => !savingPromotion && setShowPromotionModal(false)}>
          <div className="admin-modal admin-modal-animate admin-promo-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingPromotion ? 'Sửa chương trình khuyến mãi' : 'Tạo chương trình khuyến mãi'}</h3>
              <button onClick={() => setShowPromotionModal(false)} className="admin-btn-icon">✕</button>
            </div>

            <div className="admin-modal-body admin-promo-form-layout">
              <div>
                <label className="admin-label">Tên chương trình</label>
                <input
                  className="admin-input"
                  value={promotionForm.ten_khuyen_mai}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, ten_khuyen_mai: event.target.value }))}
                  placeholder="Ví dụ: Golden Glow 20%"
                />
              </div>

              <div>
                <label className="admin-label">Mô tả ngắn</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={promotionForm.mo_ta}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, mo_ta: event.target.value }))}
                  placeholder="Mô tả giá trị chiến dịch để đội vận hành theo dõi"
                />
              </div>

              <div className="admin-promo-form-grid two">
                <div>
                  <label className="admin-label">Loại giảm</label>
                  <select
                    className="admin-select"
                    value={promotionForm.loai_giam}
                    onChange={(event) => setPromotionForm((prev) => ({ ...prev, loai_giam: event.target.value as 'PERCENT' | 'AMOUNT' }))}
                  >
                    <option value="PERCENT">Phần trăm (%)</option>
                    <option value="AMOUNT">Cố định (VNĐ)</option>
                  </select>
                </div>

                <div>
                  <label className="admin-label">Giá trị giảm</label>
                  <input
                    className="admin-input"
                    type="number"
                    value={promotionForm.gia_tri_giam}
                    onChange={(event) => setPromotionForm((prev) => ({ ...prev, gia_tri_giam: event.target.value }))}
                  />
                </div>
              </div>

              <div className="admin-promo-form-grid three">
                <div>
                  <label className="admin-label">Giảm tối đa</label>
                  <input
                    className="admin-input"
                    type="number"
                    value={promotionForm.giam_toi_da}
                    onChange={(event) => setPromotionForm((prev) => ({ ...prev, giam_toi_da: event.target.value }))}
                    placeholder="Tuỳ chọn"
                  />
                </div>
                <div>
                  <label className="admin-label">Đơn tối thiểu</label>
                  <input
                    className="admin-input"
                    type="number"
                    value={promotionForm.don_toi_thieu}
                    onChange={(event) => setPromotionForm((prev) => ({ ...prev, don_toi_thieu: event.target.value }))}
                    placeholder="Tuỳ chọn"
                  />
                </div>
                <div>
                  <label className="admin-label">Giới hạn lượt dùng</label>
                  <input
                    className="admin-input"
                    type="number"
                    value={promotionForm.so_luot_su_dung}
                    onChange={(event) => setPromotionForm((prev) => ({ ...prev, so_luot_su_dung: event.target.value }))}
                    placeholder="Không giới hạn nếu để trống"
                  />
                </div>
              </div>

              <div className="admin-promo-form-grid two">
                <div>
                  <label className="admin-label">Mã code (tuỳ chọn)</label>
                  <input
                    className="admin-input"
                    value={promotionForm.ma_code}
                    onChange={(event) => setPromotionForm((prev) => ({ ...prev, ma_code: event.target.value.toUpperCase() }))}
                    placeholder="VD: APRIL20"
                  />
                </div>
                <div>
                  <label className="admin-label">Trạng thái</label>
                  <select
                    className="admin-select"
                    value={promotionForm.trang_thai}
                    onChange={(event) => setPromotionForm((prev) => ({ ...prev, trang_thai: event.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="admin-promo-form-grid two">
                <div>
                  <label className="admin-label">Ngày hiệu lực</label>
                  <input
                    className="admin-input"
                    type="datetime-local"
                    value={promotionForm.ngay_bat_dau}
                    onChange={(event) => setPromotionForm((prev) => ({ ...prev, ngay_bat_dau: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Ngày hết hạn</label>
                  <input
                    className="admin-input"
                    type="datetime-local"
                    value={promotionForm.ngay_ket_thuc}
                    onChange={(event) => setPromotionForm((prev) => ({ ...prev, ngay_ket_thuc: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button onClick={() => setShowPromotionModal(false)} className="admin-btn admin-btn-secondary" disabled={savingPromotion}>
                Hủy
              </button>
              <button onClick={handleSubmitPromotion} className="admin-btn admin-promo-btn-gold" disabled={savingPromotion}>
                {savingPromotion ? 'Đang lưu...' : editingPromotion ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVoucherModal && (
        <div className="admin-modal-overlay" onClick={() => setShowVoucherModal(false)}>
          <div className="admin-modal admin-modal-animate admin-promo-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingVoucher ? 'Cập nhật voucher' : 'Tạo voucher mới'}</h3>
              <button onClick={() => setShowVoucherModal(false)} className="admin-btn-icon">✕</button>
            </div>

            <div className="admin-modal-body admin-promo-form-layout">
              <div>
                <label className="admin-label">Mã code</label>
                <div className="admin-promo-segment">
                  <button
                    className={voucherForm.codeMode === 'AUTO' ? 'active' : ''}
                    onClick={() => setVoucherForm((prev) => ({ ...prev, codeMode: 'AUTO', code: generateVoucherCode() }))}
                    type="button"
                  >
                    Auto-generate
                  </button>
                  <button
                    className={voucherForm.codeMode === 'CUSTOM' ? 'active' : ''}
                    onClick={() => setVoucherForm((prev) => ({ ...prev, codeMode: 'CUSTOM' }))}
                    type="button"
                  >
                    Custom
                  </button>
                </div>

                <div className="mt-2 flex gap-2">
                  <input
                    className="admin-input"
                    value={voucherForm.code}
                    onChange={(event) => setVoucherForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                    disabled={voucherForm.codeMode === 'AUTO'}
                  />
                  {voucherForm.codeMode === 'AUTO' && (
                    <button
                      className="admin-btn admin-btn-secondary"
                      type="button"
                      onClick={() => setVoucherForm((prev) => ({ ...prev, code: generateVoucherCode() }))}
                    >
                      Tạo lại
                    </button>
                  )}
                </div>
              </div>

              <div className="admin-promo-form-grid two">
                <div>
                  <label className="admin-label">Loại giảm giá</label>
                  <select
                    className="admin-select"
                    value={voucherForm.discountType}
                    onChange={(event) => setVoucherForm((prev) => ({ ...prev, discountType: event.target.value as 'PERCENT' | 'AMOUNT' }))}
                  >
                    <option value="PERCENT">%</option>
                    <option value="AMOUNT">Cố định (VNĐ)</option>
                  </select>
                </div>
                <div>
                  <label className="admin-label">Giá trị</label>
                  <input
                    className="admin-input"
                    type="number"
                    value={voucherForm.value}
                    onChange={(event) => setVoucherForm((prev) => ({ ...prev, value: event.target.value }))}
                  />
                </div>
              </div>

              <div className="admin-promo-form-grid two">
                <div>
                  <label className="admin-label">Điều kiện tối thiểu</label>
                  <input
                    className="admin-input"
                    type="number"
                    value={voucherForm.minOrder}
                    onChange={(event) => setVoucherForm((prev) => ({ ...prev, minOrder: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Giới hạn lượt dùng</label>
                  <input
                    className="admin-input"
                    type="number"
                    value={voucherForm.usageLimit}
                    onChange={(event) => setVoucherForm((prev) => ({ ...prev, usageLimit: event.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Áp dụng cho dịch vụ nào</label>
                <input
                  className="admin-input"
                  value={voucherForm.appliesTo}
                  onChange={(event) => setVoucherForm((prev) => ({ ...prev, appliesTo: event.target.value }))}
                  placeholder="Ví dụ: Facial, Massage đá nóng, Detox body"
                />
              </div>

              <div className="admin-promo-form-grid two">
                <div>
                  <label className="admin-label">Ngày hiệu lực</label>
                  <input
                    className="admin-input"
                    type="datetime-local"
                    value={voucherForm.startsAt}
                    onChange={(event) => setVoucherForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Ngày hết hạn</label>
                  <input
                    className="admin-input"
                    type="datetime-local"
                    value={voucherForm.endsAt}
                    onChange={(event) => setVoucherForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Hạng KH được dùng</label>
                <div className="admin-promo-tier-list">
                  {CUSTOMER_TIERS.map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      className={`tier-chip ${voucherForm.customerTiers.includes(tier) ? 'active' : ''}`}
                      onClick={() => toggleVoucherTier(tier)}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="admin-label">Trạng thái</label>
                <select
                  className="admin-select"
                  value={voucherForm.enabled ? 'ACTIVE' : 'PAUSED'}
                  onChange={(event) => setVoucherForm((prev) => ({ ...prev, enabled: event.target.value === 'ACTIVE' }))}
                >
                  <option value="ACTIVE">Đang bật</option>
                  <option value="PAUSED">Tạm dừng</option>
                </select>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowVoucherModal(false)}>Hủy</button>
              <button className="admin-btn admin-promo-btn-gold" onClick={handleSubmitVoucher}>
                {editingVoucher ? 'Lưu thay đổi' : 'Tạo voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
