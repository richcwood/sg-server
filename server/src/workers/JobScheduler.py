import sys
import os
import traceback
import time
from datetime import datetime
import socket
import logging
from logging.handlers import TimedRotatingFileHandler
from threading import Event
from threading import Thread
from pytz import utc
import json
import requests
import sendgrid
from sendgrid.helpers.mail import *

from rmq_comm import *

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.executors.pool import ProcessPoolExecutor

logging.basicConfig()

wait_schedule_updates_handler_exception = Event()

env = 'default'
if 'NODE_ENV' in os.environ:
    env = os.environ['NODE_ENV']

sendGrid = sendgrid.SendGridAPIClient(api_key=os.environ.get('SENDGRID_API_KEY'))

mongoUrl = None
mongoDbName = None
rmqUrl = None
rmqUsername = None
rmqPassword = None
rmqVhost = None
rmqScheduleUpdatesQueue = None
environment = None
loggingLevel = None
useSSL = None
apiBaseUrl = None
apiPort = None
apiVersion = None
token = None

def loadConfigValues(configFile):
    global mongoUrl
    global mongoDbName
    global rmqUrl
    global rmqUsername
    global rmqPassword
    global rmqVhost
    global rmqScheduleUpdatesQueue
    global environment
    global loggingLevel
    global useSSL
    global apiBaseUrl
    global apiPort
    global apiVersion
    global token
    with open(configFile, 'r') as f:
        s = f.read()
        config = json.loads(s)
        if 'mongoUrl' in config:
            mongoUrl = config['mongoUrl']
        if 'mongoDbName' in config:
            mongoDbName = config['mongoDbName']
        if 'rmqUrl' in config:
            rmqUrl = config['rmqUrl']
        if 'rmqUsername' in config:
            rmqUsername = config['rmqUsername']
        if 'rmqPassword' in config:
            rmqPassword = config['rmqPassword']
        if 'rmqVhost' in config:
            rmqVhost = config['rmqVhost']
        if 'rmqScheduleUpdatesQueue' in config:
            rmqScheduleUpdatesQueue = config['rmqScheduleUpdatesQueue']
        if 'environment' in config:
            environment = config['environment']
        if 'loggingLevel' in config:
            loggingLevel = config['loggingLevel']
        if 'useSSL' in config:
            useSSL = (config['useSSL'] == 'true')
        if 'API_BASE_URL' in config:
            apiBaseUrl = config['API_BASE_URL']
        if 'API_PORT' in config:
            apiPort = config['API_PORT']
        if 'API_VERSION' in config:
            apiVersion = config['API_VERSION']
        if 'schedulerToken' in config:
            token = 'Auth={};'.format(config['schedulerToken'])

loadConfigValues('config/default.json')
if env != 'default':
    loadConfigValues('config/{}.json'.format(env))

cm_logger = logging.getLogger('job_scheduler')
cm_logger.setLevel(int(loggingLevel))

formatter = logging.Formatter('{"_timeStamp": "%(asctime)s", "_sourceHost": "%(host_name)s", "_appName": "%(app_name)s", "_logLevel": %(levelno)s, "details": %(message)s}')

stdout_handler = logging.StreamHandler(sys.stdout)
stdout_handler.setLevel(logging.DEBUG)
stdout_handler.setFormatter(formatter)
cm_logger.addHandler(stdout_handler)

timed_rotating_file_handler = TimedRotatingFileHandler('./logs/jobscheduler.log', when='s', interval=30, backupCount=10)
timed_rotating_file_handler.setLevel(logging.DEBUG)
timed_rotating_file_handler.setFormatter(formatter)
cm_logger.addHandler(timed_rotating_file_handler)

host = socket.gethostname()
cml_adapter = logging.LoggerAdapter(cm_logger, {'build': environment, 'app_name': 'JobScheduler', 'host_name': host})

jobstores = {
    'default': MongoDBJobStore(database=mongoDbName, collection='scheduled_job_1', host=mongoUrl)
}

