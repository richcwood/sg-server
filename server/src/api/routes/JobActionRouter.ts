import { Router } from 'express';
import { jobActionController } from '../controllers/JobActionController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class JobActionRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/cancel/:jobId', verifyAccessRights(['JOB_ACTION', 'GLOBAL']), jobActionController.cancelJob);
    this.router.post('/interrupt/:jobId', verifyAccessRights(['JOB_ACTION', 'GLOBAL']), jobActionController.interruptJob);
    this.router.post('/restart/:jobId', verifyAccessRights(['JOB_ACTION', 'GLOBAL']), jobActionController.restartJob);
  }
}

export const jobActionRouterSingleton = new JobActionRouter();
export const jobActionRouter = jobActionRouterSingleton.router;