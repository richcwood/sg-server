const NodeCache = require('node-cache');

import * as AWS from 'aws-sdk';

import { BaseLogger } from './SGLogger';

export class SecretsManager {
    private readonly client: AWS.SecretsManager;
    private readonly cache: typeof NodeCache;
    private readonly logger: BaseLogger;

    constructor(params, logger) {
        this.logger = logger;
        const awsRegion: string = params['AWS_REGION'];
        const stdTTL: number = params['STDTTL'] || 60;
        const checkperiod: number = params['CHECK_PERIOD'] || 30;
        const options = this.getAWSCredentialsOptions(params);
        this.client = new AWS.SecretsManager({ region: awsRegion, ...options });
        this.cache = new NodeCache({ stdTTL, checkperiod });
    }

    private getAWSCredentialsOptions(params): any {
        let options = {};
        const awsAccessKeyId: string = process.env.AWS_ACCESS_KEY_ID;
        const awsSecretAccessKey: string = process.env.AWS_SECRET_ACCESS_KEY;
        const awsProfile: string = params['awsProfile'];

        if (awsAccessKeyId && awsSecretAccessKey) {
            options['credentials'] = {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
            };
        } else if (awsProfile) {
            options['profile'] = awsProfile;
        } else {
            this.logger.LogWarning('No AWS credentials provided - defaulting to host assigned IAM role', params);
        }

        return options;
    }

    async getSecret(secretName: string): Promise<string> {
        const cachedValue = this.cache.get(secretName);
        if (cachedValue) {
            console.log(`Retrieved secret ${secretName} from cache`);
            return cachedValue;
        }
        const data = await this.client.getSecretValue({ SecretId: secretName }).promise();
        if (!data.SecretString) {
            throw new Error('Secret value not found');
        }
        const secretValue = data.SecretString;
        this.cache.set(secretName, secretValue);
        return secretValue;
    }
}

export class SecretsLoader {
    static async loadSecrets(credentials_config, logger) {
        logger.LogInfo('Loading secrets', { name: credentials_config['name'] });
        const credentials = credentials_config['credentials'];
        const awsProfile: string = credentials.awsProfile;
        const awsRegion: string = credentials.AWS_REGION;
        const secretsManager = new SecretsManager({ awsProfile, AWS_REGION: awsRegion }, logger);
        const secretName: string = credentials.secretName;
        const rmqSecretsJson: any = await secretsManager.getSecret(secretName);
        const rmqSecrets = JSON.parse(rmqSecretsJson);
        for (let key of Object.keys(rmqSecrets)) {
            process.env[key] = rmqSecrets[key];
        }
    }
}
