import { Router } from 'express';
import { braintreeClientTokenController } from '../controllers/BraintreeClientTokenController';

export class BraintreeClientTokenRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.post('/', braintreeClientTokenController.createBraintreeClientToken);
    }
}

export const braintreeClientTokenRouterSingleton = (): BraintreeClientTokenRouter | any => {
    return new BraintreeClientTokenRouter();
};
export const braintreeClientTokenRouter = (): any => {
    return braintreeClientTokenRouterSingleton().router;
};
