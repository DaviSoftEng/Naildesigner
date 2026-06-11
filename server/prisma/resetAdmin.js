// Recria/atualiza a admin a partir do .env (ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD).
// Útil para trocar a senha sem mexer no resto do banco.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME || 'Administradora';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('FATAL: defina ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('FATAL: ADMIN_PASSWORD deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  await prisma.user.upsert({
    where: { email },
    update: { name, password: await bcrypt.hash(password, 10) },
    create: { name, email, password: await bcrypt.hash(password, 10) },
  });

  console.log(`✅ Admin "${email}" atualizada.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
