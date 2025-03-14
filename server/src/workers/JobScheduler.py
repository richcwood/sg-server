import json
import requests
import sendgrid
import socket
import sys
import traceback

from datetime import datetime, date, timedelta
from dotenv import load_dotenv
from os import environ, path
from pprint import pprint
from pytz import utc
from sendgrid.helpers.mail import *
from threading import Event, Thread

from apscheduler.executors.pool import ProcessPoolExecutor, ThreadPoolExecutor
from apscheduler.jobstores.mongodb import MongoDBJobStore
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.util import timedelta_seconds

from py_utils.credentials import Credentials
from py_utils.logger import logger
from py_utils.rmq_comm import *

wait_schedule_updates_handler_exception = Event()

env = "default"
if "NODE_ENV" in environ:
    env = environ["NODE_ENV"]

sendGrid = sendgrid.SendGridAPIClient(api_key=environ.get("SENDGRID_API_KEY"))


def logDebug(msgData):
    logger.debug("%s", msgData)


def logInfo(msgData):
    logger.debug("%s", msgData)


def logWarning(msgData):
    logger.debug("%s", msgData)


def logError(msgData):
    logger.debug("%s", msgData)


def getConfigValues(configFile, currentConfig={}) -> dict:
    config = {}
    with open(configFile, "r") as f:
        s = f.read()
        config = json.loads(s)
    return currentConfig | config


def load_rabbitmq_secrets(params):
    credentials = Credentials(logInfo, logWarning, logError, **params)
    credentials.reset_cache()
    secrets = credentials.get_secret()
    for key in secrets:
        environ[key] = secrets[key]


config = getConfigValues("config/default.json")
if env != "default":
    env_config_file_name = "config/{}.json".format(env)
    if path.isfile(env_config_file_name):
        config = getConfigValues("config/{}.json".format(env), config)

rmqScheduleUpdatesQueue = config.get("rmqScheduleUpdatesQueue")
environment = config.get("environment")
loggingLevel = config.get("loggingLevel")
useSSL = config.get("useSSL") == "true"
apiBaseUrl = config.get("API_BASE_URL")
apiPort = config.get("API_PORT")
apiVersion = config.get("API_VERSION")

if env == "production":
    load_rabbitmq_secrets(config["rabbitmq-credentials"])
else:
    load_dotenv()

mongoUrl = environ["mongoUrl"]
mongoDbName = environ["mongoDbName"]
token = "Auth={};".format(environ["schedulerToken"])
rmqUrl = environ["rmqUrl"]
rmqUsername = environ["rmqUsername"]
rmqPassword = environ["rmqPassword"]
rmqVhost = environ["rmqVhost"]

jobstores = {
    "default": MongoDBJobStore(
        database=mongoDbName, collection="scheduled_job_1", host=mongoUrl
    )
}

executors = {"default": ThreadPoolExecutor(20), "processpool": ProcessPoolExecutor(5)}

job_defaults = {"coalesce": True, "max_instances": 1}

rmqCon = None
job_scheduler = BlockingScheduler()
job_scheduler.configure(
    jobstores=jobstores, executors=executors, job_defaults=job_defaults, timezone=utc
)

schedule_trigger_type_to_string = {
    IntervalTrigger: "interval",
    DateTrigger: "date",
    CronTrigger: "cron",
}


def send_email(from_mail, to_email, subject, body):
    global sendGrid

    from_email_obj = Email("rich@saasglue.com")
    to_email_obj = To("rich@saasglue.com")
    content = Content("text/plain", body)
    mail = Mail(from_email_obj, to_email_obj, subject, content)
    response = sendGrid.client.mail.send.post(request_body=mail.get())
    if response.status_code != 202:
        logError(
            {
                "msg": "Error sending alert email",
                "Method": "send_email",
                "from_mail": from_mail,
                "to_email": to_email,
                "subject": subject,
                "body": body,
                "response": response.status_code + " - " + response.body,
            }
        )


def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""

    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError("Type %s not serializable" % type(obj))


