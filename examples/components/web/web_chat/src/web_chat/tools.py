"""
Tools for Web Chat Example

This module provides various tools that the chat agent can use to enhance responses.
"""

import random
import re
from datetime import datetime
from typing import List
from langchain_core.tools import BaseTool
from langcrew_tools.hitl import (
    UserInputTool,
    DynamicFormUserInputTool,
    FormSchema,
    FormFieldSchema,
)


class CalculatorTool(BaseTool):
    """Advanced calculator tool for mathematical operations"""

    name: str = "calculator"
    description: str = "Perform mathematical calculations including basic arithmetic, percentages, and simple functions"

    def _run(self, expression: str) -> str:
        """Execute mathematical expression safely"""
        try:
            # Clean the expression
            expression = expression.strip()

            # Replace common text patterns with operators
            expression = re.sub(r"\bplus\b", "+", expression, flags=re.IGNORECASE)
            expression = re.sub(r"\bminus\b", "-", expression, flags=re.IGNORECASE)
            expression = re.sub(
                r"\btimes\b|\bmultiplied by\b", "*", expression, flags=re.IGNORECASE
            )
            expression = re.sub(r"\bdivided by\b", "/", expression, flags=re.IGNORECASE)
            expression = re.sub(
                r"\bpercent of\b", "* 0.01 *", expression, flags=re.IGNORECASE
            )
            expression = re.sub(r"%", "* 0.01", expression)

            # Safety check - only allow basic math operations and functions
            allowed_chars = set("0123456789+-*/.()% ")
            allowed_functions = ["abs", "round", "min", "max", "pow"]

            # Check for allowed characters
            if not all(c in allowed_chars or c.isalpha() for c in expression):
                return "Error: Only basic math operations are allowed (+, -, *, /, parentheses, %)"

            # Simple evaluation with basic safety
            # Replace ** with pow for safety
            expression = expression.replace("**", "^")  # Will be handled separately

            # Handle power operations
            if "^" in expression:
                parts = expression.split("^")
                if len(parts) == 2:
                    try:
                        base = float(eval(parts[0]))
                        exp = float(eval(parts[1]))
                        if abs(exp) > 100:  # Prevent very large exponentials
                            return "Error: Exponent too large"
                        result = pow(base, exp)
                    except:
                        return "Error: Invalid power operation"
                else:
                    return "Error: Invalid power expression"
            else:
                # Evaluate the expression
                result = eval(expression)

            # Format result nicely
            if isinstance(result, float):
                if result.is_integer():
                    result = int(result)
                else:
                    result = round(result, 6)  # Limit decimal places

            return f"Calculation: {expression} = {result}"

        except ZeroDivisionError:
            return "Error: Division by zero is not allowed"
        except OverflowError:
            return "Error: Result is too large to calculate"
        except Exception as e:
            return f"Error: Invalid mathematical expression - {str(e)}"


