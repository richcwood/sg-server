/**
 * Created by richwood on 3/1/18.
 */

import * as mongodb from 'mongodb';
import { AnyCnameRecord } from 'dns';
let mongoClient = mongodb.MongoClient;

export class MongoRepo {
    private db: any;
    // private logger: SGLogger.MongoLogger;
    constructor(public appName: string, public mongoDbUrl: string, public dbName: string, private logger: any) {
        // this.logger = new SGLogger.MongoLogger(appName);
    }

    LogError(msg: string, stackTrace: string, values: any) {
        this.logger.LogError(msg, Object.assign({'StackTrace': stackTrace, '_appName': this.appName}, values));
    }

    LogWarning(msg: string, values: any) {
        this.logger.LogWarning(msg, Object.assign({'_appName': this.appName}, values));
    }

    LogInfo(content: string, consumerTag: string, redelivered: boolean, destination: string, values: any) {
        this.logger.LogInfo(Object.assign({'_appName': this.appName, 'Content': content, 'ConsumerTag': consumerTag, 'Redelivered': redelivered, 'Destination': destination}, values));
    }

    LogDebug(msg: string, values: any) {
        this.logger.LogDebug(Object.assign({'_appName': this.appName, 'Msg': msg}, values));
    }

    Connect() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
            } else {
                mongoClient.connect(this.mongoDbUrl, (err, client) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.db = client.db(this.dbName);
                        resolve(this.db);
                    }
                });
            }
        });
    }

    DropCollection(collectionName: string) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                this.db.collection(collectionName).drop( (err, res) =>
                {
                    if (err) {
                        if (err.message == 'ns not found')
                            resolve(true);
                        else
                            reject(err);
                    }
                    this.LogWarning('Dropped collection', {'CollectionName': collectionName});
                    resolve(res);
                });
            } catch (e) {
                this.LogError('Error dropping collection: ' + e.message, e.StackTrace, {'CollectionName': collectionName});
                reject(e);
            }
        });
    }

    GetById(id: string, collectionName: string, projectionDoc: any) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                let query: any = {_id: new mongodb.ObjectId(id)};
                this.db.collection(collectionName).findOne(query, {fields: projectionDoc}, (err, doc) =>
                {
                    if (err) reject(err);
                    resolve(doc);
                });
            } catch (e) {
                this.LogError('Error in GetById: ' + e.message, e.StackTrace, {'id': id, 'CollectionName': collectionName, 'ProjectionDoc': projectionDoc});
                reject(e);
            }
        });
    }

    GetOneByQuery(query: any, collectionName: string, projectionDoc: any) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                this.db.collection(collectionName).findOne(query, {fields: projectionDoc}, (err, doc) =>
                {
                    if (err) reject(err);
                    resolve(doc);
                });
            } catch (e) {
                this.LogError('Error in GetOneByQuery: ' + e.message, e.StackTrace, {'Query': query, 'CollectionName': collectionName, 'ProjectionDoc': projectionDoc});
                reject(e);
            }
        });
    }

    GetManyByQuery(query: any, collectionName: string, projectionDoc: any = {}, sort: any = {}) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                this.db.collection(collectionName).find(query, projectionDoc).sort(sort).toArray( (err, docs) => {
                    if (err) reject(err);
                    resolve(docs);
                });
            } catch (e) {
                this.LogError('Error in GetManyByQuery: ' + e.message, e.StackTrace, {'Query': query, 'CollectionName': collectionName});
                reject(e);
            }
        });
    }

    DeleteById(id: string, collectionName: string) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                let query: any = {_id: new mongodb.ObjectId(id)};
                this.db.collection(collectionName).deleteOne(query, (err, r) => {
                    if (err) reject(err);
                    resolve(r.deletedCount);
                });
            } catch (e) {
                this.LogError('Error in DeleteById: ' + e.message, e.StackTrace, {'id': id, 'CollectionName': collectionName});
                reject(e);
            }
        });
    }

    DeleteByQuery(query: any, collectionName: string) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                this.db.collection(collectionName).deleteMany(query, (err, r) => {
                    if (err) reject(err);
                    resolve(r.deletedCount);
                });
            } catch (e) {
                this.LogError('Error in DeleteByQuery: ' + e.message, e.StackTrace, {'Query': query, 'CollectionName': collectionName});
                reject(e);
            }
        });
    }

    InsertOne(values: any, collectionName: string) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                this.db.collection(collectionName).insertOne(values, (err, r) => {
                    if (err) reject(err);
                    resolve([r.insertedCount, r.insertedId, r.ops]);
                });
            } catch (e) {
                this.LogError('Error in InsertOne: ' + e.message, e.StackTrace, {'Values': values, 'CollectionName': collectionName});
                reject(e);
            }
        });
    }

    InsertMany(values: any[], collectionName: string) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                this.db.collection(collectionName).insertMany(values, (err, r) => {
                    if (err) reject(err);
                    resolve([r.insertedCount, r.insertedIds]);
                });
            } catch (e) {
                this.LogError('Error in InsertMany: ' + e.message, e.StackTrace, {'CollectionName': collectionName});
                reject(e);
            }
        });
    }

    UpdateMany(collectionName: string, selector: any, document: any) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                this.db.collection(collectionName).updateMany(selector, document, (err, r) => {
                    if (err) reject(err);
                    resolve(r);
                });
            } catch (e) {
                this.LogError('Error in Update: ' + e.message, e.StackTrace, {'CollectionName': collectionName});
                reject(e);
            }
        });
    }

    Update(collectionName: string, selector: any, document: any, projectionDoc: any = {}, options: any = {}, arrayFilters: any[] = []) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                this.db.collection(collectionName).findOneAndUpdate(selector, document, Object.assign({projection: projectionDoc, arrayFilters: arrayFilters}, options), (err, r) => {
                    if (err) reject(err);
                    resolve(r);
                });
            } catch (e) {
                this.LogError('Error in Update: ' + e.message, e.StackTrace, {'CollectionName': collectionName});
                reject(e);
            }
        });
    }

    Upsert(collectionName: string, selector: any, document: any, options: any = {}, arrayFilters: any = {}) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                this.db.collection(collectionName).findOneAndUpdate(selector, document, Object.assign({upsert: true, arrayFilters: arrayFilters}, options), (err, r) => {
                    if (err) reject(err);
                    resolve(r);
                });
            } catch (e) {
                this.LogError('Error in Update: ' + e.message, e.StackTrace, {'CollectionName': collectionName});
                reject(e);
            }
        });
    }

    ReplaceOne(collectionName: string, selector: any, document: any) {
        return new Promise( async (resolve, reject) => {
            try {
                await this.Connect();
                this.db.collection(collectionName).replaceOne(selector, document, (err, r) => {
                    if (err) reject(err);
                    resolve(r);
                });
            } catch (e) {
                this.LogError('Error in Update: ' + e.message, e.StackTrace, {'CollectionName': collectionName});
                reject(e);
            }
        });
    }

    GetObjectId() {
        return new mongodb.ObjectId();
    }

    ObjectIdFromString(id) {
        return new mongodb.ObjectId(id);
    }
}
