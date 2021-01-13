import { Router } from 'express';
import { stepController } from '../controllers/StepController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class StepRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['STEP_READ', 'GLOBAL']),  stepController.getManySteps);
    this.router.get('/:stepId', verifyAccessRights(['STEP_READ', 'GLOBAL']), stepController.getStep);
    this.router.post('/', verifyAccessRights(['STEP_CREATE', 'GLOBAL']), stepController.createStep);
    this.router.put('/:stepId', verifyAccessRights(['STEP_UPDATE', 'GLOBAL']), stepController.updateStep);
    this.router.delete('/', verifyAccessRights(['STEP_DELETE', 'GLOBAL']), stepController.deleteStep);
  }
}

export const stepRouterSingleton = new StepRouter();
export const stepRouter = stepRouterSingleton.router;


