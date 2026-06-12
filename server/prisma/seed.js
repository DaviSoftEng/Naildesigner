const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

// Catálogo inicial do Studio Bella (modelo — edite pelo painel depois)
// Fotos do catálogo ficam em client/public/galeria (mesmas usadas no portfólio).
// Catálogo enxuto: 8 serviços ativos. Os demais (active:false) ficam ocultos no
// site mas seguem no banco/portfólio — reative pelo painel quando quiser.
const SERVICES = [
  // Unhas — catálogo
  { name: 'Alongamento em Gel',           price: 190, duration: 180, category: 'unhas', image: '/galeria/gel-rose-cromado.jpg',          description: 'Alongamento completo em gel, acabamento impecável' },
  { name: 'Banho de Gel',                 price: 95,  duration: 90,  category: 'unhas', image: '/galeria/banho-gel-glazed.jpg',          description: 'Camada de gel sobre a unha natural, efeito glazed' },
  { name: 'Esmaltação em Gel',            price: 80,  duration: 90,  category: 'unhas', image: '/galeria/gel-vinho-glitter.jpg',         description: 'Esmaltação em gel com brilho que dura semanas' },
  { name: 'Manicure Tradicional',         price: 50,  duration: 60,  category: 'unhas', image: '/galeria/francesinha-natural.jpg',       description: 'Cutilagem e esmaltação caprichada' },
  { name: 'Nail Art / Decoração',         price: 35,  duration: 45,  category: 'unhas', image: '/galeria/nail-art-linhas-douradas.jpg',  description: 'Decoração autoral personalizada (a partir de)' },
  { name: 'Pedicure Completa',            price: 60,  duration: 60,  category: 'unhas', image: '/galeria/pedicure.jpg',                  description: 'Cuidado completo dos pés com esmaltação' },
  // Sobrancelhas — catálogo
  { name: 'Design de Sobrancelhas',       price: 50,  duration: 30,  category: 'sobrancelhas', image: '/galeria/sobrancelhas-design.jpg', description: 'Design personalizado com mapeamento do rosto' },
  { name: 'Design com Henna',             price: 70,  duration: 45,  category: 'sobrancelhas', image: '/galeria/sobrancelhas-henna.jpg',  description: 'Design + aplicação de henna para preencher falhas' },
  // Ocultos do catálogo (active:false) — fotos seguem no portfólio
  { name: 'Alongamento Coffin Glitter',   price: 210, duration: 180, category: 'unhas', image: '/galeria/coffin-preto-glitter.jpg', active: false, description: 'Alongamento longo formato coffin com degradê de glitter' },
  { name: 'Encapsulado Marble',           price: 200, duration: 180, category: 'unhas', image: '/galeria/encapsulado-marble.jpg',   active: false, description: 'Alongamento com efeito mármore perolado encapsulado' },
  { name: 'Encapsulado Aquarela',         price: 160, duration: 150, category: 'unhas', image: '/galeria/encapsulado-candy.jpg',    active: false, description: 'Unhas encapsuladas com arte aquarela em tons candy' },
  { name: 'Blindagem',                    price: 60,  duration: 60,  category: 'unhas', image: '/galeria/nude-natural.jpg',         active: false, description: 'Blindagem da unha natural com brilho nude duradouro' },
  { name: 'Esmaltação Minimalista',       price: 45,  duration: 60,  category: 'unhas', image: '/galeria/nude-minimalista.jpg',     active: false, description: 'Esmaltação nude com detalhe minimalista autoral' },
  { name: 'Nail Art — Swirls',            price: 35,  duration: 45,  category: 'unhas', image: '/galeria/nail-art-swirls-azul.jpg', active: false, description: 'Decoração artística com swirls coloridos (a partir de)' },
  { name: 'Spa dos Pés + Pedicure',       price: 85,  duration: 90,  category: 'unhas', image: '/galeria/spa-pes.jpg',              active: false, description: 'Esfoliação, hidratação e pedicure completa' },
  { name: 'Brow Lamination',              price: 140, duration: 60,  category: 'sobrancelhas', image: '/galeria/brow-lamination.jpg', active: false, description: 'Alinhamento dos fios para sobrancelhas cheias e definidas' },
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

// Portfólio inicial (gerencie pelo painel)
const GALLERY = [
  { image: '/galeria/gel-rose-cromado.jpg',         caption: 'Alongamento em gel rosê cromado',   category: 'unhas', position: 1 },
  { image: '/galeria/coffin-preto-glitter.jpg',     caption: 'Coffin preto com glitter prata',    category: 'unhas', position: 2 },
  { image: '/galeria/encapsulado-marble.jpg',       caption: 'Encapsulado efeito mármore',        category: 'unhas', position: 3 },
  { image: '/galeria/gel-vinho-glitter.jpg',        caption: 'Esmaltação em gel vinho com glitter', category: 'unhas', position: 4 },
  { image: '/galeria/encapsulado-candy.jpg',        caption: 'Encapsulado aquarela candy',        category: 'unhas', position: 5 },
  { image: '/galeria/nail-art-swirls-azul.jpg',     caption: 'Nail art swirls azul',              category: 'unhas', position: 6 },
  { image: '/galeria/banho-gel-glazed.jpg',         caption: 'Banho de gel efeito glazed',        category: 'unhas', position: 7 },
  { image: '/galeria/nail-art-linhas-douradas.jpg', caption: 'Nude fosco com linhas douradas',    category: 'unhas', position: 8 },
  { image: '/galeria/francesinha-natural.jpg',      caption: 'Francesinha natural',               category: 'unhas', position: 9 },
  { image: '/galeria/nude-natural.jpg',             caption: 'Nude natural clean',                category: 'unhas', position: 10 },
  { image: '/galeria/nude-minimalista.jpg',         caption: 'Nude minimalista',                  category: 'unhas', position: 11 },
  { image: '/galeria/pedicure.jpg',                 caption: 'Pedicure nude impecável',           category: 'unhas', position: 12 },
  { image: '/galeria/sobrancelhas-design.jpg',      caption: 'Design de sobrancelhas natural',    category: 'sobrancelhas', position: 13 },
  { image: '/galeria/sobrancelhas-henna.jpg',       caption: 'Sobrancelhas com henna',            category: 'sobrancelhas', position: 14 },
  { image: '/galeria/brow-lamination.jpg',          caption: 'Brow lamination',                   category: 'sobrancelhas', position: 15 },
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
