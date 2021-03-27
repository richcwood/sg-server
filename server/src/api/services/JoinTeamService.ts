import { userService } from './UserService';
import { SGUtils } from '../../shared/SGUtils';
import { ValidationError } from '../utils/Errors';
import { GetAccessRightIdsForTeamUser } from '../../api/utils/Shared';
import * as _ from 'lodash';
const jwt = require('jsonwebtoken');
import * as config from 'config';
import * as mongodb from 'mongodb';


export class JoinTeamService {
    public async userJoinTeam(_userId: mongodb.ObjectId, _teamId: string, token: string): Promise<object> {
        /// Check if the invited user exists
        const userModel: any = await userService.findUser(_userId, '_id email teamIds teamAccessRightIds teamIdsInvited teamIdsInactive');
        if (!userModel)
            throw new ValidationError('Something went wrong. Please request a new invite from the team administrator.');

        /// Check if the user is already in the team
        let userAlreadyInTeam: boolean = true;
        if (userModel.teamIds.indexOf(_teamId) < 0)
            userAlreadyInTeam = false;

        /// Verify the token - the secret comes from the user document - if no secret we can't verify the token
        let tokenIsValid: boolean = false;
        const filterRes = _.filter(userModel.teamIdsInvited, o => o._teamId == _teamId);
        let teamIdInviteSecret: string = undefined;
        if (_.isArray(filterRes) && filterRes.length > 0)
            teamIdInviteSecret = filterRes[0].inviteKey;
        if (!teamIdInviteSecret) {
            if (!userAlreadyInTeam)
                throw new ValidationError('Something went wrong. Please request a new invite from the team administrator.');
        } else {
            /// We have the secret, use it to verify the token and then check the embedded data against the url params
            tokenIsValid = true;
            let jwtData;
            try {
                jwtData = jwt.verify(token, teamIdInviteSecret);
            } catch (err) {
                tokenIsValid = false;
            }
            if (tokenIsValid) {
                if (_userId.toHexString() != jwtData.id)
                    tokenIsValid = false;
                else if (_teamId != jwtData._teamId)
                    tokenIsValid = false;
            }
        }

        /// If the user is already in the team it doesn't matter if the token is valid or not - just remove the secret
        ///     and if somehow the team was added to the inactive list, remove it
        if (userAlreadyInTeam) {
            if (_teamId in userModel.teamIdsInvited) {
                let newTeamIdsInvited: any[] = [];
                for (let i = 0; i < userModel.teamIdsInvited.length; i++) {
                    if (userModel.teamIdsInvited[i]._teamId != _teamId) {
                        newTeamIdsInvited.push(userModel.teamIdsInvited[i]);
                    }
                }
                userModel.teamIdsInvited = newTeamIdsInvited;
                if (userModel.teamIdsInactive.indexOf(_teamId) >= 0)
                    userModel.teamIdsInactive = SGUtils.removeItemFromArray(userModel.teamIdsInactive, _teamId);
                await userModel.save();
            }
            return userModel;
        }

        if (!tokenIsValid)
            throw new ValidationError('Something went wrong. Please request a new invite from the team administrator.');

        /// If the user doesn't have a password yet, leave the team to which they are invited in the teamIdsInvited
        ///     array - this will get them routed to the page where they can enter their account details.
        if (userModel.passwordHash) {
            if (userModel.teamIdsInactive.indexOf(_teamId) >= 0)
                userModel.teamIdsInactive = SGUtils.removeItemFromArray(userModel.teamIdsInactive, _teamId);

            userModel.teamIds.push(_teamId);
            let newTeamIdsInvited: any[] = [];
            for (let i = 0; i < userModel.teamIdsInvited.length; i++) {
                if (userModel.teamIdsInvited[i]._teamId != _teamId) {
                    newTeamIdsInvited.push(userModel.teamIdsInvited[i]);
                }
            }
            userModel.teamIdsInvited = newTeamIdsInvited;
        }

        userModel.teamAccessRightIds[_teamId] = await GetAccessRightIdsForTeamUser();
        userModel.emailConfirmed = true;

        await userModel.save();

        return userModel;
    }


