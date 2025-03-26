import { convertData } from '../utils/ResponseConverters';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { TeamSchema } from '../domain/Team';
import * as config from 'config';
import * as mongodb from 'mongodb';
import * as braintree from 'braintree';

export class BraintreeClientTokenService {
    public async createBrainTreeCustomer(team: TeamSchema): Promise<object> {
        let merchantId = config.get('braintreeMerchantId');
        let publicKey = config.get('braintreePublicKey');
        let privateKey = config.get('braintreePrivateKey');

        let gateway = braintree.connect({
            environment: braintree.Environment.Sandbox,
            merchantId: merchantId,
            publicKey: publicKey,
            privateKey: privateKey,
        });

        return await new Promise(async (resolve, reject) => {
            let result = await gateway.customer.create({
                id: team.id.toHexString(),
                firstName: team.name,
            });

            resolve(result);
        });
    }

    public async createBraintreeClientToken(_teamId: mongodb.ObjectId): Promise<object> {
        let merchantId = config.get('braintreeMerchantId');
        let publicKey = config.get('braintreePublicKey');
        let privateKey = config.get('braintreePrivateKey');

        let gateway = braintree.connect({
            environment: braintree.Environment.Sandbox,
            merchantId: merchantId,
            publicKey: publicKey,
            privateKey: privateKey,
        });

        return await new Promise(async (resolve, reject) => {
            let result = await gateway.clientToken.generate({
                customerId: _teamId.toHexString(),
            });

            if (!result.success) {
                return reject(result.message);
            } else {
                let clientToken = result.clientToken;
                return resolve({ token: clientToken });
            }
            // }, (err, response) => {
            //     if (err) {
            //         reject(err);
            //         return;
            //     }

            //     if (!response.success) {
            //         reject(response.message);
            //         return;
            //     }

            //     let clientToken = response.clientToken;
            //     resolve({ token: clientToken });
            // });
        });
    }
}

export const braintreeClientTokenService = new BraintreeClientTokenService();
