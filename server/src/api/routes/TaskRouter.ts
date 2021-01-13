import { Router } from 'express';
import { taskController } from '../controllers/TaskController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TaskRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['TASK_READ', 'GLOBAL']),  taskController.getManyTasks);
    this.router.get('/:taskId', verifyAccessRights(['TASK_READ', 'GLOBAL']), taskController.getTask);
    this.router.post('/', verifyAccessRights(['TASK_CREATE', 'GLOBAL']), taskController.createTask);
    this.router.put('/:taskId', verifyAccessRights(['TASK_UPDATE', 'GLOBAL']), taskController.updateTask);
    this.router.delete('/', verifyAccessRights(['TASK_DELETE', 'GLOBAL']), taskController.deleteTask);
  }
}

export const taskRouterSingleton = new TaskRouter();
export const taskRouter = taskRouterSingleton.router;