executors = {
    'default': ThreadPoolExecutor(20),
    'processpool': ProcessPoolExecutor(5)
}

job_defaults = {
    'coalesce': True,
    'max_instances': 1
}

rmqCon = None
job_scheduler = BlockingScheduler()
job_scheduler.configure(jobstores=jobstores, executors=executors,
                        job_defaults=job_defaults, timezone=utc)


def logDebug(msgData):
    global cml_adapter
    cml_adapter.error(json.dumps(msgData))


def logInfo(msgData):
    global cml_adapter
    cml_adapter.error(json.dumps(msgData))


def logError(msgData):
    global cml_adapter
    cml_adapter.error(json.dumps(msgData))


def sendEmail(from_mail, to_email, subject, body):
    global sendGrid

    from_email_obj = Email("rich@saasglue.com")
    to_email_obj = To("rich@saasglue.com")
    content = Content("text/plain", body)
    mail = Mail(from_email_obj, to_email_obj, subject, content)
    response = sendGrid.client.mail.send.post(request_body=mail.get())
    if response.status_code != 202:
        logError({"msg": "Error sending alert email", "Method": "sendEmail", "from_mail": from_mail, "to_email": to_email, "subject": subject, "body": body, "response": response.status_code + " - " + response.body})
    # else:
    #     logDebug({"msg": "successfully sent email"})


def RestAPICall(url, method, _teamId, headers, data={}):
    global cml_adapter
    global token
    global apiBaseUrl
    global apiPort
    global apiVersion

    try:
        apiUrl = apiBaseUrl
        if apiPort != '':
            apiUrl += ':{}'.format(apiPort)
        url = '{}/api/{}/{}'.format(apiUrl, apiVersion, url)

        default_headers = {
            'Cookie': token,
            '_teamId': _teamId
        }

        headers.update(default_headers)

        if method == 'POST':
            res = requests.post(url=url, headers=headers, data=data)
        elif method == 'PUT':
            res = requests.put(url=url, headers=headers, data=data)
        else:
            raise Exception('{} method not supported'.format(method))
        if (str(res.status_code)[0] != '2'):
            raise Exception('Call to {} returned {} - {}'.format(url, res.status_code, res.text))
    except Exception as ex:
        logError({"msg": str(ex), "Method": "RestAPICall", "url": url, "method": method, "_teamId": _teamId, "headers": headers, "data": data})


def on_launch_job(scheduled_time, job_id, _teamId, targetId):
    logInfo({"msg": "Launching job", "_teamId": _teamId, "_jobDefId": targetId, "date": datetime.now(), "scheduled_time": scheduled_time})
    RestAPICall('job', 'POST', _teamId, {'_jobDefId': targetId}, {'dateScheduled': scheduled_time})

    job = job_scheduler.get_job(job_id)
    if job:
        url = 'schedule/fromscheduler/{}'.format(job_id)
        RestAPICall(url, 'PUT', _teamId, {}, {'lastScheduledRunDate': scheduled_time, 'nextScheduledRunDate': job.next_run_time})
        logInfo({"msg": "Updating job info 1", "url": url, "job_id": job_id, "lastScheduledRunDate": scheduled_time, "nextScheduledRunDate": job.next_run_time})


