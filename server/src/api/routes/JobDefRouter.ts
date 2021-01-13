import { Router } from 'express';
import { jobDefController } from '../controllers/JobDefController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class JobDefRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), jobDefController.getManyJobDefs);
    this.router.get('/:jobDefId', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), jobDefController.getJobDef);
    this.router.post('/', verifyAccessRights(['JOB_DEF_CREATE', 'GLOBAL']), jobDefController.createJobDef);
    this.router.post('/cron', verifyAccessRights(['JOB_DEF_CREATE', 'GLOBAL']), jobDefController.createJobDefFromCron);
    this.router.post('/script', verifyAccessRights(['JOB_DEF_CREATE', 'GLOBAL']), jobDefController.createJobDefFromScript);
    this.router.post('/copy', verifyAccessRights(['JOB_DEF_CREATE', 'GLOBAL']), jobDefController.createJobDefFromJobDef);
    this.router.put('/:jobDefId', verifyAccessRights(['JOB_DEF_UPDATE', 'GLOBAL']), jobDefController.updateJobDef);
    this.router.delete('/:jobDefId', verifyAccessRights(['JOB_DEF_DELETE', 'GLOBAL']),  jobDefController.deleteJobDef);
  }
}

export const jobDefRouterSingleton = new JobDefRouter();
export const jobDefRouter = jobDefRouterSingleton.router;


