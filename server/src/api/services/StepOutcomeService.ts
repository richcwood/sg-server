import {convertData} from "../utils/ResponseConverters";
import {StepOutcomeSchema, StepOutcomeModel} from "../domain/StepOutcome";
import {rabbitMQPublisher, PayloadOperation} from "../utils/RabbitMQPublisher";
import {BaseLogger} from "../../shared/SGLogger";
import {MissingObjectError} from "../utils/Errors";
import {TaskStatus} from "../../shared/Enums";
import {SGUtils} from "../../shared/SGUtils";
import * as mongodb from "mongodb";
import * as _ from "lodash";

export class StepOutcomeService {
  public async findAllStepOutcomesInternal(filter?: any, responseFields?: string, limit: number = 1000) {
    return StepOutcomeModel.find(filter).select(responseFields).limit(limit);
  }

  public async findStepOutcomesForStep(_teamId: mongodb.ObjectId, _stepId: mongodb.ObjectId, responseFields?: string) {
    return StepOutcomeModel.find({_teamId, _stepId}).select(responseFields);
  }

  public async findStepOutcomesForTask(
    _teamId: mongodb.ObjectId,
    _taskOutcomeId: mongodb.ObjectId,
    filter?: any,
    responseFields?: string
  ) {
    const defaultFilter = {_teamId, _taskOutcomeId};
    if (filter) filter = Object.assign(defaultFilter, filter);
    else filter = defaultFilter;

    return await StepOutcomeModel.find(filter).select(responseFields);
  }

  public async findStepOutcome(_teamId: mongodb.ObjectId, stepOutcomeId: mongodb.ObjectId, responseFields?: string) {
    return StepOutcomeModel.findById(stepOutcomeId).find({_teamId}).select(responseFields);
  }

  public async deleteStepOutcome(
    _teamId: mongodb.ObjectId,
    _jobId: mongodb.ObjectId,
    correlationId?: string
  ): Promise<object> {
    const filter = {_jobId, _teamId};

    let res: any = {ok: 1, deletedCount: 0};

    const stepOutcomesQuery = await StepOutcomeModel.find(filter).select("id");
    if (_.isArray(stepOutcomesQuery) && stepOutcomesQuery.length === 0) {
      res.n = 0;
    } else {
      res.n = stepOutcomesQuery.length;
      for (let i = 0; i < stepOutcomesQuery.length; i++) {
        const stepOutcome: any = stepOutcomesQuery[i];
        let deleted = await StepOutcomeModel.deleteOne({_id: stepOutcome._id});
        if (deleted.acknowledged) {
          res.deletedCount += deleted.deletedCount;
          await rabbitMQPublisher.publish(_teamId, "StepOutcome", correlationId, PayloadOperation.DELETE, {
            id: stepOutcome._id,
          });
        }
      }
    }

    return res;
  }

  public async createStepOutcomeInternal(data: any): Promise<object> {
    const model = new StepOutcomeModel(data);
    await model.save();
    return;
  }

  public async createStepOutcome(
    _teamId: mongodb.ObjectId,
    data: any,
    correlationId: string,
    responseFields?: string
  ): Promise<object> {
    // const stepExisting = await this.findStepOutcomesForStep(_teamId, new mongodb.ObjectId(data._stepId));
    // if (_.isArray(stepExisting) && stepExisting.length > 0) {
    //     return this.updateStepOutcome(_teamId, stepExisting[0], data, correlationId, responseFields, true);
    // } else {

    data._teamId = _teamId;
    const stepOutcomeModel = new StepOutcomeModel(data);
    const newStepOutcome = await stepOutcomeModel.save();

    await rabbitMQPublisher.publish(
      _teamId,
      "StepOutcome",
      correlationId,
      PayloadOperation.CREATE,
      convertData(StepOutcomeSchema, newStepOutcome)
    );

    if (responseFields) {
      return this.findStepOutcome(_teamId, newStepOutcome._id, responseFields);
    } else {
      return newStepOutcome; // fully populated model
    }
  }

  public async updateStepOutcome(
    _teamId: mongodb.ObjectId,
    id: mongodb.ObjectId,
    data: any,
    logger: BaseLogger,
    filter?: any,
    correlationId?: string,
    responseFields?: string,
    skipLastUpdateIdCheck: boolean = false
  ): Promise<object> {
    try {
      const defaultFilter = {_id: id, _teamId};
      if (filter) filter = Object.assign(defaultFilter, filter);
      else filter = defaultFilter;

      if (!skipLastUpdateIdCheck && "lastUpdateId" in data) filter["lastUpdateId"] = {$lt: data.lastUpdateId};

      let updatedStepOutcome = await StepOutcomeModel.findOne(filter).select("stdout stderr");
      if (!updatedStepOutcome) {
        const stepOutcomeExisting = await StepOutcomeModel.findOne(defaultFilter).select("id");
        if (!stepOutcomeExisting)
          throw new MissingObjectError(
            `StepOutcome "${id}" not found with filter "${JSON.stringify(defaultFilter, null, 4)}".`
          );
        return stepOutcomeExisting;
      }

      let stdout = "";
      if (updatedStepOutcome.stdout) stdout += updatedStepOutcome.stdout;
      if (data.stdout) stdout += data.stdout;
      data.stdout = stdout;

      let stderr = "";
      if (updatedStepOutcome.stderr) stderr += updatedStepOutcome.stderr;
      if (data.stderr) stderr += data.stderr;
      data.stderr = stderr;

      updatedStepOutcome = await StepOutcomeModel.findOneAndUpdate(filter, data, {new: true});

      if (!updatedStepOutcome)
        throw new MissingObjectError(`StepOutcome "${id}" not found with filter "${JSON.stringify(filter, null, 4)}".`);

      if (updatedStepOutcome.status == TaskStatus.FAILED) {
        await SGUtils.OnStepFailed(_teamId, updatedStepOutcome, logger);
      }

      // The data has the deltas that the rabbit listeners need get.  If there was any calculated data it would need to be placed manually
      // inside of the deltas here.
      const deltas = Object.assign({_id: id}, data);
      await rabbitMQPublisher.publish(
        _teamId,
        "StepOutcome",
        correlationId,
        PayloadOperation.UPDATE,
        convertData(StepOutcomeSchema, deltas)
      );

      return updatedStepOutcome; // fully populated model
    } catch (err) {
      logger.LogError(err, {Class: "StepOutcomeService", Method: "updateStepOutcome", _teamId, stepOutcome: data});
      throw err;
    }
  }

  public async updateMany(_teamId: mongodb.ObjectId, filter: any, document: any, logger: BaseLogger) {
    let expandedFilter = {_teamId};
    expandedFilter = Object.assign(expandedFilter, filter);
    try {
      StepOutcomeModel.updateMany(expandedFilter, {$set: document});
    } catch (err) {
      logger.LogError(err, {Class: "StepOutcomeService", Method: "updateMany", _teamId, Filter: expandedFilter});
      throw err;
    }
  }
}

export const stepOutcomeService = new StepOutcomeService();
