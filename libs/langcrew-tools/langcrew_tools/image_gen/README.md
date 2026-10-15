# Image Generation Tools for LangCrew

## Description

The `image_gen` module in LangCrew provides tools for generating images from text descriptions using AI models. These tools enable AI agents to create visual content based on natural language prompts using the Doubao Seedream model from Volcano Engine.

The image generation tools support custom generators for flexible implementations, sandbox workspace integration, and S3 storage for persistent image persistence.

## Installation

1. Install the `langcrew-tools` package:

```shell
pip install langcrew-tools
```

2. Install additional dependencies for image generation:

```shell
pip install httpx volcenginesdkarkruntime
```

3. Set up required API keys and environment variables:

```shell
export ARK_API_KEY="your_ark_api_key_here"
```

## Usage

```python
from langcrew_tools.image_gen import ImageGenerationTool

# Initialize the image generation tool
image_tool = ImageGenerationTool()

# Generate an image
result = await image_tool.arun(
    prompt="beautiful modern Chinese woman, realistic photograph, professional photography",
    path="output/portrait.png"
)
print(result)
```

The tool requires the `ARK_API_KEY` environment variable to be set for image generation via the ARK API.

## Example: Integrating with a LangCrew Agent

```python
from langcrew import Agent
from langcrew.project import agent
from langcrew_tools.image_gen import ImageGenerationTool

# Define an agent that uses the image generation tool
@agent
def creative_designer(self) -> Agent:
    return Agent(
        config=self.agents_config["creative_designer"],
        allow_delegation=False,
        tools=[ImageGenerationTool()]
    )
```

## Supported Image Generation Tools

### ImageGenerationTool

The `ImageGenerationTool` provides image generation capabilities using the Doubao Seedream model from Volcano Engine ARK API, with optional support for custom image generators.

**Features:**
- ARK API integration (Volcano Engine, Doubao Seedream model)
- Custom image generator support for flexible implementations
- Sandbox workspace integration for cloud-based storage
- S3 integration for persistent image storage
- Chinese character detection and prompt enhancement
- Automatic file path handling with unique filename generation
- Asynchronous execution only

**Configuration Options:**
- `model`: The image generation model to use (defaults to `doubao-seedream-4-0-250828`)
- `custom_generator`: Optional custom async image generation function with signature:
  ```python
  async def custom_generator(prompt: str, path: str | None = None, **kwargs) -> str
  ```
  Should return base64 encoded image data. If provided, the tool will automatically
  handle saving to sandbox and S3 upload.

**Usage Examples:**

Basic image generation:
```python
from langcrew_tools.image_gen import ImageGenerationTool

tool = ImageGenerationTool()

# Generate a simple image
result = await tool.arun(
    prompt="sunset over mountains, digital art"
)
```

With custom generator:
```python
from langcrew_tools.image_gen import ImageGenerationTool

async def my_image_generator(prompt: str, path: str | None = None, **kwargs) -> str:
    # Custom image generation logic that returns base64 encoded image
    # ... your implementation ...
    return base64_image_data

tool = ImageGenerationTool(
    model="doubao-seedream-4-0-250828",
    custom_generator=my_image_generator
)

# Generate image using custom generator
result = await tool.arun(
    prompt="cute kitten playing with yarn, photorealistic",
    path="images/kitten.png"
)
```

**Environment Variables:**
- `ARK_API_KEY`: API key for ARK image generation service (required for default behavior)

## Model Support

The tool uses the **Doubao Seedream** model from Volcano Engine (ARK API) for image generation:

- **doubao-seedream-4-0-250828** - Default high-quality image generation model

If a `custom_generator` is provided, it will be used instead of the ARK API.

## Storage Options

Generated images are automatically saved to the E2B sandbox workspace. The `path` parameter allows you to specify a custom relative path:

```python
result = await tool.arun(
    prompt="landscape painting",
    path="artwork/landscape.png"
)
```

If no path is provided, images are saved with an auto-generated filename in the format:
`image_generation_{timestamp}_{random}.png`

All images are also uploaded to S3 for persistent storage.

## Error Handling

The tool includes comprehensive error handling:
- Empty prompt validation
- Chinese character detection with automatic prompt enhancement (adds instructions for text rendering in Chinese/English)
- Prompt length validation (max 4000 characters)
- Custom generator error handling with fallback to ARK API
- Detailed error logging

## License

This module is part of the LangCrew project and is released under the MIT License. 