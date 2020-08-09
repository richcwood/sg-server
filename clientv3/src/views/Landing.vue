<template>
  <div style="text-align: center;">



    <div v-if="page === 'getStarted'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Let's get started with Saas Glue
            </h1>
          </div>
        </div>
      </section>

      <div class="centered-flex">
        <div class="box" style="min-width: 400px; cursor: pointer;" @click="onGetStartedLoginClicked">
          Existing customers -><br>
          Login
        </div>
        <div class="box" style="min-width: 400px; cursor: pointer;" @click="onGetStartedEnterEmailClicked">
          I'm new to Saas Glue -><br>
          Create an account or join a team
        </div>
      </div>
    </div>



    <div v-if="page === 'warnUserAlreadyExists'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              The email {{emailAddress}} is in use.<br> Please login
            </h1>
          </div>
        </div>
      </section>
      <div>
        <a @click.prevent="onTryLoginAgainClicked">Go to login</a>
      </div>
    </div>



    <div v-if="page === 'findTeam'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Find your Saas Glue team
            </h1>
          </div>
        </div>
      </section>
      <div>
        We'll send you an email to confirm your address and find existing teams you can join.
      </div>
      <div class="centered-flex">
          <div class="field">
            <input class="input" ref="emailAddress" style="width: 300px;" type="text" placeholder="Your email address" v-model="emailAddress" v-on:keyup.enter="onConfirmEmailClicked">
          </div>
          <div class="field">
            <button class="button is-primary" style="margin-left: -210px;" @click="onConfirmFindTeamEmailClicked">Confirm</button>
          </div>
        </div>
    </div>



    <div v-if="page === 'enterEmail'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Get started with Saas Glue. 
              <br>First enter your email
            </h1>
          </div>
        </div>
      </section>

      <div class="centered-flex">
        <div class="field">
          <input class="input" ref="emailAddress" style="width: 300px;" type="text" placeholder="Your email address" v-model="emailAddress" v-on:keyup.enter="onConfirmEmailClicked">
        </div>
        <div class="field">
          <button class="button is-primary" style="margin-left: -210px;" @click="onConfirmEmailClicked">Confirm</button>
        </div>
      </div>
    </div>



    <div v-if="page === 'checkEmail'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Check your email!
            </h1>
          </div>
        </div>
      </section>

      <div class="centered-flex">
        <div style="max-width: 400px; margin-bottom: 25px; font-weight: 700;">
          We've sent a 6-digit confirmation code to {{emailAddress}}. 
          <br><br>It will expire shortly, so enter it soon.
        </div>
        <div class="field">
          <input class="input confirm-letter" ref="confirmLetter1" type="text" v-model="confirmLetter1" @keyup="onConfirmLetterKeyUp(1)">
          <input class="input confirm-letter" ref="confirmLetter2" type="text" v-model="confirmLetter2" @keyup="onConfirmLetterKeyUp(2)">
          <input class="input confirm-letter" ref="confirmLetter3" type="text" v-model="confirmLetter3" @keyup="onConfirmLetterKeyUp(3)">
          <input class="input confirm-letter" ref="confirmLetter4" type="text" v-model="confirmLetter4" @keyup="onConfirmLetterKeyUp(4)">
          <input class="input confirm-letter" ref="confirmLetter5" type="text" v-model="confirmLetter5" @keyup="onConfirmLetterKeyUp(5)">
          <input class="input confirm-letter" ref="confirmLetter6" type="text" v-model="confirmLetter6" @keyup="onConfirmLetterKeyUp(6)">
        </div>
      </div>
    </div>



    <div v-if="page === 'emailConfirmFailed'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Email confirmation failed
            </h1>
          </div>
        </div>
      </section>
      <div>
        <a @click.prevent="onBackToEmailConfirmPageClicked">Back to email confirmation page</a>
      </div>
    </div>



    <div v-if="page === 'createAccount'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Create your Saas Glue account
            </h1>
          </div>
        </div>
      </section>

      <div class="centered-flex">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 200px;">Full Name</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" ref="name" type="text" style="width: 250px;" v-model="name">
              </p>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 200px;">Company Name</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" type="text" style="width: 250px;" v-model="companyName">
              </p>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 200px;">Password</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" type="text" style="width: 250px;" v-model="password" v-on:keyup.enter="onCreateAccountClicked">
              </p>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 200px;"></label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <button class="button is-primary" style="margin-left: -110px;" @click="onCreateAccountClicked">Create Account</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>



    <div v-if="page === 'joinTeam' && invitedOrgsCount > 0">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              You are invited to these Saas Glue teams
            </h1>
          </div>
        </div>
      </section>
      <div class="invitations">
        <table>
          <tr v-if="hasLocalStorageInvitedOrgToken">
            <td class="invitation-td" style="font-weight: 700;">{{localStorageInvitedOrgName}}</td>
            <td class="invitation-td"><button class="button is-primary" @click="onAcceptGenericInviteClicked">Accept Invitation</button></td>
          </tr>

          <tr v-for="orgIdInvited of orgIdsInvitedMinusLocalStorage" v-bind:key="orgIdInvited._orgId">
            <td class="invitation-td">{{getOrg(orgIdInvited._orgId).name}}</td>
            <td class="invitation-td"><button class="button" @click="onAcceptInvitationClicked(orgIdInvited._orgId)">Accept Invitation</button></td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 50px; font-weight: 700;">
              Not seeing your team?  Contact the team leader to request an invite.
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 30px;">
              Or, <a @click.prevent="onCreateTeamLinkClicked">create a new team</a>
            </td>
          </tr>
        </table>
      </div>
    </div>



    <div v-if="page === 'acceptedInvitationSuccess'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Welcome to Saas Glue.  You've succefully joined your team.
            </h1>
          </div>
        </div>
      </section>
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="margin-right:150px; margin-top:20px;">
          <a @click.prevent="onClickedStartUsingSaasGlue">Start using Saas Glue</a>
        </div>
      </div>
    </div>



    <div v-if="page === 'joinTeam' && invitedOrgsCount === 0">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Join a Saas Glue team
            </h1>
          </div>
        </div>
      </section>
    
      <div class="invitations">
        <table>
          <tr>
            <td style="padding-top: 30px;">
              To use Saas Glue you need to be part of a team
            </td>
          </tr>
          <tr>
            <td style="padding-top: 30px;">
              <a @click.prevent="onCreateTeamLinkClicked">Create a new team</a>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 50px;">
              Not seeing your existing team? <br> Contact the team leader to request an invite and refresh this page.
            </td>
          </tr>
        </table>
      </div>
    </div>



    <div v-if="page === 'createTeam'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Create a new team
            </h1>
          </div>
        </div>
      </section>
      <div class="centered-flex">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 250px;">What is the name of your team?</label>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" ref="teamName" type="text" style="width: 250px;" v-model="teamName" v-on:keyup.enter="onCreateTeamClicked">
              </p>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-body">
            <div class="field">
              <p class="control">
                <button class="button is-primary" style="margin-left: -125px;" @click="onCreateTeamClicked">Create Team</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>



    <div v-if="page === 'addTeamMembers'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Set up your team
            </h1>
          </div>
        </div>
      </section>
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="font-weight: 700;">
          Who else is on your team?
        </div>
        <div v-for="teammate of teammates" v-bind:key="teammate.id">
          <input class="input" style="margin-top: 15px; width: 250px;" type="text" placeholder="team_member@something.com" v-model="teammate.email">
        </div>
        <div style="margin-left:80px; margin-top:10px;">
          <a @click.prevent="onAddMoreTeammatesClicked">+ add more teammates</a>
        </div>
        <div style="margin-right:100px; margin-top:20px;">
          <button class="button is-primary" @click="onAddTeammatesClicked">Add Teammates</button>
        </div>
        <div style="margin-right:150px; margin-top:20px;">
          <a @click.prevent="onSkipTeammatesClicked">Skip for now</a>
        </div>
      </div>
    </div>



    <div v-if="page === 'addTeamMembersSuccess'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Invitation emails have been sent to your teammates.
            </h1>
          </div>
        </div>
      </section>
      <div>
        <a @click.prevent="onClickedStartUsingSaasGlue">Start using Saas Glue</a>
      </div>
    </div>


    
    <div v-if="page === 'login'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Log in to your Saas Glue account
            </h1>
          </div>
        </div>
      </section>

      <div class="centered-flex">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 200px;">Email</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" ref="emailAddress" type="text" style="width: 250px;" v-model="emailAddress">
              </p>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 200px;">Password</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" type="password" style="width: 250px;" v-model="password" v-on:keyup.enter="onLoginClicked">
              </p>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 200px;"></label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <button class="button is-primary" style="margin-left: -125px;" @click="onLoginClicked">Login</button>
              </p>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 200px;"></label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
              <a style="margin-left: -125px;" @click.prevent="onForgotPasswordClicked">Forgot password?</a>     
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>



    <div v-if="page === 'loginFailed'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Sorry but the login failed.
            </h1>
          </div>
        </div>
      </section>
      <div>
        <a @click.prevent="onTryLoginAgainClicked">Try again</a>
      </div>
    </div>



    <div v-if="page === 'passwordReset'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Password reset
              <br>We'll send you an email
            </h1>
          </div>
        </div>
      </section>

      <div class="centered-flex">
        <div class="field">
          <input class="input" ref="emailAddress" style="width: 300px;" type="text" placeholder="Your email address" v-model="emailAddress" v-on:keyup.enter="onConfirmEmailClicked">
        </div>
        <div class="field">
          <button class="button is-primary" style="margin-left: -235px;" @click="onResetPasswordClicked">Reset</button>
        </div>
      </div>
    </div>



    <div v-if="page === 'passwordResetSent'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Email sent. <br>  Please check your email and follow the instructions.
            </h1>
          </div>
        </div>
      </section>
    </div>



    <div v-if="page === 'passwordResetUpdatePassword'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Password Reset
              <br> Enter your new password.
            </h1>
          </div>
        </div>
      </section>

      <div class="centered-flex">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 200px;">Password</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" type="text" style="width: 250px;" v-model="password" v-on:keyup.enter="onCreateAccountClicked" placeholder="Your new password">
              </p>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" style="width: 200px;"></label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <button class="button is-primary" style="margin-left: -100px;" @click="onChangePasswordClicked">Change Password</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>



    <div v-if="page === 'passwordUpdateSuccess'">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              Password Updated <br> Your password has been updated.
            </h1>
          </div>
        </div>
      </section>
      <div style="margin-right:150px; margin-top:20px;">
        <a @click.prevent="onClickedStartUsingSaasGlue">Start using Saas Glue.</a>
      </div>
      
    </div>



  </div>
