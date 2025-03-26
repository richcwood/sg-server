const Stripe = require('stripe');

import * as mongodb from 'mongodb';

import { TeamSchema } from '../domain/Team';

import { teamService } from './TeamService';
import { userService } from './UserService';

import { MissingObjectError } from '../utils/Errors';

export class StripeClientTokenService {
    public async createStripeCustomer(team: TeamSchema): Promise<object> {
        const stripe = new Stripe(process.env.stripePrivateKey, process.env.stripeApiVersion);

        let email = team.billing_email;
        if (!email) {
            const user: any = await userService.findUser(team.ownerId, 'email');
            email = user.email;
        }
        return await new Promise(async (resolve, reject) => {
            try {
                let address: any = {
                    line1: team.billing_address1,
                    line2: team.billing_address2,
                    city: team.billing_city,
                    country: team.billing_country,
                    postal_code: team.billing_zip,
                    state: team.billing_state,
                };
                let metadata: any = {
                    _teamId: team._id.toHexString(),
                };
                let customer = await stripe.customers.create({
                    address: address,
                    description: team.name,
                    email: email,
                    metadata: metadata,
                    name: team.name,
                    phone: team.billing_phone,
                });

                resolve({ success: true, customer });
            } catch (err) {
                reject({ success: false, err });
            }
        });
    }

    public async createStripeClientSecret(_teamId: mongodb.ObjectId): Promise<object> {
        const team: TeamSchema = <TeamSchema>await teamService.findTeam(_teamId, 'stripe_id');
        if (!team) throw new MissingObjectError(`Team "${_teamId.toHexString()}" not found`);

        const stripe = new Stripe(process.env.stripePrivateKey, process.env.stripeApiVersion);

        return await new Promise(async (resolve, reject) => {
            try {
                let intent = await stripe.setupIntents.create({
                    customer: team.stripe_id,
                });
                resolve({ success: true, intent });
            } catch (err) {
                resolve({ success: false, err });
            }
        });
    }
}

export const stripeClientTokenService = new StripeClientTokenService();
