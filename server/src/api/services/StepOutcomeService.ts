import { convertData } from '../utils/ResponseConverters';
import { StepOutcomeSchema, StepOutcomeModel } from '../domain/StepOutcome';
import { TaskOutcomeSchema } from '../domain/TaskOutcome';
import { taskOutcomeService } from './TaskOutcomeService';
import { TaskSchema } from '../domain/Task';
import { taskService } from './TaskService';
import { JobSchema } from '../domain/Job';
import { jobService } from './JobService';
import { orgService } from './OrgService';
import { OrgSchema } from '../domain/Org';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { BaseLogger } from '../../shared/SGLogger';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { TaskStatus } from '../../shared/Enums';
import { SGUtils } from '../../shared/SGUtils';
import * as config from 'config';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


export class StepOutcomeService {

    public async findAllStepOutcomesInternal(filter?: any, responseFields?: string, limit: number = 1000) {
        return StepOutcomeModel.find(filter).select(responseFields).limit(limit);
    }


    public async findStepOutcomesForStep(_orgId: mongodb.ObjectId, _stepId: mongodb.ObjectId, responseFields?: string) {
        return StepOutcomeModel.find({ _orgId, _stepId }).select(responseFields);
    }


    public async findStepOutcomesForTask(_orgId: mongodb.ObjectId, _taskOutcomeId: mongodb.ObjectId, filter?: any, responseFields?: string) {
        const defaultFilter = { _orgId, _taskOutcomeId };
        if (filter)
            filter = Object.assign(defaultFilter, filter);
        else
            filter = defaultFilter;

        return await StepOutcomeModel.find(filter).select(responseFields);
    }


    public async findStepOutcome(_orgId: mongodb.ObjectId, stepOutcomeId: mongodb.ObjectId, responseFields?: string) {
        return StepOutcomeModel.findById(stepOutcomeId).find({ _orgId }).select(responseFields);
    }


    public async createStepOutcomeInternal(data: any): Promise<object> {
        const model = new StepOutcomeModel(data);
        await model.save();
        return;
    }


    public async createStepOutcome(_orgId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        // const stepExisting = await this.findStepOutcomesForStep(_orgId, new mongodb.ObjectId(data._stepId));
        // if (_.isArray(stepExisting) && stepExisting.length > 0) {
        //     return this.updateStepOutcome(_orgId, stepExisting[0], data, correlationId, responseFields, true);
        // } else {

        data._orgId = _orgId;
        const stepOutcomeModel = new StepOutcomeModel(data);
        const newStepOutcome = await stepOutcomeModel.save();

        await rabbitMQPublisher.publish(_orgId, "StepOutcome", correlationId, PayloadOperation.CREATE, convertData(StepOutcomeSchema, newStepOutcome));

        if (responseFields) {
            return this.findStepOutcome(_orgId, newStepOutcome._id, responseFields);
        }
        else {
            return newStepOutcome; // fully populated model
        }
    }


    public async updateStepOutcome(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, logger: BaseLogger, filter?: any, correlationId?: string, responseFields?: string, skipLasteUpdateIdCheck: boolean = false): Promise<object> {
        try {
            const defaultFilter = { _id: id, _orgId };
            if (filter)
                filter = Object.assign(defaultFilter, filter);
            else
                filter = defaultFilter;

            if (!skipLasteUpdateIdCheck && ('lastUpdateId' in data))
                filter['lastUpdateId'] = { $lt: data.lastUpdateId };

            let updatedStepOutcome: any = undefined;

            if ('stdout' in data) {
                updatedStepOutcome = await new Promise(async (resolve, reject) => {
                    await StepOutcomeModel.findById(id, async (err, stepOutcome) => {
                        if (err) reject(err);
                        let stdout = '';
                        if (stepOutcome.stdout)
                            stdout += stepOutcome.stdout;
                        if (data.stdout)
                            stdout += data.stdout;
                        let newModel = await StepOutcomeModel.findByIdAndUpdate(id, { $set: { stdout: stdout } }, { new: true });
                        data.stdout = newModel.stdout;
                        resolve(newModel);
                    });
                });
            }

            if ('stderr' in data) {
                updatedStepOutcome = await new Promise(async (resolve, reject) => {
                    await StepOutcomeModel.findById(id, async (err, stepOutcome) => {
                        if (err) reject(err);
                        let stderr = '';
                        if (stepOutcome.stderr)
                            stderr += stepOutcome.stderr;
                        if (data.stderr)
                            stderr += data.stderr;
                        let newModel = await StepOutcomeModel.findByIdAndUpdate(id, { $set: { stderr: stderr } }, { new: true });
                        data.stderr = newModel.stderr;
                        resolve(newModel);
                    });
                });
            }

            updatedStepOutcome = await StepOutcomeModel.findOneAndUpdate(filter, data, { new: true });

            if (!updatedStepOutcome)
                throw new MissingObjectError(`StepOutcome '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

            if (updatedStepOutcome.status == TaskStatus.FAILED) {
                await SGUtils.OnStepFailed(_orgId, updatedStepOutcome, logger);
            }

            // The data has the deltas that the rabbit listeners need get.  If there was any calculated data it would need to be placed manually
            // inside of the deltas here.
            const deltas = Object.assign({ _id: id }, data);
            await rabbitMQPublisher.publish(_orgId, "StepOutcome", correlationId, PayloadOperation.UPDATE, convertData(StepOutcomeSchema, deltas));

            return updatedStepOutcome; // fully populated model
        } catch (err) {
            logger.LogError(err, { Class: 'StepOutcomeService', Method: 'updateStepOutcome', _orgId, stepOutcome: data });
            throw err;
        }
    }
}

export const stepOutcomeService = new StepOutcomeService();