import { Router } from 'express';
import { taskDefController } from '../controllers/TaskDefController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TaskDefRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['TASK_DEF_READ', 'GLOBAL']),  taskDefController.getManyTaskDefs);
    this.router.get('/:taskDefId', verifyAccessRights(['TASK_DEF_READ', 'GLOBAL']), taskDefController.getTaskDef);
    this.router.post('/', verifyAccessRights(['TASK_DEF_CREATE', 'GLOBAL']),  taskDefController.createTaskDef);
    this.router.put('/:taskDefId', verifyAccessRights(['TASK_DEF_UPDATE', 'GLOBAL']),  taskDefController.updateTaskDef);
    this.router.delete('/:taskDefId', verifyAccessRights(['TASK_DEF_DELETE', 'GLOBAL']),  taskDefController.deleteTaskDef);
  }
}

export const taskDefRouterSingleton = new TaskDefRouter();
export const taskDefRouter = taskDefRouterSingleton.router;
