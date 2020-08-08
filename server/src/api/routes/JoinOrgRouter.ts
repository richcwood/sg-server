import { Router } from 'express';
import { joinOrgController } from '../controllers/JoinOrgController';

export class JoinOrgRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/invite/:userId/:orgId/:token', joinOrgController.userJoinOrg);
    this.router.get('/shared_invite/:token', joinOrgController.anonymousJoinOrg);
  }
}

export const joinOrgRouterSingleton = new JoinOrgRouter();
export const joinOrgRouter = joinOrgRouterSingleton.router;