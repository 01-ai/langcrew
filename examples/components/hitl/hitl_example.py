"""
Human-in-the-Loop (HITL) Integration Examples

This example demonstrates how to integrate human approval and input into AI workflows:

1. Configuration Examples: Different ways to set up HITL
2. Tool Approval Workflow: Pause execution to get human approval for critical actions
3. User Input Workflow: Collect user input during AI execution
4. Complete Implementation: Real working examples with proper interrupt/resume handling

Perfect for: Content moderation, financial transactions, sensitive operations, and interactive AI assistants.
"""

import tempfile
import os
import time

from langchain_core.tools import BaseTool
from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../libs/langcrew"))

from langcrew.agent import Agent
from langcrew.crew import Crew
from langcrew.hitl import HITLConfig

# from langcrew.tools.hitl import UserInputTool
# UserInputTool import temporarily disabled
from langcrew.llm_factory import LLMFactory
from langcrew.task import Task

# ==================== Demo Tools ====================


class FileWriteTool(BaseTool):
    """Write content to files"""

    name: str = "file_write"
    description: str = (
        "Write content to a file. Use this when you need to save information to a file."
    )

    def _run(self, file_path: str, content: str) -> str:
        try:
            with open(file_path, "w") as f:
                f.write(content)
            return f"✅ Successfully wrote content to {file_path}"
        except Exception as e:
            return f"❌ Error writing to file: {str(e)}"


class SendEmailTool(BaseTool):
    """Send emails (simulated)"""

    name: str = "send_email"
    description: str = (
        "Send an email to someone. Use this to notify people or share information."
    )

    def _run(self, to: str, subject: str, body: str) -> str:
        return f"📧 Email sent to {to}: {subject}"


class CalculatorTool(BaseTool):
    """Mathematical calculations"""

    name: str = "calculator"
    description: str = (
        "Perform mathematical calculations. Use this for any math operations."
    )

    def _run(self, expression: str) -> str:
        try:
            result = eval(expression)
            return f"Calculation result: {result}"
        except Exception as e:
            return f"Error in calculation: {str(e)}"


# ==================== Configuration Examples ====================


def show_hitl_configurations():
    """Demonstrate different HITL configuration patterns"""
    print("=" * 80)
    print("📚 HITL Configuration Examples")
    print("=" * 80)
    print()

    print("🔧 Pattern 1: Approval for Critical Operations")
    print("   Perfect for: Financial transactions, data deletion, system changes")
    config1 = HITLConfig(approval_tools=["file_write", "send_email"])
    print(f"   ✓ Requires approval for: {config1.approval_tools}")
    print("   �� Usage: HITLConfig(approval_tools=['file_write', 'send_email'])")
    print()

    print("🔧 Pattern 2: Approval for Everything (with safe exceptions)")
    print("   Perfect for: High-security environments, content moderation")
    config2 = HITLConfig(
        approval_tool_mode="all", excluded_tools=["calculator", "web_search"]
    )
    print(f"   ✓ Approval required for all tools except: {config2.excluded_tools}")
    print(
        "   📝 Usage: HITLConfig(approval_tool_mode='all', excluded_tools=['calculator', 'web_search'])"
    )
    print()

    print("🔧 Pattern 3: Interactive User Input")
    print("   Perfect for: Chatbots, personal assistants, data collection")
    print("   ✓ Use UserInputTool to collect information during execution")
    print(
        "   📝 Usage: Simply add # UserInputTool() # temporarily disabled to your agent's tools"
    )
    print()
    print("🔧 Pattern 4: No Approval Required")
    print("   Perfect for: Development, testing, low-risk operations")
    print("   ✓ All tools execute automatically")
    print("   📝 Usage: Simply don't add hitl parameter to Agent()")
    print(
        "   💡 Example: agent = Agent(role='Assistant', tools=[...])"
    )  # No hitl needed
    print()


