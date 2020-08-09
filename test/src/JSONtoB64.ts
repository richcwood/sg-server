
import { SGUtils } from '../../server/src/shared/SGUtils';


const json = JSON.parse(process.argv[2]);

console.log(SGUtils.btoa(json));
