
import { KikiUtils } from '../../server/src/shared/KikiUtils';


const b64 = process.argv[2];

console.log(KikiUtils.atob(b64));
