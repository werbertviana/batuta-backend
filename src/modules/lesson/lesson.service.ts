import { prisma } from '../../shared/prisma';

export class LessonService {
  list = async () => {
    return prisma.lesson.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
      select: {
        id: true,
        number: true,
        slug: true,
        title: true,
        order: true,
        isActive: true,
      },
    });
  };

  findBySlug = async (slug: string) => {
    return prisma.lesson.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        number: true,
        slug: true,
        title: true,
        order: true,
        isActive: true,
        modules: {
          where: {
            isActive: true,
          },
          orderBy: {
            order: 'asc',
          },
          select: {
            id: true,
            title: true,
            icon: true,
            contentKey: true,
            practiceRoute: true,
            unlockLevel: true,
            order: true,
            isActive: true,
            slides: {
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                image: true,
                video: true,
                order: true,
                audios: {
                  orderBy: {
                    order: 'asc',
                  },
                  select: {
                    id: true,
                    audioName: true,
                    order: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  };
}