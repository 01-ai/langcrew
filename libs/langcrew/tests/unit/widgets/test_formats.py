"""
Unit tests for WidgetFormat class.

Tests the core functionality of WidgetFormat including file loading,
data validation, template rendering, and error handling.
"""

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from langcrew.chatkit.widgets.formats import Widget as WidgetFormat


class TestWidgetFormatInitialization:
    """测试WidgetFormat类的初始化"""

    def test_widget_format_init_with_all_params(self):
        """测试使用所有参数初始化WidgetFormat"""
        name = "testWidget"
        template = "{{test}}"
        schema = {"type": "object", "properties": {"test": {"type": "string"}}}
        version = "2.0"

        widget = WidgetFormat(name=name, template=template, schema=schema, version=version)

        assert widget.name == name
        assert widget.template == template
        assert widget.schema == schema
        assert widget.version == version
        assert widget._compiled_template is None

    def test_widget_format_init_with_default_version(self):
        """测试使用默认版本号初始化WidgetFormat"""
        widget = WidgetFormat(
            name="test",
            template="{{value}}",
            schema={"type": "object"}
        )

        assert widget.version == "1.0"


class TestWidgetFormatFileLoading:
    """测试WidgetFormat文件加载功能"""

    def test_from_file_with_real_widget(self, draft_email_widget_path):
        """测试从真实的draftEmail.widget文件加载"""
        widget = WidgetFormat.from_file(str(draft_email_widget_path))

        assert widget.name == "draftEmail"
        assert widget.version == "1.0"
        assert isinstance(widget.schema, dict)
        assert "jsonSchema" in widget.to_dict()
        
        # 验证schema包含必需字段
        schema = widget.schema
        assert "properties" in schema
        assert "emailFrom" in schema["properties"]
        assert "defaultTo" in schema["properties"]
        assert "defaultSubject" in schema["properties"]
        assert "defaultBody" in schema["properties"]

    def test_from_file_nonexistent_file(self):
        """测试加载不存在的文件"""
        with pytest.raises(FileNotFoundError, match="Widget file not found"):
            WidgetFormat.from_file("nonexistent.widget")

    def test_from_file_invalid_json(self, temp_dir):
        """测试加载无效JSON文件"""
        invalid_file = temp_dir / "invalid.widget"
        invalid_file.write_text("invalid json content")

        with pytest.raises(ValueError, match="Invalid JSON in widget file"):
            WidgetFormat.from_file(str(invalid_file))

    def test_from_file_missing_required_fields(self, temp_dir):
        """测试加载缺少必需字段的文件"""
        incomplete_widget = {
            "name": "incomplete",
            # Missing template and jsonSchema
        }
        
        incomplete_file = temp_dir / "incomplete.widget"
        incomplete_file.write_text(json.dumps(incomplete_widget))

        with pytest.raises(ValueError, match="Missing required fields"):
            WidgetFormat.from_file(str(incomplete_file))


class TestWidgetFormatCreationMethods:
    """测试WidgetFormat的创建方法"""

    def test_from_dict(self):
        """测试从字典创建WidgetFormat"""
        widget_dict = {
            "name": "testWidget",
            "template": "{{value}}",
            "jsonSchema": {"type": "object", "properties": {"value": {"type": "string"}}},
            "version": "1.5"
        }

        widget = WidgetFormat.from_dict(widget_dict)

        assert widget.name == "testWidget"
        assert widget.template == "{{value}}"
        assert widget.schema == widget_dict["jsonSchema"]
        assert widget.version == "1.5"

    def test_from_json(self):
        """测试从JSON字符串创建WidgetFormat"""
        widget_data = {
            "name": "jsonWidget",
            "template": "{{data}}",
            "jsonSchema": {"type": "object"},
        }
        json_str = json.dumps(widget_data)

        widget = WidgetFormat.from_json(json_str)

        assert widget.name == "jsonWidget"
        assert widget.template == "{{data}}"
        assert widget.version == "1.0"  # Default version


class TestWidgetFormatDataValidation:
    """测试WidgetFormat数据验证功能"""

    def test_validate_data_valid_data(self, draft_email_widget_format, valid_draft_email_data):
        """测试验证有效数据"""
        result = draft_email_widget_format.validate_data(valid_draft_email_data)
        assert result is True

    def test_validate_data_invalid_data(self, draft_email_widget_format, invalid_draft_email_data):
        """测试验证无效数据"""
        result = draft_email_widget_format.validate_data(invalid_draft_email_data)
        assert result is False

    def test_validate_data_missing_required_fields(self, draft_email_widget_format):
        """测试验证缺少必需字段的数据"""
        incomplete_data = {
            "emailFrom": "test@example.com"
            # Missing defaultTo, defaultSubject, defaultBody
        }
        
        result = draft_email_widget_format.validate_data(incomplete_data)
        assert result is False

    def test_validate_data_extra_fields(self, draft_email_widget_format):
        """测试验证包含额外字段的数据"""
        data_with_extra = {
            "emailFrom": "test@example.com",
            "defaultTo": "recipient@example.com",
            "defaultSubject": "Test Subject",
            "defaultBody": "Test body",
            "extraField": "not allowed"
        }
        
        result = draft_email_widget_format.validate_data(data_with_extra)
        assert result is False

    def test_validate_data_without_jsonschema(self):
        """测试validate_data当jsonschema验证失败时返回False"""
        import jsonschema

        widget = WidgetFormat(
            name="simple",
            template="{{value}}",
            schema={"type": "object"}
        )

        validation_error = jsonschema.ValidationError("Validation failed")
        with patch('langcrew.chatkit.widgets.formats.jsonschema.validate', side_effect=validation_error):
            result = widget.validate_data({"value": "test"})
            assert result is False


