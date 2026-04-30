import { Request, Response } from 'express';
import { LessonService } from './lesson.service';

export class LessonController {
  constructor(private readonly lessonService = new LessonService()) {}

  list = async (_req: Request, res: Response) => {
    const lessons = await this.lessonService.list();

    return res.status(200).json({
      data: lessons,
    });
  };

  findBySlug = async (req: Request, res: Response) => {
    const { slug } = req.params;

    const lesson = await this.lessonService.findBySlug(slug);

    if (!lesson) {
      return res.status(404).json({
        error: {
          code: 'LESSON_NOT_FOUND',
          message: 'Lição não encontrada.',
        },
      });
    }

    return res.status(200).json({
      data: lesson,
    });
  };
}