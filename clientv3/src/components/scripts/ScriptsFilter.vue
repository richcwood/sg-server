<template>
  <aside class="scripts-panel">
    <header class="pl-5">
      <h3 class="is-size-5">Scripts</h3>
      <div class="header-controls"></div>
    </header>
    <div class="field scripts-list p-3 pl-5">
      <div class="control has-icons-left has-icons-right mb-3">
        <input @input="onSearchKeyDown" @blur="onSearchInputBlur" :value="searchTerm" placeholder="Script name"
          class="input" type="text" />
        <span class="icon is-small is-left">
          <font-awesome-icon icon="search" />
        </span>
      </div>
      <div>
        <template v-if="selectedScript">
          <sup class="is-block has-text-weight-bold">Selected</sup>
          <p class="mb-1 script-item selected">
            <span :title="selectedScript.name" class="has-text-dark script-name">
                {{ selectedScript.name}}
            </span>
          </p>
        </template>

        <template v-if="Object.keys(unsavedScripts).length > 0">
          <sup class="is-block has-text-weight-bold">Unsaved Changes</sup>
          <p v-for="script in unsavedScripts" class="mb-1 script-item has-unsaved-changes">
            <span :title="script.name" class="has-text-dark script-name">{{ script.name}}</span>
          </p>
        </template>

        <hr v-if="Object.keys(unsavedScripts).length > 0 || selectedScript" class="my-2" />

        <ul>
          <li v-for="script in filteredScripts" :class="{ 'has-unsaved-changes': unsavedScripts[script.id] }" class="mb-1 script-item"
            :key="script.id">
            <a @mousedown="onScriptSelect(script)" @keypress.enter="onScriptSelect(script)" @click.prevent
              :title="script.name" class="has-text-dark" href="#"><span class="script-name">{{ script.name }}</span></a>
          </li>
        </ul>
      </div>
    </div>
  </aside>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

import { Script } from '@/store/script/types';
import { StoreType } from '@/store/types';
import { debounce } from 'lodash';

@Component({
  name: 'ScriptsFilter',
})
export default class ScriptsFilter extends Vue {
  public unsavedScripts: Record<Script['id'], Script> = {};
  public selectedScript: Script = null;
  public searchTerm = '';

  private mounted() {
    this.onSearchKeyDown = debounce(this.onSearchKeyDown, 400);
  }

  public get filteredScripts(): Script[] {
    let scripts: Script[] = [];

    if (this.searchTerm) {
      scripts = scripts.concat(this.$store.getters[`${StoreType.ScriptNameStore}/searchByName`](this.searchTerm));
    } else {
      scripts = scripts.concat(this.$store.state[StoreType.ScriptNameStore].models);
    }

    if (this.selectedScript) {
      scripts = scripts.filter(script => script.id !== this.selectedScript.id);
    }

    return scripts.sort((a, b) => a.name.localeCompare(b.name));
  }

  public onSearchKeyDown(e: KeyboardEvent) {
    this.searchTerm = (e.target as HTMLInputElement).value;
  }

  public async onScriptSelect(script: Script) {
    this.searchTerm = script.name;
    // The scripts in this component are dynamic and might not be in the store yet
    await this.$store.dispatch(`${StoreType.ScriptStore}/fetchModel`, script.id);

    this.selectScript(script);
  }

  private selectScript(script: Script) {
    if (script !== null) {
      this.selectedScript = script;
      this.searchTerm = '';
    }

    this.$emit('script-select', script);
  }

  public onSearchInputBlur() {
    if (this.selectedScript) {
      this.searchTerm = '';
    }
  }
}
</script>

<style lang="scss" scoped>
.scripts-panel {
  border-right: var(--primary-border);
}

header {
  padding-top: 5px;
  height: var(--header-controls-height);
  border-bottom: var(--primary-border);
}

.script-item {
  text-overflow: ellipsis;
  overflow: hidden;
  padding-left: 0.75rem;
}

.script-item a {
  text-overflow: ellipsis;
  width: 100%;
}

.script-name {
  white-space: nowrap;
}

.selected {
  border-radius: 3px;
  border: 1px solid deepskyblue;
}

.has-unsaved-changes {
  font-weight: bold;
}

.has-unsaved-changes::before {
  content: '*';
}
</style>
