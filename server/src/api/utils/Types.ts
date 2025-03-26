export enum ResponseCode {
    OK = 200,
    CREATED = 201,
    NOT_AVAILABLE = 303,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    UNEXPECTED_ERROR = 500,
}

export class ResponseWrapper {
    public data: any;
    public warnings: Object[];
    public errors: Object[];
    public statusCode: number = 200;
    public meta: Object;
}

export type Subset<K> = {
    [attr in keyof K]?: K[attr] extends object
        ? Subset<K[attr]>
        : K[attr] extends object | null
        ? Subset<K[attr]> | null
        : K[attr] extends object | null | undefined
        ? Subset<K[attr]> | null | undefined
        : K[attr];
};
