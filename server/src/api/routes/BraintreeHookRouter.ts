import { NextFunction, Request, Response, Router } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import * as config from 'config';
import * as braintree from 'braintree';


const env = config.get('environment');
let merchantId = config.get('braintreeMerchantId');
let publicKey = config.get('braintreePublicKey');
let privateKey = config.get('braintreePrivateKey');

export default class BraintreeHookRouter {
    public router: Router;
    private gateway: any = undefined;

    constructor() {
        this.router = Router();

        this.gateway = braintree.connect({
            environment: braintree.Environment.Sandbox,
            merchantId: merchantId,
            publicKey: publicKey,
            privateKey: privateKey
        });

        this.setRoutes();
    }

    setRoutes() {
        this.router.post('/', this.create.bind(this));
    }

    async create(req: Request, res: Response, next: NextFunction) {
        const response: ResponseWrapper = (res as any).body;

        this.gateway.webhookNotification.parse(
            req.body.bt_signature,
            req.body.bt_payload,
            function (err, webhookNotification) {
                console.log('webhook subscription id -> ', webhookNotification.subscription.id);
                // "myId"
            }
        );

        response.data = '';
        response.statusCode = ResponseCode.NOT_AVAILABLE;
        next();
    }
}