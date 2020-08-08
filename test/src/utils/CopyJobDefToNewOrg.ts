import * as fs from 'fs';
import * as config from 'config';
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
import * as mongoose from 'mongoose';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


let CopyJobDefToNewOrg = async (sourceOrg: mongodb.ObjectId, destOrg: mongodb.ObjectId, _jobDefId: mongodb.ObjectId) => {
    mongoose.connect(config.get('mongoUrl'), { useNewUrlParser: true });

    console.log('mongo url -> ', config.get('mongoUrl'));

    const userId = new mongodb.ObjectId("5e99cbcb2317950015edb655");

    const filter = { _jobDefId };

    let jobDefs: any = await jobDefService.findAllJobDefsInternal({ _id: jobDefId });
    //   let scripts: any = await scriptService.findAllScriptsInternal(filter);
    // let stepDefs: any = await stepDefService.findAllStepDefsInternal(filter);
    let taskDefs: any = await taskDefService.findAllTaskDefsInternal(filter);
    let schedules: any = await scheduleService.findAllSchedulesInternal(filter);

    //   let allTestObjects: any = {};
    //   allTestObjects['jobDef'] = convertRequestData(JobDefSchema, jobDef);
    //   allTestObjects['script'] = convertRequestData(ScriptSchema, script);
    //   allTestObjects['stepDef'] = convertRequestData(StepDefSchema, stepDef);
    //   allTestObjects['taskDef'] = convertRequestData(TaskDefSchema, taskDef);
    //   allTestObjects['schedule'] = convertRequestData(ScheduleSchema, schedule);

    if (!_.isArray(jobDefs) && jobDefs.length === 0) {
        console.log(`No jobdef in org ${sourceOrg} with id ${jobDefId}`);
        process.exit();
    }

    let jobDef: any = JSON.parse(JSON.stringify(jobDefs[0]));
    delete jobDef._id;
    jobDef._orgId = destOrg;
    jobDef.createdBy = userId;
    jobDef = await jobDefService.createJobDefInternal(jobDef);

    for (let i = 0; i < taskDefs.length; i++) {
        const oldTaskDefId = taskDefs[i]._id;
        let taskDef = JSON.parse(JSON.stringify(taskDefs[i]));
        delete taskDef._id;
        taskDef._orgId = destOrg;
        taskDef._jobDefId = jobDef._id;
        taskDef = await taskDefService.createTaskDefInternal(taskDef);
        let stepDefs: any = await stepDefService.findAllStepDefsInternal({ _taskDefId: oldTaskDefId });
        for (let i = 0; i < stepDefs.length; i++) {
            let stepDef = stepDefs[i];
            stepDef = JSON.parse(JSON.stringify(stepDef));

            let script: any = await scriptService.findAllScriptsInternal({ _id: new mongodb.ObjectId(stepDef._scriptId) });
            script = JSON.parse(JSON.stringify(script[0]));
            delete script._id;
            script._orgId = destOrg;
            script = await scriptService.createScriptInternal(script);

            delete stepDef._id;
            stepDef._orgId = destOrg;
            stepDef._taskDefId = taskDef._id;
            stepDef._scriptId = script._id;
            stepDef = await stepDefService.createStepDefInternal(stepDef);
        }
    }

    for (let i = 0; i < schedules.length; i++) {
        let schedule = schedules[i];
        delete schedule._id;
        schedule._orgId = destOrg;
        schedule._jobDefId = jobDef._id;
        await scheduleService.createScheduleInternal(schedule);
    }

    process.exit();
}

const sourceOrg = new mongodb.ObjectId('5de95c0453162e8891f5a830');
const destOrg = new mongodb.ObjectId('5e99cbcb2317950015edb655');
const jobDefId = new mongodb.ObjectId('5ed5c53c759b110015403a1b');

CopyJobDefToNewOrg(sourceOrg, destOrg, jobDefId);
