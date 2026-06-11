const prisma = require('../db');
const { audit } = require('../utils/audit');
const { timeToMinutes, getDaySchedule, overlaps } = require('../utils/schedule');
const { getBookingWindowDays, addDaysStr } = require('../utils/settings');

const TZ = 'America/Sao_Paulo';

// Intervalo entre os horários oferecidos à cliente. Serviços de unha são longos,
// então oferecer de 30 em 30 minutos aproveita melhor a agenda.
const SLOT_INTERVAL = 30;

function generateSlots(openMin, closeMin, interval = SLOT_INTERVAL) {
  const slots = [];
  for (let current = openMin; current < closeMin; current += interval) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots;
}

exports.getAvailableSlots = async (req, res) => {
  const { date, duration } = req.query;
  if (!date) return res.status(400).json({ error: 'Data é obrigatória' });

  // Fora da janela de agendamento (passado ou além de hoje + N dias) → sem horários
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const windowDays = await getBookingWindowDays();
  if (date < today || date > addDaysStr(today, windowDays)) {
    return res.json({ date, available: [], outOfWindow: true });
  }

  const requestedDuration = Math.max(parseInt(duration) || 30, 30);

  try {
    const day = await getDaySchedule(prisma, date);
    if (!day.isOpen) return res.json({ date, available: [], closed: true });
    if (day.fullDayBlocked) {
      return res.json({ date, available: [], blocked: true, reason: day.blockReason });
    }

    // Um slot está disponível se [slotStart, slotStart + duration) não sobrepõe nenhum
    // intervalo ocupado e não ultrapassa o horário de fechamento
    const available = generateSlots(day.openMin, day.closeMin).filter((slot) => {
      const slotStart = timeToMinutes(slot);
      const slotEnd = slotStart + requestedDuration;
      if (slotEnd > day.closeMin) return false;
      return !day.busy.some((b) => overlaps(slotStart, slotEnd, b.start, b.end));
    });

    res.json({ date, available });
  } catch (e) {
    console.error('[getAvailableSlots]', e);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
};

exports.getRecurringBlocks = async (req, res) => {
  try {
    const blocks = await prisma.recurringBlock.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }] });
    res.json(blocks);
  } catch (e) {
    console.error('[getRecurringBlocks]', e);
    res.status(500).json({ error: 'Erro ao buscar horários fixos' });
  }
};

exports.createRecurringBlock = async (req, res) => {
  const { clientName, dayOfWeek, time, duration, notes } = req.body;
  if (!clientName || dayOfWeek === undefined || !time) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  const dur = duration != null ? parseInt(duration) : 60;
  if (!Number.isFinite(dur) || dur < 15 || dur > 480) {
    return res.status(400).json({ error: 'Duração inválida (15 a 480 minutos)' });
  }
  try {
    const block = await prisma.recurringBlock.create({
      data: { clientName, dayOfWeek: parseInt(dayOfWeek), time, duration: dur, notes: notes || '' },
    });
    audit(req, 'recurringBlock.create', { id: block.id });
    res.status(201).json(block);
  } catch (e) {
    console.error('[createRecurringBlock]', e);
    res.status(500).json({ error: 'Erro ao criar horário fixo' });
  }
};

exports.deleteRecurringBlock = async (req, res) => {
  try {
    await prisma.recurringBlock.delete({ where: { id: parseInt(req.params.id) } });
    audit(req, 'recurringBlock.delete', { id: parseInt(req.params.id) });
    res.status(204).send();
  } catch (e) {
    console.error('[deleteRecurringBlock]', e);
    res.status(500).json({ error: 'Erro ao excluir horário fixo' });
  }
};
