import { Router } from 'express';
import { stepDefController } from '../controllers/StepDefController';

export class StepDefRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/',  stepDefController.getManyStepDefs);
    this.router.get('/:stepDefId', stepDefController.getStepDef);
    this.router.post('/',  stepDefController.createStepDef);
    this.router.put('/:stepDefId',  stepDefController.updateStepDef);
    this.router.delete('/:stepDefId',  stepDefController.deleteStepDef);
  }
}

export const stepDefRouterSingleton = new StepDefRouter();
export const stepDefRouter = stepDefRouterSingleton.router;


