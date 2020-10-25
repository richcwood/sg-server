import sys
import os
import requests
import json
import gzip
import shutil
import time


token = ''

if len(sys.argv) < 4:
    print('Usage: python download_sg_agent.py [teamid] [email] "[password]" [platform] [architecture]')
    sys.exit()

teamId = sys.argv[1]
email = sys.argv[2]
password = sys.argv[3]
platform = sys.argv[4]
arch = None
if len(sys.argv) > 5:
    arch = sys.argv[5]


def RestAPILogin():
    global token
    global email
    global password

    url = 'http://console.saasglue.com/login/apiLogin'
    
    headers = {
        'Content-Type': 'application/json'
    }

    data = {
        'email': email,
        'password': password
    }

    res = requests.post(url=url, headers=headers, data=json.dumps(data))
    if (res.status_code != 200):
        raise Exception(
            'Call to {} returned {} - {}'.format(url, res.status_code, res.text))

    token = res.cookies.get_dict()['Auth']


def GetDownloadUrl():
    global token
    global teamId
    global platform
    global arch

    while token == '':
        RestAPILogin()
        if token == '':
            print('API login failed')
            time.sleep(5)
            print('Retrying api login')
    
    print('token = ', token)

    url = 'https://console.saasglue.com/api/v0/agentDownload/agentstub/{}'.format(platform)
    if arch:
        url += ('/' + arch)

    headers = {
	'Cookie': 'Auth={};'.format(token),
        '_teamId': teamId
    }

    print('headers = ', headers)

    while True:
        res = requests.get(url=url, headers=headers)

        print('res1 = ', res.json())
        print('res2 = ', res.json()['data'])
        if (res.status_code == 200):
            break
        else:
            if (res.status_code == 303):
                time.sleep(10)
            else:
                raise Exception(
                    'Call to {} returned {} - {}'.format(url, res.status_code, res.text))

    return res.json()['data']


def DownloadAgent():
    global platform

    s3url = GetDownloadUrl()

    res = requests.get(s3url, allow_redirects=True)

    if platform.lower()[:3] == 'win':
        open('sg-agent-launcher.zip', 'wb').write(res.content)        
    else:
        open('sg-agent-launcher.gz', 'wb').write(res.content)

        with gzip.open('sg-agent-launcher.gz', 'rb') as f_in:
            with open(outFile, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)

        os.chmod(outFile, 0o777)

        os.remove('sg-agent-launcher.gz')



DownloadAgent()

# cmd = """
# echo | crontab
# (crontab -l ; echo "*/1 * * * * /usr/bin/flock -n ./sg_agent_launcher.lockfile {}") | crontab -
# """.format(outFile)

# os.system(cmd)