def rest_api_call(url, method, _teamId, headers, data={}):
    global token
    global apiBaseUrl
    global apiPort
    global apiVersion

    http_response_code = ""
    try:
        api_url = apiBaseUrl
        if apiPort != "":
            api_url += ":{}".format(apiPort)
        url = "{}/api/{}/{}".format(api_url, apiVersion, url)

        default_headers = {
            "Cookie": token,
            "_teamId": _teamId,
            "Content-type": "application/json",
        }

        headers.update(default_headers)

        json_data = json.dumps(data, default=json_serial)

        if method == "POST":
            res = requests.post(url=url, headers=headers, data=json_data, verify=False)
        elif method == "PUT":
            res = requests.put(url=url, headers=headers, data=json_data, verify=False)
        elif method == "DELETE":
            res = requests.delete(
                url=url, headers=headers, data=json_data, verify=False
            )
        else:
            raise Exception("{} method not supported".format(method))
        http_response_code = res.status_code
        if str(res.status_code)[0] != "2":
            raise Exception(
                "Call to {} returned {} - {}".format(url, res.status_code, res.text)
            )
        return [True, http_response_code]
    except Exception as ex:
        logError(
            {
                "msg": str(ex),
                "Method": "rest_api_call",
                "url": url,
                "method": method,
                "_teamId": _teamId,
                "headers": headers,
                "data": data,
            }
        )
        return [False, http_response_code]


def on_launch_job(scheduled_time, job_id, _teamId, targetId, runtimeVars):
    runtimeVars["scheduled_time"] = {"value": scheduled_time, "sensitive": False}
    data = {
        "dateScheduled": scheduled_time,
        "runtimeVars": runtimeVars,
        "_scheduleId": job_id,
    }
    logInfo(
        {
            "msg": "Launching job",
            "_teamId": _teamId,
            "_jobDefId": targetId,
            "date": datetime.now(),
            "scheduled_time": scheduled_time,
            "_scheduleId": job_id,
            "data": data,
        }
    )
    res = rest_api_call("job", "POST", _teamId, {"_jobDefId": targetId}, data)

    updateSchedule = True
    if not res[0]:
        if res[1] == 404:
            updateSchedule = False
            # job_scheduler.remove_job(job_id)
            logInfo(
                {
                    "msg": "Job does not exist - deleting schedule",
                    "_teamId": _teamId,
                    "_jobDefId": targetId,
                    "date": datetime.now(),
                    "_scheduleId": job_id,
                }
            )
            res = rest_api_call("schedule/{}".format(job_id), "DELETE", _teamId, {}, {})

    if updateSchedule:
        job = job_scheduler.get_job(job_id)

        if job:
            url = "schedule/fromscheduler/{}".format(job_id)
            rest_api_call(
                url,
                "PUT",
                _teamId,
                {},
                {
                    "lastScheduledRunDate": scheduled_time,
                    "nextScheduledRunDate": job.next_run_time,
                },
            )
            logInfo(
                {
                    "msg": "Updating job info 1",
                    "url": url,
                    "job_id": job_id,
                    "lastScheduledRunDate": scheduled_time,
                    "nextScheduledRunDate": job.next_run_time,
                }
            )
        else:
            # If a schedule is no longer valid, e.g. the next calculated run date would be less than the end date, the internal schedule is automatically
            #   deleted - if that happens, also delete the schedule from the SaaSGlue job
            logInfo(
                {
                    "msg": "Schedule no longer valid - deleting",
                    "_teamId": _teamId,
                    "_jobDefId": targetId,
                    "date": datetime.now(),
                    "_scheduleId": job_id,
                }
            )
            res = rest_api_call("schedule/{}".format(job_id), "DELETE", _teamId, {}, {})


def parse_job_interval(job):
    weeks = job["weeks"] if "weeks" in job else 0
    days = job["days"] if "days" in job else 0
    hours = job["hours"] if "hours" in job else 0
    minutes = job["minutes"] if "minutes" in job else 0
    seconds = job["seconds"] if "seconds" in job else 0
    interval = timedelta_seconds(
        timedelta(weeks=weeks, days=days, hours=hours, minutes=minutes, seconds=seconds)
    )
    return interval


def interval_schedule_changed(existing_job, job):
    interval = parse_job_interval(job)
    if existing_job.trigger.interval_length != interval:
        return True
    if (
        existing_job.trigger.start_date != job["start_date"]
        if "start_date" in job
        else ""
    ):
        return True
    if existing_job.trigger.end_date != job["end_date"] if "end_date" in job else "":
        return True
    if existing_job.trigger.tzinfo != job["tzinfo"] if "tzinfo" in job else "":
        return True
    if existing_job.trigger.jitter != job["jitter"] if "jitter" in job else "":
        return True
    return False


def cron_schedule_changed(existing_job, job):
    for i in range(len(existing_job.trigger.FIELD_NAMES)):
        current_value = existing_job.trigger.fields[i]
        field_name = existing_job.trigger.FIELD_NAMES[i]
        schedule_value = None
        if field_name in job:
            schedule_value = job[field_name]
        if not current_value.is_default and schedule_value != None:
            if str(current_value) != str(schedule_value):
                return True
        elif not current_value.is_default or schedule_value != None:
            return True
    return False


