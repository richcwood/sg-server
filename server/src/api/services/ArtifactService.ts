import {convertData} from "../utils/ResponseConverters";
import {ArtifactSchema, ArtifactModel} from "../domain/Artifact";
import {TaskDefSchema} from "../domain/TaskDef";
import {taskDefService} from "../services/TaskDefService";
import {rabbitMQPublisher, PayloadOperation} from "../utils/RabbitMQPublisher";
import {MissingObjectError, ValidationError} from "../utils/Errors";
import {S3Access} from "../../shared/S3Access";
import * as mongodb from "mongodb";
import * as _ from "lodash";
import * as config from "config";
import {FreeTierChecks} from "../../shared/FreeTierChecks";

export class ArtifactService {
  public async findAllArtifactsInternal(filter?: any, responseFields?: string): Promise<Array<ArtifactSchema>> {
    return ArtifactModel.find(filter).select(responseFields);
  }

  public async findAllArtifacts(_teamId: mongodb.ObjectId, responseFields?: string) {
    return ArtifactModel.find({_teamId}).select(responseFields);
  }

  public async findArtifact(_teamId: mongodb.ObjectId, id: mongodb.ObjectId) {
    const artifactQuery = await ArtifactModel.findById(id).find({_teamId}).select("prefix name type s3Path");
    if (!artifactQuery || (_.isArray(artifactQuery) && artifactQuery.length === 0))
      throw new MissingObjectError(`No artifact with id "${id.toHexString()}"`);
    const artifact: ArtifactSchema = artifactQuery[0];

    let s3Access = new S3Access();
    // let s3Path = "";
    // if (config.get("environment") != "production") s3Path += `${config.get("environment")}/`;
    // s3Path += `${_teamId.toHexString()}/`;
    // if (artifact.prefix) s3Path += `${artifact.prefix}`;
    // s3Path += artifact.name;
    let url = await s3Access.getSignedS3URL(artifact.s3Path, config.get("S3_BUCKET_TEAM_ARTIFACTS"));

    return Object.assign(artifact, {url});
  }

  public async createArtifactInternal(data: any): Promise<object> {
    const model = new ArtifactModel(data);
    await model.save();
    return;
  }

