import { Router } from 'express';
import { taskActionController } from '../controllers/TaskActionController';

export class TaskActionRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/republish/:taskId', taskActionController.republishTask);
    this.router.post('/requeue/:taskId', taskActionController.requeueTask);
  }
}

export const taskActionRouterSingleton = new TaskActionRouter();
export const taskActionRouter = taskActionRouterSingleton.router;