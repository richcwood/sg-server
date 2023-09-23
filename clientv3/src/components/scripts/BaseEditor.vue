<template>
  <div class="is-flex is-flex-direction-column">
    <BasePanel :scriptId="scriptId" :theme="theme" @theme:update="onThemeChange" />
    <MonacoWrapper :scriptId="scriptId" :theme="theme" class="is-flex-grow-1" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

import { EditorTheme } from '@/store/script/types';
import MonacoWrapper from './MonacoWrapper.vue';
import BasePanel from './BasePanel.vue';

@Component({
  name: 'BaseEditor',
  components: { MonacoWrapper, BasePanel }
})
export default class BaseEditor extends Vue {
  @Prop() public readonly scriptId: string;

  public theme: EditorTheme = null;

  public created() {
    this.theme = localStorage.getItem('scriptEditor_theme') as EditorTheme;
  }

  public onThemeChange (theme: EditorTheme) {
    localStorage.setItem('scriptEditor_theme', theme);

    this.theme = theme;
  }
}
</script>
