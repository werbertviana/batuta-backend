async function seedActivities(prisma) {
  const modules = await prisma.module.findMany({
    select: {
      id: true,
      title: true,
    },
  });

  const getModule = (title) => modules.find((module) => module.title === title);

  const activities = [
    {
      moduleTitle: 'Introdução',
      slug: 'ativ-intro',
      title: 'Introdução',
      order: 1,
      questions: [
        {
          order: 1,
          statement: 'Quais são os elementos fundamentais da música?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'A',
          options: [
            { order: 1, label: 'A', image: 'Q01.png' },
            { order: 2, label: 'B', image: 'Q02.png' },
            { order: 3, label: 'C', image: 'Q03.png' },
            { order: 4, label: 'D', image: 'Q04.png' },
          ],
        },
        {
          order: 2,
          statement: 'Qual a definição de melodia?',
          type: 'TEXTO',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'C',
          options: [
            { order: 1, label: 'A', text: 'COMBINAÇÃO DE SONS SIMULTÂNEOS' },
            { order: 2, label: 'B', text: 'REPETIÇÃO CONTÍNUA DE UM MESMO SOM' },
            { order: 3, label: 'C', text: 'COMBINAÇÃO DE SONS SUCESSIVOS' },
            { order: 4, label: 'D', text: 'MOVIMENTO DESORDENADO DOS SONS' },
          ],
        },
        {
          order: 3,
          statement: 'Qual a definição de harmonia?',
          type: 'TEXTO',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'B',
          options: [
            { order: 1, label: 'A', text: 'COMBINAÇÃO DE SONS SUCESSIVOS' },
            { order: 2, label: 'B', text: 'COMBINAÇÃO DE SONS SIMULTÂNEOS' },
            { order: 3, label: 'C', text: 'MOVIMENTO ORDENADO DOS SONS' },
            { order: 4, label: 'D', text: 'REPETIÇÃO CONTÍNUA DE UM MESMO SOM' },
          ],
        },
      ],
    },
    {
      moduleTitle: 'Pauta Musical',
      slug: 'ativ-pauta',
      title: 'Pauta Musical',
      order: 2,
      questions: [
        {
          order: 1,
          statement: 'O que é uma pauta musical?',
          type: 'TEXTO',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'B',
          options: [
            { order: 1, label: 'A', text: 'UM SINAL QUE DÁ NOME AS NOTAS' },
            { order: 2, label: 'B', text: 'UM CONJUNTO DE 5 LINHAS E 4 ESPAÇOS' },
            { order: 3, label: 'C', text: 'UM SINAL QUE INDICA DURAÇÃO' },
            { order: 4, label: 'D', text: 'UM CONJUNTO DE 4 LINHAS E 5 ESPAÇOS' },
          ],
        },
        {
          order: 2,
          statement: 'Quais notas estão nas linhas suplementares superiores?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'A',
          options: [
            { order: 1, label: 'A', image: 'Q01.png' },
            { order: 2, label: 'B', image: 'Q02.png' },
            { order: 3, label: 'C', image: 'Q03.png' },
            { order: 4, label: 'D', image: 'Q04.png' },
          ],
        },
        {
          order: 3,
          statement: 'Quais notas estão nos espaços suplementares inferiores?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'C',
          options: [
            { order: 1, label: 'A', image: 'Q04.png' },
            { order: 2, label: 'B', image: 'Q01.png' },
            { order: 3, label: 'C', image: 'Q02.png' },
            { order: 4, label: 'D', image: 'Q03.png' },
          ],
        },
      ],
    },
    {
      moduleTitle: 'Clave Musical',
      slug: 'ativ-clave',
      title: 'Clave Musical',
      order: 3,
      questions: [
        {
          order: 1,
          statement: 'Qual figura representa a Clave de Sol?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'C',
          options: [
            { order: 1, label: 'A', image: 'Q01.png' },
            { order: 2, label: 'B', image: 'Q02.png' },
            { order: 3, label: 'C', image: 'Q03.png' },
            { order: 4, label: 'D', image: 'Q04.png' },
          ],
        },
        {
          order: 2,
          statement: 'Qual figura representa a Clave de Dó?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'D',
          options: [
            { order: 1, label: 'A', image: 'Q04.png' },
            { order: 2, label: 'B', image: 'Q03.png' },
            { order: 3, label: 'C', image: 'Q01.png' },
            { order: 4, label: 'D', image: 'Q02.png' },
          ],
        },
        {
          order: 3,
          statement: 'Qual figura representa a Clave de Fá?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'D',
          options: [
            { order: 1, label: 'A', image: 'Q03.png' },
            { order: 2, label: 'B', image: 'Q04.png' },
            { order: 3, label: 'C', image: 'Q02.png' },
            { order: 4, label: 'D', image: 'Q01.png' },
          ],
        },
      ],
    },
    {
      moduleTitle: 'Notas Musicais',
      slug: 'ativ-notas',
      title: 'Notas Musicais',
      order: 4,
      questions: [
        {
          order: 1,
          statement: 'Quais são as 7 notas musicais?',
          type: 'TEXTO',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'B',
          options: [
            { order: 1, label: 'A', text: 'DÓ-RI-MI-FÁ-SOL-LÁ-SI' },
            { order: 2, label: 'B', text: 'DÓ-RÉ-MI-FÁ-SOL-LÁ-SI' },
            { order: 3, label: 'C', text: 'DÓ-RÉ-MI-FÉ-SOL-LÁ-SI' },
            { order: 4, label: 'D', text: 'DÓ-RÉ-MI-FÁ-SOL-LÓ-SI' },
          ],
        },
        {
          order: 2,
          statement: 'A nota Ré pode ser representada por qual letra?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'C',
          options: [
            { order: 1, label: 'A', image: 'Q01.png' },
            { order: 2, label: 'B', image: 'Q02.png' },
            { order: 3, label: 'C', image: 'Q03.png' },
            { order: 4, label: 'D', image: 'Q04.png' },
          ],
        },
        {
          order: 3,
          statement: 'Qual figura representa a nota Sol na pauta?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'C',
          options: [
            { order: 1, label: 'A', image: 'Q05.png' },
            { order: 2, label: 'B', image: 'Q06.png' },
            { order: 3, label: 'C', image: 'Q07.png' },
            { order: 4, label: 'D', image: 'Q08.png' },
          ],
        },
      ],
    },
    {
      moduleTitle: 'Figuras de Notas',
      slug: 'ativ-fig-notas',
      title: 'Figuras de Notas',
      order: 5,
      questions: [
        {
          order: 1,
          statement: 'O que são figuras de notas?',
          type: 'TEXTO',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'D',
          options: [
            { order: 1, label: 'A', text: 'SÃO SINAIS QUE INDICAM PAUSAS' },
            { order: 2, label: 'B', text: 'SÃO SINAIS QUE INDICAM O NOME DOS SONS' },
            { order: 3, label: 'C', text: 'SÃO SINAIS QUE INDICAM INTENSIDADE' },
            { order: 4, label: 'D', text: 'SÃO SINAIS QUE INDICAM A DURAÇÃO DOS SONS' },
          ],
        },
        {
          order: 2,
          statement: 'Qual figura de nota representa a Semibreve?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'B',
          options: [
            { order: 1, label: 'A', image: 'Q01.png' },
            { order: 2, label: 'B', image: 'Q02.png' },
            { order: 3, label: 'C', image: 'Q03.png' },
            { order: 4, label: 'D', image: 'Q04.png' },
          ],
        },
        {
          order: 3,
          statement: 'Qual figura de nota representa a Colcheia?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'D',
          options: [
            { order: 1, label: 'A', image: 'Q05.png' },
            { order: 2, label: 'B', image: 'Q06.png' },
            { order: 3, label: 'C', image: 'Q07.png' },
            { order: 4, label: 'D', image: 'Q03.png' },
          ],
        },
      ],
    },
    {
      moduleTitle: 'Figuras de Pausas',
      slug: 'ativ-fig-pausas',
      title: 'Figuras de Pausas',
      order: 6,
      questions: [
        {
          order: 1,
          statement: 'O que são figuras de pausas?',
          type: 'TEXTO',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'C',
          options: [
            { order: 1, label: 'A', text: 'SÃO SINAIS QUE INDICAM A DURAÇÃO DOS SONS' },
            { order: 2, label: 'B', text: 'SÃO SINAIS QUE INDICAM O NOME DOS SONS' },
            { order: 3, label: 'C', text: 'SÃO SINAIS QUE INDICAM A DURAÇÃO DO SILÊNCIO' },
            { order: 4, label: 'D', text: 'SÃO SINAIS QUE INDICAM INTENSIDADE' },
          ],
        },
        {
          order: 2,
          statement: 'Qual figura representa a Pausa da Semínima?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'B',
          options: [
            { order: 1, label: 'A', image: 'Q01.png' },
            { order: 2, label: 'B', image: 'Q02.png' },
            { order: 3, label: 'C', image: 'Q03.png' },
            { order: 4, label: 'D', image: 'Q04.png' },
          ],
        },
        {
          order: 3,
          statement: 'Qual figura representa a Pausa da Mínima?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'B',
          options: [
            { order: 1, label: 'A', image: 'Q05.png' },
            { order: 2, label: 'B', image: 'Q03.png' },
            { order: 3, label: 'C', image: 'Q02.png' },
            { order: 4, label: 'D', image: 'Q01.png' },
          ],
        },
      ],
    },
    {
      moduleTitle: 'Duração dos Valores',
      slug: 'ativ-duracao',
      title: 'Duração dos Valores',
      order: 7,
      questions: [
        {
          order: 1,
          statement: 'Qual figura é considerada a unidade na divisão proporcional dos valores?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'D',
          options: [
            { order: 1, label: 'A', image: 'Q01.png' },
            { order: 2, label: 'B', image: 'Q02.png' },
            { order: 3, label: 'C', image: 'Q03.png' },
            { order: 4, label: 'D', image: 'Q04.png' },
          ],
        },
        {
          order: 2,
          statement: 'Qual alternativa corresponde ao valor de uma Semínima?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'C',
          options: [
            { order: 1, label: 'A', image: 'Q05.png' },
            { order: 2, label: 'B', image: 'Q06.png' },
            { order: 3, label: 'C', image: 'Q07.png' },
            { order: 4, label: 'D', image: 'Q08.png' },
          ],
        },
        {
          order: 3,
          statement: 'Qual alternativa corresponde ao valor de uma Semibreve?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'B',
          options: [
            { order: 1, label: 'A', image: 'Q08.png' },
            { order: 2, label: 'B', image: 'Q05.png' },
            { order: 3, label: 'C', image: 'Q06.png' },
            { order: 4, label: 'D', image: 'Q07.png' },
          ],
        },
      ],
    },
    {
      moduleTitle: 'Compasso Musical',
      slug: 'ativ-compasso',
      title: 'Compasso Musical',
      order: 8,
      questions: [
        {
          order: 1,
          statement: 'Quais são os tipos de compasso?',
          type: 'FIGURA',
          level: 'MEDIO',
          elo: 'FERRO',
          correctLabel: 'A',
          options: [
            { order: 1, label: 'A', image: 'Q01.png' },
            { order: 2, label: 'B', image: 'Q02.png' },
            { order: 3, label: 'C', image: 'Q03.png' },
            { order: 4, label: 'D', image: 'Q04.png' },
          ],
        },
        {
          order: 2,
          statement:
            'Qual opção representa uma Barra, um Travessão Duplo e uma Barra Final, respectivamente?',
          type: 'FIGURA',
          level: 'FACIL',
          elo: 'FERRO',
          correctLabel: 'C',
          options: [
            { order: 1, label: 'A', image: 'Q05.png' },
            { order: 2, label: 'B', image: 'Q06.png' },
            { order: 3, label: 'C', image: 'Q07.png' },
            { order: 4, label: 'D', image: 'Q08.png' },
          ],
        },
        {
          order: 3,
          statement: 'O que é um compasso musical?',
          type: 'TEXTO',
          level: 'MEDIO',
          elo: 'FERRO',
          correctLabel: 'B',
          options: [
            { order: 1, label: 'A', text: 'É A DIVISÃO DAS FIGURAS DE NOTAS NO TEMPO' },
            { order: 2, label: 'B', text: 'É A DIVISÃO DA MÚSICA EM SÉRIES REGULARES DE TEMPOS' },
            { order: 3, label: 'C', text: 'É A DIVISÃO IRREGULAR DO TEMPO NA MÚSICA' },
            { order: 4, label: 'D', text: 'É O MOVIMENTO ORDENADO DOS SONS NO TEMPO' },
          ],
        },
      ],
    },
  ];

  for (const activityData of activities) {
    const module = getModule(activityData.moduleTitle);

    if (!module) {
      throw new Error(`Módulo ${activityData.moduleTitle} não encontrado.`);
    }

    const activity = await prisma.activity.upsert({
      where: {
        slug: activityData.slug,
      },
      update: {
        moduleId: module.id,
        title: activityData.title,
        order: activityData.order,
      },
      create: {
        moduleId: module.id,
        slug: activityData.slug,
        title: activityData.title,
        order: activityData.order,
      },
    });

    for (const questionData of activityData.questions) {
      const question = await prisma.question.upsert({
        where: {
          activityId_order: {
            activityId: activity.id,
            order: questionData.order,
          },
        },
        update: {
          statement: questionData.statement,
          type: questionData.type,
          level: questionData.level,
          elo: questionData.elo,
        },
        create: {
          activityId: activity.id,
          statement: questionData.statement,
          type: questionData.type,
          level: questionData.level,
          elo: questionData.elo,
          order: questionData.order,
        },
      });

      for (const optionData of questionData.options) {
        await prisma.questionOption.upsert({
          where: {
            questionId_label: {
              questionId: question.id,
              label: optionData.label,
            },
          },
          update: {
            text: optionData.text ?? null,
            image: optionData.image ?? null,
            isCorrect: optionData.label === questionData.correctLabel,
            order: optionData.order,
          },
          create: {
            questionId: question.id,
            label: optionData.label,
            text: optionData.text ?? null,
            image: optionData.image ?? null,
            isCorrect: optionData.label === questionData.correctLabel,
            order: optionData.order,
          },
        });
      }
    }

    console.log(`✅ Atividade ${activityData.title} criada com sucesso.`);
  }
}

module.exports = { seedActivities };