const prisma = require('../db');
const { audit } = require('../utils/audit');
const { getBookingWindowDays, getWhatsapp, getDepositSettings } = require('../utils/settings');

async function setKey(key, value) {
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

const TIME_REGEX = /^\d{2}:\d{2}$/;

// Configurações de agendamento (público — o site precisa da janela, WhatsApp e política de sinal)
exports.getSettings = async (req, res) => {
  try {
    const deposit = await getDepositSettings();
    res.json({
      bookingWindowDays: await getBookingWindowDays(),
      whatsapp: await getWhatsapp(),
      ...deposit,
    });
  } catch (e) {
    console.error('[getSettings]', e);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
};

exports.updateSettings = async (req, res) => {
  const { bookingWindowDays, whatsapp, depositPercent, depositPixKey, cancelHours } = req.body;
  try {
    if (bookingWindowDays !== undefined) {
      const n = parseInt(bookingWindowDays, 10);
      if (!Number.isFinite(n) || n < 1 || n > 365) {
        return res.status(400).json({ error: 'Janela inválida (use de 1 a 365 dias)' });
      }
      await setKey('bookingWindowDays', String(n));
    }
    if (whatsapp !== undefined) {
      // Guarda só dígitos; garante DDI 55 quando o número tem DDD + 8/9 dígitos
      let digits = String(whatsapp).replace(/\D/g, '');
      if (digits && !digits.startsWith('55') && digits.length >= 10 && digits.length <= 11) {
        digits = '55' + digits;
      }
      await setKey('whatsapp', digits);
    }
    if (depositPercent !== undefined) {
      const n = parseInt(depositPercent, 10);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return res.status(400).json({ error: 'Sinal inválido (use de 0 a 100%)' });
      }
      await setKey('depositPercent', String(n));
    }
    if (depositPixKey !== undefined) {
      const key = String(depositPixKey).trim();
      if (key.length > 140) return res.status(400).json({ error: 'Chave Pix muito longa' });
      await setKey('depositPixKey', key);
    }
    if (cancelHours !== undefined) {
      const n = parseInt(cancelHours, 10);
      if (!Number.isFinite(n) || n < 0 || n > 168) {
        return res.status(400).json({ error: 'Antecedência inválida (use de 0 a 168 horas)' });
      }
      await setKey('cancelHours', String(n));
    }

    audit(req, 'settings.update', {
      bookingWindowDays,
      whatsappUpdated: whatsapp !== undefined,
      depositPercent,
      pixUpdated: depositPixKey !== undefined,
      cancelHours,
    });

    const deposit = await getDepositSettings();
    res.json({
      bookingWindowDays: await getBookingWindowDays(),
      whatsapp: await getWhatsapp(),
      ...deposit,
    });
  } catch (e) {
    console.error('[updateSettings]', e);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
};

exports.getBusinessHours = async (req, res) => {
  try {
    const hours = await prisma.businessHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
    res.json(hours);
  } catch (e) {
    console.error('[getBusinessHours]', e);
    res.status(500).json({ error: 'Erro ao buscar horários' });
  }
};

exports.updateBusinessHours = async (req, res) => {
  const { hours } = req.body;
  if (!Array.isArray(hours)) return res.status(400).json({ error: 'Formato inválido' });
  for (const h of hours) {
    // Pausa: ou os dois horários válidos, ou nenhum
    const hasStart = !!h.breakStart, hasEnd = !!h.breakEnd;
    if (hasStart !== hasEnd) {
      return res.status(400).json({ error: 'Preencha início e fim da pausa (ou deixe os dois vazios)' });
    }
    if (hasStart && (!TIME_REGEX.test(h.breakStart) || !TIME_REGEX.test(h.breakEnd))) {
      return res.status(400).json({ error: 'Horário de pausa inválido' });
    }
  }
  try {
    const updates = await Promise.all(
      hours.map((h) =>
        prisma.businessHours.upsert({
          where: { dayOfWeek: h.dayOfWeek },
          update: {
            isOpen: h.isOpen,
            openTime: h.openTime,
            closeTime: h.closeTime,
            breakStart: h.breakStart || null,
            breakEnd: h.breakEnd || null,
          },
          create: {
            dayOfWeek: h.dayOfWeek,
            isOpen: h.isOpen,
            openTime: h.openTime,
            closeTime: h.closeTime,
            breakStart: h.breakStart || null,
            breakEnd: h.breakEnd || null,
          },
        })
      )
    );
    audit(req, 'businessHours.update', { days: updates.length });
    res.json(updates);
  } catch (e) {
    console.error('[updateBusinessHours]', e);
    res.status(500).json({ error: 'Erro ao atualizar horários' });
  }
};

exports.getDayBlocks = async (req, res) => {
  try {
    const blocks = await prisma.dayBlock.findMany({ orderBy: { date: 'asc' } });
    res.json(blocks);
  } catch (e) {
    console.error('[getDayBlocks]', e);
    res.status(500).json({ error: 'Erro ao buscar bloqueios' });
  }
};

exports.createDayBlock = async (req, res) => {
  const { date, reason, startTime, endTime } = req.body;
  if (!date) return res.status(400).json({ error: 'Data é obrigatória' });
  try {
    const block = await prisma.dayBlock.create({
      data: { date, reason: reason || '', startTime: startTime || null, endTime: endTime || null },
    });
    audit(req, 'dayBlock.create', { id: block.id, date });
    res.status(201).json(block);
  } catch (e) {
    console.error('[createDayBlock]', e);
    res.status(500).json({ error: 'Erro ao criar bloqueio' });
  }
};

exports.deleteDayBlock = async (req, res) => {
  try {
    await prisma.dayBlock.delete({ where: { id: parseInt(req.params.id) } });
    audit(req, 'dayBlock.delete', { id: parseInt(req.params.id) });
    res.status(204).send();
  } catch (e) {
    console.error('[deleteDayBlock]', e);
    res.status(500).json({ error: 'Erro ao excluir bloqueio' });
  }
};
