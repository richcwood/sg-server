import { Router } from 'express';
import { jobDefController } from '../controllers/JobDefController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';
import { upload } from './AgentLogRouter';

export class JobDefRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), jobDefController.getManyJobDefs);
        this.router.get('/export', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), jobDefController.getJobDefsExport);
        this.router.post(
            '/import',
            verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']),
            upload.single('file'),
            jobDefController.importJobDefs
        );
        this.router.get('/:jobDefId', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), jobDefController.getJobDef);
        this.router.post('/', verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']), jobDefController.createJobDef);
        this.router.post(
            '/cron',
            verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']),
            jobDefController.createJobDefFromCron
        );
        this.router.post(
            '/script',
            verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']),
            jobDefController.createJobDefFromScript
        );
        this.router.post(
            '/copy',
            verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']),
            jobDefController.createJobDefFromJobDef
        );
        this.router.put('/:jobDefId', verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']), jobDefController.updateJobDef);
        this.router.delete(
            '/:jobDefId',
            verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']),
            jobDefController.deleteJobDef
        );
    }
}

export const jobDefRouterSingleton = (): JobDefRouter | any => {
    return new JobDefRouter();
};
export const jobDefRouter = (): any => {
    return jobDefRouterSingleton().router;
};
