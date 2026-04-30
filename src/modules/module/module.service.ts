import { prisma } from '../../shared/prisma';

export class ModuleService {
  list = async () => {
    return prisma.module.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { lessonId: 'asc' },
        { order: 'asc' },
      ],
      select: {
        id: true,
        lessonId: true,
        title: true,
        icon: true,
        contentKey: true,
        practiceRoute: true,
        unlockLevel: true,
        order: true,
        isActive: true,
      },
    });
  };

  findById = async (id: number) => {
    return prisma.module.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        lessonId: true,
        title: true,
        icon: true,
        contentKey: true,
        practiceRoute: true,
        unlockLevel: true,
        order: true,
        isActive: true,
        lesson: {
          select: {
            id: true,
            number: true,
            slug: true,
            title: true,
          },
        },
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
        activity: {
          select: {
            id: true,
            slug: true,
            title: true,
            order: true,
          },
        },
      },
    });
  };
}