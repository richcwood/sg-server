import { KikiAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { StoreType } from '@/store/types';
import { AxiosResponse } from 'axios';
import store from '../store/index';
import _ from 'lodash';

// Try to show formatted errors for API responses in try / catch blocks with axios
export const showErrors = (message: string, err: any) => {
  const axiosResponse: AxiosResponse|null = err.response ? <AxiosResponse> err.response : null;

  if(axiosResponse && axiosResponse.data && axiosResponse.data.errors){
    const errors = axiosResponse.data.errors;
    message += `<table class="table" style="margin-top: 10px; margin-bottom: 10px;>`;
    errors.map(({title, description}) => {
      message += `<tr class="tr"> 
                    <td class="td">${title}</td> 
                    <td class="td">${description}</td> 
                  </tr>`;
    });
    message += `</table>`;
  }
  else if(_.isString(err)){
    message += err;
  }

  store.dispatch(`${StoreType.AlertStore}/addAlert`, new KikiAlert(message, AlertPlacement.WINDOW, AlertCategory.ERROR));
}