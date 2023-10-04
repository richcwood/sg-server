<template>
  <modal-card>
    <template #title>SGS: Saas Glue Script</template>
    <template #body>
      <div class="notification is-info is-light">
        <p>Insert a SaaSGlue script into this script. You can also type "sgs" in the editor for auto complete.</p>
      </div>
      <ul>
        <li v-for="scriptName in scriptNames" :key="scriptName.id" class="mb-2">
          <a href="#" @click.prevent="onClickedScriptVar(scriptName)">{{ scriptName.name }}</a>
        </li>
      </ul>
    </template>

    <template #footer>
      <button class="button" @click="$emit('close')">Close</button>
    </template>
  </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import * as monaco from 'monaco-editor';

import ModalCard from "@/components/core/ModalCard.vue";
import { ScriptName } from "@/store/scriptName/types";
import { BindStoreModel } from "@/decorator";
import { StoreType } from "@/store/types";

@Component({
  name: "SgsModal",
  components: { ModalCard },
})
export default class SgsModal extends Vue {
  @Prop({ required: true }) public readonly editor: monaco.editor.IStandaloneCodeEditor;

  @BindStoreModel({ storeType: StoreType.ScriptNameStore, selectedModelName: 'models' })
  public scriptNames: ScriptName[];

  public onClickedScriptVar(scriptName: ScriptName) {
    this.editor.trigger('keyboard', 'type', { text: `@sgs("${scriptName.name}")` });
    this.$emit('close');
  }
}
</script>
