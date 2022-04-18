<template>
  <div class="sg-container-p">
    <h2 class="is-size-4 subtitle">Shared variables for your team</h2>

    <validation-observer tag="div" class="field is-grouped is-align-items-center" ref="createTeamVarValidationObserver">
      <div class="control">
        <label class="checkbox">
          <input type="checkbox" v-model="newValue.sensitive" :checked="false">
          Sensitive
        </label>
      </div>

      <validation-provider tag="div" class="control" name="Key" rules="required" v-slot="{ errors }">
        <input class="input" style="width: 250px;" type="text" v-model="newKey" placeholder="key"/>
        <div class="is-absolute">
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </div>
      </validation-provider>

      <span class="has-text-weight-bold is-size-5 mr-3">=</span>

      <validation-provider tag="div" class="control" name="Value" rules="required" v-slot="{ errors }">
        <input class="input" style="width: 250px;" type="text" v-model="newValue.value" placeholder="value"/>
        <div class="is-absolute">
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </div>
      </validation-provider>

      <div class="control">
        <button class="button is-primary" :class="{'is-loading': isSavingVariable}" @click="onCreateVarClicked">Create</button>
      </div>
    </validation-observer>

    <table v-if="teamVars.length" class="table is-striped" width="900px">
      <thead>
        <th>Key</th>
        <th></th>
        <th>Value</th>
        <th colspan="3"></th>
      </thead>
      <tbody>
        <tr v-for="teamVar in teamVars" :key="teamVar.id">
          <td>{{teamVar.name}}</td>
          <td class="has-text-weight-bold">=</td>
          <td>
            <template v-if="isVarMasked(teamVar)">
              &lt;masked&gt;
            </template>
            <template v-else>
              {{teamVar.value}}
            </template>
          </td>
          <td>
            <a v-if="isVarMasked(teamVar)" class="button-spaced" @click.prevent="onUnmaskClicked(teamVar)">unmask</a>
          </td>
          <td style="text-align: center; padding: 10px">
            <input type="checkbox" v-model="teamVar.sensitive" :checked="isChecked(teamVar.sensitive)" disabled="disabled" onClick="return false;">
            <label style="margin-left: 10px;">sensitive</label>
          </td>
          <td>
            <a class="button-spaced" @click.prevent="onDeleteVarClicked(teamVar)">delete</a>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="has-text-centered is-size-4 py-3">There are no variables for your team yet.</p>

  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { BindStoreModel, BindSelected, BindSelectedCopy } from '../decorator';
import { StoreType } from '../store/types';
import { TeamVar } from '../store/teamVar/types';
import { SgAlert, AlertPlacement } from '../store/alert/types';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { showErrors } from '../utils/ErrorHandler';

@Component({
  components: { ValidationProvider, ValidationObserver },
})
export default class TeamVars extends Vue { 
  private get defaultStoreType(){
    return StoreType.TeamVariableStore;
  }

  @BindStoreModel({selectedModelName: 'models'})
  private teamVars!: TeamVar[];

  @BindSelected()
  private selectedTeamVar!: TeamVar;

  @BindSelectedCopy()
  private selectedTeamVarCopy!: TeamVar;

  private isSavingVariable = false;
  private newValue = {value: '', sensitive: false};
  private newKey = '';

  private mounted(){
    // load all teams when the component is mounted - they are small objects
    this.$store.dispatch(`${StoreType.TeamVariableStore}/fetchModelsByFilter`);
  }

  private async onCreateVarClicked() {
    try {
      if( ! await (<any>this.$refs.createTeamVarValidationObserver).validate()){
        return;
      }

      this.isSavingVariable = true;

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Creating team variable`, AlertPlacement.FOOTER));
      await this.$store.dispatch(`${StoreType.TeamVariableStore}/save`, {name: this.newKey, value: this.newValue.value, sensitive: this.newValue.sensitive });

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Team variable created`, AlertPlacement.FOOTER));
    } catch(err){
      console.error(err);
      showErrors(`Error saving the team variable`, err);
    } finally {
      this.isSavingVariable = false;
    }
  }

  private async onDeleteVarClicked(teamVar: TeamVar){
    try {
      await this.$store.dispatch(`${StoreType.TeamVariableStore}/delete`, teamVar);

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Team variable deleted`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors(`Error deleting the team variable`, err);
    }
  }
  
  private unMaskedVars = {};

  private isVarMasked(teamVar: TeamVar): boolean {
    return ! this.unMaskedVars[teamVar.name];
  }

  private onUnmaskClicked(teamVar: TeamVar){
    Vue.set(this.unMaskedVars, teamVar.name, true);
  }

  private isChecked(val: any) {
    return val == true;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

  table {
    border-width: 0;
    tr:nth-child(odd) {background: hsl(0, 0%, 98%)} // no idea why the bulma is-striped didn't work
  }

  td {
    border-width: 0 !important;
  }

  .button-spaced {
    margin-left: 12px;
  }
</style>
