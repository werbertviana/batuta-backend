import { Router } from 'express';
import { LessonController } from './lesson.controller';

const lessonRoutes = Router();
const lessonController = new LessonController();

lessonRoutes.get('/lessons', lessonController.list);
lessonRoutes.get('/lessons/:slug', lessonController.findBySlug);

export { lessonRoutes };