class WebSearchTool(BaseTool):
    """Web search tool for finding current information"""

    name: str = "web_search"
    description: str = (
        "Search the web for current information, news, and answers to questions"
    )

    def _run(self, query: str) -> str:
        """Perform web search (mock implementation with realistic responses)"""
        # This is a mock implementation for demonstration
        # In production, you would integrate with actual search APIs like:
        # - Google Custom Search API
        # - Bing Search API
        # - DuckDuckGo API
        # - Serper API

        query = query.strip().lower()

        # Generate contextual mock results based on query patterns
        if any(
            word in query
            for word in ["ai", "artificial intelligence", "machine learning"]
        ):
            results = [
                "Recent breakthrough in AI language models shows 40% improvement in reasoning tasks",
                "Major tech companies announce new AI safety initiatives and governance frameworks",
                "Study reveals AI productivity gains across multiple industries, with 25% efficiency improvements",
                "New AI research focuses on reducing hallucinations and improving factual accuracy",
            ]
        elif any(word in query for word in ["weather", "climate", "temperature"]):
            results = [
                "Global weather patterns show unusual temperature variations this season",
                "Climate scientists report new findings on regional weather prediction accuracy",
                "Advanced weather modeling systems improve forecast reliability by 15%",
            ]
        elif any(word in query for word in ["news", "current", "latest", "recent"]):
            results = [
                "Breaking: International technology summit announces new collaboration frameworks",
                "Economic indicators show positive trends in technology sector growth",
                "Recent developments in renewable energy technology reach new efficiency milestones",
            ]
        elif any(word in query for word in ["stock", "market", "finance", "economy"]):
            results = [
                "Technology stocks show strong performance with 8% gains this quarter",
                "Market analysts predict continued growth in AI and cloud computing sectors",
                "Financial experts recommend diversified portfolios including tech innovations",
            ]
        else:
            # Generic search results
            results = [
                f"Comprehensive information about '{query}' from authoritative sources",
                f"Latest research and developments related to {query}",
                f"Expert analysis and insights on {query} from industry leaders",
                f"Recent updates and trends in the {query} domain",
            ]

        # Add timestamp for realism
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

        formatted_results = []
        for i, result in enumerate(results[:3], 1):  # Limit to top 3 results
            formatted_results.append(f"{i}. {result}")

        return (
            f"Web search results for '{query}' (searched at {timestamp}):\n\n"
            + "\n\n".join(formatted_results)
        )


class WeatherTool(BaseTool):
    """Weather information tool"""

    name: str = "weather"
    description: str = (
        "Get current weather information and forecasts for any city worldwide"
    )

    def _run(self, city: str) -> str:
        """Get weather information (mock implementation with realistic data)"""
        # This is a mock implementation for demonstration
        # In production, you would integrate with weather APIs like:
        # - OpenWeatherMap
        # - WeatherAPI
        # - AccuWeather API

        city = city.strip().title()

        # Mock weather data with seasonal variation
        current_month = datetime.now().month

        # Adjust temperature ranges by season (Northern Hemisphere bias)
        if current_month in [12, 1, 2]:  # Winter
            temp_range = (25, 45)
            conditions = [
                "cloudy",
                "light snow",
                "overcast",
                "partly cloudy",
                "clear and cold",
            ]
        elif current_month in [3, 4, 5]:  # Spring
            temp_range = (45, 70)
            conditions = [
                "partly cloudy",
                "sunny",
                "light rain",
                "breezy",
                "mild and pleasant",
            ]
        elif current_month in [6, 7, 8]:  # Summer
            temp_range = (70, 90)
            conditions = [
                "sunny",
                "hot and humid",
                "partly cloudy",
                "clear skies",
                "warm",
            ]
        else:  # Fall
            temp_range = (50, 75)
            conditions = [
                "crisp and clear",
                "partly cloudy",
                "light rain",
                "cool and breezy",
                "overcast",
            ]

        # Generate realistic weather data
        temperature = random.randint(*temp_range)
        condition = random.choice(conditions)
        humidity = random.randint(30, 80)
        wind_speed = random.randint(3, 15)

        # Add some city-specific adjustments
        city_lower = city.lower()
        if "miami" in city_lower or "phoenix" in city_lower:
            temperature += random.randint(5, 15)
            humidity += random.randint(10, 20)
        elif "seattle" in city_lower or "portland" in city_lower:
            if random.random() > 0.3:  # 70% chance of rain
                condition = "light rain"
            humidity += random.randint(15, 25)
        elif "denver" in city_lower or "colorado" in city_lower:
            temperature -= random.randint(5, 10)

        # Ensure realistic bounds
        humidity = min(humidity, 95)
        temperature = max(temperature, -10)

        return f"""Current weather in {city}:
🌡️  Temperature: {temperature}°F
🌤️  Conditions: {condition}
💧 Humidity: {humidity}%
💨 Wind Speed: {wind_speed} mph
📅 Last Updated: {datetime.now().strftime("%Y-%m-%d %H:%M")}

Note: Weather data is updated regularly. For critical decisions, please consult official weather services."""


