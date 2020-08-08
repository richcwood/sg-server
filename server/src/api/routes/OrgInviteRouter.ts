import { Router } from 'express';
import { orgInviteController } from '../controllers/OrgInviteController';

export class OrgInviteRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/direct', orgInviteController.inviteUserToOrgDirect);
  }
}

export const orgInviteRouterSingleton = new OrgInviteRouter();
export const orgInviteRouter = orgInviteRouterSingleton.router;