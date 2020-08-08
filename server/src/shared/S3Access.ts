import * as fs from 'fs';
import * as aws from 'aws-sdk';
import * as config from 'config';
import * as _ from 'lodash';


const s3 = new aws.S3({
  credentials: {
    accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY')
  }
});


export class S3Access {
  constructor() { }

  async uploadFileToS3(filePath: string, s3Path: string, bucket: string) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (err, data) => {
        if (err) reject(err);

        // const s3Path = `${uniqueId}/${path.basename(filePath)}`;

        const params = {
          Bucket: bucket,
          Key: s3Path,
          Body: data
        };

        // let options = {partSize: 10 * 1024 * 1024, queueSize: 1};
        let options = {};
        s3.upload(params, options, (s3Err, data) => {
          if (s3Err) reject(s3Err)
          resolve(`File uploaded successfully to ${data.Location}`);
        });
      });
    });
  }


  async deleteFileFromS3(s3Path: string, bucket: string) {
    return new Promise((resolve, reject) => {
      if (!this.objectExists(s3Path, bucket)) {
        resolve();
        return;
      }

      const params = {
        Bucket: bucket,
        Key: s3Path
      };

      s3.deleteObject(params, (s3Err, data) => {
        if (s3Err) reject(s3Err)
        resolve();
      });
    });
  }


  async getSignedS3URL(s3FilePath: string, bucket: string) {
    const params = { Bucket: bucket, Key: s3FilePath, Expires: parseInt(config.get('S3_URL_EXPIRATION_SECONDS'), 10) }
    return s3.getSignedUrl('getObject', params);
  }


  async putSignedS3URL(s3FilePath: string, bucket: string, contentType: string) {
    const params = { Bucket: bucket, Key: s3FilePath, Expires: parseInt(config.get('S3_URL_EXPIRATION_SECONDS'), 10), ContentType: contentType }
    return s3.getSignedUrl('putObject', params);
  }


  async objectExists(s3FilePath: string, bucket: string) {
    const params = {
      Bucket: bucket,
      Key: s3FilePath
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
      MaxKeys: 2
    };

    if (token)
      params.ContinuationToken = token;

    return new Promise((resolve, reject) => {
      s3.listObjectsV2(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          // console.log(JSON.stringify(data, null, 4));

          if (_.isArray(data.Contents) && data.Contents.length > 0) {
            for (let i = 0; i < data.Contents.length; i++) {
              console.log(`${data.Contents[i].Key} - ${data.Contents[i].Size}`);
              size += data.Contents[i].Size;
            }
          }

          if (data.IsTruncated) {
            size = (<number>await this.sizeOf(prefix, bucket, size, data.NextContinuationToken));
          }

          resolve(size);
        }
      });
    });
  }
}