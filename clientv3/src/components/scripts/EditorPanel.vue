<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

import { AlertPlacement, SgAlert } from '@/store/alert/types';
import { EditorTheme, Script, ScriptType } from '@/store/script/types';
import { ScriptShadow } from '@/store/scriptShadow/types';
import { showErrors } from '@/utils/ErrorHandler';
import SettingsModal from './SettingsModal.vue';
import { BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';

@Component({
  name: 'EditorPanel',
  components: { SettingsModal }
})
export default class EditorPanel extends Vue {
  @Prop({ default: 'vs' }) public readonly theme: EditorTheme;
  @Prop({ required: true }) public readonly scriptId: string;

  @BindSelectedCopy({ storeType: StoreType.ScriptShadowStore })
  private scriptShadow: ScriptShadow;

  public render () {
    return this.$scopedSlots.default({
      onRunLambda: this.onRunLambda,
      onShowSettings: this.onShowSettings,
      onShowLogs: this.onShowLogs,
      onSave: this.onSave,
      onRun: this.onRun,
    });
  }

  public get script (): Script {
    return this.$store.state[StoreType.ScriptStore].storeUtils.findById(this.scriptId);
  }

  public onSave () {
    console.log('On save', this.scriptId);
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

  public onShowSettings () {
    this.$modal.show(SettingsModal, {
      scriptType: this.script.scriptType,
      theme: this.theme,
    }, {
      height: 'auto'
    }, {
      save: (settings: {scriptType: ScriptType; theme: EditorTheme}) => {
        if (settings.scriptType !== this.script.scriptType) {
          this.onScriptTypeChange(settings.scriptType);
        }

        if (settings.theme !== this.theme) {
          this.onThemeChange(settings.theme);
        }
      }
    });
  }

  private async onScriptTypeChange (scriptType: ScriptType) {
    try {
      if (this.script) {
        await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {script: {
          id: this.scriptId,
          scriptType
        }});

        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script type updated`, AlertPlacement.FOOTER));
      }
    } catch(err) {
      console.error(err);
      showErrors('Error updating the script type', err);
    }
  }

  private onThemeChange (theme: EditorTheme) {
    this.$parent.$emit('theme:update', theme);
  }

  private isScriptEditable(): boolean {
    const loggedInUserId: string = this.$store.state[StoreType.SecurityStore].user.id;

    if (!this.script) {
      return false;
    } else if (this.script.teamEditable) {
      return true;
    } else {
      return this.script._originalAuthorUserId == loggedInUserId;
    }
  }
}
</script>
