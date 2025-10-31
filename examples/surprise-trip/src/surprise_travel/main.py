from dotenv import load_dotenv

from surprise_travel.crew import SurpriseTravelCrew

load_dotenv()


def run():
    # Replace with your inputs, it will automatically interpolate any tasks and agents information
    inputs = {
        "origin": "São Paulo, GRU",
        "destination": "New York, JFK",
        "age": 31,
        "hotel_location": "Brooklyn",
        "flight_information": "GOL 1234, leaving at June 30th, 2024, 10:00",
        "trip_duration": "14 days",
    }
    result = SurpriseTravelCrew().crew().kickoff(inputs=inputs)
    print(result)


if __name__ == "__main__":
    run()
