import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  appointmentsApi,
  staffApi,
  usersApi,
} from '../../api/admin.api';

const ACCENT = 'var(--admin-accent)';
const MUTED_TEXT = 'var(--admin-text-muted)';
const MAIN_TEXT = 'var(--admin-text)';
const HEADING_TEXT = 'var(--admin-text-heading)';

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--admin-card)',
  border: '1px solid var(--admin-border)',
  boxShadow: '0 8px 22px var(--admin-stat-shadow)',
};

type StaffPerformance = {
  id: number | string;
  name: string;
  role: string;
  sessions: number;
  rating: number;
};

type StaffPerformanceFilter = 'DAY' | 'WEEK' | 'MONTH';

const toNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfWeekMonday = (date: Date): Date => {
  const d = startOfDay(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};

const isBetween = (date: Date | null, start: Date, end: Date): boolean => {
  if (!date) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
};

const formatNumber = (value: number): string => new Intl.NumberFormat('vi-VN').format(value);

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const fetchAllPages = async (
  fetcher: (page: number, pageSize: number) => Promise<any>,
  pageSize = 100,
): Promise<any[]> => {
  const rows: any[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await fetcher(page, pageSize);
    if (!res?.success || !Array.isArray(res.data)) {
      break;
    }
    rows.push(...res.data);
    totalPages = res.meta?.total_pages || 1;
    page += 1;
  } while (page <= totalPages);

  return rows;
};

export default function StaffPerformance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staffPerformanceByPeriod, setStaffPerformanceByPeriod] = useState<Record<StaffPerformanceFilter, StaffPerformance[]>>({
    DAY: [],
    WEEK: [],
    MONTH: [],
  });
  const [staffPeriodFilter, setStaffPeriodFilter] = useState<StaffPerformanceFilter>('MONTH');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [staffPeriodFilter]);

  const staffPerformanceRows = staffPerformanceByPeriod[staffPeriodFilter] || [];

  const totalPages = Math.max(1, Math.ceil(staffPerformanceRows.length / pageSize));

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return staffPerformanceRows.slice(start, start + pageSize);
  }, [staffPerformanceRows, currentPage]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [appointments, users, staffMembers] =
          await Promise.all([
            fetchAllPages((page, pageSize) => appointmentsApi.list(page, pageSize), 120),
            fetchAllPages((page, pageSize) => usersApi.list(page, pageSize), 120),
            fetchAllPages((page, pageSize) => staffApi.list(page, pageSize), 120),
          ]);

        if (!mounted) return;

        const usersById = new Map<string, any>();
        users.forEach((u) => {
          const id = u?.ma_nguoi_dung;
          if (id !== undefined && id !== null) {
            usersById.set(String(id), u);
          }
        });

        const staffMap = new Map<string, any>();
        staffMembers.forEach((staff) => {
          const staffId = staff?.ma_nhan_vien;
          if (staffId !== undefined && staffId !== null) {
            staffMap.set(String(staffId), staff);
          }
        });

        const isCodeLikeName = (value: string): boolean => {
          const normalized = value.trim().toLowerCase();
          return /^(nhân viên|nhan vien|staff)\s*#?\s*\d+$/.test(normalized);
        };

        const resolveStaffName = (staffId?: number | null, fallbackName?: string): string => {
          const directName = String(fallbackName || '').trim();
          if (directName && !isCodeLikeName(directName)) return directName;

          if (!staffId) return 'Nhân viên chưa cập nhật';

          const normalizedStaffId = String(staffId);
          const staff = staffMap.get(normalizedStaffId);

          const nameFromStaff = String(staff?.ho_ten || staff?.ten_nhan_vien || staff?.nguoi_dung?.ho_ten || '').trim();
          if (nameFromStaff) return nameFromStaff;

          const nameFromLinkedUser = String(
            staff?.ma_nguoi_dung ? usersById.get(String(staff.ma_nguoi_dung))?.ho_ten || '' : '',
          ).trim();
          if (nameFromLinkedUser) return nameFromLinkedUser;

          const nameFromDirectUserId = String(usersById.get(normalizedStaffId)?.ho_ten || '').trim();
          if (nameFromDirectUserId) return nameFromDirectUserId;

          return 'Nhân viên chưa cập nhật';
        };

        const normalizeAppointmentStatus = (status: any): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' => {
          const key = String(status || '').toUpperCase();
          if (['IN_PROGRESS', 'PROCESSING', 'CONFIRMED'].includes(key)) return 'IN_PROGRESS';
          if (['COMPLETED', 'DONE', 'FINISHED', 'PAID'].includes(key)) return 'COMPLETED';
          if (['CANCELLED', 'CANCELED', 'NO_SHOW', 'REJECTED'].includes(key)) return 'CANCELLED';
          return 'PENDING';
        };

        const collectStaffPerformance = (from: Date, to: Date): StaffPerformance[] => {
          const stats = new Map<
            number,
            { id: number; name: string; role: string; sessions: number; completed: number; ratings: number[] }
          >();

          // Pre-populate stats map with ALL non-admin staff members
          (staffMembers || []).forEach((staff: any) => {
            const staffId = staff?.ma_nhan_vien;
            if (staffId !== undefined && staffId !== null) {
              const role = staff.chuc_vu || 'Kỹ thuật viên';
              const isMainAdmin =
                staff?.vai_tro === 'ADMIN' ||
                staff?.nguoi_dung?.vai_tro === 'ADMIN' ||
                ['ADMIN', 'ADMINISTRATOR', 'QUẢN TRỊ VIÊN', 'QUAN TRI VIEN'].includes(String(role).toUpperCase().trim());

              if (isMainAdmin) return;

              stats.set(Number(staffId), {
                id: Number(staffId),
                name: resolveStaffName(Number(staffId), staff.ho_ten || staff.ten_nhan_vien),
                role: role,
                sessions: 0,
                completed: 0,
                ratings: [],
              });
            }
          });

          // Accumulate appointments data
          appointments
            .filter((appt) => isBetween(toDateSafe(appt.ngay_hen), from, to))
            .filter((appt) => normalizeAppointmentStatus(appt.trang_thai) !== 'CANCELLED')
            .forEach((appt) => {
              if (!Array.isArray(appt.chi_tiets)) return;
              const normalizedStatus = normalizeAppointmentStatus(appt.trang_thai);

              appt.chi_tiets.forEach((detail: any) => {
                if (!detail.ma_nhan_vien) return;
                const staffId = Number(detail.ma_nhan_vien);

                const current = stats.get(staffId);
                if (!current) return;

                current.sessions += 1;
                if (normalizedStatus === 'COMPLETED') current.completed += 1;

                const detailRating = toNumber(detail.diem_danh_gia);
                if (detailRating > 0) current.ratings.push(detailRating);

                stats.set(staffId, current);
              });
            });

          const rows: StaffPerformance[] = [...stats.values()]
            .map((staff) => {
              const ratingFromReview = staff.ratings.length > 0 ? average(staff.ratings) : 0;
              const ratingFromCompletion = staff.sessions > 0 ? (staff.completed / staff.sessions) * 5 : 0;
              const rating = ratingFromReview > 0 ? ratingFromReview : ratingFromCompletion;

              return {
                id: staff.id,
                name: staff.name,
                role: staff.role,
                sessions: staff.sessions,
                rating: Number(rating.toFixed(1)),
              };
            })
            .sort((a, b) => b.sessions - a.sessions);

          return rows;
        };

        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const weekStart = startOfWeekMonday(now);
        const weekEnd = endOfDay(addDays(weekStart, 6));
        const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

        setStaffPerformanceByPeriod({
          DAY: collectStaffPerformance(todayStart, todayEnd),
          WEEK: collectStaffPerformance(weekStart, weekEnd),
          MONTH: collectStaffPerformance(monthStart, monthEnd),
        });
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError('Không thể tải dữ liệu hiệu suất nhân viên.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div
          className="w-10 h-10 rounded-full border-4 border-t-transparent"
          style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }


  return (
    <div className="admin-animate-in w-full" style={{ color: MAIN_TEXT, fontFamily: 'inherit', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="rounded-xl p-5 md:p-6 flex flex-col flex-1 min-h-0" style={PANEL_STYLE}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 flex-shrink-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: HEADING_TEXT }}>
            Hiệu suất nhân viên
          </h1>
          <div className="inline-flex items-center gap-1.5">
            {([
              { key: 'DAY', label: 'Ngày' },
              { key: 'WEEK', label: 'Tuần' },
              { key: 'MONTH', label: 'Tháng' },
            ] as Array<{ key: StaffPerformanceFilter; label: string }>).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setStaffPeriodFilter(option.key)}
                className="px-4 py-1.5 rounded-md border text-sm font-medium transition-all"
                style={
                  staffPeriodFilter === option.key
                    ? {
                        background: 'var(--admin-sidebar-link-active-bg, rgba(16, 185, 129, 0.1))',
                        borderColor: 'rgba(16, 185, 129, 0.35)',
                        color: ACCENT,
                      }
                    : {
                        background: 'transparent',
                        borderColor: 'var(--admin-border)',
                        color: MUTED_TEXT,
                      }
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg w-fit mb-4 flex-shrink-0"
            style={{
              background: 'rgba(248, 113, 113, 0.12)',
              border: '1px solid rgba(248, 113, 113, 0.32)',
              color: '#fca5a5',
            }}
          >
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto admin-scrollbar pr-2 flex flex-col gap-3 min-h-0 pb-2">
          {pagedRows.length === 0 ? (
            <div className="py-20 text-center text-sm" style={{ color: MUTED_TEXT }}>
              Không có dữ liệu hiệu suất trong khoảng thời gian này.
            </div>
          ) : (
            pagedRows.map((staff, idx) => (
              <div
                key={staff.id}
                className="flex items-center justify-between p-4 rounded-xl transition-colors hover:brightness-110 flex-shrink-0"
                style={{ 
                  background: 'var(--admin-table-row-hover)', 
                  border: '1px solid var(--admin-border)',
                  animation: `fadeInUp 0.3s ease-out forwards ${Math.min(idx * 0.05, 0.5)}s`,
                  opacity: 0,
                  transform: 'translateY(10px)'
                }}
              >
                <div className="flex flex-col">
                  <p className="text-[15px] font-semibold" style={{ color: HEADING_TEXT }}>
                    {staff.name}
                  </p>
                  <p className="text-[13px] mt-0.5" style={{ color: MUTED_TEXT }}>
                    {staff.role}
                  </p>
                </div>
                <div className="text-[15px] font-semibold" style={{ color: HEADING_TEXT }}>
                  {formatNumber(staff.sessions)} lượt
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="admin-pagination mt-4 flex-shrink-0">
            <span>Trang {currentPage} / {totalPages} ({staffPerformanceRows.length} nhân viên)</span>
            <div className="admin-pagination-btns">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let startPage = Math.max(1, currentPage - 2);
                if (startPage + 4 > totalPages) startPage = Math.max(1, totalPages - 4);
                const p = startPage + i;
                return (
                  <button key={`perf-page-${p}`} onClick={() => setCurrentPage(p)} className={currentPage === p ? 'active' : ''}>{p}</button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
