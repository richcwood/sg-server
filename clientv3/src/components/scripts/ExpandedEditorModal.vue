<template>
  <div class="is-flex is-flex-direction-column" style="height:100%">
    <header class="is-align-items-center is-flex m-2">
      <button type="button" class="button" @click="onClose">Exit full screen</button>

      <span class="variables ml-2">
        Static variables:
        <a href="#" @click.prevent="onSggVariablesClicked">@sgg</a>
        &nbsp;
        <v-popover class="help-popover">
          <font-awesome-icon icon="question-circle" class="popup-help-question" />
          <span slot="popover">
            <div>
              <b>S</b>aas <b>G</b>lue <b>G</b>lobal
              <br>
              @SGG variables can be defined with
              <ul>
                <li>Team Vars via the <router-link :to="{ name: 'teamVars' }"> team var tab </router-link></li>
                <li>Job runtime variables via a Job's Runtime Variables settings</li>
                <li>Scripts that dyanmically output @SGG variables in your script's standard output</li>
              </ul>
            </div>
          </span>
        </v-popover>

        <a href="#" @click.prevent="onSgsVariablesClicked">@sgs</a> | <a href="#" @click.prevent>@sgo</a>
      </span>
    </header>
    <div class="is-flex-grow-2" ref="scriptEditorFullScreen"></div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import * as monaco from 'monaco-editor';
import { VPopover } from 'v-tooltip';

import { EditorTheme, Script, ScriptType, scriptTypesForMonaco } from '@/store/script/types';
import { AlertCategory, AlertPlacement, SgAlert } from "@/store/alert/types";
import { ScriptShadow } from "@/store/scriptShadow/types";
import ModalCard from "@/components/core/ModalCard.vue";
import { BindSelectedCopy } from "@/decorator";
import { StoreType } from "@/store/types";
import SgsModal from './SgsModal.vue';
import SggModal from './SggModal.vue';

@Component({
  name: "ExpandedEditorModal",
  components: { ModalCard, VPopover },
})
export default class ExpandedEditorModal extends Vue {
  @Prop({ required: true }) public readonly theme: EditorTheme;
  @Prop({ required: true }) public readonly script: Script;
  @Prop() public readonly isScriptEditable: boolean;

  @BindSelectedCopy({ storeType: StoreType.ScriptShadowStore })
  private scriptShadow: ScriptShadow;

  private fullScreenEditor: monaco.editor.IStandaloneCodeEditor;

  $refs: {
    scriptEditorFullScreen: HTMLDivElement;
  };

  public mounted() {
    this.fullScreenEditor = monaco.editor.create(this.$refs.scriptEditorFullScreen, {
      language: this.getMonacoLanguage(this.script.scriptType),
      value: atob(this.scriptShadow.shadowCopyCode),
      readOnly: !this.isScriptEditable,
      automaticLayout: true,
      theme: this.theme,
    });

    this.fullScreenEditor.onDidChangeModelContent(this.onScriptEditorContentChange);
  }

  private getMonacoLanguage(scriptType: ScriptType): string {
    if (scriptType === ScriptType.NODE) {
      return scriptTypesForMonaco[ScriptType.JAVASCRIPT];
    }

    return scriptTypesForMonaco[scriptType];
  }

  private onScriptEditorContentChange(): void {
    if (this.scriptShadow) {
      const model = this.fullScreenEditor.getModel();
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

  public async onClose() {
    if (this.$store.state[StoreType.ScriptShadowStore].storeUtils.hasSelectedCopyChanged()) {
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving backup of script - ${this.script.name}`, AlertPlacement.FOOTER));

      try {
        await this.$store.dispatch(`${StoreType.ScriptShadowStore}/save`);
        this.$store.commit(`${StoreType.ScriptShadowStore}/select`, this.scriptShadow);
        this.close();
      } catch (err) {
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving backup of script - ${this.script.name} failed`, AlertPlacement.FOOTER, AlertCategory.ERROR));
        console.error(err);
      }
    } else {
      this.close();
    }
  }

  private close() {
    this.fullScreenEditor.dispose();
    this.$emit('close');
  }

  public onSggVariablesClicked() {
    this.$modal.show(SggModal, {
      editor: this.fullScreenEditor,
    }, {
      height: 'auto'
    });
  }

  public onSgsVariablesClicked() {
    this.$modal.show(SgsModal, {
      editor: this.fullScreenEditor,
    }, {
      height: 'auto'
    });
  }
}
</script>
