import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { OrgSchema, OrgModel } from '../domain/Org';
import { defaultBulkGet } from '../utils/BulkGet';
import { orgService } from '../services/OrgService';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import { UserSchema } from '../domain/User';
import { userService } from '../services/UserService';
import { BaseLogger } from '../../shared/KikiLogger';
const jwt = require('jsonwebtoken');
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as config from 'config';


export class OrgController {


  public async getManyOrgs(req: Request, resp: Response, next: NextFunction): Promise<void> {
    // todo: prevent access from non-admin users
    defaultBulkGet({}, req, resp, next, OrgSchema, OrgModel, orgService);
  }


  public async getOrg(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {      
      const response: ResponseWrapper = (resp as any).body;
      const org = await orgService.findOrg(new mongodb.ObjectId(req.params.orgId), req.query.responseFields);      
      
      if(!org){
        next(new MissingObjectError(`Org ${req.params.orgId} not found.`));        
      }
      else {        
        response.data = convertResponseData(OrgSchema, org);
        next(); 
      }      
    }
    catch(err){
      // If req.params.orgId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if(err instanceof CastError){
        next(new MissingObjectError(`Org ${req.params.orgId} not found.`));
      }
      else {
        next(err);
      }
    }
  }
  
  
  public async createOrg(req: Request, resp: Response, next: NextFunction): Promise<void> {    
    const logger: BaseLogger = (<any>req).logger;
    const response: ResponseWrapper = resp['body'];
    try {
      if (!req.headers.userid) {
        next(new ValidationError(`Missing user id in header.`));
        return;
      }

      const userId = new mongodb.ObjectId(req.headers.userid);
      const user: UserSchema = <UserSchema>await userService.findUser(userId);
      if ( !user) {
        next(new MissingObjectError(`User '${req.headers.userid}' not found.`));
        return;
      }

      req.body['ownerId'] = userId;
      const newOrg: OrgSchema = <OrgSchema>await orgService.createOrg(convertRequestData(OrgSchema, req.body), logger, req.query.responseFields);
      response.data = convertResponseData(OrgSchema, newOrg);
      delete response.data.rmqPassword;
      response.statusCode = ResponseCode.CREATED;

      if (!user.orgIds)
        user.orgIds = [];
      user.orgIds.push(newOrg._id.toHexString());

      const userUpdated: UserSchema = <UserSchema>await userService.updateUser(userId, { "orgIds": user.orgIds });
  
      const jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // 1 day
      const secret = config.get('secret');
      var token = jwt.sign({ 
          id: userUpdated._id,
          email: userUpdated.email,
          orgIds: userUpdated.orgIds,
          orgIdsInvited: userUpdated.orgIdsInvited,
          name: userUpdated.name,
          companyName: userUpdated.companyName,
          exp: Math.floor(jwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key
  
      resp.cookie('Auth', token, {secure: false, expires: new Date(jwtExpiration)});

      next();
    } 
    catch (err) {  
      console.error(err);    
      next(err);
    }
  }
  
  
  public async updateOrg(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const response: ResponseWrapper = resp['body'];
    try {
      const updatedOrg: any = await orgService.updateOrg(new mongodb.ObjectId(req.params.orgId), convertRequestData(OrgSchema, req.body), req.query.responseFields);

      if(_.isArray(updatedOrg) && updatedOrg.length === 0){
        next(new MissingObjectError(`Org ${req.params.orgId} not found.`));        
      }
      else {      
        response.data = convertResponseData(OrgSchema, updatedOrg);      
        response.statusCode = ResponseCode.OK;
        next();
      }
    } 
    catch (err) {      
      next(err);
    }
  }
}

export const orgController = new OrgController();