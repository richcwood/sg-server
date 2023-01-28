import { SGUtils } from '../../server/src/shared/SGUtils';

const str = process.argv[2];

console.log(SGUtils.btoa(str));
