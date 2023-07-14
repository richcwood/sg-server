<template>
  <EditorPanel v-slot="{ onSave, onRun, onRunLambda, onShowLogs }">
    <button @click="onSave">Save</button>
    <button @click="onRun">Run</button>
    <button @click="onRunLambda">Run in AWS Lambda</button>
    <button @click="onShowLogs">Execution Log</button>
  </EditorPanel>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

import EditorPanel from './EditorPanel.vue';

@Component({
  name: 'BasePanel',
  components: { EditorPanel }
})
export default class BasePanel extends Vue {

}
</script>

<style lang="scss" scoped>

</style>
