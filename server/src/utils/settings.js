const prisma = require('../db');

const DEFAULT_BOOKING_WINDOW_DAYS = 14;
const DEFAULT_DEPOSIT_PERCENT = 30;
const DEFAULT_CANCEL_HOURS = 24;

async function getKey(key) {
  try {
    const s = await prisma.setting.findUnique({ where: { key } });
    return s ? s.value : null;
  } catch {
    return null;
  }
}

// Quantos dias à frente a cliente pode agendar (a partir de hoje). Padrão: 14.
async function getBookingWindowDays() {
  const v = await getKey('bookingWindowDays');
  const n = v ? parseInt(v, 10) : DEFAULT_BOOKING_WINDOW_DAYS;
  return Number.isFinite(n) && n >= 1 && n <= 365 ? n : DEFAULT_BOOKING_WINDOW_DAYS;
}

// WhatsApp do studio (só dígitos, com DDI 55). Vazio se não configurado.
async function getWhatsapp() {
  return (await getKey('whatsapp')) || '';
}

// Política de sinal e cancelamento (exibida no agendamento).
// depositPercent 0 = sem sinal. depositPixKey vazio = não mostra chave.
async function getDepositSettings() {
  const percentRaw = await getKey('depositPercent');
  const hoursRaw = await getKey('cancelHours');
  const percent = percentRaw !== null ? parseInt(percentRaw, 10) : DEFAULT_DEPOSIT_PERCENT;
  const hours = hoursRaw !== null ? parseInt(hoursRaw, 10) : DEFAULT_CANCEL_HOURS;
  return {
    depositPercent: Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : DEFAULT_DEPOSIT_PERCENT,
    depositPixKey: (await getKey('depositPixKey')) || '',
    cancelHours: Number.isFinite(hours) && hours >= 0 && hours <= 168 ? hours : DEFAULT_CANCEL_HOURS,
  };
}

// Soma dias a uma data "YYYY-MM-DD" e devolve "YYYY-MM-DD" (math em UTC, estável quanto a DST)
function addDaysStr(ymd, days) {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = {
  getBookingWindowDays,
  getWhatsapp,
  getDepositSettings,
  addDaysStr,
  DEFAULT_BOOKING_WINDOW_DAYS,
};
