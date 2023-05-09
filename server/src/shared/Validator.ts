import 'reflect-metadata';

export const ValidatorDecorators = {
    Restriction: 'RESTRICTION',
};

export interface Restriction<T> {
    index: number;
    validList: T[];
}

export function restrictTo<T>(validList: T[]): ParameterDecorator {
    return (target: any, propertyKey: string | symbol, index: number) => {
        const list = Reflect.getOwnMetadata(ValidatorDecorators.Restriction, target, propertyKey);
        const obj = {
            index,
            validList,
        };
        if (list) {
            list.push(obj);
        } else {
            Reflect.defineMetadata(ValidatorDecorators.Restriction, [obj], target, propertyKey);
        }
    };
}

export function validate(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    const list: Restriction<string | number>[] = Reflect.getOwnMetadata(
        ValidatorDecorators.Restriction,
        target,
        propertyKey
    );
    if (!list) {
        return;
    }
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any) {
        const invalid = list
            .filter((obj) => {
                const currentArg = args[obj.index];
                return !obj.validList.includes(currentArg);
            })
            .map((x) => args[x.index]);

        if (invalid.length > 0) {
            throw new Error(`Invalid values [${invalid.join(', ')}]`);
        }

        Reflect.apply(originalMethod, this, args);
    };
}

// class ExampleClass {
//     @validate
//     public testRestriction(
//         @restrictTo([99, 45, 12]) value1: number,
//         @restrictTo(['hello', 'foo']) value2: string,
//         value3: string
//     ) {}
// }

// const execute = (action: () => void) => {
//     try {
//         console.log(action());
//     } catch (e) {
//         console.error(`=== Error ===> ${(e as Error).message}`);
//         console.log();
//     }
// };

// async function main() {
//     const instance = new ExampleClass();

//     // execute(() => instance.testRestriction(99, 'hello', 'hey'));
//     // execute(() => instance.testRestriction(45, 'foo', 'hey'));
//     // execute(() => instance.testRestriction(45, 'not-allowed', 'hey'));
//     execute(() => instance.testRestriction(46, 'hello', 'hey'));
//     // execute(() => instance.testRestriction(46, 'not-allowed', 'hey'));
// }

// main();