    public async anonymousJoinTeam(_userId: mongodb.ObjectId, token: string): Promise<object> {
        /// Check if the invited user exists
        const userModel: any = await userService.findUser(_userId, '_id email teamIds teamAccessRightIds teamIdsInvited teamIdsInactive passwordHash');
        if (!userModel)
            throw new ValidationError('Something went wrong. Please request a new invite from the team administrator.');

        let tokenIsValid: boolean = true;
        let jwtData;
        try {
            jwtData = jwt.verify(token, config.get('secret'));
        } catch (err) {
            tokenIsValid = false;
        }

        const _teamId = jwtData.InvitedTeamId;

        /// Check if the user is already in the team
        let userAlreadyInTeam: boolean = true;
        if (userModel.teamIds.indexOf(_teamId) < 0)
            userAlreadyInTeam = false;

        /// If the user is already in the team it doesn't matter if the token is valid or not - just remove the secret
        ///     and if somehow the team was added to the inactive list, remove it
        if (userAlreadyInTeam) {
            if (_teamId in userModel.teamIdsInvited) {
                let newTeamIdsInvited: any[] = [];
                for (let i = 0; i < userModel.teamIdsInvited.length; i++) {
                    if (userModel.teamIdsInvited[i]._teamId != _teamId) {
                        newTeamIdsInvited.push(userModel.teamIdsInvited[i]);
                    }
                }
                userModel.teamIdsInvited = newTeamIdsInvited;
                if (userModel.teamIdsInactive.indexOf(_teamId) >= 0)
                    userModel.teamIdsInactive = SGUtils.removeItemFromArray(userModel.teamIdsInactive, _teamId);
                await userModel.save();
            }
            return userModel;
        }

        if (!tokenIsValid)
            throw new ValidationError('Something went wrong. Please request a new invite from the team administrator.');

        userModel.teamIdsInvited.push({_teamId});

        /// If the user doesn't have a password yet, leave the team to which they are invited in the teamIdsInvited
        ///     array - this will get them routed to the page where they can enter their account details.
        if (userModel.passwordHash) {
            if (userModel.teamIdsInactive.indexOf(_teamId) >= 0)
                userModel.teamIdsInactive = SGUtils.removeItemFromArray(userModel.teamIdsInactive, _teamId);

            userModel.teamIds.push(_teamId);
            let newTeamIdsInvited: any[] = [];
            for (let i = 0; i < userModel.teamIdsInvited.length; i++) {
                if (userModel.teamIdsInvited[i]._teamId != _teamId) {
                    newTeamIdsInvited.push(userModel.teamIdsInvited[i]);
                }
            }
            userModel.teamIdsInvited = newTeamIdsInvited;
        }

        userModel.teamAccessRightIds[_teamId] = await GetAccessRightIdsForTeamUser();
        userModel.emailConfirmed = true;

        await userModel.save();
        return userModel;
    }


    // public async anonymousJoinTeam(_teamId: string, token: string): Promise<object> {
    //     /// Check if the invited user exists
    //     const teamModel: any = await teamService.findTeam(new mongodb.ObjectId(_teamId), '_id name');
    //     if (!teamModel)
    //         throw new ValidationError('Something went wrong. Please request a new invite link from the team administrator.');

    //     let tokenIsValid: boolean = true;
    //     let jwtData;
    //     try {
    //         jwtData = jwt.verify(token, config.get('secret'));
    //     } catch (err) {
    //         tokenIsValid = false;
    //     }
    //     if (tokenIsValid) {
    //         if (_teamId != jwtData._teamId)
    //             tokenIsValid = false;
    //     }

