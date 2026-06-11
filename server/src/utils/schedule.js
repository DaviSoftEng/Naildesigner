// Regras de agenda compartilhadas entre slots (consulta) e agendamentos (criação/edição).

function timeToMinutes(t) {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return h * 60 + m;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

// Mensagem de conflito por tipo de intervalo ocupado
const CONFLICT_MESSAGES = {
  appointment: 'Horário já ocupado',
  recurring: 'Horário reservado para cliente fixa',
  block: 'Horário bloqueado na agenda',
  break: 'Horário de pausa do studio',
};

// Monta a visão do dia: funcionamento, bloqueio e intervalos ocupados (com tipo).
// `db` pode ser o prisma ou uma transação (tx).
async function getDaySchedule(db, date, { excludeAppointmentId } = {}) {
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();

  const bh = await db.businessHours.findFirst({ where: { dayOfWeek } });
  const isOpen = bh ? bh.isOpen : true;
  const openTime = bh?.openTime || '09:00';
  const closeTime = bh?.closeTime || '19:00';

  const dayBlock = await db.dayBlock.findFirst({ where: { date } });
  const fullDayBlocked = !!(dayBlock && !dayBlock.startTime);

  const busy = [];

  const where = { date, status: { in: ['confirmed', 'completed'] } };
  if (excludeAppointmentId) where.id = { not: excludeAppointmentId };
  const appointments = await db.appointment.findMany({
    where,
    select: { time: true, totalDuration: true },
  });
  appointments.forEach((a) => {
    const s = timeToMinutes(a.time);
    busy.push({ start: s, end: s + (a.totalDuration || 30), type: 'appointment' });
  });

  const recurring = await db.recurringBlock.findMany({
    where: { dayOfWeek },
    select: { time: true, duration: true },
  });
  recurring.forEach((r) => {
    const s = timeToMinutes(r.time);
    busy.push({ start: s, end: s + (r.duration || 60), type: 'recurring' });
  });

  if (dayBlock?.startTime && dayBlock?.endTime) {
    busy.push({ start: timeToMinutes(dayBlock.startTime), end: timeToMinutes(dayBlock.endTime), type: 'block' });
  }

  if (bh?.breakStart && bh?.breakEnd) {
    busy.push({ start: timeToMinutes(bh.breakStart), end: timeToMinutes(bh.breakEnd), type: 'break' });
  }

  return {
    dayOfWeek,
    isOpen,
    openTime,
    closeTime,
    openMin: timeToMinutes(openTime),
    closeMin: timeToMinutes(closeTime),
    fullDayBlocked,
    blockReason: dayBlock?.reason || '',
    busy,
  };
}

// Primeiro conflito de [startMin, endMin) com os intervalos ocupados, ou null.
function findConflict(busy, startMin, endMin) {
  const hit = busy.find((b) => overlaps(startMin, endMin, b.start, b.end));
  return hit ? { ...hit, message: CONFLICT_MESSAGES[hit.type] } : null;
}

module.exports = { timeToMinutes, overlaps, getDaySchedule, findConflict, CONFLICT_MESSAGES };
