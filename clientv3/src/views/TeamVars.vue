<template>
  <div class="sg-container-p">
    <h2 class="is-size-4 subtitle">Shared variables for your team</h2>
    <VariableList :value="variableMap"
      @create="onVariableCreate"
      @remove="onVariableRemove" />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { BindStoreModel } from '../decorator';
import { StoreType } from '../store/types';
import { TeamVar } from '../store/teamVar/types';
import { SgAlert, AlertPlacement } from '../store/alert/types';
import { showErrors } from '../utils/ErrorHandler';
import { VariableList } from '@/components/runtimeVariable';
import { Variable, VariableMap } from '@/components/runtimeVariable/types';

@Component({
  components: { VariableList },
})
export default class TeamVars extends Vue { 
  @BindStoreModel({ selectedModelName: 'models', storeType: StoreType.TeamVariableStore })
  private teamVars: TeamVar[];

  private created () {
    // load all teams when the component is mounted - they are small objects
    this.$store.dispatch(`${StoreType.TeamVariableStore}/fetchModelsByFilter`);
  }

  private get variableMap (): VariableMap {
    return this.teamVars.reduceRight((map: VariableMap, teamVar: TeamVar) => {
      map[teamVar.name] = {
        sensitive: teamVar.sensitive,
        format: teamVar.format,
        value: teamVar.value,
      };

      return map;
    }, {});
  }

  public async onVariableCreate (variable: Variable): Promise<void> {
    try {
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Creating team variable`, AlertPlacement.FOOTER));
      await this.$store.dispatch(`${StoreType.TeamVariableStore}/save`, {
        sensitive: variable.sensitive,
        format: variable.format,
        value: variable.value,
        name: variable.key,
      });

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Team variable created`, AlertPlacement.FOOTER));
    } catch(err){
      console.error(err);
      showErrors(`Error saving the team variable`, err);
    } finally {
    }
  }

  public async onVariableRemove (variable: Variable): Promise<void> {
    try {
      const teamVar = this.teamVars.find(teamVar => teamVar.name === variable.key);
      await this.$store.dispatch(`${StoreType.TeamVariableStore}/delete`, teamVar);

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Team variable deleted`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors(`Error deleting the team variable`, err);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

  table {
    border-width: 0;
    tr:nth-child(odd) {background: hsl(0, 0%, 98%)} // no idea why the bulma is-striped didn't work
  }

  td {
    border-width: 0 !important;
  }

  .button-spaced {
    margin-left: 12px;
  }
</style>