    //     if (!tokenIsValid) {
    //         return {
    //             success: false,
    //             data: ``
    //         };
    //     } else {
    //         return {
    //             success: true,
    //             data: `<!DOCTYPE html><html lang="en-US" class=""><head>
    //             <title>Join ${teamModel.name} | SaasGlue</title><link href="https://a.slack-edge.com/5465/style/rollup-slack_kit_legacy_adapters.css" rel="stylesheet" type="text/css" onload="window._cdn ? _cdn.ok(this, arguments) : null" onerror="window._cdn ? _cdn.failed(this, arguments) : null" crossorigin="anonymous"><link href="https://a.slack-edge.com/f6000/style/rollup-plastic.css" rel="stylesheet" type="text/css" onload="window._cdn ? _cdn.ok(this, arguments) : null" onerror="window._cdn ? _cdn.failed(this, arguments) : null" crossorigin="anonymous"><link href="https://a.slack-edge.com/37ac7/style/invite.css" rel="stylesheet" type="text/css" onload="window._cdn ? _cdn.ok(this, arguments) : null" onerror="window._cdn ? _cdn.failed(this, arguments) : null" crossorigin="anonymous"><link href="https://a.slack-edge.com/19f3c/style/terms_of_service.css" rel="stylesheet" type="text/css" onload="window._cdn ? _cdn.ok(this, arguments) : null" onerror="window._cdn ? _cdn.failed(this, arguments) : null" crossorigin="anonymous"><link href="https://a.slack-edge.com/1fb2e/style/libs/lato-2-compressed-mac.css" rel="stylesheet" type="text/css" onload="window._cdn ? _cdn.ok(this, arguments) : null" onerror="window._cdn ? _cdn.failed(this, arguments) : null" crossorigin="anonymous"></head><body class="no_header full_height full_bleed"><div class="full_height fs_split"><div class="fs_split_pane fs_split_pane_left"><form action="/api/v0/invite/shared" method="post" accept-charset="UTF-8" class="align_left"><div class="fs_split_header"><a href="https://www.saasglue.com"><img src="${config.get('SaasglueLogoPng')}" width="120" height="36" style="margin-left: 3.0rem"></a></div><div id="invite_form_body" class="fs_split_body"><h1>Join the SaasGlue team <strong>${teamModel.name}</strong></h1><input type="hidden" name="token" value="${token}"><input type="hidden" name="_teamId" value="${teamModel._id}"><div class="email_container no_top_padding bottom_padding" id="email_container"><label class="normal" for="email"><span class="flex_shrink_none">What is your <strong>email address</strong>?</span></label><div class="position_relative"><input type="text" class="email_field small" id="email" name="email" placeholder="you@example.com" data-email-healing="true" data-validation="is_email" autocomplete="off" spellcheck="false" autocorrect="off" data-qa="email_field" aria_invalid="false" aria-label="you@example.com"><p class="error_message"></p></div></div></div><div id="submit" class="fs_split_footer"><button id="submit_btn" type="submit" class="btn btn_large ladda-button" data-style="expand-right"><span class="ladda-label">Verify email</span><span class="ladda-spinner"></span></button></div></form></div></div></div><div id="overlay"></div></div><script type="text/javascript">

    //         (function() {
    //             window.load_zxcvbn_script = function() {

    //                 if (document.getElementById('zxcvbn')) {



    //                     window.zxcvbn_load_hook();
    //                     return;
    //                 }

    //                 var fjs = document.getElementsByTagName('script')[0];
    //                 var js = document.createElement('script');
    //                 js.id = 'zxcvbn';

    //                 js.src = window.zxcvbn_url;
    //                 fjs.parentNode.insertBefore(js, fjs);
    //             };

    //             window.zxcvbn_load_hook = function() {



    //                 if ($('#password-strength-meter-wrapper').length) return;

    //                 $('input[name=password]:visible')
    //                     .keyup(function() {
    //                         var color_map = ['', '#c81818', '#ffac1d', '#a6c060', '#27b30f'];

    //                         var word_map = [



