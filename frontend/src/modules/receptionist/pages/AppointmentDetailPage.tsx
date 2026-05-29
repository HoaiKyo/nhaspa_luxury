import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { receptionistApi } from '../services/receptionist.api';
import { CalendarDays, ArrowLeft, User, Clock, XCircle, Save, CheckCircle2 } from 'lucide-react';

type StaffRow = {
  ma_nhan_vien: number;
  ho_ten?: string;
  chuc_vu?: string;
};

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [savingStaff, setSavingStaff] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [staffByService, setStaffByService] = useState<Record<number, StaffRow[]>>({});

  useEffect(() => {
    if (id) loadAppointment(Number(id));
  }, [id]);

  const loadAppointment = async (apptId: number) => {
    try {
      const res = await receptionistApi.getAppointment(apptId);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Không tìm thấy lịch hẹn');
      }
      setAppointment(res.data);
      await loadStaffOptions(res.data);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Không tìm thấy lịch hẹn');
      const basePath = window.location.pathname.startsWith('/admin') ? '/admin/lich-hen' : '/receptionist/lich-hen';
      navigate(basePath);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffOptions = async (appt: any) => {
    const details = Array.isArray(appt?.chi_tiets) ? appt.chi_tiets : [];
    const serviceIds = Array.from(
      new Set(
        details
          .map((d: any) => Number(d.ma_san_pham))
          .filter((value: number) => Number.isFinite(value) && value > 0),
      ),
    ) as number[];
    const nextMap: Record<number, StaffRow[]> = {};
    
    await Promise.all(
      serviceIds.map(async (serviceId) => {
        try {
          const detail = details.find((d: any) => Number(d.ma_san_pham) === serviceId);
          const startTime = detail?.gio_bat_dau || appt.gio_bat_dau;
          const apptDate = appt.ngay_hen;

          const res = await receptionistApi.getAvailableStaff(serviceId, apptDate, startTime, appt.ma_lich_hen);
          if (res.success && Array.isArray(res.data)) {
            nextMap[serviceId] = (res.data as any[]).map((row) => ({
              ma_nhan_vien: Number(row.ma_nhan_vien),
              ho_ten: row.ho_ten,
              chuc_vu: row.chuc_vu,
            }));
          } else {
            nextMap[serviceId] = [];
          }
        } catch {
          nextMap[serviceId] = [];
        }
      }),
    );
    setStaffByService(nextMap);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return alert('Vui lòng nhập lý do hủy');
    try {
      const res = await receptionistApi.cancelAppointment(Number(id), cancelReason);
      if (!res.success) throw new Error(res.message || 'Hủy thất bại');
      setShowCancelModal(false);
      loadAppointment(Number(id));
    } catch (e: any) {
      alert(e?.message || 'Hủy thất bại');
    }
  };

  const handleStaffChange = (detailId: number, staffId: number | null) => {
    setAppointment((prev: any) => {
      if (!prev) return prev;
      const nextDetails = (prev.chi_tiets || []).map((detail: any) =>
        detail.ma_chi_tiet === detailId
          ? { ...detail, ma_nhan_vien: staffId, ho_ten_nhan_vien: undefined }
          : detail,
      );
      return { ...prev, chi_tiets: nextDetails };
    });
  };

  const handleGuestChange = (detailId: number, guestId: number | null) => {
    setAppointment((prev: any) => {
      if (!prev) return prev;
      const nextDetails = (prev.chi_tiets || []).map((detail: any) =>
        detail.ma_chi_tiet === detailId
          ? { ...detail, ma_khach_di_kem: guestId }
          : detail,
      );
      return { ...prev, chi_tiets: nextDetails };
    });
  };

  const handleSaveStaff = async () => {
    if (!appointment || !Array.isArray(appointment.chi_tiets)) return;
    setSavingStaff(true);
    try {
      const staffByPerson = new Map<number, string>();
      const detailPayload = appointment.chi_tiets.map((detail: any) => {
        const personKey = detail.ma_khach_di_kem ? `GUEST:${detail.ma_khach_di_kem}` : 'MAIN';
        const staffId = detail.ma_nhan_vien ? Number(detail.ma_nhan_vien) : null;
        if (staffId) {
          const existingPerson = staffByPerson.get(staffId);
          if (existingPerson && existingPerson !== personKey) {
            throw new Error('Không thể gán cùng một nhân viên cho 2 khách khác nhau trong cùng lịch hẹn.');
          }
          staffByPerson.set(staffId, personKey);
        }
        return {
          ma_chi_tiet: Number(detail.ma_chi_tiet),
          ma_nhan_vien: staffId,
          ma_khach_di_kem: detail.ma_khach_di_kem || null,
        };
      });

      const res = await receptionistApi.updateAppointment(Number(id), { chi_tiets: detailPayload });
      if (!res.success) throw new Error(res.message || 'Cập nhật thất bại');
      alert('Đã lưu cập nhật dịch vụ');
      loadAppointment(Number(id));
    } catch (error: any) {
      alert(error?.message || 'Cập nhật thất bại');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleComplete = async () => {
    if (!appointment) return;
    setCompleting(true);
    try {
      const res = await receptionistApi.updateAppointment(Number(id), { trang_thai: 'COMPLETED' });
      if (!res.success) throw new Error(res.message || 'Không thể hoàn thành lịch hẹn');

      const invoiceId = (res.data as any)?.ma_hoa_don;
      if (invoiceId) {
        alert(`Lịch hẹn đã hoàn thành và chuyển sang hóa đơn #${invoiceId}.`);
        navigate(`/receptionist/hoa-don/${invoiceId}`);
      } else {
        alert('Lịch hẹn đã hoàn thành.');
        loadAppointment(Number(id));
      }
    } catch (error: any) {
      alert(error?.message || 'Không thể hoàn thành lịch hẹn');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!appointment) return null;

  const isCancelable = !['COMPLETED', 'CANCELLED'].includes(appointment.trang_thai);
  const canComplete = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(appointment.trang_thai);
  const canChangeStaff = !['COMPLETED', 'CANCELLED'].includes(appointment.trang_thai);

  return (
    <div className="admin-animate-in space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => {
          const basePath = window.location.pathname.startsWith('/admin') ? '/admin/lich-hen' : '/receptionist/lich-hen';
          navigate(basePath);
        }} className="admin-btn-icon">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text-heading)' }}>Chi tiết Lịch hẹn #{appointment.ma_lich_hen}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Tạo ngày {appointment.ngay_tao ? new Date(appointment.ngay_tao).toLocaleString('vi-VN') : '—'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canComplete && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="admin-btn admin-btn-primary"
            >
              <CheckCircle2 size={16} /> {completing ? 'Đang xử lý...' : 'Hoàn thành'}
            </button>
          )}
          {isCancelable && (
            <button onClick={() => setShowCancelModal(true)} className="admin-btn admin-btn-danger">
              <XCircle size={16} /> Hủy lịch
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="admin-card space-y-4">
          <h3 className="font-semibold text-lg border-b border-[var(--admin-border)] pb-2 flex items-center gap-2">
            <User size={18} /> Khách hàng
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium inline-block w-24">Họ tên:</span> {appointment.ho_ten_khach || `KH #${appointment.ma_khach_hang}`}</p>
            <p><span className="font-medium inline-block w-24">SĐT:</span> <span className="font-bold text-indigo-600">{appointment.so_dien_thoai_khach || '—'}</span></p>
            <p><span className="font-medium inline-block w-24">Mã KH:</span> {appointment.ma_khach_hang}</p>
            <p><span className="font-medium inline-block w-24">Số khách:</span> <span className="font-bold text-indigo-600">{1 + (appointment.khach_di_kems?.length || 0)} người</span> (Bao gồm {appointment.khach_di_kems?.length || 0} khách đi kèm)</p>
            <p><span className="font-medium inline-block w-24">Ghi chú:</span> {appointment.ghi_chu || 'Không có'}</p>
          </div>
        </div>

        <div className="admin-card space-y-4">
          <h3 className="font-semibold text-lg border-b border-[var(--admin-border)] pb-2 flex items-center gap-2">
            <Clock size={18} /> Thông tin lịch hẹn
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium inline-block w-24">Thời gian:</span>
              {appointment.ngay_hen ? new Date(appointment.ngay_hen).toLocaleDateString('vi-VN') : '—'}
              {appointment.gio_bat_dau ? ` ${String(appointment.gio_bat_dau).slice(0, 5)}` : ''}
            </p>
            <div className="flex items-center gap-2">
              <span className="font-medium inline-block w-24 shrink-0">Trạng thái:</span>
              <select
                className="admin-select bg-white py-1.5 h-10 text-sm min-w-[200px]"
                value={appointment.trang_thai}
                onChange={async (e) => {
                  const nextStatus = e.target.value;
                  if (!window.confirm(`Bạn có chắc muốn chuyển trạng thái sang ${nextStatus}?`)) return;
                  try {
                    const res = await receptionistApi.updateAppointment(Number(id), { trang_thai: nextStatus });
                    if (!res.success) throw new Error(res.message || 'Cập nhật thất bại');
                    loadAppointment(Number(id));
                  } catch (err: any) {
                    alert(err?.message || 'Cập nhật thất bại');
                  }
                }}
              >
                <option value="PENDING">Chờ xác nhận</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED" disabled>Đã hủy (Sử dụng nút hủy)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3 mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CalendarDays size={18} /> Dịch vụ yêu cầu
          </h3>
          {canChangeStaff && (
            <button
              onClick={handleSaveStaff}
              disabled={savingStaff}
              className="admin-btn admin-btn-secondary"
            >
              <Save size={15} /> {savingStaff ? 'Đang lưu...' : 'Lưu cập nhật'}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Dịch vụ</th>
                <th>Giá</th>
                <th>Người phụ trách</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {appointment.chi_tiets && appointment.chi_tiets.length > 0 ? (
                appointment.chi_tiets.map((dv: any) => {
                  const serviceStaff = staffByService[Number(dv.ma_san_pham)] || [];
                  
                  // Lọc ra tất cả nhân viên ĐÃ ĐƯỢC CHỌN ở các dòng dịch vụ khác trong cùng lịch hẹn này
                  const staffTakenByOtherServices = new Set(
                    appointment.chi_tiets
                      .filter((otherDv: any) => otherDv.ma_chi_tiet !== dv.ma_chi_tiet && Boolean(otherDv.ma_nhan_vien))
                      .map((otherDv: any) => Number(otherDv.ma_nhan_vien))
                  );
                  
                  const availableServiceStaff = serviceStaff.filter((staff: any) => 
                     !staffTakenByOtherServices.has(staff.ma_nhan_vien) || staff.ma_nhan_vien === Number(dv.ma_nhan_vien)
                  );

                  return (
                    <tr key={dv.ma_chi_tiet}>
                      <td className="align-top">
                        <div className="font-medium">{dv.ten_san_pham || `Sản phẩm #${dv.ma_san_pham}`}</div>
                        <div className="text-sm text-[var(--admin-text-muted)] mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-xs whitespace-nowrap">Dành cho:</span>
                          {canChangeStaff ? (
                            <select
                               className="admin-select text-sm py-1.5 px-2"
                               style={{ minWidth: '150px' }}
                               value={dv.ma_khach_di_kem || ''}
                               onChange={(e) => handleGuestChange(dv.ma_chi_tiet, e.target.value ? Number(e.target.value) : null)}
                            >
                               <option value="">Khách chính</option>
                               {appointment?.khach_di_kems?.map((k: any) => (
                                 <option key={k.ma_khach_di_kem} value={k.ma_khach_di_kem}>{k.ho_ten || 'Khách đi kèm'}</option>
                               ))}
                            </select>
                          ) : (
                            <span className="font-semibold text-[var(--admin-text-primary)]">
                              {dv.ma_khach_di_kem ? (
                                 appointment?.khach_di_kems?.find((k: any) => k.ma_khach_di_kem === dv.ma_khach_di_kem)?.ho_ten || 'Khách đi kèm'
                              ) : 'Khách chính'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="align-top pt-3">{dv.gia ? Number(dv.gia).toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                      <td className="align-top pt-2.5">
                        {canChangeStaff ? (
                          <select
                            className="admin-select min-w-[220px]"
                            value={dv.ma_nhan_vien || 0}
                            onChange={(e) => handleStaffChange(dv.ma_chi_tiet, Number(e.target.value) || null)}
                          >
                            <option value={0}>Chưa xếp</option>
                            {availableServiceStaff.map((staff: any) => (
                              <option key={`${dv.ma_chi_tiet}-${staff.ma_nhan_vien}`} value={staff.ma_nhan_vien}>
                                {staff.ho_ten || `NV #${staff.ma_nhan_vien}`}{staff.chuc_vu ? ` • ${staff.chuc_vu}` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{dv.ho_ten_nhan_vien || (dv.ma_nhan_vien ? `NV #${dv.ma_nhan_vien}` : 'Chưa xếp')}</span>
                        )}
                      </td>
                      <td className="align-top pt-3">{dv.ghi_chu || '...'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={4} className="text-center py-4 text-gray-500">Chưa có dịch vụ nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCancelModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="admin-modal max-w-md admin-modal-animate" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="text-red-600 flex items-center gap-2"><XCircle size={20} /> Lý do hủy lịch</h3>
              <button onClick={() => setShowCancelModal(false)} className="admin-btn-icon">✕</button>
            </div>
            <div className="admin-modal-body">
              <p className="text-sm mb-3">Vui lòng cho biết lý do hủy lịch hẹn này:</p>
              <textarea
                className="admin-input w-full"
                rows={3}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Khách thay đổi ý định, báo bận, v.v"
              />
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setShowCancelModal(false)} className="admin-btn admin-btn-secondary">Đóng</button>
              <button onClick={handleCancel} className="admin-btn admin-btn-danger">Xác nhận Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
