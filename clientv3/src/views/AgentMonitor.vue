<template>
  <div class="pt-5 agents-page-grid">
    <!-- Modals -->
    <modal name="import-cron-modal" :width="800" :height="600">
      <div class="round-popup" style="margin: 12px; width: 100%; height: 100%">
        <div>
          These cron entries were extracted from your agent's machine.
          <br />
          You can import them into SaaSGlue as Jobs.
        </div>

        <table class="table" style="margin-top: 12px; margin-left: 8px;">
          <tr class="tr">
            <td class="td">
              Cron Job
            </td>
            <td class="td"></td>
          </tr>
          <tr class="tr" v-for="(rawCronJob, index) in rawCronJobs" v-bind:key="rawCronJob">
            <td class="td">
              {{ rawCronJob }}
            </td>
            <td class="td">
              <button class="button" @click="onImportRawCronClicked(index)">Import</button>
            </td>
          </tr>
          <tr class="tr">
            <td class="td" colspan="3">
              <button class="button" @click="onCloseImportCronClicked">Close</button>
            </td>
          </tr>
        </table>
      </div>
    </modal>

    <div v-if="agents.length === 0" class="sg-container-px">
      <div class="is-size-4">
        There are no agents created yet.
        <br />
        Download an agent from the "Download Agent" menu and once the agent starts you will see it in this screen.
      </div>
    </div>
    <template v-else>
      <div class="sg-container-px has-overflow">
        <div class="field">
          <div class="control has-icons-left">
            <input
              class="input"
              type="text"
              style="width: 450px;"
              v-model="filterString"
              placeholder="Filter by Agent Name, Tags and IP Address"
            />
            <span class="icon is-small is-left">
              <font-awesome-icon icon="search" />
            </span>
          </div>
        </div>
        <div class="field">
          <div class="control">
            <label class="checkbox">
              <input type="checkbox" v-model="includeInactiveAgents" /> Include inactive agents
            </label>
          </div>
        </div>

        <table class="table sg-table is-striped">
          <thead>
            <tr>
              <th>Name</th>
              <th>Num. Active Tasks</th>
              <th>Status</th>
              <th>IP Address</th>
              <th>Tags</th>
              <th>Track Stats</th>
              <th>Last Heartbeat</th>
              <th>Import Cron</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="agent in filteredAgents" :key="agent.id">
              <td>
                <a href="#" @click.prevent="onAgentClick(agent.id)">{{ agent.name }}</a>
              </td>
              <td>{{ agent.numActiveTasks }}</td>
              <td>
                <span class="activeAgent" v-if="isAgentActive(agent)">Active</span>
                <span v-else>Inactive</span>
              </td>
              <td>{{ agent.ipAddress }}</td>
              <td><span v-html="tagsMapToString(agent.tags, 2)"></span></td>
              <td class="has-text-centered">
                <label class="checkbox">
                  <input
                    type="checkbox"
                    :value="isChecked(agent.propertyOverrides.trackSysInfo)"
                    @change="ontrackSysInfoChanged(agent)"
                    :checked="isChecked(agent.propertyOverrides.trackSysInfo)"
                  />
                </label>
              </td>
              <td>{{ momentToStringV1(agent.lastHeartbeatTime) }}</td>
              <td>
                <button class="button" :disabled="!agent.cron" @click="onImportCronClicked(agent)">Import</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { BindStoreModel } from "@/decorator";
import { StoreType } from "@/store/types";
import { Agent } from "../store/agent/types";
import { isAgentActive } from "@/store/agent/agentUtils";
import axios from "axios";
import { SgAlert, AlertPlacement, AlertCategory } from "@/store/alert/types";
import { momentToStringV1 } from "@/utils/DateTime";
import _ from "lodash";
import { tagsMapToString } from "@/utils/Shared";
import { JobDef } from "@/store/jobDef/types";
import { showErrors } from "@/utils/ErrorHandler";
import ScriptSearch from "@/components/ScriptSearch.vue";
import { ValidationProvider, ValidationObserver } from "vee-validate";

