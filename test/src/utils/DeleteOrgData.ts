import * as config from 'config';
import { MongoRepo } from '../../../server/src/shared/MongoLib';
import { BaseLogger } from '../../../server/src/shared/SGLogger';
import * as mongodb from 'mongodb';
import * as mongoose from 'mongoose';
const readline = require('readline');


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


let DeleteOrgJobData = async (orgId: string) => {
    mongoose.connect(config.get('mongoUrl'), { useNewUrlParser: true });

    const mongoUrl = config.get('mongoUrl');
    const mongoDbname = config.get('mongoDbName');

    let logger = new BaseLogger('RunTestHarness');
    logger.Start();

    let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);

    console.log('mongo url -> ', config.get('mongoUrl'));

    const filter: any = { "_orgId": new mongodb.ObjectId(orgId) };

    let res;
    res = await mongoRepo.DeleteByQuery(filter, 'job');
    console.log(`deleted ${res} jobs`);
    res = await mongoRepo.DeleteByQuery(filter, 'jobDef');
    console.log(`deleted ${res} jobDefs`);
    res = await mongoRepo.DeleteByQuery(filter, 'step');
    console.log(`deleted ${res} steps`);
    res = await mongoRepo.DeleteByQuery(filter, 'stepDef');
    console.log(`deleted ${res} stepDefs`);
    res = await mongoRepo.DeleteByQuery(filter, 'stepOutcome');
    console.log(`deleted ${res} stepOutcomes`);
    res = await mongoRepo.DeleteByQuery(filter, 'task');
    console.log(`deleted ${res} tasks`);
    res = await mongoRepo.DeleteByQuery(filter, 'taskDef');
    console.log(`deleted ${res} taskDefs`);
    res = await mongoRepo.DeleteByQuery(filter, 'taskOutcome');
    console.log(`deleted ${res} taskOutcomes`);
    res = await mongoRepo.DeleteByQuery(filter, 'schedule');
    console.log(`deleted ${res} schedules`);

    process.exit();
}

const orgId = process.argv[2];

console.log(`Deleting data for org ${orgId} from ${config.get('mongoUrl')}`);

rl.question("continue? (y/n) ", function (yesno) {
    if (yesno != 'y') {
        rl.close()
        process.exit();
    } else {
        rl.close();
    }
});

DeleteOrgJobData(orgId);

// node test/dist/test/src/utils/LoadMongoData.js './demo.json' '5e99cbcb2317950015edb655'
