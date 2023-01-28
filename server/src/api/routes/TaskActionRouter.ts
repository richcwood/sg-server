import { Router } from 'express';
import { taskActionController } from '../controllers/TaskActionController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TaskActionRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.post(
            '/republish/:taskId',
            verifyAccessRights(['TASK_ACTION', 'GLOBAL']),
            taskActionController.republishTask
        );
        this.router.post(
            '/requeue/:taskId',
            verifyAccessRights(['TASK_ACTION', 'GLOBAL']),
            taskActionController.requeueTask
        );
    }
}

export const taskActionRouterSingleton = new TaskActionRouter();
export const taskActionRouter = taskActionRouterSingleton.router;
