  import { Router } from 'express';
import { stepDefController } from '../controllers/StepDefController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class StepDefRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['STEP_DEF_READ', 'GLOBAL']),  stepDefController.getManyStepDefs);
    this.router.get('/:stepDefId', verifyAccessRights(['STEP_DEF_READ', 'GLOBAL']), stepDefController.getStepDef);
    this.router.post('/', verifyAccessRights(['STEP_DEF_CREATE', 'GLOBAL']),  stepDefController.createStepDef);
    this.router.put('/:stepDefId', verifyAccessRights(['STEP_DEF_UPDATE', 'GLOBAL']),  stepDefController.updateStepDef);
    this.router.delete('/:stepDefId', verifyAccessRights(['STEP_DEF_DELETE', 'GLOBAL']),  stepDefController.deleteStepDef);
  }
}

export const stepDefRouterSingleton = new StepDefRouter();
export const stepDefRouter = stepDefRouterSingleton.router;


