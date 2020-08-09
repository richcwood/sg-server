<template>
  <div>

    <modal name="kpg" :classes="'round-popup'" width="700" height="825" background="white">
      <div style="width: 100%; height: 100%; background: white;">
        <table class="table">
          <tr class="tr">
            <td class="td" colspan="2">
              KPG: <strong>K</strong>iki <strong>P</strong>arameters <strong>G</Strong>lobal
              <br>
              Excellent instructions here some day.
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

        <!-- Org / team variables -->
        <div style="width: 100%; height: 300px; overflow: scroll;">
          <table class="table is-striped">
            <tr class="tr" v-if="orgVars.length === 0">
              <td class="td">
                There are no variables for your team yet.
              </td>
            </tr>
            <tr class="tr" v-else>
              <td class="td" colspan="3">
                Variables available to your team
              </td>
            </tr>
            <tr class="tr" v-for="orgVar in orgVars" v-bind:key="orgVar.id">
              <td class="td">
                <a @click="onClickedOrgVar(orgVar)">{{orgVar.name}}</a>
              </td>
              <td class="td">
                <span style="font-weight: 700; size: 20px;">
                  =
                </span>
              </td>
              <td class="td">
                {{orgVar.value}}
              </td>
            </tr>
          </table>
        </div>

        <table class="table">
          <tr class="tr">
            <td class="td">
              <button class="button" @click="onCloseKpg">Close</button>
            </td>
          </tr>
        </table>
      </div>
    </modal>


    <modal name="script-editor-fullscreen" :classes="'round-popup'" :adaptive="true" width="100%" height="100%" background="white">
      <div style="margin: 6px;">
        <button class="button" @click="onClickedExitFullScreen">Exit full screen</button>
        <span class="variables">
          Static variables: 
          <a @click="onKpgVariablesClicked">@kpg</a> | 
          <a>@kps</a> |
          <a>@kpo</a>
        </span>
      </div>
      <div ref="scriptEditorFullScreen" style="width: 100%; height: 100%;">
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


    <div style="margin-left: 5px; margin-right: 10px;">
      <div v-if="script" class="script-button-bar" style="margin-bottom: 10px;">
        <button class="button" @click="onClickedScriptFullScreen">Full Screen</button>
        <select class="input select button-spaced" style="width: 150px;" v-model="theme">
          <option value="vs">Light</option>
          <option value="vs-dark">Dark</option>
          <option value="hc-black">Black</option>
        </select>
        <span class="button-spaced" style="vertical-align:bottom; padding-top: 8px;">( {{scriptTypesForMonaco[script.scriptType]}} )</span>
        <span style="flex-grow: 1"> </span>
        <button class="button button-spaced" :disabled="script.code === script.shadowCopyCode" @click="warnRevertScriptChanges">Revert</button>
        <button class="button is-primary button-spaced" :disabled="script.code === script.shadowCopyCode" @click="onPublishScriptClicked">Publish</button>
      </div>
        
      <div ref="scriptEditor" style="width: 100%; height: 250px; background: hsl(0, 0%, 98%);"></div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { Script, ScriptType, scriptTypesForMonaco } from "@/store/script/types";
import { StoreType } from '@/store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { showErrors } from '@/utils/ErrorHandler'; 
import { JobDef } from '@/store/jobDef/types';
import { OrgVar } from '@/store/orgVar/types';
import { BindStoreModel, BindSelected, BindSelectedCopy, BindProp } from '@/decorator';
import axios from 'axios';
import * as monaco from "monaco-editor";

@Component
export default class ScriptEditor extends Vue {

  // Expose to templates
  private readonly scriptTypesForMonaco = scriptTypesForMonaco;

  private theme = 'vs';
  
  private scriptEditor: monaco.editor.IStandaloneCodeEditor; 

  private scriptShadowCopySaveInterval: any;

  private mounted(){
    // load all org vars when the component is mounted - they are small objects
    this.$store.dispatch(`${StoreType.OrgVariableStore}/fetchModelsByFilter`);

    monaco.editor.onDidCreateModel((model: monaco.editor.ITextModel) => {
      model.onDidChangeContent((e: monaco.editor.IModelContentChangedEvent) => {
        if (this.script) {
          this.script.shadowCopyCode = model.getLinesContent().join("\n");

          // If the change was made in the full screen editor then we need to copy the changes to the regular editor
          if(this.scriptEditor && this.fullScreenEditor && model.id === this.fullScreenEditor.getModel().id){
            this.scriptEditor.setValue(this.fullScreenEditor.getValue());
          }
        }
      });
    });

    if(localStorage.getItem('scriptEditor_theme')){
      this.theme = localStorage.getItem('scriptEditor_theme');
    }

    this.onScriptChanged();
    this.onJobDefChanged();
  }