def detect_interrupt(stream_result) -> tuple[bool, dict]:
    """Detect interrupts in LangGraph stream results"""
    if isinstance(stream_result, dict) and "__interrupt__" in stream_result:
        interrupts = stream_result["__interrupt__"]
        if interrupts and len(interrupts) > 0:
            interrupt_obj = interrupts[0]
            return True, {
                "id": interrupt_obj.id,
                "value": interrupt_obj.value,
                "type": interrupt_obj.value.get("type", "unknown")
                if isinstance(interrupt_obj.value, dict)
                else "unknown",
            }
    return False, {}


def execute_with_human_approval(crew, inputs, thread_id, description):
    """Execute workflow with proper human approval handling"""
    print(f"🚀 {description}")
    print("-" * 60)

    config = RunnableConfig(configurable={"thread_id": thread_id})

    # Step 1: Run until interrupt
    print("▶️  Step 1: Executing workflow...")

    interrupted = False
    interrupt_info = {}

    try:
        for result in crew.stream(inputs, config, stream_mode="updates"):
            print(f"📋 {result}")

            is_interrupted, info = detect_interrupt(result)
            if is_interrupted:
                print("⏸️  Human approval required!")
                print(
                    f"💭 Request: {info.get('value', {}).get('description', 'Approval needed')}"
                )
                interrupted = True
                interrupt_info = info
                # Stream will naturally end when interrupted - no need for manual break
    except Exception:
        return False

    if not interrupted:
        print("✅ Workflow completed without requiring approval")
        return True

    # Step 2: Simulate human decision
    print("\n🤔 Step 2: Human decision process...")
    print("💡 In real applications, this would show a UI for human approval")
    time.sleep(1)

    # Simulate approval
    decision = "approved"  # In reality: get from user interface
    print(f"✅ Human decision: {decision}")

    # Step 3: Resume workflow
    print("\n🔄 Step 3: Resuming workflow...")

    try:
        resume_command = Command(resume=decision)
        for result in crew.stream(resume_command, config, stream_mode="updates"):
            print(f"🔄 {result}")

            # Check for additional interrupts
            is_interrupted, info = detect_interrupt(result)
            if is_interrupted:
                print("⏸️  Additional approval required!")
                # Continue processing - let stream end naturally
        print("✅ Workflow completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Resume error: {e}")
        return False


# ==================== Demo Workflows ====================


def demo_tool_approval_workflow():
    """Demonstrate tool approval workflow"""
    print("=" * 80)
    print("🧪 Sequential Tool Execution Test: calculator → file_write")
    print("=" * 80)
    print()

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set OPENAI_API_KEY environment variable")
        return False

    print("🔧 Setting up sequential tool execution test...")
    print("Expected flow: calculator (no approval) → file_write (approval required)")
    print()

    # Create target file
    temp_dir = tempfile.gettempdir()
    target_file = os.path.join(temp_dir, "hitl_demo_report.txt")
    print(f"📁 Target file: {target_file}")

    # Configure HITL: only file_write needs approval
    hitl_config = HITLConfig(approval_tools=["file_write"])
    print("🔒 HITL: Only file_write requires approval")
    print("✅ calculator executes normally")

    # Create LLM
    llm = LLMFactory.create_llm(
        {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.1,
            "max_tokens": 500,
        }
    )

    # Create agent
    agent = Agent(
        role="Report Generator",
        goal="Generate and save business reports",
        backstory="You are a professional report generator that creates and saves important business documents.",
        hitl=hitl_config,
        llm=llm,
        tools=[FileWriteTool(), SendEmailTool(), CalculatorTool()],
    )

    # Create task requiring sequential tool execution
    task = Task(
        description=f"""
        Please complete these steps in EXACT order:
        
        1. FIRST: Calculate the total Q4 revenue using this formula: 150000 + 200000 + 175000 + 225000
        2. SECOND: Create a quarterly business report using the calculated total and save it to {target_file}
        
        The report should include:
        - Current date
        - Executive summary with the Q4 revenue total from step 1
        - Key performance metrics
        - Recommendations for next quarter
        
        IMPORTANT: You MUST use the calculator tool first, then the file_write tool.
        """,
        expected_output="A comprehensive business report with calculated Q4 revenue saved to file",
        agent=agent,
    )

    # Create crew with checkpointer (required for interrupts)
    crew = Crew(
        agents=[agent], tasks=[task], verbose=True, checkpointer=InMemorySaver()
    )

    print("🚢 Workflow ready with human approval checkpoints")
    print()

    # Execute with approval
    success = execute_with_human_approval(
        crew=crew,
        inputs={},
        thread_id="business_report_001",
        description="Sequential Tool Test: Calculator → File_Write",
    )

    if success and os.path.exists(target_file):
        with open(target_file, "r") as f:
            content = f.read()
        print(f"\n📄 Generated report preview:\n{content[:300]}...")

    return success


