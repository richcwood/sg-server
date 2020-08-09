
import { SGUtils } from '../../server/src/shared/SGUtils';


const b64 = process.argv[2];

console.log(SGUtils.atob(b64));
