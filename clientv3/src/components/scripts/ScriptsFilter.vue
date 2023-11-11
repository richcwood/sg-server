<template>
  <aside class="scripts-panel">
    <header class="pl-5">
      <h3 class="is-size-5">Scripts</h3>
      <div class="header-controls"></div>
    </header>

    <div class="p-3 pb-0">
      <div class="field">
        <div class="control has-icons-left has-icons-right">
          <input v-focus @input="onSearchKeyDown" @blur="onSearchInputBlur" :value="searchTerm" placeholder="Script name"
            class="input" type="text" />
          <span class="icon is-small is-left">
            <font-awesome-icon icon="search" />
          </span>
        </div>
      </div>

      <template v-if="selectedScript">
        <div>
          <sup class="is-block has-text-weight-bold">Selected</sup>
          <p class="mb-1 pl-2 script-item selected">
            <span :title="selectedScript.name" class="has-text-dark script-name">
              {{ selectedScript.name }}
            </span>
          </p>
        </div>
      </template>

      <template v-if="Object.keys(unsavedScripts).length > 0">
        <div>
          <sup class="is-block has-text-weight-bold">Unsaved Changes</sup>
          <p v-for="script in unsavedScripts" class="mb-1 pl-2 script-item has-unsaved-changes">
            <span :title="script.name" class="has-text-dark script-name">{{ script.name }}</span>
          </p>
        </div>
      </template>

      <hr v-if="Object.keys(unsavedScripts).length > 0 || selectedScript" class="my-2" />
    </div>

    <div class="px-3 pt-0 pb-3 list-wrapper">
      <div v-if="!searchTerm && filteredScripts.length === 0" class="is-flex is-align-items-center is-justify-content-center">
        <span class="spinner"></span>
      </div>
      <ul>
        <li v-for="script in filteredScripts"
          class="mb-1 pl-2 script-item" :key="script.id">
          <a @mousedown="onScriptSelect(script)" @keypress.enter="onScriptSelect(script)" @click.prevent
            :title="script.name" class="has-text-dark" href="#"><span class="script-name">{{ script.name }}</span></a>
        </li>
      </ul>
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
  directives: {
    focus: {
      inserted: (el) => el.focus()
    }
  }
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

    return scripts.sort((a, b) => a.name.localeCompare(b.name));
  }

  public onSearchKeyDown(e: KeyboardEvent) {
    this.searchTerm = (e.target as HTMLInputElement).value;
  }

  public async onScriptSelect(script: Script) {
    // The scripts in this component are dynamic and might not be in the store yet
    await this.$store.dispatch(`${StoreType.ScriptStore}/fetchModel`, script.id);

    this.selectScript(script);
  }

  private selectScript(script: Script) {
    if (script !== null) {
      this.selectedScript = script;
    }

    this.$emit('script-select', script.id);
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

  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 41px min-content 1fr;
  overflow: hidden;
}

.list-wrapper {
  overflow: auto;
}

header {
  padding-top: 5px;
  height: var(--header-controls-height);
  border-bottom: var(--primary-border);
}

.script-item {
  text-overflow: ellipsis;
  overflow: hidden;
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

.spinner {
  @include loader;
}
</style>
