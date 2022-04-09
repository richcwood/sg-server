<template>
  <div class="main">

    <section class="sg-container py-5 has-background-deepskyblue">
      <div class="columns">
        <div class="column">
            <h2 class="has-text-white is-size-1-desktop is-size-3-touch has-text-weight-bold">SaaSGlue Agent Installation</h2><br>
        </div>
        <div class="column">
            <h3 class="is-size-3-desktop has-text-white is-size-6-touch">Run scripts on all your devices.</h3>
            <h3 class="is-size-3-desktop has-text-white is-size-6-touch">Available for <b>Windows</b>, <b>Linux</b>, and <b>Mac.</b></h3>
        </div>
      </div>
    </section>

    <section class="sg-container py-6">
      <div class="columns mb-5 has-text-white has-text-weight-bold download-section">
        <div class="column">
          <a class="button is-primary py-4 icon-text has-button-shadow" href="https://sg-agent-installer.s3.us-east-2.amazonaws.com/sg-agent-installer-win-x64.zip">
            <span class="icon mr-3">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Windows_logo_-_2012_derivative.svg/25px-Windows_logo_-_2012_derivative.svg.png">
            </span>
            <span class="is-size-4 is-size-5-touch">Download Windows x64</span>
          </a>
        </div>
        <div class="column">
          <a class="button is-primary py-4 icon-text has-button-shadow" href="https://sg-agent-installer.s3.us-east-2.amazonaws.com/sg-agent-installer-linux.gz">
            <span class="icon mr-3">
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/ab/Linux_Logo_in_Linux_Libertine_Font.svg">
            </span>
            <span class="is-size-4 is-size-5-touch">Download Linux</span>
          </a>
        </div>
        <div class="column">
          <a class="button is-primary py-4 icon-text has-button-shadow" href="https://sg-agent-installer.s3.us-east-2.amazonaws.com/sg-agent-installer-mac.gz">
            <span class="icon mr-3">
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" />
            </span>
            <span class="is-size-4 is-size-5-touch">Download Mac</span>
          </a>
        </div>
      </div>

      <div class="is-size-5-desktop is-size-6-touch">
        <h2 class="subtitle">
          SaaSGlue executes your scripts on your devices via the SaaSGlue Agent, a lightweight application that you can install on your Windows, Linux & Mac devices. The SaaSGlue Agent Installer is a command line tool to install the agent.<br><br>
          Before installing the agent you’ll need an agent access key. Click <router-link to="/accessKeys">here</router-link> if you don’t already have one.
        </h2>
        <div class="is-divider"></div>
        <div class="mt-4">
          <h2 class="has-text-weight-semibold is-size-4-desktop is-size-5-touch mb-4">Usage</h2>
          <h2 class="subtitle">
            First <a href="#unzip_agent_instructions">unzip the agent installer download.</a><br><br>
            Use the agent installer to run the agent:
          </h2>
          <div class="content">
            <ul>
              <li class="ml-6"><a href="#install_agent_as_service">Install the agent as a service</a></li>
              <div class="ml-6 my-3">- or -</div>
              <li class="ml-6"><a href="#run_agent_command_line">Run the agent from the command line</a></li>
            </ul>
          </div>
          <h2 class="subtitle">
            If you installed the agent as a service, you can also use the agent installer to:
          </h2>
          <div class="content">
            <ul>
              <li class="ml-6"><a href="#stop_agent_service">Stop the agent service</a></li>
              <li class="ml-6"><a href="#start_agent_service">Start the agent service</a></li>
              <li class="ml-6"><a href="#uninstall_agent_service">Uninstall the agent service</a></li>
            </ul>
          </div>
        </div>
        <div class="is-divider"></div>
        <h2 class="has-text-weight-semibold is-size-4-desktop is-size-5-touch" id="unzip_agent_instructions">Unzip the agent installer</h2>
        <div class="tabs mt-4 ml-4 is-size-5-desktop is-size-6-touch">
          <ul>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'WinInstallAsService' }" @click="tabSelInstallAsService = 'WinInstallAsService'"><a>Windows</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'LinuxInstallAsService' }" @click="tabSelInstallAsService = 'LinuxInstallAsService'"><a>Linux</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'MacInstallAsService' }" @click="tabSelInstallAsService = 'MacInstallAsService'"><a>Mac</a></li>
          </ul>
        </div>

        <div class="container ml-4 is-size-5-desktop is-size-6-touch">
          <div v-show="tabSelInstallAsService == 'WinInstallAsService'">
            <ul><li>Right click the installer zip file, then click Extract All</li></ul>
            <img class="ml-5 mt-3 box" src="agent_installer_unzip_1.png" width="720px" height="auto">
            <ul><li>Choose the destination location and click Extract</li></ul>
            <img class="ml-5 mt-3 box" src="agent_installer_unzip_2.png" width="720px" height="auto">
          </div>
          <div v-show="tabSelInstallAsService == 'LinuxInstallAsService'">
            <h2 class="subtitle mb-5">Unzip the installer zip file and make the agent installer executable.</h2>
            <code class="p-5 ml-5 has-text-black code-snippet">
