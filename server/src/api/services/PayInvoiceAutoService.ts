import { convertData } from '../utils/ResponseConverters';
import { BaseLogger } from '../../shared/SGLogger';
import { PaymentTransactionSchema, PaymentTransactionModel } from '../domain/PaymentTransaction';
import { PaymentTransactionSource } from '../../shared/Enums';
import { paymentTransactionService } from './PaymentTransactionService';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { InvoiceSchema } from '../domain/Invoice';
import { invoiceService } from './InvoiceService';
import { InvoiceStatus, TeamPaymentStatus } from '../../shared/Enums';
import { TeamSchema } from '../domain/Team';
import { PaymentTransactionStatus } from '../../shared/Enums';
import { SGUtils } from '../../shared/SGUtils';
import * as _ from 'lodash';
import * as config from 'config';
import { teamService } from './TeamService';
import * as mongodb from 'mongodb';
import { Stripe } from 'stripe';


export class PayInvoiceAutoService {
    public async payInvoice(_teamId: mongodb.ObjectId, data: any, logger: BaseLogger, correlationId: string): Promise<object> {
        data._teamId = _teamId;

        if (!data._invoiceId)
            throw new ValidationError(`Request body missing "_invoiceId" parameter`);

        const team: any = await teamService.findTeam(_teamId, 'paymentStatus billing_email stripe_id billing_currency');
        if (_.isArray(team) && team.length === 0)
            throw new MissingObjectError(`Team '${_teamId}' not found`);

        const getInvoice: InvoiceSchema[] = await invoiceService.findInvoice(_teamId, new mongodb.ObjectId(data._invoiceId), 'status billAmount paidAmount');
        if (_.isArray(getInvoice) && getInvoice.length === 0)
            throw new MissingObjectError(`Invoice '${data._invoiceId}' not found for team '${_teamId}'`);
        const invoice: InvoiceSchema = getInvoice[0];
        if (invoice.status == InvoiceStatus.SUBMITTED || invoice.status == InvoiceStatus.PAID)
            throw new ValidationError(`Error creating payment transaction - invoice '${data._invoiceId}' has status '${InvoiceStatus[invoice.status]}'`);

        const amount = invoice.billAmount - invoice.paidAmount;

        if (amount <= 0) {
            let updatedInvoice = await invoiceService.updateInvoice(_teamId, invoice._id, { status: InvoiceStatus.PAID }, correlationId);
            await SGUtils.CreateAndSendInvoice(team, updatedInvoice, { paymentInstrumentType: 'n/a', paymentInstrument: 'n/a' }, logger);
            return { _teamId: _teamId, amount: 0 };
        }

        let stripeApiVersion = config.get('stripeApiVersion');
        let privateKey = config.get('stripePrivateKey');

        const stripe = new Stripe(privateKey, stripeApiVersion);

        const paymentMethods = await stripe.paymentMethods.list({
            customer: team.stripe_id,
            type: 'card'
        });

        let paymentIntent: any = {};
        for (let i = 0; i < paymentMethods.data.length; i++) {
            try {
                const paymentMethod: any = paymentMethods.data[i];
                if (paymentMethod.type != 'card')
                    continue;

                paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: team.billing_currency,
                    customer: team.stripe_id,
                    payment_method: paymentMethod.id,
                    off_session: true,
                    confirm: true,
                });

                logger.LogInfo('Payment processing succeeded', paymentIntent);

                if (paymentIntent.status != 'succeeded')
                    throw new Error("Payment processing failed");

                let charges: any[] = [];
                for (let i = 0; i < paymentIntent.charges.data.length; i++) {
                    let charge: any = paymentIntent.charges.data[i];
                    charges.push({ 
                        paymentInstrument: charge.payment_method_details.card.last4,
                        paymentInstrumentType: charge.payment_method_details.type,
                        paymentCardBrand: charge.payment_method_details.card.brand,
                        status: charge.status,
                        amount: charge.amount
                    });
                }
        
                const paymentTransactionData = {
                    _teamId: _teamId,
                    _invoiceId: new mongodb.ObjectId(invoice._id),
                    source: PaymentTransactionSource.STRIPE,
                    processorTransactionId: paymentIntent.id,
                    createdAt: paymentIntent.created * 1000,
                    charges: charges,
                    status: paymentIntent.status,
                    amount: paymentIntent.amount
                };
                const newPaymentTransaction: any = await paymentTransactionService.createPaymentTransaction(_teamId, paymentTransactionData, correlationId);
                await rabbitMQPublisher.publish(_teamId, "PaymentTransaction", correlationId, PayloadOperation.UPDATE, convertData(PaymentTransactionSchema, newPaymentTransaction));
        
                let updatedInvoice: any = await invoiceService.updateInvoice(_teamId, invoice._id, { paidAmount: invoice.paidAmount + amount, status: InvoiceStatus.PAID }, correlationId);
                await SGUtils.CreateAndSendInvoice(team, updatedInvoice, paymentTransactionData, logger);
    
                if (team.paymentStatus == TeamPaymentStatus.DELINQUENT) {
                    const getDelinquentInvoices: InvoiceSchema[] = await invoiceService.findAllInvoicesInternal({ _teamId, status: InvoiceStatus.REJECTED }, '_id');
                    if (_.isArray(getDelinquentInvoices) && getDelinquentInvoices.length === 0)
                        await teamService.updateTeam(_teamId, { paymentStatus: TeamPaymentStatus.HEALTHY, paymentStatusDate: new Date() }, correlationId);
                }
    
                await rabbitMQPublisher.publish(_teamId, "Invoice", correlationId, PayloadOperation.UPDATE, convertData(InvoiceSchema, updatedInvoice));
                return { success: true, paymentTransactionData };
            } catch (err) {
                logger.LogError('Payment processing failed', { team, data, paymentIntent, error: err });
                const updatedInvoice: any = await invoiceService.updateInvoice(_teamId, invoice._id, { status: InvoiceStatus.REJECTED }, correlationId);
                await rabbitMQPublisher.publish(_teamId, "Invoice", correlationId, PayloadOperation.UPDATE, convertData(InvoiceSchema, updatedInvoice));
    
                if (team.paymentStatus == TeamPaymentStatus.HEALTHY) {
                    const updatedTeam: any = await teamService.updateTeam(_teamId, { paymentStatus: TeamPaymentStatus.DELINQUENT, paymentStatusDate: new Date() }, correlationId);
                    await rabbitMQPublisher.publish(_teamId, "Team", correlationId, PayloadOperation.UPDATE, convertData(TeamSchema, updatedTeam));
                }

                return { success: false, err };

                // Error code will be authentication_required if authentication is needed
                // logger.LogError('Error processing payment', {error: err});
                // console.log('Error code is: ', err.code);
                // const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(err.raw.payment_intent.id);
                // console.log('PI retrieved: ', paymentIntentRetrieved.id);
            }
        }

        // let charges: any[] = [];
        // for (let i = 0; i < paymentIntent.charges.data.length; i++) {
        //     let charge: any = paymentIntent.charges.data[i];
        //     charges.push({ 
        //         paymentInstrument: charge.payment_method_details.card.last4,
        //         paymentInstrumentType: charge.payment_method_details.type,
        //         paymentCardBrand: charge.payment_method_details.card.brand,
        //         status: charge.status,
        //         amount: charge.amount
        //     });
        // }

        // const paymentTransactionData = {
        //     _teamId: _teamId,
        //     _invoiceId: new mongodb.ObjectId(invoice._id),
        //     source: PaymentTransactionSource.STRIPE,
        //     processorTransactionId: paymentIntent.id,
        //     createdAt: paymentIntent.created * 1000,
        //     charges: charges,
        //     status: paymentIntent.status,
        //     amount: paymentIntent.amount
        // };
        // const newPaymentTransaction: any = await paymentTransactionService.createPaymentTransaction(_teamId, paymentTransactionData, correlationId);
        // await rabbitMQPublisher.publish(_teamId, "PaymentTransaction", correlationId, PayloadOperation.UPDATE, convertData(PaymentTransactionSchema, newPaymentTransaction));

        // if (paymentIntent.status == 'succeeded') {
        //     logger.LogInfo('Payment processing succeeded', paymentIntent);

        //     let updatedInvoice: any = await invoiceService.updateInvoice(_teamId, invoice._id, { paidAmount: invoice.paidAmount + amount, status: InvoiceStatus.PAID }, correlationId);
        //     await SGUtils.CreateAndSendInvoice(team, updatedInvoice, paymentTransactionData, logger);

        //     if (team.paymentStatus == TeamPaymentStatus.DELINQUENT) {
        //         const getDelinquentInvoices: InvoiceSchema[] = await invoiceService.findAllInvoicesInternal({ _teamId, status: InvoiceStatus.REJECTED }, '_id');
        //         if (_.isArray(getDelinquentInvoices) && getDelinquentInvoices.length === 0)
        //             await teamService.updateTeam(_teamId, { paymentStatus: TeamPaymentStatus.HEALTHY, paymentStatusDate: new Date() }, correlationId);
        //     }

        //     await rabbitMQPublisher.publish(_teamId, "Invoice", correlationId, PayloadOperation.UPDATE, convertData(InvoiceSchema, updatedInvoice));
        // } else {
        //     logger.LogInfo('Payment processing failed', paymentIntent);
        //     const updatedInvoice: any = await invoiceService.updateInvoice(_teamId, invoice._id, { status: InvoiceStatus.REJECTED }, correlationId);
        //     await rabbitMQPublisher.publish(_teamId, "Invoice", correlationId, PayloadOperation.UPDATE, convertData(InvoiceSchema, updatedInvoice));

        //     if (team.paymentStatus == TeamPaymentStatus.HEALTHY) {
        //         const updatedTeam: any = await teamService.updateTeam(_teamId, { paymentStatus: TeamPaymentStatus.DELINQUENT, paymentStatusDate: new Date() }, correlationId);
        //         await rabbitMQPublisher.publish(_teamId, "Team", correlationId, PayloadOperation.UPDATE, convertData(TeamSchema, updatedTeam));
        //     }
        // }

        // return paymentTransactionData;
    }
}

export const payInvoiceAutoService = new PayInvoiceAutoService();