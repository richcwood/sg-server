 <template>
  <div>
    <!-- Modals -->
    <modal name="create-user-access-key-modal" :classes="'round-popup'" :width="600" :height="820">
      <validation-observer ref="createUserAccessKeyValidationObserver">
        <table class="table" width="100%">
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <strong>Create a User API Access Key</strong>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              Description
            </td>
            <td class="td">
              <validation-provider name="Key Description" rules="required|object-name" v-slot="{ errors }">
                <input class="input" type="text" v-model="newAccessKey.description"/>
                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
              </validation-provider>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              Access Rights
            </td>
            <td class="td">
              <a @click="selectAllRights">Select All</a>
              <a style="margin-left: 20px;" @click="unselectAllRights">Select None</a>
              
              <div style="margin-top: 12px; width: 100%; height: 400px; overflow: scroll;">
                <div v-for="accessRight of accessRights" :key="accessRight.id">
                  <label class="checkbox">
                    <input type="checkbox" v-model="accessRightSelections[accessRight.rightId]" :disabled="userAccessRightsBitset && !userAccessRightsBitset.get(accessRight.rightId)">
                    <span style="margin-left: 12px;">{{accessRight.name}}</span>
                  </label>
                </div>
              </div>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
            </td>
            <td class="td">
              (Rights are disabled if you don't have access yourself)
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              Expiration
            </td>
            <td class="td">
              <datepicker input-class="input" v-model="newAccessKey.expiration" name="filterDate"></datepicker>
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <button class="button" @click="onCancelCreateUserAccessKey">Cancel</button>
              <button class="button button-spaced is-primary" @click="onCreateCreateUserAccessKey">Create Access Key</button>
            </td>
          </tr>
        </table>
      </validation-observer>
    </modal>

    <modal name="create-agent-access-key-modal" :classes="'round-popup'" :width="600" :height="600">
      <validation-observer ref="createAgentAccessKeyValidationObserver">
        <table class="table" width="100%">
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <strong>Create an Agent API Access Key</strong>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              Description
            </td>
            <td class="td">
              <validation-provider name="Key Description" rules="required|object-name" v-slot="{ errors }">
                <input class="input" type="text" v-model="newAccessKey.description"/>
                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
              </validation-provider>
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <button class="button" @click="onCancelCreateAgentAccessKey">Cancel</button>
              <button class="button button-spaced is-primary" @click="onCreateCreateAgentAccessKey">Create Access Key</button>
            </td>
          </tr>
        </table>
      </validation-observer>
    </modal>

    <modal name="create-access-key-success-modal" :classes="'round-popup'" :clickToClose="false" :width="700" :height="600">
      <div style="width: 100%; background-color: white; padding: 40px;">
        <div class="notification is-primary">
          <span style="font-size: 24px; font-weight: 700;">
            Secret: {{newAccessKeySecret}}
          </span>
        </div>
        <div class="notification is-danger" style="font-size: 20px; font-weight: 700;">
          ATTENTION!
          <br>
          This is your only chance to copy this secret.  Please copy it somewhere safely before closing this dialog.
        </div>
        <button class="button is-danger" @click="closeAccessKeySuccessModal">I Have Copied The Secret</button>
      </div>
    </modal>




    <table class="table">
      <tr class="tr">
        <td class="td">
          <strong>Access Key ID</strong>
        </td>
        <td class="td">
          <strong>Description</strong>
        </td>
        <td class="td">
          <strong>Created By</strong>
        </td>
        <td class="td">
          <strong>Expires</strong>
        </td>
        <td class="td">
          <strong>Last Used</strong>
        </td>
        <td class="td">
          <strong>Status</strong>
        </td>
      </tr>

      <tr v-if="accessKeys.length === 0" class="tr">
        <td colspan="6" class="td">
          No access keys yet. 
        </td>
      </tr>

      <tr v-for="accessKey of accessKeys" :key="accessKey.id" class="tr">
        <td class="td">
          {{accessKey.accessKeyId}}
        </td>
        <td class="td">
          {{accessKey.description}}
        </td>
        <td class="td">
          {{getUser(accessKey.createdBy).name}}
        </td>
        <td class="td">
          {{momentToStringV3(accessKey.expiration)}}
        </td>
        <td class="td">
        {{momentToStringV1(accessKey.lastUsed)}}
        </td>
        <td class="td">
          <span :class="calculatedAccessKeyStatusClass(accessKey)">
            {{calculateAccessKeyStatus(accessKey)}}
          </span>
          <a class="button-spaced" v-if="calculateAccessKeyStatus(accessKey) === AccessKeyStatus.ACTIVE" @click="onMakeInactiveClicked(accessKey)">make inactive</a>
          <a class="button-spaced" v-if="calculateAccessKeyStatus(accessKey) === AccessKeyStatus.INACTIVE" @click="onMakeActiveClicked(accessKey)">make active</a>
        </td>
      </tr>
      
      <tr class="tr">
        <td colspan="7">
          <button class="button" @click="openCreateAccessKeyModal">Create {{accessKeyType === AccessKeyType.AGENT ? 'Agent' : 'User'}} Access Key</button>
        </td>
      </tr>
    </table>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';
import { BindSelected, BindSelectedCopy, BindStoreModel } from '../decorator';
import { StoreType } from '../store/types';
import { AccessKey, AccessKeyType, AccessKeyStatus, calculateAccessKeyStatus } from '../store/accessKey/types';
import { AccessRight } from '../store/accessRight/types';
import { getLoggedInUserRightsBitset } from '../store/security';
import { User } from '../store/user/types';
import { SgAlert, AlertPlacement, AlertCategory } from '../store/alert/types';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { showErrors } from '../utils/ErrorHandler';
import { momentToStringV1, momentToStringV3 } from '../utils/DateTime';
import Datepicker from 'vuejs-datepicker';
import axios from 'axios';
import BitSet from 'bitset';

@Component({
  components: { ValidationProvider, ValidationObserver, Datepicker }
})
export default class AccessKeysGrid extends Vue { 
  
  // expose to template
  private readonly momentToStringV1 = momentToStringV1;
  private readonly momentToStringV3 = momentToStringV3;
  private readonly calculateAccessKeyStatus = calculateAccessKeyStatus;
  private readonly AccessKeyStatus = AccessKeyStatus;
  private readonly AccessKeyType = AccessKeyType;
  private userAccessRightsBitset: BitSet | null = null;

  private mounted(){
    try {
      this.userAccessRightsBitset = getLoggedInUserRightsBitset();
    }
    catch(err){
      showErrors('Unable to load logged in users access rights', err);
    }
  }

  @Prop()
  private accessKeyType: AccessKeyType;

  @Prop()
  private accessKeys: AccessKey[];

  @BindStoreModel({storeType: StoreType.AccessRightStore, selectedModelName: 'models'})
  private accessRights!: AccessRight[];
  
  // for reactivity in a template
  private loadedUsers = {};
  private getUser(userId: string): User {
    try {
      if(!this.loadedUsers[userId]){
        Vue.set(this.loadedUsers, userId, {name: userId});

        (async () => {
          this.loadedUsers[userId] = await this.$store.dispatch(`${StoreType.UserStore}/fetchModel`, userId);
        })();
      }

      return this.loadedUsers[userId];
    }
    catch(err){
      console.log('Error in loading a user.  Maybe it was deleted?', userId);
      return {
        name: 'Error',
        email: 'Error'
      }
    }
  }

  private calculatedAccessKeyStatusClass(accessKey: AccessKey): string {
    if(calculateAccessKeyStatus(accessKey) === AccessKeyStatus.ACTIVE){
      return 'has-text-success';
    }
    else {
      return 'has-text-danger';
    }
  }

  private async onMakeInactiveClicked(accessKey: AccessKey){
    try {
      const updatedAccessKey = {
        id: accessKey.id,
        revokeTime: Date.now()
      };

      this.$store.dispatch(`${StoreType.AccessKeyStore}/save`, updatedAccessKey);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert('Inactivated access key', AlertPlacement.FOOTER, AlertCategory.INFO));
    }
    catch(err){
      console.error(err);
      showErrors('Error inactivating access key', err);
    }
  }

  private onMakeActiveClicked(accessKey: AccessKey){
    try {
      const updatedAccessKey = {
        id: accessKey.id,
        revokeTime: null
      };

      this.$store.dispatch(`${StoreType.AccessKeyStore}/save`, updatedAccessKey);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert('Activated access key', AlertPlacement.FOOTER, AlertCategory.INFO));
    }
    catch(err){
      console.error(err);
      showErrors('Error activating access key', err);
    }
  }

  private onMakeExpireClicked(accessKey: AccessKey){
  try {
      const updatedAccessKey = {
        id: accessKey.id,
        expiration: Date.now()
      };

      this.$store.dispatch(`${StoreType.AccessKeyStore}/save`, updatedAccessKey);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert('Expired access key', AlertPlacement.FOOTER, AlertCategory.INFO));
    }
    catch(err){
      console.error(err);
      showErrors('Error expiring access key', err);
    }
  }

  private async openCreateAccessKeyModal(){
    if(this.accessKeyType === AccessKeyType.USER){
      this.newAccessKey = {
        _teamId: '',
        description: '',
        accessKeyType: AccessKeyType.USER,
        accessRightIds: []
      };

      // Initially just select all rights
      if(Object.keys(this.accessRightSelections).length === 0){
        this.selectAllRights();
      }

      this.$modal.show('create-user-access-key-modal');
    }
    else {
      this.newAccessKey = {
        _teamId: '',
        description: '',
        accessKeyType: AccessKeyType.AGENT
      }

      this.$modal.show('create-agent-access-key-modal');
    }
  }

  private newAccessKey: AccessKey = {
    _teamId: '',
    description: '',
    accessRightIds: []
  }

  private newAccessKeySecret: string|null = null;
  private newAccessKeyId: string|null = null;

  // key from accessRightId to boolean for checked state
  private accessRightSelections: {[key: string]: boolean} = {};

  private selectAllRights(){
    const newSelections = {};
    for(let right of this.accessRights){
      if(this.userAccessRightsBitset.get(right.rightId)){
        newSelections[right.rightId] = true;
      }
      else {
        newSelections[right.rightId] = false;
      }
    }

    this.accessRightSelections = newSelections;
  }

  private unselectAllRights(){
    this.accessRightSelections = {};
  }

  private onCancelCreateUserAccessKey(){
    this.$modal.hide('create-user-access-key-modal');
  }

  private async onCreateCreateUserAccessKey(){
    if( ! await (<any>this.$refs.createUserAccessKeyValidationObserver).validate()){
      return;
    }

    try {
      const newAccessKey: any = {
        description: this.newAccessKey.description,
        accessKeyType: AccessKeyType.USER
      };

      if(this.newAccessKey.expiration){
        newAccessKey.expiration = (new Date(this.newAccessKey.expiration)).getTime();
      }

      newAccessKey.accessRightIds = Object.keys(this.accessRightSelections).reduce((accum: any, accessKey: string) => {
        if(this.accessRightSelections[accessKey]){
          accum.push(Number.parseInt(accessKey));
        }
        return accum;
      }, []);

      const newAccessKeyResult = await this.$store.dispatch(`${StoreType.AccessKeyStore}/save`, newAccessKey);

      this.newAccessKeySecret = newAccessKeyResult.accessKeySecret;
      this.$modal.show('create-access-key-success-modal');

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert('Created new user access key', AlertPlacement.FOOTER, AlertCategory.INFO));
      this.newAccessKeyId = newAccessKeyResult.id;
    }
    catch(err) {
      console.error(err);
      showErrors('Error creating access key.', err);
    }
    finally {
      this.$modal.hide('create-user-access-key-modal');
    }
  }

  private onCancelCreateAgentAccessKey(){
    this.$modal.hide('create-agent-access-key-modal');
  }

  private async onCreateCreateAgentAccessKey(){
    if( ! await (<any>this.$refs.createAgentAccessKeyValidationObserver).validate()){
      return;
    }

    try {
      const newAccessKey: any = {
        description: this.newAccessKey.description,
        accessKeyType: AccessKeyType.AGENT
      };

      const newAccessKeyResult = await this.$store.dispatch(`${StoreType.AccessKeyStore}/save`, newAccessKey);

      this.newAccessKeySecret = newAccessKeyResult.accessKeySecret;
      this.$modal.show('create-access-key-success-modal');

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert('Created new agent access key', AlertPlacement.FOOTER, AlertCategory.INFO));
      this.newAccessKeyId = newAccessKeyResult.id;
    }
    catch(err) {
      console.error(err);
      showErrors('Error creating access key.', err);
    }
    finally {
      this.$modal.hide('create-agent-access-key-modal');
    }
  }

  private closeAccessKeySuccessModal(){
    this.$modal.hide('create-access-key-success-modal');
    this.newAccessKeySecret = null;

    if(this.newAccessKeyId){
      this.$store.commit(`${StoreType.AccessKeyStore}/update`, {id: this.newAccessKeyId, accessKeySecret: null});
    }
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

</style>