$ gunzip sg-agent-installer-linux.gz
<br><br>
$ chmod 711 sg-agent-installer-linux
            </code>
          </div>
          <div v-show="tabSelInstallAsService == 'MacInstallAsService'">
            <h2 class="subtitle mb-5">Unzip the installer zip file and make the agent installer executable.</h2>
            <code class="p-5 ml-5 has-text-black code-snippet">
$ gunzip sg-agent-installer-mac.gz
            <br><br>
$ chmod 711 sg-agent-installer-mac
            </code>
          </div>
        </div>

        <br>

        <div class="is-divider"></div>
        <h2 class="has-text-weight-semibold is-size-4-desktop is-size-5-touch" id="install_agent_as_service">Install the agent as a service</h2>
        <div class="tabs mt-4 ml-4 is-size-5-desktop is-size-6-touch">
          <ul>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'WinInstallAsService' }" @click="tabSelInstallAsService = 'WinInstallAsService'"><a>Windows</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'LinuxInstallAsService' }" @click="tabSelInstallAsService = 'LinuxInstallAsService'"><a>Linux</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'MacInstallAsService' }" @click="tabSelInstallAsService = 'MacInstallAsService'"><a>Mac</a></li>
          </ul>
        </div>

        <div class="container ml-4 is-size-5-desktop is-size-6-touch">
          <div v-show="tabSelInstallAsService == 'WinInstallAsService'">
            <h2 class="has-text-weight-normal">The best way to install the agent is as a Windows service. You can do this with either of these methods.</h2>
            <div class="content mb-5">
              <ul>
                <li>Double click the installer</li>
                <li>Run the installer from the command line</li>
              </ul>
            </div>
            <code class="p-5 ml-5 has-text-black code-snippet">
> sg-agent-win-installer.exe -c install -i [agent access key id] -s [agent access secret] -t [tags]
            </code>
            <p class="subtitle has-text-weight-normal ml-5 mt-5">The agent uses an access key id/secret pair to make a secure connection to the SaaSGlue API. The credentials are saved in a <a href="#config_file">config</a> file. The config file is saved in the same folder as the installer.<br><br>The command line parameters are optional. If you include them, the config file will be created automatically. Otherwise you will be prompted for your credentials by the agent installer.</p>
          </div>
          <div v-show="tabSelInstallAsService == 'LinuxInstallAsService'">
            <h2 class="has-text-weight-normal">The best way to install the agent is with systemd. You can do this with either of these methods.</h2>
            <div class="content mb-5">
              <ul>
                <li>Double click the installer</li>
                <li>Run the installer from the command line</li>
              </ul>
            </div>
            <code class="p-5 ml-5 has-text-black code-snippet">
