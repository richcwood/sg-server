<template>
  <div class="main" style="margin-left: 24px; margin-right: 12px;">

    <section class="hero">
      <div class="hero-body">
        <div class="container">
          <h1 class="title">
            Get started by downloading an agent
          </h1>
          <h2 class="subtitle" style="margin-left: 10px;">
            Saas glue depends on running an agent inside of your environment.  <br>
            Agents can run whatever scripts you'd like. <br>
            Monitor the agents in the Agents tab.
          </h2>

          <table class="table downloads">
            <tr class="tr" v-for="platform in ExposedPlatforms" v-bind:key="platform">
              <td class="td padded">
                <select class="select" v-model="selectedArchitecture[platform]">
                  <option class="option" v-for="architecture in ExposedArchitectures" v-bind:key="architecture" :value="architecture" >{{architecture}}</option>
                </select>
              </td>
              <td clas="td padded">
                <a class="link" @click.prevent="downloadAgent(platform)">{{Platform_inverted[platform]}}</a>
              </td>
              <template v-if="isCreatingAgent(platform)">
                <td class="td animation" width="120px;" >
                  <div class="dots left-dot">{{waitAnimationLeft}}</div>
                </td>
                <td class="td animation">
                  creating an agent
                </td>
                <td class="td animation" width="120px;">
                  <span class="dots">{{waitAnimationRight}}</span>
                </td>
              </template>
              <template v-if="getDownload(platform).linkText">
                <td class="td" colspan="3">
                  <a @click="onClickedDownloadAgentLink(platform)">{{getDownload(platform).linkText}}</a>
                </td>
              </template>
            </tr>
          </table>

          <table class="table">
            <tr class="tr">
              <td class="td" v-show="getDownload(Platform.Mac).linkText">
                <b>{{Platform_inverted[Platform.Mac]}} instructions:</b> <br>
                <ul>
                  <li>Download the agent</li>
                  <li>Unzip it - just double click it</li>
                  <li>terminal: chmod 711 file_name</li>
                  <li>terminal: sudo ./file_name</li>
                </ul>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </section>
    
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { BindStoreModel } from '@/decorator';
import { StoreType } from '@/store/types';
import { Agent, Architecture, Platform, Platform_inverted } from '../store/agent/types';
import VueSplit from 'vue-split-panel';
import { Tabs, Tab } from 'vue-slim-tabs';
import axios from 'axios';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { showErrors } from '@/utils/ErrorHandler';
import { momentToStringV1 } from '@/utils/DateTime';
import _ from 'lodash';
import moment from 'moment';

enum UpdateTagType {
  ADD, DELETE
};

@Component({
  components: { Tabs, Tab },
  props: { },
})
export default class DownloadAgent extends Vue {
  // Expose to template
  private readonly momentToStringV1 = momentToStringV1;
  private readonly Platform = Platform;
  private readonly Platform_inverted = Platform_inverted;
  private get ExposedPlatforms(){
    return {'Windows': 'win', 'Linux': 'linux', 'Mac': 'macos'}
  } 

  private readonly Architecture = Architecture;
  private get ExposedArchitectures(){
    return {'x64': 'x64'};
  } 

  private readonly selectedArchitecture: {[platform: string]: Architecture} = {};

  private creatingAgentForPlatform = null;
  private waitAnimationLeft = '';
  private waitAnimationRight = '';

  // Have to generate all of this stuff up front to be reactive
  private readonly downloadLinks: {
    [platform: string]: {link: string, linkText: string, expireLinkTimer?: any}} = 
  {
    [this.Platform.Windows]: {link: '', linkText: ''},
    [this.Platform.Linux]: {link: '', linkText: ''},
    [this.Platform.Mac]: {link: '', linkText: ''}
  };

  private mounted(){
    // Vue 2 isn't reactive so I need to do this
    Vue.set(this, 'selectedArchitecture', {
      'win': Architecture.x64,
      'linux': Architecture.empty,
      'macos': Architecture.empty
    });
  }

