<template>
  <div>
    <!-- modals -->
    <modal name="add-payment-modal" :classes="'round-popup'" :width="650" :height="325">
      <validation-observer ref="addPaymentValidationObserver">
        <div style="background-color: white; width: 100%; height: 100%; padding: 20px;">
          <div>Enter your credit card information for SaasGlue billing.</div>
          <div>Your credit card information is protected by Stripe Payments Service 
            <a href="https://stripe.com/" target="_blank">
              <img src="StripeLogo.png" width="60px" height="auto" style="margin-bottom: -5px;">
            </a>
          </div>
          <validation-provider name="Card Holder Name" rules="required|object-name" v-slot="{ errors }">
            <img src="Lock.png" width="40px" height="auto" style="margin-top: 18px;">
            <input class="input" id="cardholder-name" type="text" style="margin-top: 20px; margin-left: 5px; margin-bottom: 20px; width: 550px" v-model="cardHolderName" placeholder="Card holder name">
            <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
          </validation-provider>
          <!-- placeholder for Strip injected elements -->
          <form id="setup-form" :data-secret="client_secret">
            <div id="card-element"></div>
            <button class="button is-primary" style="margin-top: 35px; margin-left: 50px;" @click.prevent="onSaveCardClicked">
              Save Card Securely
            </button>
            <button class="button" style="margin-top: 35px; margin-left: 10px;" @click.prevent="onCancelSaveCardClicked">
              Cancel
            </button>
          </form>
        </div>
      </validation-observer>
    </modal> 

    <modal name="delete-payment-modal" :classes="'round-popup'" :width="600" :height="200">
      <div style="background-color: white; width: 100%; height: 100%; padding: 20px;">
        <div v-if="paymentMethodToDelete">
          Are you sure you want to delete the payment method <b>{{paymentMethodToDelete.name}}</b>?
          <br><br>
          <button class="button" @click="onCancelDeletePaymentMethodClicked">Cancel</button>
          <button class="button is-danger button-spaced" @click="deletePaymentMethod">Delete Payment Method</button>
        </div>
      </div>
    </modal>




    <div class="main" style="margin-left: 36px; margin-right: 12px;">
      <div>
        <button class="button is-primary" @click="onAddCardClicked" style="margin-left: 15px; margin-bottom: 15px;">Add Credit Card</button>
      </div>

      <table class="table">
        <tr class="tr">
          <td class="td">
            <span style="font-size: 24px;">Payment Methods</span>
            <div v-if="paymentMethods.length === 0">
              No payment methods added yet
            </div>
            <table v-else class="table">
              <tr class="tr">
                <td class="td">
                  Name
                </td>
                <td class="td">
                  Card Brand
                </td>
                <td class="td">
                  Is Default Card
                </td>
                <td class="td">
                  Delete
                </td>
              </tr>
              <tr class="tr" v-for="paymentMethod in paymentMethods" :key="paymentMethod.id">
                <td class="td">
                  {{paymentMethod.name}}
                </td>
                <td class="td">
                  {{paymentMethod.cardBrand}}
                </td>
                <td class="td">
                  <span v-if="isDefaultPaymentMethod(paymentMethod)" style="color: green;">Default</span>
                  <button v-else class="button vertical-aligned-center" @click="makeDefaultPaymentMethod(paymentMethod)">Make Default</button>
                </td>
                <td class="td">
                  <button class="button vertical-aligned-center" @click="onDeletePaymentMethodClicked(paymentMethod)">Delete Method</button>
                </td>
              </tr>
            </table>
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
                  {{momentToStringV3(invoice.endDate)}}
                </td>
                <td class="td">
                  {{invoice.id}}
                </td>
                <td class="td">
                  {{enumKeyToPretty(InvoiceStatus, invoice.status)}}
                </td>
                <td class="td">
                  {{(invoice.billAmount/100).toFixed(2)}} 
                </td>
                <td class="td">
                  {{(invoice.paidAmount/100).toFixed(2)}}
                </td>
                <td class="td">
                  <invoice-payment :invoice="invoice"></invoice-payment>
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

  </div>
</template> 

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { BindStoreModel, BindSelected, BindSelectedCopy } from '../decorator';
import { StoreType } from '../store/types';
import { TeamVar } from '@/store/teamVar/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { Invoice, InvoiceStatus } from '@/store/invoice/types';
import { PaymentTransaction, PaymentTransactionType, PaymentTransactionStatus } from '@/store/paymentTransaction/types';
import { momentToStringV3 } from '../utils/DateTime';
import { enumKeyToPretty, enumKeys, TeamPricingTier } from '../utils/Enums';
import { Team } from '../store/team/types';
import { showErrors } from '../utils/ErrorHandler';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentMethod } from '../store/paymentMethod/types';
import InvoicePayment from '../components/InvoicePayment.vue';

@Component({
  components: { ValidationProvider, ValidationObserver, InvoicePayment  },
  props: { },
})
export default class InvoicesStripe extends Vue { 
  // Expose to template
  private readonly InvoiceStatus = InvoiceStatus;
  private readonly PaymentTransactionType = PaymentTransactionType;
  private readonly PaymentTransactionStatus = PaymentTransactionStatus;
  private readonly momentToStringV3 = momentToStringV3;
  private readonly enumKeyToPretty = enumKeyToPretty;

  private static GetStripePublicKeyPromise;
  private static Stripe;
  private static StripeLoadedPromise;

