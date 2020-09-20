import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import store from '../../store';
import { StoreType } from '@/store/types';
import router from '@/router'; 

export function isErrorPaidTierSuggestion(err:any){
  return    err.response
         && err.response.status === 401
         && err.response.data
         && err.response.data.errors
         && err.response.data.errors.length > 0
         && err.response.data.errors[0].description === 'Please upgrade to the paid tier to run Jobs';
}

(<any>window).showInvoicePage = function(){
  router.push({name: 'invoices'});
  store.commit(`${StoreType.AlertStore}/removeAll`);
};

export function showPaidTierPopup(){
  const alertHtml = `<br>
                      To enable this feature, please upgrade to the paid tier by entering 
                      your credit card information <a onclick="showInvoicePage()">here</a>.
                    <br><br>
                    Coming soon: (as Jay has the marketing site ready)<br>
                    Click <a href="">here</a> for more information about saas glue pricing.
                    <br><br>&nbsp;`;
  store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(alertHtml, AlertPlacement.WINDOW, AlertCategory.INFO));
} 