<template>
  <div class="main" style="margin-left: 24px; margin-right: 12px;">

    <section class="hero">
      <div class="hero-body">
        <div class="container">
          <h1 class="title">
            Get started by downloading an agent
          </h1>
          <br>
          <h2 class="subtitle" style="margin-left: 10px;">
            To run scripts from saas glue first download and run the appropriate agent. <br><br>
            The agent will securely connect to saas glue once you create an <router-link to="/accessKeys">access key</router-link>. <br><br>
            You'll need to run the agent on every machine where you want to run scripts. <br><br>
            You can monitor your running agents in the <router-link to="/agentMonitor">agents monitor</router-link>. <br>
          </h2>

          <table class="table downloads">
            <tr class="tr">
              <td clas="td padded">
                <a class="link" @click.prevent="downloadAgent('win')">Windows x64</a>
              </td>
              <template v-if="isCreatingAgent('win')">
                <td class="td animation" width="120px;" >
                  <div class="dots left-dot">{{waitAnimationLeft}}</div>
                </td>
                <td class="td animation">
                  creating an agent for Windows x64
                </td>
                <td class="td animation" width="120px;">
                  <span class="dots">{{waitAnimationRight}}</span>
                </td>
              </template>
              <template v-if="getDownload('win').linkText">
                <td class="td" colspan="3">
                  <a @click="onClickedDownloadAgentLink('win')">{{getDownload('win').linkText}}</a>
                </td>
              </template>
            </tr>
            <tr class="tr">
              <td clas="td padded">
                <a class="link" @click.prevent="downloadAgent('linux')">Linux</a>
              </td>
              <template v-if="isCreatingAgent('linux')">
                <td class="td animation" width="120px;" >
                  <div class="dots left-dot">{{waitAnimationLeft}}</div>
                </td>
                <td class="td animation">
                  creating an agent for Linux
                </td>
                <td class="td animation" width="120px;">
                  <span class="dots">{{waitAnimationRight}}</span>
                </td>
              </template>
              <template v-if="getDownload('linux').linkText">
                <td class="td" colspan="3">
                  <a @click="onClickedDownloadAgentLink('linux')">{{getDownload('linux').linkText}}</a>
                </td>
              </template>
            </tr>
            <tr class="tr">
              <td clas="td padded">
                <a class="link" @click.prevent="downloadAgent('macos')">Mac</a>
              </td>
              <template v-if="isCreatingAgent('macos')">
                <td class="td animation" width="120px;" >
                  <div class="dots left-dot">{{waitAnimationLeft}}</div>
                </td>
                <td class="td animation">
                  creating an agent for Mac
                </td>
                <td class="td animation" width="120px;">
                  <span class="dots">{{waitAnimationRight}}</span>
                </td>
              </template>
              <template v-if="getDownload('macos').linkText">
                <td class="td" colspan="3">
                  <a @click="onClickedDownloadAgentLink('macos')">{{getDownload('macos').linkText}}</a>
                </td>
              </template>
            </tr>
          </table>

          <tabs>
            <tab title="Windows Instructions">
              <br><br>

              <div style="font-weight: 700; font-size: 1.25rem;">
                Get an agent access key
              </div>
              To run the agent you’ll need an agent access key. Click <router-link to="/accessKeys">here</router-link> if you don’t already have one. You can install the agent access key by:
              <br><br>          
              <ul>
                <li>
                  Setting environment variables SG_ACCESS_KEY_ID and SG_ACCESS_KEY_SECRET to the agent access key id and secret respectively.
                </li>
                or
                <li>
                  Setting values for SG_ACCESS_KEY_ID and SG_ACCESS_KEY_SECRET in the sg.cfg file, for example:
                  {
                      "ACCESS_KEY_ID": "********",
                      "ACCESS_KEY_SECRET": "********"
                  }
                </li>
              </ul>
              <br>
              <div style="font-weight: 700; font-size: 1.25rem;">
                Download and run the agent
              </div>
              <ul>
                <li>Download the agent using the link above</li>
                <li>Unzip it</li>
                <li>Run sg-agent-launcher.exe by double clicking or run it from the command prompt</li>
                <li>To ensure the agent is always running it's recommended to install it as a Windows Service. There are many ways to do this but NSSM provides a relatively simple solution available at <a href="https://www.nssm.cc/download">https://www.nssm.cc/download</a>.</li>
              </ul>
            </tab>

            <tab title="Linux Instructions">
              <br><br>

              <div style="font-weight: 700; font-size: 1.25rem;">
                Get an agent access key
              </div>
              To run the agent you’ll need an agent access key. Click <router-link to="/accessKeys">here</router-link> if you don’t already have one. You can install the agent access key by:
              <br><br>          
              <ul>
                <li>
                  Setting environment variables SG_ACCESS_KEY_ID and SG_ACCESS_KEY_SECRET to the agent access key id and secret respectively.
                </li>
                or
                <li>
                  Setting values for SG_ACCESS_KEY_ID and SG_ACCESS_KEY_SECRET in the sg.cfg file, for example:
                  {
                      "ACCESS_KEY_ID": "********",
                      "ACCESS_KEY_SECRET": "********"
                  }
                </li>
              </ul>
              <br>
              <div style="font-weight: 700; font-size: 1.25rem;">
                Download and run the agent
              </div>
              <ul>
                <li>Download the agent using the link above</li>
                <li>terminal: gunzip sg-agent-launcher.gz</li>
                <li>terminal: chmod 711 sg-agent-launcher</li>
                <li>terminal: sudo ./sg-agent-launcher</li>
              </ul>
            </tab>
            <tab title="Mac Instructions">
              <br><br>

              <div style="font-weight: 700; font-size: 1.25rem;">
                Get an agent access key
              </div>
              To run the agent you’ll need an agent access key. Click <router-link to="/accessKeys">here</router-link> if you don’t already have one. You can install the agent access key by:
              <br><br>          
              <ul>
                <li>
                  Setting environment variables SG_ACCESS_KEY_ID and SG_ACCESS_KEY_SECRET to the agent access key id and secret respectively.
                </li>
                or
                <li>
                  Setting values for SG_ACCESS_KEY_ID and SG_ACCESS_KEY_SECRET in the sg.cfg file, for example:
                  {
                      "ACCESS_KEY_ID": "********",
                      "ACCESS_KEY_SECRET": "********"
                  }
                </li>
              </ul>
              <br>
              <div style="font-weight: 700; font-size: 1.25rem;">
                Download and run the agent
              </div>
              <ul>
                <li>Download the agent using the link above</li>
                <li>Unzip it - just double click it</li>
                <li>terminal: chmod 711 sg-agent-launcher</li>
                <li>terminal: sudo ./sg-agent-launcher</li>
              </ul>
            </tab>
          </tabs>
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

  private lastDownloadGenerated: Platform|null = null;

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
      'linux': Architecture.x64,
      'macos': Architecture.x64
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
          
          if(getLinkTryCount < 15){
            setTimeout(tryGetLink, 7*1000);
          }
          else {
            return reject(`<br>It's taking longer than usual to create your agent.
                           <br>Please try again in a few minutes.`);
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
      this.downloadLinks[platform].linkText = `download the ${this.Platform_inverted[platform]} agent`;
      this.lastDownloadGenerated = platform;

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`The download link is valid for 5 minutes.`, AlertPlacement.FOOTER, AlertCategory.INFO));
    
      // silly vue-slim-tabs has no easy way to programatically click a tab
      try {
        if(platform === Platform.Windows){
          (<any>document.getElementsByClassName('vue-tab')[0]).click();
        }
        else if( platform === Platform.Linux){
          (<any>document.getElementsByClassName('vue-tab')[1]).click();
        }
        else {
          (<any>document.getElementsByClassName('vue-tab')[2]).click();
        }
      }
      catch(err){ console.log('selecting slim tab failed.', err) } // who care if this fails
      
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

  li {
    margin-left: 8px;
    margin-top: 7px;
    margin-bottom: 7px;
  }

  li:first-letter {
    font-weight: 700;
  }
</style>
