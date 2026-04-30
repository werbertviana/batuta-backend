async function seedSlides(prisma) {
  const modules = await prisma.module.findMany({
    select: {
      id: true,
      title: true,
    },
  });

  const getModule = (title) =>
    modules.find((module) => module.title === title);

  const introducao = getModule('Introdução');
  const pauta = getModule('Pauta Musical');
  const clave = getModule('Clave Musical');
  const notas = getModule('Notas Musicais');
  const figNotas = getModule('Figuras de Notas');
  const figPausas = getModule('Figuras de Pausas');
  const duracao = getModule('Duração dos Valores');
  const compasso = getModule('Compasso Musical');

  if (
    !introducao ||
    !pauta ||
    !clave ||
    !notas ||
    !figNotas ||
    !figPausas ||
    !duracao ||
    !compasso
  ) {
    throw new Error('Um ou mais módulos não foram encontrados.');
  }

  async function createSlides(moduleId, slides, moduleName) {
    await prisma.moduleSlide.createMany({
      data: slides.map((slide) => ({
        moduleId,
        image: slide.image,
        video: slide.video ?? null,
        order: slide.order,
      })),
      skipDuplicates: true,
    });

    console.log(`✅ Slides de ${moduleName} criados com sucesso.`);
  }

  async function createAudioByImage(moduleId, image, audios) {
    const slide = await prisma.moduleSlide.findFirst({
      where: {
        moduleId,
        image,
      },
    });

    if (!slide) return;

    await prisma.slideAudio.createMany({
      data: audios.map((audio, index) => ({
        slideId: slide.id,
        audioName: audio,
        order: index + 1,
      })),
      skipDuplicates: true,
    });
  }

  // INTRODUÇÃO
  await createSlides(
    introducao.id,
    [
      { order: 1, image: 'slide01.png' },
      { order: 2, image: 'slide02_03.png' },
      { order: 3, image: 'slide04.png' },
      { order: 4, image: 'slide05.png' },
      { order: 5, image: 'slide06.png' },
    ],
    'Introdução',
  );

  await createAudioByImage(introducao.id, 'slide04.png', ['melodia']);
  await createAudioByImage(introducao.id, 'slide05.png', ['harmonia']);
  await createAudioByImage(introducao.id, 'slide06.png', ['ritmo']);

  // PAUTA
  await createSlides(
    pauta.id,
    [
      { order: 1, image: 'slide01_04.png' },
      { order: 2, image: 'slide05_08.png' },
    ],
    'Pauta Musical',
  );

  // CLAVE
  await createSlides(
    clave.id,
    [
      { order: 1, image: 'slide01_02.png' },
      { order: 2, image: 'slide03_04.png' },
      { order: 3, image: 'slide05_06.png' },
      { order: 4, image: 'slide07_08.png' },
    ],
    'Clave Musical',
  );

  // NOTAS
  await createSlides(
    notas.id,
    [
      { order: 1, image: 'slide01_03.png' },
      { order: 2, image: 'slide04_11.png' },
    ],
    'Notas Musicais',
  );

  await createAudioByImage(notas.id, 'slide04_11.png', [
    'do',
    're',
    'mi',
    'fa',
    'sol',
    'la',
    'si',
    'escala',
  ]);

  // FIGURAS DE NOTAS
  await createSlides(
    figNotas.id,
    [
      { order: 1, image: 'slide01_05.png' },
      { order: 2, image: 'slide06.png' },
    ],
    'Figuras de Notas',
  );

  // FIGURAS DE PAUSAS
  await createSlides(
    figPausas.id,
    [
      { order: 1, image: 'slide01_02.png' },
      { order: 2, image: 'slide03.png' },
    ],
    'Figuras de Pausas',
  );

  // DURAÇÃO
  await createSlides(
    duracao.id,
    [
      { order: 1, image: 'slide01_03.png' },
      { order: 2, image: 'slide04_11.png' },
    ],
    'Duração dos Valores',
  );

  await createAudioByImage(duracao.id, 'slide04_11.png', [
    'semibreve',
    'minima',
    'seminima',
    'colcheia',
    'semicolcheia',
    'fusa',
    'semifusa',
  ]);

  // COMPASSO
  await createSlides(
    compasso.id,
    [
      { order: 1, image: 'slide01_03.png' },
      { order: 2, image: 'slide04_08.png' },
    ],
    'Compasso Musical',
  );

  await createAudioByImage(compasso.id, 'slide04_08.png', [
    'pretinha',
    'metronomo',
  ]);
}

module.exports = { seedSlides };