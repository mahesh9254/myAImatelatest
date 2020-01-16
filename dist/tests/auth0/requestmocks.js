"use strict";
/*eslint-env mocha */
/*eslint no-unused-vars: 0 */
Object.defineProperty(exports, "__esModule", { value: true });
const TOKENS = {
    GOOD: 'eyJ0eXAiOiJKV1QiLCXXXciOiJSUzI1NYYYImtpZCI6Ik5VRkZRMEZFUlRVMk1qQXhNMEU1TXpaQ09FVkZRVVU1' +
        'UmpRMk1UazRPRU01TmpRek5ETTFRUSJ9.eyJpc3MiOiJodHRwczovL2RhbGVsYW5lLmV1LmF1dGgwLmNvbS8iLC' +
        'JzdWIiOiJ6bmdXWWJWdnNGbWUwQmF3amNyVXl4MmFlNmxneHh5VkBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9kY' +
        'WxlbGFuZS5ldS5hdXRoMC5jb20vYXBpL3YyLyIsImV4cCI6MTQ5MTE3MjMzNywiaWF0IjoxNDkxMDg1OTM3LCJz' +
        'Y29wZSI6InJlYWQ6dXNlcnMgdXBkYXRlOnVzZXJzIGRlbGV0ZTp1c2VycyBjcmVhdGU6dXNlcnMgcmVhZDp1c2V' +
        'yX2lkcF90b2tlbnMifQ.W1us_c9XbGrDSfa5pHzP1V1jj2rMqI_7xd2-iM_b8N2kfxkzPa5JGxrqtMOpuW9c-MO' +
        'kPGrEtFay_LdVWpI_S3xNOfEwULAs8Y6F2OrtBnTfKmSf-JY9JyzubStDvQMPB6noXlhR9a9WG91bdmvX9CKg3p' +
        '7ocbYQ_xxEdOUqNx6BWOXZbpLmpyyxxS3jgMzl5EgDsdjlCQ6nzCTFcWS6_aUMK-jpNjMr_tB25BTnfq23rEkMu' +
        'FmIY8KMZyj1_Y47BPjHhswkZvMFsWARfYntDefZujYCgniZcegGo8L6uvYvWEIL4IuQO8sOy9uxXUGT5Xl0kvVL' +
        '58-pFeRf7SX3Tg',
};
exports.getOauthToken = {
    good: () => {
        return Promise.resolve({
            access_token: TOKENS.GOOD,
            expires_in: 86400,
            scope: 'read:users update:users delete:users create:users read:user_idp_tokens',
            token_type: 'Bearer',
        });
    },
};
exports.getUser = {
    johndoe: (token, userid) => {
        const user = {
            email: 'bobbyball@do-not-require-emailaddresses-for-students.com',
            username: 'bobbyball',
            email_verified: true,
            user_id: 'auth0|58dd72d0b2e87002695249b6',
            picture: 'https://s.gravatar.com/avatar/6a7512080cf8cfd52c49e04a28997521',
            nickname: 'bobbyball',
            identities: [
                {
                    user_id: '58dd72d0b2e87002695249b6',
                    provider: 'auth0',
                    connection: 'ml-for-kids-users',
                    isSocial: false,
                },
            ],
            updated_at: '2017-04-16T23:29:12.445Z',
            created_at: '2017-03-30T21:04:16.866Z',
            name: 'bobbyball@do-not-require-emailaddresses-for-students.com',
            last_password_reset: '2017-04-16T23:29:09.355Z',
            app_metadata: {
                role: 'student',
                tenant: 'single',
            },
            last_ip: '87.114.106.231',
            last_login: '2017-04-16T23:29:12.445Z',
            logins_count: 2,
            blocked_for: [],
            guardian_enrollments: [],
        };
        return Promise.resolve(user);
    },
};
exports.getUsers = {
    empty: (token, tenant) => {
        return Promise.resolve([]);
    },
    single: (token, tenant) => {
        const role = 'student';
        return Promise.resolve([
            {
                email: 'bobbyball@do-not-require-emailaddresses-for-students.com',
                username: 'bobbyball',
                email_verified: true,
                user_id: 'auth0|58dd72d0b2e87002695249b6',
                picture: 'https://s.gravatar.com/avatar/6a7512080cf8cfd52c49e04a28997521',
                nickname: 'bobbyball',
                identities: [
                    {
                        user_id: '58dd72d0b2e87002695249b6',
                        provider: 'auth0',
                        connection: 'ml-for-kids-users',
                        isSocial: false,
                    },
                ],
                updated_at: '2017-04-16T23:29:12.445Z',
                created_at: '2017-03-30T21:04:16.866Z',
                name: 'bobbyball@do-not-require-emailaddresses-for-students.com',
                last_password_reset: '2017-04-16T23:29:09.355Z',
                app_metadata: {
                    role,
                    tenant: 'single',
                },
                last_ip: '87.114.106.231',
                last_login: '2017-04-16T23:29:12.445Z',
                logins_count: 2,
                blocked_for: [],
                guardian_enrollments: [],
            },
        ]);
    },
    error: (token, tenant) => {
        throw new Error('Failed to get users');
    },
};
exports.getUserCounts = (token, tenant) => {
    return Promise.resolve({
        start: 0,
        limit: 50,
        length: 5,
        total: 5,
        users: [{}, {}, {}, {}, {}],
    });
};
exports.createUser = {
    good: (token, newuser) => {
        const placeholder = {
            email: newuser.email,
            username: newuser.username,
            app_metadata: newuser.app_metadata,
            identities: [
                {
                    connection: newuser.connection,
                    user_id: '58f53e68d5a7f96b05b72c70',
                    provider: 'auth0',
                    isSocial: false,
                },
            ],
            email_verified: false,
            user_id: 'auth0|58f53e68d5a7f96b05b72c70',
            picture: 'https://s.gravatar.com/avatar/e3c2ee5413cf2a34ec3f9d3f605b9067',
            updated_at: '2017-04-17T22:15:04.536Z',
            created_at: '2017-04-17T22:15:04.536Z',
        };
        return Promise.resolve(placeholder);
    },
};
exports.deleteUser = {
    good: (token, userid) => {
        return Promise.resolve();
    },
};
exports.modifyUser = {
    good: (token, userid, modifications) => {
        const placeholder = {
            email: 'bobbyball@do-not-require-emailaddresses-for-students.com',
            username: 'bobbyball',
            email_verified: true,
            user_id: userid,
            picture: 'https://s.gravatar.com/avatar/6a7512080cf8cfd52c49e04a28997521',
            nickname: 'bobbyball',
            identities: [{ user_id: userid,
                    provider: 'auth0',
                    connection: 'ml-for-kids-users',
                    isSocial: false }],
            updated_at: '2017-04-16T23:29:12.445Z',
            created_at: '2017-03-30T21:04:16.866Z',
            name: 'bobbyball@do-not-require-emailaddresses-for-students.com',
            last_password_reset: '2017-04-16T23:29:09.355Z',
            app_metadata: { role: 'student', tenant: 'apple' },
            last_ip: '87.114.106.231',
            last_login: '2017-04-16T23:29:12.445Z',
            logins_count: 2,
        };
        return Promise.resolve(placeholder);
    },
};
