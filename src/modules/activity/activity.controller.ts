import { Request, Response } from 'express';
import { ActivityService } from './activity.service';

export class ActivityController {
  constructor(private readonly activityService = new ActivityService()) {}

  findBySlug = async (req: Request, res: Response) => {
    const { slug } = req.params;

    const activity = await this.activityService.findBySlug(slug);

    if (!activity) {
      return res.status(404).json({
        error: {
          code: 'ACTIVITY_NOT_FOUND',
          message: 'Atividade não encontrada.',
        },
      });
    }

    return res.status(200).json({
      data: activity,
    });
  };

  startBySlug = async (req: Request, res: Response) => {
    const { slug } = req.params;

    const activity = await this.activityService.startBySlug(slug);

    if (!activity) {
      return res.status(404).json({
        error: {
          code: 'ACTIVITY_NOT_FOUND',
          message: 'Atividade não encontrada.',
        },
      });
    }

    return res.status(200).json({
      data: activity,
    });
  };
}