def on_message(delivery_tag, body, async_consumer):
    global cml_adapter
    global job_scheduler

    try:
        # async_consumer.stop_consuming()

        # while async_consumer._actively_consuming:
        #     time.sleep(1)
        # async_consumer.acknowledge_message(delivery_tag)

        msg = json.loads(body)

        # job_scheduler.print_jobs()

        if msg['Action'] == 'UpdateJob':
            misfire_grace_time = None
            if 'misfire_grace_time' in msg and msg['misfire_grace_time'] != '':
                misfire_grace_time = msg['misfire_grace_time']

            coalesce = None
            if 'coalesce' in msg and msg['coalesce'] != '':
                coalesce = msg['coalesce']

            max_instances = 10
            if 'max_instances' in msg and msg['max_instances'] != '':
                max_instances = msg['max_instances']

            useNextRunTime = False
            if 'next_run_time' in msg and msg['next_run_time'] != '':
                useNextRunTime = True
                if 'next_run_time' == 'None':
                    next_run_time = None
                else:
                    next_run_time = msg['next_run_time']

            isActive = True
            if 'isActive' in msg:
                isActive = msg['isActive']
            if not isActive:
                useNextRunTime = True
                next_run_time = None

            run_date = None
            year = None
            month = None
            day = None
            week = None
            day_of_week = None
            hour = None
            minute = None
            second = None
            weeks = 0
            days = 0
            hours = 0
            minutes = 0
            seconds = 0
            start_date = None
            end_date = None
            jitter = None
            timezone = utc

            if msg['TriggerType'] == 'date':
                if 'RunDate' in msg:
                    run_date = msg['RunDate']
            elif msg['TriggerType'] == 'cron':
                if 'Year' in msg['cron'] and msg['cron']['Year'] != '':
                    year = msg['cron']['Year']
                if 'Month' in msg['cron'] and msg['cron']['Month'] != '':
                    month = msg['cron']['Month']
                if 'Day' in msg['cron'] and msg['cron']['Day'] != '':
                    day = msg['cron']['Day']
                if 'Week' in msg['cron'] and msg['cron']['Week'] != '':
                    week = msg['cron']['Week']
                if 'Day_Of_Week' in msg['cron'] and msg['cron']['Day_Of_Week'] != '':
                    day_of_week = msg['cron']['Day_Of_Week']
                if 'Hour' in msg['cron'] and msg['cron']['Hour'] != '':
                    hour = msg['cron']['Hour']
                if 'Minute' in msg['cron'] and msg['cron']['Minute'] != '':
                    minute = msg['cron']['Minute']
                if 'Second' in msg['cron'] and msg['cron']['Second'] != '':
                    second = msg['cron']['Second']
                if 'Start_Date' in msg['cron'] and msg['cron']['Start_Date']:
                    start_date = msg['cron']['Start_Date']
                if 'End_Date' in msg['cron'] and msg['cron']['End_Date']:
                    end_date = msg['cron']['End_Date']
                if 'Jitter' in msg['cron'] and msg['cron']['Jitter'] != '':
                    jitter = int(msg['cron']['Jitter'])
                if 'Timezone' in msg['cron'] and msg['cron']['Timezone'] != '':
                    timezone = msg['cron']['Timezone']
            elif msg['TriggerType'] == 'interval':
                if 'Weeks' in msg['interval'] and msg['interval']['Weeks'] != '':
                    weeks = int(msg['interval']['Weeks'])
                if 'Days' in msg['interval'] and msg['interval']['Days'] != '':
                    days = int(msg['interval']['Days'])
                if 'Hours' in msg['interval'] and msg['interval']['Hours'] != '':
                    hours = int(msg['interval']['Hours'])
                if 'Minutes' in msg['interval'] and msg['interval']['Minutes'] != '':
                    minutes = int(msg['interval']['Minutes'])
                if 'Seconds' in msg['interval'] and msg['interval']['Seconds'] != '':
                    seconds = int(msg['interval']['Seconds'])
                if 'Start_Date' in msg['interval'] and msg['interval']['Start_Date']:
                    start_date = msg['interval']['Start_Date']
                if 'End_Date' in msg['interval'] and msg['interval']['End_Date']:
                    end_date = msg['interval']['End_Date']
                if 'Jitter' in msg['interval'] and msg['interval']['Jitter'] != '':
                    jitter = int(msg['interval']['Jitter'])

            job = job_scheduler.get_job(msg['id'])
            if job:
                changeTypes = []
                if job.trigger != msg['TriggerType']:
                    changeTypes.append('schedule')
                if job.misfire_grace_time != misfire_grace_time or (not useNextRunTime and hasattr(job, 'next_run_time')) or job.next_run_time != next_run_time:
                    changeTypes.append('job')
                if 'schedule' in changeTypes:
                    # print('schedule change')
                    if msg['TriggerType'] == 'cron':
                        job_scheduler.reschedule_job(msg['id'], trigger='cron', year=year, month=month, day=day, week=week, day_of_week=day_of_week, hour=hour,
                                                     minute=minute, second=second, start_date=start_date, end_date=end_date, timezone=timezone, jitter=jitter)
                    elif msg['TriggerType'] == 'interval':
                        job_scheduler.reschedule_job(msg['id'], trigger='interval', weeks=weeks, days=days, hours=hours, minutes=minutes, seconds=seconds,
                                                     start_date=start_date, end_date=end_date, jitter=jitter)
                    elif msg['TriggerType'] == 'date':
                        job_scheduler.reschedule_job(
                            msg['id'], trigger='date', run_date=run_date)
                if 'job' in changeTypes:
                    # print('job change')
                    if useNextRunTime:
                        job_scheduler.modify_job(msg['id'], misfire_grace_time=misfire_grace_time, coalesce=coalesce,
                                                 next_run_time=next_run_time, max_instances=max_instances, kwargs=msg['FunctionKwargs'])
                    else:
                        nj = job_scheduler.modify_job(msg['id'], misfire_grace_time=misfire_grace_time,
                                                      coalesce=coalesce, max_instances=max_instances, kwargs=msg['FunctionKwargs'])
                        # print(nj)
            else:
                if msg['TriggerType'] == 'cron':
                    if useNextRunTime:
                        job_scheduler.add_job(on_launch_job, 'cron', name=msg['name'], id=msg['id'],
                                              misfire_grace_time=misfire_grace_time, coalesce=coalesce, next_run_time=next_run_time, max_instances=max_instances,
                                              year=year, month=month, day=day, week=week, day_of_week=day_of_week, hour=hour, minute=minute, second=second, start_date=start_date, end_date=end_date, timezone=timezone, 
                                              jitter=jitter, kwargs=msg['FunctionKwargs'])
                    else:
                        job_scheduler.add_job(on_launch_job, 'cron', name=msg['name'], id=msg['id'],
                                              misfire_grace_time=misfire_grace_time, coalesce=coalesce, max_instances=max_instances,
                                              year=year, month=month, day=day, week=week, day_of_week=day_of_week, hour=hour, minute=minute, second=second, start_date=start_date, end_date=end_date, timezone=timezone, 
                                              jitter=jitter, kwargs=msg['FunctionKwargs'])

                elif msg['TriggerType'] == 'interval':
                    if useNextRunTime:
                        job_scheduler.add_job(on_launch_job, 'interval', name=msg['name'], id=msg['id'],
                                              misfire_grace_time=misfire_grace_time, coalesce=coalesce, next_run_time=next_run_time, max_instances=max_instances,
                                              weeks=weeks, days=days, hours=hours, minutes=minutes, seconds=seconds, start_date=start_date, end_date=end_date, jitter=jitter,
                                              kwargs=msg['FunctionKwargs'])
                    else:
                        job_scheduler.add_job(on_launch_job, 'interval', name=msg['name'], id=msg['id'],
                                              misfire_grace_time=misfire_grace_time, coalesce=coalesce, max_instances=max_instances,
                                              weeks=weeks, days=days, hours=hours, minutes=minutes, seconds=seconds, start_date=start_date, end_date=end_date, jitter=jitter,
                                              kwargs=msg['FunctionKwargs'])

                elif msg['TriggerType'] == 'date':
                    job_scheduler.add_job(on_launch_job, 'date', name=msg['name'], id=msg['id'],
                                          misfire_grace_time=misfire_grace_time, coalesce=coalesce, max_instances=max_instances,
                                          run_date=run_date,
                                          kwargs=msg['FunctionKwargs'])
        elif msg['Action'] == 'PauseJob':
            job_scheduler.pause_job(msg['id'])
        elif msg['Action'] == 'ResumeJob':
            job_scheduler.resume_job(msg['id'])
        elif msg['Action'] == 'RemoveJob':
            job_scheduler.remove_job(msg['id'])

        job = job_scheduler.get_job(msg['id'])
        if job:
            url = 'schedule/fromscheduler/{}'.format(job.id)
            RestAPICall(url, 'PUT', msg['_teamId'], {}, {'nextScheduledRunDate': job.next_run_time})
            logInfo({"msg": "Updating job info 2", "url": url, "job_id": job.id, "nextScheduledRunDate": job.next_run_time})

        async_consumer.acknowledge_message(delivery_tag)
        # job_scheduler.print_jobs()
    except Exception as ex:
        async_consumer.acknowledge_message(delivery_tag)
        url = 'schedule/fromscheduler/{}'.format(msg['id'])
        RestAPICall(url, 'PUT', msg['_teamId'], {}, {'scheduleError': ex.message})
        logError({"msg": str(ex), "Method": "on_message", "body": body})
    # finally:
    #     async_consumer.start_consuming()


