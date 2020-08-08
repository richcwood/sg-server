import { Router } from 'express';
import { paymentTransactionController } from '../controllers/PaymentTransactionController';

export class PaymentTransactionRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', paymentTransactionController.getManyPaymentTransactions);
    this.router.get('/:paymentTransactionId', paymentTransactionController.getPaymentTransaction);
    this.router.post('/', paymentTransactionController.createPaymentTransaction);
    this.router.put('/:paymentTransactionId', paymentTransactionController.updatePaymentTransaction);
  }
}

export const paymentTransactionRouterSingleton = new PaymentTransactionRouter();
export const paymentTransactionRouter = paymentTransactionRouterSingleton.router;