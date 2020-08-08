import { Router } from 'express';
import { orgStorageController } from '../controllers/OrgStorageController';

export class OrgStorageRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', orgStorageController.getManyOrgStorages);
    this.router.get('/:orgStorageId', orgStorageController.getOrgStorage);
    this.router.post('/', orgStorageController.createOrgStorage);
    this.router.put('/:orgStorageId', orgStorageController.updateOrgStorage);
  }
}

export const orgStorageRouterSingleton = new OrgStorageRouter();
export const orgStorageRouter = orgStorageRouterSingleton.router;