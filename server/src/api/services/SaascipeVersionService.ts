import {convertData} from "../utils/ResponseConverters";
import {SaascipeVersionSchema, SaascipeVersionModel} from "../domain/SaascipeVersion";
import {SaascipeSchema} from "../domain/Saascipe";
import {saascipeService} from "./SaascipeService";
import {rabbitMQPublisher, PayloadOperation} from "../utils/RabbitMQPublisher";
import {MissingObjectError, ValidationError} from "../utils/Errors";
import * as mongodb from "mongodb";
import * as _ from "lodash";

export class SaascipeVersionService {
  public async findAllSaascipeVersionsInternal(filter?: any, responseFields?: string) {
    return SaascipeVersionModel.find(filter).select(responseFields);
  }

  public async findSaascipeVersion(
    saascipeVersionId: mongodb.ObjectId,
    responseFields?: string
  ): Promise<SaascipeVersionSchema | null> {
    return SaascipeVersionModel.findById(saascipeVersionId).select(responseFields);
  }

  public async createSaascipeVersion(
    _teamId: mongodb.ObjectId,
    data: any,
    correlationId: string,
    responseFields?: string
  ): Promise<SaascipeVersionSchema> {
    if (!data.hasOwnProperty("_saascipeId")) throw new ValidationError(`Missing required field "_saascipeId"`);
    if (!data.hasOwnProperty("version")) throw new ValidationError(`Missing required field "version"`);
    const existingSaascipeVersionQuery: any = await this.findAllSaascipeVersionsInternal({
      _publisherTeamId: _teamId,
      _saascipeId: data._saascipeId,
      version: data.version,
    });
    if (_.isArray(existingSaascipeVersionQuery) && existingSaascipeVersionQuery.length > 0) {
      const saascipe: SaascipeSchema = await saascipeService.findSaascipe(data._saascipeId, "name");
      if (!saascipe) throw new MissingObjectError(`Saascipe "${data._saascipeId} not found`);
      throw new ValidationError(`Saascipe "${saascipe.name}" version "${data.version}" already exists`);
    }

    data._publisherTeamId = _teamId;
    const saascipeVersionModel = new SaascipeVersionModel(data);
    const newSaascipeVersion = await saascipeVersionModel.save();

    await rabbitMQPublisher.publish(
      _teamId,
      "SaascipeVersion",
      correlationId,
      PayloadOperation.CREATE,
      convertData(SaascipeVersionSchema, newSaascipeVersion)
    );

    return this.findSaascipeVersion(newSaascipeVersion._id, responseFields);
  }

  public async updateSaascipeVersion(
    _teamId: mongodb.ObjectId,
    id: mongodb.ObjectId,
    data: any,
    filter?: any,
    correlationId?: string,
    responseFields?: string
  ): Promise<SaascipeVersionSchema> {
    if (data.version) {
      const existingSaascipeVersionQuery: any = await this.findAllSaascipeVersionsInternal({
        _publisherTeamId: _teamId,
        _saascipeId: data._saascipeId,
        version: data.version,
      });
      if (_.isArray(existingSaascipeVersionQuery) && existingSaascipeVersionQuery.length > 0)
        if (existingSaascipeVersionQuery[0]._id.toHexString() != id.toHexString())
          throw new ValidationError(
            `Saascipe "${existingSaascipeVersionQuery[0].name}" version "${data.version}" already exists`
          );
    }

    const defaultFilter = {_id: id, _publisherTeamId: _teamId};
    if (filter) filter = Object.assign(defaultFilter, filter);
    else filter = defaultFilter;

    const saascipeVersion = await SaascipeVersionModel.findOneAndUpdate(filter, data);

    if (!saascipeVersion) throw new MissingObjectError(`Saascipe Version with id '${id}' not found.`);

    let deltas = Object.assign({_id: id}, data);
    let convertedDeltas = convertData(SaascipeVersionSchema, deltas);
    await rabbitMQPublisher.publish(
      _teamId,
      "SaascipeVersion",
      correlationId,
      PayloadOperation.UPDATE,
      convertedDeltas
    );

    return this.findSaascipeVersion(id, responseFields);
  }

  public async deleteSaascipeVersion(
    _teamId: mongodb.ObjectId,
    id: mongodb.ObjectId,
    correlationId?: string
  ): Promise<object> {
    const deleted = await SaascipeVersionModel.deleteOne({_id: id});

    await rabbitMQPublisher.publish(_teamId, "SaascipeVersion", correlationId, PayloadOperation.DELETE, {
      id,
      correlationId,
    });

    return deleted;
  }
}

export const saascipeVersionService = new SaascipeVersionService();
