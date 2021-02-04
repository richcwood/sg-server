  import { Router } from 'express';
import { stepDefController } from '../controllers/StepDefController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class StepDefRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']),  stepDefController.getManyStepDefs);
    this.router.get('/:stepDefId', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), stepDefController.getStepDef);
    this.router.post('/', verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']),  stepDefController.createStepDef);
    this.router.put('/:stepDefId', verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']),  stepDefController.updateStepDef);
    this.router.delete('/:stepDefId', verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']),  stepDefController.deleteStepDef);
  }
}

export const stepDefRouterSingleton = new StepDefRouter();
export const stepDefRouter = stepDefRouterSingleton.router;


