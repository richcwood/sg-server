import { Router } from 'express';
import { stepOutcomeController } from '../controllers/StepOutcomeController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class StepOutcomeRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['JOB_READ', 'GLOBAL']), stepOutcomeController.getManyStepOutcomes);
    this.router.get('/:stepOutcomeId', verifyAccessRights(['JOB_READ', 'GLOBAL']), stepOutcomeController.getStepOutcome);
    this.router.post('/', verifyAccessRights(['STEP_OUTCOME_WRITE', 'GLOBAL']), stepOutcomeController.createStepOutcome);
    this.router.put('/:stepOutcomeId', verifyAccessRights(['STEP_OUTCOME_WRITE', 'GLOBAL']), stepOutcomeController.updateStepOutcome);
    this.router.delete('/', verifyAccessRights(['JOB_DELETE', 'GLOBAL']), stepOutcomeController.deleteStepOutcome);
  }
}

export const stepOutcomeRouterSingleton = new StepOutcomeRouter();
export const stepOutcomeRouter = stepOutcomeRouterSingleton.router;


