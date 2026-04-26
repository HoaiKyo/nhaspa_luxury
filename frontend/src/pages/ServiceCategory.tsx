import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Home, Search, Filter } from 'lucide-react';
import { publicApi } from '../api/public.api';

const getMinPrice = (service: any) => {
  if (service.bang_gias && service.bang_gias.length > 0) {
    const prices = service.bang_gias.map((p: any) => p.gia);
    return Math.min(...prices);
  }
  return 0;
};

export default function ServiceCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrice, setSelectedPrice] = useState<string>('all');
  const [category, setCategory] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      const catsRes = await publicApi.getCategories();
      if (catsRes.success && catsRes.data) {
        setCategories(catsRes.data);
        const cat = catsRes.data.find((c: any) =>
          String(c.ma_danh_muc) === categoryId || c.slug === categoryId
        );
        setCategory(cat || null);

        if (cat?.ma_danh_muc) {
          const productsRes = await publicApi.getAllProducts({
            category_id: cat.ma_danh_muc,
          });
          if (productsRes.success && productsRes.data) {
            setServices(productsRes.data);
          } else {
            setServices([]);
          }
        } else {
          setServices([]);
        }
      } else {
        setCategories([]);
        setCategory(null);
        setServices([]);
      }
      setLoading(false);
    };

    load();
  }, [categoryId]);

  const categoryServices = services.filter(s => {
    const matchesSearch = s.ten_san_pham.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesPrice = true;
    if (selectedPrice !== 'all') {
      const minPrice = getMinPrice(s);
      if (selectedPrice === 'under_300') matchesPrice = minPrice < 300000;
      else if (selectedPrice === '300_500') matchesPrice = minPrice >= 300000 && minPrice <= 500000;
      else if (selectedPrice === '500_1000') matchesPrice = minPrice > 500000 && minPrice <= 1000000;
      else if (selectedPrice === 'over_1000') matchesPrice = minPrice > 1000000;
    }

    return matchesSearch && matchesPrice;
  });

  if (loading) {
    return (
      <div className="w-full pt-32 pb-20 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center text-primary">Đang tải...</div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="w-full pt-32 pb-20 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-serif text-primary mb-4">Không tìm thấy danh mục</h1>
          <Link to="/dich-vu" className="text-accent hover:underline">Quay lại trang Dịch vụ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background min-h-screen">
      {/* Hero Banner */}
      <section className="relative h-[35vh] min-h-[250px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <img 
          src="http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-6.jpg" 
          alt={category.ten_danh_muc}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-6 uppercase tracking-wider">{category.ten_danh_muc}</h1>
          <div className="w-16 h-1 bg-accent mx-auto" />
        </div>
      </section>

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="container mx-auto px-4 max-w-7xl flex items-center gap-2 text-sm text-text-muted">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1"><Home size={14} /> Trang chủ</Link>
          <ChevronRight size={14} />
          <Link to="/dich-vu" className="hover:text-primary transition-colors">Dịch vụ</Link>
          <ChevronRight size={14} />
          <span className="text-primary font-medium">{category.ten_danh_muc}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-16">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h3 className="font-serif text-xl text-primary mb-6 border-b border-gray-100 pb-4">Danh mục dịch vụ</h3>
              <ul className="space-y-2">
                {categories.map((cat) => (
                  <li key={cat.ma_danh_muc}>
                    <Link 
                      to={`/dich-vu/${cat.ma_danh_muc}`}
                      className={`block py-3 px-4 rounded-md transition-colors ${
                        String(cat.ma_danh_muc) === categoryId || cat.slug === categoryId
                          ? 'bg-primary/5 text-primary font-medium border-l-2 border-primary' 
                          : 'text-text-muted hover:bg-background hover:text-primary'
                      }`}
                    >
                      {cat.ten_danh_muc}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-8 bg-spa-gradient-light p-6 rounded-xl text-center">
                <h4 className="font-serif text-primary mb-2">Cần tư vấn?</h4>
                <p className="text-sm text-text-muted mb-4">Liên hệ ngay để được chuyên gia tư vấn liệu trình phù hợp.</p>
                <a 
                  href="tel:0866839985" 
                  className="block w-full bg-primary text-white py-3 rounded-md hover:bg-secondary transition-colors text-sm font-medium uppercase tracking-wider"
                >
                  0866 839 985
                </a>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-3xl font-serif text-primary mb-4">Các gói {category.ten_danh_muc.toLowerCase()}</h2>
                <p className="text-text-muted leading-relaxed">
                  Khám phá các liệu trình {category.ten_danh_muc.toLowerCase()} chuyên sâu tại Nhà Spa, 
                  được thiết kế riêng biệt để mang lại hiệu quả tối ưu và trải nghiệm thư giãn tuyệt vời nhất cho bạn.
                </p>
              </div>
              
              {/* Search */}
              <div className="w-full md:w-64 relative shrink-0">
                <input 
                  type="text" 
                  placeholder="Tìm kiếm..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            {/* Price Filter */}
            <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-text-dark font-medium text-sm flex items-center gap-2">
                <Filter size={16} /> Mức giá:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'under_300', label: 'Dưới 300k' },
                  { id: '300_500', label: '300k - 500k' },
                  { id: '500_1000', label: '500k - 1 Triệu' },
                  { id: 'over_1000', label: 'Trên 1 Triệu' }
                ].map(price => (
                  <button
                    key={price.id}
                    onClick={() => setSelectedPrice(price.id)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                      selectedPrice === price.id
                        ? 'bg-primary text-white'
                        : 'bg-gray-50 text-text-muted hover:bg-primary/10 hover:text-primary border border-gray-200'
                    }`}
                  >
                    {price.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categoryServices.length > 0 ? (
                categoryServices.map((service) => (
                  <div key={service.ma_san_pham} className="bg-white rounded-xl overflow-hidden group border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                    <div className="relative h-56 overflow-hidden">
                      <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors duration-300 z-10" />
                      <img 
                        src={service.hinh_anh || "http://localhost:8000/uploads/2025/08/1.jpg"} 
                        alt={service.ten_san_pham}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <h4 className="font-serif text-xl text-text-dark mb-3 group-hover:text-primary transition-colors">{service.ten_san_pham}</h4>
                      <p className="text-text-muted text-sm mb-6 line-clamp-2">
                        {service.mo_ta || "Liệu trình chăm sóc chuyên sâu giúp phục hồi và tái tạo, mang lại cảm giác thư thái và hiệu quả rõ rệt sau lần đầu trải nghiệm."}
                      </p>
                      <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div>
                          {service.bang_gias && service.bang_gias.length > 0 ? (
                            <div className="text-secondary font-medium text-lg">
                              {service.bang_gias.length > 1 
                                ? `${service.bang_gias[0].gia.toLocaleString()}₫ - ${service.bang_gias[service.bang_gias.length - 1].gia.toLocaleString()}₫`
                                : `${service.bang_gias[0].gia.toLocaleString()}₫`}
                            </div>
                          ) : (
                            <div className="text-secondary font-medium text-lg">Liên hệ</div>
                          )}
                        </div>
                        <Link to={`/dich-vu/${categoryId}/${service.ma_san_pham}`} className="bg-primary/10 text-primary px-4 py-2 rounded-md font-medium text-sm hover:bg-primary hover:text-white transition-colors flex items-center gap-2">
                          Chi tiết <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100">
                  <p className="text-text-muted">Hiện chưa có dịch vụ nào trong danh mục này.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
