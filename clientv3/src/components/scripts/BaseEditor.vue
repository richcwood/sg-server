<template>
  <div class="is-flex is-flex-direction-column">
    <BasePanel :scriptId="scriptId" @theme:update="onThemeUpdate" />
    <MonacoWrapper :scriptId="scriptId" class="is-flex-grow-1" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

import MonacoWrapper from './MonacoWrapper.vue';
import BasePanel from './BasePanel.vue';
import { EditorTheme, ScriptType } from '@/store/script/types';

@Component({
  name: 'BaseEditor',
  components: { MonacoWrapper, BasePanel }
})
export default class BaseEditor extends Vue {
  @Prop() public readonly scriptId: string;

  public theme: EditorTheme = 'vs';

  public onThemeUpdate (theme: any) {
    console.log(theme);
  }

  public onSettingsChange (settings: {theme: EditorTheme, scriptType: ScriptType}) {
    localStorage.setItem('scriptEditor_theme', settings.theme);

    this.theme = settings.theme;
  }
}
</script>

<style lang="scss" scoped>
</style>
