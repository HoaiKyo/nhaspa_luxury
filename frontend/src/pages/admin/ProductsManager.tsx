import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  GripVertical,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { appointmentsApi, categoriesApi, productsApi, staffApi, uploadApi } from '../../api/admin.api';
import { useAuth } from '../../contexts/AuthContext';

type ViewMode = 'GRID' | 'LIST';

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  order: number;
}

interface StaffOption {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface ServiceItem {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  categoryName: string;
  duration: number;
  description: string;
  shortDescription: string;
  price: number;
  image: string;
  active: boolean;
  monthlyBookings: number;
}

interface ServiceMeta {
  materials: string[];
  staffIds: number[];
  internalNote: string;
}

interface ServiceFormState {
  name: string;
  slug: string;
  categoryId: number;
  duration: number;
  price: number;
  description: string;
  image: string;
  active: boolean;
  materials: string[];
  staffIds: number[];
  internalNote: string;
}

interface CategoryFormState {
  name: string;
  icon: string;
  description: string;
}

const SERVICE_META_STORAGE_KEY = 'spa_service_meta_v1';

const CATEGORY_EMOJI_FALLBACK: Array<{ pattern: RegExp; emoji: string }> = [
  { pattern: /(massage|body|thư giãn|cổ vai gáy|đá nóng|trị liệu)/i, emoji: '💆' },
  { pattern: /(da|facial|mụn|nám|mask|chăm sóc da)/i, emoji: '🧖' },
  { pattern: /(tắm|thanh tẩy|detox|muối)/i, emoji: '🛁' },
  { pattern: /(tóc|đầu|gội|dưỡng sinh tóc)/i, emoji: '💇' },
  { pattern: /(móng|nail)/i, emoji: '💅' },
  { pattern: /(trị liệu|therapy|chuyên sâu|rf)/i, emoji: '🪨' },
];

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`;

const initialsOf = (name: string) =>
  (name || 'NV')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'NV';

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const slugify = (value: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const resolveEmoji = (categoryName: string, iconValue?: string) => {
  if (iconValue && iconValue.trim()) {
    const trimmed = iconValue.trim();
    if ([...trimmed].length <= 3) return trimmed;
  }

  const matched = CATEGORY_EMOJI_FALLBACK.find((item) => item.pattern.test(categoryName));
  return matched?.emoji || '✨';
};

const loadServiceMeta = (): Record<number, ServiceMeta> => {
  try {
    const raw = localStorage.getItem(SERVICE_META_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const saveServiceMeta = (metaMap: Record<number, ServiceMeta>) => {
  localStorage.setItem(SERVICE_META_STORAGE_KEY, JSON.stringify(metaMap));
};

const reorderArray = <T extends object>(arr: T[], fromIndex: number, toIndex: number) => {
  const copied = [...arr];
  const moved = copied.splice(fromIndex, 1)[0];
  if (typeof moved === 'undefined') return copied;
  copied.splice(toIndex, 0, moved);
  return copied;
};

const getDefaultServiceForm = (categoryId = 0): ServiceFormState => ({
  name: '',
  slug: '',
  categoryId,
  duration: 60,
  price: 0,
  description: '',
  image: '',
  active: true,
  materials: [],
  staffIds: [],
  internalNote: '',
});

export default function ProductsManager() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.vai_tros?.includes('ADMIN'));

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staffs, setStaffs] = useState<StaffOption[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');

  const [draggingCategoryId, setDraggingCategoryId] = useState<number | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({ name: '', icon: '', description: '' });
  const [categorySaving, setCategorySaving] = useState(false);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(getDefaultServiceForm());
  const [materialInput, setMaterialInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggingUpload, setDraggingUpload] = useState(false);
  const serviceImageInputRef = useRef<HTMLInputElement>(null);

  const [serviceMetaMap, setServiceMetaMap] = useState<Record<number, ServiceMeta>>(() => loadServiceMeta());

  const [servicePage, setServicePage] = useState(1);
  const servicePageSize = 9;

  const loadData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    const fetchAllProducts = async () => {
      const rows: any[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const res = await productsApi.list(page, 120);
        if (!res.success) {
          throw new Error(res.message || 'Không thể tải danh sách dịch vụ');
        }
        rows.push(...(Array.isArray(res.data) ? res.data : []));
        totalPages = Math.max(1, toNumber(res?.meta?.total_pages || 1));
        page += 1;
      } while (page <= totalPages);

      return rows;
    };

    const fetchAllStaff = async () => {
      const rows: any[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const res = await staffApi.list(page, 120);
        if (!res.success) {
          throw new Error(res.message || 'Không thể tải danh sách nhân viên');
        }
        rows.push(...(Array.isArray(res.data) ? res.data : []));
        totalPages = Math.max(1, toNumber(res?.meta?.total_pages || 1));
        page += 1;
      } while (page <= totalPages);

      return rows;
    };

    const fetchCurrentMonthBookings = async () => {
      const now = new Date();
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      const counts = new Map<number, number>();
      let page = 1;
      let totalPages = 1;

      do {
        const res = await appointmentsApi.list(page, 120, { from_date: start, to_date: end });
        if (!res.success) {
          throw new Error(res.message || 'Không thể tải thống kê lượt đặt');
        }

        const appts = Array.isArray(res.data) ? res.data : [];
        appts.forEach((appt: any) => {
          const status = String(appt.trang_thai || '').toUpperCase();
          if (status === 'CANCELLED' || status === 'NO_SHOW') return;

          const details = Array.isArray(appt.chi_tiets) ? appt.chi_tiets : [];
          details.forEach((detail: any) => {
            const serviceId = toNumber(detail.ma_san_pham);
            if (serviceId <= 0) return;
            counts.set(serviceId, (counts.get(serviceId) || 0) + 1);
          });
        });

        totalPages = Math.max(1, toNumber(res?.meta?.total_pages || 1));
        page += 1;
      } while (page <= totalPages);

      return counts;
    };

    try {
      const [catRes, rawProducts, rawStaffs, monthlyBookingMap] = await Promise.all([
        categoriesApi.list(),
        fetchAllProducts(),
        fetchAllStaff(),
        fetchCurrentMonthBookings(),
      ]);

      if (!catRes.success) {
        throw new Error(catRes.message || 'Không thể tải danh mục dịch vụ');
      }

      const loadedCategories: CategoryNode[] = (Array.isArray(catRes.data) ? catRes.data : [])
        .map((cat: any) => ({
          id: toNumber(cat.ma_danh_muc),
          name: cat.ten_danh_muc || `Danh mục #${cat.ma_danh_muc}`,
          slug: cat.slug || slugify(cat.ten_danh_muc || ''),
          description: cat.mo_ta || '',
          icon: resolveEmoji(cat.ten_danh_muc || '', cat.icon),
          order: toNumber(cat.thu_tu),
        }))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'vi'));

      const categoryMap = new Map<number, CategoryNode>();
      loadedCategories.forEach((cat) => categoryMap.set(cat.id, cat));

      const loadedServices: ServiceItem[] = rawProducts
        .filter((product: any) => String(product.loai || '').toUpperCase() !== 'PRODUCT')
        .map((product: any) => {
          const serviceId = toNumber(product.ma_san_pham);
          const categoryId = toNumber(product.ma_danh_muc);
          const category = categoryMap.get(categoryId);
          const description = product.mo_ta || product.mo_ta_ngan || '';
          const shortDescription = (product.mo_ta_ngan || stripHtml(description)).slice(0, 180);
          const price = toNumber(product?.bang_gias?.[0]?.gia);

          return {
            id: serviceId,
            name: product.ten_san_pham || `Dịch vụ #${serviceId}`,
            slug: product.slug || slugify(product.ten_san_pham || ''),
            categoryId,
            categoryName: category?.name || product.ten_danh_muc || 'Chưa phân loại',
            duration: Math.max(30, toNumber(product.thoi_luong || 60)),
            description,
            shortDescription,
            price,
            image: product.hinh_anh || '',
            active: Boolean(product.trang_thai),
            monthlyBookings: monthlyBookingMap.get(serviceId) || 0,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

      const loadedStaffs: StaffOption[] = rawStaffs
        .filter((staff: any) => staff.trang_thai !== false)
        .map((staff: any) => ({
          id: toNumber(staff.ma_nhan_vien),
          name: staff.ho_ten || `Nhân viên #${staff.ma_nhan_vien}`,
          email: staff.email || '',
          avatar: initialsOf(staff.ho_ten || `NV ${staff.ma_nhan_vien}`),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

      setCategories(loadedCategories);
      setServices(loadedServices);
      setStaffs(loadedStaffs);

      if (loadedCategories.length > 0) {
        const hasSelected = loadedCategories.some((cat) => cat.id === selectedCategoryId);
        if (!hasSelected) {
          setSelectedCategoryId(loadedCategories[0].id);
        }
      } else {
        setSelectedCategoryId(0);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu dịch vụ');
      setCategories([]);
      setServices([]);
      setStaffs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<number, number>();
    services.forEach((service) => {
      counts.set(service.categoryId, (counts.get(service.categoryId) || 0) + 1);
    });
    return counts;
  }, [services]);

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );

  const servicesInCategory = useMemo(() => {
    if (!selectedCategoryId) return [];
    return services.filter((service) => service.categoryId === selectedCategoryId);
  }, [services, selectedCategoryId]);

  const serviceTotalPages = Math.max(1, Math.ceil(servicesInCategory.length / servicePageSize));

  const pagedServices = useMemo(() => {
    const start = (servicePage - 1) * servicePageSize;
    return servicesInCategory.slice(start, start + servicePageSize);
  }, [servicesInCategory, servicePage]);

  useEffect(() => {
    setServicePage(1);
  }, [selectedCategoryId, viewMode]);

  useEffect(() => {
    if (servicePage > serviceTotalPages) {
      setServicePage(serviceTotalPages);
    }
  }, [servicePage, serviceTotalPages]);

  const persistCategoryOrder = async (reorderedCategories: CategoryNode[]) => {
    const changed: Array<{ id: number; order: number }> = [];

    reorderedCategories.forEach((cat, index) => {
      if (cat.order !== index) {
        changed.push({ id: cat.id, order: index });
      }
    });

    if (changed.length === 0) return;

    const results = await Promise.all(
      changed.map((item) => categoriesApi.update(item.id, { thu_tu: item.order })),
    );

    const failed = results.find((res: any) => !res.success);
    if (failed) {
      throw new Error(failed.message || 'Không thể cập nhật thứ tự danh mục');
    }
  };

  const handleDropCategory = async (targetCategoryId: number) => {
    if (!isAdmin) return;
    if (!draggingCategoryId || draggingCategoryId === targetCategoryId) return;

    const fromIndex = categories.findIndex((cat) => cat.id === draggingCategoryId);
    const toIndex = categories.findIndex((cat) => cat.id === targetCategoryId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered: CategoryNode[] = reorderArray(categories, fromIndex, toIndex).map((cat: CategoryNode, index) => ({
      ...cat,
      order: index,
    }));

    setCategories(reordered);

    try {
      await persistCategoryOrder(reordered);
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật thứ tự danh mục');
      await loadData(true);
    }
  };

  const handleToggleServiceStatus = async (service: ServiceItem) => {
    const nextStatus = !service.active;

    setServices((prev) => prev.map((item) => (item.id === service.id ? { ...item, active: nextStatus } : item)));

    const res = await productsApi.update(service.id, { trang_thai: nextStatus });
    if (!res.success) {
      setServices((prev) => prev.map((item) => (item.id === service.id ? { ...item, active: service.active } : item)));
      setError(res.message || 'Không thể cập nhật trạng thái dịch vụ');
    }
  };

  const handleDeleteService = async (service: ServiceItem) => {
    const ok = window.confirm(`Bạn có chắc muốn xóa dịch vụ "${service.name}"?`);
    if (!ok) return;

    const res = await productsApi.delete(service.id);
    if (!res.success) {
      setError(res.message || 'Không thể xóa dịch vụ');
      return;
    }

    setServices((prev) => prev.filter((item) => item.id !== service.id));
  };

  const openCreateCategoryModal = () => {
    setCategoryForm({ name: '', icon: '', description: '' });
    setShowCategoryModal(true);
  };

  const submitCategory = async () => {
    const name = categoryForm.name.trim();
    if (!name) {
      setError('Vui lòng nhập tên danh mục');
      return;
    }

    setCategorySaving(true);
    try {
      const payload = {
        ten_danh_muc: name,
        slug: slugify(name) || `danh-muc-${Date.now()}`,
        mo_ta: categoryForm.description.trim() || undefined,
        icon: categoryForm.icon.trim() || resolveEmoji(name),
        thu_tu: categories.length,
      };

      const res = await categoriesApi.create(payload);
      if (!res.success) {
        throw new Error(res.message || 'Không thể tạo danh mục');
      }

      setShowCategoryModal(false);
      await loadData(true);

      const createdId = toNumber((res as any)?.data?.ma_danh_muc);
      if (createdId > 0) {
        setSelectedCategoryId(createdId);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo danh mục');
    } finally {
      setCategorySaving(false);
    }
  };

  const openCreateServiceModal = () => {
    setEditingService(null);
    setMaterialInput('');
    setServiceForm(getDefaultServiceForm(selectedCategoryId || categories[0]?.id || 0));
    setShowServiceModal(true);
  };

  const openEditServiceModal = (service: ServiceItem) => {
    const meta = serviceMetaMap[service.id];
    setEditingService(service);
    setMaterialInput('');
    setServiceForm({
      name: service.name,
      slug: service.slug,
      categoryId: service.categoryId,
      duration: service.duration,
      price: service.price,
      description: service.description,
      image: service.image,
      active: service.active,
      materials: meta?.materials || [],
      staffIds: meta?.staffIds || [],
      internalNote: meta?.internalNote || '',
    });
    setShowServiceModal(true);
  };

  const applyUploadedImage = async (file?: File | null) => {
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadApi.product(file);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể upload ảnh dịch vụ');
      }

      const imageUrl = (res.data as any).file_path || (res.data as any).url || '';
      if (!imageUrl) {
        throw new Error('Không nhận được URL ảnh sau upload');
      }

      setServiceForm((prev) => ({ ...prev, image: imageUrl }));
    } catch (err: any) {
      setError(err?.message || 'Upload ảnh thất bại');
    } finally {
      setUploadingImage(false);
      if (serviceImageInputRef.current) serviceImageInputRef.current.value = '';
    }
  };

  const handleDropImage = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggingUpload(false);
    const file = event.dataTransfer.files?.[0];
    await applyUploadedImage(file);
  };

  const addMaterialTag = () => {
    const value = materialInput.trim();
    if (!value) return;

    if (!serviceForm.materials.includes(value)) {
      setServiceForm((prev) => ({ ...prev, materials: [...prev.materials, value] }));
    }

    setMaterialInput('');
  };

  const removeMaterialTag = (tag: string) => {
    setServiceForm((prev) => ({ ...prev, materials: prev.materials.filter((item) => item !== tag) }));
  };

  const toggleStaffSelection = (staffId: number) => {
    setServiceForm((prev) => {
      const exists = prev.staffIds.includes(staffId);
      return {
        ...prev,
        staffIds: exists
          ? prev.staffIds.filter((id) => id !== staffId)
          : [...prev.staffIds, staffId],
      };
    });
  };

  const persistServiceMeta = (serviceId: number, form: ServiceFormState) => {
    const nextMap = {
      ...serviceMetaMap,
      [serviceId]: {
        materials: form.materials,
        staffIds: form.staffIds,
        internalNote: form.internalNote,
      },
    };

    setServiceMetaMap(nextMap);
    saveServiceMeta(nextMap);
  };

  const submitService = async () => {
    const name = serviceForm.name.trim();
    if (!name) {
      setError('Vui lòng nhập tên dịch vụ');
      return;
    }
    if (!serviceForm.categoryId) {
      setError('Vui lòng chọn danh mục dịch vụ');
      return;
    }

    setSavingService(true);

    try {
      const normalizedSlug = slugify(serviceForm.slug || name) || `dich-vu-${Date.now()}`;
      const shortDescription = stripHtml(serviceForm.description).slice(0, 180);

      const payload = {
        ten_san_pham: name,
        slug: normalizedSlug,
        ma_danh_muc: serviceForm.categoryId,
        hinh_anh: serviceForm.image || undefined,
        mo_ta: serviceForm.description,
        mo_ta_ngan: shortDescription,
        loai: 'SERVICE',
        thoi_luong: Math.max(15, Math.round(serviceForm.duration || 60)),
        trang_thai: serviceForm.active,
      };

      if (editingService) {
        const updateRes = await productsApi.update(editingService.id, payload);
        if (!updateRes.success) {
          throw new Error(updateRes.message || 'Không thể cập nhật dịch vụ');
        }

        const priceChanged = Math.round(editingService.price) !== Math.round(serviceForm.price);
        if (priceChanged) {
          const priceRes = await productsApi.addPrice(editingService.id, {
            gia: Math.max(0, serviceForm.price),
            ngay_ap_dung: new Date().toISOString(),
          });

          if (!priceRes.success) {
            throw new Error(priceRes.message || 'Không thể cập nhật giá dịch vụ');
          }
        }

        persistServiceMeta(editingService.id, serviceForm);
      } else {
        const createRes = await productsApi.create({
          ...payload,
          bang_gias: [
            {
              gia: Math.max(0, serviceForm.price),
              ngay_ap_dung: new Date().toISOString(),
            },
          ],
        });

        if (!createRes.success) {
          throw new Error(createRes.message || 'Không thể tạo mới dịch vụ');
        }

        const serviceId = toNumber((createRes as any)?.data?.ma_san_pham);
        if (serviceId > 0) {
          persistServiceMeta(serviceId, serviceForm);
        }
      }

      setShowServiceModal(false);
      setEditingService(null);
      await loadData(true);
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu dịch vụ');
    } finally {
      setSavingService(false);
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
    <div className="admin-service-page admin-animate-in">
      {error && (
        <p className="admin-service-error">
          <CircleAlert size={14} /> {error}
        </p>
      )}

      <div className="admin-service-layout">
        <aside className="admin-service-categories-panel">
          <div className="admin-service-panel-header">
            <div>
              <h2>Danh mục dịch vụ</h2>
              <p>{categories.length} danh mục</p>
            </div>
            {isAdmin && (
              <button className="admin-btn admin-service-btn-gold" onClick={openCreateCategoryModal}>
                <Plus size={14} /> Thêm danh mục
              </button>
            )}
          </div>

          <div className="admin-service-category-tree">
            {categories.length === 0 ? (
              <div className="admin-empty">
                <p>Chưa có danh mục dịch vụ.</p>
              </div>
            ) : (
              categories.map((category) => {
                const isActive = selectedCategoryId === category.id;
                const count = categoryCounts.get(category.id) || 0;

                return (
                  <button
                    key={category.id}
                    className={`admin-service-category-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedCategoryId(category.id)}
                    draggable={isAdmin}
                    onDragStart={() => isAdmin && setDraggingCategoryId(category.id)}
                    onDragEnd={() => isAdmin && setDraggingCategoryId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleDropCategory(category.id);
                    }}
                  >
                    <span className="drag"><GripVertical size={14} /></span>
                    <span className="name">{category.name}</span>
                    <span className="badge">{count}</span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="admin-service-content-panel">
          <div className="admin-service-content-header">
            <div>
              <h1>{selectedCategory?.name || 'Chưa chọn danh mục'}</h1>
              <p>
                {selectedCategory?.description || 'Quản lý dịch vụ theo danh mục'} • {servicesInCategory.length} dịch vụ
              </p>
            </div>
            {isAdmin && (
              <button className="admin-btn admin-service-btn-gold" onClick={openCreateServiceModal}>
                <Plus size={16} /> Thêm dịch vụ
              </button>
            )}
          </div>

          {servicesInCategory.length === 0 ? (
            <div className="admin-card admin-empty">
              <p>Danh mục này chưa có dịch vụ. Hãy thêm dịch vụ mới.</p>
            </div>
          ) : (
            <div className="admin-card admin-service-list-wrap">
              <table className="admin-table admin-service-list-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Danh mục</th>
                    <th>Thời lượng</th>
                    <th>Giá</th>
                    <th>Lượt đặt</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedServices.map((service) => (
                    <tr key={service.id}>
                      <td className="name-cell">
                        <span>{service.name}</span>
                        <small>{service.shortDescription || '—'}</small>
                      </td>
                      <td>{service.categoryName}</td>
                      <td>{service.duration}'</td>
                      <td className="price">{formatVnd(service.price)}</td>
                      <td>{service.monthlyBookings}</td>
                      <td>
                        <button
                          className={`admin-service-status-switch small ${service.active ? 'active' : ''}`}
                          onClick={() => isAdmin && handleToggleServiceStatus(service)}
                          disabled={!isAdmin}
                        >
                          <span className="dot" />
                          {service.active ? 'Hoạt động' : 'Tạm dừng'}
                        </button>
                      </td>
                      <td>
                        <div className="admin-service-list-actions">
                          {isAdmin && (
                            <>
                              <button className="admin-btn-icon" onClick={() => openEditServiceModal(service)}>
                                <Pencil size={15} />
                              </button>
                              <button className="admin-btn-icon danger" onClick={() => handleDeleteService(service)}>
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {serviceTotalPages > 1 && (
            <div className="admin-pagination">
              <span>Trang {servicePage} / {serviceTotalPages} ({servicesInCategory.length} mục)</span>
              <div className="admin-pagination-btns">
                <button onClick={() => setServicePage((p) => Math.max(1, p - 1))} disabled={servicePage === 1}><ChevronLeft size={14} /></button>
                {Array.from({ length: Math.min(5, serviceTotalPages) }, (_, i) => {
                  let startPage = Math.max(1, servicePage - 2);
                  if (startPage + 4 > serviceTotalPages) startPage = Math.max(1, serviceTotalPages - 4);
                  const p = startPage + i;
                  return (
                    <button key={`service-page-${p}`} onClick={() => setServicePage(p)} className={servicePage === p ? 'active' : ''}>{p}</button>
                  );
                })}
                <button onClick={() => setServicePage((p) => Math.min(serviceTotalPages, p + 1))} disabled={servicePage === serviceTotalPages}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </section>
      </div>

      {showCategoryModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="admin-modal admin-modal-animate" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Thêm danh mục dịch vụ</h3>
              <button className="admin-btn-icon" onClick={() => setShowCategoryModal(false)}>✕</button>
            </div>
            <div className="admin-modal-body space-y-4">
              <div>
                <label className="admin-label">Tên danh mục *</label>
                <input
                  className="admin-input"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ví dụ: Massage"
                />
              </div>

              <div>
                <label className="admin-label">Icon (emoji)</label>
                <input
                  className="admin-input"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, icon: e.target.value }))}
                  placeholder="💆"
                />
              </div>

              <div>
                <label className="admin-label">Mô tả</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowCategoryModal(false)}>Hủy</button>
              <button className="admin-btn admin-service-btn-gold" onClick={submitCategory} disabled={categorySaving}>
                {categorySaving ? 'Đang lưu...' : 'Tạo danh mục'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showServiceModal && (
        <div className="admin-modal-overlay" onClick={() => setShowServiceModal(false)}>
          <div className="admin-modal admin-modal-animate admin-service-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingService ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</h3>
              <button className="admin-btn-icon" onClick={() => setShowServiceModal(false)}>✕</button>
            </div>

            <div className="admin-modal-body space-y-4">
              <div
                className={`admin-service-upload-zone ${draggingUpload ? 'dragging' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDraggingUpload(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDraggingUpload(false);
                }}
                onDrop={handleDropImage}
              >
                <input
                  ref={serviceImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => applyUploadedImage(event.target.files?.[0])}
                />

                {serviceForm.image ? (
                  <img src={serviceForm.image} alt="Ảnh dịch vụ" className="preview" />
                ) : (
                  <div className="placeholder">
                    <Upload size={18} />
                    <p>Kéo thả ảnh hoặc bấm để tải lên</p>
                  </div>
                )}

                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => serviceImageInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Đang tải...' : 'Upload ảnh'}
                </button>
              </div>

              <div className="admin-service-form-grid two">
                <div>
                  <label className="admin-label">Tên dịch vụ *</label>
                  <input
                    className="admin-input"
                    value={serviceForm.name}
                    onChange={(e) =>
                      setServiceForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                        slug: prev.slug || slugify(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="admin-label">Danh mục *</label>
                  <select
                    className="admin-select"
                    value={serviceForm.categoryId}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, categoryId: toNumber(e.target.value) }))}
                  >
                    <option value={0}>-- Chọn danh mục --</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="admin-label">Mô tả (rich textarea)</label>
                <textarea
                  className="admin-input admin-service-rich-textarea"
                  rows={5}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả liệu trình, lợi ích, quy trình thực hiện..."
                />
              </div>

              <div className="admin-service-form-grid two">
                <div>
                  <label className="admin-label">Thời lượng (phút)</label>
                  <input
                    type="number"
                    min={15}
                    className="admin-input"
                    value={serviceForm.duration}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, duration: Math.max(15, toNumber(e.target.value)) }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Giá (VNĐ)</label>
                  <input
                    type="number"
                    min={0}
                    className="admin-input"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, price: Math.max(0, toNumber(e.target.value)) }))}
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Nguyên liệu / vật tư sử dụng (tag input)</label>
                <div className="admin-service-tags-box">
                  {serviceForm.materials.map((tag) => (
                    <span key={tag} className="admin-service-tag">
                      {tag}
                      <button onClick={() => removeMaterialTag(tag)} type="button"><X size={12} /></button>
                    </span>
                  ))}
                  <input
                    value={materialInput}
                    onChange={(e) => setMaterialInput(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault();
                        addMaterialTag();
                      }
                    }}
                    onBlur={addMaterialTag}
                    placeholder="Nhập tag rồi Enter"
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Nhân viên có thể thực hiện</label>
                <div className="admin-service-staff-list">
                  {staffs.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Chưa có dữ liệu nhân viên</p>
                  ) : (
                    staffs.map((staff) => {
                      const checked = serviceForm.staffIds.includes(staff.id);
                      return (
                        <label key={staff.id} className={`admin-service-staff-item ${checked ? 'checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStaffSelection(staff.id)}
                          />
                          <span className="avatar">{staff.avatar || initialsOf(staff.name)}</span>
                          <span className="info">
                            <strong>{staff.name}</strong>
                            <small>{staff.email || '—'}</small>
                          </span>
                          {checked && <BadgeCheck size={14} className="check" />}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="admin-service-form-grid two">
                <div>
                  <label className="admin-label">Trạng thái</label>
                  <button
                    className={`admin-service-status-switch ${serviceForm.active ? 'active' : ''}`}
                    onClick={() => setServiceForm((prev) => ({ ...prev, active: !prev.active }))}
                    type="button"
                  >
                    <span className="dot" />
                    {serviceForm.active ? 'Đang hoạt động' : 'Tạm dừng'}
                  </button>
                </div>
                <div>
                  <label className="admin-label">Slug</label>
                  <input
                    className="admin-input"
                    value={serviceForm.slug}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="tu-dong-tu-ten-dich-vu"
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Ghi chú nội bộ</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={serviceForm.internalNote}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, internalNote: e.target.value }))}
                  placeholder="Ghi chú không hiển thị cho khách hàng"
                />
              </div>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowServiceModal(false)}>Hủy</button>
              <button className="admin-btn admin-service-btn-gold" onClick={submitService} disabled={savingService}>
                {savingService ? 'Đang lưu...' : editingService ? 'Cập nhật dịch vụ' : 'Tạo dịch vụ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
