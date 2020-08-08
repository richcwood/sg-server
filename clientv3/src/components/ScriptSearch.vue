<template>
  <span class="auto-complete">
    <span style="position: relative;">
      <input :disabled="disabled" class="control input search-input" style="padding-left: 30px;" @focus="onSearchInputFocus" @blur="onSearchInputBlur" @keydown="onSearchKeyDown" v-model="search" placeholder="Script name">
      <font-awesome-icon icon="search" style="position: absolute; left: 20px; top: 10px; color: #dbdbdb;" />
    </span>
    <div class="search-choices" v-if="choices.length > 0">
      <div class="search-choice" v-for="choice in choices" v-bind:key="choice.id" @mousedown="onSearchOnMouseDown(choice)">{{choice.name}}</div>
    </div>
  </span>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { Script } from '@/store/script/types';
import { LinkedModel, StoreType } from '@/store/types';
import { KikiAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import axios from 'axios';

@Component
export default class ScriptSearch extends Vue {

  @Prop() private scriptId!: string;

  @Prop() private disabled!: boolean;

  private search = '';
  private choices: Script[] = [];

  private finishedMounting = false;

  private mounted(){
    this.onSearchKeyDown = _.debounce(this.onSearchKeyDown, 400);
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

  private async onSearchKeyDown(){
    try {
      if(this.search.trim().length > 0){
        const {data: {data}} = await axios.get(`/api/v0/script?filter=${encodeURIComponent('name~='+this.search)}`);
        const scripts = data;
        scripts.sort((scriptA: Script, scriptB: Script) => scriptA.name.localeCompare(scriptB.name));
        if(scripts.length > 8){
          scripts.splice(8);
        }
        
        this.choices = scripts;
      }
    }
    catch(err){
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new KikiAlert(`Error searching scripts: ${err}`, AlertPlacement.WINDOW, AlertCategory.ERROR));
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

    if(this.script && this.script.name !== this.search){
      this.search = this.script.name;
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
  .auto-complete {
    position: relative;
  }

  .search-input {
    margin-left: 10px;
    width: 250px;
  }

  .search-choices {
    position: absolute;
    top: 36px;
    left: 10px;
    right: 0;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    border-color: #dbdbdb;
    border-width: 1px;
    border-style: solid;
    z-index: 99;
  }

  .search-choice {
    background-color: white;
    border-radius: inherit;
    padding-left: 4px;
    font-size: $size-5;
  }

  .search-choice:hover {
    background-color: $white-ter;
    cursor: pointer;
  }

</style>
