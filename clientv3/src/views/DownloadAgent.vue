<template>
    <div class="main">
        <section class="sg-container-p">
            <h1 class="title">
                Download a secure agent to be able to run SaasGlue scripts
                <span class="tag is-primary is-medium">~1 Minute</span>
            </h1>

            <div class="tabs">
                <ul>
                    <li
                        :class="{ 'is-active': activeTab == OperatingSystem.WINDOWS }"
                        @click="activeTab = OperatingSystem.WINDOWS"
                    >
                        <a>Windows</a>
                    </li>
                    <li
                        :class="{ 'is-active': activeTab == OperatingSystem.LINUX }"
                        @click="activeTab = OperatingSystem.LINUX"
                    >
                        <a>Linux</a>
                    </li>
                    <li
                        :class="{ 'is-active': activeTab == OperatingSystem.MAC }"
                        @click="activeTab = OperatingSystem.MAC"
                    >
                        <a>Mac</a>
                    </li>
                </ul>
            </div>

            <div class="content">
                <a
                    v-if="activeTab === OperatingSystem.WINDOWS"
                    class="button is-primary"
                    href="https://sg-agent-installer.s3.us-east-2.amazonaws.com/sg-agent-installer-win-x64.zip"
                >
                    <span class="icon">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Windows_logo_-_2012_derivative.svg/25px-Windows_logo_-_2012_derivative.svg.png"
                        />
                    </span>
                    <span>Download Windows x64</span>
                </a>
                <a
                    v-else-if="activeTab === OperatingSystem.LINUX"
                    class="button is-primary"
                    href="https://sg-agent-installer.s3.us-east-2.amazonaws.com/sg-agent-installer-linux.gz"
                >
                    <span class="icon mr-3">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/a/ab/Linux_Logo_in_Linux_Libertine_Font.svg"
                        />
                    </span>
                    <span>Download Linux</span>
                </a>
                <a
                    v-else-if="activeTab === OperatingSystem.MAC"
                    class="button is-primary"
                    href="https://sg-agent-installer.s3.us-east-2.amazonaws.com/sg-agent-installer-mac.gz"
                >
                    <span class="icon mr-3">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" />
                    </span>
                    <span>Download Mac</span>
                </a>

                <div class="my-5">
                    <h2 class="mb-3 has-text-weight-semibold is-size-4-desktop is-size-5-touch">
                        Unzip the agent installer
                    </h2>
                    <p v-if="activeTab === OperatingSystem.WINDOWS">Unzip the agent installer file.</p>
                    <div v-else-if="activeTab === OperatingSystem.LINUX">
                        <p>Unzip the installer zip file and make the agent installer executable.</p>
                        <code class="p-4 my-4 code-snippet">
                            $ gunzip sg-agent-installer-linux.gz
                            <br />
                            $ chmod 711 sg-agent-installer-linux
                        </code>
                    </div>
                    <div v-else-if="activeTab === OperatingSystem.MAC">
                        <p>Unzip the installer zip file and make the agent installer executable.</p>
                        <code class="p-4 my-4 code-snippet">
                            $ gunzip sg-agent-installer-mac.gz
                            <br />
                            $ chmod 711 sg-agent-installer-mac
                        </code>
                    </div>
                </div>

                <div class="my-5">
                    <h2 class="mb-3 has-text-weight-semibold is-size-4-desktop is-size-5-touch">Agent security key</h2>

                    <div class="is-flex is-align-items-center">
                        <button class="button is-primary" @click="onCreateSecureKey">Create Secure Key</button>
                        <span class="ml-3"
                            >Or click <router-link to="/accessKeys">here</router-link> if you already have one.</span
                        >
                    </div>
                    <div v-if="accessKeyCreated" class="notification is-success my-4">
                        <button class="delete" @click="accessKeyCreated = false"></button>
                        Key and secret created. Please, save them in a safe place. Key and Secret will be lost once
                        browser session is closed.
                    </div>
                </div>

                <div>
                    <h2 class="mb-3 has-text-weight-semibold is-size-4-desktop is-size-5-touch">
                        Execute the agent installer to download the agent launcher
                    </h2>
                    <p>
                        Run this command where you downloaded the agent installer. The command will download a fresh
                        version of the agent and set up your security keys.
                    </p>
                    <div>
                        <code v-if="activeTab === OperatingSystem.WINDOWS" class="p-4 my-4 code-snippet">
                            > sg-agent-installer-win-x64.exe -c install -i <span v-html="agentAccessKey"></span> -s
                            <span v-html="agentAccessSecret"></span>
                        </code>
                        <code v-else-if="activeTab == OperatingSystem.MAC" class="p-4 my-4 code-snippet">
                            $ sudo ./sg-agent-installer-mac -c download -i <span v-html="agentAccessKey"></span> -s
                            <span v-html="agentAccessSecret"></span>
                        </code>
                        <code
                            v-else-if="activeTab == OperatingSystem.LINUX"
                            class="p-4 my-4 code-snippet"
                        >
                            $ sudo ./sg-agent-installer-linux -c install -i <span v-html="agentAccessKey"></span> -s
                            <span v-html="agentAccessSecret"></span>
                        </code>
                    </div>
                </div>

                <div>
                    <h2 class="mb-3 has-text-weight-semibold is-size-4-desktop is-size-5-touch">
                        Start the agent service
                    </h2>
                    <code v-if="activeTab === OperatingSystem.WINDOWS" class="p-4 my-4 code-snippet">
                        > sg-agent-installer-win-x64.exe -c start
                    </code>
                    <code v-else-if="activeTab === OperatingSystem.LINUX" class="p-4 my-4 code-snippet">
                        $ sudo ./sg-agent-installer-linux -c start
                    </code>
                    <code v-else-if="activeTab === OperatingSystem.MAC" class="p-4 my-4 code-snippet">
                        $ sudo ./sg-agent-installer-mac -c start
                    </code>
                    <p>
                        If everything worked correctly, you should <router-link to="/agentMonitor">see</router-link> your new agent reporting for duty.
                    </p>
                </div>

                <div style="margin-top: 500px">
                    <h2 class="mb-3 has-text-weight-semibold is-size-4-desktop is-size-5-touch">
                        Advanced instructions for agents
                    </h2>
                </div>

                <div>
                    <h2 class="mb-3 has-text-weight-semibold is-size-4-desktop is-size-5-touch">
                        Stop the agent service
                    </h2>
                    <div v-if="activeTab === OperatingSystem.WINDOWS">
                        <code class="p-4 my-4 code-snippet"> > sg-agent-installer-win-x64.exe -c stop </code>
                    </div>
                    <div v-else-if="activeTab === OperatingSystem.LINUX">
                        <code class="p-4 my-4 code-snippet"> $ sudo ./sg-agent-installer-linux -c stop </code>
                    </div>
                    <div v-else-if="activeTab === OperatingSystem.MAC">
                        <code class="p-4 my-4 code-snippet"> $ sudo ./sg-agent-installer-mac -c stop </code>
                    </div>
                </div>

                <div>
                    <h2 class="mb-3 has-text-weight-semibold is-size-4-desktop is-size-5-touch">
                        Uninstall the agent service
                    </h2>
                    <div v-if="activeTab === OperatingSystem.WINDOWS">
                        <code class="p-4 my-4 code-snippet"> > sg-agent-installer-win-x64.exe -c uninstall </code>
                    </div>
                    <div v-else-if="activeTab === OperatingSystem.LINUX">
                        <code class="p-4 my-4 code-snippet"> $ sudo ./sg-agent-installer-linux -c uninstall </code>
                    </div>
                    <div v-else-if="activeTab === OperatingSystem.MAC">
                        <code class="p-4 my-4 code-snippet"> $ sudo ./sg-agent-installer-mac -c uninstall </code>
                    </div>
                </div>
            </div>

            <div class="is-size-5-desktop is-size-6-touch">
                <h2 class="mb-3 has-text-weight-semibold is-size-4-desktop is-size-5-touch">Configuration file</h2>
                <p>
                    The SaaSGlue Agent uses Oauth2 to maintain a secure connection to the SaaSGlue API. The agent access
                    key id and secret are stored in a config file. On startup, the agent looks for the config file in
                    the following locations (in order):
                </p>
                <div class="content">
                    <ol>
                        <li class="ml-6">The directory where the agent launcher is located</li>
                        <li class="ml-6 mt-3">An operating system specific location (Linux & Mac)</li>
                        <ul class="mt-3">
                            <li class="ml-6">Linux: /etc/saasglue/sg.cfg</li>
                            <li class="ml-6">Mac: /home/[current user]/.saasglue/sg.cfg</li>
                        </ul>
                    </ol>
                </div>

                <h2 class="subtitle">The config file is formatted as follows:</h2>

                <pre>
{
  "SG_ACCESS_KEY_ID": "********",
  "SG_ACCESS_KEY_SECRET": "********",
  "tags": {
      "key": "value"
  }
}</pre
                >
            </div>

            <!-- <br><br>
      <div class="container">
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
                Creating a config file named sg.cfg in the same directory where the SaaSGlue agent is located.
              </li>
              <li>
                Setting values for SG_ACCESS_KEY_ID and SG_ACCESS_KEY_SECRET in the config file, for example:
              </li>           
