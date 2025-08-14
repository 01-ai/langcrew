#!/usr/bin/env python3
"""
BrowserStreamingTool Demo Script

This script demonstrates how to use the BrowserStreamingTool for web automation.
It shows basic usage, streaming events, and error handling.
"""

import asyncio
import logging
import os
import sys

from dotenv import load_dotenv
from rich.console import Console
from rich.logging import RichHandler
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

from langcrew_tools.utils.s3 import create_s3_client

# Load environment variables
load_dotenv()

# Setup rich console and logging
console = Console()
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(console=console, rich_tracebacks=True)]
)
logger = logging.getLogger(__name__)


def setup_llm():
    """Setup LLM for browser agent"""
    try:
        from browser_use import ChatOpenAI

        # Check for OpenAI API key
        if not os.getenv("OPENAI_API_KEY"):
            console.print("[red]❌ OPENAI_API_KEY not found in environment variables[/red]")
            console.print("Please set your OpenAI API key: export OPENAI_API_KEY='your-key-here'")
            sys.exit(1)

        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.1,
        )

        console.print("[green]✅ OpenAI LLM initialized successfully[/green]")
        return llm

    except ImportError:
        console.print("[red]❌ langchain_openai not installed[/red]")
        console.print("Please install: uv add langchain-openai")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]❌ Failed to initialize LLM: {e}[/red]")
        sys.exit(1)


def create_browser_tool(llm):
    """Create and configure BrowserStreamingTool"""
    try:
        from langcrew_tools.browser import BrowserStreamingTool

        # Create browser tool with configuration
        browser_tool = BrowserStreamingTool(
            vl_llm=llm,
            page_extraction_llm=llm,
            step_limit=10,
            request_language="zh",  # Chinese language
            async_s3_client=create_s3_client(),
            # You can also use "en" for English
            # request_language="en",
        )

        console.print("[green]✅ BrowserStreamingTool created successfully[/green]")
        return browser_tool

    except ImportError as e:
        console.print(f"[red]❌ Failed to import BrowserStreamingTool: {e}[/red]")
        console.print("Make sure langcrew-tools is installed: uv add langcrew-tools")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]❌ Failed to create BrowserStreamingTool: {e}[/red]")
        sys.exit(1)


async def run_browser_task(browser_tool, instruction: str):
    """Run a browser automation task and display streaming events"""
    console.print(Panel(f"🚀 Starting task: {instruction}", style="blue"))

    try:
        # Create input for the tool
        from langcrew_tools.browser import BrowserUseInput
        BrowserUseInput(instruction=instruction)

        # Run the streaming tool
        with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
        ) as progress:

            task_progress = progress.add_task("Processing browser task...", total=None)

            async for event_type, event_data in browser_tool._astream_events(instruction):

                # Update progress description based on event type
                if hasattr(event_data, 'event'):
                    event_name = event_data.event
                    progress.update(task_progress, description=f"Event: {event_name}")

                    # Display event details
                    if event_name == "on_tool_start":
                        console.print(f"[cyan]🎬 Started: {event_data.name}[/cyan]")
                        if hasattr(event_data, 'data') and event_data.data:
                            input_data = event_data.data.get('input', {})
                            if 'brief' in input_data:
                                console.print(f"   Brief: {input_data['brief']}")

                    elif event_name == "on_tool_end":
                        console.print(f"[green]✅ Completed: {event_data.name}[/green]")
                        if hasattr(event_data, 'data') and event_data.data:
                            output_data = event_data.data.get('output', {})
                            if 'final_result' in output_data:
                                console.print(f"   Result: {output_data['final_result']}")
                            if 'url' in output_data:
                                console.print(f"   URL: {output_data['url']}")
                            if 'title' in output_data:
                                console.print(f"   Title: {output_data['title']}")

                # Handle streaming events
                elif event_type.value == "start":
                    console.print("[yellow]🏃 Browser agent started[/yellow]")

                elif event_type.value == "intermediate":
                    console.print("[blue]📊 Processing step...[/blue]")

                elif event_type.value == "end":
                    console.print("[green]🎉 Task completed successfully![/green]")
                    break

            progress.update(task_progress, description="✅ Task completed!")

        return True

    except Exception as e:
        console.print(f"[red]❌ Error during browser task: {e}[/red]")
        logger.exception("Detailed error:")
        return False


