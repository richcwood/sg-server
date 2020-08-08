import { Router } from 'express';
import { signupController } from '../controllers/SignupController';

export class SignupRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/', signupController.signupNewUser);
    this.router.put('/confirm', signupController.confirmNewUser);
    this.router.put('/details/:userId', signupController.setInitialPassword);
  }
}

export const signupRouterSingleton = new SignupRouter();
export const signupRouter = signupRouterSingleton.router;