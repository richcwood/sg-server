import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import store from '../../store';
import { StoreType } from '@/store/types';
import router from '@/router'; 

export function isErrorPaidTierSuggestion(err: any){
  return    err.response
         && err.response.status === 401
         && err.response.data
         && err.response.data.errors
         && err.response.data.errors.length > 0
         && err.response.data.errors[0].title === 'FreeTierLimitExceededError';
}

(<any>window).showInvoicePage = function(){
  router.push({name: 'invoices'});
  store.commit(`${StoreType.AlertStore}/removeAll`);
};

export function showPaidTierPopup(){
  const alertHtml = `<br>To enable this feature, please upgrade to the paid tier by entering 
                      your credit card information <a onclick="showInvoicePage()">here</a>.
                    <br><br>
                    Click <a href="http://saasglue.com/saas-glue-pricing/">here</a> for more information about SaasGlue pricing.
                    <br><br>&nbsp;`;
  store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(alertHtml, AlertPlacement.WINDOW, AlertCategory.INFO));
} 