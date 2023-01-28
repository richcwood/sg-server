import { Router } from 'express';
import { userController } from '../controllers/UserController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class UserRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['USER_READ', 'GLOBAL']), userController.getManyUsers);
        this.router.get('/:userId', verifyAccessRights(['USER_READ', 'GLOBAL']), userController.getUser);
        // this.router.put('/:userId', userController.updateUser);
        this.router.put('/:userId/join/:teamId', userController.joinTeam);
        this.router.put('/:userId/leave/:teamId', userController.leaveTeam);
    }
}

export const userRouterSingleton = new UserRouter();
export const userRouter = userRouterSingleton.router;
