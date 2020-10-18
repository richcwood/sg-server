<template>
  <div class="home">

    <!-- todo - consolidate this with the modal in InteractiveConsole -->
    <!-- Create script modal -->
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


    <!-- Filter -->
    <table class="table" width="550px">
      <tbody class="tbody">
        <tr class="tr">
          <td class="td">
            <span style="position: relative;">
              <input class="input" style="padding-left: 30px;" type="text" v-model="filterString" placeholder="Filter by Script Name, Script Type, Created By and Last Edited By">
              <font-awesome-icon icon="search" style="position: absolute; left: 10px; top: 10px; color: #dbdbdb;" />
            </span>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <button class="button" @click="onCreateScriptClicked">Create Script</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- List of scripts -->
    <table class="table is-striped">
      <thead class="thead">
        <td class="td">Script Name</td>
        <td class="td">Script Type</td>
        <td class="td">Created By</td>
        <td class="td">Last Edited</td>
        <td class="td">Last Edited By</td>
      </thead>

      <tbody class="tbody">
        <tr class="tr" v-for="script in filteredScripts" v-bind:key="script.id">
          <td class="td"><router-link :to="{name: 'interactiveConsole', params: {scriptId: script.id}}">{{script.name}}</router-link></td>
          <td class="td">{{scriptTypesForMonaco[script.scriptType]}}</td>
          <td class="td">{{getUser(script._originalAuthorUserId).name}}</td>
          <td class="td">{{momentToStringV1(script.lastEditedDate)}}</td>
          <td class="td">{{getUser(script._lastEditedUserId).name}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { StoreType } from '@/store/types';
import { Script, ScriptType, scriptTypesForMonaco } from "@/store/script/types";
import { BindStoreModel } from '@/decorator';
import { momentToStringV1 } from '@/utils/DateTime';
import moment from 'moment';
import axios from 'axios';
import { User } from '@/store/user/types';
import { focusElement } from "@/utils/Shared";
import { SgAlert, AlertPlacement, AlertCategory } from "@/store/alert/types";
import { showErrors } from '@/utils/ErrorHandler';
import { ValidationProvider, ValidationObserver } from 'vee-validate';

@Component({
  components: { ValidationProvider, ValidationObserver }
})
export default class Scripts extends Vue {

  // Expose to template
  private readonly momentToStringV1 = momentToStringV1;
  private readonly scriptTypesForMonaco = scriptTypesForMonaco;

  // Filter inputs
  private filterString = '';

  private get defaultStoreType(){return StoreType.ScriptStore};

  @BindStoreModel({selectedModelName: 'models'})
  private scripts!: Script[];

  private get filteredScripts(): Script[] {
    const filterUCase = this.filterString.toUpperCase();
    // split by whitespace and remove empty entries
    const filterUCaseItems = filterUCase.split(' ').map(item => item.trim()).filter(item => item);
    const filteredScripts: Script[] = this.scripts.filter((script: Script) => {
      if(filterUCaseItems.length === 0){
        return true;
      }
      else {
        return filterUCaseItems.some((filter: string) => {
          if(scriptTypesForMonaco[script.scriptType].toUpperCase().indexOf(filter) !== -1){
            return true;
          }
          if(script.name.toUpperCase().indexOf(filter) !== -1){
            return true;
          }
          else if(this.getUser(script._originalAuthorUserId).name.toUpperCase().indexOf(filter) !== -1){
            return true;
          }
          else if(this.getUser(script._lastEditedUserId).name.toUpperCase().indexOf(filter) !== -1){
            return true;
          }
          else {
            return false;
          }
        });
      }
    });

    // sort by id - should be like a created date
    filteredScripts.sort((scriptA: Script, scriptB: Script) => {
      return scriptB.id.localeCompare(scriptA.id);
    });

    return filteredScripts;
  }

  private async mounted(){
    // load all scripts,, maybe someday it will be problematic / too slow 
    this.$store.dispatch(`${StoreType.ScriptStore}/fetchModelsByFilter`);

    // restore last filters if possible
    if(localStorage.getItem('scripts_filterString')){
      this.filterString = localStorage.getItem('script_filterString');
    }
  }

  private beforeDestroy(){
    // save current filters
    localStorage.setItem('script_filterString', this.filterString);
  }

  // for reactivity in a template
  private loadedUsers = {};
  private getUser(userId: string): User {
    try {
      if(!this.loadedUsers[userId]){
        Vue.set(this.loadedUsers, userId, {name: 'loading...'});

        (async () => {
          this.loadedUsers[userId] = await this.$store.dispatch(`${StoreType.UserStore}/fetchModel`, userId);
        })();
      }

      return this.loadedUsers[userId];
    }
    catch(err){
      console.log('Error in loading a user.  Maybe it was deleted?', userId);
      return {
        name: 'Error',
        email: 'Error'
      }
    }
  }

  private newScriptName = '';
  private newScriptType: ScriptType = ScriptType.NODE;

  private onCreateScriptClicked() {
    this.newScriptName = '';
    this.$modal.show('create-script-modal');
    focusElement('create-script-modal-autofocus');
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
        shadowCopyCode: '',
        lastEditedDate: new Date().toISOString()
      };

      const script = await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {script: newScript});

      // select the script in the interactive console
      this.$router.push(`interactiveConsole/${script.id}`);
    } 
    catch (err) {
      console.error(err);
      showErrors('Error creating script', err);
    } 
    finally {
      this.$modal.hide("create-script-modal");
    }
  }

  private cancelCreateNewScript() {
    this.$modal.hide("create-script-modal");
  }
}
</script>

<style scoped lang="scss">
  table {
    border-width: 0;
  }

  td {
    border-width: 0 !important;
  }
</style>