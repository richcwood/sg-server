const mailchimp = require('@mailchimp/mailchimp_marketing');

import { assert } from '../shared/Assert';

import * as crypto from 'crypto';

const validMemberStatuses: string[] = ['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional'];

export class MailChimpAPI {
    private _apiKey: string;
    private _lists: Map<string, string> = undefined;
    get lists(): Map<string, string> {
        return this._lists;
    }

    constructor() {
        this._apiKey = process.env.MAILCHIMP_API_KEY!;
        try {
            mailchimp.setConfig({
                _apiKey: this._apiKey,
                server: this._apiKey.split('-')[1],
            });
        } catch (err) {
            console.error('Error initializing MailChimpAPI', err);
        }
    }

    /**
     * Converts the email address to a subscriber hash
     * @param emailAddress
     * @returns
     */
    getSubscriberHash(emailAddress: string) {
        return crypto.createHash('md5').update(emailAddress.toLowerCase()).digest('hex');
    }

    /**
     * Gets all _lists
     * @returns
     */
    async getLists() {
        this._lists = new Map([]);
        const listsDetails = await mailchimp.lists.getAllLists();
        for (const list of listsDetails.lists) {
            this._lists[list['name']] = list['id'];
        }
    }

    /**
     * Gets a list id from a list name
     * @param listName
     * @returns
     */
    async getListId(listName: string) {
        if (!this._lists) await this.getLists();
        assert(listName in this._lists, 'Invalid list name');
        return this._lists[listName];
    }

    /**
     * Gets all members in the list
     * @param listName
     * @param options
     * @returns
     */
    async getMembers(listName: string = 'saas glue', options: any = {}) {
        const listId = await this.getListId(listName);
        const response = await mailchimp.lists.getListMembersInfo(listId, options);
        return response.members;
    }

    /**
     * Returns information for the given member
     * @param listName - the mailchimp list name
     * @param subscriberId - can be an subscriber hash or email address
     * @returns
     */
    async getMemberInfo(listName: string = 'saas glue', subscriberId: any) {
        const listId = await this.getListId(listName);
        const response = await mailchimp.lists.getListMember(listId, subscriberId);
        return response.memberInfo;
    }

    /**
     * Adds a new member to the given list
     * @param emailAddress
     * @param listName
     * @returns
     */
    async addMember(emailAddress: any, status: string, listName: string = 'saas glue') {
        assert(validMemberStatuses.indexOf(status) >= 0, 'Invalid status');
        const listId = await this.getListId(listName);
        const response = await mailchimp.lists.addListMember(listId, {
            email_address: emailAddress,
            status: status,
        });
        return response.memberInfo;
    }

    /**
     * Updates the given member
     * @param memberId
     * @param member - dict with member properties
     * @param listName
     * @returns
     */
    async updateMember(memberId: string, member: any, listName: string = 'saas glue') {
        if ('status' in member) assert(validMemberStatuses.indexOf(member.status) >= 0, 'Invalid status');
        const listId = await this.getListId(listName);
        const response = await mailchimp.lists.updateListMember(listId, memberId, member);
        return response.memberInfo;
    }

    /**
     * Deletes the given member from the given list
     * @param listName
     * @param memberId
     * @returns
     */
    async deleteMember(memberId: string, listName: string = 'saas glue') {
        const listId = await this.getListId(listName);
        const response = await mailchimp.lists.deleteListMember(listId, memberId);
        return response;
    }
}
