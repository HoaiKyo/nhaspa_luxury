import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { receptionistApi } from '../services/receptionist.api';
import { ArrowLeft, FileText, User, Printer } from 'lucide-react';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadInvoice(Number(id));
  }, [id]);

  const loadInvoice = async (invId: number) => {
    try {
      const res = await receptionistApi.getInvoice(invId);
      setInvoice(res.data);
    } catch (e) {
      console.error(e);
      alert('Không tìm thấy hóa đơn');
      navigate('/receptionist/lich-hen'); // Redirect since Receptionist doesn't have an Invoice List page directly mapped in Nav yet
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="admin-animate-in max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="admin-btn-icon">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text-heading)' }}>Chi tiết Hóa đơn #{invoice.ma_hoa_don}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Ngày lập {invoice.ngay_tao ? new Date(invoice.ngay_tao).toLocaleString('vi-VN') : '—'}
          </p>
        </div>
        <div className="ml-auto">
          <button className="admin-btn admin-btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> In hóa đơn
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
        <div className="admin-card space-y-4">
          <h3 className="font-semibold text-lg border-b border-[var(--admin-border)] pb-2 flex items-center gap-2">
            <User size={18} /> Khách hàng
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium inline-block w-24">Họ tên:</span> {invoice.ho_ten_khach || `KH #${invoice.ma_khach_hang}`}</p>
            <p><span className="font-medium inline-block w-24">Mã KH:</span> {invoice.ma_khach_hang}</p>
          </div>
        </div>

        <div className="admin-card space-y-4 bg-gray-50/50">
          <h3 className="font-semibold text-lg border-b border-[var(--admin-border)] pb-2 flex items-center gap-2">
            <FileText size={18} /> Tổng kết tài chính
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium inline-block w-32">Tổng tiền:</span> <span className="font-semibold">{invoice.tong_tien.toLocaleString('vi-VN')} ₫</span></p>
            <p><span className="font-medium inline-block w-32">Khuyến mãi:</span> <span className="text-red-500">-{invoice.giam_gia.toLocaleString('vi-VN')} ₫</span></p>
            <p className="border-t border-gray-200 pt-2 mt-2">
              <span className="font-medium inline-block w-32 text-indigo-700">Khách phải trả:</span> 
              <span className="font-bold text-lg text-indigo-700">{invoice.thanh_tien.toLocaleString('vi-VN')} ₫</span>
            </p>
            <p><span className="font-medium inline-block w-32">Trạng thái:</span> 
              <span className={`admin-badge ml-2 ${invoice.trang_thai === 'PAID' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                {invoice.trang_thai === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3 className="font-semibold text-lg border-b border-[var(--admin-border)] pb-3 mb-4">Chi tiết các dịch vụ</h3>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead className="bg-gray-50">
              <tr>
                <th>STT</th>
                <th>Tên sản phẩm/dịch vụ</th>
                <th className="text-right">Đơn giá</th>
                <th className="text-center">Số lượng</th>
                <th className="text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {invoice.chi_tiets && invoice.chi_tiets.length > 0 ? (
                invoice.chi_tiets.map((item: any, idx: number) => (
                  <tr key={item.ma_chi_tiet}>
                    <td className="w-12 text-center text-gray-500">{idx + 1}</td>
                    <td className="font-medium">{item.ten_san_pham || `#SP-${item.ma_san_pham}`}</td>
                    <td className="text-right">{item.don_gia.toLocaleString('vi-VN')} ₫</td>
                    <td className="text-center">{item.so_luong}</td>
                    <td className="text-right font-semibold">{item.thanh_tien.toLocaleString('vi-VN')} ₫</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="text-center py-4 text-gray-500">Giỏ hàng trống</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Hide print styles directly within components usually using pure CSS, but we use tailwind `print:` above */}
    </div>
  );
}
