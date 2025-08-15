# Image Generation Tools for LangCrew

## Description

The `image_gen` module in LangCrew provides tools for generating images from text descriptions using AI models. These tools enable AI agents to create visual content based on natural language prompts, supporting various image generation models with improved timeout handling and retry mechanisms.

The image generation tools support multiple models, automatic fallback strategies, and flexible storage options including local file system and sandbox workspace integration.

## Installation

1. Install the `langcrew-tools` package:

```shell
pip install langcrew-tools
```

2. Install additional dependencies for image generation:

```shell
pip install openai httpx
```

3. Set up required API keys and environment variables:

```shell
export LANGCREW_IMAGE_GEN_API_KEY="your_api_key_here"
export LANGCREW_IMAGE_GEN_BASE_URL="https://api.aimlapi.com/v1/"
```

## Usage

```python
from langcrew_tools.image_gen import ImageGenerationTool

# Initialize the image generation tool
image_tool = ImageGenerationTool(
    api_key="your_api_key",
    default_size="1024x1024",
    default_quality="medium"
)

# Generate an image
result = await image_tool.arun(
    prompt="beautiful modern Chinese woman, realistic photograph, professional photography",
    path="output/portrait.png"
)
print(result)
```

The initialization parameters and usage may vary depending on your specific requirements. Please refer to the tool's docstring or source code for details.

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

The `ImageGenerationTool` provides comprehensive image generation capabilities with multiple model support and automatic fallback strategies.

**Features:**
- Multiple model support (flux/schnell, flux-pro/v1.1, DALL-E 3)
- Automatic model fallback with timeout handling
- Configurable image size, quality, and quantity
- Local file system and sandbox workspace storage
- S3 integration for cloud storage
- Proxy support for network configuration
- Chinese character detection and validation
- Asynchronous and synchronous operation

**Configuration Options:**
- `api_key`: API key for image generation service
- `base_url`: Base URL for the API (defaults to AIML API)
- `proxy_url`: HTTP proxy URL for network requests
- `default_size`: Default image size (e.g., "1024x1024")
- `default_quality`: Default image quality ("low", "medium", "high")
- `default_n`: Number of images to generate (default: 1)
- `enable_sandbox`: Enable sandbox workspace integration
- `sandbox_id`: Connect to existing sandbox
- `sandbox_config`: Custom sandbox configuration

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

Advanced configuration:
```python
from langcrew_tools.image_gen import ImageGenerationTool

tool = ImageGenerationTool(
    api_key="your_api_key",
    default_size="1792x1024",
    default_quality="high",
    default_n=2,
    enable_sandbox=True
)

# Generate multiple high-quality images
result = await tool.arun(
    prompt="cute kitten playing with yarn, photorealistic",
    path="images/kitten.png"
)
```

**Environment Variables:**
- `LANGCREW_IMAGE_GEN_API_KEY`: API key for image generation
- `LANGCREW_IMAGE_GEN_BASE_URL`: Base URL for API
- `LANGCREW_IMAGE_GEN_PROXY_URL`: HTTP proxy URL
- `LANGCREW_IMAGE_GEN_DEFAULT_SIZE`: Default image size
- `LANGCREW_IMAGE_GEN_DEFAULT_QUALITY`: Default image quality
- `LANGCREW_IMAGE_GEN_DEFAULT_N`: Default number of images
- `LANGCREW_IMAGE_GEN_SANDBOX_ID`: Sandbox ID for integration

## Model Support

The tool supports multiple image generation models with automatic fallback:

1. **flux/schnell** - Fast generation with 60s timeout
2. **flux-pro/v1.1** - High-quality generation with 90s timeout
3. **DALL-E 3** - OpenAI's latest model (commented out by default)

The tool automatically tries models in order and falls back to the next if one fails.

## Storage Options

### Local Storage
Images can be saved to the local file system with custom paths:
```python
result = await tool.arun(
    prompt="landscape painting",
    path="artwork/landscape.png"
)
```

### Sandbox Integration
Enable sandbox integration for cloud-based storage and collaboration:
```python
tool = ImageGenerationTool(enable_sandbox=True)
result = await tool.arun(prompt="abstract art")
```

## Error Handling

The tool includes comprehensive error handling:
- Empty prompt validation
- Chinese character detection (requires English prompts)
- Prompt length validation (max 4000 characters)
- Model timeout handling
- Automatic retry with different models
- Detailed error logging

## License

This module is part of the LangCrew project and is released under the MIT License. 