<template>
  <span class="task" :class="{ 'selected': source === selected, 'is-transparent': isTransparent }" @click.stop="$emit('clickedBody')">
    <div class="task-title">{{source.name}}</div>

    <div v-if="taskDesignerMode==='normal'">
      <button class="button task-button" @click.stop="$emit('clickedEditOutboundTasks')">Out bound ({{source.toRoutes.length}})</button>
      <button class="button task-button" @click.stop="$emit('clickedEditInboundTasks')">In bound ({{source.fromRoutes.length}})</button>
      <button class="button task-button" @click.stop="$emit('clickedShowInboundPaths')" :disabled="source.fromRoutes.length === 0">Show paths here</button>
    </div>

    <!-- IN bound routes (manipulating the target.fromRoutes) -->
    <template v-if="taskDesignerMode==='editRoutes_inbound'">
      <div v-if="target === source" class="route">
        {{source.fromRoutes.length}} route{{source.fromRoutes.length > 1 ? 's' : '' }}
      </div>
      
      <div v-else-if="isSourceIllegal()" class="route">
        A route to '{{target.name}}' would create an infite loop
      </div>

      <div v-else>
        <label class="checkbox">
          <input type="checkbox" class="checkbox route-input" v-model="targetInboundEntryForSource_isChecked"/> <span class="route-input"> Route to {{target.name}} </span>
        </label>
        <br>
        <validation-observer ref="editRouteValidationObserver_inbound">
          <validation-provider name="Route" rules="valid-regex" v-slot="{ errors }">
            <input type="text" class="input route-input" :disabled="!targetInboundEntryForSource_isChecked" v-model.lazy="targetInboundEntryForSource_regex"/>
            <div v-if="errors && errors.length > 0" class="message validation-error is-danger"><br>{{ errors[0] }}</div>
          </validation-provider>
        </validation-observer>
      </div>
    </template>

    <!-- OUT bound routes (manipulating the target.toRoutes) -->
    <template v-if="taskDesignerMode==='editRoutes_outbound'">
      <div v-if="target === source" class="route">
        {{source.toRoutes.length}} route{{source.toRoutes.length > 1 ? 's' : '' }}
      </div>
      
      <div v-else-if="isSourceIllegal()" class="route">
        A route to task '{{target.name}}' would add an infite task loop.
      </div>

      <div v-else>
        <label class="checkbox">
          <input type="checkbox" class="checkbox route-input" v-model="targetOutboundEntryForSource_isChecked"/> <span class="route-input"> Route from {{target.name}} </span>
        </label>
        <br>
        <validation-observer ref="editRouteValidationObserver_outbound">
          <validation-provider name="Route" rules="valid-regex" v-slot="{ errors }">
            <input type="text" class="input route-input" :disabled="!targetOutboundEntryForSource_isChecked" v-model.lazy="targetOutboundEntryForSource_regex"/>
            <div v-if="errors && errors.length > 0" class="message validation-error is-danger"><br>{{ errors[0] }}</div>
          </validation-provider>
        </validation-observer>
      </div>
    </template>

    <template v-if="taskDesignerMode==='showRoutes'">
      <div v-if="target === source">
        <span v-if="Object.keys(inboundTaskPaths).length === 0">There are no routes</span>
        <span v-else>Showing routes to here</span>
      </div>
      <div v-else>
        <div v-if="inboundTaskPaths[source.name]">
          <table>
            <tr @mouseover="onRoutePathMouseOver(taskName)" 
              @mouseleave="onRoutePathMouseLeave" 
              :class="{'highlight-path': isPathPartHighlighted(taskName, regex, stepDepth)}"
              v-for="({regex, stepDepth, pathType}, taskName) in inboundTaskPaths[source.name]" v-bind:key="taskName">
              <td>{{taskName}}</td><td>{{regex}}</td><td>({{stepDepth}}) {{pathType === 'outbound' ? '*' : ''}}</td>
            </tr>
          </table>
        </div>
        <div v-else>
          No paths
        </div>
      </div>
    </template>

  </span>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { TaskDef } from '@/store/taskDef/types';
import { StoreType } from '@/store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';

@Component({
  components: {
    ValidationProvider, ValidationObserver
  }
})
export default class DesignerTask extends Vue {

