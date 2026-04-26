import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileText,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Warehouse,
  X,
} from 'lucide-react';

import { inventoryApi, suppliersApi, importsApi, productsApi, uploadApi } from '../../api/admin.api';

type InventoryCategory = 'Tinh dầu' | 'Kem dưỡng' | 'Mặt nạ' | 'Dụng cụ' | 'Vật tư tiêu hao';
type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_STOCK';
type HistoryType = 'IMPORT' | 'EXPORT';

type SortOption = 'NAME_ASC' | 'LOW_TO_HIGH' | 'NEWEST_IMPORT';
type StockFilter = 'ALL' | StockStatus;
type HistoryFilter = 'ALL' | HistoryType;

interface ProductOption {
  id: number;
  code: string;
  name: string;
  category: InventoryCategory;
}

interface SupplierOption {
  id: number;
  name: string;
}

interface InventoryRow {
  id: number;
  inventoryId?: number;
  productId: number;
  code: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  quantity: number;
  alertLevel: number;
  latestCost: number;
  supplierName: string;
  supplierId?: number;
  lastImportDate?: string | null;
  image?: string;
  capacityBase: number;
  status: StockStatus;
}

interface StockHistoryRow {
  id: string;
  date: string;
  type: HistoryType;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  supplierName: string;
  note: string;
  source: 'API' | 'ESTIMATE' | 'SAMPLE';
}

interface ImportFormState {
  productId: number;
  quantity: number;
  unitCost: number;
  importDate: string;
  supplierId: number;
  note: string;
  invoiceFile: File | null;
}

const CATEGORY_OPTIONS: InventoryCategory[] = ['Tinh dầu', 'Kem dưỡng', 'Mặt nạ', 'Dụng cụ', 'Vật tư tiêu hao'];

