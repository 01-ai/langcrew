"""
Human-in-the-Loop (HITL) Integration Examples

This example demonstrates HITL integration with human interaction:

1. Configuration Examples: Comprehensive HITL configuration patterns
2. Tool Approval Workflow: Approval system with parameter/result modification
3. Bilingual Support: Chinese/English keyword recognition
4. Advanced Response Handling: Support for complex user feedback and modifications
5. Complete Implementation: Production-ready examples with proper interrupt/resume handling

Perfect for: Content moderation, financial transactions, sensitive operations, interactive AI assistants, and international deployment.

Features:
- Bilingual user interface (Chinese/English)
- Smart keyword recognition for natural language responses
- Parameter modification support (interrupt_before_tools)
- Result modification support (interrupt_after_tools)
- Proper interrupt/resume handling
- State persistence with checkpointing
- Frontend-ready options integration
"""

import tempfile
import os
import time
import warnings

from langchain_core.tools import BaseTool
from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from langcrew.agent import Agent
from langcrew.crew import Crew
from langcrew.hitl import HITLConfig
from langcrew.llm_factory import LLMFactory
from langcrew.task import Task

import dotenv

dotenv.load_dotenv()

# Suppress expected warning about custom checkpointer in examples
# InMemorySaver is safe for examples and doesn't require special lifecycle management
warnings.filterwarnings(
    "ignore",
    message="Custom checkpointer/store detected.*",
    category=UserWarning,
)

# ==================== Demo Tools ====================


