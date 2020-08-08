
import { KikiUtils } from '../../server/src/shared/KikiUtils';


const str = process.argv[2];

console.log(KikiUtils.btoa(str));