    //                             ['#444', $('#zxcvbn_string_very_weak').html() || 'Very weak'],
    //                             ['#c81818', $('#zxcvbn_string_weak').html() || 'Weak'],
    //                             ['#e28f00', $('#zxcvbn_string_so_so').html() || 'So-so'],
    //                             ['#8aa050', $('#zxcvbn_string_good').html() || 'Good'],
    //                             ['#27b30f', $('#zxcvbn_string_great').html() || 'Great'],
    //                         ];

    //                         var pass = $(this).val();
    //                         if (!pass || !pass.length) {
    //                             $('#password-strength-meter').css({ width: '0px' });
    //                             $('#password-strength-label').html('&nbsp;');
    //                             return;
    //                         }

    //                         var fields = ['username', 'email', 'url', 'name'];
    //                         var ins = [];

    //                         for (var i = 0; i < fields.length; i += 1) {
    //                             var str = $('input[name=' + fields[i] + ']').val();
    //                             if (str && str.length) ins.push(str);
    //                         }


    //                         var ret = zxcvbn(pass, ins);


    //                         var color_score;
    //                         if (pass.length < 6 || ret.score !== 0) {
    //                             color_score = ret.score;
    //                         } else if (ret.score === 0) {
    //                             color_score = 1;
    //                         }

    //                         $('#password-strength-meter').css({
    //                             width: color_score * 25 + '%',
    //                             'background-color': color_map[color_score],
    //                         });

    //                         $('#password-strength-label')
    //                             .css({
    //                                 color: word_map[color_score][0],
    //                             })
    //                             .text(word_map[ret.score][1]);


    //                     })
    //                     .change(function() {
    //                         $(this).keyup();
    //                     });





    //                 var d = $('<div/>');
    //                 d.attr('id', 'password-strength-meter-wrapper');

    //                 d.css({
    //                     position: 'relative',
    //                     width: $('input[name=password]:visible').outerWidth() + 'px',
    //                     margin: '5px 0 1rem 0',
    //                 });
    //                 if (window.TS) d.css('width', '100%');
    //                 $('input[name=password]:visible').after(d);





    //                 var bg = $('<div/>');
    //                 bg.css({
    //                     height: '4px',
    //                     'background-color': '#e8e8e8',
    //                     width: '100%',
    //                     position: 'absolute',
    //                     left: '0',
    //                 });
    //                 d.append(bg);





    //                 var color = $('<div/>');
    //                 color.css({
    //                     height: '4px',
    //                     'background-color': '#c81818',
    //                     width: '0',
    //                     position: 'absolute',
    //                     left: '0',
    //                 });
    //                 color.attr('id', 'password-strength-meter');
    //                 d.append(color);





    //                 for (var i = 1; i < 4; i += 1) {
    //                     var sep = $('<div/>');
    //                     sep.css({
    //                         height: '4px',
    //                         width: '2px',
    //                         'background-color': '#fff',
    //                         position: 'absolute',
    //                         left: i * 25 + '%',
    //                     });
    //                     d.append(sep);
    //                 }





    //                 var lbl = $('<div/>');
    //                 lbl.css({
    //                     float: 'right',
    //                     'margin-top': '6px',
    //                     'line-height': '16px',
    //                     'font-size': '11px',
    //                 });
    //                 lbl.attr('id', 'password-strength-label');
    //                 d.append(lbl);