  private beforeDestroy(){
    if(this.scriptShadowCopySaveInterval){
      clearInterval(this.scriptShadowCopySaveInterval);
    }
  }

  private async tryToSaveScriptShadowCopy(){
    if(    this.script
        && this.script.code !== this.script.shadowCopyCode){
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving backup of script - ${this.script.name}`, AlertPlacement.FOOTER));
    
      try {
        const scriptForSave = {
          id: this.script.id,
          shadowCopyCode: this.script.shadowCopyCode
        };

        await this.$store.dispatch(`${StoreType.ScriptStore}/save`, scriptForSave);
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
      this.onScriptChanged(); // just re-trigger the entire editor creation

      localStorage.setItem('scriptEditor_theme', this.theme);
    }
  }

  @Prop() private script!: Script;

  @Watch("script")
  private onScriptChanged() {
    const scriptEditor = (<any>this.$refs).scriptEditor;
    if(scriptEditor){
      scriptEditor.innerHTML = ''; // clear old stuff out
    }

    if(this.script){
      this.scriptEditor = monaco.editor.create(scriptEditor, {
        value: this.script.shadowCopyCode,
        language: (<any>scriptTypesForMonaco)[this.script.scriptType],
        theme: this.theme,
        automaticLayout: true
      });

      if(this.scriptShadowCopySaveInterval){
        clearInterval(this.scriptShadowCopySaveInterval);
      }

      this.scriptShadowCopySaveInterval = setInterval(() => {
        this.tryToSaveScriptShadowCopy();
      }, 20*1000); // try to save shadow copy every n milliseconds
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
      if(this.script){
        //revert the shadow copy
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Reverting script - ${this.script.name}`, AlertPlacement.FOOTER));      
        
        const revertedScript = {
          id: this.script.id,
          shadowCopyCode: this.script.code
        };
        await this.$store.dispatch(`${StoreType.ScriptStore}/save`, revertedScript);
        this.script.shadowCopyCode = this.script.code;
        this.onScriptChanged(); // will reset the editor
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script reverted`, AlertPlacement.FOOTER));
      }
    }
    catch(err){
      console.error(err);
      showErrors('Error reverting script', err);
      
    }
    finally {
      this.$modal.hide('warn-revert-script-modal');
    }
  }

  private async onPublishScriptClicked(){
    try {
      if(this.script){
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving script - ${this.script.name}`, AlertPlacement.FOOTER));      
        
        const updatedScript = {
          id: this.script.id,
          shadowCopyCode: this.script.shadowCopyCode,
          code: this.script.shadowCopyCode
        };
        await this.$store.dispatch(`${StoreType.ScriptStore}/save`, updatedScript);
        this.script.code = this.script.shadowCopyCode;
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script published`, AlertPlacement.FOOTER));
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
        scriptEditorFullScreenEl.innerHTML = ""; // clear old stuff out

        this.fullScreenEditor = monaco.editor.create(scriptEditorFullScreenEl, {
          value: this.script.shadowCopyCode,
          language: (<any>scriptTypesForMonaco)[this.script.scriptType],
          theme: this.theme,    
          automaticLayout: true
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

  @BindStoreModel({storeType: StoreType.JobDefStore, selectedModelName: 'models'})
  private jobDefs!: JobDef[];

  @BindStoreModel({storeType: StoreType.OrgVariableStore, selectedModelName: 'models'})
  private orgVars!: OrgVar[];

  @Prop() private jobDef!: JobDef;

  @Watch('jobDef')
  private onJobDefChanged(){
    this.selectedJobDef = this.jobDef;
  }

  private selectedJobDef: JobDef|null = null;

  private onKpgVariablesClicked(){
    this.$modal.show('kpg');
  }

  private onClickedOrgVar(orgVar: OrgVar){
    this.fullScreenEditor.trigger('keyboard', 'type', {text: `@kpg("${orgVar.name}")`});
    this.$modal.hide('kpg');
  } 

  private onClickedJobDefVar(varKey: string, varValue: string){
    this.fullScreenEditor.trigger('keyboard', 'type', {text: `@kpg("${varKey}")`});
    this.$modal.hide('kpg');
  }

  private onCloseKpg(){
    this.$modal.hide('kpg');
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

.v--modal-overlay[data-modal="script-editor-fullscreen"] {
  background: white;
}

// Make sure the alert-modal shows on top of all other modals
[data-modal="kpg"] { 
  z-index: 1000 !important;
}
</style>