async def interactive_demo():
    """Interactive demo mode"""
    console.print(Panel("🎮 Interactive Browser Demo Mode", style="green"))
    console.print("Enter browser automation tasks. Type 'quit' to exit.")
    console.print("Examples:")
    console.print("  - 访问百度搜索'人工智能'")
    console.print("  - Go to google.com and search for 'browser automation'")
    console.print("  - 打开淘宝首页并查看今日推荐")

    llm = setup_llm()
    browser_tool = create_browser_tool(llm)

    while True:
        try:
            instruction = console.input("\n[bold cyan]Enter task:[/bold cyan] ")

            if instruction.lower() in ['quit', 'exit', 'q']:
                console.print("[yellow]👋 Goodbye![/yellow]")
                break

            if not instruction.strip():
                console.print("[red]Please enter a valid instruction[/red]")
                continue

            success = await run_browser_task(browser_tool, instruction)

            if success:
                console.print("[green]Task completed successfully! ✨[/green]")
            else:
                console.print("[red]Task failed. Please try again. 😞[/red]")

        except KeyboardInterrupt:
            console.print("\n[yellow]👋 Demo interrupted by user[/yellow]")
            break
        except Exception as e:
            console.print(f"[red]❌ Unexpected error: {e}[/red]")


async def run_predefined_demos():
    """Run predefined demo tasks"""
    llm = setup_llm()
    browser_tool = create_browser_tool(llm)

    # Demo tasks
    demo_tasks = [
        "访问百度首页并搜索'Python编程'",
        "Go to github.com and search for 'browser-use'",
        "打开谷歌首页并搜索'AI tools'"
    ]

    console.print(Panel("🎭 Running Predefined Demo Tasks", style="green"))

    for i, task in enumerate(demo_tasks, 1):
        console.print(f"\n[bold]Demo {i}/{len(demo_tasks)}[/bold]")

        success = await run_browser_task(browser_tool, task)

        if not success:
            console.print(f"[yellow]⚠️ Demo {i} failed, continuing to next...[/yellow]")

        # Add delay between demos
        if i < len(demo_tasks):
            await asyncio.sleep(2)

    console.print("\n[green]🎉 All demo tasks completed![/green]")


def display_help():
    """Display help information"""
    console.print(Panel("🛠️ BrowserStreamingTool Demo Help", style="blue"))
    console.print()
    console.print("[bold]Usage:[/bold]")
    console.print("  python demo_browser_streaming_tool.py [mode]")
    console.print()
    console.print("[bold]Modes:[/bold]")
    console.print("  interactive  - Interactive mode (default)")
    console.print("  demo         - Run predefined demo tasks")
    console.print("  help         - Show this help message")
    console.print()
    console.print("[bold]Environment Variables:[/bold]")
    console.print("  OPENAI_API_KEY - Required for LLM functionality")
    console.print()
    console.print("[bold]Examples:[/bold]")
    console.print("  python demo_browser_streaming_tool.py")
    console.print("  python demo_browser_streaming_tool.py interactive")
    console.print("  python demo_browser_streaming_tool.py demo")


async def main():
    """Main entry point"""
    console.print(Panel("🌐 BrowserStreamingTool Demo", title="Welcome", style="bold blue"))

    # Parse command line arguments
    mode = "interactive"
    if len(sys.argv) > 1:
        mode = sys.argv[1].lower()

    if mode == "help":
        display_help()
        return

    try:
        if mode == "demo":
            await run_predefined_demos()
        else:
            await interactive_demo()

    except Exception as e:
        console.print(f"[red]❌ Fatal error: {e}[/red]")
        logger.exception("Fatal error details:")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[yellow]👋 Demo terminated by user[/yellow]")
    except Exception as e:
        console.print(f"[red]❌ Failed to start demo: {e}[/red]")
        sys.exit(1)