  private client_secret: string|null = null;

  private mounted(){
    // just load all of the payment methods, invoices and payment transactions
    this.$store.dispatch(`${StoreType.PaymentMethodStore}/fetchModelsByFilter`);
    this.$store.dispatch(`${StoreType.InvoiceStore}/fetchModelsByFilter`);
    this.$store.dispatch(`${StoreType.PaymentTransactionStore}/fetchModelsByFilter`);

    this.setupStripe();
  }

  private async setupStripe(){
    let loadStripeResolve;
    InvoicesStripe.StripeLoadedPromise = new Promise((res) => {
      loadStripeResolve = res;
    });

    // Load the static paymentTokenPromise / payment token once for all times the component is loaded in the session
    if(!InvoicesStripe.GetStripePublicKeyPromise){
      InvoicesStripe.GetStripePublicKeyPromise = new Promise(async (resolve: Function, reject: Function) => {
        try {
          // get the stripe public key
          const {data: {data: {key}}} = await axios.get('api/v0/paymenttoken');
          resolve(key);
        }
        catch(err){
          console.error('Unable to fetch the payment token from the API', err);
          reject();
        }
      });
    }

    const publicKey = await InvoicesStripe.GetStripePublicKeyPromise;

    const {data: {data: {intent}}} = await axios.post('api/v0/paymenttoken');
    this.client_secret = intent.client_secret;

    InvoicesStripe.Stripe = await loadStripe(publicKey);

    loadStripeResolve();
  }

  private async mountStripeElements(){
    await InvoicesStripe.StripeLoadedPromise;

    const stripeElements = InvoicesStripe.Stripe.elements();
    this.cardElement = stripeElements.create('card', {
      style: {
        base: {
          iconColor: '#c4f0ff',
          color: 'black',
          fontWeight: 400,
          lineHeigth: '',
          fontFamily: 'Avenir, Nunito Sans, Tahoma',
          fontSize: '24px',
          fontSmoothing: 'antialiased',
          ':-webkit-autofill': {
            color: 'gray',
          },
          '::placeholder': {
            color: 'gray',
          },
        },
        invalid: {
          iconColor: 'red',
          color: 'red',
        }
      }
    });

    this.cardElement.mount('#card-element');
  }

  private cardElement;
  private cardHolderName: string = '';

  private onAddCardClicked(){
    this.$modal.show('add-payment-modal');

    setTimeout(() => {
      this.mountStripeElements();
    }, 100);
  }

  private async onSaveCardClicked(){
    if( ! await (<any>this.$refs.addPaymentValidationObserver).validate()){
      return;
    }

    try {
      const addCardResults = await InvoicesStripe.Stripe.confirmCardSetup(
        this.client_secret,
        {
          payment_method: {
            card: this.cardElement,
            billing_details: {
              name: this.cardHolderName,
            },
          },
        }
      );

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Added credit card to your account.<br><br>  It might take up to a minute to show in your payment methods.`, AlertPlacement.WINDOW));
    }
    catch(err){
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Error adding card:<br><br> ${err} <br><br>`, AlertPlacement.WINDOW));
    }
    finally {
      this.$modal.hide('add-payment-modal');
    }
  }

  private onCancelSaveCardClicked(){
    this.$modal.hide('add-payment-modal');
  }
  
  @BindStoreModel({ storeType: StoreType.PaymentMethodStore, selectedModelName: 'models'})
  private paymentMethods!: PaymentMethod[]; 

  private get paidInvoices(){
    return this.$store.getters[`${StoreType.InvoiceStore}/getPaidInvoices`];
  }

  private get unPaidInvoices() : Invoice[] {
    return this.$store.getters[`${StoreType.InvoiceStore}/getUnPaidInvoices`];
  }
  
  @BindSelected({storeType: StoreType.TeamStore})
  private selectedTeam!: Team;

  private isDefaultPaymentMethod(paymentMethod){
    return this.selectedTeam.defaultPaymentMethodId === paymentMethod.id;
  }

  private async makeDefaultPaymentMethod(paymentMethod: PaymentMethod){
    try {
       await this.$store.dispatch(`${StoreType.TeamStore}/save`, {
         id: this.selectedTeam.id,
         defaultPaymentMethodId: paymentMethod.id
       });

       this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Updated the default payment method`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors('Error updating the default payment method', err);
    }
  }

  private paymentMethodToDelete: null | PaymentMethod = null;

  private onDeletePaymentMethodClicked(paymentMethod: PaymentMethod){
    this.paymentMethodToDelete = paymentMethod;
    this.$modal.show('delete-payment-modal');
  }

  private onCancelDeletePaymentMethodClicked(){
    this.paymentMethodToDelete = null;
    this.$modal.hide('delete-payment-modal');
  }

  private async deletePaymentMethod(){
    if(!this.paymentMethodToDelete){
      return;
    }

    try {
      await this.$store.dispatch(`${StoreType.PaymentMethodStore}/delete`, this.paymentMethodToDelete);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Deleted the payment method`, AlertPlacement.WINDOW));
    }
    catch(err){
      console.error(err);
      showErrors(`Unable to delete the payment method.`, err);
    }
    finally {
      this.$modal.hide('delete-payment-modal');
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

  .button-spaced {
    margin-left: 12px;
  }

  .vertical-aligned-center {
    margin-top: -10px;
  }  

</style>
