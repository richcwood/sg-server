import * as fs from 'fs';
import * as aws from 'aws-sdk';
import * as config from 'config';
import * as _ from 'lodash';

const s3 = new aws.S3({
    credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
    },
    region: config.get('AWS_REGION'),
});

export class S3Access {
    constructor() {}

    async downloadFile(filePath: string, s3Path: string, bucket: string) {
        return new Promise((resolve, reject) => {
            const params = {
                Bucket: bucket,
                Key: s3Path,
            };
            s3.getObject(params, (s3Err, data) => {
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
                s3.upload(params, options, (s3Err, data) => {
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

            s3.copyObject(params, (s3Err, data) => {
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

            s3.deleteObject(params, (s3Err, data) => {
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

        const listedObjects = await s3.listObjectsV2(listParams).promise();

        if (listedObjects.Contents.length === 0) return;

        const deleteParams = {
            Bucket: bucket,
            Delete: { Objects: [] },
        };

        listedObjects.Contents.forEach(({ Key }) => {
            deleteParams.Delete.Objects.push({ Key });
        });

        await s3.deleteObjects(deleteParams).promise();

        if (listedObjects.IsTruncated) await this.emptyS3Folder(prefix, bucket);
    }

    async getSignedS3URL(s3FilePath: string, bucket: string) {
        const params = {
            Bucket: bucket,
            Key: s3FilePath,
            Expires: parseInt(config.get('S3_URL_EXPIRATION_SECONDS'), 10),
        };
        return s3.getSignedUrl('getObject', params);
    }

    async putSignedS3URL(s3FilePath: string, bucket: string, contentType: string) {
        const params = {
            Bucket: bucket,
            Key: s3FilePath,
            Expires: parseInt(config.get('S3_URL_EXPIRATION_SECONDS'), 10),
            ContentType: contentType,
        };
        return s3.getSignedUrl('putObject', params);
    }

    async objectExists(s3FilePath: string, bucket: string) {
        const params = {
            Bucket: bucket,
            Key: s3FilePath,
        };

        return new Promise((resolve, reject) => {
            s3.headObject(params, async (err, data) => {
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
            s3.listObjectsV2(params, async (err, data) => {
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
