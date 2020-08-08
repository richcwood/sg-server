import { Router } from 'express';
import { forgotPasswordController } from '../controllers/ForgotPasswordController';

export class ForgotPasswordRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/', forgotPasswordController.requestReset);
  }
}

export const forgotPasswordRouterSingleton = new ForgotPasswordRouter();
export const forgotPasswordRouter = forgotPasswordRouterSingleton.router;