$ sudo ./sg-agent-installer-linux -c install -i [agent access key id] -s [agent access secret] -t [tags]
            </code>
            <p class="subtitle has-text-weight-normal ml-5 mt-5">The agent uses an access key id/secret pair to make a secure connection to the SaaSGlue API. The credentials are saved in a <a href="#config_file">config</a> file. When installed with systemd the config file is saved in /etc/saasglue.<br><br>The command line parameters are optional. If you include them, the config file will be created automatically. Otherwise you will be prompted for your credentials by the agent installer.</p>
          </div>
          <div v-show="tabSelInstallAsService == 'MacInstallAsService'">
            <h2 class="has-text-weight-normal">The best way to install the agent is with launchd. You can do this with either of these methods.</h2>
            <div class="content mb-5">
              <ul>
                <li>Double click the installer</li>
                <li>Run the installer from the command line</li>
              </ul>
            </div>
            <code class="p-5 ml-5 has-text-black code-snippet">
$ sudo ./sg-agent-installer-mac -c install -i [agent access key id] -s [agent access secret] -t [tags] -p [path]
            </code>
            <p class="subtitle has-text-weight-normal ml-5 mt-5">The agent uses an access key id/secret pair to make a secure connection to the SaaSGlue API. The credentials are saved in a <a href="#config_file">config</a> file. When installed with launchd the config file is saved in a folder named .saasglue in your home folder.<br><br>The command line parameters are optional. If you include them, the config file will be created automatically. Otherwise you will be prompted for your credentials by the agent installer.<br><br>You can use the "-p" parameter to specify the PATH variable for the agent runtime environment. If not specified, the installer will use the PATH variable of the environment in which the installer runs.</p>
          </div>
        </div>

        <div class="is-divider"></div>
        <h2 class="has-text-weight-semibold is-size-4-desktop is-size-5-touch" id="run_agent_command_line">Run the agent from the command line</h2>
        <div class="tabs mt-4 ml-4 is-size-5-desktop is-size-6-touch">
          <ul>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'WinInstallAsService' }" @click="tabSelInstallAsService = 'WinInstallAsService'"><a>Windows</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'LinuxInstallAsService' }" @click="tabSelInstallAsService = 'LinuxInstallAsService'"><a>Linux</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'MacInstallAsService' }" @click="tabSelInstallAsService = 'MacInstallAsService'"><a>Mac</a></li>
          </ul>
        </div>
        <div class="container ml-4 is-size-5-desktop is-size-6-touch">
          <div v-show="tabSelInstallAsService == 'WinInstallAsService'">
            <h2 class="has-text-weight-normal">To run the agent from the command line:</h2>
            <div class="content mb-5">
              <ol>
                <li>Download the SaaSGlue Agent launcher</li>
                  <code class="p-5 ml-5 my-5 has-text-black code-snippet">
> sg-agent-win-installer.exe -c download -i [agent access key id] -s [agent access secret] -t [tags]
                  </code>
                <li>Run the SaaSGlue Agent launcher</li>
                  <code class="p-5 ml-5 my-5 has-text-black code-snippet">
> sg-agent-launcher.exe
                  </code>
              </ol>
            </div>
            <p class="subtitle has-text-weight-normal ml-5 mt-5">The agent uses an access key id/secret pair to make a secure connection to the SaaSGlue API. The credentials are saved in a <a href="#config_file">config</a> file. The config file is saved in the same folder as the installer.<br><br>If you include the agent credentials on the command line the config file will be created automatically. Otherwise you will be prompted for your credentials by the agent installer.</p>
          </div>
          <div v-show="tabSelInstallAsService == 'LinuxInstallAsService'">
            <h2 class="has-text-weight-normal">To run the agent from the command line:</h2>
            <div class="content mb-5">
              <ol>
                <li>Download the SaaSGlue Agent launcher</li>
                  <code class="p-5 ml-5 my-5 has-text-black code-snippet">
$ sudo ./sg-agent-installer-linux -c install -i [agent access key id] -s [agent access secret] -t [tags]
                  </code>
                <li>Run the SaaSGlue Agent launcher</li>
                  <code class="p-5 ml-5 my-5 has-text-black code-snippet">
