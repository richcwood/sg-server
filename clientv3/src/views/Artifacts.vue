 <template>
  <div class="sg-container-p">

    <!-- Modals -->
    <modal name="upload-modal" :width="1200" :height="900">
      <div class="round-popup" style="margin: 8px; width: 100%; height: 100%;">
        <div>
          Artifacts to upload 
        </div>
        <div>
          <label class="button" style="margin-top: 14px;" for="file_upload">Choose Files</label>
          <input id="file_upload" class="input inputfile" type="file" multiple @change="onInputFilesChanged">
        </div>
        <div>
          <label class="button" style="margin-top: 14px;" for="directory_upload">Choose Directory (all files recursively added)</label>
          <input id="directory_upload" class="input inputfile" type="file" multiple webkitdirectory @change="onInputFilesChanged">
        </div>

        <div style="overflow: scroll; height: 600px;">
          <table class="table" style="margin-top: 12px; margin-left: 8px;">
            <tr class="tr">
              <td class="td">
                Folder
              </td>
              <td class="td">
                File
              </td>
            </tr>
            <tr class="tr" v-for="file in filesToUpload" v-bind:key="file.name">
              <td class="td">
                {{getFolderPath(file)}}
              </td>
              <td class="td">
                {{file.name}}
              </td>
              <td class="td">
                <span v-if="getUploadStatus(file)" :class="{'has-text-success': getUploadStatus(file).includes('completed')}">
                  {{getUploadStatus(file)}}
                </span>
                <a v-else style="margin-left: 12px;" @click="onDeleteFileClicked(file)">delete</a>
              </td>
            </tr>
          </table>
        </div>
        <table class="table" style="margin-top: 12px; margin-left: 8px;">
          <tr class="tr">
            <td class="td">
              Destination Folder<br>
              <input class="input" type="text" placeholder="folderA/folderB" v-model="destinationFolder">
            </td>
            <td class="td" colspan="2"></td>
          </tr>
          <tr class="tr">
            <td class="td">
              <button class="button is-primary" @click="onUploadArtifactsClicked" :disabled="filesToUpload.length === 0">Upload Artifacts</button>
              <button class="button button-spaced" @click="onUploadArtifactsCloseClicked">Close</button> 
            </td>
            <td class="td" colspan="2"></td>
          </tr>
        </table>
      </div>
    </modal>

    <h2 class="is-size-4 subtitle">Shared artifacts for your team</h2>
    <div class="field is-grouped">
      <div class="control has-icons-left">
        <input class="input" type="text" style="width: 200px;" v-model="prefixFilter" placeholder="Filter folders">
        <span class="icon is-small is-left">
          <font-awesome-icon icon="search" />
        </span>
      </div>
      <div class="control has-icons-left">
        <input class="input" type="text" style="width: 200px;" v-model="nameFilter" placeholder="Filter names">
        <span class="icon is-small is-left">
          <font-awesome-icon icon="search" />
        </span>
      </div>
      <div class="control has-icons-left">
        <button class="button is-primary" @click="onUploadArtifactsShowClicked">Upload New Artifacts</button>
      </div>
    </div>

    <table class="table" width="700px">
      <thead>
        <tr>
          <th></th>
          <th>Folder</th>
          <th>Name</th>
        </tr>
      </thead>
      <tr v-if="artifacts.length === 0">
        <td colspan="3">
          There are no artifacts for your team yet.
        </td>
      </tr>
      <tr v-for="artifact in filteredArtifacts" v-bind:key="artifact.id">
        <td>
          <div class="control">
            <div class="checkbox">
              <input type="checkbox" @change="onArtifactChecked($event, artifact)">
            </div>
          </div>
        </td>
        <td>{{artifact.prefix}}</td>
        <td>{{artifact.name}}</td>
        <!-- <td class="td">
          <a @click.prevent="onDownloadArtifactClicked(artifact)">download</a>
        </td> -->
      </tr>
    </table>
    <div class="field">
      <div class="control">
        <button class="button is-danger" @click="onDeleteSelectedArtifacts" :disabled="selectedArtifacts.length === 0">Delete Selected Artifacts</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { BindStoreModel, BindSelected, BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';
import { Artifact } from '@/store/artifact/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { showErrors } from '@/utils/ErrorHandler';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import axios from 'axios';

@Component({
  components: { ValidationProvider, ValidationObserver },
  props: { },
})
export default class Artifacts extends Vue { 
  
  private get defaultStoreType(){
    return StoreType.ArtifactStore;
  }

  @BindStoreModel({selectedModelName: 'models'})
  private artifacts!: Artifact[];

  private prefixFilter = '';
  private nameFilter = '';

  private get filteredArtifacts() : Artifact[] {
    const prefixFilter = this.prefixFilter.trim().toLowerCase();
    const nameFilter = this.nameFilter.trim().toLowerCase();

    return this.artifacts.filter((artifact: Artifact) => {
      if(prefixFilter && artifact.prefix !== undefined && artifact.prefix !== null && artifact.prefix.toLowerCase().indexOf(prefixFilter) === -1){
        return false;
      }
      if(nameFilter && artifact.name.toLowerCase().indexOf(nameFilter) === -1){
        return false;
      }

      return true;
    });
  }

  @BindSelected()
  private selectedArtifact!: Artifact;

  @BindSelectedCopy()
  private selectedArtifactCopy!: Artifact;

  private filesToUpload: any[] = [];
  private fileUploadStatus = {};

  private destinationFolder = '';

  private selectedArtifacts: Artifact[] = [];

  private mounted(){
    // load all artifacts when the component is mounted - they are small objects
    this.$store.dispatch(`${StoreType.ArtifactStore}/fetchModelsByFilter`);
  }

  private onUploadArtifactsShowClicked(){
    this.filesToUpload = [];
    this.$modal.show('upload-modal');
  }

  private onUploadArtifactsCloseClicked(){
    this.$modal.hide('upload-modal');
  }

  private onInputFilesChanged($event: any){
    for(let file of $event.target.files){
      this.filesToUpload.push(file);
      console.log(file);
    }
  }

  // upload each file individually so if one fails they don't all fail
  private onUploadArtifactsClicked(){
    // for-of with async is the devil
    for(let count = 0; count < this.filesToUpload.length; count++){
      this.uploadFile(this.filesToUpload[count]);
    }
  }

  private async uploadFile(file: any){
    // Vue object key's not reactive by default (Vue 2)
    Vue.set(this.fileUploadStatus, file.name, 'uploading file...');
    
    try {
      // I wonder what the API will do if the name + s3Path already exists
      const artifact = await this.$store.dispatch(`${StoreType.ArtifactStore}/save`, {
        name: file.name,
        prefix: this.getFolderPath(file)
      });

      // Need a raw request here because axios won't allow me to override defaults.
      const s3Request = new XMLHttpRequest();
      s3Request.open('PUT', artifact.url);
      const fileReader = new FileReader();
      fileReader.onload = function(event){
        s3Request.send(event.target.result);
      };
      fileReader.readAsArrayBuffer(file);

      s3Request.onreadystatechange = (e) => {
        Vue.set(this.fileUploadStatus, file.name, 'completed uploading file');
      }
    }
    catch(err){
      Vue.set(this.fileUploadStatus, file.name, 'Failed to upload file');
      // this.fileUploadStatus[file.name] = 'Failed to upload file';
    }
  }

  private getUploadStatus(file: any){
    return this.fileUploadStatus[file.name];
  }

  private onDeleteFileClicked(file: any){
    const fileIndex = this.filesToUpload.findIndex((check: any) => {
      return file.name === check.name;
    });

    if(fileIndex !== -1){
      this.filesToUpload.splice(fileIndex, 1);
    }
  }

  private onArtifactChecked($event: any, artifact: Artifact){
    if($event.target.checked){
      this.selectedArtifacts.push(artifact);
    }
    else {
      const artifactIndex = this.selectedArtifacts.findIndex((check: any) => {
        return artifact.id === check.id;
      });

      if(artifactIndex !== -1){
        this.selectedArtifacts.splice(artifactIndex, 1);
      }
    }
  }
  
  private async onDeleteSelectedArtifacts(){
    const failures = [];

    try {
      const promises = [];  
      // for-of with async is the devil
      // Send all delete requests in parallel
      for(let count = 0; count < this.selectedArtifacts.length; count++){
        const artifact = this.selectedArtifacts[count];
        promises.push(new Promise<void>(async (res, rej) => {
          try {
            await this.$store.dispatch(`${StoreType.ArtifactStore}/delete`, artifact);
            res();
          }
          catch(err){
            failures.push(`Failed to delete artifact ${artifact.name}`);
            rej(err);
          }
        }));
      }

      await Promise.all(promises);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Deleted the artifacts`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Error deleting the artifacts.<br><br> ${failures.join('<br>')}`, AlertPlacement.WINDOW));
    }
    finally {
      this.selectedArtifacts = [];
    }
  }

  private async onDownloadArtifactClicked(artifact: Artifact){
    try {
      const {data: {data}} = await axios.get(`/api/v0/artifact/${artifact.id}`);
      window.open(data.url);
    }
    catch(err){
      console.error(err);
      showErrors('Error downloading the artifact.', err);
    }
  }

  private getFolderPath(file): string {
    let path = '';

    if(this.destinationFolder){
      path += this.destinationFolder;
    }

    if(file.webkitRelativePath){
      path += '/' + file.webkitRelativePath.replace('/'+file.name, '');
    }

    return path;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

  table {
    border-width: 0;
  }

  td {
    border-width: 0 !important;
  }

  .button-spaced {
    margin-left: 12px;
  }

  .validation-error {
    margin-top: 3px;
    margin-bottom: 3px;
    padding-left: 3px;
    padding-right: 3px;
    color: $danger;
  }

  .inputfile {
    /* visibility: hidden etc. wont work */
    width: 0.1px;
    height: 0.1px;
    opacity: 0;
    overflow: hidden;
    position: absolute;
    z-index: -1;
  }
  .inputfile:focus + label {
    /* keyboard navigation */
    outline: 1px dotted #000;
    outline: -webkit-focus-ring-color auto 5px;
  }
  .inputfile + label * {
    pointer-events: none;
  }

</style>