def demo_user_input_workflow():
    """Demonstrate interactive user input workflow"""
    print("=" * 80)
    print("💬 Interactive User Input Workflow Demo")
    print("=" * 80)
    print()

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set OPENAI_API_KEY environment variable")
        return False

    print("🔧 Setting up interactive assistant...")

    # Create LLM
    llm = LLMFactory.create_llm(
        {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "max_tokens": 500,
        }
    )

    # Create interactive agent
    agent = Agent(
        role="Personal Assistant",
        goal="Help users with personalized information and calculations",
        backstory="You are a friendly personal assistant that asks for user information when needed to provide personalized help.",
        llm=llm,
        tools=[CalculatorTool()],
    )

    # Create crew
    crew = Crew(
        agents=[agent],
        verbose=True,
        checkpointer=InMemorySaver(),  # Required for interrupts
    )

    print("🤖 Interactive assistant ready")
    print()

    # Create interactive scenario
    inputs = {
        "messages": [
            HumanMessage(
                content="""
            I'd like you to help me plan my vacation budget.
            First, ask me what my monthly income is, then ask about my monthly expenses.
            Finally, calculate how much I can save per month and recommend a vacation budget.
            """
            )
        ]
    }

    # Execute interactive workflow
    success = execute_with_human_approval(
        crew=crew,
        inputs=inputs,
        thread_id="vacation_planning_001",
        description="Interactive Vacation Budget Planning",
    )

    return success


# ==================== Main Demo ====================


def main():
    """Run comprehensive HITL demonstrations"""
    print("🔒 LangCrew Human-in-the-Loop (HITL) Integration Demo")
    print("=" * 80)
    print("Learn how to add human approval and input to your AI workflows")
    print("Perfect for production systems requiring human oversight")
    print("=" * 80)
    print()

    try:
        # Show configuration patterns
        show_hitl_configurations()

        # Check API key
        if not os.getenv("OPENAI_API_KEY"):
            print("⚠️  To run live demos, please set your OpenAI API key:")
            print("   export OPENAI_API_KEY=your_api_key")
            print("\n📚 Configuration examples completed!")
            return 0

        print("🔑 API key found. Running live workflow demonstrations...")
        print()

        # Demo 1: Tool approval workflow
        success1 = demo_tool_approval_workflow()

        print()

        # Demo 2: Interactive user input
        success2 = demo_user_input_workflow()

        # Summary
        print()
        print("=" * 80)
        print("🎯 HITL Demo Summary")
        print("=" * 80)

        if success1 and success2:
            print("✅ All demonstrations completed successfully!")
            print()
            print("🚀 Key Features Demonstrated:")
            print("• Tool approval with human oversight")
            print("• Interactive user input collection")
            print("• Proper interrupt/resume handling")
            print("• State persistence with checkpointing")
        else:
            print("⚠️  Some demonstrations had issues:")
            print(f"   Tool Approval: {'✅ Success' if success1 else '❌ Failed'}")
            print(f"   User Input: {'✅ Success' if success2 else '❌ Failed'}")

        print()
        print("📖 Next Steps:")
        print("• Review the configuration patterns above")
        print("• Try different approval_tool_mode settings")
        print("• Integrate HITL into your own workflows")
        print("• Build custom approval UIs for production use")

    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")
        import traceback

        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
