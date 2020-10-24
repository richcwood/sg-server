<template>
  <span class="auto-complete">
    <span style="position: relative;">
      <input :disabled="disabled" 
             class="control input search-input" 
             style="padding-left: 30px;" 
             @focus="onSearchInputFocus" 
             @blur="onSearchInputBlur" 
             @keydown="onSearchKeyDown" 
             v-model="search" 
             placeholder="Job name">
      <font-awesome-icon icon="search" style="position: absolute; left: 20px; top: 10px; color: #dbdbdb;" />
    </span>
    <div class="search-choices" v-if="choices.length > 0">
      <div class="search-choice" v-for="choice in choices" v-bind:key="choice.id" @mousedown="onSearchOnMouseDown(choice)">
        {{choice.name}}
      </div>
    </div>
  </span>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { JobDef } from '@/store/jobdef/types';
import { LinkedModel, StoreType } from '@/store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';

@Component
export default class JobDefSearch extends Vue {

  @Prop() private jobDefId!: string;

  @Prop() private disabled!: boolean;

  private finishedMounting = false;

  private search = '';
  private choices: JobDef[] = [];

  private mounted(){
    this.onSearchKeyDown = _.debounce(this.onSearchKeyDown, 400);
    this.onSearchInputBlur();
    this.finishedMounting = true;
  }

  // A reactive map
  private loadedJobDefs = {};

  private get jobDef(): JobDef|null {
    try {
      if(this.jobDefId && this.jobDefId.trim()){
        if(!this.loadedJobDefs[this.jobDefId]){
          Vue.set(this.loadedJobDefs, this.jobDefId, {name: 'loading...'});

          (async () => {
            this.loadedJobDefs[this.jobDefId] = await this.$store.dispatch(`${StoreType.JobDefStore}/fetchModel`, this.jobDefId);
            this.search = this.loadedJobDefs[this.jobDefId].name;
          })();
        }
        else {
          this.search = this.loadedJobDefs[this.jobDefId].name;
        }

        return this.loadedJobDefs[this.jobDefId];
      }
      else {
        return null;
      }
    }
    catch(err){
      console.error('Error in jobDef search finding jobDef by id', this.jobDefId);
      return null;
    }
  }

  private async onSearchKeyDown(keyboardEvent?: KeyboardEvent){
    try {
      if(this.search.trim().length > 0){
        const jobDefs = await this.$store.dispatch(`${StoreType.JobDefStore}/fetchModelsByFilter`, {filter: `name~=${this.search}`});
        jobDefs.sort((jobDefA: JobDef, jobDefB: JobDef) => jobDefA.name.localeCompare(jobDefB.name));
        if(jobDefs.length > 8){
          jobDefs.splice(8);
        }
        
        this.choices = jobDefs;
      }
      else if(keyboardEvent && keyboardEvent.code === 'Enter'){
        this.$emit('jobDefPicked'); // Clear the choice
      }
    }
    catch(err){
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Error searching jobDefs: ${err}`, AlertPlacement.WINDOW, AlertCategory.ERROR));
    }
  }

  private onSearchOnMouseDown(jobDef: JobDef){
    this.choices = [];
    this.search = jobDef.name;
    this.$emit('jobDefPicked', jobDef);
  }

  private onSearchInputFocus(){
    if(!this.search){
      this.onSearchKeyDown(); // Just perform a search to start
    }
  }

  private onSearchInputBlur(){
    this.choices = [];

    if(this.finishedMounting && !this.search){
      this.$emit('jobDefPicked');
    }
    else if(this.jobDef && this.jobDef.name !== this.search){
      this.search = this.jobDef.name;
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

  .activejobDef {
    color: green;
  }
</style>
