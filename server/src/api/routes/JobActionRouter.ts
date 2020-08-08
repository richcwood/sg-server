import { Router } from 'express';
import { jobActionController } from '../controllers/JobActionController';

export class JobActionRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/cancel/:jobId', jobActionController.cancelJob);
    this.router.post('/interrupt/:jobId', jobActionController.interruptJob);
    this.router.post('/restart/:jobId', jobActionController.restartJob);
  }
}

export const jobActionRouterSingleton = new JobActionRouter();
export const jobActionRouter = jobActionRouterSingleton.router;