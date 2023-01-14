// process.env.NODE_CONFIG_DIR = '../../../../config/';

import * as fs from "fs";
import * as util from "util";
import * as config from "config";
import {BaseLogger} from "../../server/src/shared/SGLogger";
import TestSetup from "./Setup";
import {AMQPConnector} from "../../server/src/shared/AMQPLib";
import {SGUtils} from "../../server/src/shared/SGUtils";

let appName: string = "RunSchedulerTest";

let amqpUrl = config.get("amqpUrl");
let rmqVhost = config.get("rmqVhost");

let logger: BaseLogger = new BaseLogger(appName);
logger.Start();

process.on("unhandledRejection", (reason, p) => {
  logger.LogError("RunSchedulerTest Unhandled Rejection", {
    Promise: util.inspect(p, false, null),
    Reason: util.inspect(reason, false, null),
  });
});

let testSetup: TestSetup = new TestSetup(appName, logger);

let amqpConnector = new AMQPConnector("SchedulerTest", "", amqpUrl, rmqVhost, 1, (activeMessages) => {}, logger);

(async () => {
  try {
    let testsRootPath: string = __dirname;

    await testSetup.Init();
    await testSetup.InitEnvironment();

    await amqpConnector.Start();

    let testsToRun = process.argv[2].split(",");

    let usersToDelete: string[] = [];

    fs.readdir(testsRootPath, async (err, files) => {
      if (err) throw err;
      for (let f of files) {
        try {
          if (
            f.startsWith("Test") &&
            !f.endsWith(".js.map") &&
            f != "TestBase.js" &&
            f != "TestArtifacts.js" &&
            (testsToRun.indexOf("ALL") >= 0 || testsToRun.indexOf(f) >= 0)
          ) {
            const TestModule_1 = require(`${testsRootPath}/${f}`);
            const testModule = new TestModule_1.default(testSetup);
            // console.log(util.inspect(testModule, false, 5, true));
            await testModule.StartTestMonitor();
            await testModule.CreateTest();
            await testModule.SetupServerArtifacts(testSetup);
            // await testModule.SetupAgents(testSetup);
            // await SGUtils.sleep(1500);
            let res = await testModule.RunTest();
            await testModule.StopTestMonitor();
            console.log("cleanup");
            await testModule.CleanupTest(testSetup);
            if (!res) {
              await logger.LogError("Test failed", {
                Description: testModule.description,
                Location: testsRootPath + "/" + f,
              });
            } else {
              await logger.LogError("Test passed", {
                Description: testModule.description,
                "Test Name": testModule.testName,
              });
            }
            // const testUsers = await testSetup.GetRMQUsers(testModule);
            // usersToDelete = usersToDelete.concat(testUsers);

            // fs.writeFileSync(`${testsRootPath}/../../../bp/${SGUtils.ChangeFileExt(f, 'bp')}`, JSON.stringify(testModule.bpMessages));

            await SGUtils.sleep(5000);
          }
        } catch (e) {
          logger.LogError(`Error in test ${f}: ${e}`, {Stack: e.stack});
        }
      }

      let allTestObjects: any = {};
      allTestObjects["teams"] = testSetup.allTeams;
      allTestObjects["jobDefs"] = testSetup.allJobDefs;
      allTestObjects["jobs"] = testSetup.allJobs;
      allTestObjects["agents"] = testSetup.allAgents;
      allTestObjects["scripts"] = testSetup.allScripts;

      // const testDataFilePath: string = './clientv3/src/utils/TestData.ts';
      // try { if (fs.existsSync(testDataFilePath)) fs.unlinkSync(testDataFilePath); } catch(e){}

      //             console.log('writing output data to -> ', testDataFilePath);
      //             const outData = `
      // export const getSet1 = function(){
      //   return ${JSON.stringify(allTestObjects)}
      // };`;
      //             fs.writeFileSync(testDataFilePath, outData);

      setTimeout(async () => {
        // await testSetup.DeleteRMQUsers(usersToDelete);
        // await testSetup.StopScheduler();
        await testSetup.StopAgents();
        process.exit();
      }, 3000);
    });
  } catch (e) {
    logger.LogError("Error occurred in RunSchedulerTest.js: " + e.message, {Stack: e.stack});
  }
})();
