import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { receptionistApi } from '../services/receptionist.api';

export default function InvoiceVnpayCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Đang xác nhận kết quả thanh toán VNPAY...');

  useEffect(() => {
    const run = async () => {
      try {
        const res = await receptionistApi.handleVnpayCallback(searchParams);
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Xử lý callback VNPAY thất bại');
        }

        const invoiceId = Number(res.data.ma_hoa_don || 0);
        if (!invoiceId) {
          throw new Error('Không tìm thấy hóa đơn từ callback VNPAY');
        }

        if (!res.data.success) {
          setMessage('Thanh toán VNPAY không thành công. Đang quay lại hóa đơn...');
          setTimeout(() => navigate(`/receptionist/hoa-don/${invoiceId}`, { replace: true }), 1200);
          return;
        }

        setMessage('Thanh toán thành công. Đang quay lại chi tiết hóa đơn...');
        setTimeout(() => navigate(`/receptionist/hoa-don/${invoiceId}`, { replace: true }), 800);
      } catch (error: any) {
        setMessage(error?.message || 'Không thể xác nhận kết quả thanh toán VNPAY');
        setTimeout(() => navigate('/receptionist/lich-hen', { replace: true }), 1500);
      }
    };

    void run();
  }, [navigate, searchParams]);

  return (
    <div className="admin-animate-in max-w-2xl mx-auto">
      <div className="admin-card py-10 text-center space-y-3">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          {message}
        </p>
      </div>
    </div>
  );
}
