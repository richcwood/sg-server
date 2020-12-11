<template>
  <div>

    <modal name="sgs" :classes="'round-popup'" width="700" height="725" background="white">
      <div style="width: 100%; height: 100%; background: white;">
        <table class="table">
          <tr class="tr">
            <td class="td">
              sgs: <strong>s</strong>aas <strong>g</strong>lue <strong>s</Strong>cript
              <br>
              Insert a saas glue script into this script
              <br>
              You can also type "sgs" in the editor for auto complete
              <br>
            </td>
          </tr>

          <tr class="tr" v-for="scriptName in scriptNames" v-bind:key="scriptName.id">
            <td class="td">
              <a @click="onClickedScriptVar(scriptName)">{{scriptName.name}}</a>
            </td>
          </tr>

          <tr class="tr">
            <td class="td">
              <button class="button" @click="onCloseSgs">Close</button>
            </td>
          </tr>
        </table>
      </div>
    </modal>

    <modal name="sgg" :classes="'round-popup'" width="700" height="725" background="white">
      <div style="width: 100%; height: 100%; background: white;">
        <table class="table">
          <tr class="tr">
            <td class="td" colspan="2">
              sgg: <strong>s</strong>aas <strong>g</strong>lue <strong>g</Strong>lobal
              <br>
              Insert saas glue variables into your script
              <br>
              You can also type "sgg" in the editor for auto complete
              <br>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
                <label class="label">Job Context</label>
            </td>
            <td class="td">
              <select class="input select" style="width: 250px; margin-top: 10px;" v-model="selectedJobDef">
                <option v-for="def in jobDefs" v-bind:key="def.id" :value="def"> {{def.name}} </option>
              </select>
            </td>
          </tr>
        </table>

        <!-- Job def variables -->
        <div style="width: 100%; height: 300px; overflow: scroll;">
          <table class="table is-striped">
            <template v-if="selectedJobDef && selectedJobDef.runtimeVars && Object.keys(selectedJobDef.runtimeVars).length > 0">
              <tr class="tr">
                <td class="td" colspan="3">
                  Variables available to job {{selectedJobDef.name}}
                </td>
              </tr>
              <tr class="tr" v-for="(varValue, varKey) in selectedJobDef.runtimeVars" v-bind:key="varKey">
                <td class="td">
                  <a @click="onClickedJobDefVar(varKey, varValue)">{{varKey}}</a>
                </td>
                <td class="td">
                  <span style="font-weight: 700; size: 20px;">
                    =
                  </span>
                </td>
                <td class="td">
                  {{varValue}}
                </td>
              </tr>
            </template>
            <tr v-else-if="jobDef" class="tr">
              <td class="td">
                There are no variables for the selected job.
              </td>
            </tr>
            <tr v-else-if="jobDef" class="tr">
              <td class="td">
                Select a job to see it's available variables.
              </td>
            </tr>
          </table>
        </div>

        <!-- Team / team variables -->
        <div style="width: 100%; height: 300px; overflow: scroll;">
          <table class="table is-striped">
            <tr class="tr" v-if="teamVars.length === 0">
              <td class="td">
                There are no variables for your team yet.
              </td>
            </tr>
            <tr class="tr" v-else>
              <td class="td" colspan="3">
                Variables available to your team
              </td>
            </tr>
            <tr class="tr" v-for="teamVar in teamVars" v-bind:key="teamVar.id">
              <td class="td">
                <a @click="onClickedTeamVar(teamVar)">{{teamVar.name}}</a>
              </td>
              <td class="td">
                <span style="font-weight: 700; size: 20px;">
                  =
                </span>
              </td>
              <td class="td">
                {{teamVar.value}}
              </td>
            </tr>
          </table>
        </div>

        <table class="table">
          <tr class="tr">
            <td class="td">
              <button class="button" @click="onCloseSgg">Close</button>
            </td>
          </tr>
        </table>
      </div>
    </modal>

    <modal name="script-editor-fullscreen" :clickToClose="false" :classes="'round-popup'" :adaptive="true" width="100%" height="100%" background="white">
      <div style="margin: 6px;">
        <button class="button" @click="onClickedExitFullScreen">Exit full screen</button>
        <span class="variables">
          Static variables: 
          <a @click="onSggVariablesClicked">@sgg</a> | 
          <a @click="onSgsVariablesClicked">@sgs</a> |
          <a>@sgo</a>
        </span>
      </div>
      <div ref="scriptEditorFullScreen" style="width: 100%; height: 100%;">
      </div>
    </modal>

    <modal name="script-diff" :classes="'round-popup'" :adaptive="true" width="100%" height="100%" background="white">
      <div style="margin: 6px;">
        <button class="button" @click="onClickedExitDiff">Exit diff</button>
      </div>
      <div ref="scriptDiff" style="width: 100%; height: 100%;">
      </div>
    </modal>

    <modal name="warn-revert-script-modal" :classes="'round-popup'" :width="200" :height="200">
      <table class="table" width="100%" height="100%">
        <tbody class="tbody">
            <tr class="tr">
            <td class="td">Warning!</td>
          </tr>
          <tr class="tr">
            <td class="td">Warning, do you really want to undo all of your changes?</td>
          </tr>
          <tr class="tr">
            <td class="td">
              <button class="button is-primary" @click="revertScriptChanges">Yes</button> 
              <button class="button button-spaced" @click="cancelRevertScriptChanges">Cancel</button>
            </td>
          </tr>
        </tbody> 
      </table>
    </modal>

    <modal name="job-step-details" :classes="'round-popup'" width="450" height="425" background="white">
      <div style="width: 100%; height: 100%; background: white;">
        <table class="table">
          <tr class="tr">
            <td class="td">
              Script {{script && script.name}} is used in the following jobs<br>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              <label class="label">Jobs used</label>
            </td>
          </tr>

          <tr class="tr" v-if="scriptJobUsage.length === 0">
            <td class="td">
              This script is not used in any jobs
            </td>
          </tr>

          <tr class="tr" v-for="jobDef in scriptJobUsage" v-bind:key="jobDef.id">
            <td class="td">
              <router-link :to="{name: 'jobDesigner', params: {jobId: jobDef.id}}">{{jobDef.name}}</router-link>
            </td>
          </tr>

          <tr class="tr">
            <td class="td">
              <button class="button is-primary" @click="closeJobStepDetails">close</button>
            </td>
          </tr>
        </table>
      </div>
    </modal>






    <div style="margin-left: 5px; margin-right: 10px;">
      <div v-if="script" class="script-button-bar" style="margin-bottom: 10px;">
        <button class="button" @click="onClickedScriptFullScreen">Full Screen</button>
        <select class="input select button-spaced" style="width: 150px;" v-model="theme">
          <option value="vs">Light</option>
          <option value="vs-dark">Dark</option>
          <option value="hc-black">Black</option>
        </select>
        <select :disabled="!isScriptEditable(script)" 
                class="input select button-spaced" 
                style="width: 250px; margin-bottom: 10px;" 
                @change="onScriptTypeChanged"
                v-model="script.scriptType">
          <option v-for="(value, key) in scriptTypesForMonaco" v-bind:key="`scriptType${key}-${value}`" :value="key">
            {{value}}
          </option>
        </select>
        <div v-if="!isScriptEditable(script)" 
             class="button-spaced readonly-tooltip-container" 
             style="margin-top: 6px;">
          (read only)
          <span class="readonly-tooltip-text">
            The orginal script author "{{getUser(script._originalAuthorUserId).name}}" has has not allowed team members to edit this script.
          </span>
        </div>
        <div class="button-spaced" style="margin-top: 6px;">
          (used in {{scriptStepDefUsageCount}} <a @click="onClickScriptJobUsage"> job steps</a>)
        </div>
        <span style="flex-grow: 1"> </span>
        <button class="button button-spaced" :disabled="!isScriptShadowDifferentThanScript" @click="onClickedScriptDiff">Diff</button>
        <button class="button button-spaced" :disabled="!isScriptShadowDifferentThanScript" @click="warnRevertScriptChanges">Revert</button>
        <button class="button is-primary button-spaced" :disabled="!isScriptShadowDifferentThanScript" @click="onPublishScriptClicked">Publish</button>
      </div>
        
      <div ref="scriptEditor" style="width: 100%; height: 450px; background: hsl(0, 0%, 98%);"></div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { ScriptName } from '../store/scriptName/types';
