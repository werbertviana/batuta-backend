import { Router } from 'express';
import { ActivityController } from './activity.controller';

const activityRoutes = Router();
const activityController = new ActivityController();

activityRoutes.get('/activities/:slug', activityController.findBySlug);
activityRoutes.get('/activities/:slug/start', activityController.startBySlug);

export { activityRoutes };