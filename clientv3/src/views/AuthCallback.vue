<template>
  <div class="main" style="margin-left: 24px; margin-right: 12px;">    
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { isUserReadyToUseApp, parseJwt, getAuthJwtCookie } from '../store/security';
import axios from 'axios';

@Component
export default class AuthCallback extends Vue {
  private async mounted(){
    try {
      const method = this.$router.currentRoute.params.method;
      const oauthProvider = this.$router.currentRoute.params.oauthProvider;
      const authHashKey = this.$router.currentRoute.params.authHashKey;

      console.log('AuthCallback -> mounted -> start');
      if (method === 'signup') {
        if (oauthProvider === 'go') {
          if (!localStorage.getItem('oauth_cb'))
            throw `invalid state`;
          const authState: any = JSON.parse(localStorage.getItem('oauth_cb'));
          localStorage.removeItem('oauth_cb');
          console.log('AuthCallback -> signup -> removeItem -> oauth_cb');
          const exp = new Date(authState).getTime();
          if (Date.now() - exp > 0)
            throw 'auth timeout';
          const authStateValue = authState.authStateValue;
          if (await this.$store.dispatch('securityStore/goLogin', {authStateValue, authHashKey})){
            if(isUserReadyToUseApp()){
              this.$store.dispatch('securityStore/startApp');
            }
            else {
              localStorage.setItem('oauth_cb', JSON.stringify({'login_result': 'success', 'method': 'signup'}));
            }
          }
          else {
            localStorage.setItem('oauth_cb', JSON.stringify({'login_result': 'failed'}));
          }
        }
      }
      else if (method === 'login') {
        console.log('AuthCallback -> mounted -> 1');
        if (!localStorage.getItem('oauth_cb'))
          throw `invalid state`;
        const authState: any = JSON.parse(localStorage.getItem('oauth_cb'));
        console.log('AuthCallback -> mounted -> authState -> ', authState);
        localStorage.removeItem('oauth_cb');
          console.log('AuthCallback -> login -> removeItem -> oauth_cb');
        const exp = new Date(authState).getTime();
        if (Date.now() - exp > 0)
          throw 'auth timeout';
        const authStateValue = authState.authStateValue;
        if (oauthProvider === 'go') {
          if(await this.$store.dispatch('securityStore/goLogin', {authStateValue, authHashKey})){
            console.log('AuthCallback -> mounted -> 2');
            if(isUserReadyToUseApp()){
              console.log('AuthCallback -> mounted -> 3');
              await this.$store.dispatch('securityStore/startApp');
            }
            else {
              console.log('AuthCallback -> mounted -> 4');
              localStorage.setItem('oauth_cb', JSON.stringify({'login_result': 'success', 'method': 'login'}));
            }
          }
          else {
            localStorage.setItem('oauth_cb', JSON.stringify({'login_result': 'failed'}));
          }
        }
      }
    } catch (err) {
      console.log('Error in AuthCallback: ', err);
      localStorage.setItem('oauth_cb', JSON.stringify({'login_result': 'failed'}));
    }
    this.$router.push({name: 'landing'});
  }
}
</script>
