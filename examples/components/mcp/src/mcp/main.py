#!/usr/bin/env python

import asyncio
import os
from dotenv import load_dotenv
from crew import CalculatorCrew, MapCrew, MapStreamHttpCrew

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env.example"))

# sse use case
async def map_sse_mcp():
    inputs = {
        "user_instruction": "Optimal route from Shanghai to Beijing"
    }
    crew =  MapCrew().crew()
    result= await crew.akickoff(inputs=inputs)
    print(f"map result: {result}")

# streamHttp use case
async def map_streamHttp_mcp():
    inputs = {
        "user_instruction": "Optimal route from Shanghai to Beijing"
    }
    crew =  MapStreamHttpCrew().crew()
    result= await crew.akickoff(inputs=inputs)
    print(f"map result: {result}")

# stdio use case
async def calculator_stdio_mcp():
    inputs = {
        "user_instruction": "Calculate 100+100 using tools, and explain which tool you used"
    }
    crew =  CalculatorCrew().crew()
    result= await crew.akickoff(inputs=inputs)
    print(f"calculator result: {result}")


if __name__ == "__main__":
    # asyncio.run(map_sse_mcp())
    # asyncio.run(map_streamHttp_mcp())
    asyncio.run(calculator_stdio_mcp())
    
