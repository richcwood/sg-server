<template>
  <div>
    <div>
      <span class="auto-complete">
        <input :disabled="disabled" class="control input search-input" style="padding-left: 30px; width: 600px;" v-model="searchPrefix" placeholder="prefix/to/artifact">
        <font-awesome-icon icon="search" style="position: absolute; left: 20px; top: 10px; color: #dbdbdb;" />
      </span>
    </div>
    <div style="margin-top: 8px;">
      <span class="auto-complete">
        <input :disabled="disabled" class="control input search-input" style="padding-left: 30px; width: 600px;" v-model="searchName" placeholder="Artifact name">
        <font-awesome-icon icon="search" style="position: absolute; left: 20px; top: 10px; color: #dbdbdb;" />
      </span>
    </div>

    <div class="select is-multiple" style="margin-top: 8px; margin-left: 10px;"> 
      <select :multiple="allowMultiple" size="10" style="width: 600px; height: 350px;" v-model="selectedArtifacts">
        <option v-for="result in searchResults" v-bind:key="result.id" :value="result.id">
          {{result.prefix}}{{result.name}}
        </option>
      </select>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { Artifact } from '@/store/artifact/types';
import { LinkedModel, StoreType } from '@/store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import axios from 'axios';

@Component
export default class ArtifactSearch extends Vue {

  @Prop() private disabled!: boolean;
  @Prop({default: true}) private allowMultiple!: boolean;
  
  private searchPrefix = '';
  private searchName = '';
  private searchResults: Artifact[] = [];
  private selectedArtifacts: Artifact[] = [];
  private finishedMounting = false;

  private mounted(){
    this.onSearchChanged = _.debounce(this.onSearchChanged, 400);
  }

  @Watch('searchPrefix')
  @Watch('searchName')
  private async onSearchChanged(){
    try {
      // Perform a search straight to the backend with no cache / store
      const {data: {data}} = await axios.get(`/api/v0/artifact?filter=${encodeURIComponent('prefix~='+this.searchPrefix)},${encodeURIComponent('name~='+this.searchName)}`);
      this.searchResults = data;
    }
    catch(err){
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Error searching artifacts: ${err}`, AlertPlacement.WINDOW, AlertCategory.ERROR));
    }
  }

  @Watch('selectedArtifacts')
  private onSelectedArtifactsChanged(){
    this.$emit('artifactsPicked', this.selectedArtifacts);
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

</style>
