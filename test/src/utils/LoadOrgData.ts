import * as fs from 'fs';
import * as config from 'config';
import { MongoRepo } from '../../../server/src/shared/MongoLib';
import { BaseLogger } from '../../../server/src/shared/KikiLogger';
import { agentService } from '../../../server/src/api/services/AgentService';
import { jobDefService } from '../../../server/src/api/services/JobDefService';
import { jobService } from '../../../server/src/api/services/JobService';
import { orgService } from '../../../server/src/api/services/OrgService';
import { scheduleService } from '../../../server/src/api/services/ScheduleService';
import { scriptService } from '../../../server/src/api/services/ScriptService';
import { stepDefService } from '../../../server/src/api/services/StepDefService';
import { stepOutcomeService } from '../../../server/src/api/services/StepOutcomeService';
import { stepService } from '../../../server/src/api/services/StepService';
import { taskDefService } from '../../../server/src/api/services/TaskDefService';
import { taskOutcomeService } from '../../../server/src/api/services/TaskOutcomeService';
import { taskService } from '../../../server/src/api/services/TaskService';
import { userService } from '../../../server/src/api/services/UserService';
import { invoiceService } from '../../../server/src/api/services/InvoiceService';
import { paymentMethodService } from '../../../server/src/api/services/PaymentMethodService';
import { paymentTransactionService } from '../../../server/src/api/services/PaymentTransactionService';
import { AgentSchema } from '../../../server/src/api/domain/Agent';
import { JobDefSchema } from '../../../server/src/api/domain/JobDef';
import { JobSchema } from '../../../server/src/api/domain/Job';
import { OrgSchema } from '../../../server/src/api/domain/Org';
import { ScheduleSchema } from '../../../server/src/api/domain/Schedule';
import { ScriptSchema } from '../../../server/src/api/domain/Script';
import { StepDefSchema } from '../../../server/src/api/domain/StepDef';
import { StepOutcomeSchema } from '../../../server/src/api/domain/StepOutcome';
import { StepSchema } from '../../../server/src/api/domain/Step';
import { TaskDefSchema } from '../../../server/src/api/domain/TaskDef';
import { TaskOutcomeSchema } from '../../../server/src/api/domain/TaskOutcome';
import { TaskSchema } from '../../../server/src/api/domain/Task';
import { UserSchema } from '../../../server/src/api/domain/User';
import { InvoiceSchema } from '../../../server/src/api/domain/Invoice';
import { PaymentMethodSchema } from '../../../server/src/api/domain/PaymentMethod';
import { PaymentTransactionSchema } from '../../../server/src/api/domain/PaymentTransaction';
import { convertData as convertRequestData } from '../../../server/src/api/utils/RequestConverters';
import * as mongodb from 'mongodb';
import * as mongoose from 'mongoose';