<pre>{
  "SG_ACCESS_KEY_ID": "********",
  "SG_ACCESS_KEY_SECRET": "********"
}</pre>
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
                Creating a config file named sg.cfg in the same directory where the SaaSGlue agent is located.
              </li>
              <li>
                Setting values for SG_ACCESS_KEY_ID and SG_ACCESS_KEY_SECRET in the config file, for example:
              </li>           
<pre>{
  "SG_ACCESS_KEY_ID": "********",
  "SG_ACCESS_KEY_SECRET": "********"
}</pre>
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
                Creating a config file named sg.cfg in the same directory where the SaaSGlue agent is located.
              </li>
              <li>
                Setting values for SG_ACCESS_KEY_ID and SG_ACCESS_KEY_SECRET in the config file, for example:
              </li>           
<pre>{
  "SG_ACCESS_KEY_ID": "********",
  "SG_ACCESS_KEY_SECRET": "********"
}</pre>
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
      </div> -->
        </section>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { Tabs, Tab } from 'vue-slim-tabs';
import _ from 'lodash';

import CreateAccessKeyModal from '@/components/CreateAccessKeyModal.vue';

enum OperatingSystem {
    WINDOWS = 1,
    LINUX,
    MAC,
}

@Component({
    components: { Tabs, Tab, CreateAccessKeyModal },
    name: 'DownloadAgent',
})
export default class DownloadAgent extends Vue {
    public activeTab: OperatingSystem = OperatingSystem.WINDOWS;
    public agentAccessSecret: string = 'SG_ACCESS_KEY_SECRET';
    public agentAccessKey: string = 'SG_ACCESS_KEY_ID';
    public accessKeyCreated: boolean = false;
    public OperatingSystem = OperatingSystem;

