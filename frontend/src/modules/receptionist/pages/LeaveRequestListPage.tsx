import React, { useState, useEffect } from 'react';
import { receptionistApi } from '../services/receptionist.api';
import { CalendarOff, Plus, Save } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

export default function LeaveRequestListPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [staffMap, setStaffMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ma_nhan_vien: undefined as number | undefined, ngay_bat_dau: '', ngay_ket_thuc: '', ly_do: '' });
  const [staffList, setStaffList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const [leaveRes, staffRes] = await Promise.all([
        receptionistApi.getLeaves(1, 100),
        receptionistApi.getAvailableStaff(),
      ]);
      setLeaves(leaveRes.data || []);
      const map: Record<number, string> = {};
      (staffRes.data || []).forEach((s: any) => {
        if (s.ma_nhan_vien) map[s.ma_nhan_vien] = s.ho_ten || `NV #${s.ma_nhan_vien}`;
      });
      setStaffMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    if (staffList.length > 0) return;
    try {
      const res = await receptionistApi.getAvailableStaff();
      setStaffList(res.data || []);
      const map: Record<number, string> = {};
      (res.data || []).forEach((s: any) => {
        if (s.ma_nhan_vien) map[s.ma_nhan_vien] = s.ho_ten || `NV #${s.ma_nhan_vien}`;
      });
      setStaffMap(map);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreate = () => {
    setShowCreate(true);
    setForm({ ma_nhan_vien: undefined, ngay_bat_dau: '', ngay_ket_thuc: '', ly_do: '' });
    loadStaff();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ngay_bat_dau || !form.ngay_ket_thuc) return alert('Vui lòng chọn ngày Bắt đầu và Kết thúc');
    try {
      setSubmitting(true);
      await receptionistApi.createLeave(form);
      alert('Đã gửi yêu cầu nghỉ phép');
      setShowCreate(false);
      loadLeaves();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="admin-badge admin-badge-warning">Đang chờ duyệt</span>;
      case 'APPROVED': return <span className="admin-badge admin-badge-success">Đã duyệt</span>;
      case 'REJECTED': return <span className="admin-badge admin-badge-danger">Từ chối</span>;
      default: return <span className="admin-badge admin-badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="admin-animate-in space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text-heading)' }}>Báo Lịch Nghỉ Phép</h1>
        <button onClick={handleOpenCreate} className="admin-btn admin-btn-primary">
          <Plus size={16} /> Tạo Yêu cầu Nghỉ
        </button>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="admin-empty">
            <CalendarOff className="admin-empty-icon" />
            <p>Không có yêu cầu nghỉ phép nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã NP</th>
                  <th>Nhân viên</th>
                  <th>Từ ngày</th>
                  <th>Đến ngày</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                  {leaves.map((lv) => (
                  <tr key={lv.ma_nghi_phep}>
                    <td className="font-mono text-xs">NP-{lv.ma_nghi_phep}</td>
                    <td className="font-medium">{staffMap[lv.ma_nhan_vien] || `NV #${lv.ma_nhan_vien}`}</td>
                    <td>{new Date(lv.ngay_bat_dau).toLocaleDateString('vi-VN')}</td>
                    <td>{new Date(lv.ngay_ket_thuc).toLocaleDateString('vi-VN')}</td>
                    <td>{lv.ly_do || '...'}</td>
                    <td>{getStatusBadge(lv.trang_thai)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="admin-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="admin-modal max-w-md admin-modal-animate" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Tạo yêu cầu nghỉ phép</h3>
              <button onClick={() => setShowCreate(false)} className="admin-btn-icon">✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="admin-modal-body space-y-4">
                <div>
                  <label className="admin-label">Làm thay / Tạo cho nhân viên</label>
                  <select 
                    className="admin-select" 
                    value={form.ma_nhan_vien || ''} 
                    onChange={e => setForm({...form, ma_nhan_vien: e.target.value ? Number(e.target.value) : undefined})}
                  >
                    <option value="">Bản thân (Tôi)</option>
                    {staffList.map(st => (
                      <option key={st.ma_nhan_vien} value={st.ma_nhan_vien}>{st.ho_ten}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="admin-label">Từ ngày *</label>
                    <input required type="date" className="admin-input" value={form.ngay_bat_dau} onChange={e => setForm({...form, ngay_bat_dau: e.target.value})} />
                  </div>
                  <div>
                    <label className="admin-label">Đến ngày *</label>
                    <input required type="date" className="admin-input" value={form.ngay_ket_thuc} onChange={e => setForm({...form, ngay_ket_thuc: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="admin-label">Lý do</label>
                  <textarea className="admin-input" rows={3} value={form.ly_do} onChange={e => setForm({...form, ly_do: e.target.value})} placeholder="Ốm, có việc gia đình..."></textarea>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" onClick={() => setShowCreate(false)} className="admin-btn admin-btn-secondary">Hủy</button>
                <button type="submit" disabled={submitting} className="admin-btn admin-btn-primary">
                  {submitting ? 'Đang gửi...' : <><Save size={16}/> Xác nhận</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
