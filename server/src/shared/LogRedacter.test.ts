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
});
