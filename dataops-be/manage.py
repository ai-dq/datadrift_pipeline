#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dataops_be.settings')
    try:
        from django.core.management import execute_from_command_line

        # change default ip address of runserver (127.0.0.1 -> 0.0.0.0)
        # change default port of runserver (8000 -> 9450)
        from django.core.management.commands.runserver import Command
        Command.default_addr = "0.0.0.0"
        Command.default_port = "9466"
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
