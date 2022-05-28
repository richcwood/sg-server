import * as mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server'
import { BaseLogger } from '../shared/SGLogger'

let logger: BaseLogger = new BaseLogger('MongoConnector');
logger.Start();

(<any>mongoose).Promise = global.Promise;
mongoose.set('debug', process.env.DEBUG !== undefined);

const opts = {
    useUnifiedTopology: true,
    //   useCreateIndex: config.mongo.useCreateIndex,
    keepAlive: true,
    keepAliveInitialDelay: 300000,
    autoIndex: false,
    //   autoIndex: config.mongo.autoIndex,
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000 // Close sockets after 45 seconds of inactivity
}

class MongoConnection {
    private static _instance: MongoConnection;

    private _mongoServer?: MongoMemoryServer;

    static getInstance(): MongoConnection {
        if (!MongoConnection._instance) {
            MongoConnection._instance = new MongoConnection();
        }
        return MongoConnection._instance;
    }

    public async open(): Promise<void> {
        try {
            logger.LogDebug('connecting to inmemory mongo db', {});
            this._mongoServer = await MongoMemoryServer.create();
            const mongoUrl = this._mongoServer.getUri();
            await mongoose.connect(mongoUrl, opts);

            mongoose.connection.on('connected', () => {
                logger.LogInfo('Mongo: connected', {});
            })

            mongoose.connection.on('disconnected', () => {
                logger.LogError('Mongo: disconnected', {});
            })

            mongoose.connection.on('error', (err) => {
                logger.LogError('Mongo: error', { Error: err });
                if (err.name === "MongoNetworkError") {
                    setTimeout(function () {
                        mongoose.connect(mongoUrl, opts).catch(() => { })
                    }, 5000);
                }
            })
        } catch (err) {
            logger.LogError('db.open: error', { Error: err });
            throw err;
        }
    }

    public async close(): Promise<void> {
        try {
            await mongoose.disconnect();
            await this._mongoServer!.stop();
        } catch (err) {
            logger.LogError('db.open: error', { Error: err });
            throw err;
        }
    }


    public async clearDatabase(): Promise<void> {
        try {
            const collections = mongoose.connection.collections;

            for (const key in collections) {
                const collection = collections[key];
                await collection.deleteMany({});
            }            
        } catch (err) {
            logger.LogError('db.clearDatabase: error', { Error: err });
            throw err;
        }
    }
}

export default MongoConnection.getInstance()