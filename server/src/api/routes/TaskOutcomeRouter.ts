import { Router } from 'express';
import { taskOutcomeController } from '../controllers/TaskOutcomeController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TaskOutcomeRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['JOB_READ', 'GLOBAL']), taskOutcomeController.getManyTaskOutcomes);
        this.router.get(
            '/:taskOutcomeId',
            verifyAccessRights(['JOB_READ', 'GLOBAL']),
            taskOutcomeController.getTaskOutcome
        );
        this.router.post(
            '/',
            verifyAccessRights(['TASK_OUTCOME_WRITE', 'GLOBAL']),
            taskOutcomeController.createTaskOutcome
        );
        this.router.put(
            '/:taskOutcomeId',
            verifyAccessRights(['TASK_OUTCOME_WRITE', 'GLOBAL']),
            taskOutcomeController.updateTaskOutcome
        );
        this.router.delete('/', verifyAccessRights(['JOB_DELETE', 'GLOBAL']), taskOutcomeController.deleteTaskOutcome);
    }
}

export const taskOutcomeRouterSingleton = new TaskOutcomeRouter();
export const taskOutcomeRouter = taskOutcomeRouterSingleton.router;
