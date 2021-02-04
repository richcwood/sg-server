import { Router } from 'express';
import { paymentTransactionController } from '../controllers/PaymentTransactionController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class PaymentTransactionRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['PAYMENT_TRANSACTION_READ', 'GLOBAL']), paymentTransactionController.getManyPaymentTransactions);
    this.router.get('/:paymentTransactionId', verifyAccessRights(['PAYMENT_TRANSACTION_READ', 'GLOBAL']), paymentTransactionController.getPaymentTransaction);
    this.router.post('/', verifyAccessRights(['PAYMENT_TRANSACTION_WRITE', 'GLOBAL']), paymentTransactionController.createPaymentTransaction);
    this.router.put('/:paymentTransactionId', verifyAccessRights(['PAYMENT_TRANSACTION_WRITE', 'GLOBAL']), paymentTransactionController.updatePaymentTransaction);
  }
}

export const paymentTransactionRouterSingleton = new PaymentTransactionRouter();
export const paymentTransactionRouter = paymentTransactionRouterSingleton.router;