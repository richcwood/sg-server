 <template>
  <div class="main" style="margin-left: 36px; margin-right: 12px;">

    <br>
    <h1 class="title">
      API Access Keys
    </h1>

    <tabs>
      <tab title="Agent Access Keys">
        <access-keys-grid/>
      </tab>
      <tab title="User Access Keys">
        <access-keys-grid/>
      </tab>
    </tabs>

  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { Tabs, Tab } from 'vue-slim-tabs';
import { BindSelected, BindSelectedCopy } from '../decorator';
import { StoreType } from '../store/types';
import { Team } from '../store/team/types';
import { SgAlert, AlertPlacement, AlertCategory } from '../store/alert/types';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { showErrors } from '../utils/ErrorHandler';
import AccessKeysGrid from '../components/AccessKeysGrid.vue';
import axios from 'axios';

@Component({
  components: { ValidationProvider, ValidationObserver, Tabs, Tab, AccessKeysGrid }
})
export default class AccessKeys extends Vue { 

  private mounted(){
    this.$store.dispatch(`${StoreType.AccessKeyStore}/fetchModelsByFilter`);
  }
  
  @BindSelected({storeType: StoreType.TeamStore})
  private selectedTeam!: Team;
  
  @BindSelectedCopy({storeType: StoreType.TeamStore})
  private selectedTeamCopy!: Team;

  private get hasTeamChanged(){
    return this.$store.state[StoreType.TeamStore].storeUtils.hasSelectedCopyChanged();
  } 

  private beforeDestroy(){
    // If there are any unsaved changes, just undo them to the copy
    if(this.hasTeamChanged){
      this.onCancelClicked();
    }
  } 

  private onCancelClicked(){
    // Just reselect the original job def
    this.$store.dispatch(`${StoreType.TeamStore}/select`, this.selectedTeam);
  }

  private async onSaveClicked(){
    try {
      if( ! await (<any>this.$refs.alertsValidationObserver).validate()){
        return;
      }

      await this.$store.dispatch(`${StoreType.TeamStore}/save`);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saved the team alerts`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors(`Error saving the team alerts`, err);
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

</style>
