import { Router } from 'express';
import { ModuleController } from './module.controller';

const moduleRoutes = Router();
const moduleController = new ModuleController();

moduleRoutes.get('/modules', moduleController.list);
moduleRoutes.get('/modules/:id', moduleController.findById);

export { moduleRoutes };