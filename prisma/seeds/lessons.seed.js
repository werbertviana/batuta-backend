async function seedLessons(prisma) {
  await prisma.lesson.createMany({
    data: [
      {
        number: 1,
        order: 1,
        title: 'Lição 01',
        slug: 'licao01',
        isActive: true,
      },
      {
        number: 2,
        order: 2,
        title: 'Lição 02',
        slug: 'licao02',
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Lessons criadas com sucesso.');
}

module.exports = { seedLessons };