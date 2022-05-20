<template>
  <div class="pt-5">
    <h1 class="title sg-container-px">API Access Keys</h1>
    <tabs>
      <tab class="sg-container-px" title="Agent Access Keys">
        <access-keys-grid :accessKeys="agentAccessKeys" :accessKeyType="AccessKeyType.AGENT" />
      </tab>
      <tab class="sg-container-px" title="User Access Keys">
        <access-keys-grid :accessKeys="userAccessKeys" :accessKeyType="AccessKeyType.USER" />
      </tab>
    </tabs>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Tabs, Tab } from "vue-slim-tabs";
import { BindSelected, BindSelectedCopy, BindStoreModel } from "../decorator";
import { StoreType } from "../store/types";
import { AccessKey, AccessKeyType } from "../store/accessKey/types";
import { SgAlert, AlertPlacement, AlertCategory } from "../store/alert/types";
import { ValidationProvider, ValidationObserver } from "vee-validate";
import { showErrors } from "../utils/ErrorHandler";
import AccessKeysGrid from "../components/AccessKeysGrid.vue";
import axios from "axios";

@Component({
  components: { ValidationProvider, ValidationObserver, Tabs, Tab, AccessKeysGrid },
})
export default class AccessKeys extends Vue {
  // Expose to template
  private readonly AccessKeyType = AccessKeyType;

  private mounted() {
    this.$store.dispatch(`${StoreType.AccessKeyStore}/fetchModelsByFilter`);
    this.$store.dispatch(`${StoreType.AccessRightStore}/fetchModelsByFilter`);
  }

  @BindStoreModel({ storeType: StoreType.AccessKeyStore, selectedModelName: "models" })
  private accessKeys!: AccessKey[];

  private get agentAccessKeys() {
    return this.accessKeys.filter((accessKey: AccessKey) => accessKey.accessKeyType === AccessKeyType.AGENT);
  }

  private get userAccessKeys() {
    return this.accessKeys.filter((accessKey: AccessKey) => accessKey.accessKeyType === AccessKeyType.USER);
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

::v-deep .vue-tablist {
  padding-left: 64px;
  padding-right: 64px;
}
</style>
