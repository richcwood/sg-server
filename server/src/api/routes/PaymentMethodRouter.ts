import { Router } from 'express';
import { paymentMethodController } from '../controllers/PaymentMethodController';

export class PaymentMethodRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', paymentMethodController.getManyPaymentMethods);
    this.router.get('/:paymentMethodId', paymentMethodController.getPaymentMethod);
    this.router.post('/', paymentMethodController.createPaymentMethod);
    this.router.put('/:paymentMethodId', paymentMethodController.updatePaymentMethod);
    this.router.delete('/:paymentMethodId', paymentMethodController.deletePaymentMethod);
  }
}

export const paymentMethodRouterSingleton = new PaymentMethodRouter();
export const paymentMethodRouter = paymentMethodRouterSingleton.router;