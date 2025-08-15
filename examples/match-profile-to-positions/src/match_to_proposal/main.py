from dotenv import load_dotenv
from pathlib import Path
from match_to_proposal.crew import MatchProfileCrew

load_dotenv()


def run():
    BASE_DIR = Path(__file__).resolve().parent
    DEFAULT_JOBS = BASE_DIR / "data/jobs.csv"
    DEFAULT_CV = BASE_DIR / "data/cv.md"
    result = (
        MatchProfileCrew()
        .crew()
        .kickoff(
            {
                "cv_path": str(DEFAULT_CV),
                "jobs_path": str(DEFAULT_JOBS),
            }
        )
    )

    print(result)


if __name__ == "__main__":
    run()
