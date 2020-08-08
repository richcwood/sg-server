import { Router } from 'express';
import { taskOutcomeActionController } from '../controllers/TaskOutcomeActionController';

export class TaskOutcomeActionRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/cancel/:taskId', taskOutcomeActionController.cancelTaskOutcome);
    this.router.post('/interrupt/:taskId', taskOutcomeActionController.interruptTaskOutcome);
    this.router.post('/restart/:taskId', taskOutcomeActionController.restartTaskOutcome);
  }
}

export const taskOutcomeActionRouterSingleton = new TaskOutcomeActionRouter();
export const taskOutcomeActionRouter = taskOutcomeActionRouterSingleton.router;