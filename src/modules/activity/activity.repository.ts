import { prisma } from '../../shared/prisma';

export class ActivityRepository {
  findBySlug = async (slug: string) => {
    return prisma.activity.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        order: true,
        module: {
          select: {
            id: true,
            title: true,
            lessonId: true,
            unlockLevel: true,
          },
        },
        questions: {
          orderBy: {
            order: 'asc',
          },
          select: {
            id: true,
            statement: true,
            type: true,
            level: true,
            elo: true,
            order: true,
            options: {
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                label: true,
                text: true,
                image: true,
                isCorrect: true,
                order: true,
              },
            },
          },
        },
      },
    });
  };
}