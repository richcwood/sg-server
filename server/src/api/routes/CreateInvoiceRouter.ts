import { Router } from 'express';
import { createInvoiceController } from '../controllers/CreateInvoiceController';

export class CreateInvoiceRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/', createInvoiceController.createInvoice);
  }
}

export const createInvoiceRouterSingleton = new CreateInvoiceRouter();
export const createInvoiceRouter = createInvoiceRouterSingleton.router;