    //                 $('input[name=password]:visible').keyup();
    //             };
    //         })();
    //         </script><div style="display:none;"><span id="zxcvbn_string_very_weak">Very weak</span><span id="zxcvbn_string_weak">Weak</span><span id="zxcvbn_string_so_so">So-so</span><span id="zxcvbn_string_good">Good</span><span id="zxcvbn_string_great">Great</span></div><script>
    //          $(window).load(load_zxcvbn_script); 
    //         window.zxcvbn_url = "https:\/\/a.slack-edge.com\/bv1-8-8cacda2\/zxcvbn.1f5561bccc365c458bad.min.js";
    //         </script><style>.color_9f69e7:not(.nuc) {color:#9F69E7;}.color_4bbe2e:not(.nuc) {color:#4BBE2E;}.color_e7392d:not(.nuc) {color:#E7392D;}.color_3c989f:not(.nuc) {color:#3C989F;}.color_674b1b:not(.nuc) {color:#674B1B;}.color_e96699:not(.nuc) {color:#E96699;}.color_e0a729:not(.nuc) {color:#E0A729;}.color_684b6c:not(.nuc) {color:#684B6C;}.color_5b89d5:not(.nuc) {color:#5B89D5;}.color_2b6836:not(.nuc) {color:#2B6836;}.color_99a949:not(.nuc) {color:#99A949;}.color_df3dc0:not(.nuc) {color:#DF3DC0;}.color_4cc091:not(.nuc) {color:#4CC091;}.color_9b3b45:not(.nuc) {color:#9B3B45;}.color_d58247:not(.nuc) {color:#D58247;}.color_bb86b7:not(.nuc) {color:#BB86B7;}.color_5a4592:not(.nuc) {color:#5A4592;}.color_db3150:not(.nuc) {color:#DB3150;}.color_235e5b:not(.nuc) {color:#235E5B;}.color_9e3997:not(.nuc) {color:#9E3997;}.color_53b759:not(.nuc) {color:#53B759;}.color_c386df:not(.nuc) {color:#C386DF;}.color_385a86:not(.nuc) {color:#385A86;}.color_a63024:not(.nuc) {color:#A63024;}.color_5870dd:not(.nuc) {color:#5870DD;}.color_ea2977:not(.nuc) {color:#EA2977;}.color_50a0cf:not(.nuc) {color:#50A0CF;}.color_d55aef:not(.nuc) {color:#D55AEF;}.color_d1707d:not(.nuc) {color:#D1707D;}.color_43761b:not(.nuc) {color:#43761B;}.color_e06b56:not(.nuc) {color:#E06B56;}.color_8f4a2b:not(.nuc) {color:#8F4A2B;}.color_902d59:not(.nuc) {color:#902D59;}.color_de5f24:not(.nuc) {color:#DE5F24;}.color_a2a5dc:not(.nuc) {color:#A2A5DC;}.color_827327:not(.nuc) {color:#827327;}.color_3c8c69:not(.nuc) {color:#3C8C69;}.color_8d4b84:not(.nuc) {color:#8D4B84;}.color_84b22f:not(.nuc) {color:#84B22F;}.color_4ec0d6:not(.nuc) {color:#4EC0D6;}.color_e23f99:not(.nuc) {color:#E23F99;}.color_e475df:not(.nuc) {color:#E475DF;}.color_619a4f:not(.nuc) {color:#619A4F;}.color_a72f79:not(.nuc) {color:#A72F79;}.color_7d414c:not(.nuc) {color:#7D414C;}.color_aba727:not(.nuc) {color:#ABA727;}.color_965d1b:not(.nuc) {color:#965D1B;}.color_4d5e26:not(.nuc) {color:#4D5E26;}.color_dd8527:not(.nuc) {color:#DD8527;}.color_bd9336:not(.nuc) {color:#BD9336;}.color_e85d72:not(.nuc) {color:#E85D72;}.color_dc7dbb:not(.nuc) {color:#DC7DBB;}.color_bc3663:not(.nuc) {color:#BC3663;}.color_9d8eee:not(.nuc) {color:#9D8EEE;}.color_8469bc:not(.nuc) {color:#8469BC;}.color_73769d:not(.nuc) {color:#73769D;}.color_b14cbc:not(.nuc) {color:#B14CBC;}</style>

    //         <!-- slack-www-hhvm-main-iad-lyt1/ 2020-02-20 13:17:48/ vc069dfc3e4d8579c393a7f853b1b132b59a351f1/ B:H -->

    //         </body></html>`
    //         };
    //     }
    // }
}

export const joinTeamService = new JoinTeamService();