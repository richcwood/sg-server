import * as AWS from 'aws-sdk';
import * as config from 'config';
import * as fs from 'fs';
import * as _ from 'lodash';

import { BaseLogger } from './SGLogger';

export class S3Access {
    private readonly client: AWS.S3;
    private readonly logger: BaseLogger;

    constructor(logger) {
        this.logger = logger;
        const region: string = config.get('AWS_REGION');
        const options = this.getAWSCredentialsOptions();
        this.client = new AWS.S3({ region, ...options });
    }

    private getAWSCredentialsOptions(): any {
        let options = {};
        const awsAccessKeyId: string = process.env.AWS_ACCESS_KEY_ID;
        const awsSecretAccessKey: string = process.env.AWS_SECRET_ACCESS_KEY;
        let awsProfile: string = '';
        if (config.has('awsProfile')) awsProfile = config.get('awsProfile');

        if (awsAccessKeyId && awsSecretAccessKey) {
            options['credentials'] = {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
            };
        } else if (awsProfile) {
            options['profile'] = awsProfile;
        } else {
            this.logger.LogWarning('No AWS credentials provided - defaulting to host assigned IAM role', {});
        }

        return options;
    }

    async downloadFile(filePath: string, s3Path: string, bucket: string) {
        return new Promise((resolve, reject) => {
            const params = {
                Bucket: bucket,
                Key: s3Path,
            };
            this.client.getObject(params, (s3Err, data) => {
                if (s3Err) {
                    reject(s3Err);
                    return;
                }
                fs.writeFileSync(filePath, data.Body.toString());
                console.log(`${filePath} successfully downloaded`);
                resolve(true);
            });
        });
    }

    async uploadFile(filePath: string, s3Path: string, bucket: string) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (s3Err, data) => {
                if (s3Err) {
                    reject(s3Err);
                    return;
                }

                const params = {
                    Bucket: bucket,
                    Key: s3Path,
                    Body: data,
                };

                // let options = {partSize: 10 * 1024 * 1024, queueSize: 1};
                let options = {};
                this.client.upload(params, options, (s3Err, data) => {
                    if (s3Err) {
                        reject(s3Err);
                        return;
                    }
                    console.log(`File uploaded successfully to ${data.Location}`);
                    resolve(true);
                });
            });
        });
    }

    async copyObject(srcPath: string, destPath: string, destBucket: string) {
        return new Promise((resolve, reject) => {
            const params = {
                Bucket: destBucket,
                CopySource: srcPath,
                Key: destPath,
            };

            this.client.copyObject(params, (s3Err, data) => {
                if (s3Err) {
                    reject(s3Err);
                    return;
                }
                console.log(`Object successfully copied from ${srcPath} to ${destPath}`);
                resolve(data);
            });
        });
    }

    async deleteObject(s3Path: string, bucket: string) {
        return new Promise<void>((resolve, reject) => {
            if (!this.objectExists(s3Path, bucket)) {
                resolve();
                return;
            }

            const params = {
                Bucket: bucket,
                Key: s3Path,
            };

            this.client.deleteObject(params, (s3Err, data) => {
                if (s3Err) {
                    reject(s3Err);
                    return;
                }
                resolve();
            });
        });
    }

    async emptyS3Folder(prefix: string, bucket: string) {
        const listParams = {
            Bucket: bucket,
            Prefix: prefix,
        };

        const listedObjects = await this.client.listObjectsV2(listParams).promise();

        if (listedObjects.Contents.length === 0) return;

        const deleteParams = {
            Bucket: bucket,
            Delete: { Objects: [] },
        };

        listedObjects.Contents.forEach(({ Key }) => {
            deleteParams.Delete.Objects.push({ Key });
        });

        await this.client.deleteObjects(deleteParams).promise();

        if (listedObjects.IsTruncated) await this.emptyS3Folder(prefix, bucket);
    }

    async getSignedS3URL(s3FilePath: string, bucket: string) {
        const params = {
            Bucket: bucket,
            Key: s3FilePath,
            Expires: parseInt(config.get('S3_URL_EXPIRATION_SECONDS'), 10),
        };
        return this.client.getSignedUrl('getObject', params);
    }

    async putSignedS3URL(s3FilePath: string, bucket: string, contentType: string) {
        const params = {
            Bucket: bucket,
            Key: s3FilePath,
            Expires: parseInt(config.get('S3_URL_EXPIRATION_SECONDS'), 10),
            ContentType: contentType,
        };
        return this.client.getSignedUrl('putObject', params);
    }

    async objectExists(s3FilePath: string, bucket: string) {
        const params = {
            Bucket: bucket,
            Key: s3FilePath,
        };

        return new Promise((resolve, reject) => {
            this.client.headObject(params, async (err, data) => {
                if (err) {
                    if (err.code == 'NotFound') {
                        resolve(false);
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(true);
                }
            });
        });
    }

    async sizeOf(prefix, bucket, size: number = 0, token: any = undefined) {
        const params: any = {
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: 2,
        };

        if (token) params.ContinuationToken = token;

        return new Promise((resolve, reject) => {
            this.client.listObjectsV2(params, async (err, data) => {
                if (err) {
                    reject(err);
                    return;
                } else {
                    // console.log(JSON.stringify(data, null, 4));

                    if (_.isArray(data.Contents) && data.Contents.length > 0) {
                        for (let i = 0; i < data.Contents.length; i++) {
                            console.log(`${data.Contents[i].Key} - ${data.Contents[i].Size}`);
                            size += data.Contents[i].Size;
                        }
                    }

                    if (data.IsTruncated) {
                        size = <number>await this.sizeOf(prefix, bucket, size, data.NextContinuationToken);
                    }

                    resolve(size);
                }
            });
        });
    }
}
