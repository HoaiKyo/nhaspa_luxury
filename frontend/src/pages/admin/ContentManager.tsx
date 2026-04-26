import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DragEvent } from 'react';
import {
  Bold,
  Copy,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { bannersApi, newsApi, uploadApi } from '../../api/admin.api';

type ContentTab = 'BANNER' | 'NEWS';
type BannerPosition = 'HOMEPAGE_HERO' | 'POPUP' | 'SIDE';
type PostPublishMode = 'NOW' | 'SCHEDULE' | 'DRAFT';

type ToolbarAction = 'bold' | 'italic' | 'h1' | 'h2' | 'h3' | 'list' | 'image' | 'link';

interface ContentManagerProps {
  initialTab?: ContentTab;
}

interface BannerItem {
  ma_banner: number;
  tieu_de: string;
  mo_ta: string;
  hinh_anh: string;
  duong_dan: string;
  thu_tu: number;
  ngay_bat_dau: string | null;
  ngay_ket_thuc: string | null;
  trang_thai: string;
  vi_tri: BannerPosition;
}

interface BannerFormState {
  tieu_de: string;
  mo_ta: string;
  hinh_anh: string;
  duong_dan: string;
  thu_tu: number;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  trang_thai: string;
  vi_tri: BannerPosition;
}

interface BannerMetaStore {
  [bannerId: string]: {
    vi_tri: BannerPosition;
  };
}

interface PostSeoMeta {
  meta_title: string;
  meta_description: string;
  og_image: string;
}

interface NewsMetaStore {
  [postId: string]: {
    tags: string[];
    views: number;
    seo: PostSeoMeta;
    schedule_at: string | null;
  };
}

interface NewsItem {
  ma_tin_tuc: number;
  tieu_de: string;
  slug: string;
  danh_muc: string;
  tom_tat: string;
  noi_dung: string;
  hinh_anh: string;
  tac_gia: string;
  trang_thai: string;
  ngay_dang: string | null;
  tags: string[];
  views: number;
  seo: PostSeoMeta;
  schedule_at: string | null;
}

interface NewsFormState {
  tieu_de: string;
  slug: string;
  danh_muc: string;
  tags: string[];
  tag_input: string;
  hinh_anh: string;
  tom_tat: string;
  noi_dung: string;
  tac_gia: string;
  seo: PostSeoMeta;
  publish_mode: PostPublishMode;
  schedule_at: string;
}

const BANNER_META_KEY = 'admin_banner_meta_v2';
const NEWS_META_KEY = 'admin_news_meta_v2';

const BANNER_POSITIONS: Array<{ value: BannerPosition; label: string }> = [
  { value: 'HOMEPAGE_HERO', label: 'Homepage Hero' },
  { value: 'POPUP', label: 'Popup' },
  { value: 'SIDE', label: 'Side' },
];

const NEWS_CATEGORIES = ['Mẹo làm đẹp', 'Tin tức spa', 'Khuyến mãi'];

const TOOLBAR_ITEMS: Array<{ action: ToolbarAction; icon: ReactNode; label: string }> = [
  { action: 'bold', icon: <Bold size={14} />, label: 'Bold' },
  { action: 'italic', icon: <Italic size={14} />, label: 'Italic' },
  { action: 'h1', icon: <Heading1 size={14} />, label: 'H1' },
  { action: 'h2', icon: <Heading2 size={14} />, label: 'H2' },
  { action: 'h3', icon: <Heading3 size={14} />, label: 'H3' },
  { action: 'list', icon: <List size={14} />, label: 'List' },
  { action: 'image', icon: <ImageIcon size={14} />, label: 'Image' },
  { action: 'link', icon: <Link2 size={14} />, label: 'Link' },
];

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const slugify = (value: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const nowLocalDateTime = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const daysFromNowDateTime = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const normalizeIsoOrNull = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const loadBannerMeta = (): BannerMetaStore => {
  try {
    const raw = localStorage.getItem(BANNER_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const saveBannerMeta = (value: BannerMetaStore) => {
  localStorage.setItem(BANNER_META_KEY, JSON.stringify(value));
};

const loadNewsMeta = (): NewsMetaStore => {
  try {
    const raw = localStorage.getItem(NEWS_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const saveNewsMeta = (value: NewsMetaStore) => {
  localStorage.setItem(NEWS_META_KEY, JSON.stringify(value));
};

const bannerPositionLabel = (value: BannerPosition) => {
  const item = BANNER_POSITIONS.find((position) => position.value === value);
  return item?.label || 'Homepage Hero';
};

const isBannerActiveNow = (banner: BannerItem) => {
  if (String(banner.trang_thai || '').toUpperCase() !== 'ACTIVE') return false;
  const now = Date.now();
  const startsAt = banner.ngay_bat_dau ? new Date(banner.ngay_bat_dau).getTime() : null;
  const endsAt = banner.ngay_ket_thuc ? new Date(banner.ngay_ket_thuc).getTime() : null;
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
};

const postStatusLabel = (status: string) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PUBLISHED') return 'Đã đăng';
  if (normalized === 'SCHEDULED') return 'Lên lịch';
  return 'Nháp';
};

const postStatusClass = (status: string) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PUBLISHED') return 'published';
  if (normalized === 'SCHEDULED') return 'scheduled';
  return 'draft';
};

const normalizeBanner = (raw: any, meta: BannerMetaStore): BannerItem => {
  const id = Math.max(1, toNumber(raw?.ma_banner || raw?.id || Date.now()));
  const metaPosition = meta[String(id)]?.vi_tri;
  const defaultPosition: BannerPosition = 'HOMEPAGE_HERO';

  return {
    ma_banner: id,
    tieu_de: String(raw?.tieu_de || ''),
    mo_ta: String(raw?.mo_ta || ''),
    hinh_anh: String(raw?.hinh_anh || ''),
    duong_dan: String(raw?.duong_dan || ''),
    thu_tu: toNumber(raw?.thu_tu || 0),
    ngay_bat_dau: normalizeIsoOrNull(raw?.ngay_bat_dau),
    ngay_ket_thuc: normalizeIsoOrNull(raw?.ngay_ket_thuc),
    trang_thai: String(raw?.trang_thai || 'ACTIVE').toUpperCase(),
    vi_tri: metaPosition || defaultPosition,
  };
};

const normalizeNews = (raw: any, meta: NewsMetaStore): NewsItem => {
  const id = Math.max(1, toNumber(raw?.ma_tin_tuc || raw?.id || Date.now()));
  const defaultSeo: PostSeoMeta = {
    meta_title: String(raw?.tieu_de || ''),
    meta_description: String(raw?.tom_tat || '').slice(0, 160),
    og_image: String(raw?.hinh_anh || ''),
  };
  const metaItem = meta[String(id)];

  return {
    ma_tin_tuc: id,
    tieu_de: String(raw?.tieu_de || ''),
    slug: String(raw?.slug || ''),
    danh_muc: String(raw?.danh_muc || 'Tin tức spa'),
    tom_tat: String(raw?.tom_tat || ''),
    noi_dung: String(raw?.noi_dung || ''),
    hinh_anh: String(raw?.hinh_anh || ''),
    tac_gia: String(raw?.tac_gia || 'Admin Spa'),
    trang_thai: String(raw?.trang_thai || 'DRAFT').toUpperCase(),
    ngay_dang: normalizeIsoOrNull(raw?.ngay_dang),
    tags: metaItem?.tags || [],
    views: Math.max(0, toNumber(metaItem?.views || (60 + ((id * 17) % 800)))),
    seo: metaItem?.seo || defaultSeo,
    schedule_at: normalizeIsoOrNull(metaItem?.schedule_at || null),
  };
};

const defaultBannerForm = (): BannerFormState => ({
  tieu_de: '',
  mo_ta: '',
  hinh_anh: '',
  duong_dan: '',
  thu_tu: 0,
  ngay_bat_dau: nowLocalDateTime(),
  ngay_ket_thuc: daysFromNowDateTime(15),
  trang_thai: 'ACTIVE',
  vi_tri: 'HOMEPAGE_HERO',
});

const defaultNewsForm = (): NewsFormState => ({
  tieu_de: '',
  slug: '',
  danh_muc: 'Tin tức spa',
  tags: [],
  tag_input: '',
  hinh_anh: '',
  tom_tat: '',
  noi_dung: '',
  tac_gia: 'Admin Spa',
  seo: {
    meta_title: '',
    meta_description: '',
    og_image: '',
  },
  publish_mode: 'NOW',
  schedule_at: daysFromNowDateTime(1),
});

export default function ContentManager({ initialTab = 'BANNER' }: ContentManagerProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>(initialTab);

  const [bannerMeta, setBannerMeta] = useState<BannerMetaStore>(() => loadBannerMeta());
  const [newsMeta, setNewsMeta] = useState<NewsMetaStore>(() => loadNewsMeta());

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [bannerError, setBannerError] = useState('');

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState('');

  const [previewIndex, setPreviewIndex] = useState(0);

  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerFormState>(() => defaultBannerForm());
  const [savingBanner, setSavingBanner] = useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [draggingBannerImage, setDraggingBannerImage] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const [showNewsModal, setShowNewsModal] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsItem | null>(null);
  const [newsForm, setNewsForm] = useState<NewsFormState>(() => defaultNewsForm());
  const [savingNews, setSavingNews] = useState(false);
  const [uploadingNewsImage, setUploadingNewsImage] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [draggingNewsImage, setDraggingNewsImage] = useState(false);
  const newsFileInputRef = useRef<HTMLInputElement>(null);
  const contentEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    saveBannerMeta(bannerMeta);
  }, [bannerMeta]);

  useEffect(() => {
    saveNewsMeta(newsMeta);
  }, [newsMeta]);

  const loadBanners = async () => {
    setLoadingBanners(true);
    setBannerError('');

    try {
      const res = await bannersApi.list();
      if (!res.success) {
        throw new Error(res.message || 'Không thể tải danh sách banner');
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      const normalized = rows.map((item) => normalizeBanner(item, bannerMeta));
      normalized.sort((a, b) => a.thu_tu - b.thu_tu || b.ma_banner - a.ma_banner);
      setBanners(normalized);
    } catch (error: any) {
      setBanners([]);
      setBannerError(error?.message || 'Không thể tải banner');
    } finally {
      setLoadingBanners(false);
    }
  };

  const loadNews = async () => {
    setLoadingNews(true);
    setNewsError('');

    try {
      const rows: any[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const res = await newsApi.list(page, 60);
        if (!res.success) {
          throw new Error(res.message || 'Không thể tải bài viết');
        }

        rows.push(...(Array.isArray(res.data) ? res.data : []));
        totalPages = Math.max(1, toNumber(res.meta?.total_pages || 1));
        page += 1;
      } while (page <= totalPages);

      const normalized = rows.map((item) => normalizeNews(item, newsMeta));
      normalized.sort((a, b) => {
        const da = a.ngay_dang ? new Date(a.ngay_dang).getTime() : 0;
        const db = b.ngay_dang ? new Date(b.ngay_dang).getTime() : 0;
        return db - da || b.ma_tin_tuc - a.ma_tin_tuc;
      });

      setNews(normalized);
    } catch (error: any) {
      setNews([]);
      setNewsError(error?.message || 'Không thể tải tin tức');
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    void loadBanners();
    void loadNews();
  }, []);

  useEffect(() => {
    if (slugTouched) return;
    const slug = slugify(newsForm.tieu_de);
    setNewsForm((prev) => ({ ...prev, slug }));
  }, [newsForm.tieu_de, slugTouched]);

  const activePreviewBanners = useMemo(() => {
    const rows = banners.filter(isBannerActiveNow);
    return rows.sort((a, b) => a.thu_tu - b.thu_tu || b.ma_banner - a.ma_banner);
  }, [banners]);

  const currentPreviewBanner = activePreviewBanners[previewIndex] || null;

  useEffect(() => {
    if (previewIndex >= activePreviewBanners.length) {
      setPreviewIndex(0);
    }
  }, [activePreviewBanners.length, previewIndex]);

  useEffect(() => {
    if (activePreviewBanners.length <= 1) return;

    const timer = window.setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % activePreviewBanners.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [activePreviewBanners.length]);

  const openCreateBanner = () => {
    setEditingBanner(null);
    setBannerForm(defaultBannerForm());
    setShowBannerModal(true);
    setBannerError('');
  };

  const openEditBanner = (banner: BannerItem) => {
    setEditingBanner(banner);
    setBannerForm({
      tieu_de: banner.tieu_de,
      mo_ta: banner.mo_ta,
      hinh_anh: banner.hinh_anh,
      duong_dan: banner.duong_dan,
      thu_tu: banner.thu_tu,
      ngay_bat_dau: toDateTimeLocal(banner.ngay_bat_dau),
      ngay_ket_thuc: toDateTimeLocal(banner.ngay_ket_thuc),
      trang_thai: banner.trang_thai || 'ACTIVE',
      vi_tri: banner.vi_tri,
    });
    setShowBannerModal(true);
    setBannerError('');
  };

  const applyBannerImageUpload = async (file?: File | null) => {
    if (!file) return;
    setUploadingBannerImage(true);

    try {
      const res = await uploadApi.banner(file);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể upload ảnh banner');
      }

      const url = (res.data as any).file_path || (res.data as any).url || '';
      if (!url) {
        throw new Error('Không nhận được URL ảnh banner');
      }

      setBannerForm((prev) => ({ ...prev, hinh_anh: url }));
    } catch (error: any) {
      setBannerError(error?.message || 'Upload ảnh banner thất bại');
    } finally {
      setUploadingBannerImage(false);
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
    }
  };

  const handleBannerDropImage = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggingBannerImage(false);
    const file = event.dataTransfer.files?.[0];
    await applyBannerImageUpload(file);
  };

  const submitBanner = async () => {
    setBannerError('');

    const title = bannerForm.tieu_de.trim();
    const image = bannerForm.hinh_anh.trim();
    if (!title) {
      setBannerError('Vui lòng nhập tiêu đề banner.');
      return;
    }

    if (!image) {
      setBannerError('Vui lòng upload hoặc nhập URL ảnh banner.');
      return;
    }

    const startsMs = new Date(bannerForm.ngay_bat_dau).getTime();
    const endsMs = new Date(bannerForm.ngay_ket_thuc).getTime();
    if (!Number.isFinite(startsMs) || !Number.isFinite(endsMs) || startsMs > endsMs) {
      setBannerError('Thời gian hiệu lực của banner không hợp lệ.');
      return;
    }

    const payload = {
      tieu_de: title,
      mo_ta: bannerForm.mo_ta.trim() || null,
      hinh_anh: image,
      duong_dan: bannerForm.duong_dan.trim() || null,
      thu_tu: toNumber(bannerForm.thu_tu),
      trang_thai: String(bannerForm.trang_thai || 'ACTIVE').toUpperCase(),
      ngay_bat_dau: new Date(startsMs).toISOString(),
      ngay_ket_thuc: new Date(endsMs).toISOString(),
    };

    setSavingBanner(true);

    try {
      let targetId = editingBanner?.ma_banner || 0;

      if (editingBanner) {
        const res = await bannersApi.update(editingBanner.ma_banner, payload);
        if (!res.success) {
          throw new Error(res.message || 'Không thể cập nhật banner');
        }
      } else {
        const res = await bannersApi.create(payload);
        if (!res.success) {
          throw new Error(res.message || 'Không thể tạo banner');
        }
        targetId = toNumber((res.data as any)?.ma_banner);
      }

      if (targetId > 0) {
        setBannerMeta((prev) => ({
          ...prev,
          [String(targetId)]: {
            vi_tri: bannerForm.vi_tri,
          },
        }));
      }

      setShowBannerModal(false);
      await loadBanners();
    } catch (error: any) {
      setBannerError(error?.message || 'Không thể lưu banner');
    } finally {
      setSavingBanner(false);
    }
  };

  const toggleBannerStatus = async (banner: BannerItem) => {
    const nextStatus = banner.trang_thai === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    setBanners((prev) =>
      prev.map((item) => (item.ma_banner === banner.ma_banner ? { ...item, trang_thai: nextStatus } : item)),
    );

    const res = await bannersApi.update(banner.ma_banner, { trang_thai: nextStatus });
    if (!res.success) {
      setBanners((prev) =>
        prev.map((item) => (item.ma_banner === banner.ma_banner ? { ...item, trang_thai: banner.trang_thai } : item)),
      );
      setBannerError(res.message || 'Không thể đổi trạng thái banner');
    }
  };

  const duplicateBanner = async (banner: BannerItem) => {
    setBannerError('');

    const payload = {
      tieu_de: `${banner.tieu_de} (Bản sao)`,
      mo_ta: banner.mo_ta || null,
      hinh_anh: banner.hinh_anh,
      duong_dan: banner.duong_dan || null,
      thu_tu: banner.thu_tu + 1,
      trang_thai: 'INACTIVE',
      ngay_bat_dau: banner.ngay_bat_dau || new Date().toISOString(),
      ngay_ket_thuc: banner.ngay_ket_thuc || new Date(Date.now() + 86400000 * 14).toISOString(),
    };

    const res = await bannersApi.create(payload);
    if (!res.success) {
      setBannerError(res.message || 'Không thể duplicate banner');
      return;
    }

    const newId = toNumber((res.data as any)?.ma_banner);
    if (newId > 0) {
      setBannerMeta((prev) => ({
        ...prev,
        [String(newId)]: { vi_tri: banner.vi_tri },
      }));
    }

    await loadBanners();
  };

  const deleteBanner = async (banner: BannerItem) => {
    const ok = window.confirm(`Xóa banner "${banner.tieu_de}"?`);
    if (!ok) return;

    const res = await bannersApi.delete(banner.ma_banner);
    if (!res.success) {
      setBannerError(res.message || 'Không thể xóa banner');
      return;
    }

    setBannerMeta((prev) => {
      const next = { ...prev };
      delete next[String(banner.ma_banner)];
      return next;
    });

    await loadBanners();
  };

  const openCreatePost = () => {
    setEditingPost(null);
    setSlugTouched(false);
    setNewsForm(defaultNewsForm());
    setShowNewsModal(true);
    setNewsError('');
  };

  const openEditPost = (post: NewsItem) => {
    setEditingPost(post);
    setSlugTouched(true);
    setNewsForm({
      tieu_de: post.tieu_de,
      slug: post.slug,
      danh_muc: post.danh_muc || 'Tin tức spa',
      tags: [...post.tags],
      tag_input: '',
      hinh_anh: post.hinh_anh,
      tom_tat: post.tom_tat,
      noi_dung: post.noi_dung,
      tac_gia: post.tac_gia || 'Admin Spa',
      seo: {
        meta_title: post.seo.meta_title || '',
        meta_description: post.seo.meta_description || '',
        og_image: post.seo.og_image || '',
      },
      publish_mode: post.trang_thai === 'SCHEDULED' ? 'SCHEDULE' : post.trang_thai === 'PUBLISHED' ? 'NOW' : 'DRAFT',
      schedule_at: toDateTimeLocal(post.schedule_at || post.ngay_dang) || daysFromNowDateTime(1),
    });
    setShowNewsModal(true);
    setNewsError('');
  };

  const applyNewsImageUpload = async (file?: File | null) => {
    if (!file) return;
    setUploadingNewsImage(true);

    try {
      const res = await uploadApi.news(file);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể upload ảnh bài viết');
      }

      const url = (res.data as any).file_path || (res.data as any).url || '';
      if (!url) throw new Error('Không nhận được URL ảnh bài viết');

      setNewsForm((prev) => ({
        ...prev,
        hinh_anh: url,
        seo: {
          ...prev.seo,
          og_image: prev.seo.og_image || url,
        },
      }));
    } catch (error: any) {
      setNewsError(error?.message || 'Upload ảnh bài viết thất bại');
    } finally {
      setUploadingNewsImage(false);
      if (newsFileInputRef.current) newsFileInputRef.current.value = '';
    }
  };

  const handleNewsDropImage = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggingNewsImage(false);
    const file = event.dataTransfer.files?.[0];
    await applyNewsImageUpload(file);
  };

  const applyToolbarAction = (action: ToolbarAction) => {
    const editor = contentEditorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const current = newsForm.noi_dung || '';
    const selected = current.slice(start, end);

    const fallback = selected || 'nội dung';

    const snippetMap: Record<ToolbarAction, string> = {
      bold: `**${fallback}**`,
      italic: `*${fallback}*`,
      h1: `# ${fallback}`,
      h2: `## ${fallback}`,
      h3: `### ${fallback}`,
      list: `- mục 1\n- mục 2`,
      image: `![mô tả ảnh](https://example.com/image.jpg)`,
      link: `[${fallback}](https://example.com)`,
    };

    const insert = snippetMap[action];
    const nextValue = `${current.slice(0, start)}${insert}${current.slice(end)}`;

    setNewsForm((prev) => ({ ...prev, noi_dung: nextValue }));

    requestAnimationFrame(() => {
      editor.focus();
      const cursor = start + insert.length;
      editor.selectionStart = cursor;
      editor.selectionEnd = cursor;
    });
  };

  const addTag = () => {
    const tag = newsForm.tag_input.trim().replace(/,+$/, '');
    if (!tag) return;

    if (!newsForm.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      setNewsForm((prev) => ({ ...prev, tags: [...prev.tags, tag], tag_input: '' }));
      return;
    }

    setNewsForm((prev) => ({ ...prev, tag_input: '' }));
  };

  const removeTag = (tag: string) => {
    setNewsForm((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }));
  };

  const submitPost = async () => {
    setNewsError('');

    const title = newsForm.tieu_de.trim();
    const slug = slugify(newsForm.slug || newsForm.tieu_de);
    if (!title) {
      setNewsError('Vui lòng nhập tiêu đề bài viết.');
      return;
    }

    if (!slug) {
      setNewsError('Slug chưa hợp lệ.');
      return;
    }

    const nowIso = new Date().toISOString();
    const scheduleIso = normalizeIsoOrNull(newsForm.schedule_at);

    let status = 'DRAFT';
    let publishAt: string | null = null;

    if (newsForm.publish_mode === 'NOW') {
      status = 'PUBLISHED';
      publishAt = nowIso;
    } else if (newsForm.publish_mode === 'SCHEDULE') {
      status = 'SCHEDULED';
      publishAt = scheduleIso;
      if (!publishAt) {
        setNewsError('Vui lòng chọn ngày giờ lên lịch hợp lệ.');
        return;
      }
    }

    const payload = {
      tieu_de: title,
      slug,
      danh_muc: newsForm.danh_muc,
      hinh_anh: newsForm.hinh_anh.trim() || null,
      tom_tat: newsForm.tom_tat.trim() || null,
      noi_dung: newsForm.noi_dung || null,
      tac_gia: newsForm.tac_gia.trim() || 'Admin Spa',
      trang_thai: status,
      ngay_dang: publishAt,
    };

    setSavingNews(true);

    try {
      let postId = editingPost?.ma_tin_tuc || 0;

      if (editingPost) {
        const res = await newsApi.update(editingPost.ma_tin_tuc, payload);
        if (!res.success) {
          throw new Error(res.message || 'Không thể cập nhật bài viết');
        }
      } else {
        const res = await newsApi.create(payload);
        if (!res.success) {
          throw new Error(res.message || 'Không thể tạo bài viết');
        }
        postId = toNumber((res.data as any)?.ma_tin_tuc);
      }

      if (postId > 0) {
        setNewsMeta((prev) => ({
          ...prev,
          [String(postId)]: {
            tags: newsForm.tags,
            views: Math.max(0, toNumber(prev[String(postId)]?.views || 0)),
            seo: {
              meta_title: newsForm.seo.meta_title || title,
              meta_description: newsForm.seo.meta_description || newsForm.tom_tat,
              og_image: newsForm.seo.og_image || newsForm.hinh_anh,
            },
            schedule_at: status === 'SCHEDULED' ? publishAt : null,
          },
        }));
      }

      setShowNewsModal(false);
      await loadNews();
    } catch (error: any) {
      setNewsError(error?.message || 'Không thể lưu bài viết');
    } finally {
      setSavingNews(false);
    }
  };

  const deletePost = async (post: NewsItem) => {
    const ok = window.confirm(`Xóa bài viết "${post.tieu_de}"?`);
    if (!ok) return;

    const res = await newsApi.delete(post.ma_tin_tuc);
    if (!res.success) {
      setNewsError(res.message || 'Không thể xóa bài viết');
      return;
    }

    setNewsMeta((prev) => {
      const next = { ...prev };
      delete next[String(post.ma_tin_tuc)];
      return next;
    });

    await loadNews();
  };

  const duplicatePost = async (post: NewsItem) => {
    const payload = {
      tieu_de: `${post.tieu_de} (Bản sao)`,
      slug: `${slugify(post.slug || post.tieu_de)}-copy-${Date.now().toString().slice(-5)}`,
      danh_muc: post.danh_muc,
      hinh_anh: post.hinh_anh || null,
      tom_tat: post.tom_tat || null,
      noi_dung: post.noi_dung || null,
      tac_gia: post.tac_gia || 'Admin Spa',
      trang_thai: 'DRAFT',
      ngay_dang: null,
    };

    const res = await newsApi.create(payload);
    if (!res.success) {
      setNewsError(res.message || 'Không thể duplicate bài viết');
      return;
    }

    const newId = toNumber((res.data as any)?.ma_tin_tuc);
    if (newId > 0) {
      setNewsMeta((prev) => ({
        ...prev,
        [String(newId)]: {
          tags: [...post.tags],
          views: 0,
          seo: { ...post.seo },
          schedule_at: null,
        },
      }));
    }

    await loadNews();
  };

  const openPostPublicView = (post: NewsItem) => {
    const slug = post.slug || slugify(post.tieu_de);
    if (!slug) return;
    window.open(`/tin-tuc/${slug}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="admin-animate-in admin-contentmgr space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="admin-contentmgr-heading">Spa Content Management</h1>
          <p className="admin-contentmgr-subheading">Quản lý đồng bộ Banner và Tin tức/Blog theo phong cách dark luxury.</p>
        </div>

        <div className="admin-contentmgr-header-actions">
          {activeTab === 'BANNER' ? (
            <button className="admin-btn admin-contentmgr-btn-gold" onClick={openCreateBanner}>
              <Plus size={16} /> Thêm banner
            </button>
          ) : (
            <button className="admin-btn admin-contentmgr-btn-gold" onClick={openCreatePost}>
              <Plus size={16} /> Tạo bài viết
            </button>
          )}
        </div>
      </div>

      <section className="admin-contentmgr-tabs">
        <button className={activeTab === 'BANNER' ? 'active' : ''} onClick={() => setActiveTab('BANNER')}>
          <ImageIcon size={16} /> Banner
        </button>
        <button className={activeTab === 'NEWS' ? 'active' : ''} onClick={() => setActiveTab('NEWS')}>
          <Newspaper size={16} /> Tin tức / Blog
        </button>
      </section>

      {activeTab === 'BANNER' && (
        <div className="space-y-4">
          <section className="admin-contentmgr-preview admin-card">
            <div className="head-row">
              <h3>Banner Preview Section</h3>
              <p>{activePreviewBanners.length} banner đang active</p>
            </div>

            <div className="admin-contentmgr-device-grid">
              <article className="admin-contentmgr-device phone">
                <div className="bezel" />
                <div className="screen">
                  {currentPreviewBanner?.hinh_anh ? (
                    <img src={currentPreviewBanner.hinh_anh} alt={currentPreviewBanner.tieu_de} />
                  ) : (
                    <div className="placeholder">No active banner</div>
                  )}
                </div>
              </article>

              <article className="admin-contentmgr-device tablet">
                <div className="bezel" />
                <div className="screen">
                  {currentPreviewBanner?.hinh_anh ? (
                    <img src={currentPreviewBanner.hinh_anh} alt={currentPreviewBanner.tieu_de} />
                  ) : (
                    <div className="placeholder">No active banner</div>
                  )}
                </div>
              </article>

              <article className="admin-contentmgr-preview-meta">
                {currentPreviewBanner ? (
                  <>
                    <h4>{currentPreviewBanner.tieu_de}</h4>
                    <p>{currentPreviewBanner.mo_ta || 'Banner đang chạy trên giao diện người dùng.'}</p>
                    <div className="meta-grid">
                      <div>
                        <span>Vị trí</span>
                        <strong>{bannerPositionLabel(currentPreviewBanner.vi_tri)}</strong>
                      </div>
                      <div>
                        <span>Thời gian</span>
                        <strong>{formatDate(currentPreviewBanner.ngay_bat_dau)} - {formatDate(currentPreviewBanner.ngay_ket_thuc)}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h4>Chưa có banner active</h4>
                    <p>Tạo mới hoặc bật một banner để xem preview trên mockup smartphone/tablet.</p>
                  </>
                )}
              </article>
            </div>

            <div className="admin-contentmgr-carousel-dots">
              {activePreviewBanners.length === 0 ? (
                <span className="empty-dot">Không có dữ liệu active</span>
              ) : (
                activePreviewBanners.map((banner, idx) => (
                  <button
                    key={banner.ma_banner}
                    className={idx === previewIndex ? 'active' : ''}
                    onClick={() => setPreviewIndex(idx)}
                    title={banner.tieu_de}
                  />
                ))
              )}
            </div>
          </section>

          <section className="admin-card admin-contentmgr-table-wrap">
            {bannerError && <div className="admin-contentmgr-error">{bannerError}</div>}

            {loadingBanners ? (
              <div className="h-32 flex items-center justify-center text-sm admin-muted-text">
                Đang tải banner...
              </div>
            ) : banners.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-sm admin-muted-text">
                Chưa có banner nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table admin-contentmgr-banner-table">
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>Tiêu đề</th>
                      <th>Vị trí</th>
                      <th>Link đến</th>
                      <th>Thứ tự</th>
                      <th>Ngày bắt đầu</th>
                      <th>Ngày kết thúc</th>
                      <th>Trạng thái</th>
                      <th className="text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banners.map((banner) => (
                      <tr key={banner.ma_banner}>
                        <td>
                          <div className="thumb">
                            {banner.hinh_anh ? (
                              <img src={banner.hinh_anh} alt={banner.tieu_de} width={80} height={50} />
                            ) : (
                              <div className="fallback">No img</div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="title-cell">
                            <strong>{banner.tieu_de}</strong>
                            <small>{banner.mo_ta || 'Không có mô tả'}</small>
                          </div>
                        </td>
                        <td>{bannerPositionLabel(banner.vi_tri)}</td>
                        <td>
                          {banner.duong_dan ? (
                            <a href={banner.duong_dan} target="_blank" rel="noreferrer" className="link-cell">
                              {banner.duong_dan}
                            </a>
                          ) : (
                            <span className="admin-muted-text">—</span>
                          )}
                        </td>
                        <td>{banner.thu_tu}</td>
                        <td>{formatDate(banner.ngay_bat_dau)}</td>
                        <td>{formatDate(banner.ngay_ket_thuc)}</td>
                        <td>
                          <button
                            className={`admin-contentmgr-switch ${banner.trang_thai === 'ACTIVE' ? 'active' : ''}`}
                            onClick={() => toggleBannerStatus(banner)}
                          >
                            <span className="dot" />
                            {banner.trang_thai === 'ACTIVE' ? 'Bật' : 'Tắt'}
                          </button>
                        </td>
                        <td className="text-right">
                          <div className="actions">
                            <button className="admin-btn-icon" onClick={() => openEditBanner(banner)} title="Sửa">
                              <Pencil size={14} />
                            </button>
                            <button className="admin-btn-icon" onClick={() => duplicateBanner(banner)} title="Duplicate">
                              <Copy size={14} />
                            </button>
                            <button className="admin-btn-icon admin-danger-soft" onClick={() => deleteBanner(banner)} title="Xóa">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'NEWS' && (
        <div className="space-y-4">
          {newsError && <div className="admin-contentmgr-error">{newsError}</div>}

          {loadingNews ? (
            <section className="admin-card h-32 flex items-center justify-center text-sm admin-muted-text">
              Đang tải danh sách bài viết...
            </section>
          ) : news.length === 0 ? (
            <section className="admin-card h-32 flex items-center justify-center text-sm admin-muted-text">
              Chưa có bài viết nào.
            </section>
          ) : (
            <section className="admin-contentmgr-post-grid">
              {news.map((post) => (
                <article key={post.ma_tin_tuc} className="admin-contentmgr-post-card">
                  <div className="thumb-wrap">
                    {post.hinh_anh ? (
                      <img src={post.hinh_anh} alt={post.tieu_de} className="thumb" />
                    ) : (
                      <div className="gradient-placeholder" />
                    )}
                    <span className="category-tag">{post.danh_muc || 'Tin tức spa'}</span>
                  </div>

                  <div className="body">
                    <h3>{post.tieu_de}</h3>
                    <p className="summary">{post.tom_tat || 'Bài viết chưa có tóm tắt. Thêm tóm tắt để tối ưu tỷ lệ nhấp từ trang chủ.'}</p>

                    <div className="meta-line">
                      <span>{post.tac_gia || 'Admin Spa'}</span>
                      <span>{formatDate(post.ngay_dang)}</span>
                      <span>{new Intl.NumberFormat('vi-VN').format(post.views)} lượt xem</span>
                    </div>

                    <div className={`status ${postStatusClass(post.trang_thai)}`}>{postStatusLabel(post.trang_thai)}</div>
                  </div>

                  <div className="footer-actions">
                    <button onClick={() => openPostPublicView(post)}><Eye size={14} /> Xem</button>
                    <button onClick={() => openEditPost(post)}><Pencil size={14} /> Sửa</button>
                    <button onClick={() => deletePost(post)}><Trash2 size={14} /> Xóa</button>
                    <button onClick={() => duplicatePost(post)}><Copy size={14} /> Duplicate</button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      )}

      {showBannerModal && (
        <div className="admin-modal-overlay" onClick={() => !savingBanner && setShowBannerModal(false)}>
          <div className="admin-modal admin-modal-animate admin-contentmgr-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingBanner ? 'Cập nhật banner' : 'Thêm banner mới'}</h3>
              <button onClick={() => setShowBannerModal(false)} className="admin-btn-icon">✕</button>
            </div>

            <div className="admin-modal-body admin-contentmgr-form-layout">
              {bannerError && <div className="admin-contentmgr-error">{bannerError}</div>}

              <div>
                <label className="admin-label">Upload ảnh banner</label>
                <div
                  className={`admin-contentmgr-upload-zone ${draggingBannerImage ? 'dragging' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDraggingBannerImage(true);
                  }}
                  onDragLeave={() => setDraggingBannerImage(false)}
                  onDrop={handleBannerDropImage}
                >
                  {bannerForm.hinh_anh ? (
                    <img src={bannerForm.hinh_anh} alt="Banner preview" className="preview" />
                  ) : (
                    <div className="placeholder">
                      <ImageIcon size={18} />
                      <p>Kéo thả ảnh hoặc nhấn chọn file</p>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(event) => void applyBannerImageUpload(event.target.files?.[0])}
                  />

                  <div className="upload-actions">
                    <button
                      className="admin-btn admin-btn-secondary"
                      type="button"
                      onClick={() => bannerFileInputRef.current?.click()}
                      disabled={uploadingBannerImage}
                    >
                      {uploadingBannerImage ? 'Đang tải...' : 'Chọn ảnh'}
                    </button>
                    <span className="hint">Crop tool hint: dùng ảnh tỷ lệ 16:9 để hiển thị đẹp trên Hero.</span>
                  </div>
                </div>
              </div>

              <div className="admin-contentmgr-form-grid two">
                <div>
                  <label className="admin-label">Tiêu đề</label>
                  <input
                    className="admin-input"
                    value={bannerForm.tieu_de}
                    onChange={(event) => setBannerForm((prev) => ({ ...prev, tieu_de: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="admin-label">Vị trí hiển thị</label>
                  <select
                    className="admin-select"
                    value={bannerForm.vi_tri}
                    onChange={(event) => setBannerForm((prev) => ({ ...prev, vi_tri: event.target.value as BannerPosition }))}
                  >
                    {BANNER_POSITIONS.map((position) => (
                      <option key={position.value} value={position.value}>{position.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="admin-label">Mô tả ngắn</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={bannerForm.mo_ta}
                  onChange={(event) => setBannerForm((prev) => ({ ...prev, mo_ta: event.target.value }))}
                />
              </div>

              <div className="admin-contentmgr-form-grid two">
                <div>
                  <label className="admin-label">Link URL</label>
                  <input
                    className="admin-input"
                    placeholder="https://..."
                    value={bannerForm.duong_dan}
                    onChange={(event) => setBannerForm((prev) => ({ ...prev, duong_dan: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="admin-label">Thứ tự sắp xếp</label>
                  <input
                    className="admin-input"
                    type="number"
                    value={bannerForm.thu_tu}
                    onChange={(event) => setBannerForm((prev) => ({ ...prev, thu_tu: toNumber(event.target.value) }))}
                  />
                </div>
              </div>

              <div className="admin-contentmgr-form-grid three">
                <div>
                  <label className="admin-label">Ngày bắt đầu</label>
                  <input
                    className="admin-input"
                    type="datetime-local"
                    value={bannerForm.ngay_bat_dau}
                    onChange={(event) => setBannerForm((prev) => ({ ...prev, ngay_bat_dau: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="admin-label">Ngày kết thúc</label>
                  <input
                    className="admin-input"
                    type="datetime-local"
                    value={bannerForm.ngay_ket_thuc}
                    onChange={(event) => setBannerForm((prev) => ({ ...prev, ngay_ket_thuc: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="admin-label">Trạng thái</label>
                  <select
                    className="admin-select"
                    value={bannerForm.trang_thai}
                    onChange={(event) => setBannerForm((prev) => ({ ...prev, trang_thai: event.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowBannerModal(false)} disabled={savingBanner}>Hủy</button>
              <button className="admin-btn admin-contentmgr-btn-gold" onClick={submitBanner} disabled={savingBanner}>
                {savingBanner ? 'Đang lưu...' : editingBanner ? 'Cập nhật' : 'Tạo banner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewsModal && (
        <div className="admin-modal-overlay" onClick={() => !savingNews && setShowNewsModal(false)}>
          <div className="admin-modal admin-modal-animate admin-contentmgr-modal large" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingPost ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}</h3>
              <button onClick={() => setShowNewsModal(false)} className="admin-btn-icon">✕</button>
            </div>

            <div className="admin-modal-body admin-contentmgr-form-layout news">
              {newsError && <div className="admin-contentmgr-error">{newsError}</div>}

              <div>
                <label className="admin-label">Tiêu đề bài viết</label>
                <input
                  className="admin-input admin-contentmgr-title-input"
                  value={newsForm.tieu_de}
                  onChange={(event) => setNewsForm((prev) => ({ ...prev, tieu_de: event.target.value }))}
                />
              </div>

              <div className="admin-contentmgr-form-grid two">
                <div>
                  <label className="admin-label">Slug</label>
                  <input
                    className="admin-input"
                    value={newsForm.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setNewsForm((prev) => ({ ...prev, slug: event.target.value }));
                    }}
                  />
                </div>

                <div>
                  <label className="admin-label">Category</label>
                  <select
                    className="admin-select"
                    value={newsForm.danh_muc}
                    onChange={(event) => setNewsForm((prev) => ({ ...prev, danh_muc: event.target.value }))}
                  >
                    {NEWS_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="admin-label">Tags</label>
                <div className="admin-contentmgr-tag-input-wrap">
                  <input
                    className="admin-input"
                    value={newsForm.tag_input}
                    placeholder="Nhập tag và nhấn Enter"
                    onChange={(event) => setNewsForm((prev) => ({ ...prev, tag_input: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <button className="admin-btn admin-btn-secondary" type="button" onClick={addTag}>Thêm tag</button>
                </div>
                <div className="admin-contentmgr-tags">
                  {newsForm.tags.map((tag) => (
                    <span key={tag} className="tag-chip" onClick={() => removeTag(tag)} title="Bấm để xóa">
                      {tag} ×
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="admin-label">Thumbnail upload</label>
                <div
                  className={`admin-contentmgr-upload-zone ${draggingNewsImage ? 'dragging' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDraggingNewsImage(true);
                  }}
                  onDragLeave={() => setDraggingNewsImage(false)}
                  onDrop={handleNewsDropImage}
                >
                  {newsForm.hinh_anh ? (
                    <img src={newsForm.hinh_anh} alt="News thumbnail" className="preview" />
                  ) : (
                    <div className="placeholder">
                      <ImageIcon size={18} />
                      <p>Kéo thả ảnh thumbnail hoặc chọn file</p>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={newsFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(event) => void applyNewsImageUpload(event.target.files?.[0])}
                  />

                  <div className="upload-actions">
                    <button
                      className="admin-btn admin-btn-secondary"
                      type="button"
                      onClick={() => newsFileInputRef.current?.click()}
                      disabled={uploadingNewsImage}
                    >
                      {uploadingNewsImage ? 'Đang tải...' : 'Chọn ảnh'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="admin-label">Content area</label>
                <div className="admin-contentmgr-editor-toolbar">
                  {TOOLBAR_ITEMS.map((item) => (
                    <button key={item.action} type="button" onClick={() => applyToolbarAction(item.action)} title={item.label}>
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
                <textarea
                  ref={contentEditorRef}
                  className="admin-input admin-contentmgr-editor"
                  rows={10}
                  value={newsForm.noi_dung}
                  onChange={(event) => setNewsForm((prev) => ({ ...prev, noi_dung: event.target.value }))}
                />
              </div>

              <div>
                <label className="admin-label">Tóm tắt</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={newsForm.tom_tat}
                  onChange={(event) => setNewsForm((prev) => ({ ...prev, tom_tat: event.target.value }))}
                />
              </div>

              <div className="admin-contentmgr-form-grid two">
                <div>
                  <label className="admin-label">Tác giả</label>
                  <input
                    className="admin-input"
                    value={newsForm.tac_gia}
                    onChange={(event) => setNewsForm((prev) => ({ ...prev, tac_gia: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">SEO - Meta title</label>
                  <input
                    className="admin-input"
                    value={newsForm.seo.meta_title}
                    onChange={(event) =>
                      setNewsForm((prev) => ({ ...prev, seo: { ...prev.seo, meta_title: event.target.value } }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">SEO - Meta description</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={newsForm.seo.meta_description}
                  onChange={(event) =>
                    setNewsForm((prev) => ({ ...prev, seo: { ...prev.seo, meta_description: event.target.value } }))
                  }
                />
              </div>

              <div>
                <label className="admin-label">SEO - OG image</label>
                <input
                  className="admin-input"
                  value={newsForm.seo.og_image}
                  onChange={(event) =>
                    setNewsForm((prev) => ({ ...prev, seo: { ...prev.seo, og_image: event.target.value } }))
                  }
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="admin-label">Publish settings</label>
                <div className="admin-contentmgr-publish-options">
                  <button
                    type="button"
                    className={newsForm.publish_mode === 'NOW' ? 'active' : ''}
                    onClick={() => setNewsForm((prev) => ({ ...prev, publish_mode: 'NOW' }))}
                  >
                    Đăng ngay
                  </button>
                  <button
                    type="button"
                    className={newsForm.publish_mode === 'SCHEDULE' ? 'active' : ''}
                    onClick={() => setNewsForm((prev) => ({ ...prev, publish_mode: 'SCHEDULE' }))}
                  >
                    Lên lịch
                  </button>
                  <button
                    type="button"
                    className={newsForm.publish_mode === 'DRAFT' ? 'active' : ''}
                    onClick={() => setNewsForm((prev) => ({ ...prev, publish_mode: 'DRAFT' }))}
                  >
                    Lưu nháp
                  </button>
                </div>

                {newsForm.publish_mode === 'SCHEDULE' && (
                  <div className="mt-2">
                    <input
                      className="admin-input"
                      type="datetime-local"
                      value={newsForm.schedule_at}
                      onChange={(event) => setNewsForm((prev) => ({ ...prev, schedule_at: event.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowNewsModal(false)} disabled={savingNews}>Hủy</button>
              <button className="admin-btn admin-contentmgr-btn-gold" onClick={submitPost} disabled={savingNews}>
                {savingNews ? 'Đang lưu...' : editingPost ? 'Cập nhật' : 'Đăng bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
