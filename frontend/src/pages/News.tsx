import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Calendar, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { publicApi } from '../api/public.api';

export default function News() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const categoryParam = queryParams.get('category');

  const [activeTab, setActiveTab] = useState(categoryParam || 'Tất cả');
  const [currentPage, setCurrentPage] = useState(1);
  const [news, setNews] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 6;
  
  const tabs = ['Tất cả', 'Blog', 'Ưu đãi', 'Sự kiện'];

  useEffect(() => {
    if (categoryParam && tabs.includes(categoryParam)) {
      setActiveTab(categoryParam);
      setCurrentPage(1);
    }
  }, [categoryParam]);

  useEffect(() => {
    publicApi.getNews({ 
      page: currentPage, 
      page_size: itemsPerPage, 
      category: activeTab !== 'Tất cả' ? activeTab : undefined 
    }).then(res => {
      if (res.success && res.data) {
        setNews(res.data);
        if (res.meta?.total_pages) {
          setTotalPages(res.meta.total_pages);
        } else if (res.meta?.total) {
          setTotalPages(Math.ceil(res.meta.total / itemsPerPage));
        } else {
          setTotalPages(1);
        }
      }
    });
  }, [activeTab, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  const featuredNews = activeTab === 'Tất cả' && currentPage === 1 && news.length > 0 ? news[0] : null;
  const featuredPublishDate = featuredNews ? (featuredNews.ngay_dang || featuredNews.ngay_tao) : null;

  return (
    <div className="w-full pt-24 pb-20 bg-background min-h-screen">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-primary mb-6">TIN TỨC & SỰ KIỆN</h1>
          <div className="w-24 h-1 bg-accent mx-auto mb-8" />
          <p className="text-text-muted max-w-2xl mx-auto text-lg leading-relaxed">
            Cập nhật những thông tin mới nhất về các chương trình ưu đãi, sự kiện nổi bật 
            và kiến thức chăm sóc sức khỏe, sắc đẹp từ chuyên gia Nhà Spa.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-text-muted hover:bg-primary/10 hover:text-primary border border-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Featured Post (if 'Tất cả' is selected and on first page) */}
        {featuredNews && (
          <div className="mb-16">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group flex flex-col md:flex-row hover:shadow-xl transition-all duration-500">
              <div className="md:w-3/5 relative h-64 md:h-auto overflow-hidden">
                <img 
                  src={featuredNews.hinh_anh || "http://localhost:8000/uploads/2025/08/1.jpg"} 
                  alt={featuredNews.tieu_de}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-accent text-white px-4 py-1 text-xs font-bold rounded-full uppercase tracking-wider shadow-md">
                  Bài viết nổi bật
                </div>
              </div>
              <div className="md:w-2/5 p-8 md:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-4 text-sm text-text-muted mb-4">
                  <span className="flex items-center gap-1"><Tag size={14} /> {featuredNews.danh_muc || 'Tin tức'}</span>
                  <span className="flex items-center gap-1"><Calendar size={14} /> {featuredPublishDate ? new Date(featuredPublishDate).toLocaleDateString('vi-VN') : '—'}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif text-primary mb-4 group-hover:text-secondary transition-colors leading-snug">
                  {featuredNews.tieu_de}
                </h2>
                <p className="text-text-muted mb-8 line-clamp-3 leading-relaxed">
                  {featuredNews.tom_tat}
                </p>
                <Link to={`/tin-tuc/${featuredNews.slug}`} className="inline-flex items-center gap-2 text-accent font-medium uppercase tracking-wider text-sm hover:text-primary transition-colors mt-auto">
                  Đọc tiếp <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {news.map((item, idx) => {
            // Skip the first item if 'Tất cả' is selected and on first page (already shown as featured)
            if (activeTab === 'Tất cả' && currentPage === 1 && idx === 0) {
              return null;
            }
            const publishDate = item.ngay_dang || item.ngay_tao;
            return (
              <div key={item.ma_tin_tuc} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                <div className="relative h-56 overflow-hidden">
                  <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors duration-300 z-10" />
                  <img 
                    src={item.hinh_anh || "http://localhost:8000/uploads/2025/08/1.jpg"} 
                    alt={item.tieu_de}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-primary rounded-full uppercase tracking-wider shadow-sm">
                    {item.danh_muc || 'Tin tức'}
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
                    <Calendar size={12} /> {publishDate ? new Date(publishDate).toLocaleDateString('vi-VN') : '—'}
                  </div>
                  <h3 className="font-serif text-xl text-text-dark mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {item.tieu_de}
                  </h3>
                  <p className="text-text-muted text-sm mb-6 line-clamp-2">
                    {item.tom_tat}
                  </p>
                  <div className="mt-auto pt-4 border-t border-gray-50">
                    <Link to={`/tin-tuc/${item.slug}`} className="inline-flex items-center gap-2 text-secondary font-medium hover:text-primary transition-colors text-sm uppercase tracking-wider">
                      Đọc thêm <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-10 h-10 rounded-full bg-white text-text-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center font-medium transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            
            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1;
              return (
                <button 
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors shadow-sm ${
                    currentPage === page 
                      ? 'bg-primary text-white' 
                      : 'bg-white text-text-muted hover:bg-primary/10 hover:text-primary border border-gray-200'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-10 h-10 rounded-full bg-white text-text-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center font-medium transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {news.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-text-muted text-lg">Chưa có bài viết nào trong danh mục này.</p>
          </div>
        )}
      </div>
    </div>
  );
}
