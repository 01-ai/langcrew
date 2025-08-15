import asyncio
import hashlib

import pytest
from dotenv import load_dotenv

from langcrew_tools.utils.s3 import create_s3_client

load_dotenv()


@pytest.fixture
def md_file():
    with open("tests/testdata/files/test_markdown.md") as f:
        content = f.read()
    s3_client = create_s3_client()
    asyncio.run(s3_client.put_object("test_file_key", content))

    md5_hash = hashlib.md5()
    with open("tests/testdata/files/test_markdown.md", "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            md5_hash.update(chunk)
        md5 = md5_hash.hexdigest()
        print(md5)

    return content, md5
