export interface LogData {
    [key: string]: string | number | Record<string, unknown>;
}

const DEFAULT_REDACT_LIST: RegExp[] = [/rmqUsername/, /rmqPassword/, /token/gi, /cookie/];

export class LogRedacter {
    private redactList: RegExp[];

    constructor(redactList: RegExp[] = DEFAULT_REDACT_LIST) {
        // Define a list of keys to redact
        this.redactList = redactList;
    }

    // Redact sensitive information from a log message
    public redactMessage(data: LogData): LogData {
        // Redact sensitive information in the key value pairs
        if (!data) return data;
        const redact = (obj: LogData) => {
            try {
                Object.entries(obj).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        // Redact sensitive information based on the key
                        if (this.redactList.some((pattern) => pattern.test(key))) {
                            value = '[REDACTED]';
                        } else {
                            // Redact URI's with embedded credentials
                            const matches = value.match(/(?<=:\/\/)(?<username>[^:]*):(?<password>[^@]*)@/);
                            if (matches && matches.groups) {
                                if (matches.groups.username)
                                    value = value.replace(matches.groups.username, '[REDACTED]');
                                if (matches.groups.password)
                                    value = value.replace(matches.groups.password, '[REDACTED]');
                            }
                        }

                        obj[key] = value;
                    } else if (value && typeof value === 'object') {
                        // Recursively redact sensitive information in the nested objects
                        redact(value as LogData);
                    }
                });
            } catch (err) {
                console.log('Error redacting message', { err, obj });
            }
        };

        redact(data);

        return data;
    }
}
