import { Request, Response } from 'express';
import { ModuleService } from './module.service';

export class ModuleController {
  constructor(private readonly moduleService = new ModuleService()) {}

  list = async (_req: Request, res: Response) => {
    const modules = await this.moduleService.list();

    return res.status(200).json({
      data: modules,
    });
  };

  findById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MODULE_ID',
          message: 'ID do módulo inválido.',
        },
      });
    }

    const module = await this.moduleService.findById(id);

    if (!module) {
      return res.status(404).json({
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Módulo não encontrado.',
        },
      });
    }

    return res.status(200).json({
      data: module,
    });
  };
}