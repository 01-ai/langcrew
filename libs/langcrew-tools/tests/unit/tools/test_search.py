from langchain_core.runnables.config import RunnableConfig

from langcrew_tools.search import WebSearchInput


class TestWebSearchInput:
    """Test WebSearchInput model."""

    def test_custom_values(self):
        """Test custom values for WebSearchInput."""
        input_model = WebSearchInput(query="custom query", query_num=50)
        assert input_model.query == "custom query"
        assert input_model.query_num == 50


class TestWebSearchTool:
    """Test WebSearchTool functionality."""

    config = RunnableConfig(configurable={"thread_id": "test_thread_id"})

    def test_input_model_has_brief_field(self):
        """Test that WebSearchInput has inherited brief field from BaseToolInput."""
        input_model = WebSearchInput(query="test query")

        # Should have brief field with default value
        assert hasattr(input_model, "brief")
        assert input_model.brief == ""

        # Should be able to set brief field
        input_with_brief = WebSearchInput(query="test query", brief="搜索测试")
        assert input_with_brief.brief == "搜索测试"
