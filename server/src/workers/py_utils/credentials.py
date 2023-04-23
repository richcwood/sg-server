import json
from dotenv import load_dotenv
from os import environ
import sys

import boto3
from botocore.exceptions import ClientError

from py_utils.logger import logger


class Credentials(object):
    """
    Provides access to credentials stored in AWS Secrets Manager. Uses caching
    to reduce AWS utilization.

    In order to connect either an AWS profile must be provided OR the access key ID
    and secret access key must be set as environment variables. See _session_params()
    """

    def __init__(self, log_info, log_warning, log_error, **params):
        self._log_info = log_info
        self._log_warning = log_warning
        self._log_error = log_error
        session_params = self._session_params(**params)
        session = boto3.session.Session(**session_params)

        self._client = session.client(
            service_name="secretsmanager",
            region_name=params["AWS_REGION"],
        )

        self._secret_name = params["secretName"]
        self.reset_cache()

    def _session_params(self, **params):
        session_params = {}

        aws_access_key_id = environ.get("AWS_ACCESS_KEY_ID")
        aws_secret_access_key = environ.get("AWS_SECRET_ACCESS_KEY")
        aws_profile = params.get("awsProfile") or None

        if aws_access_key_id and aws_secret_access_key:
            session_params["aws_access_key_id"] = aws_access_key_id
            session_params["aws_secret_access_key"] = aws_secret_access_key
        elif aws_profile:
            session_params["profile_name"] = aws_profile
        else:
            self._log_warning(
                {
                    "message": "No AWS credentials provided - defaulting to host assigned IAM role",
                    "params": params,
                },
            )

        return session_params

    def _cache_update(self, secret_name, secret):
        self._cache[secret_name] = secret
        return self._cache

    def _cache_fetch(self, secret_name, fetch_secret):
        if secret_name in self._cache:
            return self._cache[secret_name]
        else:
            return self._cache_update(secret_name, fetch_secret())[secret_name]

    def reset_cache(self):
        self._cache = {}

    def _sanitize_secret(self, secret):
        return {key.strip(): value.strip() for (key, value) in secret.items()}

    def _secret_fetcher(self, secret_name):
        self._log_info({"message": "Fetching secret 🤫"})

        try:
            get_secret_value_response = self._client.get_secret_value(
                SecretId=secret_name
            )
        except ClientError as e:
            self._log_error(
                {
                    "message": e.response["Error"]["Message"], 
                    "code": e.response["Error"]["Code"]
                }
            )
            return None
        else:
            secret = get_secret_value_response["SecretString"]
            return self._sanitize_secret(json.loads(secret, strict=False))

    def get_secret(self, secret_name=None):
        """
        By default, <secret_name> is the "secret_name" value of the params dict
        used during initialization.
        """
        fetcher = lambda: self._secret_fetcher(secret_name or self._secret_name)
        return self._cache_fetch(secret_name, fetcher)

def logInfo(msgData):
    logger.info("%s", msgData)

def logWarning(msgData):
    logger.warning("%s", msgData)

def logError(msgData):
    logger.error("%s", msgData)

def _load_rabbitmq_secrets():
    config = {}
    with open("config/production.json", "r") as f:
        s = f.read()
        config = json.loads(s)
    params = config["rabbitmq-credentials"]
    
    credentials = Credentials(logInfo, logWarning, logError, **params)
    credentials.reset_cache()
    secrets = credentials.get_secret()
    for key in secrets:
        environ[key] = secrets[key]


if __name__ == "__main__":
    env = "default"
    if "NODE_ENV" in environ:
        env = environ["NODE_ENV"]
    if env == "production":
        _load_rabbitmq_secrets()
    else:
        load_dotenv()

    # Use "secret_name" value of params by default
    print("env -------> ", environ)