</template>

<script lang="ts">
  import { Component, Vue } from 'vue-property-decorator';
  import { BindStoreModel } from '@/decorator';
  import { StoreType } from '@/store/types';
  import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
  import { isUserReadyToUseApp, parseJwt } from '@/store/security';
  import axios from 'axios';
  import Cookies from 'js-cookie';
  import randomId from '../utils/RandomId';
  import { showErrors } from '@/utils/ErrorHandler';

  @Component
  export default class Landing extends Vue { 

    private page = 'getStarted';
    private emailAddress: string|null = '';
    private hasLoggedIn = false;
    private hasCreatedSGTeam = localStorage.getItem('sg_has_created_team');
    private confirmLetter1: string|null = null;
    private confirmLetter2: string|null = null;
    private confirmLetter3: string|null = null;
    private confirmLetter4: string|null = null;
    private confirmLetter5: string|null = null;
    private confirmLetter6: string|null = null;

    private invitedTeams = [];//[{name: 'Team One'}, {name: 'Team Two might be a long name'}];
    private name = null;
    private companyName = null;
    private password: string|null = null;
    private teamName = null;
    private teammates = [{id: randomId(), email: ''}, {id: randomId(), email: ''}, {id: randomId(), email: ''}];

    @BindStoreModel({storeType: StoreType.SecurityStore, selectedModelName: 'user'})
    private user: any;

    private mounted(){
      this.emailAddress = localStorage.getItem('sg_email');
      this.hasLoggedIn = !!localStorage.getItem('sg_has_logged_in');

      if(this.user){
        this.redirectToUserLoggedInPage();
      }
      else {
        if( sessionStorage.getItem('sg_reset_password_token') && 
            sessionStorage.getItem('sg_reset_password_user_id')){
          this.page = 'passwordResetUpdatePassword';
        }
        else if(this.emailAddress){
          if(this.hasLoggedIn){
            this.page = 'login';

            this.$nextTick(() => {
              (<any>this.$refs['emailAddress']).focus();
            });
          }
          else {
            this.page = 'getStarted';
          }
        }
        else {
          this.page = 'getStarted';
        }
      }
    }

    private redirectToUserLoggedInPage(){
      if(this.user){
        if(!this.user.name){
          this.page = 'createAccount'; 
        }
        else {
          this.page = 'joinTeam';
        }
      }
      else {
        this.page = 'getStarted';
      }
    }

    private onGetStartedLoginClicked(){
      this.page = 'login';

      this.$nextTick(() => {
        (<any>this.$refs['emailAddress']).focus();
      });
    }

    private onGetStartedEnterEmailClicked(){
      const localStorageInvitedOrgToken = localStorage.getItem('sg_invited_org_token');

      if( localStorageInvitedOrgToken &&
          this.localStorageInvitedOrg_EmailConfirmed && 
          this.localStorageInvitedOrg_Email ){
        Cookies.set('Auth', 'Bearer ' + localStorageInvitedOrgToken);
        const rawUser = parseJwt(localStorageInvitedOrgToken);
        this.$store.commit('securityStore/setUser', rawUser);
        this.page = 'createAccount';
      }
      else {
        this.page = 'enterEmail';
      }
    }

    private async onConfirmEmailClicked(){
      if(this.emailAddress){
        // cache the email they entered
        localStorage.setItem('sg_email', this.emailAddress);

        try {
          const signupResult = await axios.post('/api/v0/signup', {email: this.emailAddress});
          const user = signupResult.data.data;

          if(user.confirmedEmailExists){
            this.page = 'warnUserAlreadyExists';
          }
          else {
            this.page = 'checkEmail';
            this.$nextTick(() => {
              (<any>this.$refs['confirmLetter1']).focus();
            });
          }
        }
        catch(err) {
          console.error(err);
          showErrors(`Error sending a confirmation email`, err);
        }
      }
    }

    private async onConfirmLetterKeyUp(index: number){
      if(index < 6){
        const nextLetterField: any = this.$refs[`confirmLetter${index+1}`];
        nextLetterField.focus();
      }

      if(    this.confirmLetter1 && this.confirmLetter2 && this.confirmLetter3 
          && this.confirmLetter4 && this.confirmLetter5 && this.confirmLetter6){

        try {
          const emailConfirmCode = `${this.confirmLetter1}${this.confirmLetter2}${this.confirmLetter3}${this.confirmLetter4}${this.confirmLetter5}${this.confirmLetter6}`;
          const confirmResult = await axios.put('/api/v0/signup/confirm', {email: this.emailAddress, emailConfirmCode});
          const user = confirmResult.data.data; // this is the new user account
          
          this.$store.commit('securityStore/setUser', user);

          this.page = 'createAccount';
          this.$nextTick(() => {
            (<any>this.$refs['name']).focus();
          });
        }
        catch(err) {
          console.error(err);
          this.confirmLetter1 = this.confirmLetter2 = this.confirmLetter3 =
          this.confirmLetter4 = this.confirmLetter5 = this.confirmLetter6 = '';
          this.page = 'emailConfirmFailed';
        }
      }
    }

    private onBackToEmailConfirmPageClicked(){
      this.page = 'enterEmail';

      this.$nextTick(() => {
        (<any>this.$refs['emailAddress']).focus();
      });
    }

    private async onCreateAccountClicked(){
      try {
        const detailsResult = await axios.put(`api/v0/signup/details/${this.user.id}`, {
          password: this.password,
          name: this.name,
          companyName: this.companyName
        });
        this.password = ''; // clear this out

        const user = detailsResult.data.data; // this is the new user account with updated info  
        this.$store.commit('securityStore/setUser', user);
        localStorage.setItem('sg_has_logged_in', 'true');

        if(this.invitedOrgsCount > 0){
          this.page = 'joinTeam';
        }
        else {
          this.page = 'createTeam';
          this.$nextTick(() => {
            (<any>this.$refs['teamName']).focus();
          });
        }
      }
      catch(err) {
        console.error(err);
        showErrors(`Error setting up account.`, err);
      }
    }

    private onCreateTeamLinkClicked(){
      this.page = 'createTeam';
      this.$nextTick(() => {
        (<any>this.$refs['teamName']).focus();
      });
    }

    private async onCreateTeamClicked(){
      try {
        const createTeamResult = await axios.post('api/v0/org', {
            name: this.teamName,
            isActive: true,
            rmqPassword: `${this.teamName}_rmqpassword` // todo is this correct?
          },
          {
            headers: {
              userId: this.user.id
            }
          }
        );

        const newOrg = createTeamResult.data.data;
        this.$store.commit('orgStore/addModels', [newOrg]);
        this.user.orgIds.push(newOrg.id); // not sure if browser push will conflict with this
        this.$store.commit('orgStore/select', newOrg);
        this.page = 'addTeamMembers';
      }
      catch(err){
        console.error(err);
        showErrors(`Error setting up the team.`, err);
      }
    }

    private onAddMoreTeammatesClicked(){
      this.teammates.push({id: randomId(), email: ''});
    }

    private async onAddTeammatesClicked(){
      try {
        const teammateEmails: any = [];
        this.teammates.map(teammate => teammateEmails.push(teammate.email));
        const invitePromises = [];

        for(const email of teammateEmails){
          if(email){ // todo - better validation
            invitePromises.push(axios.post('api/v0/invite/direct', {
              email,
              _userId: this.user.id
            }));
          }
        }

        await Promise.all(invitePromises);

        this.page = 'addTeamMembersSuccess';
      }
      catch(err){
        console.error(err);
        showErrors(`Error setting up the team.`, err);
      }
    }

    private onSkipTeammatesClicked(){
      this.$store.dispatch('securityStore/startApp');
    }

    private async onAcceptInvitationClicked(orgId: string){
      try {
        const acceptInvitationResult = await axios.put(`api/v0/user/${this.user.id}/join/${orgId}`);
        const user = acceptInvitationResult.data.data; // this is the user account with updated info  
        this.$store.commit('securityStore/setUser', user);

        if(this.invitedOrgsCount === 0){
          this.page = 'acceptedInvitationSuccess';
        }
      }
      catch(err){
        console.error(err);
        showErrors(`Error joining the team.`, err);
      }
    }

    private async onLoginClicked(){
      if(!this.emailAddress){
        this.$store.dispatch('alertStore/addAlert', new SgAlert(`Email was not specified.`, AlertPlacement.WINDOW, AlertCategory.ERROR));
        return;
      }

      localStorage.setItem('sg_email', this.emailAddress);
      if(await this.$store.dispatch('securityStore/login', {email: this.emailAddress, password: this.password})){
        if(isUserReadyToUseApp()){
          this.$store.dispatch('securityStore/startApp');
        }
        else {
          this.redirectToUserLoggedInPage();
        }
      }
      else {
        this.page = 'loginFailed';
      }
      this.password = '';
    }

    private onTryLoginAgainClicked(){
      this.page = 'login';

      this.$nextTick(() => {
        (<any>this.$refs['emailAddress']).focus();
      });
    }

    private loadedOrgs: any = {};
    // Immediately return a reactive object and load it async.  Once the real model 
    // is loaded the UI will be reactive
    private getOrg(orgId: string){
      if(!this.loadedOrgs[orgId]){
        Vue.set(this.loadedOrgs, orgId, {id: orgId, name: '...'});

        (async () => {
          const org = await this.$store.dispatch('orgStore/fetchModel', orgId);
          this.loadedOrgs[orgId] = org;
        })();
      }

      return this.loadedOrgs[orgId];
    }

    private onClickedStartUsingSaasGlue(){
      this.$store.dispatch('securityStore/startApp');
    }

    private get orgIdsInvitedMinusLocalStorage(){
      if(this.user && this.user.orgIdsInvited){
        if(this.hasLocalStorageInvitedOrgToken){
          return this.user.orgIdsInvited.filter((orgInvite:any) => orgInvite._orgId !== this.localStorageInvitedOrgId);
        }
        else {
          return this.user.orgIdsInvited;
        }
      }
      else {
        return [];
      }
    }

    private get invitedOrgsCount(){
      let count = this.orgIdsInvitedMinusLocalStorage.length;

      if(this.hasLocalStorageInvitedOrgToken){
        count++;
      }

      return count;
    }

    private get localStorageInvitedOrgName(){
      const localStorageInvitedOrgToken = localStorage.getItem('sg_invited_org_token');
      if(localStorageInvitedOrgToken){
        const invitedOrgToken = parseJwt(localStorageInvitedOrgToken);
        return invitedOrgToken.InvitedOrgName;
      }
      else {
        return '';
      }
    }

  private get localStorageInvitedOrgId(){
    const localStorageInvitedOrgToken = localStorage.getItem('sg_invited_org_token');
    if(localStorageInvitedOrgToken){
      const invitedOrgToken = parseJwt(localStorageInvitedOrgToken);
      return invitedOrgToken.InvitedOrgId;
    }
    else {
      return '';
    }
  }

  private get localStorageInvitedOrg_EmailConfirmed(){
    const localStorageInvitedOrgToken = localStorage.getItem('sg_invited_org_token');
    if(localStorageInvitedOrgToken){
      const invitedOrgToken = parseJwt(localStorageInvitedOrgToken);
      return invitedOrgToken.emailConfirmed;
    }
    else {
      return false;
    }
  }

  private get localStorageInvitedOrg_Email(){
    const localStorageInvitedOrgToken = localStorage.getItem('sg_invited_org_token');
    if(localStorageInvitedOrgToken){
      const invitedOrgToken: any = parseJwt(localStorageInvitedOrgToken);
      return invitedOrgToken.email;
    }
    else {
      return null;
    }
  }

  private get hasLocalStorageInvitedOrgToken(){
    return localStorage.getItem('sg_invited_org_token') !== null;
  }

  private async onAcceptGenericInviteClicked(){
    try {
      const orgIdInviteToken = localStorage.getItem('sg_invited_org_token');
      if(orgIdInviteToken){
        const orgIdInviteJwt = parseJwt(orgIdInviteToken);
        let user;

        if(orgIdInviteJwt.id){
          // this is a direct invite (id is the user id for a direct invitation)
          const acceptedInviteResult = await axios.get(`/invite/${orgIdInviteJwt.id}/${orgIdInviteJwt.InvitedOrgId}/${orgIdInviteToken}`);
          user = acceptedInviteResult.data.data; // this is the new user account with updated info
        }
        else {
          // a shareable generic invitation link
          const acceptedInviteResult = await axios.get(`api/v0/join/shared_invite/${orgIdInviteToken}`);
          user = acceptedInviteResult.data.data; // this is the new user account with updated info  
        }

        this.$store.commit('securityStore/setUser', user);
        localStorage.removeItem('sg_invited_org_token');
        this.page = 'acceptedInvitationSuccess';
      }
    }
    catch(err){
      console.error(err);
      showErrors(`Error joining the team.`, err);
    }
  }

  private onForgotPasswordClicked(){
    this.page = 'passwordReset';

    this.$nextTick(() => {
      (<any>this.$refs['emailAddress']).focus();
    });
  }

  private async onResetPasswordClicked(){
    try {
      const acceptedInviteResult = await axios.post(`api/v0/forgot`, {email: this.emailAddress});
      this.page = 'passwordResetSent';
    }
    catch(err){
      console.error(err);
      showErrors(`Error resetting your password.`, err);
    }
  }

  private async onChangePasswordClicked(){
    try {
      const changedPasswordResult = await axios.post(`api/v0/reset`, { 
        token: sessionStorage.getItem('sg_reset_password_token'),
        id: sessionStorage.getItem('sg_reset_password_user_id'),
        password: this.password
      });

      const user = changedPasswordResult.data.data; // this is the new user account with updated info  
      this.$store.commit('securityStore/setUser', user);

      this.page = 'passwordUpdateSuccess';
    }
    catch(err){
      console.error(err);
      showErrors(`Error resetting your password.`, err);
    }
    finally {
      sessionStorage.removeItem('sg_reset_password_token');
      sessionStorage.removeItem('sg_reset_password_user_id');
      this.password = '';
    }
  }
}
</script>

<style lang="css" scoped>
  .centered-flex {
    display: flex; 
    align-items: center; 
    flex-direction: column; 
  }

  .confirm-letter {
    width: 55px; 
    font-size: 24px;
    margin-right: 10px;
  }

  .invitations {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .invitation-td {
    padding-right: 15px;
    padding-bottom: 15px;
    vertical-align: middle;
  }

</style>