import { Router } from 'express';
import { taskOutcomeController } from '../controllers/TaskOutcomeController';

export class TaskOutcomeRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', taskOutcomeController.getManyTaskOutcomes);
    this.router.get('/:taskOutcomeId', taskOutcomeController.getTaskOutcome);
    this.router.post('/', taskOutcomeController.createTaskOutcome);
    this.router.put('/:taskOutcomeId', taskOutcomeController.updateTaskOutcome);
    this.router.delete('/', taskOutcomeController.deleteTaskOutcome);
  }
}

export const taskOutcomeRouterSingleton = new TaskOutcomeRouter();
export const taskOutcomeRouter = taskOutcomeRouterSingleton.router;