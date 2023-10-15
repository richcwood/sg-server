<template>
  <div class="is-flex is-flex-direction-column" style="height:100%">
    <header class="is-align-items-center is-flex m-2">
      <button type="button" class="button" @click="onClose">Exit Diff</button>
    </header>
    <div class="is-flex-grow-2" ref="diffEditorEl"></div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import * as monaco from 'monaco-editor';

import { EditorTheme, Script, ScriptType, scriptTypesForMonaco } from '@/store/script/types';
import { ScriptShadow } from "@/store/scriptShadow/types";
import ModalCard from "@/components/core/ModalCard.vue";

@Component({
  name: "DiffEditorModal",
  components: { ModalCard },
})
export default class DiffEditorModal extends Vue {
  @Prop({ required: true }) public readonly scriptShadow: ScriptShadow;
  @Prop({ required: true }) public readonly theme: EditorTheme;
  @Prop({ required: true }) public readonly script: Script;

  private diffEditor: monaco.editor.IDiffEditor;

  $refs: {
    diffEditorEl: HTMLDivElement;
  };

  public mounted() {
    this.diffEditor = monaco.editor.createDiffEditor(this.$refs.diffEditorEl, {
      automaticLayout: true,
      theme: this.theme,
      readOnly: true,
    });

    const scriptLanguage = this.getMonacoLanguage(this.script.scriptType);

    this.diffEditor.setModel({
      original: monaco.editor.createModel(atob(this.script.code), scriptLanguage),
      modified: monaco.editor.createModel(atob(this.scriptShadow.shadowCopyCode), scriptLanguage)
    });
  }

  private getMonacoLanguage(scriptType: ScriptType): string {
    if (scriptType === ScriptType.NODE) {
      return scriptTypesForMonaco[ScriptType.JAVASCRIPT];
    }

    return scriptTypesForMonaco[scriptType];
  }

  public onClose() {
    this.diffEditor.dispose();
    this.$emit('close');
  }
}
</script>
