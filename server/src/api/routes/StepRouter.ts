import { Router } from 'express';
import { stepController } from '../controllers/StepController';

export class StepRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/',  stepController.getManySteps);
    this.router.get('/:stepId', stepController.getStep);
    this.router.post('/', stepController.createStep);
    this.router.put('/:stepId', stepController.updateStep);
    this.router.delete('/', stepController.deleteStep);
  }
}

export const stepRouterSingleton = new StepRouter();
export const stepRouter = stepRouterSingleton.router;


