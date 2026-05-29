import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Phone, Calendar } from 'lucide-react';
import { publicApi } from '../api/public.api';
import { useBooking } from '../contexts/BookingContext';

export default function ServiceDetail() {
  const { categoryId, productId } = useParams<{ categoryId: string, productId: string }>();
  const [activeTab, setActiveTab] = useState<'description' | 'additional'>('description');
  const [category, setCategory] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { openBooking } = useBooking();
  
  React.useEffect(() => {
    let catFetched = !categoryId;
    let prodFetched = !productId;

    const checkDone = () => {
      if (catFetched && prodFetched) setLoading(false);
    };

    if (categoryId) {
      publicApi.getCategories().then(res => {
        if (res.success && res.data) {
          setCategory(res.data.find((c: any) => String(c.ma_danh_muc) === categoryId || c.slug === categoryId));
        }
        catFetched = true;
        checkDone();
      });
    }

    if (productId) {
      publicApi.getProductById(productId).then(res => {
        if (res.success && res.data) {
          setService(res.data);
        }
        prodFetched = true;
        checkDone();
      });
    }

    checkDone();
  }, [categoryId, productId]);

  if (loading) {
    return (
      <div className="w-full pt-32 pb-20 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center text-primary">Đang tải...</div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="w-full pt-32 pb-20 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-serif text-primary mb-4">Không tìm thấy dịch vụ</h1>
          <Link to="/dich-vu" className="text-accent hover:underline">Quay lại trang Dịch vụ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-28 pb-20 bg-background min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link to={`/dich-vu/${categoryId}`} className="inline-flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-8">
          <ArrowLeft size={16} /> Quay lại {category?.ten_danh_muc || 'Dịch vụ'}
        </Link>

        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row">
          <div className="md:w-1/2 h-64 md:h-auto relative">
            <img 
              src={service.hinh_anh || "http://localhost:8000/uploads/2025/08/1.jpg"} 
              alt={service.ten_san_pham}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <div className="text-accent font-medium uppercase tracking-wider text-sm mb-2">{category?.ten_danh_muc || 'Dịch vụ'}</div>
            <h1 className="text-3xl md:text-4xl font-serif text-primary mb-4">{service.ten_san_pham}</h1>
            
            <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-gray-100">
              {service.bang_gias && service.bang_gias.length > 0 ? (
                service.bang_gias
                  .filter((option: any) => !option.thoi_luong || !option.thoi_luong.includes('90 phút'))
                  .map((option: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                      <div className="font-medium text-text-dark">{option.thoi_luong || 'Gói tiêu chuẩn'}</div>
                      <div className="flex items-end gap-3">
                        <div className="text-2xl font-bold text-secondary">{option.gia.toLocaleString()}₫</div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                  <div className="font-medium text-text-dark">Liên hệ</div>
                  <div className="text-2xl font-bold text-secondary">Liên hệ</div>
                </div>
              )}
            </div>

            <p className="text-text-muted leading-relaxed mb-8">
              {service.mo_ta || `Trải nghiệm liệu trình ${service.ten_san_pham?.toLowerCase()} chuyên sâu tại Nhà Spa. Chúng tôi sử dụng các sản phẩm cao cấp kết hợp kỹ thuật chuyên nghiệp, giúp bạn phục hồi năng lượng, xua tan mệt mỏi và tìm lại sự cân bằng hoàn hảo.`}
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-text-dark">
                <CheckCircle2 size={18} className="text-accent" /> Thời gian thực hiện: {service.bang_gias && service.bang_gias.length > 0 ? service.bang_gias.map((p: any) => p.thoi_luong || '').filter(Boolean).join(' / ') || 'Theo liệu trình' : 'Theo liệu trình'}
              </li>
              <li className="flex items-center gap-3 text-text-dark">
                <CheckCircle2 size={18} className="text-accent" /> Sử dụng 100% thảo dược thiên nhiên
              </li>
              <li className="flex items-center gap-3 text-text-dark">
                <CheckCircle2 size={18} className="text-accent" /> Kỹ thuật viên chuyên nghiệp, tận tâm
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 mt-auto">
              <button 
                onClick={() => openBooking(service.ma_san_pham)}
                className="flex-1 bg-primary text-white py-3 rounded-md hover:bg-secondary transition-colors text-sm font-medium uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Calendar size={16} /> Đặt lịch ngay
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12 bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto hide-scrollbar">
            <button
              className={`pb-4 px-6 font-medium text-lg transition-colors relative whitespace-nowrap ${
                activeTab === 'description' ? 'text-primary' : 'text-text-muted hover:text-primary'
              }`}
              onClick={() => setActiveTab('description')}
            >
              Mô tả chi tiết
              {activeTab === 'description' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>
              )}
            </button>
            <button
              className={`pb-4 px-6 font-medium text-lg transition-colors relative whitespace-nowrap ${
                activeTab === 'additional' ? 'text-primary' : 'text-text-muted hover:text-primary'
              }`}
              onClick={() => setActiveTab('additional')}
            >
              Thông tin bổ sung
              {activeTab === 'additional' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>
              )}
            </button>
          </div>

          <div className="prose max-w-none text-text-muted leading-relaxed">
            {activeTab === 'description' && (
              <div className="animate-in fade-in duration-500">
                <h3 className="text-2xl font-serif text-primary mb-4">Liệu trình {service.ten_san_pham}</h3>
                <p className="mb-4">
                  {service.mo_ta || `Liệu trình ${service.ten_san_pham?.toLowerCase()} tại Nhà Spa được thiết kế đặc biệt để mang lại trải nghiệm thư giãn tối đa và hiệu quả trị liệu chuyên sâu. Chúng tôi kết hợp các phương pháp y học cổ truyền với kỹ thuật chăm sóc hiện đại, sử dụng 100% nguyên liệu thảo dược thiên nhiên an toàn và lành tính.`}
                </p>
                <p className="mb-6">
                  Mỗi bước trong liệu trình đều được thực hiện bởi đội ngũ kỹ thuật viên giàu kinh nghiệm, được đào tạo bài bản. Không gian spa yên tĩnh, thoang thoảng hương tinh dầu cùng âm nhạc du dương sẽ giúp bạn hoàn toàn rũ bỏ mọi căng thẳng, mệt mỏi của cuộc sống thường nhật.
                </p>
                
                <h4 className="text-xl font-medium text-text-dark mb-4">Lợi ích nổi bật:</h4>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-accent shrink-0 mt-0.5" />
                    <span>Giảm căng thẳng, mệt mỏi tức thì, mang lại cảm giác thư thái.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-accent shrink-0 mt-0.5" />
                    <span>Cải thiện tuần hoàn máu và lưu thông khí huyết.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-accent shrink-0 mt-0.5" />
                    <span>Giảm đau nhức cơ bắp, xương khớp hiệu quả.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-accent shrink-0 mt-0.5" />
                    <span>Cân bằng năng lượng, cải thiện chất lượng giấc ngủ.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-accent shrink-0 mt-0.5" />
                    <span>Nuôi dưỡng làn da và cơ thể khỏe mạnh từ sâu bên trong.</span>
                  </li>
                </ul>
              </div>
            )}

            {activeTab === 'additional' && (
              <div className="animate-in fade-in duration-500">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <th className="py-4 pr-4 font-medium text-text-dark w-1/3 min-w-[150px]">Thời gian thực hiện</th>
                        <td className="py-4 text-text-muted">60 phút</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <th className="py-4 pr-4 font-medium text-text-dark w-1/3 min-w-[150px]">Sản phẩm sử dụng</th>
                        <td className="py-4 text-text-muted">100% Thảo dược thiên nhiên, tinh dầu hữu cơ cao cấp, an toàn cho mọi loại da</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <th className="py-4 pr-4 font-medium text-text-dark w-1/3 min-w-[150px]">Đối tượng phù hợp</th>
                        <td className="py-4 text-text-muted">Mọi lứa tuổi, đặc biệt phù hợp với người hay căng thẳng, mệt mỏi, đau nhức xương khớp hoặc dân văn phòng</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <th className="py-4 pr-4 font-medium text-text-dark w-1/3 min-w-[150px]">Lưu ý trước khi làm</th>
                        <td className="py-4 text-text-muted">Không ăn quá no trước khi thực hiện liệu trình. Vui lòng thông báo cho kỹ thuật viên về các vấn đề sức khỏe hoặc dị ứng (nếu có)</td>
                      </tr>
                      <tr>
                        <th className="py-4 pr-4 font-medium text-text-dark w-1/3 min-w-[150px]">Tần suất khuyến nghị</th>
                        <td className="py-4 text-text-muted">1-2 lần/tuần để duy trì sức khỏe và đạt hiệu quả trị liệu tốt nhất</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
