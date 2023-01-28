import { Router } from 'express';
import { jobController } from '../controllers/JobController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class JobRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['JOB_READ', 'GLOBAL']), jobController.getManyJobs);
        this.router.get('/:jobId', verifyAccessRights(['JOB_READ', 'GLOBAL']), jobController.getJob);
        this.router.post(
            '/ic/',
            verifyAccessRights(['JOB_CREATE', 'GLOBAL']),
            jobController.createInteractiveConsoleJob
        );
        this.router.post('/', verifyAccessRights(['JOB_CREATE', 'GLOBAL']), jobController.createJob);
        this.router.put('/:jobId', verifyAccessRights(['JOB_WRITE', 'GLOBAL']), jobController.updateJob);
        this.router.delete('/', verifyAccessRights(['JOB_DELETE', 'GLOBAL']), jobController.deleteJobs);
        this.router.delete('/:jobId', verifyAccessRights(['JOB_DELETE', 'GLOBAL']), jobController.deleteJob);
    }
}

export const jobRouterSingleton = new JobRouter();
export const jobRouter = jobRouterSingleton.router;
