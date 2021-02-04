import { Router } from 'express';
import { scheduleController } from '../controllers/ScheduleController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class ScheduleRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['SCHEDULE_READ', 'GLOBAL']), scheduleController.getManySchedules);
    this.router.get('/:scheduleId', verifyAccessRights(['SCHEDULE_READ', 'GLOBAL']), scheduleController.getSchedule);
    this.router.post('/', verifyAccessRights(['SCHEDULE_WRITE', 'GLOBAL']), scheduleController.createSchedule);
    this.router.put('/:scheduleId', verifyAccessRights(['SCHEDULE_WRITE', 'GLOBAL']), scheduleController.updateSchedule);
    this.router.put('/fromscheduler/:scheduleId', verifyAccessRights(['SCHEDULE_UPDATE_BY_SCHEDULER']), scheduleController.updateFromScheduler);
    this.router.delete('/:scheduleId', verifyAccessRights(['SCHEDULE_WRITE', 'GLOBAL']), scheduleController.deleteSchedule);
  }
}

export const scheduleRouterSingleton = new ScheduleRouter();
export const scheduleRouter = scheduleRouterSingleton.router;