let LoadMongoData = async (path: string, orgId: string = '') => {
  mongoose.connect(config.get('mongoUrl'), { useNewUrlParser: true });

  const mongoUrl = config.get('mongoUrl');
  const mongoDbname = config.get('mongoDbName');

  let logger = new BaseLogger('RunTestHarness');
  logger.Start();

  let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);

  console.log('mongo url -> ', config.get('mongoUrl'));

  let filter: any = {};
  if (orgId)
    filter["_orgId"] = new mongodb.ObjectId(orgId);

  // let res;
  // res = await mongoRepo.DeleteByQuery(filter, 'job');
  // console.log(`deleted ${res} jobs`);
  // res = await mongoRepo.DeleteByQuery(filter, 'jobDef');
  // console.log(`deleted ${res} jobDefs`);
  // res = await mongoRepo.DeleteByQuery(filter, 'script');
  // console.log(`deleted ${res} scripts`);
  // res = await mongoRepo.DeleteByQuery(filter, 'step');
  // console.log(`deleted ${res} steps`);
  // res = await mongoRepo.DeleteByQuery(filter, 'stepDef');
  // console.log(`deleted ${res} stepDefs`);
  // res = await mongoRepo.DeleteByQuery(filter, 'stepOutcome');
  // console.log(`deleted ${res} stepOutcomes`);
  // res = await mongoRepo.DeleteByQuery(filter, 'task');
  // console.log(`deleted ${res} tasks`);
  // res = await mongoRepo.DeleteByQuery(filter, 'taskDef');
  // console.log(`deleted ${res} taskDefs`);
  // res = await mongoRepo.DeleteByQuery(filter, 'taskOutcome');
  // console.log(`deleted ${res} taskOutcomes`);
  // res = await mongoRepo.DeleteByQuery(filter, 'schedule');
  // console.log(`deleted ${res} schedules`);
  // res = await mongoRepo.DeleteByQuery(filter, 'invoice');
  // console.log(`deleted ${res} invoices`);
  // res = await mongoRepo.DeleteByQuery(filter, 'paymentMethod');
  // console.log(`deleted ${res} paymentMethods`);

  let rawdata: any = fs.readFileSync(path);
  let allTestObjects = JSON.parse(rawdata);

  // if (allTestObjects.job.length > 0) {
  //   for (let i = 0; i < allTestObjects.job.length; i++) {
  //     const job = allTestObjects.job[i];
  //     await jobService.createJobInternal(convertRequestData(JobSchema, job));
  //   }
  // }

  if (allTestObjects.jobDef.length > 0) {
    for (let i = 0; i < allTestObjects.jobDef.length; i++) {
      const jobDef = allTestObjects.jobDef[i];
      await jobDefService.createJobDefInternal(convertRequestData(JobDefSchema, jobDef));
    }
  }

  // if (allTestObjects.script.length > 0) {
  //   for (let i = 0; i < allTestObjects.script.length; i++) {
  //     const script = allTestObjects.script[i];
  //     await scriptService.createScriptInternal(convertRequestData(ScriptSchema, script));
  //   }
  // }

  // if (allTestObjects.step.length > 0) {
  //   for (let i = 0; i < allTestObjects.step.length; i++) {
  //     const step = allTestObjects.step[i];
  //     await stepService.createStepInternal(convertRequestData(StepSchema, step));
  //   }
  // }

  if (allTestObjects.stepDef.length > 0) {
    for (let i = 0; i < allTestObjects.stepDef.length; i++) {
      const stepDef = allTestObjects.stepDef[i];
      await stepDefService.createStepDefInternal(convertRequestData(StepDefSchema, stepDef));
    }
  }

  // if (allTestObjects.stepOutcome.length > 0) {
  //   for (let i = 0; i < allTestObjects.stepOutcome.length; i++) {
  //     const stepOutcome = allTestObjects.stepOutcome[i];
  //     await stepOutcomeService.createStepOutcomeInternal(convertRequestData(StepOutcomeSchema, stepOutcome));
  //   }
  // }

  // if (allTestObjects.task.length > 0) {
  //   for (let i = 0; i < allTestObjects.task.length; i++) {
  //     const task = allTestObjects.task[i];
  //     await taskService.createTaskInternal(convertRequestData(TaskSchema, task));
  //   }
  // }

  if (allTestObjects.taskDef.length > 0) {
    for (let i = 0; i < allTestObjects.taskDef.length; i++) {
      const taskDef = allTestObjects.taskDef[i];
      await taskDefService.createTaskDefInternal(convertRequestData(TaskDefSchema, taskDef));
    }
  }

  // if (allTestObjects.taskOutcome.length > 0) {
  //   for (let i = 0; i < allTestObjects.taskOutcome.length; i++) {
  //     const taskOutcome = allTestObjects.taskOutcome[i];
  //     await taskOutcomeService.createTaskOutcomeInternal(convertRequestData(TaskOutcomeSchema, taskOutcome));
  //   }
  // }

  if (allTestObjects.schedule.length > 0) {
    for (let i = 0; i < allTestObjects.schedule.length; i++) {
      const schedule = allTestObjects.schedule[i];
      await scheduleService.createScheduleInternal(convertRequestData(ScheduleSchema, schedule));
    }
  }

  // if (allTestObjects.invoice && allTestObjects.invoice.length > 0) {
  //   for (let i = 0; i < allTestObjects.invoice.length; i++) {
  //     const invoice = allTestObjects.invoice[i];
  //     await invoiceService.createInvoiceInternal(convertRequestData(InvoiceSchema, invoice));
  //   }
  // }

  // if (allTestObjects.paymentMethod && allTestObjects.paymentMethod.length > 0) {
  //   for (let i = 0; i < allTestObjects.paymentMethod.length; i++) {
  //     const paymentMethod = allTestObjects.paymentMethod[i];
  //     await paymentMethodService.createPaymentMethodInternal(convertRequestData(PaymentMethodSchema, paymentMethod));
  //   }
  // }

  process.exit();
}

const filePath = process.argv[2];
const org = process.argv[3];

console.log(`Loading data for org ${org} from ${filePath} to ${config.get('mongoUrl')}`);

LoadMongoData(filePath, org);

// node test/dist/test/src/utils/LoadMongoData.js './demo.json' '5e99cbcb2317950015edb655'
