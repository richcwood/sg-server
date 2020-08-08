import { Router } from 'express';
import { taskDefController } from '../controllers/TaskDefController';

export class TaskDefRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/',  taskDefController.getManyTaskDefs);
    this.router.get('/:taskDefId', taskDefController.getTaskDef);
    this.router.post('/',  taskDefController.createTaskDef);
    this.router.put('/:taskDefId',  taskDefController.updateTaskDef);
    this.router.delete('/:taskDefId',  taskDefController.deleteTaskDef);
  }
}

export const taskDefRouterSingleton = new TaskDefRouter();
export const taskDefRouter = taskDefRouterSingleton.router;