import { Script, ScriptType, scriptTypesForMonaco } from '../store/script/types';
import { ScriptShadow } from '../store/scriptShadow/types';
import { StoreType } from '../store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { showErrors } from '@/utils/ErrorHandler'; 
import { JobDef } from '../store/jobDef/types';
import { TeamVar } from '../store/teamVar/types';
import { BindStoreModel, BindSelected, BindSelectedCopy, BindProp } from '../decorator';
import { User } from '@/store/user/types';
import axios from 'axios';
import * as monaco from 'monaco-editor';

@Component
export default class ScriptEditor extends Vue {

  // Expose to templates
  private readonly scriptTypesForMonaco = scriptTypesForMonaco;

  private theme = 'vs';
  
  private scriptEditor: monaco.editor.IStandaloneCodeEditor; 

  private scriptShadowCopySaveInterval: any;
  
  private monacoModelListener;

  private mounted(){
    // load all team vars when the component is mounted - they are small objects
    this.$store.dispatch(`${StoreType.TeamVariableStore}/fetchModelsByFilter`);

    this.monacoModelListener = monaco.editor.onDidCreateModel((model: monaco.editor.ITextModel) => {
      model.onDidChangeContent((e: monaco.editor.IModelContentChangedEvent) => {
        if (this.scriptShadow) {
          const newCode = model.getLinesContent().join('\n');
          const newCodeInBase64 = btoa(newCode); // models always store code in base 64
          
          if(this.scriptShadow.shadowCopyCode !== newCodeInBase64){
            this.$store.commit(`${StoreType.ScriptShadowStore}/updateSelectedCopy`, {
              id: this.scriptShadow.id, 
              shadowCopyCode: newCodeInBase64
              });
          }

          // If the change was made in the full screen editor then we need to copy the changes to the regular editor
          if(this.scriptEditor && this.fullScreenEditor && model.id === this.fullScreenEditor.getModel().id){
            this.scriptEditor.setValue(this.fullScreenEditor.getValue());
          }
        }
      });

      model.dispose
    });

    if(localStorage.getItem('scriptEditor_theme')){
      this.theme = localStorage.getItem('scriptEditor_theme');
    }

    this.onJobDefChanged();
    this.onScriptShadowChanged();

    teamVarsForAutoComplete = this.teamVars;
    jobDefForAutoComplete = this.jobDef;
    scriptNamesForAutoComplete = this.scriptNames;
  }

