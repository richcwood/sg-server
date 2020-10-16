import { Router } from 'express';
import { taskController } from '../controllers/TaskController';

export class TaskRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/',  taskController.getManyTasks);
    this.router.get('/:taskId', taskController.getTask);
    this.router.post('/', taskController.createTask);
    this.router.put('/:taskId', taskController.updateTask);
    this.router.delete('/', taskController.deleteTask);
  }
}

export const taskRouterSingleton = new TaskRouter();
export const taskRouter = taskRouterSingleton.router;