const DEFAULT_IMPORT_FORM: ImportFormState = {
  productId: 0,
  quantity: 1,
  unitCost: 0,
  importDate: new Date().toISOString().slice(0, 10),
  supplierId: 0,
  note: '',
  invoiceFile: null,
};

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`;

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
};

const dateToMs = (value?: string | null) => {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const initialsOf = (value: string) =>
  (value || 'SP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'SP';

const resolveCategory = (categoryName: string, productName: string): InventoryCategory => {
  const text = `${categoryName || ''} ${productName || ''}`.toLowerCase();

  if (/(tinh dầu|essential oil|lavender|peppermint|aroma)/.test(text)) return 'Tinh dầu';
  if (/(kem|cream|serum|lotion|butter|shea)/.test(text)) return 'Kem dưỡng';
  if (/(mặt nạ|mask|đất sét|clay)/.test(text)) return 'Mặt nạ';
  if (/(đá|khăn|dụng cụ|massage|roller|cọ|đĩa|thìa|bát)/.test(text)) return 'Dụng cụ';
  return 'Vật tư tiêu hao';
};

const inferUnit = (category: InventoryCategory, productName: string) => {
  if (/khăn|đá|dụng cụ|cọ/i.test(productName)) return 'cái';
  if (category === 'Tinh dầu') return 'chai';
  if (category === 'Kem dưỡng') return 'hũ';
  if (category === 'Mặt nạ') return 'hộp';
  return 'gói';
};

const resolveStatus = (quantity: number, alertLevel: number): StockStatus => {
  if (quantity <= 0) return 'OUT_STOCK';
  if (quantity <= Math.max(1, alertLevel)) return 'LOW_STOCK';
  return 'IN_STOCK';
};

const estimateCostByCategory = (category: InventoryCategory) => {
  if (category === 'Tinh dầu') return 185000;
  if (category === 'Kem dưỡng') return 220000;
  if (category === 'Mặt nạ') return 168000;
  if (category === 'Dụng cụ') return 128000;
  return 56000;
};

const buildSampleRows = (): InventoryRow[] => {
  const sampleProducts: Array<{ name: string; category: InventoryCategory; unit?: string; quantity: number; alert: number; cost: number; supplier: string; dayOffset: number }> = [
    { name: 'Tinh dầu Lavender', category: 'Tinh dầu', quantity: 18, alert: 8, cost: 180000, supplier: 'Aroma Supply', dayOffset: 1 },
    { name: 'Kem dưỡng Shea Butter', category: 'Kem dưỡng', quantity: 12, alert: 6, cost: 240000, supplier: 'Botanica Labs', dayOffset: 2 },
    { name: 'Mặt nạ đất sét', category: 'Mặt nạ', quantity: 4, alert: 6, cost: 145000, supplier: 'Herbal Source', dayOffset: 3 },
    { name: 'Khăn spa', category: 'Dụng cụ', unit: 'cái', quantity: 35, alert: 15, cost: 65000, supplier: 'Spa Textile VN', dayOffset: 4 },
    { name: 'Đá nóng massage', category: 'Dụng cụ', unit: 'bộ', quantity: 0, alert: 4, cost: 350000, supplier: 'Thermal Stone Co', dayOffset: 6 },
    { name: 'Muối tắm Himalaya', category: 'Vật tư tiêu hao', quantity: 9, alert: 8, cost: 88000, supplier: 'Mineral House', dayOffset: 5 },
    { name: 'Tinh dầu Tràm trà', category: 'Tinh dầu', quantity: 22, alert: 10, cost: 195000, supplier: 'Aroma Supply', dayOffset: 2 },
    { name: 'Tinh dầu Bạc hà', category: 'Tinh dầu', quantity: 5, alert: 7, cost: 172000, supplier: 'Aroma Supply', dayOffset: 8 },
    { name: 'Kem dưỡng Collagen', category: 'Kem dưỡng', quantity: 16, alert: 7, cost: 265000, supplier: 'Botanica Labs', dayOffset: 3 },
    { name: 'Kem chống nắng body spa', category: 'Kem dưỡng', quantity: 0, alert: 5, cost: 210000, supplier: 'Botanica Labs', dayOffset: 11 },
    { name: 'Mặt nạ than hoạt tính', category: 'Mặt nạ', quantity: 10, alert: 6, cost: 158000, supplier: 'Herbal Source', dayOffset: 4 },
    { name: 'Mặt nạ Cica phục hồi', category: 'Mặt nạ', quantity: 3, alert: 5, cost: 176000, supplier: 'Herbal Source', dayOffset: 1 },
    { name: 'Bát trộn mask', category: 'Dụng cụ', unit: 'bộ', quantity: 14, alert: 5, cost: 92000, supplier: 'Spa Tools Pro', dayOffset: 7 },
    { name: 'Cọ đắp mặt nạ', category: 'Dụng cụ', unit: 'cái', quantity: 19, alert: 6, cost: 48000, supplier: 'Spa Tools Pro', dayOffset: 9 },
    { name: 'Khay inox dụng cụ', category: 'Dụng cụ', unit: 'cái', quantity: 2, alert: 3, cost: 135000, supplier: 'Spa Tools Pro', dayOffset: 10 },
    { name: 'Găng tay nitrile', category: 'Vật tư tiêu hao', unit: 'hộp', quantity: 11, alert: 9, cost: 75000, supplier: 'Consumable Depot', dayOffset: 5 },
    { name: 'Khẩu trang y tế', category: 'Vật tư tiêu hao', unit: 'hộp', quantity: 7, alert: 10, cost: 56000, supplier: 'Consumable Depot', dayOffset: 5 },
    { name: 'Bông tẩy trang', category: 'Vật tư tiêu hao', unit: 'gói', quantity: 25, alert: 12, cost: 43000, supplier: 'Consumable Depot', dayOffset: 6 },
    { name: 'Dung dịch sát khuẩn tay', category: 'Vật tư tiêu hao', unit: 'chai', quantity: 13, alert: 6, cost: 69000, supplier: 'Consumable Depot', dayOffset: 4 },
    { name: 'Giấy quấn body', category: 'Vật tư tiêu hao', unit: 'cuộn', quantity: 1, alert: 4, cost: 99000, supplier: 'Consumable Depot', dayOffset: 12 },
    { name: 'Tinh dầu Sả Chanh', category: 'Tinh dầu', quantity: 15, alert: 8, cost: 165000, supplier: 'Aroma Supply', dayOffset: 2 },
    { name: 'Kem ủ nóng thảo mộc', category: 'Kem dưỡng', quantity: 6, alert: 5, cost: 189000, supplier: 'Botanica Labs', dayOffset: 13 },
    { name: 'Mặt nạ ngủ dưỡng ẩm', category: 'Mặt nạ', quantity: 8, alert: 4, cost: 199000, supplier: 'Herbal Source', dayOffset: 3 },
    { name: 'Đai quấn nhiệt', category: 'Dụng cụ', unit: 'cái', quantity: 0, alert: 2, cost: 285000, supplier: 'Thermal Stone Co', dayOffset: 15 },
    { name: 'Ống hút tinh dầu mini', category: 'Vật tư tiêu hao', unit: 'bịch', quantity: 20, alert: 10, cost: 39000, supplier: 'Consumable Depot', dayOffset: 1 },
  ];

  return sampleProducts.map((item, idx) => {
    const productId = idx + 1;
    const lastImportDate = new Date(Date.now() - item.dayOffset * 86400000).toISOString();
    const capacityBase = Math.max(item.alert * 4, item.quantity + 8, 20);

    return {
      id: productId,
      productId,
      code: `SP-2026-${String(productId).padStart(4, '0')}`,
      name: item.name,
      category: item.category,
      unit: item.unit || inferUnit(item.category, item.name),
      quantity: item.quantity,
      alertLevel: item.alert,
      latestCost: item.cost,
      supplierName: item.supplier,
      lastImportDate,
      capacityBase,
      status: resolveStatus(item.quantity, item.alert),
    };
  });
};

const buildSampleHistory = (rows: InventoryRow[]): StockHistoryRow[] => {
  const history: StockHistoryRow[] = [];

  rows.forEach((row, idx) => {
    const importQty = Math.max(row.quantity, row.alertLevel + 2);
    const importDate = row.lastImportDate || new Date(Date.now() - (idx + 1) * 86400000).toISOString();

    history.push({
      id: `sample-import-${row.productId}`,
      date: importDate,
      type: 'IMPORT',
      productId: row.productId,
      productCode: row.code,
      productName: row.name,
      quantity: importQty,
      unitCost: row.latestCost,
      total: importQty * row.latestCost,
      supplierName: row.supplierName,
      note: 'Phiếu nhập mẫu đồng bộ giao diện kho.',
      source: 'SAMPLE',
    });

    const exported = Math.max(0, importQty - row.quantity);
    if (exported > 0) {
      history.push({
        id: `sample-export-${row.productId}`,
        date: new Date(new Date(importDate).getTime() + 86400000).toISOString(),
        type: 'EXPORT',
        productId: row.productId,
        productCode: row.code,
        productName: row.name,
        quantity: exported,
        unitCost: row.latestCost,
        total: exported * row.latestCost,
        supplierName: 'Sử dụng nội bộ',
        note: 'Xuất kho cho liệu trình dịch vụ.',
        source: 'SAMPLE',
      });
    }
  });

  return history.sort((a, b) => dateToMs(b.date) - dateToMs(a.date));
};

export default function InventoryManager() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [usingSample, setUsingSample] = useState(false);

  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [historyRows, setHistoryRows] = useState<StockHistoryRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'HISTORY'>('PRODUCTS');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | InventoryCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<StockFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST_IMPORT');

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importForm, setImportForm] = useState<ImportFormState>(DEFAULT_IMPORT_FORM);
  const [importSearch, setImportSearch] = useState('');
  const [submittingImport, setSubmittingImport] = useState(false);
  const [importError, setImportError] = useState('');

  const [inventoryPage, setInventoryPage] = useState(1);
  const pageSize = 10;

  const fetchAllPages = async (fetchFn: (page: number, pageSize: number) => Promise<any>) => {
    const rows: any[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const res = await fetchFn(page, 120);
      if (!res.success) {
        throw new Error(res.message || 'Không thể tải dữ liệu kho');
      }
      rows.push(...(Array.isArray(res.data) ? res.data : []));
      totalPages = Math.max(1, toNumber(res?.meta?.total_pages || 1));
      page += 1;
    } while (page <= totalPages);

    return rows;
  };

  const loadData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [inventoryData, suppliersData, importsData, productsData] = await Promise.all([
        fetchAllPages((page, pageSize) => inventoryApi.list(page, pageSize)),
        fetchAllPages((page, pageSize) => suppliersApi.list(page, pageSize)),
        fetchAllPages((page, pageSize) => importsApi.list(page, pageSize)),
        fetchAllPages((page, pageSize) => productsApi.list(page, pageSize)),
      ]);

      const supplierMap = new Map<number, any>();
      const supplierOptions: SupplierOption[] = suppliersData.map((s: any) => {
        supplierMap.set(toNumber(s.ma_nha_cung_cap), s);
        return { id: toNumber(s.ma_nha_cung_cap), name: s.ten_nha_cung_cap || `NCC #${s.ma_nha_cung_cap}` };
      });

      const productMap = new Map<number, any>();
      const productSelectOptions: ProductOption[] = [];
      productsData.forEach((p: any) => {
        const productId = toNumber(p.ma_san_pham);
        productMap.set(productId, p);
        const category = resolveCategory(p.ten_danh_muc || '', p.ten_san_pham || '');
        productSelectOptions.push({
          id: productId,
          code: `SP-${String(productId).padStart(4, '0')}`,
          name: p.ten_san_pham || `Sản phẩm #${productId}`,
          category,
        });
      });

      const importStatsMap = new Map<number, { totalImported: number; lastImportDate?: string | null; lastUnitCost: number; lastSupplierName: string; lastSupplierId?: number }>();
      const parsedImportHistory: StockHistoryRow[] = [];

      importsData.forEach((receipt: any) => {
        const receiptDate = receipt.ngay_nhap || receipt.ngay_tao || new Date().toISOString();
        const supplierId = toNumber(receipt.ma_nha_cung_cap);
        const supplierName =
          receipt.ten_nha_cung_cap || supplierMap.get(supplierId)?.ten_nha_cung_cap || `NCC #${supplierId || '-'}`;

        const details = Array.isArray(receipt.chi_tiets) ? receipt.chi_tiets : [];
        details.forEach((detail: any) => {
          const productId = toNumber(detail.ma_san_pham);
          const product = productMap.get(productId);
          const quantity = Math.max(0, toNumber(detail.so_luong));
          const unitCost = Math.max(0, toNumber(detail.don_gia));
          const total = Math.max(0, toNumber(detail.thanh_tien || unitCost * quantity));

          const currentStat = importStatsMap.get(productId) || {
            totalImported: 0,
            lastImportDate: null,
            lastUnitCost: 0,
            lastSupplierName: supplierName,
            lastSupplierId: supplierId,
          };

          const currentLast = dateToMs(currentStat.lastImportDate);
          const candidateDate = dateToMs(receiptDate);
          if (candidateDate >= currentLast) {
            currentStat.lastImportDate = receiptDate;
            currentStat.lastUnitCost = unitCost;
            currentStat.lastSupplierName = supplierName;
            currentStat.lastSupplierId = supplierId;
          }

          currentStat.totalImported += quantity;
          importStatsMap.set(productId, currentStat);

          parsedImportHistory.push({
            id: `import-${receipt.ma_phieu_nhap}-${detail.ma_chi_tiet || productId}`,
            date: receiptDate,
            type: 'IMPORT',
            productId,
            productCode: `SP-${String(productId).padStart(4, '0')}`,
            productName: product?.ten_san_pham || `Sản phẩm #${productId}`,
            quantity,
            unitCost,
            total,
            supplierName,
            note: detail.ghi_chu || receipt.ghi_chu || '',
            source: 'API',
          });
        });
      });

      const inventoryMap = new Map<number, InventoryRow>();

      inventoryData.forEach((inv: any) => {
        const productId = toNumber(inv.ma_san_pham);
        const product = productMap.get(productId);
        const stats = importStatsMap.get(productId);

        const name = inv.ten_san_pham || product?.ten_san_pham || `Sản phẩm #${productId}`;
        const category = resolveCategory(product?.ten_danh_muc || '', name);
        const alertLevel = Math.max(1, toNumber(inv.so_luong_toi_thieu || 5));
        const quantity = Math.max(0, toNumber(inv.so_luong));
        const latestCost = Math.max(0, toNumber(stats?.lastUnitCost || product?.bang_gias?.[0]?.gia || estimateCostByCategory(category)));
        const capacityBase = Math.max(alertLevel * 4, quantity + 8, 20);

        inventoryMap.set(productId, {
          id: toNumber(inv.ma_ton_kho || productId),
          inventoryId: toNumber(inv.ma_ton_kho),
          productId,
          code: `SP-${String(productId).padStart(4, '0')}`,
          name,
          category,
          unit: inv.don_vi || inferUnit(category, name),
          quantity,
          alertLevel,
          latestCost,
          supplierName: stats?.lastSupplierName || '—',
          supplierId: stats?.lastSupplierId,
          lastImportDate: stats?.lastImportDate || inv.ngay_cap_nhat || inv.ngay_tao || null,
          image: product?.hinh_anh || '',
          capacityBase,
          status: resolveStatus(quantity, alertLevel),
        });
      });

      productsData
        .filter((p: any) => String(p.loai || '').toUpperCase() === 'PRODUCT')
        .forEach((p: any) => {
          const productId = toNumber(p.ma_san_pham);
          if (inventoryMap.has(productId)) return;
          const category = resolveCategory(p.ten_danh_muc || '', p.ten_san_pham || '');
          const stats = importStatsMap.get(productId);
          const alertLevel = 5;
          const latestCost = Math.max(0, toNumber(stats?.lastUnitCost || p?.bang_gias?.[0]?.gia || estimateCostByCategory(category)));

          inventoryMap.set(productId, {
            id: productId,
            productId,
            code: `SP-${String(productId).padStart(4, '0')}`,
            name: p.ten_san_pham || `Sản phẩm #${productId}`,
            category,
            unit: inferUnit(category, p.ten_san_pham || ''),
            quantity: 0,
            alertLevel,
            latestCost,
            supplierName: stats?.lastSupplierName || '—',
            supplierId: stats?.lastSupplierId,
            lastImportDate: stats?.lastImportDate || p.ngay_tao || null,
            image: p.hinh_anh || '',
            capacityBase: Math.max(alertLevel * 4, 20),
            status: 'OUT_STOCK',
          });
        });

      let rows = Array.from(inventoryMap.values());
      let histories = [...parsedImportHistory];

      if (rows.length > 0) {
        rows.forEach((row) => {
          const stats = importStatsMap.get(row.productId);
          const totalImported = stats?.totalImported || 0;
          if (totalImported <= 0 || totalImported <= row.quantity) return;

          const estimatedExport = totalImported - row.quantity;
          const exportDate = row.lastImportDate
            ? new Date(dateToMs(row.lastImportDate) + 86400000).toISOString()
            : new Date().toISOString();

          histories.push({
            id: `export-est-${row.productId}`,
            date: exportDate,
            type: 'EXPORT',
            productId: row.productId,
            productCode: row.code,
            productName: row.name,
            quantity: estimatedExport,
            unitCost: row.latestCost,
            total: estimatedExport * row.latestCost,
            supplierName: 'Kho nội bộ',
            note: 'Ước tính xuất kho theo chênh lệch nhập - tồn hiện tại.',
            source: 'ESTIMATE',
          });
        });

        rows = rows.sort((a, b) => dateToMs(b.lastImportDate) - dateToMs(a.lastImportDate));
        histories = histories.sort((a, b) => dateToMs(b.date) - dateToMs(a.date));

        setInventoryRows(rows);
        setHistoryRows(histories);
        setSuppliers(supplierOptions);
        setProductOptions(productSelectOptions.sort((a, b) => a.name.localeCompare(b.name, 'vi')));
        setUsingSample(false);
      } else {
        const sampleRows = buildSampleRows();
        const sampleHistory = buildSampleHistory(sampleRows);

        const sampleSuppliers: SupplierOption[] = [
          { id: 1, name: 'Aroma Supply' },
          { id: 2, name: 'Botanica Labs' },
          { id: 3, name: 'Herbal Source' },
          { id: 4, name: 'Spa Textile VN' },
          { id: 5, name: 'Consumable Depot' },
        ];

        setInventoryRows(sampleRows);
        setHistoryRows(sampleHistory);
        setSuppliers(sampleSuppliers);
        setProductOptions(
          sampleRows
            .map((row) => ({ id: row.productId, code: row.code, name: row.name, category: row.category }))
            .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
        );
        setUsingSample(true);
        setError('Chưa có dữ liệu kho trên DB. Đang hiển thị bộ dữ liệu mẫu 25 sản phẩm.');
      }
    } catch (err: any) {
      const sampleRows = buildSampleRows();
      setInventoryRows(sampleRows);
      setHistoryRows(buildSampleHistory(sampleRows));
      setSuppliers([
        { id: 1, name: 'Aroma Supply' },
        { id: 2, name: 'Botanica Labs' },
        { id: 3, name: 'Herbal Source' },
      ]);
      setProductOptions(
        sampleRows
          .map((row) => ({ id: row.productId, code: row.code, name: row.name, category: row.category }))
          .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
      );
      setUsingSample(true);
      setError((err?.message || 'Không thể tải dữ liệu kho') + '. Đang chuyển sang dữ liệu mẫu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = useMemo(() => {
    const totalSku = inventoryRows.length;
    const lowStock = inventoryRows.filter((row) => row.status === 'LOW_STOCK').length;
    const outStock = inventoryRows.filter((row) => row.status === 'OUT_STOCK').length;
    const inventoryValue = inventoryRows.reduce((sum, row) => sum + row.quantity * row.latestCost, 0);
    return { totalSku, lowStock, outStock, inventoryValue };
  }, [inventoryRows]);

  const filteredRows = useMemo(() => {
    let rows = [...inventoryRows];

    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(term) ||
          row.code.toLowerCase().includes(term),
      );
    }

    if (categoryFilter !== 'ALL') {
      rows = rows.filter((row) => row.category === categoryFilter);
    }

    if (statusFilter !== 'ALL') {
      rows = rows.filter((row) => row.status === statusFilter);
    }

    if (sortBy === 'NAME_ASC') {
      rows.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    } else if (sortBy === 'LOW_TO_HIGH') {
      rows.sort((a, b) => a.quantity - b.quantity);
    } else {
      rows.sort((a, b) => dateToMs(b.lastImportDate) - dateToMs(a.lastImportDate));
    }

    return rows;
  }, [inventoryRows, search, categoryFilter, statusFilter, sortBy]);

  const pagedRows = useMemo(() => {
    const start = (inventoryPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, inventoryPage]);

  const inventoryTotalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    setInventoryPage(1);
  }, [search, categoryFilter, statusFilter, sortBy]);

  useEffect(() => {
    if (inventoryPage > inventoryTotalPages) {
      setInventoryPage(inventoryTotalPages);
    }
  }, [inventoryPage, inventoryTotalPages]);

  const filteredHistory = useMemo(() => {
    let rows = [...historyRows];

    if (historyFilter !== 'ALL') {
      rows = rows.filter((row) => row.type === historyFilter);
    }

    const term = historySearch.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (row) =>
          row.productName.toLowerCase().includes(term) ||
          row.productCode.toLowerCase().includes(term) ||
          row.supplierName.toLowerCase().includes(term),
      );
    }

    return rows.sort((a, b) => dateToMs(b.date) - dateToMs(a.date));
  }, [historyRows, historyFilter, historySearch]);

  const historyPageSize = 10;
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const pagedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, historyPage]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilter, historySearch]);

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  const openImportModal = (row?: InventoryRow) => {
    setImportError('');
    setImportSearch('');

    const defaultSupplier =
      row?.supplierId ||
      (suppliers.length > 0 ? suppliers[0].id : 0);

    setImportForm({
      ...DEFAULT_IMPORT_FORM,
      productId: row?.productId || (productOptions[0]?.id || 0),
      supplierId: defaultSupplier,
      unitCost: row?.latestCost || 0,
    });

    setShowImportModal(true);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportError('');
    setImportForm(DEFAULT_IMPORT_FORM);
  };

  const handleExportReport = () => {
    const rows = [
      [
        'Mã SP',
        'Tên sản phẩm',
        'Danh mục',
        'Đơn vị',
        'Tồn kho',
        'Mức cảnh báo',
        'Giá nhập',
        'Giá trị tồn',
        'Nhà cung cấp',
        'Ngày nhập cuối',
        'Trạng thái',
      ],
      ...filteredRows.map((row) => [
        row.code,
        row.name,
        row.category,
        row.unit,
        row.quantity,
        row.alertLevel,
        row.latestCost,
        row.quantity * row.latestCost,
        row.supplierName,
        formatDate(row.lastImportDate),
        row.status === 'IN_STOCK' ? 'Còn hàng' : row.status === 'LOW_STOCK' ? 'Sắp hết' : 'Hết hàng',
      ]),
    ];

    const csv = rows.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-kho-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAdjustAlert = async (row: InventoryRow) => {
    const value = window.prompt(`Thiết lập mức cảnh báo mới cho ${row.name}`, String(row.alertLevel));
    if (value === null) return;

    const nextAlert = Math.max(0, Math.round(toNumber(value)));
    if (!Number.isFinite(nextAlert)) return;

    if (!usingSample && row.inventoryId) {
      const res = await inventoryApi.update(row.inventoryId, { so_luong_toi_thieu: nextAlert });
      if (!res.success) {
        setError(res.message || 'Không thể cập nhật mức cảnh báo');
        return;
      }
      await loadData(true);
      return;
    }

    setInventoryRows((prev) =>
      prev.map((item) => {
        if (item.productId !== row.productId) return item;
        const alertLevel = Math.max(1, nextAlert);
        return {
          ...item,
          alertLevel,
          status: resolveStatus(item.quantity, alertLevel),
          capacityBase: Math.max(alertLevel * 4, item.quantity + 8, 20),
        };
      }),
    );
  };

  const filteredProductOptions = useMemo(() => {
    const term = importSearch.trim().toLowerCase();
    if (!term) return productOptions;

    return productOptions.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.code.toLowerCase().includes(term),
    );
  }, [productOptions, importSearch]);

  const handleSubmitImport = async () => {
    setImportError('');

    if (!importForm.productId) {
      setImportError('Vui lòng chọn sản phẩm cần nhập.');
      return;
    }
    if (!importForm.supplierId) {
      setImportError('Vui lòng chọn nhà cung cấp.');
      return;
    }
    if (importForm.quantity <= 0 || importForm.unitCost <= 0) {
      setImportError('Số lượng và giá nhập phải lớn hơn 0.');
      return;
    }

    setSubmittingImport(true);
    try {
      let note = importForm.note.trim();
      if (importForm.importDate) {
        note = `Ngày nhập: ${formatDate(importForm.importDate)}${note ? ` | ${note}` : ''}`;
      }

      if (importForm.invoiceFile) {
        const isImage = importForm.invoiceFile.type.startsWith('image/');
        if (isImage) {
          const uploaded = await uploadApi.product(importForm.invoiceFile);
          if (uploaded.success && uploaded.data?.url) {
            note = `${note ? `${note} | ` : ''}Hóa đơn: ${uploaded.data.url}`;
          } else {
            note = `${note ? `${note} | ` : ''}Hóa đơn: ${importForm.invoiceFile.name}`;
          }
        } else {
          note = `${note ? `${note} | ` : ''}Hóa đơn: ${importForm.invoiceFile.name}`;
        }
      }

      if (usingSample) {
        const supplierName = suppliers.find((s) => s.id === importForm.supplierId)?.name || 'NCC mẫu';
        const product = productOptions.find((item) => item.id === importForm.productId);

        setInventoryRows((prev) => {
          const existing = prev.find((item) => item.productId === importForm.productId);
          if (!existing) {
            const category = product?.category || 'Vật tư tiêu hao';
            const newRow: InventoryRow = {
              id: prev.length + 1000,
              productId: importForm.productId,
              code: product?.code || `SP-${String(importForm.productId).padStart(4, '0')}`,
              name: product?.name || `Sản phẩm #${importForm.productId}`,
              category,
              unit: inferUnit(category, product?.name || ''),
              quantity: importForm.quantity,
              alertLevel: 5,
              latestCost: importForm.unitCost,
              supplierName,
              supplierId: importForm.supplierId,
              lastImportDate: new Date(importForm.importDate || Date.now()).toISOString(),
              capacityBase: Math.max(20, importForm.quantity + 8),
              status: resolveStatus(importForm.quantity, 5),
            };
            return [newRow, ...prev];
          }

          return prev.map((item) => {
            if (item.productId !== importForm.productId) return item;
            const quantity = item.quantity + importForm.quantity;
            return {
              ...item,
              quantity,
              latestCost: importForm.unitCost,
              supplierName,
              supplierId: importForm.supplierId,
              lastImportDate: new Date(importForm.importDate || Date.now()).toISOString(),
              capacityBase: Math.max(item.capacityBase, quantity + 8, item.alertLevel * 4),
              status: resolveStatus(quantity, item.alertLevel),
            };
          });
        });

        setHistoryRows((prev) => {
          const historyRecord: StockHistoryRow = {
            id: `sample-manual-import-${Date.now()}`,
            date: new Date(importForm.importDate || Date.now()).toISOString(),
            type: 'IMPORT',
            productId: importForm.productId,
            productCode: product?.code || `SP-${String(importForm.productId).padStart(4, '0')}`,
            productName: product?.name || `Sản phẩm #${importForm.productId}`,
            quantity: importForm.quantity,
            unitCost: importForm.unitCost,
            total: importForm.quantity * importForm.unitCost,
            supplierName,
            note: note || 'Phiếu nhập dữ liệu mẫu',
            source: 'SAMPLE',
          };
          return [historyRecord, ...prev];
        });

        closeImportModal();
        setActiveTab('HISTORY');
        return;
      }

      const payload = {
        ma_nha_cung_cap: importForm.supplierId,
        ghi_chu: note || undefined,
        chi_tiets: [
          {
            ma_san_pham: importForm.productId,
            so_luong: Math.round(importForm.quantity),
            don_gia: importForm.unitCost,
            ghi_chu: note || undefined,
          },
        ],
      };

      const res = await importsApi.create(payload);
      if (!res.success) {
        throw new Error(res.message || 'Không thể tạo phiếu nhập');
      }

      closeImportModal();
      setActiveTab('HISTORY');
      await loadData(true);
    } catch (err: any) {
      setImportError(err?.message || 'Lỗi khi tạo phiếu nhập kho');
    } finally {
      setSubmittingImport(false);
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
    <div className="admin-stock-page admin-animate-in space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="admin-stock-heading">Kho & Quản Lý Sản Phẩm</h1>
          <p className="admin-stock-subtitle">
            {inventoryRows.length} SKU • {usingSample ? 'Nguồn dữ liệu mẫu' : 'Nguồn dữ liệu: API thực tế'}
          </p>
        </div>
        <button onClick={() => loadData(true)} className="admin-btn admin-btn-secondary" disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Làm mới dữ liệu
        </button>
      </div>

      {error && <p className="admin-stock-message error">{error}</p>}

      <div className="admin-stock-kpi-grid">
        <div className="admin-stock-kpi-card">
          <div className="admin-stock-kpi-icon"><Package size={18} /></div>
          <p className="admin-stock-kpi-label">Tổng sản phẩm</p>
          <p className="admin-stock-kpi-value">{new Intl.NumberFormat('vi-VN').format(kpis.totalSku)}</p>
          <p className="admin-stock-kpi-note">SKU đang quản lý</p>
        </div>

        <div className="admin-stock-kpi-card warning">
          <div className="admin-stock-kpi-icon"><AlertTriangle size={18} /></div>
          <p className="admin-stock-kpi-label">Sắp hết hàng</p>
          <p className="admin-stock-kpi-value">{new Intl.NumberFormat('vi-VN').format(kpis.lowStock)}</p>
          <p className="admin-stock-kpi-note"><span className="admin-stock-pulse-dot" /> Cần nhập bổ sung</p>
        </div>

        <div className="admin-stock-kpi-card danger">
          <div className="admin-stock-kpi-icon"><X size={18} /></div>
          <p className="admin-stock-kpi-label">Hết hàng</p>
          <p className="admin-stock-kpi-value">{new Intl.NumberFormat('vi-VN').format(kpis.outStock)}</p>
          <p className="admin-stock-kpi-note">Cần xử lý ngay</p>
        </div>

        <div className="admin-stock-kpi-card value">
          <div className="admin-stock-kpi-icon"><CircleDollarSign size={18} /></div>
          <p className="admin-stock-kpi-label">Giá trị tồn kho</p>
          <p className="admin-stock-kpi-value">{formatVnd(kpis.inventoryValue)}</p>
          <p className="admin-stock-kpi-note">Theo giá nhập gần nhất</p>
        </div>
      </div>

      {kpis.lowStock > 0 && (
        <div className="admin-stock-alert-banner">
          <span className="admin-stock-alert-text">⚠ {kpis.lowStock} sản phẩm cần nhập thêm hàng</span>
          <button
            className="admin-stock-alert-link"
            onClick={() => {
              setActiveTab('PRODUCTS');
              setStatusFilter('LOW_STOCK');
            }}
          >
            Xem ngay
          </button>
        </div>
      )}

      <div className="admin-card admin-stock-toolbar">
        <div className="admin-stock-toolbar-grid">
          <div className="admin-stock-search">
            <Search size={16} className="admin-stock-search-icon" />
            <input
              className="admin-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên / mã sản phẩm"
            />
          </div>

          <select className="admin-select admin-stock-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | InventoryCategory)}>
            <option value="ALL">Tất cả danh mục</option>
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select className="admin-select admin-stock-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StockFilter)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="IN_STOCK">Còn hàng</option>
            <option value="LOW_STOCK">Sắp hết</option>
            <option value="OUT_STOCK">Hết hàng</option>
          </select>

          <select className="admin-select admin-stock-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="NAME_ASC">Tên A-Z</option>
            <option value="LOW_TO_HIGH">Tồn kho thấp → cao</option>
            <option value="NEWEST_IMPORT">Mới nhập</option>
          </select>

          <div className="admin-stock-action-group">
            <button className="admin-btn admin-stock-btn-gold" onClick={() => openImportModal()}>
              <Plus size={16} /> Nhập hàng
            </button>
            <button className="admin-btn admin-stock-btn-outline" onClick={handleExportReport}>
              <Download size={16} /> Xuất báo cáo
            </button>
          </div>
        </div>
      </div>

      <div className="admin-stock-tabs">
        <button
          className={`admin-stock-tab ${activeTab === 'PRODUCTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('PRODUCTS')}
        >
          <Warehouse size={15} /> Danh sách tồn kho
        </button>
        <button
          className={`admin-stock-tab ${activeTab === 'HISTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          <FileText size={15} /> Lịch sử nhập/xuất kho
        </button>
      </div>

      {activeTab === 'PRODUCTS' ? (
        <div className="admin-card">
          {filteredRows.length === 0 ? (
            <div className="admin-empty">
              <Warehouse className="admin-empty-icon" />
              <p>Không có sản phẩm phù hợp bộ lọc.</p>
            </div>
          ) : (
            <>
              <div className="admin-stock-table-wrap">
                <table className="admin-table admin-stock-table">
                  <thead>
                    <tr>
                      <th>Ảnh</th>
                      <th>Mã SP</th>
                      <th>Tên sản phẩm</th>
                      <th>Danh mục</th>
                      <th>Đơn vị</th>
                      <th>Tồn kho</th>
                      <th>Mức cảnh báo</th>
                      <th>Giá nhập</th>
                      <th>Nhà cung cấp</th>
                      <th>Ngày nhập cuối</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row) => {
                      const ratio = row.capacityBase > 0 ? Math.min(100, (row.quantity / row.capacityBase) * 100) : 0;
                      const ratioClass = ratio > 50 ? 'high' : ratio >= 20 ? 'medium' : 'low';
                      const rowClass = row.status === 'OUT_STOCK' ? 'admin-stock-row-out' : row.status === 'LOW_STOCK' ? 'admin-stock-row-low' : '';
                      return (
                        <tr key={`${row.productId}-${row.inventoryId || row.id}`} className={rowClass}>
                          <td>
                            {row.image ? (
                              <img src={row.image} alt={row.name} className="admin-stock-thumb" />
                            ) : (
                              <div className="admin-stock-thumb fallback">{initialsOf(row.name)}</div>
                            )}
                          </td>
                          <td className="font-mono text-xs">{row.code}</td>
                          <td>
                            <div className="admin-stock-name-cell">
                              <span className="title">{row.name}</span>
                              <span className={`admin-stock-status ${row.status === 'IN_STOCK' ? 'in' : row.status === 'LOW_STOCK' ? 'low' : 'out'}`}>
                                {row.status === 'IN_STOCK' ? 'Còn hàng' : row.status === 'LOW_STOCK' ? 'Sắp hết' : 'Hết hàng'}
                              </span>
                            </div>
                          </td>
                          <td>{row.category}</td>
                          <td>{row.unit}</td>
                          <td>
                            <div className="admin-stock-qty-cell">
                              <span>{new Intl.NumberFormat('vi-VN').format(row.quantity)}</span>
                              <div className="admin-stock-progress-wrap">
                                <span className={`admin-stock-progress-bar ${ratioClass}`} style={{ width: `${Math.max(3, ratio)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td>{new Intl.NumberFormat('vi-VN').format(row.alertLevel)}</td>
                          <td className="admin-stock-money">{formatVnd(row.latestCost)}</td>
                          <td>{row.supplierName}</td>
                          <td>{formatDate(row.lastImportDate)}</td>
                          <td>
                            <div className="admin-stock-row-actions">
                              <button className="admin-btn-icon" title="Nhập hàng" onClick={() => openImportModal(row)}>
                                <Plus size={15} />
                              </button>
                              <button className="admin-btn-icon" title="Sửa mức cảnh báo" onClick={() => handleAdjustAlert(row)}>
                                <Pencil size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {inventoryTotalPages > 1 && (
                <div className="admin-pagination">
                  <span>Trang {inventoryPage} / {inventoryTotalPages} ({filteredRows.length} mục)</span>
                  <div className="admin-pagination-btns">
                    <button onClick={() => setInventoryPage((p) => Math.max(1, p - 1))} disabled={inventoryPage === 1}><ChevronLeft size={14} /></button>
                    {Array.from({ length: Math.min(5, inventoryTotalPages) }, (_, i) => {
                      let startPage = Math.max(1, inventoryPage - 2);
                      if (startPage + 4 > inventoryTotalPages) startPage = Math.max(1, inventoryTotalPages - 4);
                      const p = startPage + i;
                      return (
                        <button key={`inventory-page-${p}`} onClick={() => setInventoryPage(p)} className={inventoryPage === p ? 'active' : ''}>{p}</button>
                      );
                    })}
                    <button onClick={() => setInventoryPage((p) => Math.min(inventoryTotalPages, p + 1))} disabled={inventoryPage === inventoryTotalPages}><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="admin-card space-y-4">
          <div className="admin-stock-history-filters">
            <div className="admin-stock-search">
              <Search size={16} className="admin-stock-search-icon" />
              <input
                className="admin-input"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Tìm theo mã SP / tên SP / NCC"
              />
            </div>
            <select className="admin-select admin-stock-select" value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value as HistoryFilter)}>
              <option value="ALL">Tất cả giao dịch</option>
              <option value="IMPORT">Nhập kho</option>
              <option value="EXPORT">Xuất kho</option>
            </select>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="admin-empty">
              <FileText className="admin-empty-icon" />
              <p>Chưa có lịch sử nhập/xuất kho.</p>
            </div>
          ) : (
            <>
              <div className="admin-stock-table-wrap">
                <table className="admin-table admin-stock-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Loại</th>
                      <th>Mã SP</th>
                      <th>Sản phẩm</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th>Thành tiền</th>
                      <th>Nhà cung cấp</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedHistory.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDate(row.date)}</td>
                        <td>
                          <span className={`admin-stock-status ${row.type === 'IMPORT' ? 'in' : 'out'}`}>
                            {row.type === 'IMPORT' ? 'Nhập kho' : 'Xuất kho'}
                          </span>
                        </td>
                        <td className="font-mono text-xs">{row.productCode}</td>
                        <td>{row.productName}</td>
                        <td>{new Intl.NumberFormat('vi-VN').format(row.quantity)}</td>
                        <td>{formatVnd(row.unitCost)}</td>
                        <td className="admin-stock-money">{formatVnd(row.total)}</td>
                        <td>{row.supplierName}</td>
                        <td className="admin-stock-note-cell">{row.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {historyTotalPages > 1 && (
                <div className="admin-pagination">
                  <span>Trang {historyPage} / {historyTotalPages} ({filteredHistory.length} mục)</span>
                  <div className="admin-pagination-btns">
                    <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage === 1}><ChevronLeft size={14} /></button>
                    {Array.from({ length: Math.min(5, historyTotalPages) }, (_, i) => {
                      let startPage = Math.max(1, historyPage - 2);
                      if (startPage + 4 > historyTotalPages) startPage = Math.max(1, historyTotalPages - 4);
                      const p = startPage + i;
                      return (
                        <button key={`history-page-${p}`} onClick={() => setHistoryPage(p)} className={historyPage === p ? 'active' : ''}>{p}</button>
                      );
                    })}
                    <button onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))} disabled={historyPage === historyTotalPages}><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showImportModal && (
        <div className="admin-modal-overlay" onClick={closeImportModal}>
          <div className="admin-modal admin-modal-animate admin-stock-import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Nhập hàng</h3>
              <button onClick={closeImportModal} className="admin-btn-icon">✕</button>
            </div>

            <div className="admin-modal-body space-y-4">
              <div>
                <label className="admin-label">Tìm sản phẩm</label>
                <div className="admin-stock-search">
                  <Search size={16} className="admin-stock-search-icon" />
                  <input
                    className="admin-input"
                    value={importSearch}
                    onChange={(e) => setImportSearch(e.target.value)}
                    placeholder="Tìm theo mã / tên"
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Chọn sản phẩm *</label>
                <select
                  className="admin-select"
                  value={importForm.productId}
                  onChange={(e) => setImportForm((prev) => ({ ...prev, productId: toNumber(e.target.value) }))}
                >
                  <option value={0}>-- Chọn sản phẩm --</option>
                  {filteredProductOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} - {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-stock-form-grid">
                <div>
                  <label className="admin-label">Số lượng nhập *</label>
                  <input
                    type="number"
                    min={1}
                    className="admin-input"
                    value={importForm.quantity}
                    onChange={(e) => setImportForm((prev) => ({ ...prev, quantity: Math.max(1, toNumber(e.target.value)) }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Giá nhập (VNĐ) *</label>
                  <input
                    type="number"
                    min={0}
                    className="admin-input"
                    value={importForm.unitCost}
                    onChange={(e) => setImportForm((prev) => ({ ...prev, unitCost: Math.max(0, toNumber(e.target.value)) }))}
                  />
                </div>
              </div>

              <div className="admin-stock-form-grid">
                <div>
                  <label className="admin-label">Ngày nhập</label>
                  <input
                    type="date"
                    className="admin-input"
                    value={importForm.importDate}
                    onChange={(e) => setImportForm((prev) => ({ ...prev, importDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Nhà cung cấp *</label>
                  <select
                    className="admin-select"
                    value={importForm.supplierId}
                    onChange={(e) => setImportForm((prev) => ({ ...prev, supplierId: toNumber(e.target.value) }))}
                  >
                    <option value={0}>-- Chọn NCC --</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="admin-label">Ghi chú</label>
                <textarea
                  className="admin-input min-h-[92px]"
                  value={importForm.note}
                  onChange={(e) => setImportForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Ghi chú phiếu nhập"
                />
              </div>

              <div>
                <label className="admin-label">Upload hóa đơn nhập</label>
                <label className="admin-stock-upload-box">
                  <Upload size={16} />
                  <span>{importForm.invoiceFile ? importForm.invoiceFile.name : 'Chọn ảnh/PDF hóa đơn'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      setImportForm((prev) => ({ ...prev, invoiceFile: e.target.files?.[0] || null }))
                    }
                  />
                </label>
              </div>

              {importError && <p className="admin-stock-message error">{importError}</p>}
            </div>

            <div className="admin-modal-footer">
              <button onClick={closeImportModal} className="admin-btn admin-btn-secondary">Hủy</button>
              <button onClick={handleSubmitImport} className="admin-btn admin-stock-btn-gold" disabled={submittingImport}>
                {submittingImport ? 'Đang lưu...' : 'Lưu phiếu nhập'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
