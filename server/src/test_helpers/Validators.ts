import * as _ from 'lodash';

let validateNotEmpty = (received) => {
    expect(received).not.toBeNull();
    expect(received).not.toBeUndefined();
    expect(received).toBeTruthy();
};

let validateUndefined = (received) => {
    expect(received).toBeUndefined();
};

let validateDeepEquality = (received, expected) => {
    expect(received).not.toBe('dummydummy');
    expect(received).toStrictEqual(expected);
};

let validateEquality = (received, expected) => {
    expect(received).not.toBe('dummydummy');
    expect(received).toBe(expected);
};

let validateStringEquality = (received, expected) => {
    expect(received).not.toEqual('dummydfasfsdfsdfasdsd');
    expect(received).toEqual(expected);
};

let validateArrayLength = (received, expected) => {
    expect(received).not.toHaveLength(10000000000);
    expect(received).toHaveLength(expected);
};

let validateArrayLengthLessThanOrEqual = (received, expected) => {
    expect(received).not.toHaveLength(10000000000);
    expect(_.isArray(received)).toBe(true);
    expect(received.length).toBeLessThanOrEqual(expected);
};

let validateArrayLengthGreaterThanOrEqual = (received, expected) => {
    expect(received).not.toHaveLength(10000000000);
    expect(_.isArray(received)).toBe(true);
    expect(received.length).toBeGreaterThanOrEqual(expected);
};

let validateArrayContaining = (received, expected) => {
    expect(received).not.toEqual(expect.arrayContaining(['dummyData']));
    expect(received).toEqual(expect.arrayContaining(expected));
};

let validateMockValueToHaveBeenCalled = (mockValue) => {
    expect(mockValue).not.toHaveBeenCalledTimes(100);
    expect(mockValue).toHaveBeenCalled();
};

let validateControllerUsed = (received, controller) => {
    expect(received).not.toBe(() => 'dummy');
    expect(received).toBe(controller);
};

let validateObjectMatch = (received, expected) => {
    expect(received).not.toMatchObject({ dfsdaf: 905 });
    expect(received).toMatchObject(expected);
};

let validateMongoDuplicationError = (name, code) => {
    expect(name).not.toEqual(/dummy/i);
    expect(name).toEqual('MongoError');
    expect(code).not.toBe(255);
    expect(code).toBe(11000);
};

let validateTypeOf = (received, expected) => {
    expect(typeof received).not.toBe('dummyType');
    expect(typeof received).toBe(expected);
};

let validateInstanceOf = (received, expected) => {
    function DummyInstance(dummy) {
        this.dummy = dummy;
    }

    expect(received instanceof DummyInstance).toBe(false);
    expect(received instanceof expected).toBe(true);
};

export {
    validateArrayLength,
    validateArrayLengthLessThanOrEqual,
    validateArrayLengthGreaterThanOrEqual,
    validateEquality,
    validateDeepEquality,
    validateObjectMatch,
};
