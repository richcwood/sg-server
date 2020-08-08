// #!/usr/bin/env node

// const script1 = `
// import time
// print 'start'
// time.sleep(40)
// print 'done'
// print '@kpo{"route": "ok"}'
// `;
// const script1_json = JSON.stringify(script1);

// const script_type = 'python';
// const script_args = '';
// const script_env_vars = {};

// // const script1 = `
// // import sys
// // import redis
// // import json

// // #redis_access = redis.StrictRedis('10.96.81.135')
// // #redis_access = redis.StrictRedis('dlp-ec.rmh0mk.ng.0001.usw2.cache.amazonaws.com', db=0)
// // redis_access = redis.StrictRedis('dlp-ec.rmh0mk.ng.0001.usw2.cache.amazonaws.com', db=15)
// // #redis_access = redis.StrictRedis('nda2-prod-redis.rmh0mk.ng.0001.usw2.cache.amazonaws.com')

// // match_str = sys.argv[1]

// // for k in redis_access.scan_iter(match=match_str, count=1000):
// //     if redis_access.type(k) == 'set':
// //         print '{0} {1}'.format(k, redis_access.smembers(k))
// //     else:
// //         print '{0} {1}'.format(k, redis_access.get(k))
// // `;
// // const script1_json = JSON.stringify(script1);

// // const script_type = 'python';
// // const script_args = 'stage.dlp.WestSide*';

// // const script1 = `
// // #!/bin/bash
// // echo 'starting'
// // echo $1
// // s_val="MY_VAR = $HOME"
// // echo $s_val
// // aws s3 ls s3://nis-datastrategy/DLP/rich/horry/
// // `;
// // const script1_json = JSON.stringify(script1);

// // const script_type = 'sh';
// // const script_args = '"hello world!"';
// // const script_env_vars = { 'MY_VAR': 'var1' };

// // const script1 = `
// // console.log('MY_VAR = ' + process.env.MY_VAR);
// // const config = require('./.nvm/versions/node/v9.5.0/lib/node_modules/config');
// // //let rmqUrl = config.get('rmqUrl');
// // //let rmqUsername = config.get('rmqUsername');
// // //let rmqPassword = config.get('rmqPassword');
// // //let rmqVhost = config.get('rmqVhost');

// // //console.log('rmqUrl == ' + rmqUrl + ', rmqUsername == ' + rmqUsername + ', rmqPassword == ' + rmqPassword);

// // const fs = require('fs');

// // fs.readdirSync('/').forEach(file => {
// //     console.log(file);
// //   });

// // //fs.readFile(__dirname + '/default.json', function (err, data) {
// // //    if (err) throw err;
// // //    console.log(data.toString());
// // //});

// // console.log('done ' + __dirname);
// // `;
// // const script1_json = JSON.stringify(script1);

// // const script_type = 'node';
// // const script_args = '';
// // const script_env_vars = { 'MY_VAR': 'var1' };

// // const script1 = `
// // npm i -g config@1.30.0
// // `;
// // const script1_json = JSON.stringify(script1);

// // const script_type = 'cmd';
// // const script_args = '';

// (async () => {
//     const util = require('util');
//     const config = require("config");
//     let rmqUrl = config.get('rmqUrl');
//     let rmqUsername = config.get('rmqUsername');
//     let rmqPassword = config.get('rmqPassword');
//     let rmqVhost = config.get('rmqVhost');
//     let _orgId = config.get('_orgId');
//     let mongoUrl = config.get('mongoUrl');
//     let mongoDbName = config.get('mongoDbName');
//     let redisHost = config.get('redisHost');
//     let redisPort = config.get('redisPort');
//     let redisPassword = config.get('redisPassword');

//     const appName = 'AdHocScriptSubmitter';
    
//     const kiki_1 = require("kiki-shared");
//     const logger = new kiki_1.KikiLogger.BaseLogger('AdHocScriptSubmitter', {redisHost: redisHost, redisPort: redisPort, redisPassword: redisPassword});

//     const kiki_2 = require("kiki-shared");
//     const amqpConnector = new kiki_2.AMQPConnector('test', 'instanceId', rmqUrl, rmqUsername, rmqPassword, rmqVhost, 1, (activeMessages) => this.OnRabbitMQDisconnect(activeMessages), logger);
//     await amqpConnector.Start();

//     const kiki_3 = require("kiki-shared");
//     let mongoRepo = new kiki_3.MongoRepo(appName, mongoUrl, mongoDbName, logger);

//     const kiki_4 = require("kiki-shared");
    
//     // await amqpConnector.Publish('', rmqScheduleUpdatesQueue, { 'TriggerType': 'cron', 'Second': '*/5', 'Minute': '*', 'Name': 'TestJob', '_id': '4', 'kwargs': {'job_id': 'job 2'} });

//     task = {'name': 'RunAdHocScript', 
//                     'type': script_type, 
//                     'requiredTags': [], 
//                     '_orgId': mongoRepo.ObjectIdFromString(_orgId), 
//                     'createdBy': 'user:rich', 
//                     'runOnAllAgents': false, 
//                     'script': script1_json, 
//                     'arguments': script_args,
//                     'variables': script_env_vars,
//                     'fromRoutes': []};

//     let route = kiki_4.KikiStrings.GetAgentQueue(_orgId, process.argv[2]);

//     await amqpConnector.Publish(kiki_4.KikiStrings.GetOrgExchangeName(_orgId), route, {taskKey: kiki_4.KikiStrings.GetTaskKey(_orgId, null, task.name), _orgId: _orgId, _jobId: null, type: task.type, script: task.script, arguments: task.arguments, variables: task.variables, runOnAllAgents: task.runOnAllAgents, downstreamDependencies: {}, name: task.name});


//     // await amqpConnector.ConsumeQueue('temp_queue', false, true, false, true, (msg, msgKey, cb) => {}, '', 10000);
//     // await amqpConnector.ConsumeRoute('temp_queue', false, true, false, true, (msg, msgKey, cb) => {}, 'worker', 'temp_route', 10000);

//     // const { StompLib_js_1 } = require('kiki');
//     // const connector = new StompLib_js('test', 'instanceId', rmqUrl, rmqUsername, rmqPassword, rmqVhost, 1, (activeMessages) => this.OnRabbitMQDisconnect(activeMessages), useSSL);
//     // await connector.Start();
//     // await connector.Publish('', 'happy_1', { 'key': 'value' }, {'expiration' : 20000});
//     // await connector.ConsumeQueue('temp_queue', false, true, false, true, (msg, msgKey, cb) => {}, '', 10000);
//     // await connector.ConsumeRoute(0, false, true, false, true, (msg, msgKey, cb) => {}, 'job', 'temp_route', 'temp_queue', 10000);

//     setTimeout(function() {
//         process.exit(0);
//       }, 2000);
// })();
