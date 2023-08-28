<template>
  <div v-if="!isLoading" ref="scriptEditor" class="monaco-editor"></div>
  <div v-else class="is-flex is-align-items-center is-justify-content-center">
    <p class="is-size-4"><span class="spinner"></span> Script is loading</p>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import * as monaco from 'monaco-editor';

import { Script, ScriptType, scriptTypesForMonaco } from '@/store/script/types';
import { AlertCategory, AlertPlacement, SgAlert } from '@/store/alert/types';
import { ScriptShadow } from '@/store/scriptShadow/types';
import { BindProp, BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';

@Component({
  name: 'MonacoWrapper',
})
export default class MonacoWrapper extends Vue {
  private scriptEditor: monaco.editor.IStandaloneCodeEditor;
  private scriptShadowCopySaveInterval: any;
  public isLoading = true;
  private theme = 'vs';

  public $refs: {
    scriptEditorFullScreen: HTMLDivElement;
    scriptEditor: HTMLDivElement;
  };

  @Prop({ required: true }) public readonly scriptId: string;

  @BindSelectedCopy({ storeType: StoreType.ScriptShadowStore })
  private scriptShadow: ScriptShadow;

  @BindSelectedCopy({ storeType: StoreType.ScriptStore })
  private script: Script;

  @BindProp({storeType: StoreType.SecurityStore, selectedModelName: 'user', propName: 'id'})
  private loggedInUserId: string;

  public created() {
    this.$store.dispatch(`${StoreType.TeamVariableStore}/fetchModelsByFilter`);
    this.fetchScript(this.scriptId);

    if (localStorage.getItem('scriptEditor_theme')) {
      this.theme = localStorage.getItem('scriptEditor_theme');
    }
  }

  @Watch('theme')
  private onThemeChanged() {
    if (this.scriptEditor) {
      localStorage.setItem('scriptEditor_theme', this.theme);
      this.onScriptShadowChanged();
    }
  }

  @Watch('scriptId')
  private async fetchScript(scriptId) {
    if (scriptId === null) {
      return;
    }

    try {
      this.isLoading = true;

      const script = await this.$store.dispatch(`${StoreType.ScriptStore}/fetchModel`, this.scriptId);
      this.$store.dispatch(`${StoreType.ScriptStore}/select`, script);
    } catch (err) {
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Unable to load the script ${this.scriptId}`, AlertPlacement.FOOTER));
    } finally {
      this.isLoading = false;
    }
  }

  @Watch('scriptShadow')
  private onScriptShadowChanged() {
    this.disposeEditor();

    if (this.scriptShadow) {
      this.scriptEditor = monaco.editor.create(this.$refs.scriptEditor, {
        value: atob(this.scriptShadow.shadowCopyCode),
        language: this.getMonacoLanguage(this.script.scriptType),
        theme: this.theme,
        automaticLayout: true,
        readOnly: !this.isScriptEditable(this.script),
        minimap: {
          enabled: false
        }
      });

      this.scriptEditor.onDidChangeModelContent(() => {
        this.onScriptEditorContentChange();
      });

      if (this.scriptShadowCopySaveInterval) {
        clearInterval(this.scriptShadowCopySaveInterval);
      }

      this.scriptShadowCopySaveInterval = setInterval(() => {
        this.tryToSaveScriptShadowCopy();
      }, 20 * 1000); // try to save shadow copy every n milliseconds
    }
  }

  private getMonacoLanguage (scriptType: ScriptType): string {
    if (scriptType === ScriptType.NODE) {
      return scriptTypesForMonaco[ScriptType.JAVASCRIPT];
    }

    return scriptTypesForMonaco[scriptType];
  }

  private isScriptEditable(script: Script): boolean {
    if (!script) {
      return false;
    } else if (script.teamEditable) {
      return true;
    } else {
      return script._originalAuthorUserId === this.loggedInUserId;
    }
  }

  private onScriptEditorContentChange (): void {
    if (this.scriptShadow) {
      const model = this.scriptEditor.getModel();
      const newCode = model.getLinesContent().join('\n');
      const newCodeInBase64 = btoa(newCode); // models always store code in base 64

      if (this.scriptShadow.shadowCopyCode !== newCodeInBase64) {
        this.$store.commit(`${StoreType.ScriptShadowStore}/updateSelectedCopy`, {
          id: this.scriptShadow.id,
          shadowCopyCode: newCodeInBase64
        });
      }
    }
  }

  private async tryToSaveScriptShadowCopy() {
    if(this.$store.state[StoreType.ScriptShadowStore].storeUtils.hasSelectedCopyChanged()){
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving backup of script - ${this.script.name}`, AlertPlacement.FOOTER));

      try {
        await this.$store.dispatch(`${StoreType.ScriptShadowStore}/save`);
      } catch (err) {
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving backup of script - ${this.script.name} failed`, AlertPlacement.FOOTER, AlertCategory.ERROR));
        console.error(err);
      }
    }
  }

  private disposeEditor(): void {
    if (this.scriptEditor) {
      this.scriptEditor.dispose();
    }
  }
}
</script>

<style lang="scss" scoped>
.spinner {
  @include loader;

  display: inline-block;
}
</style>
