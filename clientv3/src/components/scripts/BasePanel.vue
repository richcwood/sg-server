<template>
  <EditorPanel :scriptId="scriptId" v-slot="{ onSave, onRun, onRunLambda, onShowLogs, onShowSettings }">
    <div class="panel-controls">
      <div class="buttons m-0 separator">
        <button class="button is-small mb-0" title="Undo Changes">
          <span class="icon">
            <font-awesome-icon icon="undo" />
          </span>
        </button>

        <button class="button is-small mb-0" title="Redo Changes">
          <span class="icon">
            <font-awesome-icon icon="redo" />
          </span>
        </button>

        <button class="button is-small mb-0" title="Compare Changes">
          <span class="icon">
            <font-awesome-icon icon="file-code" />
          </span>
        </button>

        <button class="button is-small mb-0" title="Revert Changes">
          <span class="icon">
            <font-awesome-icon icon="history" />
          </span>
        </button>
      </div>

      <div class="buttons m-0 separator">
        <button @click="onSave" class="button is-small mb-0" title="Save Script">
          <span class="icon">
            <font-awesome-icon icon="save" />
          </span>
        </button>

        <button class="button is-small mb-0" title="Rename Script">
          <span class="icon">
            <font-awesome-icon icon="pencil-alt" />
          </span>
        </button>

        <button class="button is-small mb-0 is-danger" title="Delete Script">
          <span class="icon">
            <font-awesome-icon icon="trash" />
          </span>
        </button>
      </div>

      <div class="buttons m-0">
        <button @click="onRun" class="button is-small mb-0 is-success" title="Run Script">
          <span class="icon">
            <font-awesome-icon icon="play" />
          </span>
          <span>Run</span>
        </button>

        <button @click="onRunLambda" class="button is-small mb-0 is-warning" title="Run Script in AWS Lambda">
          <span class="icon lambda-icon">
            <img src="@/assets/icons/aws-lambda-icon.svg" />
          </span>
          <span>Run in AWS Lambda</span>
        </button>

        <button class="button is-small mb-0" title="Schedule Run">
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

        <button class="button is-small mb-0" title="Expand Editor">
          <span class="icon">
            <font-awesome-icon icon="expand" />
          </span>
        </button>

        <button :disabled="!scriptId" class="button is-small mb-0" title="Script Information">
          <span class="icon">
            <font-awesome-icon icon="info" />
          </span>
        </button>
        <button @click="onShowSettings" :disabled="!scriptId" class="button is-small mb-0" title="Editor Settings">
          <span class="icon">
            <font-awesome-icon icon="cog" />
          </span>
        </button>
      </div>
    </div>
  </EditorPanel>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

import EditorPanel from './EditorPanel.vue';

@Component({
  name: 'BasePanel',
  components: { EditorPanel }
})
export default class BasePanel extends Vue {
  @Prop({ required: true }) public readonly scriptId: string;

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
</style>
