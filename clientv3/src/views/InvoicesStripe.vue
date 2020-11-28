<template>
  <div>
    <!-- modals -->
    <modal name="add-payment-modal" :classes="'round-popup'" :width="500" :height="250">
      <validation-observer ref="addPaymentValidationObserver">
        <div style="background-color: white; width: 100%; height: 100%; padding: 20px;">
          <div>Enter your credit card information</div>
          <validation-provider name="Card Holder Name" rules="required|object-name" v-slot="{ errors }">
            <input class="input" id="cardholder-name" type="text" style="margin-top: 20px; margin-bottom: 20px; width: 400px" v-model="cardHolderName" placeholder="Card holder name">
            <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
          </validation-provider>
          <!-- placeholder for Strip injected elements -->
          <form id="setup-form" :data-secret="client_secret">
            <div id="card-element"></div>
            <button class="button is-primary" style="margin-top: 35px;" id="card-button" @click.prevent="onSaveCardClicked">
              Save Card
            </button>
            <button class="button" style="margin-top: 35px; margin-left: 10px;" id="card-button" @click.prevent="onCancelSaveCardClicked">
              Cancel
            </button>
          </form>
        </div>
      </validation-observer>
    </modal>



    <div class="main" style="margin-left: 36px; margin-right: 12px;">
      <button class="button" @click="onAddCardClicked">Add Credit Card</button>
    </div>
  </div>
</template> 

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { BindStoreModel, BindSelected, BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';
import { TeamVar } from '@/store/teamVar/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { Invoice, InvoiceStatus } from '@/store/invoice/types';
import { PaymentTransaction, PaymentTransactionType, PaymentTransactionStatus } from '@/store/paymentTransaction/types';
import { momentToStringV3 } from '@/utils/DateTime';
import { enumKeyToPretty, enumKeys, TeamPricingTier } from '@/utils/Enums';
import { Team } from '@/store/team/types';
import { showErrors } from '@/utils/ErrorHandler';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

@Component({
  components: { ValidationProvider, ValidationObserver },
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
    // just load all of the invoices and payment transactions
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

      console.log('add card results', addCardResults);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Added credit card to your account`, AlertPlacement.WINDOW));
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

  

</style>
