import {convertData} from "../utils/ResponseConverters";
import {rabbitMQPublisher, PayloadOperation} from "../utils/RabbitMQPublisher";
import {MissingObjectError, ValidationError} from "../utils/Errors";
import {TeamSchema} from "../domain/Team";
import * as config from "config";
import * as mongodb from "mongodb";
import {Stripe} from "stripe";
import {teamService} from "./TeamService";

export class StripeClientTokenService {
  public async createStripeCustomer(team: TeamSchema): Promise<object> {
    // let merchantId = config.get('stripeMerchantId');
    let stripeApiVersion = config.get("stripeApiVersion");
    let publicKey = config.get("stripePublicKey");
    let privateKey = config.get("stripePrivateKey");

    const stripe = new Stripe(privateKey, stripeApiVersion);

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
          email: team.billing_email,
          metadata: metadata,
          name: team.name,
          phone: team.billing_phone,
        });

        resolve({succes: true, customer});
      } catch (err) {
        reject({succes: false, err});
      }
    });
  }

  public async createStripeClientSecret(_teamId: mongodb.ObjectId): Promise<object> {
    const team: TeamSchema = <TeamSchema>await teamService.findTeam(_teamId, "stripe_id");
    if (!team) throw new MissingObjectError(`Team "${_teamId.toHexString()}" not found`);

    let stripeApiVersion = config.get("stripeApiVersion");
    let publicKey = config.get("stripePublicKey");
    let privateKey = config.get("stripePrivateKey");

    const stripe = new Stripe(privateKey, stripeApiVersion);

    return await new Promise(async (resolve, reject) => {
      try {
        let intent = await stripe.setupIntents.create({
          customer: team.stripe_id,
        });
        resolve({success: true, intent});
      } catch (err) {
        resolve({success: false, err});
      }
    });
  }
}

export const stripeClientTokenService = new StripeClientTokenService();
