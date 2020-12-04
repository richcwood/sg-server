<template>
  <div>
    <!-- Modals -->
    <modal name="create-script-modal" :classes="'round-popup'" :width="450" :height="250">
      <validation-observer ref="createScriptValidationObserver">
        <table class="table" width="100%" height="100%">
          <tbody class="tbody">
            <tr class="tr">
              <td class="td"></td>
              <td class="td">Create a new script</td>
            </tr>
            <tr class="tr">
              <td class="td">Script Name</td>
              <td class="td">
                <validation-provider
                  name="Script Name"
                  rules="required|object-name"
                  v-slot="{ errors }"
                >
                  <input
                    class="input"
                    id="create-script-modal-autofocus"
                    type="text"
                    v-on:keyup.enter="saveNewScript"
                    v-model="newScriptName"
                    placeholder="Enter the new script name"
                  />
                  <div
                    v-if="errors && errors.length > 0"
                    class="message validation-error is-danger"
                  >{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">Script Type</td>
              <td class="td">
                <validation-provider name="Script Type" rules="required" v-slot="{ errors }">
                  <select
                    class="input select"
                    style="width: 250px; margin-top: 10px;"
                    v-model="newScriptType"
                  >
                    <option
                      v-for="(value, key) in scriptTypesForMonaco"
                      v-bind:key="`scriptType${key}-${value}`"
                      :value="key"
                    >{{value}}</option>
                  </select>
                  <div
                    v-if="errors && errors.length > 0"
                    class="message validation-error is-danger"
                  >{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button is-primary" @click="saveNewScript">Create new script</button>
                <button class="button button-spaced" @click="cancelCreateNewScript">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
      </validation-observer>
    </modal>

    <!-- Clone script modal -->
    <modal name="clone-script-modal" :classes="'round-popup'" :width="400" :height="200">
      <validation-observer ref="cloneScriptValidationObserver">
        <table class="table" width="100%" height="100%">
          <tbody class="tbody">
             <tr class="tr">
              <td class="td"></td>
              <td class="td">Clone script</td>
            </tr>
            <tr class="tr">
              <td class="td">Script Name</td>
              <td class="td">
                <validation-provider name="Script Name" rules="required|object-name" v-slot="{ errors }">
                  <input class="input" id="clone-script-modal-autofocus" type="text" v-on:keyup.enter="cloneScript" v-model="cloneScriptName" placeholder="Enter the new script name">
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button is-primary" @click="cloneScript">Clone script</button> 
                <button class="button button-spaced" @click="cancelCloneScript">Cancel</button>
              </td>
            </tr>
          </tbody> 
        </table>
      </validation-observer>
    </modal>


  <button class="button" @click="onCreateScriptClicked">Create Script</button>
  <script-search :scriptId="scriptId" @scriptPicked="onScriptPicked"></script-search>
  <button class="button button-spaced" style="margin-left: 12px;" :disabled="!script" @click="onCloneScriptClicked">Clone</button>


  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { LinkedModel, StoreType } from '@/store/types';
import { BindProp, BindSelected, BindSelectedCopy } from "../decorator";
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import ScriptSearch from "@/components/ScriptSearch.vue";
import { ValidationProvider, ValidationObserver } from "vee-validate";
import axios from 'axios';
import { Script, ScriptType, scriptTypesForMonaco } from "@/store/script/types";
import { focusElement } from "@/utils/Shared";
import { showErrors } from '@/utils/ErrorHandler';

@Component({
  components: { ScriptSearch, ValidationProvider, ValidationObserver },
})
export default class ScriptSearchWithCreate extends Vue {
  // Expose to templates
  private readonly scriptTypesForMonaco = scriptTypesForMonaco;

  @Prop() private scriptId!: string;

  @BindSelected({ storeType: <any>StoreType.ScriptStore.toString() })
  private script!: Script | null;

  @BindSelectedCopy({ storeType: <any>StoreType.ScriptShadowStore.toString() })
  private scriptShadow!: Script | null;

  private newScriptName: string = '';
  private newScriptType: ScriptType = ScriptType.NODE;
  private cloneScriptName: string = '';

  @BindProp({storeType: StoreType.SecurityStore, selectedModelName: 'user', propName: 'id'})
  private loggedInUserId!: string;

  private onScriptPicked(script: Script) {
    this.$emit('scriptPicked', script);
  }

  private onCreateScriptClicked() {
    this.newScriptName = '';
    this.$modal.show('create-script-modal');
    focusElement('create-script-modal-autofocus');
  }

  private cancelCreateNewScript() {
    this.$modal.hide("create-script-modal");
  }

  private async saveNewScript() {
    if (!(await (<any>this.$refs.createScriptValidationObserver).validate())) {
      return;
    }

    try {
      this.$store.dispatch(
        `${StoreType.AlertStore}/addAlert`,
        new SgAlert(
          `Creating script - ${this.newScriptName}`,
          AlertPlacement.FOOTER
        )
      );
      const newScript = {
        name: this.newScriptName,
        scriptType: this.newScriptType,
        code: '',
        lastEditedDate: new Date().toISOString()
      };

      this.script = await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {script: newScript});
      this.onScriptPicked(this.script);
    } 
    catch (err) {
      console.error(err);
      showErrors('Error creating script', err);
    } 
    finally {
      this.$modal.hide("create-script-modal");
    }
  }

  private async onCloneScriptClicked() {
    if(this.script && this.scriptShadow){
      this.cloneScriptName = `${this.script.name}Copy`;
      this.$modal.show('clone-script-modal');
      focusElement('clone-script-modal-autofocus');
    }
  }

  private cancelCloneScript(){
    this.$modal.hide('clone-script-modal');
  }

  private async cloneScript(){
    if(this.script && this.scriptShadow){
      if( ! await (<any>this.$refs.cloneScriptValidationObserver).validate()){
        return;
      }

      try {
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Cloning script - ${this.cloneScriptName}`, AlertPlacement.FOOTER));      
        const newScript = {
          name: this.cloneScriptName, 
          scriptType: this.script.scriptType, 
          code: this.script.code,
          lastEditedDate: (new Date()).toISOString()
        };
        await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {script: newScript, initialShadow: this.scriptShadow.shadowCopyCode});
        this.onScriptPicked(this.script);
      }
      catch(err){
        console.error(err);
        showErrors('Error cloning script', err);
      }
      finally{
        this.$modal.hide('clone-script-modal');
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
  

</style>
