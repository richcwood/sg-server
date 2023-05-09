const mailchimp = require('@mailchimp/mailchimp_marketing');

import { MailChimpAPI } from './MailChimp';

// Mock the mailchimp_marketing package
jest.mock('@mailchimp/mailchimp_marketing', () => ({
    lists: {
        getAllLists: jest.fn(),
        getListMembersInfo: jest.fn(),
        getListMember: jest.fn(),
        addListMember: jest.fn(),
        updateListMember: jest.fn(),
        deleteListMember: jest.fn(),
    },
    setConfig: jest.fn(),
}));

// Define the API key to use in the tests
process.env.MAILCHIMP_API_KEY = 'my-mailchimp-api-key';

describe('MailChimpAPI', () => {
    let mailchimpAPI: MailChimpAPI;
    let lists: any[];
    const defaultListId = 'list-id';
    const defaultListName = 'My List';
    const defaultMemberId = 'member-id';

    beforeAll(() => {
        lists = [{ id: defaultListId, name: defaultListName }];
    });

    beforeEach(() => {
        mailchimpAPI = new MailChimpAPI();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getLists', () => {
        it('should get all mailchimp lists in a name->id map', async () => {
            (mailchimp.lists.getAllLists as jest.Mock).mockResolvedValueOnce({ lists });
            await mailchimpAPI.getLists();
            const result = mailchimpAPI.lists;
            expect(mailchimp.lists.getAllLists).toHaveBeenCalled();
            const listsMap = new Map([]);
            for (let l of lists) listsMap[l['name']] = l['id'];
            expect(result).toEqual(listsMap);
        });
    });

    describe('getListId', () => {
        it('should get the id of the list by name', async () => {
            const listName = defaultListName;
            const listId = defaultListId;
            (mailchimp.lists.getAllLists as jest.Mock).mockResolvedValueOnce({ lists });
            const result = await mailchimpAPI.getListId(listName);
            expect(mailchimp.lists.getAllLists).toHaveBeenCalled();
            expect(result).toEqual(listId);
        });

        it('should throw with invalid list name', async () => {
            const invalidListName = 'Invalid List';
            (mailchimp.lists.getAllLists as jest.Mock).mockResolvedValueOnce({ lists });
            await expect(() => mailchimpAPI.getListId(invalidListName)).rejects.toThrow('Invalid list name');
            expect(mailchimp.lists.getAllLists).toHaveBeenCalled();
        });
    });

    describe('getMembers', () => {
        it('should call getListMembersInfo', async () => {
            (mailchimp.lists.getAllLists as jest.Mock).mockResolvedValueOnce({ lists });
            const members = [{ id: defaultMemberId, email_address: 'member@example.com' }];
            (mailchimp.lists.getListMembersInfo as jest.Mock).mockResolvedValueOnce({ members });
            const result = await mailchimpAPI.getMembers(defaultListName);
            expect(mailchimp.lists.getListMembersInfo).toHaveBeenCalledWith(defaultListId, {});
            expect(result).toEqual(members);
        });

        it('should pass options to getListMembersInfo', async () => {
            (mailchimp.lists.getAllLists as jest.Mock).mockResolvedValueOnce({ lists });
            const options = { count: 10 };
            (mailchimp.lists.getListMembersInfo as jest.Mock).mockResolvedValueOnce({ members: [] });
            await mailchimpAPI.getMembers(defaultListName, options);
            expect(mailchimp.lists.getListMembersInfo).toHaveBeenCalledWith(defaultListId, options);
        });
    });

    describe('getMemberInfo', () => {
        it('should call getListMember', async () => {
            const memberEmail = 'member@examples.com';
            (mailchimp.lists.getAllLists as jest.Mock).mockResolvedValueOnce({ lists });
            const memberInfo = {
                id: defaultMemberId,
                email_address: memberEmail,
            };
            (mailchimp.lists.getListMember as jest.Mock).mockResolvedValueOnce({ memberInfo });
            const result = await mailchimpAPI.getMemberInfo(defaultListName, memberEmail);
            expect(mailchimp.lists.getListMember).toHaveBeenCalledWith(defaultListId, memberEmail);
            expect(result).toEqual(memberInfo);
        });
    });

    describe('addListMember', () => {
        it('should call addListMember with member email and valid status', async () => {
            const memberEmail = 'member@examples.com';
            (mailchimp.lists.getAllLists as jest.Mock).mockResolvedValueOnce({ lists });
            const memberInfo = {
                id: defaultMemberId,
                email_address: memberEmail,
            };
            const status = 'subscribed';
            (mailchimp.lists.addListMember as jest.Mock).mockResolvedValueOnce({ memberInfo });
            const result = await mailchimpAPI.addMember(memberEmail, status, defaultListName);
            expect(mailchimp.lists.addListMember).toHaveBeenCalledWith(defaultListId, {
                email_address: memberEmail,
                status: status,
            });
            expect(result).toEqual(memberInfo);
        });

        it('should throw with invalid status', async () => {
            const memberEmail = 'member@examples.com';
            const status = 'invalid-status';
            await expect(() => mailchimpAPI.addMember(memberEmail, status, defaultListName)).rejects.toThrow(
                'Invalid status'
            );
        });
    });

    describe('updateListMember', () => {
        it('should call updateListMember with member id and info', async () => {
            const memberEmail = 'member@examples.com';
            (mailchimp.lists.getAllLists as jest.Mock).mockResolvedValueOnce({ lists });
            const memberInfo = {
                id: defaultMemberId,
                email_address: memberEmail,
                status: 'subscribed',
            };
            (mailchimp.lists.updateListMember as jest.Mock).mockResolvedValueOnce({ memberInfo });
            const result = await mailchimpAPI.updateMember(defaultMemberId, memberInfo, defaultListName);
            expect(mailchimp.lists.updateListMember).toHaveBeenCalledWith(defaultListId, defaultMemberId, memberInfo);
            expect(result).toEqual(memberInfo);
        });

        it('should throw with invalid status', async () => {
            const memberInfo = {
                status: 'invalid-status',
            };
            await expect(() => mailchimpAPI.updateMember(defaultMemberId, memberInfo, defaultListName)).rejects.toThrow(
                'Invalid status'
            );
        });
    });

    describe('deleteMember', () => {
        it('should call deleteListMember with member id', async () => {
            (mailchimp.lists.getAllLists as jest.Mock).mockResolvedValueOnce({ lists });
            (mailchimp.lists.deleteListMember as jest.Mock).mockResolvedValueOnce({});
            const result = await mailchimpAPI.deleteMember(defaultMemberId, defaultListName);
            expect(mailchimp.lists.deleteListMember).toHaveBeenCalledWith(defaultListId, defaultMemberId);
            expect(result).toEqual({});
        });
    });
});