  @Prop() private taskDesignerMode!: string;
  @Prop() private taskDefs!: TaskDef[];
  @Prop() private source!: TaskDef; // this is the task associated with this component
  @Prop() private target!: TaskDef; // the shared target across all designer tasks
  @Prop() private selected!: TaskDef;
  @Prop() private inboundTaskPaths!: any;
  @Prop() private illegalLoopTasks!: TaskDef[];
  @Prop() private inboundHighlightPath!: any;

  private targetInboundRoutesCopy: string[][] = [];
  private targetOutboundRoutesCopy: string[][] = [];


  private mounted(){
    if(this.target){
      this.targetInboundRoutesCopy = this.target.fromRoutes;
      this.targetOutboundRoutesCopy = this.target.toRoutes;
    }
  }

  @Watch('target')
  private onTargetChanged(){
    if(this.target){
      this.targetInboundRoutesCopy = this.target.fromRoutes;
      this.targetOutboundRoutesCopy = this.target.toRoutes;
    }
    else {
      this.targetInboundRoutesCopy = [];
      this.targetOutboundRoutesCopy = [];
    }
  }


  ////////////////////////////////////////////////////////////////////////////////////
  // IN bound properties
  private get targetInboundEntryForSource(){
    return this.targetInboundRoutesCopy.find(arr => arr[0] === this.source.name);
  }

  private get targetInboundEntryForSource_regex(){
    return this.targetInboundEntryForSource && this.targetInboundEntryForSource[1];
  }

  private set targetInboundEntryForSource_regex(val){
    (<any>this.targetInboundEntryForSource)[1] = val;
    this.targetInboundRoutesCopy = _.clone(this.targetInboundRoutesCopy); // arrays in Vue (v2) aren't internally reactive :(
  }

