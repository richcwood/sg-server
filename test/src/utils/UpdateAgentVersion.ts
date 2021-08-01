import * as config from 'config';
import { MongoRepo } from '../../../server/src/shared/MongoLib';
import { BaseLogger } from '../../../server/src/shared/SGLogger';
import * as _ from 'lodash';


let UpdateAgentVersion = async () => {
  const mongoUrl = config.get('mongoUrl');
  const mongoDbname = config.get('mongoDbName');

  let logger = new BaseLogger('RunTestHarness');
  logger.Start();

  let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);

  const version = process.argv[2];

  let _teamId = mongoRepo.ObjectIdFromString('5de95c0453162e8891f5a830');
  if (process.argv.length > 3)
    _teamId = mongoRepo.ObjectIdFromString(process.argv[3]);

  let _agentId: any = undefined;
  if (process.argv.length > 4)
    _agentId = mongoRepo.ObjectIdFromString(process.argv[4]);

  console.log('version -> ', version);
  console.log('_teamId -> ', _teamId);
  console.log('_agentId -> ', _agentId);

  let filter: any = { _teamId };
  if (_agentId)
    filter['_id'] = _agentId;
  let res = await mongoRepo.UpdateMany('agent', filter, { $set: { 'targetVersion': version } });
  console.log(res);
}


UpdateAgentVersion();
