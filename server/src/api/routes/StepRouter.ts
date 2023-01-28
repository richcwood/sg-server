import { Router } from 'express';
import { stepController } from '../controllers/StepController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class StepRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), stepController.getManySteps);
        this.router.get('/:stepId', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), stepController.getStep);
        this.router.post('/', verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']), stepController.createStep);
        this.router.put('/:stepId', verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']), stepController.updateStep);
        this.router.delete('/', verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']), stepController.deleteStep);
    }
}

export const stepRouterSingleton = new StepRouter();
export const stepRouter = stepRouterSingleton.router;
