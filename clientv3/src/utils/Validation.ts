import { extend as vee_validate_extend } from 'vee-validate';
import { between, min_value } from 'vee-validate/dist/rules';
import enMessages from 'vee-validate/dist/locale/en.json';
import _ from 'lodash';

function isValueDefined (val: unknown): boolean {
  if (_.isString(val)) {
    return !_.isEmpty(val);
  }

  return !_.isNull(val) && !_.isUndefined(val);
}

vee_validate_extend('between', {
  ...between,
  message: enMessages.messages['between']
});

vee_validate_extend('min_value', {
  ...min_value,
  message: enMessages.messages['min_value']
});

vee_validate_extend('required', {
  validate (value) {
    return {
      required: true,
      valid: ['', null, undefined].indexOf(value) === -1
    };
  },
  computesRequired: true,
  message: enMessages.messages['required']
});

vee_validate_extend('required_checkbox', {
  validate (value: any[]): boolean {
    return value.length > 0;
  },
  message: 'At least one {_field_} must be selected.',
  computesRequired: true
});

const initValidation = function(){
  // custom validation rules for SaaSGlue
  const objectNameRegex = /^[\.a-zA-Z0-9 _-]{3,}$/;

  vee_validate_extend('object-name', value => {
    if( _.isString(value) && value.match(objectNameRegex) !== null){
      return true;
    }
    else {
      return '{_field_} is not a valid';
    }
  });

  vee_validate_extend('valid-regex', value => {
    try {
      const re = new RegExp(value);
      return true;
    }
    catch(err){
      return '{_field_} is not a valid regex';;
    }
  });

  vee_validate_extend('variable-map', value => {
    let returnValue: boolean|string = '{_field_} should be in form key1=value, key2=value2 etc';
    
    if( _.isString(value)){
      const items = value.split(',');

      try {
        if(items.every((item: string) => {
              const itemSplit = item.split('=');
              return itemSplit.length === 2 && itemSplit[0].trim() && itemSplit[1].trim()
            })){
          returnValue = true;
        }
      }
      catch(err){ } // nothing to report
    }
    
    return returnValue;
  });

  const positiveNumberRegex = /^\d*[1-9]\d*$/;

  vee_validate_extend('positiveNumber', value => {
    if(!_.isNaN(value)){
      value = value+'';
    }
    
    if( _.isString(value) && value.match(positiveNumberRegex) !== null){
      return true;
    }
    else {
      return '{_field_} should be in a positive number';
    }
  });

  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  vee_validate_extend('email', value => {
    if(value && value.trim()){
      return emailRegex.test(value.toLowerCase());
    }
    else {
      return true;
    }
  });

  const urlRegex = /^(http|https):\/\/[^ "]+$/;

  vee_validate_extend('url', value => {
    if(value && value.trim()){
      return urlRegex.test(value.toLowerCase());
    }
    else {
      return true;
    }
  });

  vee_validate_extend('datetime', value => {
    if(value && value.trim()){
      const date = new Date(value.trim());
      return ! isNaN(date.getTime());
    }
    else {
      return true;
    }
  });

  vee_validate_extend('agent-name', value => {
    if( _.isString(value) && value.match(objectNameRegex) !== null){
      return true;
    }
    else {
      return 'The {_field_} field is not valid.';
    }
  });

  vee_validate_extend('agent-positiveNumber', value => {
    if(!_.isNaN(value)){
      value = value+'';
    }
    
    if( _.isString(value) && value.match(positiveNumberRegex) !== null){
      return true;
    }
    else {
      return '{_field_} should be in a positive number';
    }
  });

  vee_validate_extend('lambdaTimeout', value => {
    if( value >= 1 && value <= 900){
      return true;
    }
    else {
      return '{_field_} should be in a number between 1 and 900';
    }
  });

  // Validates if object has a specific property
  // <ValidationProvider rules="required_field:myKey" /> - this will check if object under validation has 'myKey' property
  vee_validate_extend('required_field', {
    validate (value: Record<string, any>, { field }: any): boolean {
      return Boolean(value && value[field]);
    },
    computesRequired: true,
    params: ['field']
  });

  // This validator does cross-field validation,
  // it validates if at least one field is set
  //
  // <ValidationProvider rules="required_if_empty:@name,@email" />
  // Makes field under validation required if <ValidationProvider name="name" /> and <ValidationProvider name="email" />
  // have empty values
  vee_validate_extend('required_if_empty', {
    validate (value: any, values: any[]) {
      return values.some(isValueDefined) ? true : isValueDefined(value);
    },
    computesRequired: true,
    message: 'At least one field is required'
  });

  // This validator does cross-field validation,
  //  the first value in values should be a checkbox value - 
  //  it validates if the target field or one of the remaining values is set
  //
  // <ValidationProvider rules="required_if_checked:@checkbox,@name,@email" />
  // Makes field under validation required if <ValidationProvider name="name" /> is true
  //   and <ValidationProvider name="name" /> and <ValidationProvider name="email" />
  // have empty values
  vee_validate_extend('required_if_checked', {
    validate (value: any, values: any[]) {
      const checkbox_value = values[0];
      const other_fields = values.slice(1);
      if (checkbox_value)
        return other_fields.some(isValueDefined) ? true : isValueDefined(value);
      return true;
    },
    computesRequired: true,
    message: 'At least one field is required'
  });
}

export { initValidation };