enum UpdateTagType {
  ADD,
  DELETE,
}

@Component({
  components: { ScriptSearch, ValidationObserver, ValidationProvider },
})
export default class AgentMonitor extends Vue {
  // Expose to template
  private readonly momentToStringV1 = momentToStringV1;
  private readonly tagsMapToString = tagsMapToString;
  private readonly isAgentActive = isAgentActive;

  @BindStoreModel({ storeType: StoreType.TeamStore })
  private selectedTeam: any;

  private lastCountForSort = 0;

  private filterString = "";

  private includeInactiveAgents = true;

  private mounted() {
    if (localStorage.getItem("agentMonitor_includeInactiveAgents") !== undefined) {
      this.includeInactiveAgents = localStorage.getItem("agentMonitor_includeInactiveAgents") === "true";
    }

    // restore last filters if possible
    if (localStorage.getItem("agentMonitor_filterString")) {
      this.filterString = localStorage.getItem("agentMonitor_filterString");
    }
  }

  private beforeDestroy() {
    // save current filters
    localStorage.setItem("agentMonitor_filterString", this.filterString);
    localStorage.setItem("agentMonitor_includeInactiveAgents", this.includeInactiveAgents ? "true" : "false");
  }

  private get agents(): Agent[] {
    // Agent load was already triggered when the app started (security/actions/startApp)
    const agents = this.$store.getters[`${StoreType.AgentStore}/getAgentsBySelectedTeam`];

    if (this.lastCountForSort !== agents.length) {
      this.lastCountForSort = agents.length;
      agents.sort((agentA: Agent, agentB: Agent) => {
        return new Date(agentB.lastHeartbeatTime).getTime() - new Date(agentA.lastHeartbeatTime).getTime();
      });
    }

    return agents;
  }

