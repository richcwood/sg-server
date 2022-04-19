<template>
  <div class="sg-container-p">
    <h2 class="is-size-4 subtitle has-text-weight-bold">Invite Teammates</h2>
    <div v-if="showSuccessMessage" class="ml-5">
      Invitations have been sent to your team members.
    </div>
    <div v-else class="is-flex is-flex-direction-column ml-5">
      <div class="block">
        Team invite link: <a href="#" @click.prevent="onCopyInviteLinkClicked">Copy to clipboard</a>
        <input id="inviteLinkInput" :hidden="!isCopyingTeamInviteLink" style="opacity: .01;" type="text" v-model="selectedTeamInviteLink">
        <span :hidden="!showCopyLinkSuccess" class="ml-3">Invite link copied</span>
        <br>
        Careful! Anyone who has this link can join your team!
      </div>

      <p class="has-text-weight-bold block">Who else is on your team?</p>

      <validation-observer tag="div" style="width: 250px" class="mb-3" ref="emailValidationObserver" v-slot="{ invalid }">
        <validation-provider v-for="teammate in teammates" :key="teammate.id" tag="div" class="field" name="Team Email Address" rules="email" v-slot="{ errors }"> 
          <div class="control">
            <input class="input" type="email" placeholder="team_member@something.com" v-model="teammate.email">
          </div>
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </validation-provider>

        <div class="field">
            <div class="control has-text-right">
            <a href="#" class="button is-ghost pr-0" @click.prevent="onAddMoreTeammatesClicked">+ add more teammates</a>
          </div>
        </div>
        <div class="field">
          <div class="control has-text-right">
            <button class="button is-primary" :disabled="invalid" @click="onAddTeammatesClicked">Add Teammates</button>
          </div>
        </div>
      </validation-observer>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { StoreType } from '@/store/types';
import { BindStoreModel } from '@/decorator';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import axios from 'axios';
import randomId from '@/utils/RandomId';
import { showErrors } from '@/utils/ErrorHandler';
import { ValidationProvider, ValidationObserver } from 'vee-validate';

@Component({
  components: { ValidationProvider, ValidationObserver }
})
export default class InviteTeammates extends Vue {
  private isCopyingTeamInviteLink = false;
  private showCopyLinkSuccess = false;
  private teammates = [{id: randomId(), email: ''}, {id: randomId(), email: ''}, {id: randomId(), email: ''}];
  
  @BindStoreModel({storeType: StoreType.TeamStore})
  private selectedTeam: any;

  @BindStoreModel({storeType: StoreType.SecurityStore, selectedModelName: 'user'})
  private user: any;
  private showSuccessMessage = false;

  private get selectedTeamInviteLink(){
    if(this.selectedTeam){
      return this.selectedTeam.inviteLink;
    }
    else {
      return '';
    }
  }

  private onAddMoreTeammatesClicked(){
    this.teammates.push({id: randomId(), email: ''});
  }

  private onCopyInviteLinkClicked(){
    this.isCopyingTeamInviteLink = true;
    this.$nextTick(() => {
      try {
        const copyLink = document.getElementById('inviteLinkInput');
        (<any>copyLink).select();
        (<any>copyLink).setSelectionRange(0, 99999); ///For mobile devices
        document.execCommand('copy');
        this.$store.dispatch('alertStore/addAlert', new SgAlert(`Invitation link copied to your clipboard`, AlertPlacement.FOOTER));
        this.showCopyLinkSuccess = true;
        setTimeout(() => {
          this.showCopyLinkSuccess = false;
        }, 2000);
      }
      finally {
        this.isCopyingTeamInviteLink = false;
      }
    });
  }

  private async onAddTeammatesClicked(){
    await await (<any>this.$refs['emailValidationObserver']).validate();

    const hasValidationErrors = await new Promise((resolve) => {
      this.$nextTick(() => {
        // stupid vee-validate made this hard to do
        if(document.getElementsByClassName('validation-error').length > 0){
          resolve(true);
        }
        else {
          resolve(false);
        }
      });
    });

    if(hasValidationErrors){
      return;
    }

    const teammateEmails = this.teammates.map(teammate => teammate.email).filter(email => email.trim());

    if(teammateEmails.length === 0){
      return;
    }

    try {
      const invitePromises:any = []; 
      
      for(const email of teammateEmails){
        if(email){ // todo - better validation
          invitePromises.push(axios.post('api/v0/invite/direct', {
            email,
            _userId: this.user.id
          }));
        }
      }

      await Promise.all(invitePromises);
      this.$store.dispatch('alertStore/addAlert', new SgAlert(`Invitations sent`, AlertPlacement.FOOTER));
      this.showSuccessMessage = true;
    }
    catch(err){
      console.error(err);
      showErrors(`Error inviting teammates.`, err);
    }
  }
}
</script>

<style scoped lang="scss">
  
</style>