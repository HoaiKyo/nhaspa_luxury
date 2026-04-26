export const BOOKING_OPEN_HOUR = 8;
export const BOOKING_CLOSE_HOUR = 22;
export const BOOKING_SLOT_MINUTES = 30;
export const BOOKING_MAX_DAYS = 7;

export const BOOKING_OPEN_MINUTES = BOOKING_OPEN_HOUR * 60;
export const BOOKING_CLOSE_MINUTES = BOOKING_CLOSE_HOUR * 60;

const toIsoDate = (value: Date): string => {
  const y = value.getFullYear();
  const m = `${value.getMonth() + 1}`.padStart(2, '0');
  const d = `${value.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDate = (dateISO: string): Date | null => {
  if (!dateISO) return null;
  const date = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const parseMinutes = (timeValue: string): number | null => {
  const normalized = String(timeValue || '').slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(normalized)) return null;
  const [hour, minute] = normalized.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
};

const minutesToTime = (minutes: number): string => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const getBookingDateBounds = (now: Date = new Date()) => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const maxDate = addDays(today, BOOKING_MAX_DAYS);
  return {
    minDate: toIsoDate(today),
    maxDate: toIsoDate(maxDate),
  };
};

export const isDateWithinBookingWindow = (dateISO: string, now: Date = new Date()): boolean => {
  const targetDate = parseDate(dateISO);
  if (!targetDate) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const maxDate = addDays(today, BOOKING_MAX_DAYS);

  return targetDate >= today && targetDate <= maxDate;
};

const minStartMinutesByDate = (dateISO: string, now: Date = new Date()): number => {
  if (!isDateWithinBookingWindow(dateISO, now)) return BOOKING_CLOSE_MINUTES + BOOKING_SLOT_MINUTES;

  const { minDate } = getBookingDateBounds(now);
  if (dateISO !== minDate) return BOOKING_OPEN_MINUTES;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const roundedUpSlot = Math.ceil(currentMinutes / BOOKING_SLOT_MINUTES) * BOOKING_SLOT_MINUTES;
  return Math.max(BOOKING_OPEN_MINUTES, roundedUpSlot);
};

export const generateBookingSlots = (dateISO: string, now: Date = new Date()): string[] => {
  if (!isDateWithinBookingWindow(dateISO, now)) return [];

  const start = minStartMinutesByDate(dateISO, now);
  const lastStart = BOOKING_CLOSE_MINUTES - BOOKING_SLOT_MINUTES;
  if (start > lastStart) return [];

  const slots: string[] = [];
  for (let minutes = start; minutes <= lastStart; minutes += BOOKING_SLOT_MINUTES) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
};

export const isValidBookingSlot = (dateISO: string, timeValue: string, now: Date = new Date()): boolean => {
  if (!isDateWithinBookingWindow(dateISO, now)) return false;
  const minutes = parseMinutes(timeValue);
  if (minutes === null) return false;
  if (minutes < BOOKING_OPEN_MINUTES || minutes >= BOOKING_CLOSE_MINUTES) return false;
  if (minutes % BOOKING_SLOT_MINUTES !== 0) return false;
  return generateBookingSlots(dateISO, now).includes(minutesToTime(minutes));
};
