<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component({
  name: 'EditorPanel',
})
export default class EditorPanel extends Vue {
  public render () {
    return this.$scopedSlots.default({
      onRunLambda: this.onRunLambda,
      onShowLogs: this.onShowLogs,
      onSave: this.onSave,
      onRun: this.onRun,
    });
  }

  public onSave () {
    console.log('On save');
  }

  public onRun () {
    console.log('On run');
  }

  public onRunLambda () {
    console.log('On run lambda');
  }

  public onShowLogs () {
    console.log('On show logs');
  }
}
</script>
