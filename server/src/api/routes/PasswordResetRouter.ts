import { Router } from 'express';
import { passwordResetController } from '../controllers/PasswordResetController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class PasswordResetRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.post('/', passwordResetController.updatePassword);
    }
}

export const passwordResetRouterSingleton = (): PasswordResetRouter | any => {
    return new PasswordResetRouter();
};
export const passwordResetRouter = (): any => {
    return passwordResetRouterSingleton().router;
};
