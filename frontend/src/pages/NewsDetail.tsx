import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, Share2 } from 'lucide-react';
import { publicApi } from '../api/public.api';

export default function NewsDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [article, setArticle] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [relatedNews, setRelatedNews] = React.useState<any[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    if (slug) {
      publicApi.getNewsBySlug(slug).then(res => {
        if (res.success && res.data) {
          setArticle(res.data);
          // Fetch related news
          publicApi.getNews({ category: res.data.danh_muc, page_size: 4 }).then(relatedRes => {
            if (relatedRes.success && relatedRes.data) {
              setRelatedNews(relatedRes.data.filter((item: any) => item.ma_tin_tuc !== res.data.ma_tin_tuc).slice(0, 3));
            }
          });
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full pt-32 pb-20 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center text-primary">Đang tải...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="w-full pt-32 pb-20 bg-background min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl font-serif text-primary mb-4">Không tìm thấy bài viết</h1>
        <p className="text-text-muted mb-8">Bài viết bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
        <button 
          onClick={() => navigate('/tin-tuc')}
          className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-secondary transition-colors"
        >
          Quay lại trang Tin tức
        </button>
      </div>
    );
  }

  const publishDate = article.ngay_dang || article.ngay_tao;

  return (
    <div className="w-full pt-24 pb-20 bg-background min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-text-muted mb-8">
          <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link to="/tin-tuc" className="hover:text-primary transition-colors">Tin tức</Link>
          <span>/</span>
          <span className="text-text-dark truncate">{article.tieu_de}</span>
        </div>

        {/* Article Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 text-sm text-text-muted mb-6">
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
              <Tag size={14} /> {article.danh_muc || 'Tin tức'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} /> {publishDate ? new Date(publishDate).toLocaleDateString('vi-VN') : '—'}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif text-primary leading-tight mb-6">
            {article.tieu_de}
          </h1>
          <p className="text-lg text-text-muted leading-relaxed font-medium">
            {article.tom_tat}
          </p>
        </div>

        {/* Featured Image */}
        <div className="rounded-2xl overflow-hidden mb-12 shadow-md">
          <img 
            src={article.hinh_anh || "http://localhost:8000/uploads/2025/08/1.jpg"} 
            alt={article.tieu_de}
            className="w-full h-auto max-h-[500px] object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none text-text-dark mb-16">
          <p className="whitespace-pre-line leading-relaxed" dangerouslySetInnerHTML={{__html: article.noi_dung}}>
          </p>
        </div>

        {/* Share and Back */}
        <div className="flex flex-col sm:flex-row items-center justify-between py-6 border-t border-b border-gray-200 mb-16 gap-4">
          <button 
            onClick={() => navigate('/tin-tuc')}
            className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors font-medium"
          >
            <ArrowLeft size={18} /> Quay lại danh sách
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted font-medium">Chia sẻ:</span>
            <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-muted hover:bg-primary hover:text-white transition-colors">
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Related News */}
        {relatedNews.length > 0 && (
          <div>
            <h3 className="text-2xl font-serif text-primary mb-8 text-center">Bài viết liên quan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedNews.map((item) => (
                <Link 
                  key={item.ma_tin_tuc} 
                  to={`/tin-tuc/${item.slug}`}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.hinh_anh || "http://localhost:8000/uploads/2025/08/1.jpg"} 
                      alt={item.tieu_de}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                      <Calendar size={12} /> {(item.ngay_dang || item.ngay_tao) ? new Date(item.ngay_dang || item.ngay_tao).toLocaleDateString('vi-VN') : '—'}
                    </div>
                    <h4 className="font-serif text-lg text-text-dark group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {item.tieu_de}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
