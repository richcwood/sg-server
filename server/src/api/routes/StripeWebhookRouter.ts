import { NextFunction, Request, Response, Router } from 'express';
import { ForbiddenError, MissingObjectError, ValidationError } from '../utils/Errors';
import { BaseLogger } from '../../shared/SGLogger';
import { paymentMethodService } from '../../api/services/PaymentMethodService';
import { PaymentMethodSchema } from '../domain/PaymentMethod';
import { paymentTransactionService } from '../../api/services/PaymentTransactionService';
import { teamService } from '../../api/services/TeamService';
import { PaymentMethodType } from '../../shared/Enums';
const Stripe = require('stripe');
import * as _ from 'lodash';
const bodyParser = require('body-parser');

let appName: string = 'StripeWebhookRouter';
let logger: BaseLogger = new BaseLogger(appName);
logger.Start();

export default class StripeHookRouter {
    public router: Router;
    private stripe: any = undefined;

    constructor() {
        this.router = Router();

        this.stripe = new Stripe(process.env.stripePrivateKey, process.env.stripeApiVersion);

        this.setRoutes();
    }

    setRoutes() {
        this.router.post('/', bodyParser.raw({ type: 'application/json' }), this.create.bind(this));
    }

    async create(req: Request, res: Response, next: NextFunction) {
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(
                req.body,
                req.headers['stripe-signature'],
                process.env.stripeWebhookSecret
            );
        } catch (error) {
            logger.LogError('Stripe webhook error', { body: req.body, headers: req.headers, error });
            throw new ForbiddenError('Stripe webhook error');
        }

        console.log('event -> ', JSON.stringify(event, null, 4));

        const teams = await teamService.findAllTeamsInternal({ stripe_id: event.data.object.customer }, 'id');
        if (!teams || (_.isArray(teams) && teams.length < 1))
            throw new MissingObjectError(`No team found with stripe_id "${event.data.object.customer}"`);
        const team = teams[0];

        if (event.type === 'payment_method.attached') {
            if (event.data.object.type != 'card') {
                logger.LogError('Unsupported payment method type', { event });
                throw new ValidationError('Unsupported payment method type');
            }

            let paymentMethod: any = {};

            let name: string = `${event.data.object.card.brand} ... ${event.data.object.card.last4}`;
            if (event.data.object.billing_details.name) name = event.data.object.billing_details.name;

            let type = PaymentMethodType.CREDIT_CARD;

            paymentMethod.name = name;
            paymentMethod.type = type;
            paymentMethod.stripePaymentMethodId = event.data.object.id;
            paymentMethod.last4 = event.data.object.card.last4;
            paymentMethod.cardBrand = event.data.object.card.brand;

            paymentMethodService.createPaymentMethod(team._id, paymentMethod);
        } else if (event.type === 'payment_method.detached') {
            const paymentMethods = await paymentMethodService.findAllPaymentMethodsInternal(
                { stripePaymentMethodId: event.data.object.id },
                'id'
            );
            if (_.isArray(paymentMethods) && paymentMethods.length > 0) {
                paymentMethodService.deletePaymentMethod(team._id, paymentMethods[0]._id);
            }
        } else if (event.type === 'payment_method.updated') {
            if (event.data.object.type != 'card') {
                logger.LogError('Unsupported payment method type', { event });
                throw new ValidationError('Unsupported payment method type');
            }

            const paymentMethods = await paymentMethodService.findAllPaymentMethodsInternal(
                { stripePaymentMethodId: event.data.object.id },
                'id'
            );
            if (!paymentMethods || (_.isArray(paymentMethods) && paymentMethods.length < 1))
                throw new MissingObjectError(`No payment method found with stripe id "${event.data.object.id}"`);
            const paymentMethod: PaymentMethodSchema = paymentMethods[0];

            let name: string = `${event.data.object.card.brand} ... ${event.data.object.card.last4}`;
            if (event.data.object.billing_details.name) name = event.data.object.billing_details.name;

            paymentMethod.name = name;
            paymentMethod.stripePaymentMethodId = event.data.object.id;
            paymentMethod.last4 = event.data.object.card.last4;
            paymentMethod.cardBrand = event.data.object.card.brand;

            paymentMethodService.updatePaymentMethod(team._id, paymentMethod._id, paymentMethod);
        } else if (event.type === 'charge.refunded') {
            const paymentTransactions = await paymentTransactionService.findAllPaymentTransactionsInternal(
                { processorTransactionId: event.data.object.payment_intent },
                'id refunds'
            );
            if (!paymentTransactions || (_.isArray(paymentTransactions) && paymentTransactions.length < 1))
                throw new MissingObjectError(
                    `No payment transaction found with payment intent id "${event.data.object.payment_intent}"`
                );
            const paymentTransaction: any = paymentTransactions[0].toObject();

            paymentTransaction.refunded = true;
            paymentTransaction.amount_refunded = event.data.object.amount_refunded;

            for (let i = 0; i < event.data.object.refunds.data.length; i++) {
                let refundObject: any = event.data.object.refunds.data[i];
                let refund: any = {
                    id: refundObject.id,
                    amount: refundObject.amount,
                    charge: refundObject.charge,
                    createdAt: refundObject.created * 1000,
                    reason: refundObject.reason,
                    status: refundObject.status,
                };
                paymentTransaction.refunds.push(refund);
            }

            paymentTransactionService.updatePaymentTransaction(team._id, paymentTransaction._id, paymentTransaction);
        } else {
            logger.LogWarning('Received unsupported stripe webhook message', { event });
        }

        res.json({ received: true });
    }
}
