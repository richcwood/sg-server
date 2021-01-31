import { Router } from 'express';
import { accessRightController } from '../controllers/AccessRightController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class AccessRightRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', accessRightController.getManyAccessRights);
  }
}

export const accessRightRouterSingleton = new AccessRightRouter();
export const accessRightRouter = accessRightRouterSingleton.router;
