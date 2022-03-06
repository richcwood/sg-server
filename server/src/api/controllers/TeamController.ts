import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { TeamSchema, TeamModel } from '../domain/Team';
import { defaultBulkGet } from '../utils/BulkGet';
import { teamService } from '../services/TeamService';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import { UserSchema } from '../domain/User';
import { userService } from '../services/UserService';
import { BaseLogger } from '../../shared/SGLogger';
import { GetAccessRightIdsForTeamAdmin } from '../../api/utils/Shared';
const jwt = require('jsonwebtoken');
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as config from 'config';


export class TeamController {


  public async getManyTeams(req: Request, resp: Response, next: NextFunction): Promise<void> {
    // todo: prevent access from non-admin users
    defaultBulkGet({}, req, resp, next, TeamSchema, TeamModel, teamService);
  }


  public async getTeam(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {      
      const response: ResponseWrapper = (resp as any).body;
      const team = await teamService.findTeam(new mongodb.ObjectId(req.params.teamId), (<string>req.query.responseFields));      
      
      if(!team){
        next(new MissingObjectError(`Team ${req.params.teamId} not found.`));        
      }
      else {        
        response.data = convertResponseData(TeamSchema, team);
        next(); 
      }      
    }
    catch(err){
      // If req.params.teamId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if(err instanceof Error.CastError){
        next(new MissingObjectError(`Team ${req.params.teamId} not found.`));
      }
      else {
        next(err);
      }
    }
  }
  
  
  public async createUnassignedTeam(req: Request, resp: Response, next: NextFunction): Promise<void> {    
    const logger: BaseLogger = (<any>req).logger;
    const response: ResponseWrapper = resp['body'];
    try {
      const newTeam: TeamSchema = <TeamSchema>await teamService.createUnassignedTeam(convertRequestData(TeamSchema, req.body), logger, (<string>req.query.responseFields));
      response.data = convertResponseData(TeamSchema, newTeam);
      response.statusCode = ResponseCode.CREATED;

      next();
    } 
    catch (err) {  
      console.error(err);    
      next(err);
    }
  }
  
  
  public async createTeam(req: Request, resp: Response, next: NextFunction): Promise<void> {    
    const logger: BaseLogger = (<any>req).logger;
    const response: ResponseWrapper = resp['body'];
    try {
      if (!req.headers.userid) {
        next(new ValidationError(`Missing user id in header.`));
        return;
      }

      const userId = new mongodb.ObjectId(<string>req.headers.userid);
      const user: UserSchema = <UserSchema>await userService.findUser(userId);
      if ( !user) {
        next(new MissingObjectError(`User '${req.headers.userid}' not found.`));
        return;
      }

      req.body['ownerId'] = userId;
      const newTeam: TeamSchema = <TeamSchema>await teamService.createTeam(convertRequestData(TeamSchema, req.body), logger, (<string>req.query.responseFields));
      response.data = convertResponseData(TeamSchema, newTeam);
      delete response.data.rmqPassword;
      response.statusCode = ResponseCode.CREATED;

      if (!user.teamIds)
        user.teamIds = [];
      user.teamIds.push(newTeam._id.toHexString());

      user.teamAccessRightIds[newTeam._id.toHexString()] = GetAccessRightIdsForTeamAdmin();

      const userUpdated: UserSchema = <UserSchema>await userService.updateUserInternal(userId, { "teamIds": user.teamIds, "teamAccessRightIds": user.teamAccessRightIds }, logger);
  
      const jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // 1 day
      const secret = config.get('secret');
      var token = jwt.sign({ 
          id: userUpdated._id,
          email: userUpdated.email,
          teamIds: userUpdated.teamIds,
          teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(userUpdated),
          teamIdsInvited: userUpdated.teamIdsInvited,
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
  
  
  public async updateTeam(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const response: ResponseWrapper = resp['body'];
    try {
      const updatedTeam: any = await teamService.updateTeam(new mongodb.ObjectId(req.params.teamId), convertRequestData(TeamSchema, req.body), (<string>req.query.responseFields));

      if(_.isArray(updatedTeam) && updatedTeam.length === 0){
        next(new MissingObjectError(`Team ${req.params.teamId} not found.`));        
      }
      else {      
        response.data = convertResponseData(TeamSchema, updatedTeam);      
        response.statusCode = ResponseCode.OK;
        next();
      }
    } 
    catch (err) {      
      next(err);
    }
  }
}

export const teamController = new TeamController();