import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Play, ArrowRight, Leaf, Sparkles, Droplets, Scissors, Search } from 'lucide-react';
import { useBooking } from '../contexts/BookingContext';
import { publicApi } from '../api/public.api';

const slides = [
  { id: 1, title: "Gội đầu dưỡng sinh", subtitle: "Thư giãn tinh thần, chăm sóc tóc từ gốc", image: "http://localhost:8000/uploads/2025/08/1.jpg" },
  { id: 2, title: "Massage Body", subtitle: "Giải tỏa căng thẳng, phục hồi năng lượng", image: "http://localhost:8000/uploads/2025/08/2.jpg" },
  { id: 3, title: "Chăm sóc da", subtitle: "Làn da rạng rỡ, tươi trẻ mỗi ngày", image: "http://localhost:8000/uploads/2025/08/3.jpg" },
  { id: 4, title: "Combo Nhà Spa", subtitle: "Trải nghiệm trọn vẹn, ưu đãi hấp dẫn", image: "http://localhost:8000/uploads/2025/08/4.jpg" },
];

const partners = ["Volayon", "Moroccanoil", "Juhette Armand", "Histolab", "Davines", "Olaplex", "Kerastase"];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState(slides);
  const [cats, setCats] = useState<any[]>([]);
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const { openBooking } = useBooking();

  useEffect(() => {
    // Fetch data concurrently
    Promise.all([
      publicApi.getBanners(true),
      publicApi.getCategories(),
      publicApi.getProducts({ page: 1, page_size: 5 }),
      publicApi.getNews({ page: 1, page_size: 3 })
    ]).then(([bannersRes, catsRes, prodsRes, newsRes]) => {
      if (bannersRes.success && bannersRes.data && bannersRes.data.length > 0) {
        setBanners(bannersRes.data.map((b: any, idx: number) => ({
          id: b.ma_banner ?? idx,
          title: b.tieu_de,
          subtitle: b.mo_ta || 'Thư giãn tinh thần, chăm sóc dáng ngọc',
          image: b.hinh_anh
        })));
      }
      if (catsRes.success && catsRes.data) setCats(catsRes.data);
      if (prodsRes.success && prodsRes.data) setFeaturedServices(prodsRes.data);
      if (newsRes.success && newsRes.data) setRecentNews(newsRes.data);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (banners.length > 0 ? (prev + 1) % banners.length : 0));
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextSlide = () => setCurrentSlide((prev) => (banners.length > 0 ? (prev + 1) % banners.length : 0));
  const prevSlide = () => setCurrentSlide((prev) => (banners.length > 0 ? (prev - 1 + banners.length) % banners.length : 0));

  return (
    <div className="w-full">
      {/* 1. HERO SLIDER */}
      <section className="relative h-screen min-h-[600px] w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-black/40 z-10" />
            <img 
              src={banners[currentSlide]?.image || "http://localhost:8000/uploads/2025/08/1.jpg"} 
              alt={banners[currentSlide]?.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <div className="text-accent font-sans tracking-[0.3em] uppercase text-sm mb-4">Nhà Spa Luxury</div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white mb-6 max-w-4xl leading-tight">
                  {banners[currentSlide]?.title}
                </h1>
                <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-light">
                  {banners[currentSlide]?.subtitle}
                </p>
                <button 
                  onClick={() => openBooking()}
                  className="inline-block bg-accent text-white px-8 py-4 rounded-sm hover:bg-white hover:text-primary transition-colors duration-300 uppercase tracking-wider text-sm font-medium"
                >
                  Đặt lịch ngay
                </button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Slider Controls */}
        <div className="absolute bottom-10 left-0 right-0 z-30 flex justify-center gap-3">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentSlide === index ? 'w-8 bg-accent' : 'bg-white/50 hover:bg-white'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        
        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-accent transition-colors backdrop-blur-sm hidden md:flex">
          <ChevronLeft size={24} />
        </button>
        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-accent transition-colors backdrop-blur-sm hidden md:flex">
          <ChevronRight size={24} />
        </button>
      </section>

      {/* 2. WELCOME SECTION */}
      <section className="py-20 md:py-32 px-4 bg-background relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6 text-primary">
              <Leaf size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-primary mb-4 leading-tight">
              CHÀO MỪNG BẠN ĐẾN NHÀ SPA<br />
              <span className="text-secondary italic">ĐIỂM CHẠM TINH HOA</span>
            </h2>
            <div className="text-accent font-medium tracking-widest uppercase text-sm mb-8">
              GỘI ĐẦU NGẢI CỨU SỐ 1 HÀ NỘI
            </div>
            <p className="text-text-muted max-w-3xl mx-auto leading-relaxed text-lg">
              Giữa nhịp sống hối hả của thủ đô, Nhà Spa ra đời như một chốn bình yên để bạn tìm về. 
              Chúng tôi tự hào mang đến không gian thư giãn mang đậm phong cách resort, kết hợp cùng 
              các liệu pháp chăm sóc sức khỏe và sắc đẹp chuyên sâu, giúp bạn tái tạo năng lượng và 
              đánh thức vẻ đẹp tự nhiên từ bên trong.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Leaf size={32} />, title: "Không gian thư giãn", desc: "Resort hiện đại, riêng tư, hòa mình thiên nhiên xanh mát." },
              { icon: <Sparkles size={32} />, title: "Dịch vụ đa dạng", desc: "Gội đầu dưỡng sinh, skincare chuyên sâu, massage trị liệu, nails..." },
              { icon: <Droplets size={32} />, title: "Kỹ thuật viên tận tâm", desc: "Đội ngũ chuyên môn cao, dày dặn kinh nghiệm, phục vụ chu đáo." }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center group">
                <div className="w-16 h-16 mx-auto bg-background rounded-full flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-serif text-text-dark mb-3">{feature.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SERVICES CATEGORY SECTION */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-primary mb-4">Nhóm dịch vụ khi bạn đến với Nhà Spa</h2>
            <div className="w-24 h-1 bg-accent mx-auto" />
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-16">
            {cats.map((cat, idx) => (
              <Link 
                key={cat.ma_danh_muc} 
                to={`/dich-vu/${cat.ma_danh_muc}`}
                className="group relative overflow-hidden rounded-xl aspect-square flex flex-col items-center justify-center bg-background hover:bg-primary transition-colors duration-500"
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay" />
                <div className="text-primary group-hover:text-accent transition-colors duration-500 mb-4 z-10">
                  <Sparkles size={48} strokeWidth={1} />
                </div>
                <h3 className="text-lg md:text-xl font-serif text-text-dark group-hover:text-white transition-colors duration-500 z-10">
                  {cat.ten_danh_muc}
                </h3>
              </Link>
            ))}
          </div>

          {/* Featured Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {featuredServices.map((service) => (
              <div key={service.ma_san_pham} className="bg-background rounded-xl overflow-hidden group border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors duration-300 z-10" />
                  <img 
                    src={service.hinh_anh || "http://localhost:8000/uploads/2025/08/1.jpg"} 
                    alt={service.ten_san_pham}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-primary rounded-full uppercase tracking-wider">
                    {service.ten_danh_muc || 'Dịch vụ'}
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
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/dich-vu" className="inline-flex items-center gap-2 text-primary font-medium hover:text-secondary transition-colors uppercase tracking-wider text-sm border-b-2 border-primary pb-1 hover:border-secondary">
              Xem tất cả dịch vụ <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. SPACE GALLERY */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif text-primary mb-4">KHÔNG GIAN NHÀ SPA</h2>
            <p className="text-text-muted max-w-2xl mx-auto">Nơi đánh thức mọi giác quan, mang lại sự thư thái tuyệt đối trong từng khoảnh khắc.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className={`relative overflow-hidden group rounded-lg ${
                  i === 0 || i === 3 ? 'md:col-span-2 md:row-span-2' : ''
                }`}
              >
                <img 
                  src={`http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-${i+1}.jpg`} 
                  alt={`Không gian Nhà Spa ${i+1}`}
                  className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-50 group-hover:scale-100">
                    <Search size={20} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. VIDEO SECTION */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/90 z-10" />
        <img 
          src="http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-10.jpg" 
          alt="Video background"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="container mx-auto px-4 relative z-20 text-center">
          <h2 className="text-3xl md:text-5xl font-serif text-white mb-12">TRẢI NGHIỆM TẠI NHÀ SPA</h2>
          
          <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl group cursor-pointer aspect-video bg-black">
            <img 
              src="http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-11.jpg" 
              alt="Video thumbnail"
              className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/30">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center text-primary pl-2">
                  <Play size={32} fill="currentColor" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BRAND PARTNERS */}
      <section className="py-16 bg-white border-b border-gray-100 overflow-hidden">
        <div className="container mx-auto px-4 mb-8 text-center">
          <h2 className="text-2xl font-serif text-text-dark">HỢP TÁC THƯƠNG HIỆU QUỐC TẾ</h2>
        </div>
        <div className="relative flex overflow-x-hidden">
          <div className="py-4 animate-marquee whitespace-nowrap flex items-center gap-16 px-8">
            {[...partners, ...partners].map((partner, idx) => (
              <span key={idx} className="text-2xl md:text-4xl font-serif text-gray-300 uppercase tracking-widest hover:text-accent transition-colors cursor-default">
                {partner}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 9. NEWS SECTION */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-primary mb-4">Tin tức, ưu đãi và sự kiện</h2>
            <div className="w-24 h-1 bg-accent mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {recentNews.map((item) => {
              const publishDate = item.ngay_dang || item.ngay_tao;
              const shortText = item.tom_tat || item.noi_dung?.replace(/<[^>]+>/g, '').substring(0, 100);
              return (
              <div key={item.ma_tin_tuc} className="group flex flex-col h-full border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="relative h-56 overflow-hidden">
                  <img 
                    src={item.hinh_anh || "http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-1.jpg"} 
                    alt={item.tieu_de}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-primary rounded-full uppercase tracking-wider">
                    {item.danh_muc || "Tin Tức"}
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-grow bg-white">
                  <div className="text-text-muted text-sm mb-3">{publishDate ? new Date(publishDate).toLocaleDateString('vi-VN') : '—'}</div>
                  <h3 className="font-serif text-xl text-text-dark mb-4 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {item.tieu_de}
                  </h3>
                  <p className="text-text-muted text-sm mb-6 line-clamp-2">
                    {shortText ? `${shortText}...` : 'Xem chi tiết...'}
                  </p>
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <Link to={`/tin-tuc/${item.slug}`} className="inline-flex items-center gap-2 text-secondary font-medium hover:text-primary transition-colors text-sm uppercase tracking-wider">
                      Đọc thêm <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          <div className="text-center">
            <Link 
              to="/tin-tuc" 
              className="inline-block border border-primary text-primary px-8 py-3 rounded-sm hover:bg-primary hover:text-white transition-colors duration-300 uppercase tracking-wider text-sm font-medium"
            >
              Xem tất cả bài viết
            </Link>
          </div>
        </div>
      </section>

      {/* Add custom animation for marquee */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}} />
    </div>
  );
}
