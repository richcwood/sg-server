import { Request, Response, NextFunction } from 'express';
import { AccessRightSchema } from '../domain/AccessRight';
import { accessRightService } from '../services/AccessRightService';
import { ForbiddenError } from '../utils/Errors';
import BitSet from 'bitset';

let accessRightNameToIdMap: {[rightName: string]: number};

export const convertAccessRightNamesToIds = async (accessRightNames: string[]) => {
  const accessRightIds: number[] = [];

  if(!accessRightNameToIdMap){
    accessRightNameToIdMap = {};
    // load the access rights from the db
    // If new access right definitions are added (rarely) the app servers must be restarted to reload the rights
    const accessRights = <AccessRightSchema[]> await accessRightService.findAllAccessRights();
    for(let accessRight of accessRights){
      accessRightNameToIdMap[accessRight.name] = accessRight.rightId;
    }
  }

  for(let accessRightName of accessRightNames){
    if(!accessRightNameToIdMap[accessRightName]){
      throw new Error(`Unable to find specified access right name ${accessRightName}`);
    }
    else {
      accessRightIds.push(accessRightNameToIdMap[accessRightName]);
    }
  }

  return accessRightIds;
}


export const verifyAccessRights = (rightNamesToVerify: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const teamAccessRightIds = req.headers.teamAccessRightIds;
    const teamId = <string>req.headers._teamid;

    if(teamAccessRightIds && teamAccessRightIds[teamId]){
      const rightIdsToVerify = await convertAccessRightNamesToIds(rightNamesToVerify);
      const userRightsBitset = BitSet.fromHexString(teamAccessRightIds[teamId]);

      if(rightIdsToVerify.some((rightId: number) => {
        return userRightsBitset.get(rightId) === 1;
      })){
        return next();
      }
      else {
        return next(new ForbiddenError(`User doesn't have access rights for this endpoint`, req.originalUrl));
      }
    }
    else if(teamAccessRightIds && teamAccessRightIds['default']){
      const rightIdsToVerify = await convertAccessRightNamesToIds(rightNamesToVerify);
      const userRightsBitset = BitSet.fromHexString(teamAccessRightIds['default']);

      if(rightIdsToVerify.some((rightId: number) => {
        return userRightsBitset.get(rightId) === 1;
      })){
        return next();
      }
      else {
        return next(new ForbiddenError(`User doesn't have access rights for this endpoint`, req.originalUrl));
      }
    }
    else {
      return next(); // no access right ids to verify
    }
  }
}