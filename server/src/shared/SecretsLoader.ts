import { SecretsManager } from '../shared/SecretsManager';

import * as config from 'config';

export class SecretsLoader {
    static async loadRabbitMQ(logger) {
        const rabbitmqCredentials: any = config.get('rabbitmq-credentials');
        const awsProfile: string = rabbitmqCredentials.awsProfile;
        const awsRegion: string = rabbitmqCredentials.AWS_REGION;
        const secretsManager = new SecretsManager({ awsProfile, AWS_REGION: awsRegion }, logger);
        const secretName: string = rabbitmqCredentials.secretName;
        const rmqSecretsJson: any = await secretsManager.getSecret(secretName);
        const rmqSecrets = JSON.parse(rmqSecretsJson);
        for (let key of Object.keys(rmqSecrets)) {
            process.env[key] = rmqSecrets[key];
        }
    }
}
