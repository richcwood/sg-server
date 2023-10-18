<template>
  <fieldset :disabled="!script">
    <EditorPanel :scriptId="scriptId" :theme="theme" v-slot="{
      onShowScriptInfo,
      isScriptEditable,
      isScriptRunning,
      onRevertChanges,
      isSavingScript,
      onShowSettings,
      onExpandEditor,
      onRenameScript,
      onDeleteScript,
      onRunLambda,
      onShowDiff,
      onShowLogs,
      onSave,
      onRun,
      onUndo,
      onRedo,
    }" @theme:update="onThemeChange">
      <div class="panel-controls">
        <div class="buttons m-0 separator">
          <button @click="onUndo" class="button is-small mb-0" title="Undo Changes">
            <span class="icon">
              <font-awesome-icon icon="undo" />
            </span>
          </button>

          <button @click="onRedo" class="button is-small mb-0" title="Redo Changes">
            <span class="icon">
              <font-awesome-icon icon="redo" />
            </span>
          </button>

          <button @click="onShowDiff" :disabled="!hasCodeChanges" class="button is-small mb-0" title="Compare Changes">
            <span class="icon">
              <font-awesome-icon icon="file-code" />
            </span>
          </button>

          <button :disabled="!hasCodeChanges" @click="onRevertChanges" class="button is-small mb-0"
            title="Revert Changes">
            <span class="icon">
              <font-awesome-icon icon="history" />
            </span>
          </button>
        </div>

        <div class="buttons m-0 separator">
          <button @click="onSave" :disabled="!hasCodeChanges || isSavingScript" class="button is-small mb-0" title="Save Script">
            <span class="icon">
              <span v-if="isSavingScript" class="spinner"></span>
              <font-awesome-icon v-else icon="save" />
            </span>
          </button>

          <button @click="onRenameScript" class="button is-small mb-0" title="Rename Script">
            <span class="icon">
              <font-awesome-icon icon="pencil-alt" />
            </span>
          </button>

          <button @click="onDeleteScript" class="button is-small mb-0 is-danger" title="Delete Script">
            <span class="icon">
              <font-awesome-icon icon="trash" />
            </span>
          </button>
        </div>

        <div class="buttons m-0">
          <button @click="onRun" :disabled="isScriptRunning" class="button is-small mb-0 is-success" title="Run Script">
            <span class="icon">
              <font-awesome-icon icon="play" />
            </span>
            <span>Run</span>
          </button>

          <button @click="onRunLambda" :disabled="isScriptRunning" class="button is-small mb-0 is-warning" title="Run Script in AWS Lambda">
            <span class="icon lambda-icon">
              <img src="@/assets/icons/aws-lambda-icon.svg" />
            </span>
            <span>Run in AWS Lambda</span>
          </button>

          <button :disabled="isScriptRunning" class="button is-small mb-0" title="Schedule Run">
            <span class="icon">
              <font-awesome-icon icon="clock" />
            </span>
            <span>Schedule Run</span>
          </button>
        </div>

        <div class="buttons controls-right">
          <button @click="onShowLogs" :disabled="true" class="button is-small mb-0" title="View Execution Log">
            <span class="icon">
              <font-awesome-icon icon="file-alt" />
            </span>
            <span>Execution Log</span>
          </button>

          <button @click="onExpandEditor" class="button is-small mb-0" title="Expand Editor">
            <span class="icon">
              <font-awesome-icon icon="expand" />
            </span>
          </button>

          <button @click="onShowScriptInfo" class="button is-small mb-0" title="Script Information">
            <span class="icon">
              <font-awesome-icon icon="info" />
            </span>
          </button>
          <button @click="onShowSettings" :disabled="!isScriptEditable" class="button is-small mb-0"
            title="Editor Settings">
            <span class="icon">
              <font-awesome-icon icon="cog" />
            </span>
          </button>
        </div>
      </div>
    </EditorPanel>
  </fieldset>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

import { EditorTheme, Script } from '@/store/script/types';
import { ScriptShadow } from '@/store/scriptShadow/types';
import { BindSelectedCopy } from '@/decorator';
import EditorPanel from './EditorPanel.vue';
import { StoreType } from '@/store/types';

@Component({
  name: 'BasePanel',
  components: { EditorPanel }
})
export default class BasePanel extends Vue {
  @Prop({ default: 'vs' }) public readonly theme: EditorTheme;
  @Prop({ required: true }) public readonly scriptId: string;

  @BindSelectedCopy({ storeType: StoreType.ScriptShadowStore })
  public scriptShadow: ScriptShadow;

  public get script(): Script {
    return this.$store.state[StoreType.ScriptStore].storeUtils.findById(this.scriptId);
  }

  public get hasCodeChanges(): boolean {
    if (this.scriptId && this.script && this.scriptShadow) {
      return this.script.code !== this.scriptShadow.shadowCopyCode;
    } else {
      return false;
    }
  }

  public onThemeChange(theme: EditorTheme) {
    this.$emit('theme:update', theme);
  }
}
</script>

<style lang="scss" scoped>
.panel-controls {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: var(--header-controls-height);
  border-bottom: var(--primary-border);
  padding: 0 10px;
}

.separator::after {
  content: '';
  display: block;
  width: 1px;
  height: 25px;
  border-right: var(--primary-border);
  margin: 0 10px;
}

.icon.lambda-icon {
  width: 1.25em;
  height: 1.25em;
}

.buttons.controls-right {
  margin-left: auto;
  margin-bottom: 0;
}

.spinner {
  @include loader;

  display: inline-block;
}
</style>
