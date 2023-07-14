<template>
  <div>
    <header>
      <h3 class="is-size-5">Scripts</h3>
      <div class="header-controls"></div>
    </header>
    <div class="field">
      <p class="control has-icons-left has-icons-right">
        <input class="input" type="text" placeholder="Script name">
        <span class="icon is-small is-left">
          <font-awesome-icon icon="search" />
        </span>
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch, Prop } from 'vue-property-decorator';

import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { Script } from '@/store/script/types';
import { StoreType } from '@/store/types';
import { debounce } from 'lodash';

@Component({
  name: 'ScriptsFilter',
})
export default class ScriptsFilter extends Vue {
  @Prop() private scriptId!: string;

  @Prop() private disabled!: boolean;

  @Prop({default: '250px'}) private width!: string;

  private search = '';
  private choices: Script[] = [];

  private finishedMounting = false;

  private mounted(){
    this.onSearchKeyDown = debounce(this.onSearchKeyDown, 400);
    this.onSearchInputBlur();
    this.finishedMounting = true;
  }

  @Watch('scriptId')
  private async onScriptIdChanged(){
    if(!this.scriptId){
      this.search = '';
    }
    else {
      const script = await this.$store.dispatch(`${StoreType.ScriptStore}/fetchModel`, this.scriptId);
      this.search = script.name;
    }
  }

  // A reactive map
  private loadedScripts = {};

  private get script(): Script|null {
    try {
      if(this.scriptId && this.scriptId.trim()){
        if(!this.loadedScripts[this.scriptId]){
          Vue.set(this.loadedScripts, this.scriptId, {name: 'loading...'});

          (async () => {
            this.loadedScripts[this.scriptId] = await this.$store.dispatch(`${StoreType.ScriptStore}/fetchModel`, this.scriptId);
            this.search = this.loadedScripts[this.scriptId].name;
          })();
        }

        return this.loadedScripts[this.scriptId];
      }
      else {
        return null;
      }
    }
    catch(err){
      console.error('Error in script search finding script by id', this.scriptId);
      return null;
    }
  }

  private async onSearchKeyDown(keyboardEvent?: KeyboardEvent){
    try {
      if(this.search.trim().length > 0){
        
        // ScriptNames are a subset of scripts and are the same names and ids
        // so you can just use them as scripts in this component
        const scripts = this.$store.getters[`${StoreType.ScriptNameStore}/searchByName`](this.search);

        scripts.sort((scriptA: Script, scriptB: Script) => scriptA.name.localeCompare(scriptB.name));
        if(scripts.length > 8){
          scripts.splice(8);
        }
        
        this.choices = scripts;
      }
      else if(keyboardEvent && keyboardEvent.code === 'Enter'){
        this.$emit('scriptPicked'); // Clear the choice
      }
    }
    catch(err){
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Error searching scripts: ${err}`, AlertPlacement.WINDOW, AlertCategory.ERROR));
    }
  }

  private async onSearchOnMouseDown(script: Script){
    this.choices = [];
    this.search = script.name;
    // The scripts in this component are dynamic and might not be in the store yet
    const scriptInStore = await this.$store.dispatch(`${StoreType.ScriptStore}/fetchModel`, script.id);
    this.$emit('scriptPicked', scriptInStore);
  }

  private onSearchInputFocus(){
    if(!this.search){
      this.onSearchKeyDown(); // Just perform a search to start
    }
  }

  private onSearchInputBlur(){
    this.choices = [];

    if(this.finishedMounting && !this.search){
      this.$emit('scriptPicked');
    }
    else if(this.script && this.script.name !== this.search){
      this.search = this.script.name;
    }
  }
}
</script>

<style lang="scss" scoped></style>
