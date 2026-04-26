export interface PricingOption {
  duration: string;
  price: string;
  originalPrice?: string;
}

export interface Service {
  id: number;
  category: string;
  name: string;
  slug: string;
  image: string;
  pricing: PricingOption[];
  price?: string; // Keep for backward compatibility temporarily
  originalPrice?: string; // Keep for backward compatibility temporarily
}

export const services: Service[] = [
  { 
    id: 1, 
    category: "massage", 
    name: "Massage Body", 
    slug: "massage-body", 
    image: "http://localhost:8000/uploads/2025/08/2.jpg",
    pricing: [
      { duration: "60 phút", price: "400.000₫" },
      { duration: "90 phút", price: "550.000₫" }
    ]
  },
  { 
    id: 2, 
    category: "skincare", 
    name: "Sạch sâu cấp ẩm", 
    slug: "sach-sau-cap-am", 
    image: "http://localhost:8000/uploads/2025/08/3.jpg",
    pricing: [
      { duration: "60 phút", price: "800.000₫" }
    ]
  },
  { 
    id: 3, 
    category: "hair", 
    name: "Gội đầu dưỡng sinh Ngải Cứu", 
    slug: "goi-dau-duong-sinh", 
    image: "http://localhost:8000/uploads/2025/08/1.jpg",
    pricing: [
      { duration: "60 phút", price: "450.000₫" }
    ]
  },
  { 
    id: 4, 
    category: "combo", 
    name: "COMBO 3 – Chăm Sóc Da Chuyên Sâu", 
    slug: "combo-3", 
    image: "http://localhost:8000/uploads/2025/08/4.jpg",
    pricing: [
      { duration: "90 phút", price: "950.000₫", originalPrice: "1.000.000₫" }
    ]
  },
  { 
    id: 5, 
    category: "massage", 
    name: "Massage cổ vai gáy", 
    slug: "massage-co-vai-gay", 
    image: "http://localhost:8000/uploads/2025/08/2-1.jpg",
    pricing: [
      { duration: "60 phút", price: "200.000₫" },
      { duration: "90 phút", price: "400.000₫" }
    ]
  },
];

export const locations = [
  { name: "Nhà Spa – 75 Hàng Mã", address: "75 Hàng Mã, Hoàn Kiếm, Hà Nội", phone: "0354 060 675", hours: "8:00 – 22:00" },
];

export interface NewsItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  date: string;
  image: string;
  excerpt: string;
  content: string;
}

export const news: NewsItem[] = [
  { 
    id: 1,
    title: "Thềm Nhà có Hoa – Nhà Spa tri ân phụ nữ nhân dịp 8/3", 
    slug: "them-nha-co-hoa-nha-spa-tri-an-phu-nu-nhan-dip-8-3",
    category: "Sự kiện", 
    date: "2025-03-08",
    image: "http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-4.jpg",
    excerpt: "Nhân dịp Quốc tế Phụ nữ 8/3, Nhà Spa gửi lời tri ân sâu sắc đến một nửa thế giới với chương trình ưu đãi đặc biệt 'Thềm Nhà có Hoa'. Giảm ngay 30% cho tất cả các gói dịch vụ chăm sóc da và massage body...",
    content: "Nội dung chi tiết bài viết Thềm Nhà có Hoa..."
  },
  { 
    id: 2,
    title: "NÉT CHỮ NÉT NHÀ – XIN CHỮ CẦU MAY, THỔI HỒN TẾT XƯA", 
    slug: "net-chu-net-nha-xin-chu-cau-may-thoi-hon-tet-xua",
    category: "Sự kiện", 
    date: "2025-01-20",
    image: "http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-1.jpg",
    excerpt: "Chương trình xin chữ đầu năm tại Nhà Spa mang đến không khí Tết cổ truyền ấm áp...",
    content: "Nội dung chi tiết bài viết NÉT CHỮ NÉT NHÀ..."
  },
  { 
    id: 3,
    title: "10 Địa chỉ spa cho chó mèo uy tín tại Hà Nội", 
    slug: "10-dia-chi-spa-cho-cho-meo-uy-tin-tai-ha-noi",
    category: "Blog", 
    date: "2025-02-10",
    image: "http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-2.jpg",
    excerpt: "Tổng hợp các địa chỉ chăm sóc thú cưng uy tín nhất tại Hà Nội...",
    content: "Nội dung chi tiết bài viết 10 Địa chỉ spa cho chó mèo..."
  },
  { 
    id: 4,
    title: "Bí quyết chăm sóc da mùa hanh khô", 
    slug: "bi-quyet-cham-soc-da-mua-hanh-kho",
    category: "Blog", 
    date: "2025-01-15",
    image: "http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-3.jpg",
    excerpt: "Những lưu ý quan trọng để giữ làn da luôn căng mọng trong thời tiết hanh khô...",
    content: "Nội dung chi tiết bài viết Bí quyết chăm sóc da..."
  },
  { 
    id: 5,
    title: "Ưu đãi thành viên mới - Giảm 50% lần đầu", 
    slug: "uu-dai-thanh-vien-moi-giam-50-lan-dau",
    category: "Ưu đãi", 
    date: "2025-03-01",
    image: "http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-4.jpg",
    excerpt: "Cơ hội trải nghiệm dịch vụ đẳng cấp tại Nhà Spa với mức giá cực kỳ ưu đãi cho khách hàng mới...",
    content: "Nội dung chi tiết bài viết Ưu đãi thành viên mới..."
  },
  { 
    id: 6,
    title: "Lợi ích của massage cổ vai gáy", 
    slug: "loi-ich-cua-massage-co-vai-gay",
    category: "Blog", 
    date: "2025-02-25",
    image: "http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-1.jpg",
    excerpt: "Tìm hiểu tại sao dân văn phòng nên massage cổ vai gáy thường xuyên...",
    content: "Nội dung chi tiết bài viết Lợi ích của massage cổ vai gáy..."
  },
  { 
    id: 7,
    title: "Gội đầu dưỡng sinh - Xu hướng thư giãn mới", 
    slug: "goi-dau-duong-sinh-xu-huong-thu-gian-moi",
    category: "Blog", 
    date: "2025-03-10",
    image: "http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-2.jpg",
    excerpt: "Gội đầu dưỡng sinh không chỉ làm sạch tóc mà còn giúp đả thông kinh lạc...",
    content: "Nội dung chi tiết bài viết Gội đầu dưỡng sinh..."
  },
  { 
    id: 8,
    title: "Mừng sinh nhật Nhà Spa - Bốc thăm trúng thưởng", 
    slug: "mung-sinh-nhat-nha-spa-boc-tham-trung-thuong",
    category: "Sự kiện", 
    date: "2025-04-01",
    image: "http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-3.jpg",
    excerpt: "Tham gia ngay chương trình bốc thăm trúng thưởng với tổng giá trị lên đến 100 triệu đồng...",
    content: "Nội dung chi tiết bài viết Mừng sinh nhật Nhà Spa..."
  }
];

export const categories = [
  { id: "massage", name: "Massage", slug: "massage", icon: "Hands" },
  { id: "combo", name: "Combo", slug: "combo", icon: "Sparkles" },
  { id: "hair", name: "Chăm sóc tóc", slug: "cham-soc-toc", icon: "Scissors" },
  { id: "skincare", name: "Chăm sóc da", slug: "cham-soc-da", icon: "Droplets" },
];
