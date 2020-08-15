import axios from 'axios';
import * as config from 'config';


class LocalRestAccess {
    public async RestAPICall(url: string, method: string, _teamId: string, headers: any = {}, data: any = {}, token: string = undefined) {
        return new Promise(async (resolve, reject) => {
            try {
                let authToken = token;

                if (!authToken) {
                    authToken = `${config.get('adminToken')};`;
                }

                let apiUrl = config.get('API_BASE_URL');
                const apiVersion = config.get('API_VERSION');
                const apiPort = config.get('API_PORT');

                if (apiPort != '')
                    apiUrl += `:${apiPort}`
                url = `${apiUrl}/api/${apiVersion}/${url}`;

                const combinedHeaders: any = Object.assign({
                    Cookie: `Auth=${authToken}`,
                    _teamId: _teamId
                }, headers);

                // console.log('RestAPICall -> url ', url, ', method -> ', method, ', headers -> ', combinedHeaders, ', data -> ', data, ', token -> ', this.token);

                const response = await axios({
                    url,
                    method: method,
                    responseType: 'text',
                    headers: combinedHeaders,
                    data: data
                });
                resolve(response);
            } catch (e) {
                e.message = `RestAPICall error occurred calling ${method} on '${url}': ${e.message}`;
                reject(e);
            }
        });
    }
}


export const localRestAccess = new LocalRestAccess();