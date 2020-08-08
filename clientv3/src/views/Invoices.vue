<template>
  <div class="main" style="margin-left: 36px; margin-right: 12px;">


    <!-- Modals -->
    <modal name="confirm-payment-modal" :classes="'round-popup'" :width="400" :height="200">
      <table class="table" width="100%" height="100%">
        <tbody class="tbody">
          <tr class="tr">
            <td class="td"></td>
            <td class="td">Send payment?</td>
          </tr>
          <tr class="tr">
            <td class="td">Amount</td>
            <td class="td">{{paymentAmount}}</td>
          </tr>
          <tr class="tr" v-if="isPaying">
            <td class="td" colspan="2">Submitting payment. Please wait...</td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <button class="button is-primary" @click="submitPayment" :disabled="isPaying">Send Payment</button> 
              <button class="button button-spaced" @click="cancelPayment" :disabled="isPaying">Cancel</button>
            </td>
          </tr>
        </tbody> 
      </table>
    </modal>





    <div style="font-size: 24px; margin-bottom: 16px;">
      Invoices and Payments
    </div>
    <table class="table">

      <tr class="tr">
        <td class="td">
          <div id="dropin-container"></div>
        </td>
      </tr>

      <tr class="tr" v-if="showAddCardButton">
        <td class="td">
          <button class="button is-primary" @click="onAddCardClicked">Add Card</button>
        </td>
      </tr>

      <tr class="tr">
        <td class="td">
          <span style="font-size: 24px;">Payments Due</span>
          <div v-if="unPaidInvoices.length === 0">
            No unpaid invoices
          </div>
          <table v-else class="table">
            <tr class="tr">
              <td class="td">
                Invoice Date
              </td>
              <td class="td">
                Invoice ID
              </td>
              <td class="td">
                Status
              </td>
              <td class="td">
                Amount Due
              </td>
              <td class="td">
                Amount Paid
              </td>
              <td class="td">
                
              </td>
            </tr>
            <tr class="tr" v-for="invoice in unPaidInvoices" v-bind:key="invoice.id">
              <td class="td">
                {{momentToStringV3(invoice.startDate)}}
              </td>
              <td class="td">
                {{invoice.id}}
              </td>
              <td class="td">
                {{enumKeyToPretty(InvoiceStatus, invoice.status)}}
              </td>
              <td class="td">
                {{invoice.billAmount}} 
              </td>
              <td class="td">
                {{invoice.paidAmount}}
              </td>
              <td class="td">
                <input class="input" type="text" style="width: 75px;" v-model="paymentAmounts[invoice.id]">
                <button class="button is-primary button-spaced" @click="onSubmitPaymentClicked(invoice)" :disabled="shouldDisablePaymentSubmit(invoice)">Submit Payment</button>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr class="tr">
        <td class="td">
          <span style="font-size: 24px;">Payments History</span>
          <div v-if="paidInvoices.length === 0">
            No previously paid invoices
          </div>
          <table v-else class="table">
            <tr class="tr">
              <td class="td">
                Payment Date
              </td>
              <td class="td">
                Invoice ID
              </td>
              <td class="td">
                Payment Instrument
              </td>
              <td class="td">
                Transaction Type
              </td>
              <td class="td">
                Payment Method
              </td>
              <td class="td">
                Transaction Amount
              </td>
              <td class="td">
                Status
              </td>
            </tr>
            <template v-for="invoice in paidInvoices">
              <tr class="tr" v-for="transaction in getTransactionsByInvoice(invoice)" v-bind:key="transaction.id">
                <td class="td">
                  {{momentToStringV3(transaction.createdAt)}}
                </td>
                <td class="td">
                  <a @click.prevent="onDownloadInvoiceClicked(invoice)">{{invoice.id}}</a>
                </td>
                <td class="td">
                  {{transaction.paymentInstrument}}
                </td>
                <td class="td">
                  {{transaction.transactionType}}
                </td>
                <td class="td">
                  {{transaction.paymentInstrumentType}}
                </td>
                <td class="td">
                  {{transaction.amount}}
                </td>
                <td class="td">
                  {{transaction.status}}
                </td>
              </tr>
            </template>
          </table>
        </td>
      </tr>

    </table>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { BindStoreModel, BindSelected, BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';
import { OrgVar } from '@/store/orgVar/types';
import { KikiAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { Invoice, InvoiceStatus } from '@/store/invoice/types';
import { PaymentTransaction, PaymentTransactionType, PaymentTransactionStatus } from '@/store/paymentTransaction/types';
import { momentToStringV3 } from '@/utils/DateTime';
import { enumKeyToPretty, enumKeys, OrgPricingTier } from '@/utils/Enums';
import {create as createBraintreeClient } from 'braintree-web/client';
import { Org } from '@/store/org/types';
import { showErrors } from '@/utils/ErrorHandler';
import axios from 'axios';
import dropin from 'braintree-web-drop-in';

@Component({
  components: { ValidationProvider, ValidationObserver },
  props: { },
})
export default class PaymentMethods extends Vue { 
  // Expose to template
  private readonly InvoiceStatus = InvoiceStatus;
  private readonly PaymentTransactionType = PaymentTransactionType;
  private readonly PaymentTransactionStatus = PaymentTransactionStatus;
  private readonly momentToStringV3 = momentToStringV3;
  private readonly enumKeyToPretty = enumKeyToPretty;

  private cardholderNameInterval = null;
  private showAddCardButton = false;

  private static paymentTokenPromise;
  private paymentDropin;

  private canSubmitPayment = false;

  private paymentAmounts = {};

  @BindStoreModel({storeType: StoreType.OrgStore})
  private selectedOrg: Org;

  private get paidInvoices(){
    return this.$store.getters[`${StoreType.InvoiceStore}/getPaidInvoices`];
  }

  private get unPaidInvoices(){
    return this.$store.getters[`${StoreType.InvoiceStore}/getUnPaidInvoices`];
  }

  private getTransactionsByInvoice(invoice: Invoice){
    return this.$store.getters[`${StoreType.PaymentTransactionStore}/getByInvoiceId`](invoice.id+'');
  }

  @Watch('unPaidInvoices')
  private onUnPaidInvoicesChanged(){
    // make sure the initial payment amounts are initialized
    for(let invoice of this.unPaidInvoices){
      if(!this.paymentAmounts[invoice.id]){
        this.paymentAmounts[invoice.id] = invoice.billAmount - invoice.paidAmount;
      }
    }
  }

  private mounted(){
    // just load all of the invoices and payment transactions
    this.$store.dispatch(`${StoreType.InvoiceStore}/fetchModelsByFilter`);
    this.$store.dispatch(`${StoreType.PaymentTransactionStore}/fetchModelsByFilter`);

    this.onUnPaidInvoicesChanged();

    // Load the static paymentTokenPromise / payment token once for all times the component is loaded in the session
    if(!PaymentMethods.paymentTokenPromise){
      PaymentMethods.paymentTokenPromise = new Promise(async (resolve: Function, reject: Function) => {
        try {
          const {data: {data: {token}}} = await axios.post('api/v0/paymenttoken');
          resolve(token);
        }
        catch(err){
          console.error('Unable to fetch the payment token from the API', err);
          reject();
        }
      });
    }

    this.setupPaymentDropin();
  }

  private beforeDestroy(){
    clearInterval(this.cardholderNameInterval);
  }

  // Braintree testing credit card numbers:
  // https://developers.braintreepayments.com/guides/credit-cards/testing-go-live/node
  // 4111111111111111 378282246310005   6011111111111117   4012000033330026    4012888888881881

  // You should really only call this once for the component
  private async setupPaymentDropin(){
    try {
      const paymentToken = await PaymentMethods.paymentTokenPromise;
      this.paymentDropin = await dropin.create({
        authorization: paymentToken,
        container: '#dropin-container',
        vaultManager: true, // allows customers to delete payments (maybe not a good idea for recurring payments?)
        card: {
          cardholderName: {
            required: true
          }
        }
      });

      // could not find a better way to do this :(
      // I wanted to make Add Card a separate step
      this.cardholderNameInterval = setInterval(() => {
        this.showAddCardButton = this.isShowingBTAddNewCardDialog(); // the input cardholder name is visible
      }, 250);

      // Find when we can try to actually submit a payment
      if(this.paymentDropin.isPaymentMethodRequestable()){
        this.canSubmitPayment = true;
      }
      this.paymentDropin.on('paymentMethodRequestable', (event) => {
        //console.log(event.type); // The type of Payment Method, e.g 'CreditCard', 'PayPalAccount'.
        //console.log(event.paymentMethodIsSelected); // True if a customer has selected a payment method when paymentMethodRequestable fires.
        this.canSubmitPayment = true;
      });

      this.paymentDropin.on('noPaymentMethodRequestable', () => {
        this.canSubmitPayment = false;
      });
    }
    catch(err){
      console.error('Unable to load the braintree drop-in UI', err);
    }
  }

  private isShowingBTAddNewCardDialog(){
    const nameEl = document.getElementById('braintree__card-view-input__cardholder-name');
    return nameEl && nameEl.offsetParent !== null;
  }

  private async onAddCardClicked(){
    // This will add the payment method into the braintree vault for this customer id
    try {
      const result = await this.paymentDropin.requestPaymentMethod();
      //console.log('added card', result);
    }
    catch(err){
      console.error('Unable to add card', err);
      this.showAddCardError(err);
    }
  }

  private showAddCardError(error: any){
    if(error._braintreeWebError && error._braintreeWebError.details && error._braintreeWebError.details.originalError){
      const originalError = error._braintreeWebError.details.originalError;

      if(originalError.fieldErrors){
        let errorStrings = '';

        // Braintree has a nightmare of a recursive structure I have to drill down into
        const extractFieldErrors = function(field: any){
          if(field.message){
            errorStrings += `${field.field}: ${field.message}<br>`;
          }
          else if(field.fieldErrors) {
            for(let fieldError of field.fieldErrors){
              extractFieldErrors(fieldError);
            }
          }
        };

        extractFieldErrors(originalError);
        
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new KikiAlert(`Error processing card:<br><br> ${errorStrings} <br><br>`, AlertPlacement.WINDOW));
      }
    }
  }

  @Watch('canSubmitPayment')
  private async onCanSubmitPaymentChanged(){
    try {
      if(this.canSubmitPayment){
        // If the ability to submit payments is a new thing that was just added
        if(this.selectedOrg.pricingTier === OrgPricingTier.FREE){
          console.log('moving from a free to a paid plan');
          await this.$store.dispatch(`${StoreType.OrgStore}/save`, {
            id: this.selectedOrg.id,
            pricingTier: OrgPricingTier.PAID
          });
          
          this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new KikiAlert(`Updated organization to a paid plan.`, AlertPlacement.FOOTER));
        }
      }
      else {
        if(this.selectedOrg.pricingTier === OrgPricingTier.PAID){
          console.log('moving from a paid to a free plan');

          await this.$store.dispatch(`${StoreType.OrgStore}/save`, {
            id: this.selectedOrg.id,
            pricingTier: OrgPricingTier.FREE
          });
          
          this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new KikiAlert(`Updated organization to a free plan.`, AlertPlacement.FOOTER));
        }
      }
    }
    catch(err){
      console.error(err);
      showErrors(`Error updating your account information in Saas Glue`, err);
    }
  }

  private shouldDisablePaymentSubmit(invoice: Invoice) {
    if(this.canSubmitPayment){
      return !this.paymentAmounts[invoice.id];
    }
    else {
      return true;
    }
  }

  private invoiceToPay = null;
  private paymentAmount = 0;
  private isPaying = false;

  private async onSubmitPaymentClicked(invoice: Invoice){
    try {
      this.invoiceToPay = invoice;
      this.paymentAmount = this.paymentAmounts[this.invoiceToPay.id];
      if(!this.paymentAmount){
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new KikiAlert(`Please specify a payment for the invoice`, AlertPlacement.WINDOW));
        return;
      }

      this.$modal.show('confirm-payment-modal');
    }
    catch(err){
      console.error('Unable to submit payment', err);
      this.showAddCardError(err);
    }
  }

  private async submitPayment(){
    try {
      this.isPaying = true;
      const {nonce} = await this.paymentDropin.requestPaymentMethod();

      const res = await axios.post('api/v0/payinvoicemanual', {
        nonce,
        _invoiceId: this.invoiceToPay.id,
        amount: this.paymentAmount
      });

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new KikiAlert(`Payment processed`, AlertPlacement.FOOTER));
      this.onUnPaidInvoicesChanged();
    }
    catch(err){
      console.error('Unable to submit payment', err);
      this.showAddCardError(err);
    }
    finally {
      this.isPaying = false;
      this.invoiceToPay = null;
      this.paymentAmount = 0;
      this.$modal.hide('confirm-payment-modal');
    }
  }

  private cancelPayment(){
    this.invoiceToPay = null;
    this.paymentAmount = 0;
    this.$modal.hide('confirm-payment-modal');
  }

  private async onDownloadInvoiceClicked(invoice: Invoice){
    try {
      const {data: {data: {url}}} = await axios.get(`api/v0/invoice/pdf/${invoice.id}`);
      console.log('res url is ', url);
      window.open(url);
    }
    catch(err){
      console.error(err);
      showErrors(`Error fetching the invoice`, err);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

  table {
    border-width: 0;
  }

  td {
    border-width: 0 !important;
  }

  .line-spacer {
    border-top-style: inset;
    border-top-width: 1px;
    margin-top: 8px;
    margin-bottom: 8px;
    border-color: grey;
  }

  .button-spaced {
    margin-left: 12px;
  }

  .validation-error {
    margin-top: 3px;
    margin-bottom: 3px;
    padding-left: 3px;
    padding-right: 3px;
    color: $danger;
  }

</style>
