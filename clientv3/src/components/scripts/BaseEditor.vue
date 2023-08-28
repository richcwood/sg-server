<template>
  <div class="is-flex is-flex-direction-column">
    <BasePanel :scriptId="scriptId" />
    <MonacoWrapper :scriptId="scriptId" class="is-flex-grow-1" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

import MonacoWrapper from './MonacoWrapper.vue';
import BasePanel from './BasePanel.vue';

@Component({
  name: 'BaseEditor',
  components: { MonacoWrapper, BasePanel }
})
export default class BaseEditor extends Vue {
  @Prop() public readonly scriptId: string;
}
</script>

<style lang="scss" scoped>
</style>
