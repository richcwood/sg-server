import { Router } from 'express';
import { paymentMethodController } from '../controllers/PaymentMethodController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class PaymentMethodRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get(
            '/',
            verifyAccessRights(['PAYMENT_METHOD_READ', 'GLOBAL']),
            paymentMethodController.getManyPaymentMethods
        );
        this.router.get(
            '/:paymentMethodId',
            verifyAccessRights(['PAYMENT_METHOD_READ', 'GLOBAL']),
            paymentMethodController.getPaymentMethod
        );
        this.router.post(
            '/',
            verifyAccessRights(['PAYMENT_METHOD_WRITE', 'GLOBAL']),
            paymentMethodController.createPaymentMethod
        );
        this.router.put(
            '/:paymentMethodId',
            verifyAccessRights(['PAYMENT_METHOD_WRITE', 'GLOBAL']),
            paymentMethodController.updatePaymentMethod
        );
        this.router.delete(
            '/:paymentMethodId',
            verifyAccessRights(['PAYMENT_METHOD_WRITE', 'GLOBAL']),
            paymentMethodController.deletePaymentMethod
        );
    }
}

export const paymentMethodRouterSingleton = (): PaymentMethodRouter | any => {
    return new PaymentMethodRouter();
};
export const paymentMethodRouter = (): any => {
    return paymentMethodRouterSingleton().router;
};
