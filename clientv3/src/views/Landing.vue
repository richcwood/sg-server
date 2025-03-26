<template>
  <div style="text-align: left;">


    <div>
      <div style="margin-left: 100px;">
        <router-link class="logo-container" to="/"> <img src="/SaasLogoRevised.svg" class="logo" style="height: 35px; margin-top: 12px;"> </router-link>
      </div>
      <div class="is-divider" style="margin-left: 100px; margin-top: 15px; max-width: 1200px;"></div>
    </div>


    <div v-if="page === 'getStarted'">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px;">
          Create your free account
        </div>
        <div v-if="hasLocalStorageInvitedTeamToken" style="margin-left: 30px; margin-top: 30px;">
          Create account to accept your invitation to join team <b>{{localStorageInvitedTeamName}}</b>.
        </div>
        <div style="margin-left: 30px;">
          <div id="login" style="margin-top: 30px;">
            <!-- <button id="login-css" @click="onLoginClicked" /> -->
            <button class="button is-rounded social-auth-google-button" style="width: 300px;" @click="onGoogleAuthClicked">
              Continue with Google
            </button>            
          </div>
          <div id="login" style="margin-top: 20px;">
            <!-- <button id="login-css" @click="onLoginClicked" /> -->
            <button class="button is-rounded social-auth-github-button" style="width: 300px;" @click="onGithubAuthClicked">
              Continue with GitHub
            </button>            
          </div>
          <div class="is-divider" data-content="Or" style="line-height: 24px; width: 300px;"></div>
          <div class="field">
            <input class="input is-rounded" ref="emailAddress" style="width: 300px;" type="text" placeholder="Your email address" v-model="emailAddress">
          </div>
          <div class="field">
            <vue-recaptcha ref="recaptcha" @verify="onConfirmEmailCaptchaVerify" sitekey="6LdX0a0bAAAAAJGoWHoP8bdoC8UB5RkiQEpCfzpG" :loadRecaptchaScript="true">
              <button class="button is-primary is-rounded" style="width: 300px; margin-top: 20px;"><b>Continue with Email</b></button>
            </vue-recaptcha>
          </div>
          <div style="margin-left: 3px; margin-top: 20px">
            By registering, you agree to our <a href="https://www.saasglue.com/terms-of-service.html" target="_blank"><b>Terms of Service</b></a> and <a href="https://www.saasglue.com/privacy-policy.html" target="_blank"><b>Privacy Policy</b></a>.
          </div>
          <div style="margin-top: 25px">
            Already have an account? <a @click="onGetStartedLoginClicked"><b>Log in</b></a>
          </div>
        </div>
      </div>
    </div>



    <div v-if="page === 'warnUserAlreadyExists'">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px;">
          The email {{emailAddress}} is in use.
        </div>
        <div style="margin-left: 30px;">
          <div style="display: flex; flex-direction: column; align-items: left;">
            <div style="margin-right:150px; margin-top:20px;">
              <a @click.prevent="onTryLoginAgainClicked">Go to login</a>
            </div>
          </div>
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
          <br><br>
          Don't forget to check your <span style="font-size: 24px;">spam</span> for the email.
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
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px;">
          Email confirmation failed
        </div>
        <div style="margin-left: 30px;">
          <div style="display: flex; flex-direction: column; align-items: left;">
            <div style="margin-right:150px; margin-top:20px;">
              <a @click.prevent="onBackToGetStartedPageClicked">Back to the signup page</a>
            </div>
          </div>
        </div>
      </div>
    </div>



    <div v-if="page === 'createAccount'">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px; margin-bottom: 20px;">
            Create your free account
        </div>

        <div class="field is-horizontal" style="margin-left: -100px;">
          <div class="field-label is-normal">
            <label class="label">Full Name</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" ref="name" type="text" style="width: 250px;" v-model="name">
              </p>
            </div>
          </div>
        </div>

        <div class="field is-horizontal" style="margin-left: -100px;">
          <div class="field-label is-normal">
            <label class="label">Business Name</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" type="text" style="width: 250px;" v-model="companyName">
              </p>
            </div>
          </div>
        </div>

        <div v-if="! oauthLogin" class="field is-horizontal" style="margin-left: -100px;">
          <div class="field-label is-normal">
            <label class="label">Password</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" type="password" style="width: 250px;" v-model="password" v-on:keyup.enter="onCreateAccountClicked">
              </p>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <p class="control">
            <button class="button is-primary" style="margin-top: 20px; margin-left: 30px;" @click="onCreateAccountClicked">Create Account</button>
          </p>
        </div>
      </div>
    </div>



    <div v-if="page === 'joinTeam' && invitedTeamsCount > 0">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px;">
          You are invited to these SaaSGlue teams
        </div>
        <div style="margin-left: 30px;">
          <div class="invitations" style="margin-top: 20px;">
            <table>
              <tr v-if="hasLocalStorageInvitedTeamToken">
                <td class="invitation-td" style="font-weight: 700; width: 10%;">{{localStorageInvitedTeamName}}</td>
                <td class="invitation-td"><button class="button is-primary" @click="onAcceptGenericInviteClicked">Accept Invitation</button></td>
              </tr>

              <tr v-for="teamIdInvited of teamIdsInvitedMinusLocalStorage" v-bind:key="teamIdInvited._teamId">
                <td class="invitation-td">{{getTeam(teamIdInvited._teamId).name}}</td>
                <td class="invitation-td"><button class="button" @click="onAcceptInvitationClicked(teamIdInvited._teamId)">Accept Invitation</button></td>
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
      </div>
    </div>



    <div v-if="page === 'acceptedInvitationSuccess'">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px;">
          Welcome to SaaSGlue. You've succefully joined your team.
        </div>
        <div style="margin-left: 30px;">
          <div style="display: flex; flex-direction: column; align-items: left;">
            <div style="margin-right:150px; margin-top:20px;">
              <a @click.prevent="onClickedStartUsingSaasGlue">Start using SaaSGlue</a>
            </div>
          </div>
        </div>
      </div>
    </div>



    <div v-if="page === 'joinTeam' && invitedTeamsCount === 0">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px;">
          Join a SaaSGlue team
        </div>
        <div style="margin-left: 30px;">
          <div class="invitations" style="margin-top: 20px;">
            <table>
              <tr>
                <td style="padding-top: 30px;">
                  To use SaaSGlue you need to be part of a team
                </td>
              </tr>
              <tr>
                <td style="padding-top: 30px;">
                  <a @click.prevent="onCreateTeamLinkClicked">Create a new team</a>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 50px;">
                  Not seeing your existing team? Contact the team leader to request an invite and refresh this page.
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>



    <div v-if="page === 'createTeam'">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px; margin-bottom: 20px;">
            What is the name of your team?
        </div>

        <div class="field">
          <p class="control">
            <input class="input" ref="teamName" type="text" style="margin-left: 30px; width: 250px;" v-model="teamName" v-on:keyup.enter="onCreateTeamClicked">
          </p>
        </div>

        <div class="field is-horizontal">
          <p class="control">
            <button class="button is-primary" style="margin-left: 30px; margin-top: 20px;" @click="onCreateTeamClicked">Create Team</button>
          </p>
        </div>
      </div>
    </div>



    <div v-if="page === 'addTeamMembers'">
      <div style="font-weight: 700; font-size: 32px; margin-top: 20px; margin-bottom: 20px; margin-left: 100px;">
          Set up your team
      </div>
      <div style="display: flex; flex-direction: column; align-items: left; margin-left: 130px;">
        <div style="font-weight: 700;">
          Who else is on your team?
        </div>
        <div v-for="teammate of teammates" v-bind:key="teammate.id">
          <input class="input" style="margin-top: 15px; width: 250px;" type="text" placeholder="team_member@something.com" v-model="teammate.email">
        </div>
        <div style="margin-left:80px; margin-top:10px;">
          <a @click.prevent="onAddMoreTeammatesClicked">+ add more teammates</a>
        </div>
        <div style="margin-top:20px;">
          <button class="button is-primary" @click="onAddTeammatesClicked">Add Teammates</button>
        </div>
        <div style="margin-top:20px;">
          <a @click.prevent="onClickedStartUsingSaasGlue">Skip for now</a>
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
        <a @click.prevent="onClickedStartUsingSaaSGlue">Start using SaaSGlue</a>
      </div>
    </div>


    
    <div v-if="page === 'login'">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px;">
          Log in to your SaaSGlue account
        </div>
          <!-- <button id="login-css" @click="onLoginClicked" /> -->
        <div style="margin-left: 30px;">
          <div id="login" style="margin-top: 30px;">
            <!-- <button id="login-css" @click="onLoginClicked" /> -->
            <button class="button is-rounded social-auth-google-button" style="width: 300px;" @click="onGoogleAuthClicked">
              Continue with Google
            </button>            
          </div>
          <div id="login" style="margin-top: 20px;">
            <!-- <button id="login-css" @click="onLoginClicked" /> -->
            <button class="button is-rounded social-auth-github-button" style="width: 300px;" @click="onGithubAuthClicked">
              Continue with GitHub
            </button>            
          </div>
          <div class="is-divider" data-content="Or" style="line-height: 24px; width: 300px;"></div>

          <div class="field is-horizontal">
            <div class="field-body">
              <div class="field">
                <p class="control">
                  <input class="input" ref="emailAddress" placeholder="Email address" type="text" style="width: 250px;" v-model="emailAddress">
                </p>
              </div>
            </div>
          </div>

          <div class="field is-horizontal">
            <div class="field-body">
              <div class="field">
                <p class="control">
                  <input class="input" type="password" placeholder="Password" style="width: 250px;" v-model="password" v-on:keyup.enter="onLoginClicked">
                </p>
              </div>
            </div>
          </div>

          <!-- <div class="is-horizontal">
            <input type="checkbox" id="cboxRememberMe" v-model="rememberMe">
            <label for="cboxRememberMe" style="margin-left: 10px;">Remember me</label>
          </div> -->

          <div class="is-horizontal">
            <div class="field-label is-normal">
              <label class="label" style="width: 200px;"></label>
            </div>
            <div class="field" style="margin-top: 12px;">
              <p class="control">
                <button class="button is-primary" @click="onLoginClicked">Login</button>
              </p>
            </div>
          </div>

          <div class="is-horizontal">
            <div class="field-label is-normal">
              <label class="label" style="width: 200px;"></label>
            </div>
            <div class="field">
              <p class="control" style="margin-top: 12px;">
                <a @click.prevent="onForgotPasswordClicked">Forgot password?</a>     
              </p>
              <p class="control" style="margin-top: 12px;">
                Don't have an account? 
                <a @click="page = 'getStarted'"><b>Sign up</b></a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>



    <div v-if="page === 'loginFailed'">
      <div style="font-weight: 700; font-size: 32px; margin-top: 20px; margin-bottom: 20px; margin-left: 100px;">
        Sorry but the login failed.
      </div>
      <div style="display: flex; flex-direction: column; align-items: left; margin-left: 130px;">
        <div class="field">
          <p class="control" style="margin-top: 12px;">
            <a @click.prevent="onTryLoginAgainClicked">Try again</a>
          </p>
        </div>
      </div>
    </div>



    <div v-if="page === 'passwordReset'">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px;">
          Reset your password
        </div>
        <div style="margin-left: 30px;">
          <div style="margin-top: 30px;">
            Enter your email address and we will send you a password reset link.
          </div>
          <div class="field">
            <input class="input" ref="emailAddress" style="width: 300px; margin-top: 20px;" type="text" placeholder="Your email address" v-model="emailAddress" v-on:keyup.enter="onConfirmEmailClicked">
          </div>
          <div class="field">
            <button class="button is-primary" style="margin-top: 20px;" @click="onResetPasswordClicked">Send password reset email</button>
          </div>
          <div class="field" style="margin-top: 20px;">
            <p class="control">
              Back to
              <a @click="page = 'login'"><b>login</b></a>
            </p>
          </div>
        </div>
      </div>
    </div>



    <div v-if="page === 'passwordResetSent'">
      <div style="font-weight: 700; font-size: 32px; margin-top: 20px; margin-left: 100px;">
        Password reset link sent to your email
      </div>
      <div style="margin-left:100px; margin-top:20px; margin-left: 130px; font-weight: 700;">
        Please check your email and follow the instructions. Don't forget to check your spam folder.
      </div>
    </div>



    <div v-if="page === 'passwordResetUpdatePassword'">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px;">
            Password Reset
        </div>
        <div style="margin-left: 30px;">
          <div style="margin-top: 30px;">
            Enter your new password.
          </div>

          <div class="field is-horizontal" style="margin-left: -130px; margin-top: 30px;">
            <div class="field-label is-normal">
              <label class="label">Password</label>
            </div>
            <div class="field-body">
              <div class="field">
                <p class="control">
                  <input class="input" type="password" style="width: 250px;" v-model="password" v-on:keyup.enter="onCreateAccountClicked" placeholder="Your new password">
                </p>
              </div>
            </div>
          </div>

          <div class="field is-horizontal" style="margin-left: -130px; margin-top: 30px;">
            <div class="field-label is-normal">
              <label class="label"></label>
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
    </div>



    <div v-if="page === 'passwordUpdateSuccess'">
      <div class="left-flex">
        <div style="font-weight: 700; font-size: 32px; margin-top: 20px;">
          Your password has been updated.
        </div>
        <div style="margin-left: 30px;">
          <div style="display: flex; flex-direction: column; align-items: left;">
            <div style="margin-right:150px; margin-top:20px;">
              <a @click.prevent="onClickedStartUsingSaasGlue">Start using SaaSGlue</a>
            </div>
          </div>
        </div>
      </div>
    </div>



  </div>