  private get filteredAgents(): Agent[] {
    const filterUCase = this.filterString.toUpperCase();
    // split by whitespace and remove empty entries
    const filterUCaseItems = filterUCase
      .split(" ")
      .map((item) => item.trim())
      .filter((item) => item);
    const filteredAgents = this.agents.filter((agent: Agent) => {
      if (!this.includeInactiveAgents && !isAgentActive(agent)) {
        return false;
      } else if (filterUCaseItems.length === 0) {
        return true;
      } else {
        return filterUCaseItems.some((filter: string) => {
          if (agent.name.toUpperCase().indexOf(filter) !== -1) {
            return true;
          } else if (agent.ipAddress.indexOf(filter) !== -1) {
            return true;
          } else if (Object.keys(agent.tags).some((tagKey: string) => tagKey.toUpperCase().indexOf(filter) !== -1)) {
            return true;
          } else if (
            Object.values(agent.tags).some((tagValue: string) => tagValue.toUpperCase().indexOf(filter) !== -1)
          ) {
            return true;
          } else {
            return false;
          }
        });
      }
    });

    return filteredAgents.sort((a: Agent, b: Agent) => {
      const aIsActive = isAgentActive(a);
      const bIsActive = isAgentActive(b);

      if (aIsActive !== bIsActive) {
        return aIsActive ? -1 : 1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }

  private isChecked(val: any) {
    return val == true;
  }

  private ontrackSysInfoChanged(agent: any) {
    const properties = {
      trackSysInfo: !agent.propertyOverrides.trackSysInfo,
    };
    this.$store.dispatch(`${StoreType.AgentStore}/saveSettings`, { id: agent.id, properties });
  }

  private newTagKey = "";
  private newTagValue = "";

  private async onAddTagClicked() {
    // TODO apply new tags to filtered list of agents
    if (this.newTagKey.trim() && this.newTagValue.trim()) {
      this.updateSelectedAgentTags(UpdateTagType.ADD, this.newTagKey, this.newTagValue);
    }
  }

  private onDeleteTagClicked(tag: string) {
    // TODO remove tags from filtered list of agents
    // the tag should be in key=value format because it will come from the template above
    this.updateSelectedAgentTags(UpdateTagType.DELETE, tag.split("=")[0]);
  }

  private async updateSelectedAgentTags(updateType: UpdateTagType, tagKey: string, tagValue?: string) {
    try {
      const agentIds = Object.keys(this.filteredAgents);
      const savePromises: Promise<any>[] = [];

      for (let agentId of agentIds) {
        const agentCopy: Agent = this.filteredAgents[agentId];

        if (updateType === UpdateTagType.ADD) {
          savePromises.push(this.$store.dispatch("agentStore/saveTags", { id: agentId, tags: agentCopy.tags }));
        } else {
          if (agentCopy.tags[tagKey]) {
            savePromises.push(this.$store.dispatch("agentStore/saveTags", { id: agentId, tags: agentCopy.tags }));
          } else {
            console.error("Tried to remove a tag that did not exist on agent", tagKey, agentCopy.name);
          }
        }
      }

      await Promise.all(savePromises);

      this.$store.dispatch(
        `${StoreType.AlertStore}/addAlert`,
        new SgAlert("Saved agent tags.", AlertPlacement.FOOTER, AlertCategory.INFO)
      );

      if (updateType === UpdateTagType.ADD) {
        this.newTagKey = this.newTagValue = "";
      }
    } catch (err) {
      console.error(err);
      showErrors("Error saving agent tags.", err);
    }
  }

  private selectedAgentForCronImport: Agent | null = null;
  private rawCronJobs = [];
  private rawCronEnvVars = {};

  private onImportCronClicked(agent: Agent) {
    if (agent.cron) {
      // Split and show non-empty rows
      this.selectedAgentForCronImport = agent;

      const tmpCronEntries = agent.cron.split("\n").filter((entry) => entry.trim());
      for (let i = 0; i < tmpCronEntries.length; i++) {
        const cronEntry = tmpCronEntries[i];
        if (cronEntry.startsWith("#")) continue;
        if (cronEntry.split(" ").length > 5) {
          this.rawCronJobs.push(cronEntry);
        } else if (cronEntry.match(/[A-Za-z]=.+/g)) {
          const ev = cronEntry.split("=");
          this.rawCronEnvVars[ev[0]] = ev[1];
        }
      }
      this.$modal.show("import-cron-modal");
    }
  }

  private async onImportRawCronClicked(index: number) {
    try {
      const rawCronJob = this.rawCronJobs[index];

      const {
        data: { data },
      } = await axios.post("/api/v0/jobdef/cron", {
        cronString: rawCronJob,
        envVars: this.rawCronEnvVars,
        _agentId: this.selectedAgentForCronImport.id,
      });

      // Result will be the newly created jobDef
      const jobDef = <JobDef>data;

      window.open(`${window.location.origin}/#/jobDesigner/${jobDef.id}`);

      const alertMessage = `Cron Job imported to a new SaaSGlue Job "${jobDef.name}".<br><br>Remember to remove this cron job from the Agent machine "${this.selectedAgentForCronImport.name}"<br>`;
      this.$store.dispatch(
        `${StoreType.AlertStore}/addAlert`,
        new SgAlert(alertMessage, AlertPlacement.WINDOW, AlertCategory.INFO)
      );
    } catch (err) {
      console.error(err);
      showErrors("Error importing the cron job.", err);
    }
  }

  private onCloseImportCronClicked() {
    this.$modal.hide("import-cron-modal");
  }

  public onAgentClick (agentId: string): void {
    this.$router.push({
      name: 'agentMonitorDetails',
      params: { agentId }
    });
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

select {
  margin-left: 8px;
  margin-right: 8px;
}

.activeAgent {
  color: green;
}

table,
th,
td {
  border-collapse: collapse;
}
th,
td {
  padding: 10px;
}
th {
  text-align: left;
}

ul {
  list-style: none;
  padding-left: 0.25rem;
}

.has-overflow {
  overflow: auto;
}

.agents-page-grid {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
}
</style>
