import { Router } from 'express';
import { updateOrgStorageUsageController } from '../controllers/UpdateOrgStorageUsageController';

export class UpdateOrgStorageUsageRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/', updateOrgStorageUsageController.updateOrgStorageUsage);
  }
}

export const updateOrgStorageUsageRouterSingleton = new UpdateOrgStorageUsageRouter();
export const updateOrgStorageUsageRouter = updateOrgStorageUsageRouterSingleton.router;