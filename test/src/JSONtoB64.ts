
import { KikiUtils } from '../../server/src/shared/KikiUtils';


const json = JSON.parse(process.argv[2]);

console.log(KikiUtils.btoa(json));
