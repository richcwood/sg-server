<template>
  <div class="scripts-page sg-container-px">
    <ScriptsFilter />
    <BaseEditor />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

import ScriptsFilter from '@/components/scripts/ScriptsFilter.vue';
import BaseEditor from '@/components/scripts/BaseEditor.vue';

@Component({
  name: 'Scripts',
  components: { ScriptsFilter, BaseEditor },
})
export default class NewScripts extends Vue {

}
</script>

<style lang="scss" scoped>
.scripts-page {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 100%;
  column-gap: 20px;
}
</style>