def schedule_updates_handler(args1, stop_event):
    global rmqCon
    global rmqUrl
    global rmqUsername
    global rmqPassword
    global rmqVhost
    global rmqScheduleUpdatesQueue
    global cml_adapter
    global wait_schedule_updates_handler_exception
    global useSSL

    urlRoot = 'amqp'
    if useSSL:
        urlRoot += 's'
    rmqCon = AsyncConsumer('{0}://{1}:{2}@{3}/{4}?heartbeat_interval=30'.format(
        urlRoot,
        rmqUsername,
        rmqPassword,
        rmqUrl,
        rmqVhost),
        cml_adapter,
        {
            'exch': 'worker',
            'exch_type': 'topic',
            'durable': True,
            'queue_name': rmqScheduleUpdatesQueue,
            'exclusive': False,
            'auto_delete': False,
            'routing_key': rmqScheduleUpdatesQueue,
            'prefetch_count': 10,
            'no_ack': False,
            'on_message': on_message,
            'exception_event': wait_schedule_updates_handler_exception
    })

    rmqCon.run()


def stop_schedule_updates_handler():
    global rmqCon
    if rmqCon:
        rmqCon.stop()


def run_scheduler_async(args1, stop_event):
    """
    Run the scheduler in a separate thread as it is blocking
    """
    global cml_adapter
    global job_scheduler

    try:
        job_scheduler.start()
    except Exception as e:
        logError({"Msg": str(e), "Method": "run_scheduler_async"})


