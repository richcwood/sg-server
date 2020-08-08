import { Router } from 'express';
import { payInvoiceManualController } from '../controllers/PayInvoiceManualController';

export class PayInvoiceManualRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/', payInvoiceManualController.payInvoiceManual);
  }
}

export const payInvoiceManualRouterSingleton = new PayInvoiceManualRouter();
export const payInvoiceManualRouter = payInvoiceManualRouterSingleton.router;