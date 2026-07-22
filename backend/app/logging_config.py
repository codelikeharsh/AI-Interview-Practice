import logging
import os


def setup_logging():
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

    # Hook point for real error tracking later - set SENTRY_DSN and
    # `pip install sentry-sdk`, then uncomment:
    #
    # sentry_dsn = os.getenv("SENTRY_DSN")
    # if sentry_dsn:
    #     import sentry_sdk
    #     sentry_sdk.init(dsn=sentry_dsn, traces_sample_rate=0.1)
