import { Router } from 'express';
import { updateTeamStorageUsageController } from '../controllers/UpdateTeamStorageUsageController';

export class UpdateTeamStorageUsageRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/', updateTeamStorageUsageController.updateTeamStorageUsage);
  }
}

export const updateTeamStorageUsageRouterSingleton = new UpdateTeamStorageUsageRouter();
export const updateTeamStorageUsageRouter = updateTeamStorageUsageRouterSingleton.router;