class TimezoneTool(BaseTool):
    """Timezone and time information tool"""

    name: str = "timezone"
    description: str = "Get current time, timezone information, and time differences for cities worldwide"

    def _run(self, city: str) -> str:
        """Get timezone information (mock implementation with realistic data)"""
        # This is a mock implementation for demonstration
        # In production, you would integrate with timezone APIs like:
        # - WorldTimeAPI
        # - TimeZoneDB
        # - Google Time Zone API

        city = city.strip().title()
        city_lower = city.lower()

        # Mock timezone database
        timezone_data = {
            "new york": {"tz": "EST (UTC-5)", "offset": -5, "dst": "EDT (UTC-4)"},
            "los angeles": {"tz": "PST (UTC-8)", "offset": -8, "dst": "PDT (UTC-7)"},
            "chicago": {"tz": "CST (UTC-6)", "offset": -6, "dst": "CDT (UTC-5)"},
            "denver": {"tz": "MST (UTC-7)", "offset": -7, "dst": "MDT (UTC-6)"},
            "london": {"tz": "GMT (UTC+0)", "offset": 0, "dst": "BST (UTC+1)"},
            "paris": {"tz": "CET (UTC+1)", "offset": 1, "dst": "CEST (UTC+2)"},
            "tokyo": {"tz": "JST (UTC+9)", "offset": 9, "dst": None},
            "sydney": {"tz": "AEST (UTC+10)", "offset": 10, "dst": "AEDT (UTC+11)"},
            "beijing": {"tz": "CST (UTC+8)", "offset": 8, "dst": None},
            "mumbai": {"tz": "IST (UTC+5:30)", "offset": 5.5, "dst": None},
            "dubai": {"tz": "GST (UTC+4)", "offset": 4, "dst": None},
            "moscow": {"tz": "MSK (UTC+3)", "offset": 3, "dst": None},
            "sao paulo": {"tz": "BRT (UTC-3)", "offset": -3, "dst": "BRST (UTC-2)"},
        }

        # Find matching city
        tz_info = None
        for known_city, info in timezone_data.items():
            if known_city in city_lower or city_lower in known_city:
                tz_info = info
                break

        if not tz_info:
            # Default to a reasonable timezone based on common patterns
            tz_info = {"tz": f"Local timezone for {city}", "offset": 0, "dst": None}

        # Calculate current time (mock)
        base_time = datetime.now()

        # Simulate timezone offset
        if isinstance(tz_info["offset"], (int, float)):
            # This is a simplified calculation - in reality you'd use proper timezone libraries
            offset_hours = int(tz_info["offset"])
            offset_minutes = int((tz_info["offset"] % 1) * 60)

            # Mock time calculation (not accurate, just for demonstration)
            local_time = base_time.replace(
                hour=(base_time.hour + offset_hours) % 24,
                minute=(base_time.minute + offset_minutes) % 60,
            )
        else:
            local_time = base_time

        # Determine if DST might be active (simplified)
        current_month = datetime.now().month
        is_dst_season = 3 <= current_month <= 10  # Rough DST season

        active_tz = tz_info["tz"]
        if is_dst_season and tz_info.get("dst"):
            active_tz = tz_info["dst"]

        formatted_time = local_time.strftime("%Y-%m-%d %H:%M:%S")
        day_of_week = local_time.strftime("%A")

        result = f"""Time information for {city}:
🕐 Current Time: {formatted_time}
📅 Day: {day_of_week}
🌍 Timezone: {active_tz}
⏰ UTC Offset: {tz_info["offset"]:+.1f} hours"""

        if tz_info.get("dst"):
            dst_status = "Active" if is_dst_season else "Inactive"
            result += f"\n☀️  Daylight Saving: {dst_status}"

        result += "\n📍 Note: Times are approximate. For precise timing, consult official time services."

        return result


def get_chat_tools() -> List[BaseTool]:
    """Get all available chat tools"""
    return [
        CalculatorTool(),
        WebSearchTool(),
        WeatherTool(),
        TimezoneTool(),
        UserInputTool(),
        DynamicFormUserInputTool(),
    ]
