import { convertData } from '../utils/ResponseConverters';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as config from 'config';
import * as mongodb from 'mongodb';
import * as braintree from 'braintree';


export class BraintreeClientTokenService {

    public async createBraintreeClientToken(_teamId: mongodb.ObjectId): Promise<object> {

        let merchantId = config.get('braintreeMerchantId');
        let publicKey = config.get('braintreePublicKey');
        let privateKey = config.get('braintreePrivateKey');

        let gateway = braintree.connect({
            environment: braintree.Environment.Sandbox,
            merchantId: merchantId,
            publicKey: publicKey,
            privateKey: privateKey
        });

        return await new Promise((resolve, reject) => {
            gateway.clientToken.generate({
                customerId: _teamId.toHexString()
            }, (err, response) => {
                if (err) console.log('err -> ', err);
                console.log('response -> ', JSON.stringify(response, null, 4));
                let clientToken = response.clientToken;
                console.log('clientToken -> ', clientToken);
                resolve({ token: clientToken });
            });
        });
    }
}

export const braintreeClientTokenService = new BraintreeClientTokenService();