import { Router } from 'express';
import { userController } from '../controllers/UserController';

export class UserRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/',  userController.getManyUsers);
    this.router.get('/:userId', userController.getUser);
    this.router.put('/:userId', userController.updateUser);
    this.router.put('/:userId/join/:orgId', userController.joinOrg);
  }
}

export const userRouterSingleton = new UserRouter();
export const userRouter = userRouterSingleton.router;