class TestWidgetFormatTemplateRendering:
    """测试WidgetFormat模板渲染功能"""

    def test_render_valid_data(self, draft_email_widget_format, valid_draft_email_data):
        """测试渲染有效数据"""
        result = draft_email_widget_format.render(valid_draft_email_data)
        
        assert isinstance(result, dict)
        assert result["type"] == "Card"
        assert result["size"] == "lg"
        
        # 检查渲染后的数据是否包含正确的值
        found_email_from = False
        found_default_to = False
        
        def check_nested_dict(obj):
            nonlocal found_email_from, found_default_to
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if key == "value" and value == valid_draft_email_data["emailFrom"]:
                        found_email_from = True
                    elif key == "value" and value == valid_draft_email_data["defaultTo"]:
                        found_default_to = True
                    else:
                        check_nested_dict(value)
            elif isinstance(obj, list):
                for item in obj:
                    check_nested_dict(item)
        
        check_nested_dict(result)
        assert found_email_from
        assert found_default_to

    def test_render_invalid_data(self, draft_email_widget_format, invalid_draft_email_data):
        """测试渲染无效数据"""
        with pytest.raises(ValueError, match="Data doesn't match widget schema"):
            draft_email_widget_format.render(invalid_draft_email_data)

    def test_render_template_error(self):
        """测试模板渲染错误"""
        # 创建一个带有无效Jinja2模板的widget
        widget = WidgetFormat(
            name="badTemplate",
            template="{{unclosed_tag",  # Invalid Jinja2 syntax
            schema={"type": "object", "properties": {"test": {"type": "string"}}}
        )
        
        valid_data = {"test": "value"}
        
        with pytest.raises(ValueError, match="Invalid Jinja2 template"):
            widget.render(valid_data)

    def test_render_template_execution_error(self):
        """测试模板执行错误"""
        widget = WidgetFormat(
            name="executionError",
            template='{"invalid": "json" "syntax"}',  # Invalid JSON output
            schema={"type": "object", "properties": {"test": {"type": "string"}}}
        )
        
        valid_data = {"test": "value"}
        
        with pytest.raises(ValueError, match="Template rendering failed"):
            widget.render(valid_data)

    def test_template_compilation_caching(self, draft_email_widget_format, valid_draft_email_data):
        """测试模板编译缓存"""
        # First render
        result1 = draft_email_widget_format.render(valid_draft_email_data)
        template1 = draft_email_widget_format._compiled_template
        
        # Second render should reuse compiled template
        result2 = draft_email_widget_format.render(valid_draft_email_data)
        template2 = draft_email_widget_format._compiled_template
        
        assert template1 is template2
        assert result1 == result2


class TestWidgetFormatUtilityMethods:
    """测试WidgetFormat工具方法"""

    def test_get_json_schema(self, draft_email_widget_format):
        """测试获取JSON Schema"""
        schema = draft_email_widget_format.get_json_schema()
        
        assert isinstance(schema, dict)
        assert "type" in schema
        assert "properties" in schema
        assert "required" in schema

    def test_to_dict(self, draft_email_widget_format):
        """测试转换为字典"""
        result = draft_email_widget_format.to_dict()
        
        assert isinstance(result, dict)
        assert result["name"] == "draftEmail"
        assert result["version"] == "1.0"
        assert "template" in result
        assert "jsonSchema" in result

    def test_to_json(self, draft_email_widget_format):
        """测试转换为JSON字符串"""
        json_str = draft_email_widget_format.to_json()
        
        assert isinstance(json_str, str)
        
        # 验证可以正确解析
        parsed = json.loads(json_str)
        assert parsed["name"] == "draftEmail"
        assert parsed["version"] == "1.0"

    def test_repr(self, draft_email_widget_format):
        """测试字符串表示"""
        repr_str = repr(draft_email_widget_format)
        
        assert "Widget" in repr_str
        assert "draftEmail" in repr_str
        assert "1.0" in repr_str


class TestWidgetFormatErrorHandling:
    """测试WidgetFormat错误处理"""

    def test_missing_dependencies_import_error(self):
        """测试缺少依赖时的导入错误"""
        # 这个测试需要mock导入错误，但由于我们已经导入了，所以跳过
        # 在实际环境中，这会在导入时就失败
        pass

    def test_schema_validation_graceful_failure(self):
        """测试schema验证在schema本身有问题时抛出SchemaError"""
        import jsonschema

        widget = WidgetFormat(
            name="test",
            template="{{value}}",
            schema={"type": "object", "properties": {"invalid_property": {"type": "invalid_type"}}}
        )

        # An invalid schema type causes SchemaError (not caught by validate_data)
        with pytest.raises(jsonschema.SchemaError):
            widget.validate_data({"value": "test"})