  /// Prefix should not have multiple consecutive forward slashes, should not start with a forward slash and should end with a forward slash
  ///     e.g. 'myfolder/subfolder/'
  private formatArtifactPrefix(prefix: string) {
    prefix = prefix.replace(/\/\//g, "/");
    if (prefix.startsWith("/")) prefix = prefix.substring(1);
    if (!prefix.endsWith("/")) prefix += "/";
    return prefix;
  }

  /// Artifacts meta data is stored in mongodb - the actual object is stored in s3 - a temporary secure url is returned when a new
  ///     artifact is created via POST which can then be used by the browser to upload the artifact directly to s3 - the url
  ///     is returned with the artifact object but is not saved to the database since it's temporary anyway
  public async createArtifact(_teamId: mongodb.ObjectId, data: any, correlationId: string): Promise<ArtifactSchema> {
    if (!data.name) throw new ValidationError(`Request body missing "name" parameter`);
    let filter = {_teamId, name: data.name};

    if (data.prefix) {
      data.prefix = this.formatArtifactPrefix(data.prefix);
      filter["prefix"] = data.prefix;
    }

    let s3Access = new S3Access();
    let s3Path = "";
    if (config.get("environment") != "production") s3Path += `${config.get("environment")}/`;
    s3Path += `${_teamId.toHexString()}/`;

    await FreeTierChecks.MaxArtifactStorageCheck(_teamId);

    if (data.prefix) s3Path += `${data.prefix}`;
    s3Path += data.name;

    data._teamId = _teamId;
    data.s3Path = s3Path;

    let newArtifact: ArtifactSchema;
    const existingArtifact = await this.findAllArtifactsInternal(filter, "_id");
    if (_.isArray(existingArtifact) && existingArtifact.length > 0) {
      newArtifact = await this.updateArtifact(_teamId, existingArtifact[0]._id, data, correlationId);
      // let msg: string = 'Artifact';
      // if (data.prefix)
      //     msg += ` prefix="${data.prefix}"`
      // msg += ` name="${data.name}" already exists`;
      // throw new ValidationError(msg);
    } else {
      const artifactModel = new ArtifactModel(data);
      newArtifact = await artifactModel.save();
    }

    const artifactQuery = await ArtifactModel.findById(newArtifact._id).find({_teamId});

    let url = await s3Access.putSignedS3URL(s3Path, config.get("S3_BUCKET_TEAM_ARTIFACTS"), newArtifact.type);
    newArtifact.url = url;

    await rabbitMQPublisher.publish(
      _teamId,
      "Artifact",
      correlationId,
      PayloadOperation.CREATE,
      convertData(ArtifactSchema, newArtifact)
    );
    return newArtifact; // fully populated model
  }

  /// Artifacts meta data cannot be changed - this method is for getting a secure url which can be used to replace the existing object in s3 - so no point
  ///     browser pushing anything from this method since nothing will change that would be relevant to other browsers
  public async updateArtifact(
    _teamId: mongodb.ObjectId,
    id: mongodb.ObjectId,
    data: any,
    correlationId: string
  ): Promise<ArtifactSchema> {
    if (!data.name) throw new ValidationError(`Request body missing "name" parameter`);

    if (data.prefix) data.prefix = this.formatArtifactPrefix(data.prefix);

    const artifactQuery = await ArtifactModel.findById(id).find({_teamId}).select("prefix name type s3Path");
    if (!artifactQuery || (_.isArray(artifactQuery) && artifactQuery.length === 0))
      throw new MissingObjectError(`No artifact with id "${id.toHexString()}"`);
    const artifact: ArtifactSchema = artifactQuery[0];

    let oldPrefix = artifact.prefix ? artifact.prefix : "";
    let newPrefix = data.prefix ? data.prefix : "";
    if (artifact.name != data.name || oldPrefix != newPrefix) {
      throw new ValidationError(`Artifact already exists with prefix="${oldPrefix}" name="${artifact.name}"`);
    }

    let s3Access = new S3Access();
    let url = await s3Access.putSignedS3URL(artifact.s3Path, config.get("S3_BUCKET_TEAM_ARTIFACTS"), artifact.type);
    artifact.url = url;

    const updatedArtifact = await ArtifactModel.findOneAndUpdate({_id: id}, {url}, {new: true});

    const deltas = Object.assign({_id: id, url});
    await rabbitMQPublisher.publish(
      _teamId,
      "Artifact",
      correlationId,
      PayloadOperation.UPDATE,
      convertData(ArtifactSchema, deltas)
    );

    return updatedArtifact; // fully populated model
  }

  public async deleteArtifact(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId: string): Promise<object> {
    const artifactQuery = await ArtifactModel.findById(id).find({_teamId}).select("prefix name type, s3Path");
    if (!artifactQuery || (_.isArray(artifactQuery) && artifactQuery.length === 0))
      throw new MissingObjectError(`No artifact with id "${id.toHexString()}"`);
    const artifact: ArtifactSchema = artifactQuery[0];

    const tasksDefQuery: any = await taskDefService.findTaskDefs(_teamId, {artifacts: id.toHexString()}, "_id name");
    if (_.isArray(tasksDefQuery) && tasksDefQuery.length > 0) {
      const tasksAsString = tasksDefQuery.map((t: TaskDefSchema) => `${t.name} - ${t._id.toHexString()}`);
      throw new ValidationError(
        `Error deleting artifact - artifact is attached to the following tasks: ${tasksAsString}`
      );
    }

    const deleted = await ArtifactModel.deleteOne({_id: id, _teamId});

    let s3Access = new S3Access();
    await s3Access.deleteObject(artifact.s3Path, config.get("S3_BUCKET_TEAM_ARTIFACTS"));

    await rabbitMQPublisher.publish(_teamId, "Artifact", correlationId, PayloadOperation.DELETE, {_id: id});

    return deleted;
  }
}

export const artifactService = new ArtifactService();