def date_schedule_changed(existing_job, job):
    if existing_job.trigger.run_date != job["run_date"] if "run_date" in job else "":
        return True
    return False


def schedule_changed(existing_job, job):
    if (
        schedule_trigger_type_to_string[type(existing_job.trigger)]
        != job["TriggerType"]
    ):
        return True

    if not existing_job.next_run_time and job["isActive"]:
        return True

    if schedule_trigger_type_to_string[type(existing_job.trigger)] == "cron":
        if cron_schedule_changed(existing_job, job):
            return True
    elif schedule_trigger_type_to_string[type(existing_job.trigger)] == "interval":
        if interval_schedule_changed(existing_job, job):
            return True
    elif schedule_trigger_type_to_string[type(existing_job.trigger)] == "date":
        if date_schedule_changed(existing_job, job):
            return True

    return False


def on_message(delivery_tag, body, async_consumer):
    global job_scheduler

    try:
        msg = json.loads(body)

        # job_scheduler.print_jobs()

        if msg["Action"] == "UpdateJob":
            misfire_grace_time = None
            if "misfire_grace_time" in msg and msg["misfire_grace_time"] != "":
                misfire_grace_time = msg["misfire_grace_time"]

            coalesce = None
            if "coalesce" in msg and msg["coalesce"] != "":
                coalesce = msg["coalesce"]

            max_instances = 10
            if "max_instances" in msg and msg["max_instances"] != "":
                max_instances = msg["max_instances"]

            useNextRunTime = False
            next_run_time = None
            if "next_run_time" in msg and msg["next_run_time"] != "":
                useNextRunTime = True
                if "next_run_time" == "None":
                    next_run_time = None
                else:
                    next_run_time = msg["next_run_time"]

            isActive = True
            if "isActive" in msg:
                isActive = msg["isActive"]
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

            if msg["TriggerType"] == "date":
                if "RunDate" in msg:
                    run_date = msg["RunDate"]
            elif msg["TriggerType"] == "cron":
                if "Year" in msg["cron"] and msg["cron"]["Year"] != "":
                    year = msg["cron"]["Year"]
                if "Month" in msg["cron"] and msg["cron"]["Month"] != "":
                    month = msg["cron"]["Month"]
                if "Day" in msg["cron"] and msg["cron"]["Day"] != "":
                    day = msg["cron"]["Day"]
                if "Week" in msg["cron"] and msg["cron"]["Week"] != "":
                    week = msg["cron"]["Week"]
                if "Day_Of_Week" in msg["cron"] and msg["cron"]["Day_Of_Week"] != "":
                    day_of_week = msg["cron"]["Day_Of_Week"]
                if "Hour" in msg["cron"] and msg["cron"]["Hour"] != "":
                    hour = msg["cron"]["Hour"]
                if "Minute" in msg["cron"] and msg["cron"]["Minute"] != "":
                    minute = msg["cron"]["Minute"]
                if "Second" in msg["cron"] and msg["cron"]["Second"] != "":
                    second = msg["cron"]["Second"]
                if "Start_Date" in msg["cron"] and msg["cron"]["Start_Date"]:
                    start_date = msg["cron"]["Start_Date"]
                if "End_Date" in msg["cron"] and msg["cron"]["End_Date"]:
                    end_date = msg["cron"]["End_Date"]
                if "Jitter" in msg["cron"] and msg["cron"]["Jitter"] != "":
                    jitter = int(msg["cron"]["Jitter"])
                if "Timezone" in msg["cron"] and msg["cron"]["Timezone"] != "":
                    timezone = msg["cron"]["Timezone"]
            elif msg["TriggerType"] == "interval":
                if "Weeks" in msg["interval"] and msg["interval"]["Weeks"] != "":
                    weeks = int(msg["interval"]["Weeks"])
                if "Days" in msg["interval"] and msg["interval"]["Days"] != "":
                    days = int(msg["interval"]["Days"])
                if "Hours" in msg["interval"] and msg["interval"]["Hours"] != "":
                    hours = int(msg["interval"]["Hours"])
                if "Minutes" in msg["interval"] and msg["interval"]["Minutes"] != "":
                    minutes = int(msg["interval"]["Minutes"])
                if "Seconds" in msg["interval"] and msg["interval"]["Seconds"] != "":
                    seconds = int(msg["interval"]["Seconds"])
                if "Start_Date" in msg["interval"] and msg["interval"]["Start_Date"]:
                    start_date = msg["interval"]["Start_Date"]
                if "End_Date" in msg["interval"] and msg["interval"]["End_Date"]:
                    end_date = msg["interval"]["End_Date"]
                if "Jitter" in msg["interval"] and msg["interval"]["Jitter"] != "":
                    jitter = int(msg["interval"]["Jitter"])

            if (
                "runtimeVars" not in msg["FunctionKwargs"]
                or msg["FunctionKwargs"]["runtimeVars"] == ""
            ):
                msg["FunctionKwargs"]["runtimeVars"] = {}

            job = job_scheduler.get_job(msg["id"])
            if job:
                changeTypes = []
                if schedule_changed(job, msg):
                    changeTypes.append("schedule")
                if (
                    job.misfire_grace_time != misfire_grace_time
                    or (not useNextRunTime and hasattr(job, "next_run_time"))
                    or job.next_run_time != next_run_time
                ):
                    changeTypes.append("job")
                if not useNextRunTime and "schedule" in changeTypes:
                    # print('schedule change')
                    if msg["TriggerType"] == "cron":
                        job_scheduler.reschedule_job(
                            msg["id"],
                            trigger="cron",
                            year=year,
                            month=month,
                            day=day,
                            week=week,
                            day_of_week=day_of_week,
                            hour=hour,
                            minute=minute,
                            second=second,
                            start_date=start_date,
                            end_date=end_date,
                            timezone=timezone,
                            jitter=jitter,
                        )
                    elif msg["TriggerType"] == "interval":
                        job_scheduler.reschedule_job(
                            msg["id"],
                            trigger="interval",
                            weeks=weeks,
                            days=days,
                            hours=hours,
                            minutes=minutes,
                            seconds=seconds,
                            start_date=start_date,
                            end_date=end_date,
                            jitter=jitter,
                        )
                    elif msg["TriggerType"] == "date":
                        job_scheduler.reschedule_job(
                            msg["id"], trigger="date", run_date=run_date
                        )
                if "job" in changeTypes:
                    # print('job change')
                    if useNextRunTime:
                        job_scheduler.modify_job(
                            msg["id"],
                            misfire_grace_time=misfire_grace_time,
                            coalesce=coalesce,
                            next_run_time=next_run_time,
                            max_instances=max_instances,
                            kwargs=msg["FunctionKwargs"],
                        )
                    else:
                        job_scheduler.modify_job(
                            msg["id"],
                            misfire_grace_time=misfire_grace_time,
                            coalesce=coalesce,
                            max_instances=max_instances,
                            kwargs=msg["FunctionKwargs"],
                        )
            else:
                if msg["TriggerType"] == "cron":
                    if useNextRunTime:
                        job_scheduler.add_job(
                            on_launch_job,
                            "cron",
                            name=msg["name"],
                            id=msg["id"],
                            misfire_grace_time=misfire_grace_time,
                            coalesce=coalesce,
                            next_run_time=next_run_time,
                            max_instances=max_instances,
                            year=year,
                            month=month,
                            day=day,
                            week=week,
                            day_of_week=day_of_week,
                            hour=hour,
                            minute=minute,
                            second=second,
                            start_date=start_date,
                            end_date=end_date,
                            timezone=timezone,
                            jitter=jitter,
                            kwargs=msg["FunctionKwargs"],
                        )
                    else:
                        job_scheduler.add_job(
                            on_launch_job,
                            "cron",
                            name=msg["name"],
                            id=msg["id"],
                            misfire_grace_time=misfire_grace_time,
                            coalesce=coalesce,
                            max_instances=max_instances,
                            year=year,
                            month=month,
                            day=day,
                            week=week,
                            day_of_week=day_of_week,
                            hour=hour,
                            minute=minute,
                            second=second,
                            start_date=start_date,
                            end_date=end_date,
                            timezone=timezone,
                            jitter=jitter,
                            kwargs=msg["FunctionKwargs"],
                        )

                elif msg["TriggerType"] == "interval":
                    if useNextRunTime:
                        job_scheduler.add_job(
                            on_launch_job,
                            "interval",
                            name=msg["name"],
                            id=msg["id"],
                            misfire_grace_time=misfire_grace_time,
                            coalesce=coalesce,
                            next_run_time=next_run_time,
                            max_instances=max_instances,
                            weeks=weeks,
                            days=days,
                            hours=hours,
                            minutes=minutes,
                            seconds=seconds,
                            start_date=start_date,
                            end_date=end_date,
                            jitter=jitter,
                            kwargs=msg["FunctionKwargs"],
                        )
                    else:
                        job_scheduler.add_job(
                            on_launch_job,
                            "interval",
                            name=msg["name"],
                            id=msg["id"],
                            misfire_grace_time=misfire_grace_time,
                            coalesce=coalesce,
                            max_instances=max_instances,
                            weeks=weeks,
                            days=days,
                            hours=hours,
                            minutes=minutes,
                            seconds=seconds,
                            start_date=start_date,
                            end_date=end_date,
                            jitter=jitter,
                            kwargs=msg["FunctionKwargs"],
                        )

                elif msg["TriggerType"] == "date":
                    job_scheduler.add_job(
                        on_launch_job,
                        "date",
                        name=msg["name"],
                        id=msg["id"],
                        misfire_grace_time=misfire_grace_time,
                        coalesce=coalesce,
                        max_instances=max_instances,
                        run_date=run_date,
                        kwargs=msg["FunctionKwargs"],
                    )
        elif msg["Action"] == "PauseJob":
            job_scheduler.pause_job(msg["id"])
        elif msg["Action"] == "ResumeJob":
            job_scheduler.resume_job(msg["id"])
        elif msg["Action"] == "RemoveJob":
            job = job_scheduler.get_job(msg["id"])
            if job:
                job_scheduler.remove_job(job.id)

        job = job_scheduler.get_job(msg["id"])
        if job:
            url = "schedule/fromscheduler/{}".format(job.id)
            rest_api_call(
                url,
                "PUT",
                msg["_teamId"],
                {},
                {"nextScheduledRunDate": job.next_run_time},
            )
            logInfo(
                {
                    "msg": "Updating job info 2",
                    "url": url,
                    "job_id": job.id,
                    "nextScheduledRunDate": job.next_run_time,
                }
            )

        async_consumer.acknowledge_message(delivery_tag)
        # job_scheduler.print_jobs()
    except Exception as ex:
        async_consumer.acknowledge_message(delivery_tag)
        if "_teamId" in msg:
            url = "schedule/fromscheduler/{}".format(msg["id"])
            rest_api_call(
                url,
                "PUT",
                msg["_teamId"],
                {},
                {
                    "scheduleError": str(ex),
                    "isActive": False,
                    "nextScheduledRunDate": None,
                },
            )
        logError({"msg": str(ex), "Method": "on_message", "body": body})
        job_scheduler.pause_job(msg["id"])
    # finally:
    #     async_consumer.start_consuming()


