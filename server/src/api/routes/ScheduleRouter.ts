import { Router } from 'express';
import { scheduleController } from '../controllers/ScheduleController';

export class ScheduleRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', scheduleController.getManySchedules);
    this.router.get('/:scheduleId', scheduleController.getSchedule);
    this.router.post('/', scheduleController.createSchedule);
    this.router.put('/:scheduleId', scheduleController.updateSchedule);
    this.router.put('/fromscheduler/:scheduleId', scheduleController.updateFromScheduler);
    this.router.delete('/:scheduleId', scheduleController.deleteSchedule);
  }
}

export const scheduleRouterSingleton = new ScheduleRouter();
export const scheduleRouter = scheduleRouterSingleton.router;
