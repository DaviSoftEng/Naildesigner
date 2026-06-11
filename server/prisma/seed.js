const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

// Catálogo inicial do Studio Bella (modelo — edite pelo painel depois)
const SERVICES = [
  // Unhas
  { name: 'Alongamento em Gel',        price: 180, duration: 180, category: 'unhas',        description: 'Aplicação completa de unhas em gel, do preparo à finalização' },
  { name: 'Manutenção de Gel',         price: 120, duration: 120, category: 'unhas',        description: 'Manutenção do alongamento em gel (até 25 dias)' },
  { name: 'Banho de Gel',              price: 90,  duration: 90,  category: 'unhas',        description: 'Camada de gel sobre a unha natural para mais resistência' },
  { name: 'Esmaltação em Gel',         price: 70,  duration: 90,  category: 'unhas',        description: 'Esmaltação em gel com brilho que dura semanas' },
  { name: 'Manicure Tradicional',      price: 45,  duration: 60,  category: 'unhas',        description: 'Cutilagem e esmaltação tradicional caprichada' },
  { name: 'Pedicure',                  price: 50,  duration: 60,  category: 'unhas',        description: 'Cuidado completo dos pés com esmaltação' },
  { name: 'Spa dos Pés + Pedicure',    price: 80,  duration: 90,  category: 'unhas',        description: 'Esfoliação, hidratação e pedicure completa' },
  { name: 'Nail Art / Decoração',      price: 25,  duration: 30,  category: 'unhas',        description: 'Decoração artística (valor a partir de, por mão)' },
  { name: 'Remoção de Gel',            price: 50,  duration: 60,  category: 'unhas',        description: 'Remoção segura do gel preservando a unha natural' },
  // Sobrancelhas
  { name: 'Design de Sobrancelhas',    price: 45,  duration: 30,  category: 'sobrancelhas', description: 'Design personalizado com mapeamento do rosto' },
  { name: 'Design com Henna',          price: 65,  duration: 45,  category: 'sobrancelhas', description: 'Design + aplicação de henna para preencher falhas' },
  { name: 'Brow Lamination',           price: 130, duration: 60,  category: 'sobrancelhas', description: 'Alinhamento dos fios para sobrancelhas cheias e definidas' },
];

// Horário de funcionamento (0=Dom ... 6=Sáb). Dom e Seg fechados.
// Pausa de almoço configurável por dia (12h–13h de terça a sexta).
const HOURS = [
  { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '19:00', breakStart: null,    breakEnd: null    }, // Dom
  { dayOfWeek: 1, isOpen: false, openTime: '09:00', closeTime: '19:00', breakStart: null,    breakEnd: null    }, // Seg
  { dayOfWeek: 2, isOpen: true,  openTime: '09:00', closeTime: '19:00', breakStart: '12:00', breakEnd: '13:00' }, // Ter
  { dayOfWeek: 3, isOpen: true,  openTime: '09:00', closeTime: '19:00', breakStart: '12:00', breakEnd: '13:00' }, // Qua
  { dayOfWeek: 4, isOpen: true,  openTime: '09:00', closeTime: '19:00', breakStart: '12:00', breakEnd: '13:00' }, // Qui
  { dayOfWeek: 5, isOpen: true,  openTime: '09:00', closeTime: '19:00', breakStart: '12:00', breakEnd: '13:00' }, // Sex
  { dayOfWeek: 6, isOpen: true,  openTime: '09:00', closeTime: '17:00', breakStart: null,    breakEnd: null    }, // Sáb
];

// Portfólio inicial (placeholders — troque pelas fotos reais no painel)
const GALLERY = [
  { image: '/galeria/01.svg', caption: 'Francesinha clássica em gel',  category: 'unhas',        position: 1 },
  { image: '/galeria/02.svg', caption: 'Nail art floral delicada',     category: 'unhas',        position: 2 },
  { image: '/galeria/03.svg', caption: 'Nude rosé com brilho',         category: 'unhas',        position: 3 },
  { image: '/galeria/04.svg', caption: 'Design com henna',             category: 'sobrancelhas', position: 4 },
  { image: '/galeria/05.svg', caption: 'Alongamento amendoado',        category: 'unhas',        position: 5 },
  { image: '/galeria/06.svg', caption: 'Brow lamination',              category: 'sobrancelhas', position: 6 },
];

// Padrões de configuração (só criados se ainda não existirem)
const SETTINGS = [
  { key: 'bookingWindowDays', value: '14' },
  { key: 'depositPercent',    value: '30' },
  { key: 'cancelHours',       value: '24' },
];

async function main() {
  const name = process.env.ADMIN_NAME || 'Administradora';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('FATAL: defina ADMIN_EMAIL e ADMIN_PASSWORD no .env / variáveis de ambiente antes do seed.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('FATAL: ADMIN_PASSWORD deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  // Admin (upsert — não apaga nada)
  await prisma.user.upsert({
    where: { email },
    update: { name, password: await bcrypt.hash(password, 10) },
    create: { name, email, password: await bcrypt.hash(password, 10) },
  });

  // Dados iniciais: só cria se ainda não houver (idempotente, não sobrescreve)
  if ((await prisma.service.count()) === 0) {
    await prisma.service.createMany({ data: SERVICES });
  }
  if ((await prisma.businessHours.count()) === 0) {
    await prisma.businessHours.createMany({ data: HOURS });
  }
  if ((await prisma.galleryPhoto.count()) === 0) {
    await prisma.galleryPhoto.createMany({ data: GALLERY });
  }
  for (const s of SETTINGS) {
    const exists = await prisma.setting.findUnique({ where: { key: s.key } });
    if (!exists) await prisma.setting.create({ data: s });
  }

  console.log('✅ Seed concluído!');
  console.log(`👤 Admin: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
