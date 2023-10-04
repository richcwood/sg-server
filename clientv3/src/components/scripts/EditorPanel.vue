<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

import ExpandedEditorModal from './ExpandedEditorModal.vue';
import { EditorTheme, Script } from '@/store/script/types';
import SettingsModal from './SettingsModal.vue';
import { StoreType } from '@/store/types';
import InfoModal from './InfoModal.vue';

@Component({
  name: 'EditorPanel',
  components: { SettingsModal }
})
export default class EditorPanel extends Vue {
  @Prop({ default: 'vs' }) public readonly theme: EditorTheme;
  @Prop({ required: true }) public readonly scriptId: string;

  public render() {
    return this.$scopedSlots.default({
      isScriptEditable: this.isScriptEditable,
      onShowScriptInfo: this.onShowScriptInfo,
      onShowSettings: this.onShowSettings,
      onExpandEditor: this.onExpandEditor,
      onRunLambda: this.onRunLambda,
      onShowLogs: this.onShowLogs,
      onSave: this.onSave,
      onRun: this.onRun,
    });
  }

  public get script(): Script {
    return this.$store.state[StoreType.ScriptStore].storeUtils.findById(this.scriptId);
  }

  public onSave() {
    console.log('On save', this.scriptId);
  }

  public onRun() {
    console.log('On run');
  }

  public onRunLambda() {
    console.log('On run lambda');
  }

  public onShowLogs() {
    console.log('On show logs');
  }

  public onExpandEditor() {
    this.$modal.show(ExpandedEditorModal, {
      isScriptEditable: this.isScriptEditable,
      script: this.script,
      theme: this.theme,
    }, {
      height: '100%',
      width: '100%',
    });

  }

  public onShowScriptInfo() {
    this.$modal.show(InfoModal, { script: this.script }, {
      height: 'auto'
    });
  }

  public onShowSettings() {
    this.$modal.show(SettingsModal, {
      script: this.script,
      theme: this.theme,
    }, {
      height: 'auto'
    }, {
      'theme:update': (theme: EditorTheme) => {
        this.$parent.$emit('theme:update', theme);
      }
    });
  }

  private get isScriptEditable(): boolean {
    const loggedInUserId: string = this.$store.state[StoreType.SecurityStore].user.id;

    if (!this.scriptId) {
      return false;
    } else if (this.script.teamEditable) {
      return true;
    } else {
      return this.script._originalAuthorUserId === loggedInUserId;
    }
  }
}
</script>
