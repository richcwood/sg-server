import { Router } from 'express';
import { taskDefController } from '../controllers/TaskDefController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TaskDefRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), taskDefController.getManyTaskDefs);
        this.router.get('/:taskDefId', verifyAccessRights(['JOB_DEF_READ', 'GLOBAL']), taskDefController.getTaskDef);
        this.router.post('/', verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']), taskDefController.createTaskDef);
        this.router.put(
            '/:taskDefId',
            verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']),
            taskDefController.updateTaskDef
        );
        this.router.delete(
            '/:taskDefId',
            verifyAccessRights(['JOB_DEF_WRITE', 'GLOBAL']),
            taskDefController.deleteTaskDef
        );
    }
}

export const taskDefRouterSingleton = new TaskDefRouter();
export const taskDefRouter = taskDefRouterSingleton.router;
