import { Router } from 'express';
import { stepOutcomeController } from '../controllers/StepOutcomeController';

export class StepOutcomeRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/',  stepOutcomeController.getManyStepOutcomes);
    this.router.get('/:stepOutcomeId', stepOutcomeController.getStepOutcome);
    this.router.post('/', stepOutcomeController.createStepOutcome);
    this.router.put('/:stepOutcomeId', stepOutcomeController.updateStepOutcome);
}
}

export const stepOutcomeRouterSingleton = new StepOutcomeRouter();
export const stepOutcomeRouter = stepOutcomeRouterSingleton.router;