> ./sg-agent-launcher
                  </code>
              </ol>
            </div>
            <p class="subtitle has-text-weight-normal ml-5 mt-5">The agent uses an access key id/secret pair to make a secure connection to the SaaSGlue API. The credentials are saved in a <a href="#config_file">config</a> file. The agent download process will save the config file in the same folder as the installer.<br><br>If you include the agent credentials on the command line the config file will be created automatically. Otherwise you will be prompted for your credentials by the agent installer.</p>
          </div>
          <div v-show="tabSelInstallAsService == 'MacInstallAsService'">
            <h2 class="has-text-weight-normal">To run the agent from the command line:</h2>
            <div class="content mb-5">
              <ol>
                <li>Download the SaaSGlue Agent launcher</li>
                  <code class="p-5 ml-5 my-5 has-text-black code-snippet">
$ sudo ./sg-agent-installer-mac -c install -i [agent access key id] -s [agent access secret] -t [tags]
                  </code>
                <li>Run the SaaSGlue Agent launcher</li>
                  <code class="p-5 ml-5 my-5 has-text-black code-snippet">
> ./sg-agent-launcher
                  </code>
              </ol>
            </div>
            <p class="subtitle has-text-weight-normal ml-5 mt-5">The agent uses an access key id/secret pair to make a secure connection to the SaaSGlue API. The credentials are saved in a <a href="#config_file">config</a> file. The agent download process will save the config file in the same folder as the installer.<br><br>If you include the agent credentials on the command line the config file will be created automatically. Otherwise you will be prompted for your credentials by the agent installer.</p>
          </div>
        </div>

        <div class="is-divider"></div>
        <h2 class="has-text-weight-semibold is-size-4-desktop is-size-5-touch" id="stop_agent_service">Stop the agent service</h2>
        <div class="tabs mt-4 ml-4 is-size-5-desktop is-size-6-touch">
          <ul>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'WinInstallAsService' }" @click="tabSelInstallAsService = 'WinInstallAsService'"><a>Windows</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'LinuxInstallAsService' }" @click="tabSelInstallAsService = 'LinuxInstallAsService'"><a>Linux</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'MacInstallAsService' }" @click="tabSelInstallAsService = 'MacInstallAsService'"><a>Mac</a></li>
          </ul>
        </div>
        <div class="container ml-4 is-size-5-desktop is-size-6-touch">
          <div v-show="tabSelInstallAsService == 'WinInstallAsService'">
            <h2 class="has-text-weight-normal">To stop the agent service:</h2>
            <code class="p-5 ml-5 my-5 has-text-black code-snippet">
> sg-agent-win-installer.exe -c stop
            </code>
          </div>
          <div v-show="tabSelInstallAsService == 'LinuxInstallAsService'">
            <h2 class="has-text-weight-normal">To stop the agent service:</h2>
            <code class="p-5 ml-5 my-5 has-text-black code-snippet">
$ sudo sg-agent-installer-linux -c stop
            </code>
          </div>
          <div v-show="tabSelInstallAsService == 'MacInstallAsService'">
            <h2 class="has-text-weight-normal">To stop the agent service:</h2>
            <code class="p-5 ml-5 my-5 has-text-black code-snippet">
$ sg-agent-installer-mac -c stop
            </code>
          </div>
        </div>

        <div class="is-divider"></div>
        <h2 class="has-text-weight-semibold is-size-4-desktop is-size-5-touch" id="start_agent_service">Start the agent service</h2>
        <div class="tabs mt-4 ml-4 is-size-5-desktop is-size-6-touch">
          <ul>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'WinInstallAsService' }" @click="tabSelInstallAsService = 'WinInstallAsService'"><a>Windows</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'LinuxInstallAsService' }" @click="tabSelInstallAsService = 'LinuxInstallAsService'"><a>Linux</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'MacInstallAsService' }" @click="tabSelInstallAsService = 'MacInstallAsService'"><a>Mac</a></li>
          </ul>
        </div>
        <div class="container ml-4 is-size-5-desktop is-size-6-touch">
          <div v-show="tabSelInstallAsService == 'WinInstallAsService'">
            <h2 class="has-text-weight-normal">To start the agent service:</h2>
            <code class="p-5 ml-5 my-5 has-text-black code-snippet">
