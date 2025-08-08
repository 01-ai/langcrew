# Image Parser Tools for LangCrew

## Description

The `image_parser` module in LangCrew provides tools for analyzing images using vision models. These tools enable AI agents to understand and interpret visual content by downloading images from URLs, validating them, and sending them to vision models for detailed analysis and question answering.

The image parser tools support various image formats, automatic validation, and configurable vision model integration, making it easy to add visual understanding capabilities to your AI workflows.

## Installation

1. Install the `langcrew-tools` package:

```shell
pip install langcrew-tools
```

2. Install additional dependencies for image parsing:

```shell
pip install langchain-openai httpx
```

3. Set up required API keys and environment variables:

```shell
export VISION_API_KEY="your_openai_api_key_here"
export VISION_MODEL="gpt-4o"
export VISION_BASE_URL="https://api.openai.com/v1/"
```

## Usage

```python
from langcrew_tools.image_parser import ImageParserTool

# Initialize the image parser tool
image_tool = ImageParserTool()

# Analyze an image
result = await image_tool.arun(
    image_url="https://example.com/image.jpg",
    question="What objects do you see in this image?"
)
print(result)
```

The initialization parameters and usage may vary depending on your specific requirements. Please refer to the tool's docstring or source code for details.

## Example: Integrating with a LangCrew Agent

```python
from langcrew import Agent
from langcrew.project import agent
from langcrew_tools.image_parser import ImageParserTool

# Define an agent that uses the image parser tool
@agent
def visual_analyst(self) -> Agent:
    return Agent(
        config=self.agents_config["visual_analyst"],
        allow_delegation=False,
        tools=[ImageParserTool()]
    )
```

## Supported Image Parser Tools

### ImageParserTool

The `ImageParserTool` provides comprehensive image analysis capabilities using vision models to understand and interpret visual content.

**Features:**
- Automatic image download and validation from URLs
- Support for multiple image formats (JPG, PNG, GIF, WEBP, BMP, TIFF, SVG)
- Configurable vision model integration (GPT-4o, GPT-4 Vision, etc.)
- Image size and format validation
- Comprehensive error handling for network and processing issues
- Asynchronous and synchronous operation
- Customizable request timeouts and model parameters

**Configuration Options:**
- `vision_model`: Vision model to use (default: "gpt-4o")
- `vision_base_url`: Base URL for vision model API
- `vision_api_key`: API key for vision model
- `request_timeout`: Request timeout in seconds (default: 60)
- `max_image_size`: Maximum image size in bytes (default: 20MB)
- `max_tokens`: Maximum tokens for response (default: 4096)
- `temperature`: Temperature for model responses (default: 0.0)

**Usage Examples:**

Basic image analysis:
```python
from langcrew_tools.image_parser import ImageParserTool

tool = ImageParserTool()

# Analyze an image with a simple question
result = await tool.arun(
    image_url="https://example.com/photo.jpg",
    question="What is in this image?"
)
```

Advanced configuration:
```python
from langcrew_tools.image_parser import ImageParserTool, ImageParserConfig

# Create custom configuration
config = ImageParserConfig(
    vision_model="gpt-4o",
    vision_api_key="your_api_key",
    request_timeout=120,
    max_tokens=2048,
    temperature=0.1
)

tool = ImageParserTool(config=config)

# Analyze with specific question
result = await tool.arun(
    image_url="https://example.com/chart.png",
    question="What data is shown in this chart and what are the key trends?"
)
```

**Environment Variables:**
- `VISION_MODEL`: Vision model to use (default: gpt-4o)
- `VISION_BASE_URL`: Base URL for vision model API
- `VISION_API_KEY`: API key for vision model
- `VISION_TIMEOUT`: Request timeout in seconds
- `VISION_MAX_TOKENS`: Maximum tokens for response
- `VISION_TEMPERATURE`: Temperature for model responses
- `VISION_MAX_IMAGE_SIZE`: Maximum image size in bytes

## Supported Image Formats

The tool supports a wide range of image formats:
- **JPEG/JPG** - Common photographic format
- **PNG** - Lossless image format with transparency
- **GIF** - Animated and static images
- **WebP** - Modern web-optimized format
- **BMP** - Bitmap image format
- **TIFF** - High-quality image format
- **SVG** - Vector graphics format

## Image Validation

The tool includes comprehensive image validation:
- **URL Format Validation** - Ensures valid URL structure
- **Content Type Validation** - Verifies proper image MIME types
- **Size Validation** - Checks image size against configurable limits
- **Download Validation** - Handles network errors and HTTP status codes
- **Format Support** - Validates against supported image formats

## Error Handling

The tool provides robust error handling for various scenarios:
- Invalid or malformed URLs
- Network connection issues
- HTTP errors (404, 403, etc.)
- Image size exceeding limits
- Unsupported image formats
- Vision model API errors
- Timeout handling

## Performance Considerations

- **Timeout Configuration** - Adjustable request timeouts for different network conditions
- **Image Size Limits** - Configurable maximum image size to prevent memory issues
- **Async Operation** - Non-blocking image processing for better performance
- **Caching** - Images are downloaded fresh for each request (no caching by default)

## Integration with Vision Models

The tool is designed to work with various vision models:
- **OpenAI GPT-4o** - Default model with excellent visual understanding
- **GPT-4 Vision** - Alternative model for specific use cases
- **Custom Models** - Configurable for other vision model APIs

## License

This module is part of the LangCrew project and is released under the MIT License. 