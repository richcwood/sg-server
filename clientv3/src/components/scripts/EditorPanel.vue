<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';
import * as monaco from 'monaco-editor';

import { AlertPlacement, SgAlert } from '@/store/alert/types';
import ExpandedEditorModal from './ExpandedEditorModal.vue';
import { EditorTheme, Script } from '@/store/script/types';
import RevertChangesModal from './RevertChangesModal.vue';
import { ScriptShadow } from '@/store/scriptShadow/types';
import DiffEditorModal from './DiffEditorModal.vue';
import { showErrors } from '@/utils/ErrorHandler';
import SettingsModal from './SettingsModal.vue';
import { BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';
import InfoModal from './InfoModal.vue';
import RenameScriptModal from './RenameScriptModal.vue';
import DeleteScriptModal from './DeleteScriptModal.vue';
import RunSettingsModal from './RunSettingsModal.vue';

@Component({
  name: 'EditorPanel',
  components: { SettingsModal }
})
export default class EditorPanel extends Vue {
  @Prop({ default: 'vs' }) public readonly theme: EditorTheme;
  @Prop({ required: true }) public readonly scriptId: string;

  @BindSelectedCopy({ storeType: StoreType.ScriptShadowStore })
  public scriptShadow: ScriptShadow;

  public isJobRunning: boolean = false;

  public render() {
    return this.$scopedSlots.default({
      isScriptEditable: this.isScriptEditable,
      isSavingScript: this.isSavingScript,
      isJobRunning: this.isJobRunning,

      onShowScriptInfo: this.onShowScriptInfo,
      onRevertChanges: this.onRevertChanges,
      onShowSettings: this.onShowSettings,
      onExpandEditor: this.onExpandEditor,
      onRenameScript: this.onRenameScript,
      onDeleteScript: this.onDeleteScript,
      onRunLambda: this.onRunLambda,
      onShowLogs: this.onShowLogs,
      onShowDiff: this.onShowDiff,
      onSave: this.onSave,
      onUndo: this.onUndo,
      onRedo: this.onRedo,
      onRun: this.onRun,
    });
  }

  public get script(): Script {
    return this.$store.state[StoreType.ScriptStore].storeUtils.findById(this.scriptId);
  }

  private isSavingScript: boolean = false;

  public async onSave() {
    try {
      if(this.script && this.scriptShadow){
        this.isSavingScript = true;

        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving script - ${this.script.name}`, AlertPlacement.FOOTER));

        // Update the shadow copy fist, otherwise the script is selected when it's saved and it overwrites
        // the shadow's changes
        await this.$store.dispatch(`${StoreType.ScriptShadowStore}/save`);
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script published`, AlertPlacement.FOOTER));

        // Update the original script
        await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {
          script: {
            id: this.script.id,
            code: this.scriptShadow.shadowCopyCode
          }
        });
      }
    } catch(err){
      console.error(err);
      showErrors('Error publishing script', err);
    } finally {
      this.isSavingScript = false;
    }
  }

  public onRun() {
    this.$modal.show(RunSettingsModal, {
      scriptType: this.script.scriptType,
      scriptShadow: this.scriptShadow,
    }, {
      height: 'auto',
    }, {
      'job:running': () => this.isJobRunning = true,
      'job:completed': () => this.isJobRunning = false,
    });
  }

  public onRunLambda() {
    console.log('On run lambda');
  }

  public onShowLogs() {
    console.log('On show logs');
  }

  public onUndo() {
    monaco.editor.getEditors()[0].trigger('panel', 'undo', null);
  }

  public onRedo() {
    monaco.editor.getEditors()[0].trigger('panel', 'redo', null);
  }

  public onShowDiff() {
    this.$modal.show(DiffEditorModal, {
      scriptShadow: this.scriptShadow,
      script: this.script,
      theme: this.theme,
    }, {
      height: '100%',
      width: '100%',
    });
  }

  public onRevertChanges() {
    this.$modal.show(RevertChangesModal, {
      scriptShadow: this.scriptShadow,
      script: this.script,
    }, {
      height: 'auto',
      width: '200px',
    });
  }

  public onRenameScript() {
    this.$modal.show(RenameScriptModal, {
      script: this.script,
    }, {
      height: 'auto',
      width: '650px',
    });
  }

  public onDeleteScript() {
    this.$modal.show(DeleteScriptModal, {
      script: this.script,
    }, {
      height: 'auto',
      width: '650px',
    });
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
