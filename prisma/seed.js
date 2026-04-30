const { PrismaClient } = require('@prisma/client');

const { seedLessons } = require('./seeds/lessons.seed');
const { seedModules } = require('./seeds/modules.seed');
const { seedSlides } = require('./seeds/slides.seed');
const { seedActivities } = require('./seeds/activities.seed');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  await seedLessons(prisma);
  await seedModules(prisma);
  await seedSlides(prisma);
  await seedActivities(prisma);

  console.log('🎉 Seed finalizado com sucesso.');
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });