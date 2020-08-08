import { Router } from 'express';
import { payInvoiceAutoController } from '../controllers/PayInvoiceAutoController';

export class PayInvoiceAutoRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/', payInvoiceAutoController.payInvoiceAuto);
  }
}

export const payInvoiceAutoRouterSingleton = new PayInvoiceAutoRouter();
export const payInvoiceAutoRouter = payInvoiceAutoRouterSingleton.router;