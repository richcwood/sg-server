import { LogRedacter, LogData } from './LogRedacter';

describe('LogRedacter', () => {
    const redactList = [/password/, /token/];
    const redacter = new LogRedacter(redactList);

    it('should redact a single string value', () => {
        const data: LogData = { password: '123456' };
        const redactedData = redacter.redactMessage(data);

        expect(redactedData).toEqual({ password: '[REDACTED]' });
    });

    it('should redact multiple string values', () => {
        const data: LogData = { password: '123456', token: 'abc123' };
        const redactedData = redacter.redactMessage(data);

        expect(redactedData).toEqual({ password: '[REDACTED]', token: '[REDACTED]' });
    });

    it('should redact a URI with embedded credentials', () => {
        const data: LogData = { url: 'https://user:pass@example.com' };
        const redactedData = redacter.redactMessage(data);

        expect(redactedData).toEqual({ url: 'https://[REDACTED]:[REDACTED]@example.com' });
    });

    it('should redact a URI with partial embedded credentials', () => {
        const data: LogData = { url: 'https://:pass@example.com' };
        const redactedData = redacter.redactMessage(data);

        expect(redactedData).toEqual({ url: 'https://:[REDACTED]@example.com' });
    });

    it('should redact values in nested objects', () => {
        const data: LogData = { password: '123456', nested: { token: 'abc123' } };
        const redactedData = redacter.redactMessage(data);

        expect(redactedData).toEqual({ password: '[REDACTED]', nested: { token: '[REDACTED]' } });
    });

    it('should not modify non-matching keys', () => {
        const data: LogData = { username: 'john', age: 25 };
        const redactedData = redacter.redactMessage(data);

        expect(redactedData).toEqual({ username: 'john', age: 25 });
    });

    it('should not crash on null', () => {
        const data: LogData = null;
        const redactedData = redacter.redactMessage(data);

        expect(redactedData).toEqual(null);
    });

    it('should not crash on empty dict', () => {
        const data: LogData = {};
        const redactedData = redacter.redactMessage(data);

        expect(redactedData).toEqual({});
    });

    it('should not crash on nested null value', () => {
        const data: LogData = {
            _logLevel: 10,
            _appName: 'SaaSGlueAPI',
            _ipAddress: '172.18.128.26',
            _sourceHost: 'c0be2429-71f0-45c5-addb-8cc760382b90',
            _timeStamp: '2023-04-26T04:40:41.086Z',
            msg: 'Received new request',
            path: '/api/v0/stepOutcome/6448ab420b540ee17fd3e8d3',
            method: 'PUT',
            headers: {
                host: 'console.saasglue.com',
                connection: 'close',
                accept: 'application/json, text/plain, */*',
                'content-type': 'application/json;charset=utf-8',
                cookie: '[REDACTED]',
                _teamid: '5f57b2f14b5da00017df0d4f',
                'user-agent': 'axios/0.18.0',
                'x-request-id': 'b8dd5329-01e2-48b2-9e0e-d4654883542e',
                'x-forwarded-for': '3.17.57.152',
                'x-forwarded-proto': 'https',
                'x-forwarded-port': '443',
                via: '1.1 vegur',
                'connect-time': '0',
                'x-request-start': '1682484041083',
                'total-route-time': '0',
                'content-length': '743',
            },
            params: {},
            body: {
                runtimeVars: {},
                dateCompleted: '2023-04-26T04:40:40.263Z',
                stdout:
                    'added 3 packages, and audited 28 packages in 569ms\n' +
                    '2 packages are looking for funding\n' +
                    '  run `npm fund` for details\n' +
                    '1 high severity vulnerability\n' +
                    'To address all issues (including breaking changes), run:\n' +
                    '  npm audit fix --force\n' +
                    'Run `npm audit` for details.\n',
                tail: [
                    '  run `npm fund` for details',
                    '1 high severity vulnerability',
                    'To address all issues (including breaking changes), run:',
                    '  npm audit fix --force',
                    'Run `npm audit` for details.',
                ],
                exitCode: 0,
                lastUpdateId: 2,
                stderr: 'npm WARN deprecated axios@0.18.0: Critical security vulnerability fixed in v0.21.1. For more information, see https://github.com/axios/axios/pull/3410\n',
                status: 20,
                signal: null,
            },
        };

        const redactedData = redacter.redactMessage(data);

        expect(redactedData).toEqual(data);
    });
});
