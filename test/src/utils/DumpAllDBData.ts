import * as fs from "fs";
import * as config from "config";
import {agentService} from "../../../server/src/api/services/AgentService";
import {jobDefService} from "../../../server/src/api/services/JobDefService";
import {jobService} from "../../../server/src/api/services/JobService";
import {teamService} from "../../../server/src/api/services/TeamService";
import {teamVariableService} from "../../../server/src/api/services/TeamVariableService";
import {scheduleService} from "../../../server/src/api/services/ScheduleService";
import {scriptService} from "../../../server/src/api/services/ScriptService";
import {stepDefService} from "../../../server/src/api/services/StepDefService";
import {stepOutcomeService} from "../../../server/src/api/services/StepOutcomeService";
import {stepService} from "../../../server/src/api/services/StepService";
import {taskDefService} from "../../../server/src/api/services/TaskDefService";
import {taskOutcomeService} from "../../../server/src/api/services/TaskOutcomeService";
import {taskService} from "../../../server/src/api/services/TaskService";
import {userService} from "../../../server/src/api/services/UserService";
import {invoiceService} from "../../../server/src/api/services/InvoiceService";
import {paymentMethodService} from "../../../server/src/api/services/PaymentMethodService";
import {paymentTransactionService} from "../../../server/src/api/services/PaymentTransactionService";
import {accessRightService} from "../../../server/src/api/services/AccessRightService";
import {accessKeyService} from "../../../server/src/api/services/AccessKeyService";
import {AgentSchema} from "../../../server/src/api/domain/Agent";
import {JobDefSchema} from "../../../server/src/api/domain/JobDef";
import {JobSchema} from "../../../server/src/api/domain/Job";
import {TeamSchema} from "../../../server/src/api/domain/Team";
import {TeamVariableSchema} from "../../../server/src/api/domain/TeamVariable";
import {ScheduleSchema} from "../../../server/src/api/domain/Schedule";
import {ScriptSchema} from "../../../server/src/api/domain/Script";
import {StepDefSchema} from "../../../server/src/api/domain/StepDef";
import {StepOutcomeSchema} from "../../../server/src/api/domain/StepOutcome";
import {StepSchema} from "../../../server/src/api/domain/Step";
import {TaskDefSchema} from "../../../server/src/api/domain/TaskDef";
import {TaskOutcomeSchema} from "../../../server/src/api/domain/TaskOutcome";
import {TaskSchema} from "../../../server/src/api/domain/Task";
import {UserSchema} from "../../../server/src/api/domain/User";
import {InvoiceSchema} from "../../../server/src/api/domain/Invoice";
import {PaymentMethodSchema} from "../../../server/src/api/domain/PaymentMethod";
import {PaymentTransactionSchema} from "../../../server/src/api/domain/PaymentTransaction";
import {AccessRightSchema} from "../../../server/src/api/domain/AccessRight";
import {AccessKeySchema} from "../../../server/src/api/domain/AccessKey";
import {convertData as convertRequestData} from "../../../server/src/api/utils/RequestConverters";
import * as mongoose from "mongoose";

let DumpMongoData = async (path: string) => {
  mongoose.connect(config.get("mongoUrl"), {});

  let user: any = await userService.findAllUsersInternal();
  let team: any = await teamService.findAllTeamsInternal();
  let teamVariable: any = await teamVariableService.findAllTeamVariablesInternal();
  let agent: any = await agentService.findAllAgentsInternal();
  let job: any = await jobService.findAllJobsInternal();
  let jobDef: any = await jobDefService.findAllJobDefsInternal();
  let script: any = await scriptService.findAllScriptsInternal();
  let step: any = await stepService.findAllStepsInternal();
  let stepDef: any = await stepDefService.findAllStepDefsInternal();
  let stepOutcome: any = await stepOutcomeService.findAllStepOutcomesInternal();
  let task: any = await taskService.findAllTasksInternal();
  let taskDef: any = await taskDefService.findAllTaskDefsInternal();
  let taskOutcome: any = await taskOutcomeService.findAllTaskOutcomesInternal();
  let schedule: any = await scheduleService.findAllSchedulesInternal();
  let invoice: any = await invoiceService.findAllInvoicesInternal();
  let paymentMethod: any = await paymentMethodService.findAllPaymentMethodsInternal();
  let paymentTransaction: any = await paymentTransactionService.findAllPaymentTransactionsInternal();
  let accessRight: any = await accessRightService.findAllAccessRights();
  let accessKey: any = await accessKeyService.findAllAccessKeysInternal();

  let allTestObjects: any = {};
  allTestObjects["user"] = convertRequestData(UserSchema, user);
  allTestObjects["team"] = convertRequestData(TeamSchema, team);
  allTestObjects["teamVariable"] = convertRequestData(TeamVariableSchema, teamVariable);
  allTestObjects["agent"] = convertRequestData(AgentSchema, agent);
  allTestObjects["job"] = convertRequestData(JobSchema, job);
  allTestObjects["jobDef"] = convertRequestData(JobDefSchema, jobDef);
  allTestObjects["script"] = convertRequestData(ScriptSchema, script);
  allTestObjects["step"] = convertRequestData(StepSchema, step);
  allTestObjects["stepDef"] = convertRequestData(StepDefSchema, stepDef);
  allTestObjects["stepOutcome"] = convertRequestData(StepOutcomeSchema, stepOutcome);
  allTestObjects["task"] = convertRequestData(TaskSchema, task);
  allTestObjects["taskDef"] = convertRequestData(TaskDefSchema, taskDef);
  allTestObjects["taskOutcome"] = convertRequestData(TaskOutcomeSchema, taskOutcome);
  allTestObjects["schedule"] = convertRequestData(ScheduleSchema, schedule);
  allTestObjects["invoice"] = convertRequestData(InvoiceSchema, invoice);
  allTestObjects["paymentMethod"] = convertRequestData(PaymentMethodSchema, paymentMethod);
  allTestObjects["paymentTransaction"] = convertRequestData(PaymentTransactionSchema, paymentTransaction);
  allTestObjects["accessRight"] = convertRequestData(AccessRightSchema, accessRight);
  allTestObjects["accessKey"] = convertRequestData(AccessKeySchema, accessKey);

  try {
    if (fs.existsSync(path)) fs.unlinkSync(path);
  } catch (e) {}
  fs.writeFileSync(path, JSON.stringify(allTestObjects));

  process.exit();
};

DumpMongoData(`./test/data/testdata_1.json`);