> sg-agent-win-installer.exe -c start
            </code>
          </div>
          <div v-show="tabSelInstallAsService == 'LinuxInstallAsService'">
            <h2 class="has-text-weight-normal">To start the agent service:</h2>
            <code class="p-5 ml-5 my-5 has-text-black code-snippet">
$ sudo sg-agent-installer-linux -c start
            </code>
          </div>
          <div v-show="tabSelInstallAsService == 'MacInstallAsService'">
            <h2 class="has-text-weight-normal">To start the agent service:</h2>
            <code class="p-5 ml-5 my-5 has-text-black code-snippet">
$ sg-agent-installer-mac -c start
            </code>
          </div>
        </div>

        <div class="is-divider"></div>
        <h2 class="has-text-weight-semibold is-size-4-desktop is-size-5-touch" id="uninstall_agent_service">Uninstall the agent service</h2>
        <div class="tabs mt-4 ml-4 is-size-5-desktop is-size-6-touch">
          <ul>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'WinInstallAsService' }" @click="tabSelInstallAsService = 'WinInstallAsService'"><a>Windows</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'LinuxInstallAsService' }" @click="tabSelInstallAsService = 'LinuxInstallAsService'"><a>Linux</a></li>
            <li v-bind:class="{ 'is-active': tabSelInstallAsService == 'MacInstallAsService' }" @click="tabSelInstallAsService = 'MacInstallAsService'"><a>Mac</a></li>
          </ul>
        </div>
        <div class="container ml-4 is-size-5-desktop is-size-6-touch">
          <div v-show="tabSelInstallAsService == 'WinInstallAsService'">
            <h2 class="has-text-weight-normal">To uninstall the agent service:</h2>
            <code class="p-5 ml-5 my-5 has-text-black code-snippet">
> sg-agent-win-installer.exe -c uninstall
            </code>
          </div>
          <div v-show="tabSelInstallAsService == 'LinuxInstallAsService'">
            <h2 class="has-text-weight-normal">To uninstall the agent service:</h2>
            <code class="p-5 ml-5 my-5 has-text-black code-snippet">
$ sudo sg-agent-installer-linux -c uninstall
            </code>
          </div>
          <div v-show="tabSelInstallAsService == 'MacInstallAsService'">
            <h2 class="has-text-weight-normal">To uninstall the agent service:</h2>
            <code class="p-5 ml-5 my-5 has-text-black code-snippet">
$ sg-agent-installer-mac -c uninstall
            </code>
          </div>
        </div>

        <div class="is-divider"></div>
        <h2 class="has-text-weight-semibold is-size-4-desktop is-size-5-touch" id="config_file">Config file</h2>
        <h2 class="mt-4">
          The SaaSGlue Agent uses Oauth2 to maintain a secure connection to the SaaSGlue API. The agent access key id and secret are stored in a config file. On startup, the agent looks for the config file in the following locations (in order):</h2>
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

        <h2 class="subtitle">
          The config file is formatted as follows:
        </h2>
          

<pre>{
  "SG_ACCESS_KEY_ID": "********",
  "SG_ACCESS_KEY_SECRET": "********",
  "tags": {
      "key": "value"
  }
}</pre>
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
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { Tabs, Tab } from 'vue-slim-tabs';
import _ from 'lodash';

enum UpdateTagType {
  ADD, DELETE
};

@Component({
  components: { Tabs, Tab },
  props: { },
})
export default class DownloadAgent extends Vue {
  private tabSelInstallAsService: string = "WinInstallAsService";
}
</script>


<style scoped lang="scss">
  .code-snippet {
    display: block;
    white-space: nowrap;
    border: 1px solid lightgray;
    overflow: auto;
  }

  .has-background-deepskyblue {
      background: linear-gradient(to right, #3a7bd5, #00d2ff);
  }

  .download-section .button {
    width: 100%;
    height: auto;
  }

  .subtitle {
      line-height: 26px;
  }
</style>
