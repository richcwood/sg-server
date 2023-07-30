<template>
  <div class="scripts-page">
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
  --primary-border: 1px #dadce0 solid;
  --header-controls-height: 41px;

  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 1fr;
  border-top: var(--primary-border);
  overflow: hidden;
}
</style>
