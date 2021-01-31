 <template>
  <table class="table">
    <tr class="tr">
      <td class="td">
        Access Key ID
      </td>
      <td class="td">
        Description
      </td>
      <td class="td">
        Created By
      </td>
      <td class="td">
        Expires
      </td>
      <td class="td">
        Last Used
      </td>
      <td class="td">
        Status
      </td>
      <td class="td">
        x
      </td>
    </tr>
    <tr class="tr">
      <td colspan="7">
        <button class="button">Create Access Key</button>
      </td>
    </tr>
  </table>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { BindSelected, BindSelectedCopy } from '../decorator';
import { StoreType } from '../store/types';
import { Team } from '../store/team/types';
import { SgAlert, AlertPlacement, AlertCategory } from '../store/alert/types';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { showErrors } from '../utils/ErrorHandler';
import axios from 'axios';

@Component({
  components: { ValidationProvider, ValidationObserver }
})
export default class AccessKeysGrid extends Vue { 
  
  
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