    public created(): void {
        this.detectOs();
        this.readAgentAccessKey();
    }

    public detectOs(): void {
        if (navigator.userAgent.includes('Win')) {
            this.activeTab = OperatingSystem.WINDOWS;
        } else if (navigator.userAgent.includes('Mac')) {
            this.activeTab = OperatingSystem.MAC;
        } else if (navigator.userAgent.includes('Linux')) {
            this.activeTab = OperatingSystem.LINUX;
        }
    }

    public readAgentAccessKey(): void {
        if (sessionStorage.getItem('installAgentAccessKey')) {
            const agent = JSON.parse(sessionStorage.getItem('installAgentAccessKey'));

            this.agentAccessSecret = agent.accessSecret;
            this.agentAccessKey = agent.accessKey;
        }
    }

    public onCreateSecureKey(): void {
        this.$modal.show(
            CreateAccessKeyModal,
            {},
            {
                width: 600,
                height: 'auto',
            },
            {
                'accessKey:created': (res) => {
                    this.onAccessKeyCreated(res);
                },
            }
        );
    }

    public onAccessKeyCreated(res: { accessSecret: string; accessKey: string }): void {
        sessionStorage.setItem(
            'installAgentAccessKey',
            JSON.stringify({
                accessSecret: res.accessSecret,
                accessKey: res.accessKey,
            })
        );
        this.readAgentAccessKey();

        this.accessKeyCreated = true;
    }
}
</script>

<style scoped lang="scss">
.code-snippet {
    display: block;
    white-space: nowrap;
    border-radius: 5px;
    color: white;
    overflow: auto;
    background: var(--code-background-color);
}

.download-section .button {
    width: 100%;
    max-width: 350px;
    height: auto;
}

.subtitle {
    line-height: 26px;
}
</style>
