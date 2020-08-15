<template>
  <div>
    <section class="hero" style="text-align: center;">
      <div class="hero-body">
        <div class="container">
          <h1 class="title">
            Invite Teammates
          </h1>
        </div>
      </div>
    </section>
    <div v-if="showSuccessMessage" style="text-align: center;">
      Invitations have been sent to your team members.
    </div>
    <div v-else style="display: flex; flex-direction: column; align-items: center;">
      <div style="margin-bottom: 40px;">
        Team invite link: <a @click.prevent="onCopyInviteLinkClicked">Copy to clipboard</a>
        <input id="inviteLinkInput" :hidden="!isCopyingTeamInviteLink" style="opacity: .01;" type="text" v-model="selectedTeamInviteLink">
        <span :hidden="!showCopyLinkSuccess" style="margin-left: 10px;">Invite link copied</span>
        <br><br>
        Careful! Anyone who has this link can join your team!
      </div>
      
      <div style="font-weight: 700;">
        Who else is on your team?
      </div>
      
      <validation-observer ref="emailValidationObserver">
        <div v-for="teammate in teammates" v-bind:key="teammate.id">
          <validation-provider name="Team Email Address" rules="email" v-slot="{ errors }"> 
            <input class="input" style="margin-top: 15px; width: 250px;" type="text" placeholder="team_member@something.com" v-model="teammate.email">
            <template v-if="errors && errors.length > 0">
              <br>
              <span class="message validation-error is-danger">{{ errors[0] }}</span>
            </template>
          </validation-provider>
        </div>
      </validation-observer>

      <div style="margin-left:80px; margin-top:10px;">
        <a href="" @click.prevent="onAddMoreTeammatesClicked">+ add more teammates</a>
      </div>
      <div style="margin-right:100px; margin-top:20px;">
        <button class="button is-primary" @click="onAddTeammatesClicked">Add Teammates</button>
      </div>
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