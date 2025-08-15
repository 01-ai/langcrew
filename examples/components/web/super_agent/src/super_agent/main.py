import asyncio
from dotenv import load_dotenv

from super_agent.agent.crew import SuperAgentCrew
from super_agent.tool.cloud_phone_react_agent import CloudPhoneReactAgent
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import HumanMessage

load_dotenv()


async def run_async_crew():
    """Async version for advanced workflows"""
    crew = SuperAgentCrew(session_id="test_session_123")
    async for event in crew.crew().astream_events("Query today's weather in Beijing"):
        print(event)


async def run_async_cloud_phone_react_agent():
    from super_agent.common.sandbox_config import (
        create_cloud_phone_sandbox_by_session_id,
    )

    checkpointer = InMemorySaver()

    sandbox_source = create_cloud_phone_sandbox_by_session_id("test", checkpointer)
    agent = await CloudPhoneReactAgent.create_cloud_phone_react_agent(
        agent_session_id="test_agent", sandbox_source=sandbox_source
    )

    messages = [HumanMessage(content="请帮我截屏看看当前界面")]
    inputs = {"messages": messages}
    final_config = {"configurable": {"thread_id": "test_agent"}, "recursion_limit": 10}
    async for event in agent.astream_events(inputs, config=final_config):
        print(f"event: {event}")


if __name__ == "__main__":
    # asyncio.run(run_async_crew())
    asyncio.run(run_async_cloud_phone_react_agent())
