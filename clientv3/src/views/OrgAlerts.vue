 <template>
  <div class="main" style="margin-left: 36px; margin-right: 12px;">

    

  <validation-observer ref="alertsValidationObserver">
    <table class="table">
      <tr class="tr">
        <td class="td" colspan="2">
          <span style="font-size: 24px; margin-bottom: 12px;">
            Email Alerts
          </span>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          <label class="label" style="margin-left: 20px;">Task Interrupted</label>
        </td>
        <td class="td">
          <validation-provider name="Task Interrupted Email Address" rules="email" v-slot="{ errors }"> 
            <input class="input" type="text" style="width: 400px;" v-model="selectedOrgCopy.onJobTaskInterruptedAlertEmail" placeholder="email@address.com"/>
            <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</span>
          </validation-provider>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          <label class="label" style="margin-left: 20px;">Task Failed</label>
        </td>
        <td class="td">
          <validation-provider name="Task Failed Email Address" rules="email" v-slot="{ errors }"> 
            <input class="input" type="text" style="width: 400px;" v-model="selectedOrgCopy.onJobTaskFailAlertEmail" placeholder="email@address.com"/>
            <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</span>
          </validation-provider>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          <label class="label" style="margin-left: 20px;">Job Complete</label>
        </td>
        <td class="td">
          <validation-provider name="Job Complete Email Address" rules="email" v-slot="{ errors }"> 
            <input class="input" type="text" style="width: 400px;" v-model="selectedOrgCopy.onJobCompleteAlertEmail" placeholder="email@address.com"/>
            <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</span>
          </validation-provider>
        </td>
      </tr>

      <tr class="tr">
        <td class="td" colspan="2">
          <span style="font-size: 24px; margin-bottom: 12px;">
            Slack Alerts
          </span>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          <label class="label" style="margin-left: 20px;">Task Interrupted</label>
        </td>
        <td class="td">
          <validation-provider name="Task Interrupted Slack Url" rules="url" v-slot="{ errors }"> 
            <input class="input" type="text" style="width: 400px;" v-model="selectedOrgCopy.onJobTaskInterruptedAlertSlackURL" placeholder="https://slack.com"/>
            <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</span>
          </validation-provider>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          <label class="label" style="margin-left: 20px;">Task Failed</label>
        </td>
        <td class="td">
          <validation-provider name="Task Failed Slack Url" rules="url" v-slot="{ errors }"> 
            <input class="input" type="text" style="width: 400px;" v-model="selectedOrgCopy.onJobTaskFailAlertSlackURL" placeholder="https://slack.com"/>
            <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</span>
          </validation-provider>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          <label class="label" style="margin-left: 20px;">Job Complete</label>
        </td>
        <td class="td">
          <validation-provider name="Job Complete Slack Url" rules="url" v-slot="{ errors }"> 
            <input class="input" type="text" style="width: 400px;" v-model="selectedOrgCopy.onJobCompleteAlertSlackURL" placeholder="https://slack.com"/>
            <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</span>
          </validation-provider>
        </td>
      </tr>

      <tr class="tr">
        <td class="td"></td>
        <td class="td">
          <button class="button is-primary" @click="onSaveClicked" :disabled="!hasOrgChanged">Save</button>
          <button class="button button-spaced" @click="onCancelClicked" :disabled="!hasOrgChanged">Cancel</button>
        </td>
      </tr>
    </table>
  </validation-observer>
    
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { BindSelected, BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';
import { Org } from '@/store/org/types';
import { KikiAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { showErrors } from '@/utils/ErrorHandler';
import axios from 'axios';

@Component({
  components: { ValidationProvider, ValidationObserver }
})
export default class OrgAlerts extends Vue { 
  
  @BindSelected({storeType: StoreType.OrgStore})
  private selectedOrg!: Org;
  
  @BindSelectedCopy({storeType: StoreType.OrgStore})
  private selectedOrgCopy!: Org;

  private get hasOrgChanged(){
    return this.$store.state[StoreType.OrgStore].storeUtils.hasSelectedCopyChanged();
  } 

  private beforeDestroy(){
    // If there are any unsaved changes, just undo them to the copy
    if(this.hasOrgChanged){
      this.onCancelClicked();
    }
  } 

  private onCancelClicked(){
    // Just reselect the original job def
    this.$store.dispatch(`${StoreType.OrgStore}/select`, this.selectedOrg);
  }

  private async onSaveClicked(){
    try {
      if( ! await (<any>this.$refs.alertsValidationObserver).validate()){
        return;
      }

      await this.$store.dispatch(`${StoreType.OrgStore}/save`);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new KikiAlert(`Saved the team alerts`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors(`Error saving the team alerts`, err);
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

  .validation-error {
    margin-top: 3px;
    margin-bottom: 3px;
    padding-left: 3px;
    padding-right: 3px;
    color: $danger;
  }

</style>
