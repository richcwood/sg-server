import { Router } from 'express';
import { signupController } from '../controllers/SignupController';

export class SignupRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/', signupController.signupNewUser);
    this.router.put('/confirminvite/:userEmail/:teamId/:token', signupController.confirmNewInvitedUser);
    this.router.put('/confirm', signupController.confirmNewUser);
    this.router.put('/details/:userId', signupController.setInitialPassword);
    this.router.put('/oauth/:userId', signupController.oauthSetup);
  }
}

export const signupRouterSingleton = new SignupRouter();
export const signupRouter = signupRouterSingleton.router;