def main():
    global cml_adapter
    global wait_schedule_updates_handler_exception
    global job_scheduler

    run_scheduler_async_thread_stop = Event()
    run_scheduler_async_thread = Thread(
        target=run_scheduler_async, args=(1, run_scheduler_async_thread_stop))
    run_scheduler_async_thread.start()

    handle_schedule_updates_thread_stop = Event()
    handle_schedule_updates_thread = Thread(
        target=schedule_updates_handler, args=(1, handle_schedule_updates_thread_stop))

    try:
        cml_adapter.info({"msg": "Starting JobScheduler"})
        handle_schedule_updates_thread.start()
        while True:
            schedule_updates_exception_occurred = wait_schedule_updates_handler_exception.wait(5)
            if schedule_updates_exception_occurred:
                cml_adapter.error({"msg": "Exception occurred in on_message event"})
                wait_schedule_updates_handler_exception.clear()
    except KeyboardInterrupt:
        logInfo({"msg": "process interrupted - exiting", "Method": "main"})
        stop_schedule_updates_handler()
        handle_schedule_updates_thread_stop.set()
        handle_schedule_updates_thread.join()
        run_scheduler_async_thread_stop.set()
        job_scheduler.shutdown()
        run_scheduler_async_thread.join()
        sys.exit(0)
    except Exception as ex:
        logError({"msg": str(ex), "Method": "main"})
        traceback.print_exc(file=sys.stdout)
        sys.exit(0)


if __name__ == "__main__":
    main()
