<template>
  <div class="sg-container-p">

    <div class="field is-grouped">
      <div class="control has-icons-left">
        <input class="input" type="text" style="width: 550px;" v-model="filterString"
          placeholder="Filter by Script Name, Script Type, Created By and Last Edited By">
        <span class="icon is-small is-left">
          <font-awesome-icon icon="search" />
        </span>
      </div>
      <div class="control has-icons-left">
        <button class="button is-primary" @click="onCreateScriptClicked">Create Script</button>
      </div>
    </div>

    <!-- List of scripts -->
    <table class="table is-striped">
      <thead>
        <th>Script Name</th>
        <th>Rename</th>
        <th>Delete</th>
        <th>Script Type</th>
        <th>Created By</th>
        <th>Last Edited</th>
        <th>Last Edited By</th>
      </thead>

      <tbody>
        <tr v-for="script in filteredScripts" v-bind:key="script.id">
          <td><router-link :to="{ name: 'interactiveConsole', params: { scriptId: script.id } }">{{ script.name }}</router-link>
          </td>
          <td>
            <button v-if="isScriptEditable(script)" class="button" @click="onClickedRename(script)">Rename</button>
            <template v-else>
              <div class="readonly-tooltip-container">(read-only)
                <span class="readonly-tooltip-text">
                  The orginal script author "{{ getUser(script._originalAuthorUserId).name }}" has has not allowed team
                  members to edit this script.
                </span>
              </div>

            </template>
          </td>
          <td><button v-if="isScriptEditable(script)" class="button" @click="onClickedDelete(script)">Delete</button></td>
          <td>{{ scriptTypesForMonaco[script.scriptType] }}</td>
          <td>{{ getUser(script._originalAuthorUserId).name }}</td>
          <td>{{ momentToStringV1(script.lastEditedDate) }}</td>
          <td>{{ getUser(script._lastEditedUserId).name }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { Component, Vue } from 'vue-property-decorator';

import CreateScriptModal from '@/components/scripts/CreateScriptModal.vue';
import RenameScriptModal from '@/components/scripts/RenameScriptModal.vue';
import DeleteScriptModal from '@/components/scripts/DeleteScriptModal.vue';
import { Script, scriptTypesForMonaco } from "@/store/script/types";
import { BindStoreModel, BindProp } from '@/decorator';
import { momentToStringV1 } from '@/utils/DateTime';
import { User } from '@/store/user/types';
import { StoreType } from '@/store/types';

@Component({
  components: { ValidationProvider, ValidationObserver }
})
export default class Scripts extends Vue {

  // Expose to template
  public readonly momentToStringV1 = momentToStringV1;
  public readonly scriptTypesForMonaco = scriptTypesForMonaco;

  // Filter inputs
  public filterString = '';

  public get defaultStoreType() { return StoreType.ScriptStore };

  @BindStoreModel({ selectedModelName: 'models' })
  public scripts!: Script[];

  public get filteredScripts(): Script[] {
    const filterUCase = this.filterString.toUpperCase();
    // split by whitespace and remove empty entries
    const filterUCaseItems = filterUCase.split(' ').map(item => item.trim()).filter(item => item);
    const filteredScripts: Script[] = this.scripts.filter((script: Script) => {
      if (filterUCaseItems.length === 0) {
        return true;
      }
      else {
        return filterUCaseItems.some((filter: string) => {
          if (scriptTypesForMonaco[script.scriptType]?.toUpperCase().includes(filter)) {
            return true;
          }

          if (script.name.toUpperCase().indexOf(filter) !== -1) {
            return true;
          }
          else if (this.getUser(script._originalAuthorUserId).name.toUpperCase().indexOf(filter) !== -1) {
            return true;
          }
          else if (this.getUser(script._lastEditedUserId).name.toUpperCase().indexOf(filter) !== -1) {
            return true;
          }
          else {
            return false;
          }
        });
      }
    });

    // sort by id - should be like a created date
    filteredScripts.sort((scriptA: Script, scriptB: Script) => {
      return scriptB.id.localeCompare(scriptA.id);
    });

    return filteredScripts;
  }

  private async mounted() {
    // load all scripts,, maybe someday it will be problematic / too slow 
    this.$store.dispatch(`${StoreType.ScriptStore}/fetchModelsByFilter`);

    // restore last filters if possible
    if (localStorage.getItem('scripts_filterString')) {
      this.filterString = localStorage.getItem('script_filterString');
    }
  }

  private beforeDestroy() {
    // save current filters
    localStorage.setItem('script_filterString', this.filterString);
  }

  // for reactivity in a template
  public loadedUsers = {};
  public getUser(userId: string): User {
    try {
      if (!this.loadedUsers[userId]) {
        Vue.set(this.loadedUsers, userId, { name: 'loading...' });

        (async () => {
          this.loadedUsers[userId] = await this.$store.dispatch(`${StoreType.UserStore}/fetchModel`, userId);
        })();
      }

      return this.loadedUsers[userId];
    }
    catch (err) {
      console.log('Error in loading a user.  Maybe it was deleted?', userId);
      return {
        name: 'Error',
        email: 'Error',
        teamIdsInvited: [],
        teamIds: [],
        companyName: ''
      }
    }
  }

  public onCreateScriptClicked() {
    this.$modal.show(CreateScriptModal, null, {
      height: 'auto',
      width: '650px',
    }, {
      'script:create': (id: string) => this.$router.push(`interactiveConsole/${id}`)
    });
  }

  @BindProp({ storeType: StoreType.SecurityStore, selectedModelName: 'user', propName: 'id' })
  public loggedInUserId!: string;

  public isScriptEditable(script: Script): boolean {
    if (!script) {
      return false;
    }
    else if (script.teamEditable) {
      return true;
    }
    else {
      return script._originalAuthorUserId == this.loggedInUserId;
    }
  }

  public onClickedRename(script: Script) {
    this.$modal.show(RenameScriptModal, {
      script: script,
    }, {
      height: 'auto',
      width: '650px',
    });
  }

  public onClickedDelete(script: Script) {
    this.$modal.show(DeleteScriptModal, {
      script,
    }, {
      height: 'auto',
      width: '650px',
    });
  }
}
</script>

<style scoped lang="scss">
table {
  border-width: 0;
}

td {
  border-width: 0 !important;
}

.button-spaced {
  margin-left: 10px;
}

.readonly-tooltip-container {
  position: relative;
  display: inline-block;
}

.readonly-tooltip-container .readonly-tooltip-text {
  visibility: hidden;
  width: 200px;
  background-color: white;
  color: black;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
  border-width: 1px;
  border-style: solid;

  /* Position the tooltip text - see examples below! */
  position: absolute;
  z-index: 1;
}

/* Show the tooltip text when you mouse over the tooltip container */
.readonly-tooltip-container:hover .readonly-tooltip-text {
  visibility: visible;
}</style>