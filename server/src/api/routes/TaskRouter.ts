import { Router } from 'express';
import { taskController } from '../controllers/TaskController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TaskRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['JOB_READ', 'GLOBAL']), taskController.getManyTasks);
        this.router.get('/:taskId', verifyAccessRights(['JOB_READ', 'GLOBAL']), taskController.getTask);
        this.router.post('/', verifyAccessRights(['JOB_WRITE', 'GLOBAL']), taskController.createTask);
        this.router.put('/:taskId', verifyAccessRights(['JOB_WRITE', 'GLOBAL']), taskController.updateTask);
        this.router.delete('/', verifyAccessRights(['JOB_DELETE', 'GLOBAL']), taskController.deleteTask);
    }
}

export const taskRouterSingleton = (): TaskRouter | any => {
    return new TaskRouter();
};
export const taskRouter = (): any => {
    return taskRouterSingleton().router;
};
