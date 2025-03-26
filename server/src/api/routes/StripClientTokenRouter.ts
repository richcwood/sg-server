import { Router } from 'express';
import { stripeClientTokenController } from '../controllers/StripeClientTokenController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class StripeClientTokenRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get(
            '/',
            verifyAccessRights(['PAYMENT_TOKEN_CREATE', 'GLOBAL']),
            stripeClientTokenController.getStripePublicToken
        );
        this.router.post(
            '/',
            verifyAccessRights(['PAYMENT_TOKEN_CREATE', 'GLOBAL']),
            stripeClientTokenController.createStripeClientSecret
        );
    }
}

export const stripeClientTokenRouterSingleton = (): StripeClientTokenRouter | any => {
    return new StripeClientTokenRouter();
};
export const stripeClientTokenRouter = (): any => {
    return stripeClientTokenRouterSingleton().router;
};
