# File Parser Tools for LangCrew

## Description

The `file_parser` module in LangCrew provides tools for parsing and analyzing various file formats. These tools enable AI agents to extract information, understand content, and process different types of files including documents, images, code files, and structured data formats.

The file parser tools support multiple file formats with intelligent content extraction and analysis capabilities.

## Installation

1. Install the `langcrew-tools` package:

```shell
pip install langcrew-tools
```

2. Install additional dependencies for file parsing:

```shell
pip install pypdf pymupdf python-docx openpyxl pandas
```

3. The file parser tools are part of the internal module and are automatically available when using LangCrew.

## Usage

```python
from langcrew_tools.internal.file_parser import FileParserTool

# Initialize the file parser tool
parser_tool = FileParserTool()

# Parse a file and extract content
result = await parser_tool.arun(
    file_path="document.pdf",
    extraction_type="text"
)
```

## Supported File Parser Tools

### FileParserTool

The `FileParserTool` provides comprehensive file parsing capabilities with support for various file formats and extraction methods.

**Features:**
- Multi-format file support (PDF, DOCX, XLSX, TXT, etc.)
- Text extraction and analysis
- Structured data extraction
- Image content analysis
- Code file parsing
- Metadata extraction
- Content summarization
- Format-specific parsing

**Usage Example:**
```python
from langcrew_tools.internal.file_parser import FileParserTool

tool = FileParserTool()

# Parse a PDF document
result = await tool.arun(
    file_path="report.pdf",
    extraction_type="text"
)

# Extract structured data from Excel file
result = await tool.arun(
    file_path="data.xlsx",
    extraction_type="structured_data"
)
```

## Supported File Formats

### Document Formats
- **PDF** - Portable Document Format with text and image extraction
- **DOCX** - Microsoft Word documents
- **TXT** - Plain text files
- **RTF** - Rich Text Format documents
- **Markdown** - Markdown formatted documents

### Spreadsheet Formats
- **XLSX** - Microsoft Excel files
- **CSV** - Comma-separated values
- **TSV** - Tab-separated values
- **ODS** - OpenDocument Spreadsheet

### Code Files
- **Python** - Python source code files
- **JavaScript** - JavaScript files
- **Java** - Java source files
- **C/C++** - C and C++ source files
- **HTML/CSS** - Web markup and styling files

### Image Formats
- **JPG/JPEG** - Image content analysis
- **PNG** - Image content analysis
- **GIF** - Animated image analysis
- **WebP** - Modern web image format

## Extraction Types

### Text Extraction
- Raw text content extraction
- Formatted text preservation
- Text structure analysis
- Language detection
- Text cleaning and normalization

### Structured Data Extraction
- Table data extraction
- Form field extraction
- Metadata extraction
- Data validation and cleaning
- Schema inference

### Code Analysis
- Syntax highlighting
- Code structure analysis
- Function and class extraction
- Comment and documentation extraction
- Code complexity analysis

### Image Content Analysis
- OCR (Optical Character Recognition)
- Image description generation
- Object detection and recognition
- Text extraction from images
- Image metadata analysis

## Integration with LangCrew Agents

These tools are designed to be used within LangCrew agent workflows:

```python
from langcrew import Agent
from langcrew.project import agent
from langcrew_tools.internal.file_parser import FileParserTool

@agent
def document_analysis_agent(self) -> Agent:
    return Agent(
        config=self.agents_config["document_analysis_agent"],
        allow_delegation=False,
        tools=[FileParserTool()]
    )
```

## File Processing Workflow

The file parser tools support a complete file processing workflow:

1. **File Validation** - Check file format and accessibility
2. **Content Extraction** - Extract relevant content based on type
3. **Content Analysis** - Analyze and process extracted content
4. **Data Structuring** - Organize extracted data into structured format
5. **Output Generation** - Generate analysis results and summaries

## Configuration Options

### Parser Configuration
- File format detection settings
- Extraction method selection
- Content filtering options
- Output format configuration
- Performance optimization settings

### Processing Settings
- Batch processing configuration
- Memory usage limits
- Timeout settings
- Error handling policies
- Caching options

## Error Handling

The tools include comprehensive error handling:
- File format detection errors
- Corrupted file handling
- Permission and access errors
- Memory and resource issues
- Network connectivity problems
- Parsing and extraction failures

## Performance Optimization

- **Streaming Processing** - Large file handling without memory issues
- **Parallel Processing** - Concurrent file processing
- **Caching** - Parsed content caching for repeated access
- **Resource Management** - Efficient memory and CPU usage
- **Incremental Processing** - Partial file processing capabilities

## Security Features

- **File Validation** - Input file security checks
- **Content Sanitization** - Safe content extraction
- **Access Control** - File access permission validation
- **Malware Protection** - Basic file security scanning
- **Data Privacy** - Secure content handling

## Advanced Features

### Content Analysis
- Document summarization
- Key information extraction
- Topic classification
- Sentiment analysis
- Entity recognition

### Data Processing
- Data cleaning and normalization
- Format conversion
- Schema validation
- Data quality assessment
- Statistical analysis

## License

This module is part of the LangCrew project and is released under the MIT License. 