import asyncio
from dotenv import load_dotenv

from super_agent.agent.crew import SuperAgentCrew

load_dotenv()


async def run_async_crew():
    """Async version for advanced workflows"""
    crew = SuperAgentCrew(session_id="test_session_123")
    async for event in crew.crew().astream_events("Query today's weather in Beijing"):
        print(event)


if __name__ == "__main__":
    asyncio.run(run_async_crew())
