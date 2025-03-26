 <template>
  <validation-observer tag="div" class="sg-container-p" ref="alertsValidationObserver" v-slot="{ invalid }">
    <h2 class="is-size-4 block">Email Alerts</h2>
    <div class="field is-horizontal">
      <div class="field-label flex-item is-normal">
        <label class="label">Task Interrupted</label>
      </div>
      <div class="field-body">
        <validation-provider tag="div" class="field" name="Task Interrupted Email Address" rules="email" v-slot="{ errors }"> 
          <div class="control">
            <input class="input" type="email" style="width: 400px;" v-model="selectedTeamCopy.onJobTaskInterruptedAlertEmail" placeholder="email@address.com"/>
          </div>
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </validation-provider>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label flex-item is-normal">
        <label class="label">Task Failed</label>
      </div>
      <div class="field-body">
        <validation-provider tag="div" class="field" name="Task Failed Email Address" rules="email" v-slot="{ errors }"> 
          <div class="control">
            <input class="input" type="email" style="width: 400px;" v-model="selectedTeamCopy.onJobTaskFailAlertEmail" placeholder="email@address.com"/>
          </div>
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </validation-provider>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label flex-item is-normal">
        <label class="label">Job Complete</label>
      </div>
      <div class="field-body">
        <validation-provider tag="div" class="field" name="Job Complete Email Address" rules="email" v-slot="{ errors }"> 
          <div class="control">
            <input class="input" type="email" style="width: 400px;" v-model="selectedTeamCopy.onJobCompleteAlertEmail" placeholder="email@address.com"/>
          </div>
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </validation-provider>
      </div>
    </div>

    <h2 class="is-size-4 block">Slack Alerts</h2>

    <div class="field is-horizontal">
      <div class="field-label flex-item is-normal">
        <label class="label">Task Interrupted</label>
      </div>
      <div class="field-body">
        <validation-provider tag="div" class="field" name="Task Interrupted Slack Url" rules="url" v-slot="{ errors }"> 
          <div class="control">
            <input class="input" type="url" style="width: 400px;" v-model="selectedTeamCopy.onJobTaskInterruptedAlertSlackURL" placeholder="https://slack.com"/>
          </div>
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </validation-provider>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label flex-item is-normal">
        <label class="label">Task Failed</label>
      </div>
      <div class="field-body">
        <validation-provider tag="div" class="field" name="Task Failed Slack Url" rules="url" v-slot="{ errors }"> 
          <div class="control">
            <input class="input" type="url" style="width: 400px;" v-model="selectedTeamCopy.onJobTaskFailAlertSlackURL" placeholder="https://slack.com"/>
          </div>
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </validation-provider>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label flex-item is-normal">
        <label class="label">Job Complete</label>
      </div>
      <div class="field-body">
        <validation-provider tag="div" class="field" name="Job Complete Slack Url" rules="url" v-slot="{ errors }"> 
          <div class="control">
            <input class="input" type="url" style="width: 400px;" v-model="selectedTeamCopy.onJobCompleteAlertSlackURL" placeholder="https://slack.com"/>
          </div>
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </validation-provider>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label flex-item"></div>
      <div class="field-body">
        <div class="control">
          <div class="buttons">
            <button class="button is-primary" :class="{'is-loading': isSaving}" @click="onSaveClicked" :disabled="!hasTeamChanged && invalid">Save</button>
            <button class="button" @click="onCancelClicked" :disabled="!hasTeamChanged">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </validation-observer>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { BindSelected, BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';
import { Team } from '@/store/team/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { showErrors } from '@/utils/ErrorHandler';
import axios from 'axios';

@Component({
  components: { ValidationProvider, ValidationObserver }
})
export default class TeamAlerts extends Vue { 
  
  @BindSelected({storeType: StoreType.TeamStore})
  private selectedTeam!: Team;
  
  @BindSelectedCopy({storeType: StoreType.TeamStore})
  private selectedTeamCopy!: Team;

  private isSaving = false;

  private get hasTeamChanged(){
    return this.$store.state[StoreType.TeamStore].storeUtils.hasSelectedCopyChanged();
  } 

  private beforeDestroy(){
    // If there are any unsaved changes, just undo them to the copy
    if(this.hasTeamChanged){
      this.onCancelClicked();
    }
  } 

  private onCancelClicked(){
    // Just reselect the original job def
    this.$store.dispatch(`${StoreType.TeamStore}/select`, this.selectedTeam);
  }

  private async onSaveClicked(){
    try {
      if( ! await (<any>this.$refs.alertsValidationObserver).validate()){
        return;
      }

      this.isSaving = true;

      await this.$store.dispatch(`${StoreType.TeamStore}/save`);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saved the team alerts`, AlertPlacement.FOOTER));
    } catch(err){
      console.error(err);
      showErrors(`Error saving the team alerts`, err);
    } finally {
      this.isSaving = false;
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

  .flex-item {
    flex-basis: auto;
    flex-grow: 0;
    width: 150px;
  }
</style>
