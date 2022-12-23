import {convertData} from "../utils/ResponseConverters";
import {StepDefSchema, StepDefModel} from "../domain/StepDef";
import {rabbitMQPublisher, PayloadOperation} from "../utils/RabbitMQPublisher";
import {MissingObjectError, ValidationError} from "../utils/Errors";
import * as mongodb from "mongodb";
import * as _ from "lodash";

export class StepDefService {
  // Some services might need to add additional restrictions to bulk queries
  // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
  // public async updateBulkQuery(query): Promise<object> {
  //   // modify query here
  //   return query;
  // }

  public async findAllStepDefsInternal(filter?: any, responseFields?: string): Promise<Array<StepDefSchema>> {
    return StepDefModel.find(filter).select(responseFields);
  }

  public async findAllStepDefs(_teamId: mongodb.ObjectId, _taskDefId: mongodb.ObjectId, responseFields?: string) {
    return StepDefModel.find({_taskDefId, _teamId}).select(responseFields);
  }

  public async findTaskDefStepDefs(_teamId: mongodb.ObjectId, _taskDefId: mongodb.ObjectId, responseFields?: string) {
    return StepDefModel.find({_taskDefId, _teamId}).select(responseFields);
  }

  public async findStepDef(
    _teamId: mongodb.ObjectId,
    stepDefId: mongodb.ObjectId,
    responseFields?: string
  ): Promise<StepDefSchema | null> {
    const result: StepDefSchema[] = await StepDefModel.findById(stepDefId).find({_teamId}).select(responseFields);
    if (_.isArray(result) && result.length > 0) return result[0];
    return null;
  }

  public async findStepDefByName(
    _teamId: mongodb.ObjectId,
    _taskDefId: mongodb.ObjectId,
    stepDefName: string,
    responseFields?: string
  ) {
    let stepDef = await StepDefModel.find({_teamId, _taskDefId, name: stepDefName}).select(responseFields);
    return convertData(StepDefSchema, stepDef);
  }

  public async createStepDefInternal(data: any): Promise<object> {
    const model = new StepDefModel(data);
    const newStepDef = await model.save();
    return newStepDef;
  }

  public async createStepDef(
    _teamId: mongodb.ObjectId,
    data: any,
    correlationId: string,
    responseFields?: string
  ): Promise<StepDefSchema> {
    if (!data.name) throw new ValidationError(`Request body missing "name" parameter`);
    if (!data._taskDefId) throw new ValidationError(`Request body missing "_taskDefId" parameter`);

    const queryExistingStepDef = await this.findStepDefByName(
      _teamId,
      new mongodb.ObjectId(data._taskDefId),
      data.name,
      "_id"
    );
    if (_.isArray(queryExistingStepDef) && queryExistingStepDef.length > 0)
      throw new ValidationError(`Task def "${data._taskDefId}" already contains a step with name "${data.name}"`);

    data._teamId = _teamId;
    const stepDefModel = new StepDefModel(data);
    const newStepDef = await stepDefModel.save();

    await rabbitMQPublisher.publish(
      _teamId,
      "StepDef",
      correlationId,
      PayloadOperation.CREATE,
      convertData(StepDefSchema, newStepDef)
    );

    if (responseFields) {
      // It's is a bit wasteful to do another query but I can't chain a save with a select
      return this.findStepDef(_teamId, newStepDef._id, responseFields);
    } else {
      return newStepDef; // fully populated model
    }
  }

  public async updateStepDef(
    _teamId: mongodb.ObjectId,
    id: mongodb.ObjectId,
    data: any,
    correlationId: string,
    responseFields?: string
  ): Promise<object> {
    const filter = {_id: id, _teamId};
    const origStepDef = await StepDefModel.findOne(filter);
    if (!origStepDef)
      throw new MissingObjectError(`StepDef '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`);

    // If the step def order is changed you need to update one other step defs order
    if (data["order"] !== undefined && data["order"] !== origStepDef.order) {
      const sameOrderStepDef = await StepDefModel.findOne({
        _teamId,
        _taskDefId: origStepDef._taskDefId,
        order: data["order"],
      });

      if (!sameOrderStepDef) {
        // If you can't find an existing step with the same order than the client made a mistake in re-ordering the steps
        // The client tried to order the first or last ones in a way that didn't make sense
        throw new MissingObjectError(
          `Attempted to update StepDef with id '${id}' but the new order did not make sense. No other step def with existing order ${data["order"]} was found.`
        );
      } else {
        // Swap the orders of the existing step and the newly updated step
        const updatedSameOrder = await StepDefModel.findOneAndUpdate(
          {_id: sameOrderStepDef._id, _teamId},
          {order: origStepDef.order},
          {new: true}
        );
        await rabbitMQPublisher.publish(
          _teamId,
          "StepDef",
          correlationId,
          PayloadOperation.UPDATE,
          convertData(StepDefSchema, updatedSameOrder)
        );
      }
    }

    const updatedStepDef = await StepDefModel.findOneAndUpdate({_id: id, _teamId}, data, {new: true}).select(
      responseFields
    );
    await rabbitMQPublisher.publish(
      _teamId,
      "StepDef",
      correlationId,
      PayloadOperation.UPDATE,
      convertData(StepDefSchema, updatedStepDef)
    );

    return updatedStepDef; // fully populated model
  }

  public async deleteStepDef(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId?: string): Promise<object> {
    const filter = {_id: id, _teamId};
    const origStepDef = await StepDefModel.findOne(filter);
    if (!origStepDef)
      throw new MissingObjectError(`StepDef '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`);

    const deleted = await StepDefModel.deleteOne({_id: id});
    await rabbitMQPublisher.publish(_teamId, "StepDef", correlationId, PayloadOperation.DELETE, {id, correlationId});

    const steps = await this.findAllStepDefs(_teamId, origStepDef._taskDefId, "order");
    if (_.isArray(steps) && steps.length > 0) {
      steps.sort((a, b) => a.order - b.order);
      for (let i = 0; i < steps.length; ++i) {
        const step = steps[i];
        if (step.order != i + 1) {
          step.order = i + 1;
          const updatedStepDef = await StepDefModel.findOneAndUpdate({_id: step._id, _teamId}, step, {
            new: true,
          }).select("order");
          await rabbitMQPublisher.publish(
            _teamId,
            "StepDef",
            correlationId,
            PayloadOperation.UPDATE,
            convertData(StepDefSchema, updatedStepDef)
          );
        }
      }
    }

    return deleted;
  }
}

export const stepDefService = new StepDefService();
