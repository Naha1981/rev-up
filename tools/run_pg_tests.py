import os
import sys

import pgserver
import pytest

srv = pgserver.get_server("/tmp/pgsrv")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
os.environ["DB_USER"] = "postgres"
os.environ["DB_PASSWORD"] = ""
os.environ["DB_HOST"] = "/tmp/pgsrv"
os.environ["DB_PORT"] = "5432"
sys.exit(pytest.main(sys.argv[1:] + ["-q", "-p", "no:cacheprovider"]))
