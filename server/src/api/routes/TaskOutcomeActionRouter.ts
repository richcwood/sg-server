import { Router } from 'express';
import { taskOutcomeActionController } from '../controllers/TaskOutcomeActionController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TaskOutcomeActionRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/cancel/:taskId', verifyAccessRights(['TASK_ACTION', 'GLOBAL']), taskOutcomeActionController.cancelTaskOutcome);
    this.router.post('/interrupt/:taskId', verifyAccessRights(['TASK_ACTION', 'GLOBAL']), taskOutcomeActionController.interruptTaskOutcome);
    this.router.post('/restart/:taskId', verifyAccessRights(['TASK_ACTION', 'GLOBAL']), taskOutcomeActionController.restartTaskOutcome);
  }
}

export const taskOutcomeActionRouterSingleton = new TaskOutcomeActionRouter();
export const taskOutcomeActionRouter = taskOutcomeActionRouterSingleton.router;