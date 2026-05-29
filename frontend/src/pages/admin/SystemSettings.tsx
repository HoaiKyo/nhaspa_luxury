import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Info, Bed } from 'lucide-react';
import { systemApi } from '../../api/admin.api';

interface Setting {
  ma_cau_hinh: string;
  gia_tri: string;
  mo_ta: string;
  loai_du_lieu: string;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    const res = await systemApi.list();
    if (res.success) {
      setSettings(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (ma: string, val: string) => {
    setUpdating(ma);
    const res = await systemApi.update({ ma_cau_hinh: ma, gia_tri: val });
    if (res.success) {
      alert('Cập nhật cấu hình thành công');
      fetchSettings();
    } else {
      alert(res.message || 'Lỗi khi cập nhật');
    }
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900" style={{ color: 'var(--admin-text-heading)' }}>Cấu hình hệ thống</h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý các thông số vận hành của Spa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settings.map((s) => (
          <div key={s.ma_cau_hinh} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow" style={{ background: 'var(--admin-sidebar)', borderColor: 'var(--admin-border)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {s.ma_cau_hinh === 'MAX_CAPACITY' ? <Bed size={24} /> : <Settings size={24} />}
              </div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.ma_cau_hinh}</div>
            </div>
            
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--admin-text-heading)' }}>
              {s.ma_cau_hinh === 'MAX_CAPACITY' ? 'Sức chứa tối đa' : s.ma_cau_hinh}
            </h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">{s.mo_ta}</p>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="number"
                  defaultValue={s.gia_tri}
                  className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg transition-all"
                  style={{ background: 'var(--admin-bg)', borderColor: 'var(--admin-border)', color: 'var(--admin-text-heading)' }}
                  onBlur={(e) => {
                    if (e.target.value !== s.gia_tri) {
                      handleUpdate(s.ma_cau_hinh, e.target.value);
                    }
                  }}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {updating === s.ma_cau_hinh ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-blue-600 text-[10px] font-medium leading-tight">
                <Info size={14} className="shrink-0" />
                Dữ liệu sẽ được áp dụng ngay lập tức cho tất cả các lượt đặt lịch mới.
              </div>
            </div>
          </div>
        ))}
      </div>

      {settings.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <Settings className="mx-auto text-gray-200 mb-3" size={48} />
          <p className="text-gray-500">Chưa có cấu hình nào được thiết lập.</p>
        </div>
      )}
    </div>
  );
}
