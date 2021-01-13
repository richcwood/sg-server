import { Router } from 'express';
import { forgotPasswordController } from '../controllers/ForgotPasswordController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class ForgotPasswordRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/', verifyAccessRights(['PASSWORD_FORGOT', 'GLOBAL']), forgotPasswordController.requestReset);
  }
}

export const forgotPasswordRouterSingleton = new ForgotPasswordRouter();
export const forgotPasswordRouter = forgotPasswordRouterSingleton.router;
