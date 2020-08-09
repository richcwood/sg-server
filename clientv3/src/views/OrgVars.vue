<template>
  <div class="main" style="margin-left: 36px; margin-right: 12px;">
    <div style="font-size: 24px;">
      Shared variables for your team
    </div>

    <table class="table is-striped" width="800px">
      <tr class="tr" v-if="orgVars.length === 0">
        <td class="td" colspan="4">
          There are no variables for your team yet.
        </td>
      </tr>

      <tr class="tr" v-for="orgVar in orgVars" v-bind:key="orgVar.id">
        <td class="td">
          {{orgVar.name}}
        </td>
        <td class="td">
          <span style="font-weight: 700; size: 20px;">
            =
          </span>
        </td>
        <td class="td">
          {{orgVar.value}}
        </td>
        <td class="td">
          <a class="button-spaced" @click.prevent="onDeleteVarClicked(orgVar)">delete</a>
        </td>
      </tr>
    </table>

    <validation-observer ref="createOrgVarValidationObserver">
      <div>
        <validation-provider name="Key" rules="required" v-slot="{ errors }">     
          <input class="input" style="width: 250px;" type="text" v-model="newKey" placeholder="key"/>
          <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</span>
        </validation-provider>

        <span style="font-weight: 700; size: 20px;">
          =
        </span>

        <validation-provider name="Value" rules="required" v-slot="{ errors }">     
          <input class="input" style="width: 250px;" type="text" v-model="newValue" placeholder="value"/>
          <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</span>
        </validation-provider>
        
        <button class="button is-primary button-spaced" @click="onCreateVarClicked">Create</button>
      </div>
    </validation-observer>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { BindStoreModel, BindSelected, BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';
import { OrgVar } from '@/store/orgVar/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { showErrors } from '@/utils/ErrorHandler';

@Component({
  components: { ValidationProvider, ValidationObserver },
  props: { },
})
export default class OrgVars extends Vue { 
  
  private get defaultStoreType(){
    return StoreType.OrgVariableStore;
  }

  @BindStoreModel({selectedModelName: 'models'})
  private orgVars!: OrgVar[];

  @BindSelected()
  private selectedOrgVar!: OrgVar;

  @BindSelectedCopy()
  private selectedOrgVarCopy!: OrgVar;

  private newKey = '';
  private newValue = '';

  private mounted(){
    // load all orgs when the component is mounted - they are small objects
    this.$store.dispatch(`${StoreType.OrgVariableStore}/fetchModelsByFilter`);
  }

  private async onCreateVarClicked(){
    try {
      if( ! await (<any>this.$refs.createOrgVarValidationObserver).validate()){
        return;
      }

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Creating team variable`, AlertPlacement.FOOTER));
      
      await this.$store.dispatch(`${StoreType.OrgVariableStore}/save`, {name: this.newKey, value: this.newValue });

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Team variable created`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors(`Error saving the team variable`, err);
    }
  }

  private async onDeleteVarClicked(orgVar: OrgVar){
    try {      
      await this.$store.dispatch(`${StoreType.OrgVariableStore}/delete`, orgVar);

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Team variable deleted`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors(`Error deleting the team variable`, err);
    }
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

  .validation-error {
    margin-top: 3px;
    margin-bottom: 3px;
    padding-left: 3px;
    padding-right: 3px;
    color: $danger;
  }

</style>
