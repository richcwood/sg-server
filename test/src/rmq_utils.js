#!/usr/bin/env node
const util = require('util');
const config = require("config");
const KikiLogger_1 = require("../../server/src/shared/KikiLogger");

const rmqAdminUrl = config.get('rmqAdminUrl');
let rmqVhost = config.get('rmqVhost');

const RabbitMQAdmin_1 = require("../../server/src/shared/RabbitMQAdmin");
let appName = 'rmq_utils';
let logger = new KikiLogger_1.BaseLogger(appName, {});
logger.Start();


let orgsToKeep = ['5de95c0453162e8891f5a830'];

(async () => {
    try {
        const rmqAdmin = new RabbitMQAdmin_1.RabbitMQAdmin(rmqAdminUrl, rmqVhost, logger);

        let res;

        // let res = await rmqAdmin.createExchange('test.job', 'topic', 'false', 'true');
        // console.log(res);
        // res = await rmqAdmin.bindExchanges('test.job', 'worker', 'agent.completed_task');
        // console.log(res);
        // let res = await rmqAdmin.deleteExchange('test.job');
        // console.log(res);

        // let res = await rmqAdmin.purgeQueue('execute_job');
        // console.log(res);

        // res = await rmqAdmin.purgeQueue('completed_job');
        // console.log(res);

        // res = await rmqAdmin.purgeQueue('agent.heartbeat');
        // console.log(res);

        // res = await rmqAdmin.purgeQueue('agent_log');
        // console.log(res);

        // res = await rmqAdmin.purgeQueue('task_status_monitor');
        // console.log(res);

        if (process.argv[2]) {
            let queues = await rmqAdmin.getQueues(process.argv[2]);
            console.log(queues);
            
            for (let index = 0; index < queues.length; index++) {
                try {
                    let remove = true;
                    for (let i = 0; i < orgsToKeep.length; i++) {
                        if (queues[index].indexOf(orgsToKeep[i]) >= 0) {
                            if (queues[index].indexOf('updater') < 0)
                                remove = false;
                            break;
                        }
                    }

                    if (remove) {
                        let res = await rmqAdmin.deleteQueue(queues[index]);
                        // console.log('remove queue res -> ', res);
                    }
                    // console.log(res);
                } catch(e) {
                    console.log(`Error deleting queue: "${queues[index]}": ${util.inspect(e, false, null)}`);
                }
            }
        }

        if (process.argv[3]) {
            let exchanges = await rmqAdmin.getExchanges(process.argv[3]);
            console.log(exchanges);
            
            for (let index = 0; index < exchanges.length; index++) {
                try {
                    let remove = true;
                    for (let i = 0; i < orgsToKeep.length; i++) {
                        if (exchanges[index].indexOf(orgsToKeep[i]) >= 0) {
                            remove = false;
                            break;
                        }
                    }

                    if (remove) {
                        let res = await rmqAdmin.deleteExchange(exchanges[index]);
                        // console.log('remove exchange res -> ', res);
                    }
                    // console.log(res);
                } catch(e) {
                    console.log(`Error deleting exchange: "${exchanges[index]}": ${util.inspect(e, false, null)}`);
                }
            }
        }

        if (process.argv[4]) {
            let users = await rmqAdmin.getUsers(process.argv[4]);
            console.log(users);
            
            for (let index = 0; index < users.length; index++) {
                try {
                    let remove = true;
                    for (let i = 0; i < orgsToKeep.length; i++) {
                        if (users[index].indexOf(orgsToKeep[i]) >= 0) {
                            remove = false;
                            break;
                        }
                    }

                    if (remove) {
                        let res = await rmqAdmin.deleteUser(users[index]);
                        // console.log('remove user res -> ', res);
                    }
                } catch(e) {
                    console.log(`Error deleting user: "${users[index]}": ${util.inspect(e, false, null)}`);
                }
            }
        }
    }
    catch (e) {
        console.error(e);
    }
})();


// to delete all exchange, queues and users except our test items:  node test/dist/test/src/rmq_utils.js ^org- ^org- ^5