  private isCreatingAgent(platform: Platform): boolean {
    return this.creatingAgentForPlatform === platform;
  }

  private getDownload(platform: Platform): any {
    return this.downloadLinks[platform];
  }

  private async downloadAgent(platform: Platform){
    const leftAnimationEmptySpace = '            ';
    this.creatingAgentForPlatform = platform;
    this.waitAnimationLeft = this.waitAnimationRight = '';
    if(this.downloadLinks[platform] && this.downloadLinks[platform].expireLinkTimer){
      clearTimeout(this.downloadLinks[platform].expireLinkTimer);
    }
    this.downloadLinks[platform].link = null;
    this.downloadLinks[platform].linkText = '';
    this.downloadLinks[platform].expireLinkTimer = null;

    const animationTimer = setInterval(() => {
      this.waitAnimationRight += '.';
      this.waitAnimationLeft = leftAnimationEmptySpace.substring(this.waitAnimationRight.length) + this.waitAnimationRight;
      
      if(this.waitAnimationRight.length > leftAnimationEmptySpace.length){
        this.waitAnimationLeft = this.waitAnimationRight = '';
      }
    }, 250);

    const architecture = this.selectedArchitecture[platform];

    this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Creating a download package for ${platform}/${architecture}`, AlertPlacement.FOOTER, AlertCategory.INFO, 10000));

    const getLinkPromise = new Promise((resolve: any, reject: any) => {
      let getLinkTryCount = 0;
      const tryGetLink = async () => {
          getLinkTryCount++;
          let response;

          try {
            response = await axios.get(`/api/v0/agentDownload/agentstub/${platform}/${architecture}`, {timeout: 3000});
            return resolve(response.data.data);
          }
          catch(err){
            console.log('still waiting for link', err);
          }
          
          if(getLinkTryCount < 10){
            setTimeout(tryGetLink, 7*1000);
          }
          else {
            return reject('Timed out waiting for the agent to be built.');
          }
      };

      tryGetLink();
    });

    try {
      const downloadUrl:string = <string> await getLinkPromise;
      
      clearInterval(animationTimer);
      this.creatingAgentForPlatform = null;
      
      const expireLinkTimer = setTimeout(() => {
        this.downloadLinks[platform].link = null;
        this.downloadLinks[platform].linkText = 'Please regenerate expired link. (faster 2nd time)';
        this.downloadLinks[platform].expireLinkTimer = null;
      }, (9*60*1000) + (50*1000)); // 9 minutes, 50 seconds

      this.downloadLinks[platform].expireLinkTimer = expireLinkTimer;
      this.downloadLinks[platform].link = downloadUrl;
      this.downloadLinks[platform].linkText = 'download the agent';

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`The download link is valid for 5 minutes.`, AlertPlacement.FOOTER, AlertCategory.INFO));
    }
    catch(err){
      this.creatingAgentForPlatform = null;
      clearInterval(animationTimer);
      this.waitAnimationLeft = this.waitAnimationRight = '';

      console.error('Error', err);
      showErrors(`Error creating an agent for ${platform}/${architecture}`, err);
    }
  }

  private onClickedDownloadAgentLink(platform){
    try {
      if(this.getDownload(platform).link){
        window.open(this.getDownload(platform).link);
      }
    }
    catch(err){
      console.error('Error', err);
      showErrors(`Error downloading the agent`, err);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

  .downloads {
    border-width: 0;

    .padded {
      padding-left: 5px;
      padding-right: 5px;
    }

    td  {
      font-size: 28px;
      border-width: 0 !important;

      select {
        margin-top: 7px;
      }
    }

    .animation {
     padding-left: 0;
     padding-right: 0;   
    }

    .dots {
      font-weight: 700;
      padding-left: 0;
      padding-right: 0;
      margin-left: 10px;
    }

    .left-dot {
      margin-right: 8px;
      -webkit-transform:rotateY(180deg);
      -moz-transform:rotateY(180deg);
      -o-transform:rotateY(180deg);
      -ms-transform:rotateY(180deg);
    }
  }
</style>
