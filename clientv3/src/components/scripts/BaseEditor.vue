<template>
  <div>
    <BasePanel />
    <MonacoWrapper />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

import MonacoWrapper from './MonacoWrapper.vue';
import BasePanel from './BasePanel.vue';

@Component({
  name: 'BaseEditor',
  components: { MonacoWrapper, BasePanel }
})
export default class BaseEditor extends Vue {

}
</script>

<style lang="scss" scoped>

</style>