class FileWriteTool(BaseTool):
    """Write content to files"""

    name: str = "file_write"
    description: str = (
        "Write content to a file. Use this when you need to save information to a file."
    )

    def _run(self, file_path: str, content: str) -> str:
        try:
            with open(file_path, "w", encoding="utf-8") as f:
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

    print("🔧 Pattern 1: Approval for Critical Tools")
    print("   Perfect for: Financial transactions, data deletion, system changes")
    config1 = HITLConfig(interrupt_before_tools=["file_write", "send_email"])
    print(f"   ✓ Requires approval for: {config1.interrupt_before_tools}")
    print(
        "   📝 Usage: HITLConfig(interrupt_before_tools=['file_write', 'send_email'])"
    )
    print()

    print("🔧 Pattern 2: After-Execution Review")
    print("   Perfect for: Content review, audit trails, quality checks")
    config2 = HITLConfig(interrupt_after_tools=["report_generator", "email_sender"])
    print(f"   ✓ Review required after: {config2.interrupt_after_tools}")
    print(
        "   📝 Usage: HITLConfig(interrupt_after_tools=['report_generator', 'email_sender'])"
    )
    print(
        "   ⚠️  Note: interrupt_after_tools only works within single execution session"
    )
    print("      (not across workflow restarts from checkpointed state)")
    print()

    print("🔧 Pattern 3: Before + After Interrupts")
    print("   Perfect for: Critical workflows with full oversight")
    config3 = HITLConfig(
        interrupt_before_tools=["data_processor"],
        interrupt_after_tools=["report_generator"],
    )
    print(f"   ✓ Before approval: {config3.interrupt_before_tools}")
    print(f"   ✓ After review: {config3.interrupt_after_tools}")
    print(
        "   📝 Usage: HITLConfig(interrupt_before_tools=[...], interrupt_after_tools=[...])"
    )
    print()

    print("🔧 Pattern 4: Task-level Interrupts (TASK MODE)")
    print("   Perfect for: Workflow control, decision points, validation steps")
    config4 = HITLConfig(
        interrupt_before_tasks=["planning_task"],
        interrupt_after_tasks=["validation_task"],
    )
    print(f"   ✓ Task interrupts before: {config4.interrupt_before_tasks}")
    print(f"   ✓ Task interrupts after: {config4.interrupt_after_tasks}")
    print(
        "   📝 Usage: HITLConfig(interrupt_before_tasks=['planning_task'], interrupt_after_tasks=['validation_task'])"
    )
    print("   💡 Note: Only works when you provide both agents and tasks to Crew")
    print()

    print("🔧 Pattern 5: Agent-level Interrupts (AGENT MODE)")
    print("   Perfect for: Agent orchestration, delegation control")
    config5 = HITLConfig(
        interrupt_before_agents=["research_agent"],
        interrupt_after_agents=["review_agent"],
    )
    print(f"   ✓ Agent interrupts before: {config5.interrupt_before_agents}")
    print(f"   ✓ Agent interrupts after: {config5.interrupt_after_agents}")
    print(
        "   📝 Usage: HITLConfig(interrupt_before_agents=['research_agent'], interrupt_after_agents=['review_agent'])"
    )
    print("   💡 Note: Only works when you provide only agents (no tasks) to Crew")
    print()

    print("🔧 Pattern 6: Node-level Interrupts (LangGraph Native)")
    print("   Perfect for: Advanced workflow control, custom node validation")
    config6 = HITLConfig(
        interrupt_before_nodes=["decision_node"],
        interrupt_after_nodes=["validation_node"],
    )
    print(f"   ✓ Node interrupts before: {config6.interrupt_before_nodes}")
    print(f"   ✓ Node interrupts after: {config6.interrupt_after_nodes}")
    print(
        "   📝 Usage: HITLConfig(interrupt_before_nodes=['decision_node'], interrupt_after_nodes=['validation_node'])"
    )
    print()

    print("🔧 Pattern 7: Comprehensive Configuration")
    print("   Perfect for: Production systems with full HITL coverage")
    config7 = HITLConfig(
        # Tool-level interrupts
        interrupt_before_tools=["critical_operation"],
        interrupt_after_tools=["data_export"],
        # Task-level interrupts
        interrupt_before_tasks=["planning_task"],
        interrupt_after_tasks=["validation_task"],
        # Node-level interrupts
        interrupt_before_nodes=["decision_node"],
        interrupt_after_nodes=["validation_node"],
    )
    print(
        f"   ✓ Tool interrupts: {config7.interrupt_before_tools} (before), {config7.interrupt_after_tools} (after)"
    )
    print(
        f"   ✓ Task interrupts: {config7.interrupt_before_tasks} (before), {config7.interrupt_after_tasks} (after)"
    )
    print(
        f"   ✓ Node interrupts: {config7.interrupt_before_nodes} (before), {config7.interrupt_after_nodes} (after)"
    )
    print("   📝 Usage: Combines all interrupt types for maximum control")
    print()

    print("🔧 Pattern 8: No Interrupts (Default)")
    print("   Perfect for: Development, testing, low-risk operations")
    print("   ✓ All tools execute automatically")
    print("   📝 Usage: Simply don't add hitl parameter to Agent() or Crew()")
    print("   💡 Example: agent = Agent(role='Assistant', tools=[...])")
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
    """Execute workflow with advanced human approval handling"""
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

                # Display interrupt details
                interrupt_type = info.get("value", {}).get("type", "unknown")
                print(f"🔍 Interrupt Type: {interrupt_type}")

                if "tool" in info.get("value", {}):
                    tool_info = info["value"]["tool"]
                    print(f"🔧 Tool: {tool_info.get('name', 'unknown')}")
                    if "args" in tool_info:
                        args = tool_info["args"]
                        if args:
                            print(f"📝 Parameters: {args}")
                        else:
                            print(
                                "📝 Parameters: (will be determined by agent after approval)"
                            )
                    if "result" in tool_info:
                        result_preview = str(tool_info.get("result", ""))[:200]
                        print(f"📊 Result: {result_preview}...")

                interrupted = True
                interrupt_info = info
                # Stream will naturally end when interrupted - no need for manual break
    except Exception as e:
        print(f"❌ Error during execution: {e}")
        import traceback

        traceback.print_exc()
        return False

    if not interrupted:
        print("✅ Workflow completed without requiring approval")
        return True

    # Step 2: Simulate advanced human decision
    print("\n🤔 Step 2: Advanced human decision process...")
    print("💡 In real applications, this would show a bilingual UI with options:")
    print("   Chinese: [批准] [拒绝]  English: [Approve] [Deny]")
    print("   Plus advanced options for parameter/result modification")
    time.sleep(1)

    # Simulate different types of decisions based on interrupt type
    interrupt_type = interrupt_info.get("value", {}).get("type", "unknown")

    if interrupt_type == "tool_interrupt_before":
        print("🔧 Before-execution approval:")
        print("   Options: Approve, Deny, or Modify Parameters")

        # Simulate smart approval with possible parameter modification
        decision_options = [
            "批准",  # Simple approval
            {
                "approved": True,
                "modified_args": {"max_results": 10},
            },  # Parameter modification
            "拒绝",  # Denial
        ]
        decision = decision_options[0]  # Use simple approval for demo

    elif interrupt_type == "tool_interrupt_after":
        print("📊 After-execution review:")
        print("   Options: Confirm, Deny, or Modify Result")

        # Simulate smart confirmation with possible result modification
        decision_options = [
            "确认",  # Simple confirmation
            {
                "approved": True,
                "modified_result": "Enhanced result with user feedback",
            },  # Result modification
            {
                "approved": False,
                "reason": "Result quality insufficient",
            },  # Denial with reason
        ]
        decision = decision_options[0]  # Use simple confirmation for demo

    else:
        decision = "approved"  # Fallback

    print(f"✅ Human decision: {decision}")

    # Show what the system understands
    if isinstance(decision, str):
        if decision in ["批准", "同意", "确认", "通过"]:
            print("🧠 System interpretation: Approved (Chinese keyword recognized)")
        elif decision in ["approve", "approved", "yes", "ok"]:
            print("🧠 System interpretation: Approved (English keyword recognized)")
        elif decision in ["拒绝", "不同意", "不通过"]:
            print("🧠 System interpretation: Denied (Chinese keyword recognized)")
        elif decision in ["deny", "denied", "no", "reject"]:
            print("🧠 System interpretation: Denied (English keyword recognized)")
    elif isinstance(decision, dict):
        print("🧠 System interpretation: Advanced response with modifications")

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
        import traceback

        traceback.print_exc()
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
    hitl_config = HITLConfig(interrupt_before_tools=["file_write"])
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
        For file_write, use: file_write(file_path="{target_file}", content="your_report_content")
        """,
        expected_output="A comprehensive business report with calculated Q4 revenue saved to file",
        agent=agent,
    )

    # Create crew with checkpointer (required for interrupts)
    crew = Crew(
        agents=[agent],
        tasks=[task],
        verbose=True,
        hitl=hitl_config,
        checkpointer=InMemorySaver(),
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
        with open(target_file, "r", encoding="utf-8") as f:
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
            "temperature": 0.1,
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
            print("• Advanced tool approval with parameter/result modification")
            print("• Bilingual user interface (Chinese/English)")
            print("• Smart keyword recognition for natural language responses")
            print("• Interactive user input collection")
            print("• Proper interrupt/resume handling")
            print("• State persistence with checkpointing")
            print("• Frontend-ready options integration")
        else:
            print("⚠️  Some demonstrations had issues:")
            print(f"   Tool Approval: {'✅ Success' if success1 else '❌ Failed'}")
            print(f"   User Input: {'✅ Success' if success2 else '❌ Failed'}")

        print()
        print("🌟 HITL Features:")
        print("• Bilingual Support: 批准/拒绝 ↔ Approve/Deny")
        print("• Smart Recognition: Natural language → structured responses")
        print("• Parameter Modification: Edit tool parameters before execution")
        print("• Result Modification: Edit tool results after execution")
        print("• Error Feedback: Provide reasons for denials")
        print("• Multiple Interrupt Types: Tools, Tasks, Agents, Nodes")

        print()
        print("📖 Next Steps:")
        print("• Review the 8 configuration patterns above")
        print("• Try different interrupt types (tools, tasks, agents, nodes)")
        print("• Experiment with advanced response formats")
        print("• Integrate HITL into your own workflows")
        print("• Build rich approval UIs with bilingual support")
        print("• Implement parameter/result modification features")

    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")
        import traceback

        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