</template>

<script lang="ts">
  import { Component, Vue } from 'vue-property-decorator';
  import { BindStoreModel } from '../decorator';
  import { StoreType } from '../store/types';
  import { User } from '../store/user/types';
  import { SgAlert, AlertPlacement, AlertCategory } from '../store/alert/types';
  import { isUserReadyToUseApp, parseJwt, getAuthJwtCookie } from '../store/security';
  import axios from 'axios';
  import Cookies from 'js-cookie';
  import randomId from '../utils/RandomId';
  import { showErrors } from '../utils/ErrorHandler';
  import VueRecaptcha from 'vue-recaptcha';

  @Component({
    components: {
      VueRecaptcha
    }
  })
  export default class Landing extends Vue { 

    private page = 'getStarted';
    private emailAddress: string|null = '';
    private hasLoggedIn = false;
    private oauthLogin = false;
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
    private robot: boolean = true;
    private rememberMe: boolean = true;

    @BindStoreModel({storeType: StoreType.SecurityStore, selectedModelName: 'user'})
    private user: User;

    private mounted(){
      this.emailAddress = localStorage.getItem('sg_email');
      this.hasLoggedIn = !!localStorage.getItem('sg_has_logged_in');

      if(localStorage.getItem('oauth_cb')){
        this.oauthLogin = true;
        const oauthResult = JSON.parse(localStorage.getItem('oauth_cb'));
        // console.log('Landing -> mounted -> 1 -> ', oauthResult);
        // console.log('Landing -> mounted -> user -> ', this.user);
        localStorage.removeItem('oauth_cb');
        this.name = this.user.name;
        if (oauthResult.login_result == 'success') {
          if (oauthResult.method == 'signup') {
            this.page = 'createAccount';
          }
          else {
            // console.log('Landing -> mounted -> redirecting to login page');
            this.redirectToUserLoggedInPage();
          }
        }
        else
          this.page = 'loginFailed';
      }
      else {
        if(this.user){
          this.redirectToUserLoggedInPage();
        }
        else {
          const localStorageInvitedTeamToken = localStorage.getItem('sg_invited_team_token');
          if(localStorageInvitedTeamToken){
            const invitedTeamToken: any = parseJwt(localStorageInvitedTeamToken);
            this.emailAddress = invitedTeamToken.email;
          }

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

              if(sessionStorage.getItem('sg_logged_out_403') === 'true'){
                sessionStorage.removeItem('sg_logged_out_403');
                this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert('Looks like your session expired.  Please log back in.', AlertPlacement.WINDOW, AlertCategory.INFO));
              }
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

      if(localStorage.getItem('testPage')){
        this.page = localStorage.getItem('testPage');
      }
    }

    private redirectToUserLoggedInPage(){
      if(this.user){
        if(!this.user.name){
          this.page = 'createAccount'; 
        }
        else {
          this.$router.push('/');
        }
      }
      else {
        this.page = 'getStarted';
      }
    }

    private async onGoogleAuthClicked(){
      try {
        const authStateValue = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const exp = (Date.now() + 10000).toString();
        localStorage.setItem('oauth_cb', JSON.stringify({authStateValue, exp}));
        const authResult = await axios.get('/login/goauth/init', {headers: {authStateValue}});
        // console.log('signupResult -> ', authResult);

        window.location.href = authResult.data;
      }
      catch(err) {
        console.error(err);
        showErrors(`Error authenticating with google`, err);
      }      
    }

    private async onGithubAuthClicked(){
      try {
        const authStateValue = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const exp = (Date.now() + 10000).toString();
        localStorage.setItem('oauth_cb', JSON.stringify({authStateValue, exp}));
        const authResult = await axios.get('/login/ghauth/init', {headers: {authStateValue}});
        // console.log('signupResult -> ', authResult);

        window.location.href = authResult.data;
      }
      catch(err) {
        console.error(err);
        showErrors(`Error authenticating with github`, err);
      }      
    }

    private async confirmEmailAddress(){
      if (this.robot){
        console.error('Not verified')
        return;
      }
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

    private async onConfirmEmailCaptchaVerify (response){
      if (response) {
        this.robot = false;
        const localStorageInvitedTeamToken = localStorage.getItem('sg_invited_team_token');
        if(localStorageInvitedTeamToken){
          const invitedTeamToken: any = parseJwt(localStorageInvitedTeamToken);
          this.emailAddress = invitedTeamToken.email;
          const invitedTeamId = invitedTeamToken.InvitedTeamId;
          await this.confirmInvitedUserEmailAddress(this.emailAddress, invitedTeamId, localStorageInvitedTeamToken);
        } else {
          await this.confirmEmailAddress();
        }
      }
    }

    private onGetStartedLoginClicked(){
      this.page = 'login';

      this.$nextTick(() => {
        (<any>this.$refs['emailAddress']).focus();
      });
    }

    private async onConfirmEmailClicked(){
      await this.confirmEmailAddress();
    }

    private async confirmInvitedUserEmailAddress(emailAddress: string, teamId: string, token: string){
      try {

        const confirmResult = await axios.put(`/api/v0/signup/confirminvite/${emailAddress}/${teamId}/${token}`, {});
        const user = confirmResult.data.data; // this is the new user account
        
        this.$store.commit('securityStore/setUser', user);

        this.page = 'createAccount';
        this.$nextTick(() => {
          (<any>this.$refs['name']).focus();
        });
      }
      catch(err) {
        console.error(err);
        this.page = 'emailConfirmFailed';
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

    private onBackToGetStartedPageClicked(){
      this.page = 'getStarted';

      this.$nextTick(() => {
        (<any>this.$refs['emailAddress']).focus();
      });
    }

    private async onCreateAccountClicked(){
      try {
        let detailsResult;
        if (this.oauthLogin) {
          detailsResult = await axios.put(`api/v0/signup/oauth/${this.user.id}`, {
            name: this.name,
            companyName: this.companyName
          });
        } else {
          detailsResult = await axios.put(`api/v0/signup/details/${this.user.id}`, {
            password: this.password,
            name: this.name,
            companyName: this.companyName
          });
          this.password = ''; // clear this out
        }

        const user = detailsResult.data.data; // this is the new user account with updated info  
        this.$store.commit('securityStore/setUser', user);
        localStorage.setItem('sg_has_logged_in', 'true');

        if(this.invitedTeamsCount > 0){
          this.page = 'joinTeam';
        }
        else {
          this.teamName = this.companyName; // just default this
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
        const createTeamResult = await axios.post('api/v0/team', {
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

        const newTeam = createTeamResult.data.data;
        this.$store.commit('teamStore/addModels', [newTeam]);
        this.user.teamIds.push(newTeam.id); // not sure if browser push will conflict with this
        this.$store.commit('teamStore/select', newTeam);
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
        this.teammates.map(teammate => { 
          if(teammate.email && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(teammate.email))
          teammateEmails.push(teammate.email);
        });

        const invitePromises = [];

        for(const email of teammateEmails){
          invitePromises.push(axios.post('api/v0/invite/direct', {
            email,
            _userId: this.user.id
          }));
        }

        if(invitePromises.length > 0){
          await Promise.all(invitePromises);
          this.page = 'addTeamMembersSuccess';
        }
        else {
          this.onClickedStartUsingSaasGlue();
        }
      }
      catch(err){
        console.error(err);
        showErrors(`Error setting up the team.`, err);
      }
    }

    private async onAcceptInvitationClicked(teamId: string){
      try {
        const acceptInvitationResult = await axios.put(`api/v0/user/${this.user.id}/join/${teamId}`);
        const user = acceptInvitationResult.data.data; // this is the user account with updated info  
        this.$store.commit('securityStore/setUser', user);

        if(this.invitedTeamsCount === 0){
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

    private loadedTeams: any = {};
    // Immediately return a reactive object and load it async.  Once the real model 
    // is loaded the UI will be reactive
    private getTeam(teamId: string){
      if(!this.loadedTeams[teamId]){
        Vue.set(this.loadedTeams, teamId, {id: teamId, name: '...'});

        (async () => {
          const team = await this.$store.dispatch('teamStore/fetchModel', teamId);
          this.loadedTeams[teamId] = team;
        })();
      }

      return this.loadedTeams[teamId];
    }

    private onClickedStartUsingSaasGlue(){
      // Manually set the user from the auth cookie
      const authJwt: any = getAuthJwtCookie();
      if(authJwt && authJwt.teamIds && authJwt.teamIds.length > 0 ){
        this.$store.dispatch('securityStore/restartApp', {selectedTeamId: authJwt.teamIds[0], routeName: 'jobMonitor'});
      }
      else {
        console.error('Cannot start the applicaton.  For some reason the Auth cookie was not avaiable', authJwt);
      }

      window.location.href = `${window.location.origin}/#/landing`;
    }

    private get teamIdsInvitedMinusLocalStorage(){
      if(this.user && this.user.teamIdsInvited){
        if(this.hasLocalStorageInvitedTeamToken){
          return this.user.teamIdsInvited.filter((teamInvite:any) => teamInvite._teamId !== this.localStorageInvitedTeamId);
        }
        else {
          return this.user.teamIdsInvited;
        }
      }
      else {
        return [];
      }
    }

    private get invitedTeamsCount(){
      let count = this.teamIdsInvitedMinusLocalStorage.length;

      if(this.hasLocalStorageInvitedTeamToken){
        count++;
      }

      return count;
    }

    private get localStorageInvitedTeamName(){
      const localStorageInvitedTeamToken = localStorage.getItem('sg_invited_team_token');
      if(localStorageInvitedTeamToken){
        const invitedTeamToken = parseJwt(localStorageInvitedTeamToken);
        return invitedTeamToken.InvitedTeamName;
      }
      else {
        return '';
      }
    }

  private get localStorageInvitedTeamId(){
    const localStorageInvitedTeamToken = localStorage.getItem('sg_invited_team_token');
    if(localStorageInvitedTeamToken){
      const invitedTeamToken = parseJwt(localStorageInvitedTeamToken);
      return invitedTeamToken.InvitedTeamId;
    }
    else {
      return '';
    }
  }

  private get localStorageInvitedTeam_EmailConfirmed(){
    const localStorageInvitedTeamToken = localStorage.getItem('sg_invited_team_token');
    if(localStorageInvitedTeamToken){
      const invitedTeamToken = parseJwt(localStorageInvitedTeamToken);
      return invitedTeamToken.emailConfirmed;
    }
    else {
      return false;
    }
  }

  private get localStorageInvitedTeam_Email(){
    const localStorageInvitedTeamToken = localStorage.getItem('sg_invited_team_token');
    if(localStorageInvitedTeamToken){
      const invitedTeamToken: any = parseJwt(localStorageInvitedTeamToken);
      return invitedTeamToken.email;
    }
    else {
      return null;
    }
  }

  private get hasLocalStorageInvitedTeamToken(){
    return localStorage.getItem('sg_invited_team_token') !== null;
  }

  private async onAcceptGenericInviteClicked(){
    try {
      const teamIdInviteToken = localStorage.getItem('sg_invited_team_token');
      if(teamIdInviteToken){
        const teamIdInviteJwt = parseJwt(teamIdInviteToken);
        let user;

        if(teamIdInviteJwt.id){
          // this is a direct invite (id is the user id for a direct invitation)
          const acceptedInviteResult = await axios.get(`api/v0/join/invite/${teamIdInviteJwt.id}/${teamIdInviteJwt.InvitedTeamId}/${teamIdInviteToken}`);
          user = acceptedInviteResult.data.data; // this is the new user account with updated info
        }
        else {
          // a shareable generic invitation link
          const acceptedInviteResult = await axios.get(`api/v0/join/shared_invite/${teamIdInviteToken}`);
          user = acceptedInviteResult.data.data; // this is the new user account with updated info  
        }

        this.$store.commit('securityStore/setUser', user);
        localStorage.removeItem('sg_invited_team_token');
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

      this.page = "passwordUpdateSuccess";
    }
    catch(err){
      console.error(err);
      showErrors(`Error resetting your password.`, err);

      setTimeout(() => {
        window.location.href = `${window.location.origin}/#/landing`;
      }, 2000);
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

  .left-flex {
    display: flex; 
    align-items: left; 
    flex-direction: column; 
    margin-left: 100px;
  }

  .confirm-letter {
    width: 55px; 
    font-size: 24px;
    margin-right: 10px;
  }

  .invitations {
    display: flex;
    flex-direction: column;
    align-items: left;
  }

  .invitation-td {
    padding-right: 15px;
    padding-bottom: 15px;
    vertical-align: middle;
  }

  .social-auth-github-button {
    background: url(https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg) no-repeat 10px !important;
    background-size: 18px 18px !important;
  }

  .social-auth-google-button {
    background: url(https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg) no-repeat 10px !important;
    background-size: 18px 18px !important;
  }  
</style>