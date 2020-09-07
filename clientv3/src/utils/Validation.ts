import { extend as vee_validate_extend } from 'vee-validate';
import _ from 'lodash';


vee_validate_extend('required', {
  validate (value) {
    return {
      required: true,
      valid: ['', null, undefined].indexOf(value) === -1
    };
  },
  computesRequired: true
});

const initValidation = function(){
  // custom validation rules for saas glue
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
    console.log('called valid-regex', value);
    try {
      const re = new RegExp(value);
      console.log('returning true yo');
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

}

export { initValidation };