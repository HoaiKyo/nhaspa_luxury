import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, ArrowRight, Sparkles, Leaf, Scissors, Droplets, Search, Check, Filter } from 'lucide-react';
import { publicApi } from '../api/public.api';

const getMinPrice = (service: any) => {
  if (service.bang_gias && service.bang_gias.length > 0) {
    const validPrices = service.bang_gias
      .filter((p: any) => !p.thoi_luong?.includes('90 phút'))
      .map((p: any) => p.gia);
    if (validPrices.length > 0) return Math.min(...validPrices);
  }
  return 0;
};

export default function Services() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<string>('all');
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    publicApi.getCategories().then(res => {
      if (res.success && res.data) setCategories(res.data);
    });
    publicApi.getAllProducts().then(res => {
      if (res.success && res.data) setServices(res.data);
    });
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = s.ten_san_pham.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(String(s.ma_danh_muc));
    
    let matchesPrice = true;
    if (selectedPrice !== 'all') {
      const minPrice = getMinPrice(s);
      if (selectedPrice === 'under_300') matchesPrice = minPrice < 300000;
      else if (selectedPrice === '300_500') matchesPrice = minPrice >= 300000 && minPrice <= 500000;
      else if (selectedPrice === '500_1000') matchesPrice = minPrice > 500000 && minPrice <= 1000000;
      else if (selectedPrice === 'over_1000') matchesPrice = minPrice > 1000000;
    }

    return matchesSearch && matchesCategory && matchesPrice;
  });

  return (
    <div className="w-full pt-24 pb-20 bg-background min-h-screen">
      {/* Hero Banner */}
      <section className="relative h-[40vh] min-h-[300px] w-full overflow-hidden mb-16">
        <div className="absolute inset-0 bg-black/50 z-10" />
        <img 
          src="http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-6.jpg" 
          alt="Dịch Vụ Nhà Spa"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
          <div className="text-accent font-sans tracking-[0.3em] uppercase text-sm mb-4">Bảng Giá & Dịch Vụ</div>
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-6">DỊCH VỤ NHÀ SPA</h1>
          <div className="w-24 h-1 bg-accent mx-auto" />
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-text-muted text-lg leading-relaxed">
            Nhà Spa tự hào mang đến các liệu trình chăm sóc sức khỏe và sắc đẹp đa dạng, 
            kết hợp giữa y học cổ truyền và công nghệ hiện đại, giúp bạn tìm lại sự cân bằng 
            từ thể chất đến tinh thần.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {categories.map((cat, idx) => (
            <Link 
              key={cat.ma_danh_muc} 
              to={`/dich-vu/${cat.ma_danh_muc}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 flex flex-col sm:flex-row h-full"
            >
              <div className="sm:w-2/5 relative h-64 sm:h-auto overflow-hidden">
                <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors duration-500 z-10" />
                <img 
                  src={`http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-${(idx % 8) + 1}.jpg`} 
                  alt={cat.ten_danh_muc}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-primary shadow-lg">
                  <Sparkles size={24} strokeWidth={1.5} />
                </div>
              </div>
              
              <div className="sm:w-3/5 p-8 flex flex-col justify-center">
                <h3 className="text-2xl font-serif text-primary mb-4 group-hover:text-secondary transition-colors">{cat.ten_danh_muc}</h3>
                <p className="text-text-muted mb-6 leading-relaxed">
                  Khám phá các dịch vụ thuộc danh mục này với liệu trình chăm sóc đặc biệt từ Nhà Spa.
                </p>
                <div className="mt-auto inline-flex items-center gap-2 text-accent font-medium uppercase tracking-wider text-sm group-hover:text-primary transition-colors">
                  Xem chi tiết <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* All Services with Filters */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif text-primary mb-4">Tất cả dịch vụ</h2>
            <div className="w-16 h-1 bg-accent mx-auto" />
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col gap-6 mb-12 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Search */}
              <div className="w-full lg:w-1/3 relative">
                <input 
                  type="text" 
                  placeholder="Tìm kiếm dịch vụ..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>

              {/* Checkbox Filters */}
              <div className="w-full lg:w-2/3 flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="text-text-dark font-medium text-sm flex items-center gap-2">
                  <Filter size={16} /> Danh mục:
                </span>
                {categories.map(cat => (
                  <label key={cat.ma_danh_muc} className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={selectedCategories.includes(String(cat.ma_danh_muc))}
                        onChange={() => handleCategoryChange(String(cat.ma_danh_muc))}
                      />
                      <div className="w-5 h-5 rounded border border-gray-300 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                        <Check size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <span className="text-text-muted text-sm group-hover:text-primary transition-colors">{cat.ten_danh_muc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-3">
              <span className="text-text-dark font-medium text-sm">Mức giá:</span>
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
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.length > 0 ? (
              filteredServices.map((service) => {
                const category = categories.find(c => c.ma_danh_muc === service.ma_danh_muc);
                return (
                  <div key={service.ma_san_pham} className="bg-white rounded-xl overflow-hidden group border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                    <div className="relative h-48 overflow-hidden">
                      <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors duration-300 z-10" />
                      <img 
                        src={service.hinh_anh || "http://localhost:8000/uploads/2025/08/1.jpg"} 
                        alt={service.ten_san_pham}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-primary rounded-full uppercase tracking-wider">
                        {category?.ten_danh_muc || 'Dịch vụ'}
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <h4 className="font-serif text-lg text-text-dark mb-2 line-clamp-2 group-hover:text-primary transition-colors">{service.ten_san_pham}</h4>
                      <div className="mt-auto pt-4 flex items-end justify-between">
                        <div>
                          {service.bang_gias && service.bang_gias.length > 0 ? (
                            <div className="text-secondary font-medium">
                              {(() => {
                                const validGias = service.bang_gias.filter((p: any) => !p.thoi_luong?.includes('90 phút'));
                                if (validGias.length === 0) return 'Liên hệ';
                                if (validGias.length > 1) {
                                  return `${validGias[0].gia.toLocaleString()}₫ - ${validGias[validGias.length - 1].gia.toLocaleString()}₫`;
                                }
                                return `${validGias[0].gia.toLocaleString()}₫`;
                              })()}
                            </div>
                          ) : (
                            <div className="text-secondary font-medium">Liên hệ</div>
                          )}
                        </div>
                        <Link to={`/dich-vu/${service.ma_danh_muc}/${service.ma_san_pham}`} className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100">
                <p className="text-text-muted">Không tìm thấy dịch vụ nào phù hợp với tìm kiếm của bạn.</p>
              </div>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-serif text-white mb-6">Bạn cần tư vấn dịch vụ phù hợp?</h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-10 text-lg">
              Hãy để đội ngũ chuyên gia của Nhà Spa lắng nghe và thiết kế liệu trình dành riêng cho bạn.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="tel:0866839985" 
                className="bg-accent text-white px-8 py-4 rounded-sm hover:bg-white hover:text-primary transition-colors duration-300 uppercase tracking-wider text-sm font-medium flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Phone size={18} /> Gọi Hotline: 0866 839 985
              </a>
              <a 
                href="https://zalo.me/0866839985" 
                target="_blank" 
                rel="noreferrer"
                className="bg-transparent border border-white text-white px-8 py-4 rounded-sm hover:bg-white/10 transition-colors duration-300 uppercase tracking-wider text-sm font-medium w-full sm:w-auto text-center"
              >
                Chat qua Zalo
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
