<template>
  <modal-card>
    <template #title>{{ script.name }} Script Information</template>
    <template #body>
      <div class="content">
        <p v-if="!isScriptEditable" class="notification is-warning">
          The orginal script author "{{ getUser(script._originalAuthorUserId).name }}" has not allowed team members to
          edit this script.
        </p>
        <p>
          <b>Original Author</b> <span>{{ getUser(script._originalAuthorUserId).name }}</span>
        </p>
        <p>
          <b>Last Edited By</b> <span>{{ getUser(script._originalAuthorUserId).name }} on</span> <b>{{
            momentToStringV1(script.lastEditedDate.toString())
          }}</b>
        </p>
        <p>
          <b>Script Type</b> <span>{{ scriptTypesForMonaco[script.scriptType] }}</span>
        </p>
        <p>
          <b>Can Be Edited By Team Members</b> <span>{{ script.teamEditable ? 'Yes' : 'No' }}</span>
        </p>
        <p>
          (used in {{ scriptStepDefUsageCount }} <a href="#" @click.prevent="onClickScriptJobUsage"> job steps</a>)
        </p>
      </div>
    </template>
    <template #footer>
      <button class="button" @click="$emit('close')">Close</button>
    </template>
  </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import axios from "axios";

import { Script, scriptTypesForMonaco } from '@/store/script/types';
import JobStepDetailsModal from './JobStepDetailsModal.vue';
import ModalCard from "@/components/core/ModalCard.vue";
import { momentToStringV1 } from "@/utils/DateTime";
import { StoreType } from "@/store/types";
import { User } from "@/store/user/types";

@Component({
  name: "InfoModal",
  components: { ModalCard },
})
export default class InfoModal extends Vue {
  @Prop({ required: true }) public readonly script: Script;

  public readonly scriptTypesForMonaco = scriptTypesForMonaco;
  public readonly momentToStringV1 = momentToStringV1;

  public get isScriptEditable(): boolean {
    const loggedInUserId: string = this.$store.state[StoreType.SecurityStore].user.id;

    if (this.script.teamEditable) {
      return true;
    } else {
      return this.script._originalAuthorUserId == loggedInUserId;
    }
  }

  private loadedUsers = {};
  public getUser(userId: string): User {
    if (!this.loadedUsers[userId]) {
      Vue.set(this.loadedUsers, userId, { name: 'loading...' });

      (async () => {
        this.loadedUsers[userId] = await this.$store.dispatch(`${StoreType.UserStore}/fetchModel`, userId);
      })();
    }

    return this.loadedUsers[userId];
  }

  private scriptUsageCount = 0;
  public get scriptStepDefUsageCount(): number {
    if (this.script) {
      (async () => {
        const countResponse = await axios.get(`/api/v0/stepDef?filter=_scriptId==${this.script.id}&responseFields=id`);
        this.scriptUsageCount = countResponse.data.meta.count;
      })();

      return this.scriptUsageCount;
    } else {
      return 0;
    }
  }

  public onClickScriptJobUsage() {
    this.$modal.show(JobStepDetailsModal, {
      script: this.script
    }, {
      height: 'auto'
    });
  }
}
</script>
