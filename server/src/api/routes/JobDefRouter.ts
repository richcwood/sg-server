import { Router } from 'express';
import { jobDefController } from '../controllers/JobDefController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class JobDefRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), jobDefController.getManyJobDefs);
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