  @Watch('targetInboundEntryForSource_regex')
  private async onTargetInboundEntryForSource_regexChanged(){
    if(    this.target 
        && (<any>this).$refs.editRouteValidationObserver_inbound
        && await (<any>this).$refs.editRouteValidationObserver_inbound.validate()){
      // Save the target fromRoutes property (partial update)
      try {
        // after the await below, if users quickly exit route mode in the main designer, the task will be null
        const updatedTaskName = this.target.name; 
        const updatedTaskDef = {
          id: this.target.id,
          fromRoutes: this.targetInboundRoutesCopy
        };

        await this.$store.dispatch(`${StoreType.TaskDefStore}/save`, updatedTaskDef);
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Updated dependencies for task - ${updatedTaskName}`, AlertPlacement.FOOTER));
      }
      catch(err){
        console.error(err);
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Error updating task: ${err}`, AlertPlacement.WINDOW, AlertCategory.ERROR));
      }
    }
  }

  private get targetInboundEntryForSource_isChecked(): boolean {
    return ! _.isUndefined(this.targetInboundEntryForSource);
  }

  private set targetInboundEntryForSource_isChecked(val: boolean){
    if(val){
      if(!this.targetInboundEntryForSource){
        this.targetInboundRoutesCopy.push([this.source.name, '.*']);
        this.targetInboundRoutesCopy = _.clone(this.targetInboundRoutesCopy); // arrays in Vue (v2) aren't internally reactive :(
      }
    }
    else {
      if(this.targetInboundEntryForSource){
        this.targetInboundRoutesCopy.splice(this.targetInboundRoutesCopy.indexOf(this.targetInboundEntryForSource), 1);
        this.targetInboundRoutesCopy = _.clone(this.targetInboundRoutesCopy); // arrays in Vue (v2) aren't internally reactive :(
      }
    }
  }



  ////////////////////////////////////////////////////////////////////////////////////
  // OUT bound properties
  private get targetOutboundEntryForSource(){
    return this.targetOutboundRoutesCopy.find(arr => arr[0] === this.source.name);
  }

  private get targetOutboundEntryForSource_regex(){
    return this.targetOutboundEntryForSource && this.targetOutboundEntryForSource[1];
  }

  private set targetOutboundEntryForSource_regex(val){
    (<any>this.targetOutboundEntryForSource)[1] = val;
    this.targetOutboundRoutesCopy = _.clone(this.targetOutboundRoutesCopy); // arrays in Vue (v2) aren't internally reactive :(
  }

  @Watch('targetOutboundEntryForSource_regex')
  private async onTargetOutboundEntryForSource_regexChanged(){
    if(    this.target 
        && (<any>this).$refs.editRouteValidationObserver_outbound 
        && await (<any>this).$refs.editRouteValidationObserver_outbound.validate()){
      // Save the target toRoutes property (partial update)
      try {
        // after the await below, if users quickly exit route mode in the main designer, the task will be null
        const updatedTaskName = this.target.name; 

        const updatedTaskDef = {
          id: this.target.id,
          toRoutes: this.targetOutboundRoutesCopy
        };

        await this.$store.dispatch(`${StoreType.TaskDefStore}/save`, updatedTaskDef);
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Updated dependencies for task - ${updatedTaskName}`, AlertPlacement.FOOTER));
      }
      catch(err){
        console.error(err);
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Error updating task: ${err}`, AlertPlacement.WINDOW, AlertCategory.ERROR));
      }
    }
  }

  private get targetOutboundEntryForSource_isChecked(): boolean {
    return ! _.isUndefined(this.targetOutboundEntryForSource);
  }

  private set targetOutboundEntryForSource_isChecked(val: boolean){
    if(val){
      if(!this.targetOutboundEntryForSource){
        this.targetOutboundRoutesCopy.push([this.source.name, '.*']);
        this.targetOutboundRoutesCopy = _.clone(this.targetOutboundRoutesCopy); // arrays in Vue (v2) aren't internally reactive :(
      }
    }
    else {
      if(this.targetOutboundEntryForSource){
        this.targetOutboundRoutesCopy.splice(this.targetOutboundRoutesCopy.indexOf(this.targetOutboundEntryForSource), 1);
        this.targetOutboundRoutesCopy = _.clone(this.targetOutboundRoutesCopy); // arrays in Vue (v2) aren't internally reactive :(
      }
    }
  }


  ////////////////////////////////////////////////////////////////////////////////////
  // IN bound path highlighting
  private get isTransparent(){
    return this.taskDesignerMode === 'showRoutes' && ! this.inboundTaskPaths[this.source.name];
  }

  private onRoutePathMouseOver(targetTaskName: string){
    if(    this.inboundTaskPaths
        && this.inboundTaskPaths[this.source.name]
        && this.inboundTaskPaths[this.source.name][targetTaskName]){
      
      this.$emit('setInboundHighlightPath', this.inboundTaskPaths[this.source.name][targetTaskName].exactPath);
    }
  }

  private onRoutePathMouseLeave(){
    this.$emit('setInboundHighlightPath', null);
  }

  private isSourceIllegal(){
    if(this.illegalLoopTasks){
      return this.illegalLoopTasks.find((taskDef: TaskDef) => {
        return taskDef == this.source;
      });
    }
    else {
      return false;
    }
  }

  // Check if the path part is in the current highlight path
  private isPathPartHighlighted(targetTaskName: string, regex: string, stepDepth: number){
    if(this.inboundHighlightPath){
      return this.inboundHighlightPath.find((pathItem: any) => {
        return    pathItem.sourceTaskName === this.source.name
               && pathItem.targetTaskName === targetTaskName
               && pathItem.regex === regex
               && pathItem.stepDepth === stepDepth   
      });
    }
    else {
      return false;
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
  .task {
    display: inline-block;
    vertical-align: top;
    border-style: solid;
    border-width: 1px;
    border-radius: 5px;
    border-color: lightgray;
    background-color: $white-ter;
    padding-top: 2px;
    padding-bottom: 2px;
    padding-left: 10px;
    padding-right: 10px;
    min-width: 225px;
    max-width: 225px;
    min-height: 175px;
    max-height: 175px;
    margin: 10px;
    overflow-y: auto;
    cursor: pointer;
  }

  .task:hover {
   border-width: 3px; 
  }

  .task-title {
    width: 100%;
    text-align: center;
  }

  .route {
    width: 100%;
    padding-top: 6px;
    text-align: center;
  }

  .task-button {
    width: 100%;
    position: relative;
    margin-bottom: 6px;
    bottom: -15px;
  }

  .selected {
    border-width: 2px;
    border-color: black;
  }

  .route-input {
    margin-top: 6px;
    position: relative;
    bottom: -20px;
  }

  .is-transparent {
    opacity: .5;
  }

  table {
    margin-top: 4px;
  }

  td {
    padding-right: 8px;
  }

  .highlight-path {
    font-weight: bold;
  }
</style>
