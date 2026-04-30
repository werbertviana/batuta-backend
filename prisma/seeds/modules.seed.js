async function seedModules(prisma) {
  const lesson01 = await prisma.lesson.findUnique({
    where: { slug: 'licao01' },
  });

  const lesson02 = await prisma.lesson.findUnique({
    where: { slug: 'licao02' },
  });

  if (!lesson01 || !lesson02) {
    throw new Error('Lições não encontradas para criar os módulos.');
  }

  await prisma.module.createMany({
    data: [
      {
        lessonId: lesson01.id,
        title: 'Introdução',
        icon: 'feed01.png',
        contentKey: '1',
        practiceRoute: 'AtivIntro',
        unlockLevel: 1,
        order: 1,
        isActive: true,
      },
      {
        lessonId: lesson01.id,
        title: 'Pauta Musical',
        icon: 'feed02.png',
        contentKey: '2',
        practiceRoute: 'AtivPauta',
        unlockLevel: 2,
        order: 2,
        isActive: true,
      },
      {
        lessonId: lesson01.id,
        title: 'Clave Musical',
        icon: 'feed03.png',
        contentKey: '3',
        practiceRoute: 'AtivClave',
        unlockLevel: 3,
        order: 3,
        isActive: true,
      },
      {
        lessonId: lesson01.id,
        title: 'Notas Musicais',
        icon: 'feed04.png',
        contentKey: '4',
        practiceRoute: 'AtivNotas',
        unlockLevel: 4,
        order: 4,
        isActive: true,
      },
      {
        lessonId: lesson02.id,
        title: 'Figuras de Notas',
        icon: 'feed05.png',
        contentKey: '5',
        practiceRoute: 'AtivFigNotas',
        unlockLevel: 5,
        order: 1,
        isActive: true,
      },
      {
        lessonId: lesson02.id,
        title: 'Figuras de Pausas',
        icon: 'feed06.png',
        contentKey: '6',
        practiceRoute: 'AtivFigPausas',
        unlockLevel: 6,
        order: 2,
        isActive: true,
      },
      {
        lessonId: lesson02.id,
        title: 'Duração dos Valores',
        icon: 'feed07.png',
        contentKey: '7',
        practiceRoute: 'AtivDuracao',
        unlockLevel: 7,
        order: 3,
        isActive: true,
      },
      {
        lessonId: lesson02.id,
        title: 'Compasso Musical',
        icon: 'feed08.png',
        contentKey: '8',
        practiceRoute: 'AtivCompasso',
        unlockLevel: 8,
        order: 4,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Modules criados com sucesso.');
}

module.exports = { seedModules };