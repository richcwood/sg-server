import { Router } from 'express';
import { jobDefController } from '../controllers/JobDefController';

export class JobDefRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/',  jobDefController.getManyJobDefs);
    this.router.get('/:jobDefId', jobDefController.getJobDef);
    this.router.post('/', jobDefController.createJobDef);
    this.router.post('/cron', jobDefController.createJobDefFromCron);
    this.router.post('/script', jobDefController.createJobDefFromScript);
    this.router.post('/copy', jobDefController.createJobDefFromJobDef);
    this.router.put('/:jobDefId', jobDefController.updateJobDef);
    this.router.delete('/:jobDefId',  jobDefController.deleteJobDef);
  }
}

export const jobDefRouterSingleton = new JobDefRouter();
export const jobDefRouter = jobDefRouterSingleton.router;


