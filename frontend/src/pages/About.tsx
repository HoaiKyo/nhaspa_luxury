import React from 'react';
import { Leaf, Heart, Star, Users, Award, Clock } from 'lucide-react';

export default function About() {
  return (
    <div className="w-full bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img 
          src="http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-1.jpg" 
          alt="Về Nhà Spa"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
          <div className="text-accent font-sans tracking-[0.3em] uppercase text-sm mb-4">Câu chuyện thương hiệu</div>
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-6">VỀ NHÀ SPA</h1>
          <div className="w-24 h-1 bg-accent mx-auto" />
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="md:w-1/2 relative">
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-spa-gradient-light rounded-full -z-10" />
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-accent/10 rounded-full -z-10" />
              <img 
                src="http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-2.jpg" 
                alt="Câu chuyện Nhà Spa"
                className="w-full rounded-2xl shadow-xl object-cover aspect-[4/5]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-8 -right-8 bg-white p-6 rounded-xl shadow-lg max-w-xs hidden md:block">
                <div className="text-4xl font-serif text-primary mb-2">10+</div>
                <div className="text-sm text-text-muted uppercase tracking-wider font-medium">Năm kinh nghiệm trong ngành làm đẹp & chăm sóc sức khỏe</div>
              </div>
            </div>
            
            <div className="md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-serif text-primary mb-6 leading-tight">
                Hành trình kiến tạo không gian thư giãn đích thực
              </h2>
              <div className="space-y-6 text-text-muted leading-relaxed">
                <p>
                  Khởi nguồn từ mong muốn mang đến một chốn bình yên giữa nhịp sống hối hả, 
                  Nhà Spa được thành lập với triết lý "Trị liệu từ tâm - Chăm sóc từ gốc". 
                  Chúng tôi tin rằng, vẻ đẹp thực sự phải bắt nguồn từ một cơ thể khỏe mạnh 
                  và một tinh thần thư thái.
                </p>
                <p>
                  Trải qua nhiều năm phát triển, Nhà Spa không ngừng nỗ lực hoàn thiện 
                  chất lượng dịch vụ, từ việc tuyển chọn khắt khe các sản phẩm thiên nhiên 
                  đến việc đào tạo đội ngũ kỹ thuật viên chuyên nghiệp, tận tâm.
                </p>
                <p className="font-medium text-primary italic border-l-4 border-accent pl-4 py-2">
                  "Mỗi khách hàng đến với Nhà Spa không chỉ là để làm đẹp, mà còn là 
                  để trở về 'nhà' - nơi được yêu thương, chăm sóc và thấu hiểu."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-24 bg-spa-gradient-light">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-primary mb-4">Tầm nhìn & Sứ mệnh</h2>
            <div className="w-24 h-1 bg-accent mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Star size={32} />, title: "Tầm nhìn", desc: "Trở thành chuỗi spa trị liệu và chăm sóc sức khỏe hàng đầu Việt Nam, mang tiêu chuẩn resort 5 sao đến gần hơn với mọi khách hàng." },
              { icon: <Heart size={32} />, title: "Sứ mệnh", desc: "Đánh thức vẻ đẹp tự nhiên và tái tạo năng lượng sống thông qua các liệu pháp chăm sóc an toàn, hiệu quả từ thiên nhiên." },
              { icon: <Leaf size={32} />, title: "Giá trị cốt lõi", desc: "Tận tâm - Chuyên nghiệp - Hiệu quả. Chúng tôi đặt trải nghiệm và sức khỏe của khách hàng lên hàng đầu trong mọi hoạt động." }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-10 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center group">
                <div className="w-20 h-20 mx-auto bg-background rounded-full flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-serif text-text-dark mb-4">{item.title}</h3>
                <p className="text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-primary mb-4">Dấu ấn phát triển</h2>
            <p className="text-text-muted">Những cột mốc quan trọng trên hành trình của Nhà Spa</p>
          </div>

          <div className="relative border-l-2 border-primary/20 ml-4 md:ml-1/2">
            {[
              { year: "2018", title: "Thành lập cơ sở đầu tiên", desc: "Khai trương Nhà Spa tại Hàng Mã, Hoàn Kiếm, đánh dấu bước đi đầu tiên." },
              { year: "2020", title: "Nâng cấp dịch vụ", desc: "Hợp tác với các thương hiệu mỹ phẩm quốc tế, đưa công nghệ cao vào trị liệu." },
              { year: "2022", title: "Khẳng định vị thế", desc: "Đạt giải thưởng 'Spa được yêu thích nhất' do tạp chí làm đẹp bình chọn." },
              { year: "2024", title: "Phát triển bền vững", desc: "Tiếp tục mang đến những trải nghiệm tuyệt vời nhất cho khách hàng." }
            ].map((item, idx) => (
              <div key={idx} className="mb-12 relative pl-8 md:pl-0 md:w-1/2 md:even:ml-auto md:even:pl-12 md:odd:pr-12 md:odd:text-right group">
                <div className="absolute left-[-9px] md:left-auto md:right-[-9px] md:even:left-[-9px] top-0 w-4 h-4 rounded-full bg-accent border-4 border-white shadow-sm group-hover:scale-150 transition-transform duration-300" />
                <div className="text-3xl font-serif text-primary/30 font-bold mb-2 group-hover:text-primary transition-colors">{item.year}</div>
                <h4 className="text-xl font-medium text-text-dark mb-2">{item.title}</h4>
                <p className="text-text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}
