"""Basic tools"""

import csv
from pathlib import Path

from langchain_core.tools import BaseTool


class FileReadTool(BaseTool):
    """File reading tool"""

    name: str = "file_read"
    description: str = "Read file content and return it"

    def _run(self, file_path: str) -> str:
        return Path(file_path).read_text(encoding="utf-8")


class CSVAnalyzerTool(BaseTool):
    """CSV analysis tool"""

    name: str = "csv_analyzer"
    description: str = "Analyze CSV file and return job information"

    def _run(self, file_path: str) -> str:
        with open(file_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            jobs = list(reader)

        result = f"Found {len(jobs)} positions:\n\n"
        for i, job in enumerate(jobs, 1):
            result += f"=== Position {i} ===\n"
            for key, value in job.items():
                result += f"{key}: {value}\n"
            result += "\n"

        return result