def schedule_updates_handler(args1, stop_event):
    global rmqCon
    global rmqUrl
    global rmqUsername
    global rmqPassword
    global rmqVhost
    global rmqScheduleUpdatesQueue
    global wait_schedule_updates_handler_exception
    global useSSL

    urlRoot = "amqp"
    if useSSL:
        urlRoot += "s"
    rmqCon = AsyncConsumer(
        "{0}://{1}:{2}@{3}/{4}".format(
            urlRoot, rmqUsername, rmqPassword, rmqUrl, rmqVhost
        ),
        {
            "exch": "worker",
            "exch_type": "topic",
            "durable": True,
            "queue_name": rmqScheduleUpdatesQueue,
            "exclusive": False,
            "auto_delete": False,
            "routing_key": rmqScheduleUpdatesQueue,
            "prefetch_count": 10,
            "auto_ack": False,
            "on_message": on_message,
        },
    )

    rmqCon.run()


def stop_schedule_updates_handler():
    global rmqCon
    if rmqCon:
        rmqCon.stop()


def run_scheduler_async(args1, stop_event):
    """
    Run the scheduler in a separate thread as it is blocking
    """
    global job_scheduler

    try:
        job_scheduler.start()
    except Exception as e:
        logError({"Msg": str(e), "Method": "run_scheduler_async"})


def main():
    global wait_schedule_updates_handler_exception
    global job_scheduler

    run_scheduler_async_thread_stop = Event()
    run_scheduler_async_thread = Thread(
        target=run_scheduler_async, args=(1, run_scheduler_async_thread_stop)
    )
    run_scheduler_async_thread.start()

    handle_schedule_updates_thread_stop = Event()
    handle_schedule_updates_thread = Thread(
        target=schedule_updates_handler, args=(1, handle_schedule_updates_thread_stop)
    )

    try:
        logInfo({"msg": "Starting JobScheduler"})
        handle_schedule_updates_thread.start()
        while True:
            schedule_updates_exception_occurred = (
                wait_schedule_updates_handler_exception.wait(5)
            )
            if schedule_updates_exception_occurred:
                logError({"msg": "Exception occurred in on_message event"})
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
