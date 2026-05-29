import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { receptionistApi } from '../services/receptionist.api';
import { CalendarDays, Search, Plus, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AppointmentListPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const pageSize = 10;

  useEffect(() => {
    loadAppointments();
  }, [page, statusFilter, dateFilter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await receptionistApi.getAppointments(page, pageSize, statusFilter, dateFilter);
      setAppointments(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="admin-badge admin-badge-warning">Chờ xác nhận</span>;
      case 'CONFIRMED': return <span className="admin-badge admin-badge-info">Đã xác nhận</span>;
      case 'COMPLETED': return <span className="admin-badge admin-badge-success">Đã hoàn thành</span>;
      case 'CANCELLED': return <span className="admin-badge admin-badge-danger">Đã hủy</span>;
      default: return <span className="admin-badge admin-badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="admin-animate-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text-heading)' }}>Danh sách Lịch hẹn</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{total} lịch hẹn đang có</p>
        </div>
        <button onClick={() => navigate('tao-moi')} className="admin-btn admin-btn-primary">
          <Plus size={16} /> Tạo lịch hẹn
        </button>
      </div>

      <div className="admin-card">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="admin-search flex-1 min-w-[200px]">
            <Search size={16} className="admin-search-icon" />
            <input type="text" placeholder="Tìm kiếm (chưa hỗ trợ)..." className="admin-input pl-10" disabled />
          </div>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={e => { setDateFilter(e.target.value); setPage(1); }} 
            className="admin-input max-w-[200px]"
          />
          <select 
            value={statusFilter} 
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }} 
            className="admin-select max-w-[200px]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="admin-empty">
            <CalendarDays className="admin-empty-icon" />
            <p>Không có lịch hẹn nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã LH</th>
                    <th>Khách hàng</th>
                    <th>Thời gian hẹn</th>
                    <th>Dịch vụ & Khách</th>
                    <th>Trạng thái</th>
                    <th className="text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr key={appt.ma_lich_hen}>
                      <td className="font-mono text-xs">LH-{appt.ma_lich_hen}</td>
                      <td>
                        <div className="font-medium">{appt.ho_ten_khach || `KH #${appt.ma_khach_hang}`}</div>
                        <div className="text-xs font-bold text-indigo-600">{appt.so_dien_thoai_khach}</div>
                        <div className="text-xs text-gray-500">Mã KH: {appt.ma_khach_hang}</div>
                      </td>
                      <td>
                        <div>{appt.ngay_hen ? new Date(appt.ngay_hen).toLocaleDateString('vi-VN') : '—'}</div>
                        <div className="text-xs font-semibold text-indigo-600">
                          {appt.gio_bat_dau ? String(appt.gio_bat_dau).slice(0, 5) : '—'}
                        </div>
                      </td>
                      <td className="text-sm">
                         <div>{Array.isArray(appt.chi_tiets) ? appt.chi_tiets.length : 0} dịch vụ</div>
                         <div className="text-xs text-gray-500 font-medium">
                            {1 + (appt.khach_di_kems?.length || 0)} người
                         </div>
                      </td>
                      <td>{getStatusBadge(appt.trang_thai)}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => navigate(String(appt.ma_lich_hen))} className="admin-btn-icon text-indigo-500" title="Xem chi tiết">
                            <Eye size={15} />
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
                <span>Trang {page} / {totalPages} ({total} mục)</span>
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
    </div>
  );
}