  private beforeDestroy(){
    if(this.scriptShadowCopySaveInterval){
      clearInterval(this.scriptShadowCopySaveInterval);
    }

    if(this.monacoModelListener){
      this.monacoModelListener.dispose();
    }
  }

  private async tryToSaveScriptShadowCopy(){
    if(this.hasScriptShadowChanged){
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving backup of script - ${this.script.name}`, AlertPlacement.FOOTER));
    
      try {
        await this.$store.dispatch(`${StoreType.ScriptShadowStore}/save`);
      }
      catch(err){
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving backup of script - ${this.script.name} failed`, AlertPlacement.FOOTER, AlertCategory.ERROR));
        console.error(err);
      }
    }
  }

  @Watch('theme')
  private onThemeChanged(){
    if(this.scriptEditor){
      localStorage.setItem('scriptEditor_theme', this.theme);
      this.onScriptShadowChanged();
    }
  }

  @Prop() private script!: Script;

  @BindSelectedCopy({storeType: StoreType.ScriptShadowStore})
  private scriptShadow!: ScriptShadow|null;

  @Watch('scriptShadow')
  private onScriptShadowChanged() {
    const scriptEditor = (<any>this.$refs).scriptEditor;
    if(scriptEditor){
      scriptEditor.innerHTML = ''; // clear old stuff out
    }

    if(this.scriptShadow){
      this.scriptEditor = monaco.editor.create(scriptEditor, {
        value: atob(this.scriptShadow.shadowCopyCode),
        language: (<any>scriptTypesForMonaco)[this.script.scriptType],
        theme: this.theme,
        automaticLayout: true,
        readOnly: !this.isScriptEditable(this.script),
        minimap: {
          enabled: false
        }
      });

      if(this.scriptShadowCopySaveInterval){
        clearInterval(this.scriptShadowCopySaveInterval);
      }

      this.scriptShadowCopySaveInterval = setInterval(() => {
        this.tryToSaveScriptShadowCopy();
      }, 20*1000); // try to save shadow copy every n milliseconds
    }
  }

  private get hasScriptShadowChanged(): boolean {
    return this.$store.state[StoreType.ScriptShadowStore].storeUtils.hasSelectedCopyChanged();
  }

  private get isScriptShadowDifferentThanScript(): boolean {
    if(this.script && this.scriptShadow){
      return this.script.code !== this.scriptShadow.shadowCopyCode;
    }
    else {
      return false;
    }
  }

  private async onScriptTypeChanged(newScriptType: ScriptType){
    if(!this.isScriptEditable(this.script)){
      return;
    }

    try {
      if(this.script){
        await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {script: {
          id: this.script.id,
          scriptType: this.script.scriptType
        }});
        this.onScriptShadowChanged();
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script type updated`, AlertPlacement.FOOTER));
      }
    }
    catch(err){
      console.error(err);
      showErrors('Error updating the script type', err);
    }
  }

  private async warnRevertScriptChanges(){
    if(this.script){
      this.$modal.show('warn-revert-script-modal');
    }
  }

  private cancelRevertScriptChanges(){
    this.$modal.hide('warn-revert-script-modal');
  }

  private async revertScriptChanges(){
    try {
      if(this.script && this.scriptShadow){
        //revert the shadow copy
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Reverting script - ${this.script.name}`, AlertPlacement.FOOTER));      
        
        const revertedScriptShadow = {
          id: this.scriptShadow.id,
          shadowCopyCode: this.script.code
        };
        await this.$store.dispatch(`${StoreType.ScriptShadowStore}/save`, revertedScriptShadow);
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script reverted`, AlertPlacement.FOOTER));
      }
    }
    catch(err){
      console.error(err);
      showErrors('Error reverting script changes', err);
      
    }
    finally {
      this.$modal.hide('warn-revert-script-modal');
    }
  }

  private async onPublishScriptClicked(){ 
    try {
      if(this.script && this.scriptShadow){
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving script - ${this.script.name}`, AlertPlacement.FOOTER));   
        
        // Update the shadow copy fist, otherwise the script is selected when it's saved and it overwrites
        // the shadow's changes
        await this.$store.dispatch(`${StoreType.ScriptShadowStore}/save`);
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script published`, AlertPlacement.FOOTER));
        
        // Update the original script
        await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {script: {
          id: this.script.id,
          code: this.scriptShadow.shadowCopyCode
        }});
      }
    }
    catch(err){
      console.error(err);
      showErrors('Error publishing script', err);
    }
  }

  private fullScreenEditor: monaco.editor.IStandaloneCodeEditor;

  private onClickedScriptFullScreen(){
    if(this.script){
      this.$modal.show('script-editor-fullscreen');
      setTimeout(() => {
        const scriptEditorFullScreenEl = (<any>this.$refs).scriptEditorFullScreen;
        scriptEditorFullScreenEl.innerHTML = ''; // clear old stuff out

        this.fullScreenEditor = monaco.editor.create(scriptEditorFullScreenEl, {
          value: atob(this.scriptShadow.shadowCopyCode),
          language: (<any>scriptTypesForMonaco)[this.script.scriptType],
          theme: this.theme,    
          automaticLayout: true,
          readOnly: !this.isScriptEditable(this.script)
        });
      }, 100);
    }
  }

  private onClickedExitFullScreen(){
    const scriptEditorFullScreenEl = (<any>this.$refs).scriptEditorFullScreen;
    scriptEditorFullScreenEl.innerHTML = ''; // clear old stuff out
    this.$modal.hide('script-editor-fullscreen');
    this.fullScreenEditor = null;
  }

  private scriptDiffEditor: monaco.editor.IStandaloneDiffEditor;

  private onClickedScriptDiff(){
    if(this.script && this.scriptShadow){
      this.$modal.show('script-diff');
      setTimeout(() => {
        const scriptDiffEl = (<any>this.$refs).scriptDiff;
        scriptDiffEl.innerHTML = ""; // clear old stuff out

        this.scriptDiffEditor = monaco.editor.createDiffEditor(scriptDiffEl, {
          theme: this.theme,    
          automaticLayout: true,
          readOnly: true,
        });
        const scriptLanguage = (<any>scriptTypesForMonaco)[this.script.scriptType];

        this.scriptDiffEditor.setModel({
          original: monaco.editor.createModel(atob(this.script.code), scriptLanguage),
          modified: monaco.editor.createModel(atob(this.scriptShadow.shadowCopyCode), scriptLanguage)
        });
      }, 100);
    }
  }

  private onClickedExitDiff(){
    const scriptDiffEditor = (<any>this.$refs).scriptDiff;
    scriptDiffEditor.innerHTML = ''; // clear old stuff out
    this.$modal.hide('script-diff');
    this.scriptDiffEditor = null;
  }

  @BindStoreModel({storeType: StoreType.JobDefStore, selectedModelName: 'models'})
  private jobDefs!: JobDef[];

  @BindStoreModel({storeType: StoreType.TeamVariableStore, selectedModelName: 'models'})
  private teamVars!: TeamVar[];

  @Watch('teamVars')
  private onTeamVarsChanged(){
    teamVarsForAutoComplete = this.teamVars;
  }

  @BindStoreModel({storeType: StoreType.ScriptNameStore, selectedModelName: 'models'})
  private scriptNames!: ScriptName[];

  @Prop() private jobDef!: JobDef;

  @Watch('jobDef')
  private onJobDefChanged(){
    this.selectedJobDef = this.jobDef;

    jobDefForAutoComplete = this.selectedJobDef;
  }

  private selectedJobDef: JobDef|null = null;

  private onSggVariablesClicked(){
    this.$modal.show('sgg');
  }

  private onClickedTeamVar(teamVar: TeamVar){
    this.fullScreenEditor.trigger('keyboard', 'type', {text: `@sgg("${teamVar.name}")`});
    this.$modal.hide('sgg');
  } 

  private onClickedJobDefVar(varKey: string, varValue: string){
    this.fullScreenEditor.trigger('keyboard', 'type', {text: `@sgg("${varKey}")`});
    this.$modal.hide('sgg');
  }

  private onCloseSgg(){
    this.$modal.hide('sgg');
  }

  private onSgsVariablesClicked(){
    this.$modal.show('sgs');
  }

  private onClickedScriptVar(scriptName: ScriptName){
    this.fullScreenEditor.trigger('keyboard', 'type', {text: `@sgs("${scriptName.name}")`});
    this.$modal.hide('sgs');
  }

  private onCloseSgs(){
    this.$modal.hide('sgs');
  }


  @BindProp({storeType: StoreType.SecurityStore, selectedModelName: 'user', propName: 'id'})
  private loggedInUserId!: string;

  private isScriptEditable(script: Script): boolean {
    if(!script){
      return false;
    }
    else if(script.teamEditable){
      return true;
    }
    else {
      return script._originalAuthorUserId == this.loggedInUserId;
    }
  }

  // for reactivity in a template
  private loadedUsers = {};
  private getUser(userId: string): User {
    if(!this.loadedUsers[userId]){
      Vue.set(this.loadedUsers, userId, {name: 'loading...'});

      (async () => {
        this.loadedUsers[userId] = await this.$store.dispatch(`${StoreType.UserStore}/fetchModel`, userId);
      })();
    }

    return this.loadedUsers[userId];
  }

  private scriptUsageCount = 0; // need an actual field for reactivity in Vue

  private get scriptStepDefUsageCount(): number {
    if(this.script){
      (async () => {
        const countResponse = await axios.get(`/api/v0/stepDef?filter=_scriptId==${this.script.id}&responseFields=id`);
        this.scriptUsageCount = countResponse.data.meta.count;
      })();

      return this.scriptUsageCount;
    }
    else {
      return 0;
    }
  }

  private scriptJobUsage = [];

  private onClickScriptJobUsage(){
    this.$modal.show('job-step-details');

    (async () => {
      const stepDefsResponse = await axios.get(`/api/v0/stepDef?filter=_scriptId==${this.script.id}`);
      const taskDefIds = _.uniq(stepDefsResponse.data.data.map(stepDef => stepDef._taskDefId));

      const taskDefsResponse = await axios.get(`/api/v0/taskDef?filter=id->${JSON.stringify(taskDefIds)}`);
      const jobDefIds = _.uniq(taskDefsResponse.data.data.map(taskDef => taskDef._jobDefId));
      
      const jobDefsResponse = await axios.get(`/api/v0/jobDef?filter=id->${JSON.stringify(jobDefIds)}`);
      this.scriptJobUsage = jobDefsResponse.data.data.map(jobDef => {return {id: jobDef.id, name: jobDef.name};});
    })();
  }

  private closeJobStepDetails(){
    this.$modal.hide('job-step-details');
  }
}


let jobDefForAutoComplete: undefined|JobDef;

const appendJobDefAutoCompleteItems = function(range, items){
  if(jobDefForAutoComplete && jobDefForAutoComplete.runtimeVars){

    for(let [varKey, varValue] of Object.entries(jobDefForAutoComplete.runtimeVars)){
      items.push({
        label: `sgg ${varKey} [${varValue}] (Job)`, 
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: `@sgg("${varKey}")`, 
        range: range
      });
    }
  }
};

let teamVarsForAutoComplete: TeamVar[];

const appendTeamVarAutoCompleteItems = function(range, items){
  if(teamVarsForAutoComplete){

    for(let teamVar of teamVarsForAutoComplete){
      items.push({
        label: `sgg ${teamVar.name} (Team Var)`, 
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: `@sgg("${teamVar.name}")`, 
        range: range
      });
    }
  }
};

let scriptNamesForAutoComplete: ScriptName[];

const appendScriptNameAutoCompleteItems = function(range, items){
  if(scriptNamesForAutoComplete){

    for(let scriptName of scriptNamesForAutoComplete){
      items.push({
        label: `sgs ${scriptName.name}`, 
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: `@sgs("${scriptName.name}")`, 
        range: range
      });
    }
  }
};

// a globally accessible auto completion for monaco auto-complete
// This code will only be invoked once when the class is loaded
const createDependencyProposals = function(range) {
  // returning a static list of proposals, not even looking at the prefix (filtering is done by the Monaco editor),
  // here you could do a server side lookup
  const items = [];
  appendJobDefAutoCompleteItems(range, items);
  appendTeamVarAutoCompleteItems(range, items);
  appendScriptNameAutoCompleteItems(range, items);
  return items;
}

const uniqueLanguages = <string[]> _.uniq(Object.entries(scriptTypesForMonaco).map(entry => entry[1]));

for(let language of uniqueLanguages){
  monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems: function(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      return {
        suggestions: createDependencyProposals(range)
      };
    }
  });
}


</script>

<style scoped lang="scss">
table {
  border-width: 0;
}

td {
  border-width: 0 !important;
}

.script-button-bar {
  display: flex;
  justify-content: space-between;
}

.button-spaced {
  margin-left: 10px;
}

.variables {
  position: relative;
  margin-left: 10px;
  top: 8px;
}

.readonly-tooltip-container {
  position: relative;
  display: inline-block;
}

.readonly-tooltip-container .readonly-tooltip-text {
  visibility: hidden;
  width: 200px;
  background-color: white;
  color: black;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
  border-width: 1px;
  border-style: solid;
 
  /* Position the tooltip text - see examples below! */
  position: absolute;
  z-index: 1;
}

/* Show the tooltip text when you mouse over the tooltip container */
.readonly-tooltip-container:hover .readonly-tooltip-text {
  visibility: visible;
}

.v--modal-overlay[data-modal="script-editor-fullscreen"] {
  background: white;
}

.v--modal-overlay[data-modal="script-diff"] {
  background: white;
}

// Make sure the alert-modal shows on top of all other modals
[data-modal="sgg"] { 
  z-index: 1000 !important;
}

[data-modal="sgs"] { 
  z-index: 1000 !important;
}
</style>
