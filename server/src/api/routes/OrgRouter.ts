import { Router } from 'express';
import { orgController } from '../controllers/OrgController';

export class OrgRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/',  orgController.getManyOrgs);
    this.router.get('/:orgId', orgController.getOrg);
    this.router.post('/', orgController.createOrg);
    this.router.put('/:orgId', orgController.updateOrg);
  }
}

export const orgRouterSingleton = new OrgRouter();
export const orgRouter = orgRouterSingleton.router;