import logging
import platform
import re
import time

from collections.abc import Mapping
from logging.handlers import TimedRotatingFileHandler
from os import environ, path, makedirs
from re import I


REDACTION_PATTERNS = ["rmqUsername", "rmqPassword", "secretName"]

def redact_credentials_in_uri(uri):
    """
    Redacts credentials from URIs by replacing them with asterisks.

    Args:
        uri (str): The URI to redact.

    Returns:
        str: The redacted URI.
    """
    # Regular expression pattern to match credentials in the URI
    pattern = r"(?<=://)([^:]+):([^@]+)@"
    # Find the credentials in the URI using regex
    match = re.search(pattern, uri)
    if match:
        redacted_uri = uri
        for g in match.groups():
            redacted_uri = redacted_uri.replace(g, "[REDACTED]")
        return redacted_uri
    else:
        return uri

def redact_record_args(args, patterns):
    """
    Recursively traverse <args> dict redacting the value of any
    key found in <patterns>.
    """

    for k, v in args.items():
        print("k ------> ", k)
        print("v ------> ", v)
        if isinstance(v, Mapping):
            args[k] = redact_record_args(v, patterns)
        else:
            print("redacting...")
            if k in patterns:
                args[k] = "[REDACTED]"
            else:
                args[k] = redact_credentials_in_uri(v)
    return args

class RedactionFilter(logging.Filter):
    """Prevents secrets from being written to logs"""

    def __init__(self, patterns):
        self._patterns = patterns

    def filter(self, record):
        """
        Redacts contents of record.args

        NOTE: This only works if record.args is a dict or other Mapping object
        """

        record.msg = redact_credentials_in_uri(record.msg)
        if isinstance(record.args, Mapping):
            record.args = redact_record_args(record.args, self._patterns)

        return True


class HostnameFilter(logging.Filter):
    hostname = platform.node()

    def filter(self, record):
        record.hostname = HostnameFilter.hostname
        return True


logging.Formatter.converter = time.gmtime

formatter = logging.Formatter(
    "%(asctime)s %(hostname)s %(levelname)s [%(filename)s:%(lineno)d] - %(funcName)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)

handler = logging.StreamHandler()
handler.addFilter(HostnameFilter())
handler.addFilter(RedactionFilter(REDACTION_PATTERNS))
handler.setFormatter(formatter)

logs_directory = "/tmp/logs"
if not path.exists(logs_directory):
    makedirs(logs_directory)
timed_rotating_file_handler = TimedRotatingFileHandler(
    f"{logs_directory}/jobscheduler.log", when="s", interval=30, backupCount=10
)
timed_rotating_file_handler.setLevel(logging.DEBUG)
timed_rotating_file_handler.setFormatter(formatter)

logger = logging.getLogger()
logger.addHandler(handler)
logger.addHandler(timed_rotating_file_handler)
logger.setLevel(logging.INFO)
