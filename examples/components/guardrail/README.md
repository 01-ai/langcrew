# LangCrew Guardrail Examples

This directory contains comprehensive examples demonstrating the guardrail functionality in LangCrew.

## Overview

Guardrails in LangCrew provide a robust way to validate inputs and outputs at both the agent and task levels, ensuring data quality, security, and compliance with business rules.

## Features Demonstrated

### Basic Guardrails
- **Input Guardrails**: Validate incoming data before processing
- **Output Guardrails**: Validate generated content before delivery
- **Agent-Level Guardrails**: Apply to all tasks executed by an agent
- **Task-Level Guardrails**: Apply only to specific tasks
- **Combined Guardrails**: Layer multiple guardrail types for comprehensive protection

### Advanced Guardrails
- **Language Support**: Detect and validate supported languages
- **Content Categorization**: Validate content belongs to allowed categories
- **Output Format Validation**: Ensure proper structure and formatting
- **Factual Accuracy**: Check for balanced and accurate language
- **Rate Limiting**: Prevent abuse through request throttling
- **Ethical Guidelines**: Ensure content follows ethical standards
- **Data Privacy**: Protect against PII exposure
- **User Permissions**: Enforce access control based on user roles

### Conditional Guardrails
- **Context-Aware Validation**: Adapt validation rules based on content type
- **Security Context**: Apply stricter rules for security-sensitive operations
- **Adaptive Rate Limiting**: Adjust limits based on user tier (basic/premium/enterprise)

### Custom Error Handling
- **Enhanced Error Messages**: Provide detailed feedback and suggestions
- **Error Codes**: Include structured error information
- **Recovery Suggestions**: Offer actionable guidance for fixing issues

## Examples Included

1. **Basic Functionality**
   - Agent-level guardrails
   - Task-level guardrails
   - Combined guardrails
   - Guardrail blocking behavior

2. **Specialized Validation**
   - Language and category validation
   - Rate limiting demonstration
   - Ethical and privacy protection
   - User permission management
   - Factual accuracy checking

3. **Advanced Features**
   - Conditional guardrail behavior
   - Context-aware quality checking
   - Adaptive rate limiting by user tier
   - Custom error handling with suggestions
   - Performance benchmarking

4. **Error Handling**
   - Comprehensive error testing
   - Custom error types
   - Recovery suggestions
   - Performance analysis

## Running the Examples

### Prerequisites
- Python 3.8+
- OpenAI API key (for LLM-based examples)
- LangCrew library installed

### Setup
```bash
export OPENAI_API_KEY=your_api_key_here
```

### Execution
```bash
python guardrail_example.py
```

## Guardrail Types

### Input Guardrails
- `check_no_sensitive_info`: Prevents processing of sensitive data
- `check_input_length`: Limits input length to prevent abuse
- `check_language_support`: Validates supported languages
- `check_content_category`: Ensures content fits allowed categories
- `check_rate_limiting`: Prevents request abuse
- `check_user_permissions`: Enforces access control
- `conditional_sensitive_check`: Context-aware sensitive data validation
- `adaptive_rate_limiting`: Tier-based rate limiting

### Output Guardrails
- `check_output_quality`: Ensures output meets quality standards
- `filter_profanity`: Filters inappropriate content
- `check_output_format`: Validates output structure
- `check_factual_accuracy`: Ensures balanced and accurate language
- `check_ethical_guidelines`: Enforces ethical content standards
- `check_data_privacy`: Prevents PII exposure
- `context_aware_quality_check`: Adapts quality checks to content type
- `comprehensive_output_validation`: Multi-faceted output validation

## Use Cases

- **Content Generation**: Ensure generated content meets quality and ethical standards
- **Data Processing**: Validate inputs for sensitive information and format compliance
- **API Security**: Implement rate limiting and access control
- **Compliance**: Meet regulatory requirements for data handling
- **Quality Assurance**: Maintain consistent output quality across all operations

## Best Practices

1. **Layer Guardrails**: Use both agent and task-level guardrails for comprehensive protection
2. **Context Awareness**: Adapt validation rules based on the specific use case
3. **Performance**: Keep guardrails lightweight to avoid impacting system performance
4. **Error Handling**: Provide clear, actionable error messages
5. **Testing**: Thoroughly test guardrails with various input scenarios
6. **Monitoring**: Track guardrail performance and effectiveness

## Customization

Guardrails can be easily customized by:
- Creating new guardrail functions with the `@input_guard` or `@output_guard` decorators
- Extending the `GuardrailError` class for custom error handling
- Implementing conditional logic based on context or user attributes
- Adding performance monitoring and logging

## Performance Considerations

- Basic guardrails typically execute in <1ms
- Complex regex-based guardrails may take longer
- Consider caching results for expensive operations
- Monitor guardrail performance in production environments
