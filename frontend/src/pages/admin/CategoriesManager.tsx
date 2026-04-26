import { useState, useEffect } from 'react';
import { categoriesApi } from '../../api/admin.api';
import { Plus, Pencil, Trash2, FolderTree, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CategoriesManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ten_danh_muc: '', slug: '', mo_ta: '', icon: '', thu_tu: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await categoriesApi.list();
    setCategories(res.data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ten_danh_muc: '', slug: '', mo_ta: '', icon: '', thu_tu: 0 });
    setShowModal(true);
  };

  const openEdit = (cat: any) => {
    setEditing(cat);
    setForm({
      ten_danh_muc: cat.ten_danh_muc || '',
      slug: cat.slug || '',
      mo_ta: cat.mo_ta || '',
      icon: cat.icon || '',
      thu_tu: cat.thu_tu || 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (editing) {
      await categoriesApi.update(editing.ma_danh_muc, form);
    } else {
      await categoriesApi.create(form);
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa danh mục này?')) return;
    await categoriesApi.delete(id);
    load();
  };

  const filtered = categories.filter(c =>
    c.ten_danh_muc?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedCategories = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="admin-animate-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'inherit', color: 'var(--admin-text-heading)' }}>Quản lý Danh mục</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{categories.length} danh mục</p>
        </div>
        <button onClick={openCreate} className="admin-btn admin-btn-primary">
          <Plus size={16} /> Thêm danh mục
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-search mb-4">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="admin-input pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <FolderTree className="admin-empty-icon" />
            <p>Không có danh mục nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên danh mục</th>
                    <th>Slug</th>
                    <th>Icon</th>
                    <th>Thứ tự</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCategories.map((cat: any) => (
                    <tr key={cat.ma_danh_muc}>
                      <td className="font-mono text-xs">#{cat.ma_danh_muc}</td>
                      <td className="font-medium">{cat.ten_danh_muc}</td>
                      <td className="text-gray-400 text-xs">{cat.slug}</td>
                      <td className="text-gray-400">{cat.icon || '—'}</td>
                      <td>{cat.thu_tu}</td>
                      <td>
                        <span className={`admin-badge ${cat.trang_thai ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                          {cat.trang_thai ? 'Hoạt động' : 'Ẩn'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(cat)} className="admin-btn-icon" title="Sửa">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(cat.ma_danh_muc)} className="admin-btn-icon text-red-400 hover:text-red-300" title="Xóa">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="admin-pagination">
                <span>Trang {page} / {totalPages} ({filtered.length} mục)</span>
                <div className="admin-pagination-btns">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let startPage = Math.max(1, page - 2);
                    if (startPage + 4 > totalPages) startPage = Math.max(1, totalPages - 4);
                    const p = startPage + i;
                    return <button key={p} onClick={() => setPage(p)} className={page === p ? 'active' : ''}>{p}</button>;
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal admin-modal-animate" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editing ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h3>
              <button onClick={() => setShowModal(false)} className="admin-btn-icon">✕</button>
            </div>
            <div className="admin-modal-body space-y-4">
              <div>
                <label className="admin-label">Tên danh mục *</label>
                <input className="admin-input" value={form.ten_danh_muc} onChange={e => setForm({ ...form, ten_danh_muc: e.target.value })} />
              </div>
              <div>
                <label className="admin-label">Slug *</label>
                <input className="admin-input" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div>
                <label className="admin-label">Mô tả</label>
                <input className="admin-input" value={form.mo_ta} onChange={e => setForm({ ...form, mo_ta: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Icon</label>
                  <input className="admin-input" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="Lucide icon name" />
                </div>
                <div>
                  <label className="admin-label">Thứ tự</label>
                  <input type="number" className="admin-input" value={form.thu_tu} onChange={e => setForm({ ...form, thu_tu: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setShowModal(false)} className="admin-btn admin-btn-secondary">Hủy</button>
              <button onClick={handleSubmit} className="admin-btn admin-btn-primary">{editing ? 'Cập nhật' : 'Tạo mới'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
