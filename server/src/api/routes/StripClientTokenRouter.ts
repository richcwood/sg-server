import { Router } from 'express';
import { stripeClientTokenController } from '../controllers/StripeClientTokenController';

export class StripeClientTokenRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', stripeClientTokenController.getStripePublicToken);
    this.router.post('/', stripeClientTokenController.createStripeClientSecret);
  }
}

export const stripeClientTokenRouterSingleton = new StripeClientTokenRouter();
export const stripeClientTokenRouter = stripeClientTokenRouterSingleton.router;