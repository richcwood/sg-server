const mongodb = require("mongodb");
const { MongoLib_1 } = require('kiki');

const mongoRepo = new MongoLib_1.default('test', 'mongodb://dbusr:D5JkSr4KkD@ds233228.mlab.com:33228/heroku_zlhlm2nm', 'heroku_zlhlm2nm');

( async () => {
    await mongoRepo.DropCollection('agent');
    await mongoRepo.DropCollection('jobDef');
    await mongoRepo.DropCollection('job');
    await mongoRepo.DropCollection('team');
    await mongoRepo.DropCollection('org');
    await mongoRepo.DropCollection('task');
    await mongoRepo.DropCollection('task_agent');

    // await mongoRepo.Update('test', {_id: 2}, {$set: {expdata: mongodb.Long(0)}});
    // await mongoRepo.Update('test', {_id: 2}, {$bit: {expdata: {or: 5}}});
    // await mongoRepo.Update('test', {_id: 2}, {$bit: {expdata: {or: 7}}});
    process.exit();
})();
