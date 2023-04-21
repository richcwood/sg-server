const NodeCache = require('node-cache');

import * as AWS from 'aws-sdk';

import { SecretsManager } from './SecretsManager';
import { BaseLogger } from './SGLogger';

jest.mock('aws-sdk');

jest.mock('node-cache', () => {
    return jest.fn().mockImplementation(() => {
        return {
            set: jest.fn(),
            get: jest.fn(),
        };
    });
});

describe('SecretsManager', () => {
    const awsRegion = 'us-east-2';
    const awsProfile = 'default';
    const params = { awsProfile: 'default', AWS_REGION: awsRegion, STDTTL: 120 };
    const awsSecretsManagerConstructorParams = { profile: awsProfile };
    const secretName = 'my-secret';
    const secretValue = 'my-secret-value';

    let clientGetSecretValueSpy: jest.SpyInstance;
    let cacheSetSpy: jest.SpyInstance;
    let cacheGetSpy: jest.SpyInstance;
    let secretsManager: SecretsManager;

    let logger;

    beforeAll(async () => {
        logger = new BaseLogger('SecretsManagerTest');
        logger.Start();
    });

    beforeEach(() => {
        clientGetSecretValueSpy = jest.fn().mockImplementation(() => {
            return {
                promise: jest.fn().mockResolvedValue({ SecretString: secretValue }),
            };
        });
        ((<unknown>AWS.SecretsManager) as jest.Mock).mockImplementation(() => {
            return {
                getSecretValue: clientGetSecretValueSpy,
            } as unknown as AWS.SecretsManager;
        });

        secretsManager = new SecretsManager(params, logger);

        cacheSetSpy = jest.spyOn((<any>secretsManager).cache, 'set');
        cacheGetSpy = jest.spyOn((<any>secretsManager).cache, 'get');
        cacheGetSpy.mockReturnValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should create an AWS.SecretsManager client with the provided params', () => {
            expect(AWS.SecretsManager).toHaveBeenCalledWith({
                region: awsRegion,
                ...awsSecretsManagerConstructorParams,
            });
        });
    });

    describe('getSecret', () => {
        it('should retrieve the secret value from the cache if it is present', async () => {
            cacheGetSpy.mockReturnValue(secretValue);

            const result = await secretsManager.getSecret(secretName);

            expect(result).toEqual(secretValue);
            expect(clientGetSecretValueSpy).not.toHaveBeenCalled();
            expect(cacheSetSpy).not.toHaveBeenCalled();
            expect(cacheGetSpy).toHaveBeenCalledWith(secretName);
        });

        it('should retrieve the secret value from AWS if it is not present in the cache', async () => {
            const result = await secretsManager.getSecret(secretName);

            expect(result).toEqual(secretValue);
            expect(clientGetSecretValueSpy).toHaveBeenCalledWith({ SecretId: secretName });
            expect(cacheSetSpy).toHaveBeenCalledWith(secretName, secretValue);
            expect(cacheGetSpy).toHaveBeenCalledWith(secretName);
        });

        it('should throw an error if the secret value is not found in AWS', async () => {
            clientGetSecretValueSpy.mockImplementation(() => {
                return {
                    promise: jest.fn().mockResolvedValue({}),
                };
            });
            let error: Error | undefined;
            try {
                await secretsManager.getSecret(secretName);
            } catch (e) {
                error = e;
            }

            expect(error).toBeDefined();
            expect(error?.message).toEqual('Secret value not found');
            expect(cacheSetSpy).not.toHaveBeenCalled();
            expect(cacheGetSpy).toHaveBeenCalledWith(secretName);
        });
    });
});
