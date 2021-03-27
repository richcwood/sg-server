<template>
  <span>
    <!-- Modals -->
    <modal name="confirm-payment-modal" :classes="'round-popup'" :width="500" :height="300">
      <table class="table" width="100%" height="100%">
        <tbody class="tbody">
          <tr class="tr">
            <td class="td"></td>
            <td class="td">Submit payment to SaasGlue for invoice?</td>
          </tr>
          <tr class="tr">
            <td class="td">Amount</td>
            <td class="td">$ {{paymentAmount}}</td>
          </tr>
          <tr class="tr">
            <td class="td">Payment Method</td>
            <td class="td">{{paymentMethodName}}</td>
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


    amount:
    <input class="input vertical-aligned-center" 
            type="text" 
            style="width: 75px;" 
            v-model="paymentAmount">

    <select class="input select button-spaced vertical-aligned-center" 
            style="width: 200px;"
            v-model="paymentMethodId">

      <option v-for="paymentMethod in paymentMethods" :key="paymentMethod.id" :value="paymentMethod.id">
        {{paymentMethod.name}}
      </option>
    </select> 

    <button class="button is-primary button-spaced vertical-aligned-center"  
            @click="onSubmitPaymentClicked(invoice)" 
            :disabled="shouldDisablePaymentSubmit">
      Submit Payment
    </button>
  </span>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { Invoice } from '../store/invoice/types';
import { Team } from '../store/team/types';
import { PaymentMethod } from '../store/paymentMethod/types';
import { StoreType } from '../store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '../store/alert/types';
import { BindStoreModel, BindSelected, BindSelectedCopy } from '../decorator';
import { showErrors } from '../utils/ErrorHandler';
import axios from 'axios';

// Should only be used with unpaid invoices
@Component
export default class InvoicePayment extends Vue {

  @Prop() 
  private invoice!: Invoice;

  private paymentAmount: number | null = null;

  private paymentMethodId: string|null = null;

  @BindStoreModel({ storeType: StoreType.PaymentMethodStore, selectedModelName: 'models'})
  private paymentMethods!: PaymentMethod[];

  @BindSelected({storeType: StoreType.TeamStore})
  private selectedTeam!: Team;

  private mounted(){
    this.paymentMethodId = this.selectedTeam.defaultPaymentMethodId;
  }

  private get shouldDisablePaymentSubmit() {
      return    ! this.paymentMethodId
             || ! this.paymentAmount
             || isNaN(this.paymentAmount)
             || this.paymentAmount < 0 
             || this.paymentAmount > this.invoice.billAmount;
  }

  private async onSubmitPaymentClicked(){
    try {
      if(!this.paymentAmount){
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Please specify a payment for the invoice`, AlertPlacement.WINDOW));
        return;
      }

      this.$modal.show('confirm-payment-modal');
    }
    catch(err){
      console.error('Unable to submit payment', err);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Error processing card.`, AlertPlacement.WINDOW));
    }
  }

  private get paymentMethodName(): string | null {
    
    if(this.paymentMethodId){
      const paymentMethod = this.paymentMethods.find((paymentMethod: PaymentMethod) => paymentMethod.id === this.paymentMethodId);
      if(paymentMethod){
        return paymentMethod.name;
      }
      else {
        return null;
      }
    }
    else {
      return null;
    }
  }

  private cancelPayment(){
    this.$modal.hide('confirm-payment-modal');
  }

  private isPaying = false;

  private async submitPayment(){
    try {
      this.isPaying = true;
      
      await axios.post('api/v0/payinvoicemanual', {
        _invoiceId: this.invoice.id,
        amount: this.paymentAmount,
        paymentMethodId: this.paymentMethodId
      });

      // Want to get the new amount updated in the invoice via browser push

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Payment of $${this.paymentAmount} successfully submitted`, AlertPlacement.WINDOW));
    }
    catch(err){
      console.error('Unable to submit payment', err);
      showErrors('Unable to submit the payment', err);
    }
    finally {
      this.isPaying = false;
      this.$modal.hide('confirm-payment-modal');
    }
  }

  @Watch('selectedTeam.defaultPaymentMethodId')
  private onTeamDefaultPaymentMethodChanged(){
    this.paymentMethodId = this.selectedTeam.defaultPaymentMethodId;
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
