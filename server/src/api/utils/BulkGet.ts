
import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../utils/Errors';
import { ResponseWrapper } from './Types';
import { convertData } from '../utils/ResponseConverters';
import * as _ from 'lodash';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';


/*
  usage example: [endpoint]?filter=dateCompleted<${Number(dateCutoff)}&limit=1&responseFields=id isActive billing_address1
*/

export enum FilterOperator {
  LIKE = '~=',
  NOT_LIKE = '<>=',
  EQUALS = '==',
  NOT_EQUALS = '!=',
  IN = '->',
  GREATER_THAN_EQUAL_TO = '>=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  LESS_THAN_EQUAL_TO = '<='
};
 

// convert filter string into parsed filter objects with prop, op and params
// throws on any suspicous / wrong input it can recognize
export const parseFilter = function(inputFilter: string){
  const parsedFilter = [];
  const inputFilterParts = inputFilter.split(/(?<!\[[^\]]*),(?![^\[]*\])/).filter(part => part.trim()); // remove blank entries  
  
  for(let filterPart of inputFilterParts){
    const parts = filterPart.split(/([\w\.]+)+([=!~<>\-\s]+)+(.*)/);
    if(parts.length < 4){
      throw new ValidationError(`The input filter '${inputFilter}" had a part that didn't appear to be well formed "${filterPart}'`);
    }

    const prop = parts[1].trim();
    const op = parts[2].trim();
    let params: any = parts[3].trim();

    switch(op){
      case FilterOperator.EQUALS: case FilterOperator.NOT_EQUALS:
        params = params.replace(/"/g, '');
        break;

      case FilterOperator.LESS_THAN: case FilterOperator.GREATER_THAN: case FilterOperator.LESS_THAN_EQUAL_TO: case FilterOperator.GREATER_THAN_EQUAL_TO:
        params = Number(params);
        if(isNaN(params)){
          throw new ValidationError(`The input filter '${inputFilter}" had a ${op} operator that didn't have a valid number "${filterPart}'`);
        }
        break;

      case FilterOperator.LIKE: case FilterOperator.NOT_LIKE:
        params = new RegExp(params.trim(), 'i');
        break;

      case FilterOperator.IN:
        try {          
          // The value should be a simple array so it should be easily parsed as JSON
          params = JSON.parse(params);
        }
        catch(e){
          throw new ValidationError(`The input filter '${inputFilter}" had a -> filter didn't appear to be well formed "${filterPart}'`);
        }
        break;

      default:
        throw new ValidationError(`The input filter '${inputFilter}" contained an unknown operator "${op}'`);
    }

    parsedFilter.push({prop, op, params});
  }

  return parsedFilter;
};


export const verifyParsedFiltersAllowed = function(schemaClass, parsedFilter: any){  
  if(schemaClass.validFilters){
    for(let filter of parsedFilter){
      if(!schemaClass.validFilters[filter.prop]){
        throw new ValidationError(`Filter prop ${filter.prop} is not allowed for domain.`);
      }
      else if(schemaClass.validFilters[filter.prop].indexOf(filter.op) === -1) {
        throw new ValidationError(`Filter prop ${filter.prop} can't handle the operator ${filter.op}.`);
      }
    }
  }
  else {
    return true; // there was no filter which is OK
  }
};


// Database stores _id but queries are done by id
export const convertPropAlias = function(schemaClass, prop){  
  if(schemaClass.propAliases && schemaClass.propAliases[prop]){
    return schemaClass.propAliases[prop];
  }
  else {
    return prop;
  }
};

// Take a schema / model and a parsed filter and return a mongo query
export const convertParsedFilterToQuery = function(schemaClass, modelClass, parsedFilter: any){
  const query = parsedFilter.reduce((query: any, filter: any) => {
    const propAlias = convertPropAlias(schemaClass, filter.prop);
    switch(filter.op){
      case FilterOperator.EQUALS: case FilterOperator.LIKE:           
        query = query.find({[propAlias]: filter.params}); 
        break;
      
      case FilterOperator.NOT_EQUALS:
        query = query.where(propAlias).ne(filter.params);
        break;
      
      case FilterOperator.NOT_LIKE: // sadly not like doesn't work yet because .ne can't handle regular expressions
          query = query.where(propAlias).ne(filter.params);
        break;

      case FilterOperator.GREATER_THAN:
        query = query.where(propAlias).gt(filter.params);
        break;

      case FilterOperator.GREATER_THAN_EQUAL_TO:
        query = query.where(propAlias).gte(filter.params);
        break;

      case FilterOperator.LESS_THAN:
        query = query.where(propAlias).lt(filter.params);
        break;

      case FilterOperator.LESS_THAN_EQUAL_TO:
        query = query.where(propAlias).lte(filter.params);
        break;

      case FilterOperator.IN:
        query = query.where(propAlias).in(filter.params);
        break;
    }

    return query;
  }, modelClass.find());

  //console.log('query: ', query);

  return query;
};



type QueryOptions = {
  filter?: string,
  limit?: number,
  lastId?: string
  responseFields?: string
};


export const createQuery = function(schemaClass, modelClass, {filter = '', limit = 100, lastId, responseFields}: QueryOptions){
  let query;  

  if(filter.trim()){
    const parsedFilter = parseFilter(filter.trim());
    verifyParsedFiltersAllowed(schemaClass, parsedFilter);
    query = convertParsedFilterToQuery(schemaClass, modelClass, parsedFilter);
  }
  else {
    query = modelClass.find();
  }

  if(lastId){
    query.where('_id').gt(lastId);
  }

  if(responseFields){
    query.select(responseFields);
  }

  if(limit){
    if(isNaN(limit)){
      throw new ValidationError(`Limit was specified that wasn't a number ${limit}`);
    }
    if(_.isString(limit)){
      limit = Number.parseInt(<string><any>limit);
    }
    
    query.limit(limit);
  }

  return query;
};


type CountQueryOptions = {
  filter?: string,  
  lastId?: string  
};


export const createCountQuery = function(schemaClass, modelClass, {filter = '', lastId}: CountQueryOptions){  
  return createQuery(schemaClass, modelClass, {filter, limit: null, lastId, responseFields: '_id'});
};


// This is a default bulk get handler that you can use
// Controllers that don't use this default handler will be responsible to set up the meta pagination and invoke the convertData themselves
export const defaultBulkGet = async function(filter: any, req: Request, resp: Response, next: NextFunction, schemaClass, modelClass, service): Promise<void> {
  try {
    const countQuery = createCountQuery(schemaClass, modelClass, req.query).find(filter);
    // console.log('BulkGet -> defaultBulkGet -> req.query -> ', JSON.stringify(req.query, null, 4));
    const query = createQuery(schemaClass, modelClass, req.query).find(filter);
    // console.log('BulkGet -> defaultBulkGet -> query -> ', JSON.stringify(query, null, 4));

    if(service.updateBulkQuery){
      service.updateBulkQuery(countQuery);
      service.updateBulkQuery(query);
    }

    const response: ResponseWrapper = (resp as any).body;
    
    console.log('defaultBulkGet');
    response.data = convertData(schemaClass, await query.exec());
    // console.log('defaultBulkGet -> response.data -> ', response.data);

    if(!response.meta){
      response.meta = {};
    }

    (<any>response.meta).count = await countQuery.countDocuments().exec();
  
    next();
  }
  catch(err){
    // Mongo CastError occurs when the ids aren't well formed
    // console.log('defaultBulkGet -> err -> ', err);
    if(err instanceof CastError){
      next(new MissingObjectError(`Filter ids don't appear to be valid ${req.query.filter}.`));
    }
    else {
      next(err);
    }
  }
}