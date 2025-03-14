import { Request, Response, NextFunction } from 'express';
import { AccessRightSchema } from '../domain/AccessRight';
import { AccessRightModel } from '../domain/AccessRight';
import { ForbiddenError } from '../utils/Errors';
import BitSet from 'bitset';

import * as config from 'config';

let accessRightNameToIdMap: { [rightName: string]: number };

export const convertAccessRightNamesToIds = async (accessRightNames: string[]) => {
    const accessRightIds: number[] = [];

    if (!accessRightNameToIdMap || Object.keys(accessRightNameToIdMap).length < 1) {
        accessRightNameToIdMap = {};
        // load the access rights from the db
        // If new access right definitions are added (rarely) the app servers must be restarted to reload the rights
        const accessRights = <AccessRightSchema[]>await AccessRightModel.find();
        for (let i = 0; i < accessRights.length; i++) {
            let accessRight = accessRights[i];
            accessRightNameToIdMap[accessRight.name] = accessRight.rightId;
        }
    }

    for (let accessRightName of accessRightNames) {
        if (!accessRightNameToIdMap[accessRightName]) {
            throw new Error(`Unable to find specified access right name ${accessRightName}`);
        } else {
            accessRightIds.push(accessRightNameToIdMap[accessRightName]);
        }
    }

    return accessRightIds;
};

export const verifyAccessRights = (rightNamesToVerify: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const teamAccessRightIds = req.headers.teamAccessRightIds;
        const teamId = <string>req.headers._teamid;
        const sgAdminTeam = process.env.sgAdminTeam;

        if (teamAccessRightIds && teamAccessRightIds[teamId]) {
            const rightIdsToVerify = await convertAccessRightNamesToIds(rightNamesToVerify);
            const userRightsBitset = BitSet.fromHexString(teamAccessRightIds[teamId]);

            if (
                rightIdsToVerify.some((rightId: number) => {
                    return userRightsBitset.get(rightId) === 1;
                })
            ) {
                return next();
            } else {
                return next(new ForbiddenError(`User doesn't have access rights for this endpoint`, req.originalUrl));
            }
        } else if (teamAccessRightIds && teamAccessRightIds[sgAdminTeam]) {
            const rightIdsToVerify = await convertAccessRightNamesToIds(rightNamesToVerify);
            const userRightsBitset = BitSet.fromHexString(teamAccessRightIds[sgAdminTeam]);

            if (
                rightIdsToVerify.some((rightId: number) => {
                    return userRightsBitset.get(rightId) === 1;
                })
            ) {
                return next();
            } else {
                return next(new ForbiddenError(`User doesn't have access rights for this endpoint`, req.originalUrl));
            }
        } else {
            return next(); // no access right ids to verify
        }
    };
};
