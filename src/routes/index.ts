import { Router } from 'express';

import { usersRouter } from '../modules/users/users.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { lessonRoutes } from '../modules/lesson/lesson.routes';
import { moduleRoutes } from '../modules/module/module.routes';
import { activityRoutes } from '../modules/activity/activity.routes';

export const apiRouter = Router();

apiRouter.use('/users', usersRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/', lessonRoutes);
apiRouter.use('/', moduleRoutes);
apiRouter.use('/', activityRoutes);