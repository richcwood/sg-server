import { Router } from 'express';
import { orgVariableController } from '../controllers/OrgVariableController';

export class OrgVariableRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', orgVariableController.getManyOrgVariables);
    this.router.get('/:orgVariableId', orgVariableController.getOrgVariable);
    this.router.post('/', orgVariableController.createOrgVariable);
    this.router.put('/:orgVariableId', orgVariableController.updateOrgVariable);
    this.router.delete('/:orgVariableId', orgVariableController.deleteOrgVariable);
  }
}

export const orgVariableRouterSingleton = new OrgVariableRouter();
export const orgVariableRouter = orgVariableRouterSingleton.router;