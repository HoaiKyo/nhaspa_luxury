import React from 'react';
import { MapPin, Phone, Clock, Navigation, Calendar } from 'lucide-react';
import { locations } from '../data/mockData';
import { useBooking } from '../contexts/BookingContext';

export default function Locations() {
  const { openBooking } = useBooking();

  return (
    <div className="w-full pt-24 pb-20 bg-background min-h-screen">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-primary mb-6">HỆ THỐNG CƠ SỞ</h1>
          <div className="w-24 h-1 bg-accent mx-auto mb-8" />
          <p className="text-text-muted max-w-2xl mx-auto text-lg leading-relaxed">
            Nhà Spa hiện có mặt tại các vị trí trung tâm, thuận tiện di chuyển với không gian 
            được thiết kế tỉ mỉ, mang đậm phong cách resort nghỉ dưỡng giữa lòng thành phố.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {locations.map((location, idx) => (
            <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl transition-all duration-500 flex flex-col h-full">
              <div className="relative h-64 md:h-80 overflow-hidden">
                <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors duration-500 z-10" />
                <img 
                  src={`http://localhost:8000/uploads/2024/08/khong-gian-nha-spa-${idx + 1}.jpg`} 
                  alt={location.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm px-4 py-2 text-sm font-medium text-primary rounded-full shadow-md flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Đang mở cửa
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-grow">
                <h2 className="text-2xl font-serif text-primary mb-6 group-hover:text-secondary transition-colors">{location.name}</h2>
                
                <div className="space-y-4 mb-8 text-text-muted">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-accent font-medium mb-1">Địa chỉ</div>
                      <p className="leading-relaxed">{location.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                      <Phone size={20} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-accent font-medium mb-1">Hotline</div>
                      <a href={`tel:${location.phone.replace(/\s/g, '')}`} className="font-medium text-text-dark hover:text-primary transition-colors">
                        {location.phone}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                      <Clock size={20} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-accent font-medium mb-1">Giờ hoạt động</div>
                      <p>{location.hours} (Tất cả các ngày trong tuần)</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-4">

                  <button 
                    onClick={() => openBooking()}
                    className="flex-1 bg-white border border-primary text-primary py-3 rounded-md hover:bg-primary/5 transition-colors text-sm font-medium uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Calendar size={16} /> Đặt lịch
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>


      </div>
    </div>
  );
}
