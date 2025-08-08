#!/usr/bin/env python

from job_posting.crew import JobPostingCrew


def run():
    # Replace with your inputs, it will automatically interpolate any tasks and agents information
    inputs = {
        "company_domain": "https://careers.wbd.com",
        "company_description": "Warner Bros. Discovery is a premier global media and entertainment company, offering audiences the world's most differentiated and complete portfolio of content, brands and franchises across television, film, sports, news, streaming and gaming. We're home to the world's best storytellers, creating world-class products for consumers",
        "hiring_needs": "Production Assistant, for a TV production set in Los Angeles in June 2025",
        "specific_benefits": "Weekly Pay, Employee Meals, healthcare",
    }
    result = JobPostingCrew().crew().kickoff(inputs=inputs)
    print(f"job_posting result: {result}")


if __name__ == "__main__":
    run()
