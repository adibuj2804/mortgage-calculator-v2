import sys


def test_python_is_3_12_or_newer():
    assert sys.version_info >= (3, 12)
