"""
Unit tests for While node with subgraph implementation.

Tests the While loop node's ability to:
1. Execute loop conditions
2. Build and execute body subgraphs
3. Inherit checkpointer from parent graph
4. Support arbitrary workflow nodes in body
"""

import pytest
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver

from langcrew.workflow.builder import WorkflowBuilder
from langcrew.workflow.config import WorkflowConfig


@pytest.fixture
def simple_while_workflow():
    """
    Simple while loop that increments a counter.
    
    The loop continues while counter < 3.
    """
    return {
        "name": "Simple While Loop",
        "workflow_type": "chat",
        "nodes": [
            {
                "id": "start",
                "node_type": "builtins.Start",
                "label": "Start",
                "config": {
                    "state_variable_json_schema": {
                        "type": "object",
                        "properties": {
                            "counter": {
                                "type": "number",
                                "default": 0
                            }
                        },
                        "required": ["counter"],
                        "additionalProperties": False
                    }
                }
            },
            {
                "id": "while_loop",
                "node_type": "builtins.While",
                "label": "Counter Loop",
                "config": {
                    "condition": {
                        "expression": "state.counter < 3",
                        "format": "cel"
                    },
                    "max_iterations": 10,
                    "body": {
                        "nodes": [
                            {
                                "id": "increment",
                                "node_type": "builtins.SetState",
                                "label": "Increment Counter",
                                "config": {
                                    "assignments": [
                                        {
                                            "name": "counter",
                                            "expression": {
                                                "expression": "state.counter + 1",
                                                "format": "cel"
                                            }
                                        }
                                    ]
                                }
                            }
                        ],
                        "edges": [],
                        "start_node_id": "increment"
                    }
                }
            },
            {
                "id": "end",
                "node_type": "builtins.End",
                "label": "End",
                "config": {}
            }
        ],
        "edges": [
            {
                "id": "edge_1",
                "source_node_id": "start",
                "target_node_id": "while_loop"
            },
            {
                "id": "edge_2",
                "source_node_id": "while_loop",
                "source_port_id": "out",
                "target_node_id": "end"
            }
        ]
    }


@pytest.fixture
def while_with_conditional_workflow():
    """
    While loop with conditional branching in body.
    
    Tests that complex body nodes (like IfElse) work correctly.
    """
    return {
        "name": "While with Conditional",
        "workflow_type": "chat",
        "nodes": [
            {
                "id": "start",
                "node_type": "builtins.Start",
                "label": "Start",
                "config": {
                    "state_variable_json_schema": {
                        "type": "object",
                        "properties": {
                            "counter": {
                                "type": "number",
                                "default": 0
                            },
                            "even_count": {
                                "type": "number",
                                "default": 0
                            },
                            "odd_count": {
                                "type": "number",
                                "default": 0
                            }
                        },
                        "required": ["counter", "even_count", "odd_count"],
                        "additionalProperties": False
                    }
                }
            },
            {
                "id": "while_loop",
                "node_type": "builtins.While",
                "label": "Conditional Loop",
                "config": {
                    "condition": {
                        "expression": "state.counter < 5",
                        "format": "cel"
                    },
                    "max_iterations": 10,
                    "body": {
                        "nodes": [
                            {
                                "id": "check_even",
                                "node_type": "builtins.IfElse",
                                "label": "Check Even",
                                "config": {
                                    "cases": [
                                        {
                                            "label": "Even",
                                            "output_port_id": "even",
                                            "predicate": "state.user_state.counter % 2 == 0"
                                        }
                                    ],
                                    "fallback": {
                                        "label": "Odd",
                                        "output_port_id": "odd"
                                    }
                                }
                            },
                            {
                                "id": "increment_even",
                                "node_type": "builtins.SetState",
                                "label": "Increment Even",
                                "config": {
                                    "assignments": [
                                        {
                                            "name": "even_count",
                                            "expression": {
                                                "expression": "state.user_state.even_count + 1",
                                                "format": "cel"
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "id": "increment_odd",
                                "node_type": "builtins.SetState",
                                "label": "Increment Odd",
                                "config": {
                                    "assignments": [
                                        {
                                            "name": "odd_count",
                                            "expression": {
                                                "expression": "state.user_state.odd_count + 1",
                                                "format": "cel"
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "id": "increment_counter",
                                "node_type": "builtins.SetState",
                                "label": "Increment Counter",
                                "config": {
                                    "assignments": [
                                        {
                                            "name": "counter",
                                            "expression": {
                                                "expression": "state.user_state.counter + 1",
                                                "format": "cel"
                                            }
                                        }
                                    ]
                                }
                            }
                        ],
                        "edges": [
                            {
                                "id": "edge_even",
                                "source_node_id": "check_even",
                                "source_port_id": "even",
                                "target_node_id": "increment_even"
                            },
                            {
                                "id": "edge_odd",
                                "source_node_id": "check_even",
                                "source_port_id": "odd",
                                "target_node_id": "increment_odd"
                            },
                            {
                                "id": "edge_even_to_inc",
                                "source_node_id": "increment_even",
                                "target_node_id": "increment_counter"
                            },
                            {
                                "id": "edge_odd_to_inc",
                                "source_node_id": "increment_odd",
                                "target_node_id": "increment_counter"
                            }
                        ],
                        "start_node_id": "check_even"
                    }
                }
            },
            {
                "id": "end",
                "node_type": "builtins.End",
                "label": "End",
                "config": {}
            }
        ],
        "edges": [
            {
                "id": "edge_1",
                "source_node_id": "start",
                "target_node_id": "while_loop"
            },
            {
                "id": "edge_2",
                "source_node_id": "while_loop",
                "source_port_id": "out",
                "target_node_id": "end"
            }
        ]
    }


class TestWhileNode:
    """Test cases for While node with subgraph implementation."""

    def test_while_node_initialization(self):
        """Test that While node initializes correctly with body config."""
        from langcrew.workflow.nodes.while_node import WhileNode

        node_config = {
            "condition": {
                "expression": "state.counter < 5",
                "format": "cel"
            },
            "max_iterations": 10,
            "body": {
                "nodes": [
                    {
                        "id": "test_node",
                        "node_type": "builtins.SetState",
                        "label": "Test",
                        "config": {
                            "assignments": []
                        }
                    }
                ],
                "edges": []
            }
        }

        node = WhileNode(
            id="test_while",
            node_type="builtins.While",
            label="Test While",
            config=node_config,
        )

        assert node.id == "test_while"
        assert node.config["condition"]["expression"] == "state.counter < 5"
        assert node.config["condition"]["format"] == "cel"
        assert node.config["max_iterations"] == 10
        assert node.config.get("body") is not None  # Body config should be present

    def test_while_node_without_body(self):
        """Test While node without body configuration."""
        from langcrew.workflow.nodes.while_node import WhileNode

        node_config = {
            "condition": {
                "expression": "state.counter < 5",
                "format": "cel"
            },
            "max_iterations": 10
        }

        node = WhileNode(
            id="test_while_no_body",
            node_type="builtins.While",
            label="Test While No Body",
            config=node_config,
        )

        assert node.config.get("body") is None  # No body config

    @pytest.mark.asyncio
    async def test_simple_while_loop_execution(self, simple_while_workflow):
        """Test simple while loop execution with counter."""
        # Build workflow
        config = WorkflowConfig.from_dict(simple_while_workflow)
        builder = WorkflowBuilder(config, is_async=True)
        graph = builder.build_graph()
        
        # Compile with checkpointer
        checkpointer = MemorySaver()
        compiled = graph.compile(checkpointer=checkpointer)
        
        # Execute workflow
        thread_id = "test_simple_loop"
        result = await compiled.ainvoke(
            {"messages": [HumanMessage(content="Start loop")]},
            config={"configurable": {"thread_id": thread_id}}
        )
        
        # Verify loop executed correctly
        assert "user_state" in result
        assert result["user_state"]["counter"] == 3  # Loop should stop at 3

        # Verify while loop completed (no nodes key in state, check user_state directly)
        assert result["user_state"].get("__loop_while_loop") == 3  # 3 iterations completed

    @pytest.mark.asyncio
    async def test_while_max_iterations(self):
        """Test that while loop respects max_iterations."""
        workflow = {
            "name": "Max Iterations Test",
            "workflow_type": "chat",
            "nodes": [
                {
                    "id": "start",
                    "node_type": "builtins.Start",
                    "label": "Start",
                    "config": {
                        "state_variable_json_schema": {
                            "type": "object",
                            "properties": {
                                "always_true": {
                                    "type": "boolean",
                                    "default": True
                                }
                            },
                            "required": ["always_true"],
                            "additionalProperties": False
                        }
                    }
                },
                {
                    "id": "while_loop",
                    "node_type": "builtins.While",
                    "label": "Infinite Loop",
                    "config": {
                        "condition": {
                            "expression": "state.always_true == true",
                            "format": "cel"
                        },
                        "max_iterations": 5,  # Should stop at 5
                        "body": {
                            "nodes": [
                                {
                                    "id": "dummy",
                                    "node_type": "builtins.SetState",
                                    "label": "Dummy",
                                    "config": {
                                        "assignments": [
                                            {
                                                "name": "dummy",
                                                "expression": {
                                                    "expression": "1",
                                                    "format": "cel"
                                                }
                                            }
                                        ]
                                    }
                                }
                            ],
                            "edges": [],
                            "start_node_id": "dummy"
                        }
                    }
                },
                {
                    "id": "end",
                    "node_type": "builtins.End",
                    "label": "End",
                    "config": {}
                }
            ],
            "edges": [
                {
                    "id": "edge_1",
                    "source_node_id": "start",
                    "target_node_id": "while_loop"
                },
                {
                    "id": "edge_2",
                    "source_node_id": "while_loop",
                    "source_port_id": "out",
                    "target_node_id": "end"
                }
            ]
        }
        
        config = WorkflowConfig.from_dict(workflow)
        builder = WorkflowBuilder(config, is_async=True)
        graph = builder.build_graph()
        compiled = graph.compile()
        
        result = await compiled.ainvoke(
            {"messages": [HumanMessage(content="Start")]}
        )
        
        # Verify max iterations reached - check user_state loop counter
        loop_key = "__loop_while_loop"
        assert result.get("user_state", {}).get(loop_key) is not None

    @pytest.mark.asyncio
    async def test_while_with_checkpointer_inheritance(self, simple_while_workflow):
        """Test that body subgraph inherits parent checkpointer."""
        config = WorkflowConfig.from_dict(simple_while_workflow)
        builder = WorkflowBuilder(config, is_async=True)
        graph = builder.build_graph()
        
        # Compile with checkpointer
        checkpointer = MemorySaver()
        compiled = graph.compile(checkpointer=checkpointer)
        
        thread_id = "test_checkpoint"
        
        # Execute workflow
        result = await compiled.ainvoke(
            {"messages": [HumanMessage(content="Test")]},
            config={"configurable": {"thread_id": thread_id}}
        )
        
        # Verify checkpointer was used (state persisted)
        assert result is not None
        
        # Get checkpoint history
        checkpoints = []
        async for checkpoint in checkpointer.alist(
            config={"configurable": {"thread_id": thread_id}}
        ):
            checkpoints.append(checkpoint)
        
        # Should have checkpoints from execution
        assert len(checkpoints) > 0

    def test_while_workflow_validation(self):
        """Test that workflow with While node passes validation."""
        workflow = {
            "name": "While Validation Test",
            "workflow_type": "chat",
            "nodes": [
                {
                    "id": "start",
                    "node_type": "builtins.Start",
                    "label": "Start",
                    "config": {}
                },
                {
                    "id": "while_1",
                    "node_type": "builtins.While",
                    "label": "While Loop",
                    "config": {
                        "condition": {
                            "expression": "state.counter < 10",
                            "format": "cel"
                        },
                        "body": {
                            "nodes": [
                                {
                                    "id": "node_1",
                                    "node_type": "builtins.SetState",
                                    "label": "Set State",
                                    "config": {
                                        "assignments": [
                                            {
                                                "name": "test",
                                                "expression": {
                                                    "expression": "1",
                                                    "format": "cel"
                                                }
                                            }
                                        ]
                                    }
                                }
                            ],
                            "edges": []
                        }
                    }
                },
                {
                    "id": "end",
                    "node_type": "builtins.End",
                    "label": "End",
                    "config": {}
                }
            ],
            "edges": [
                {
                    "id": "edge_1",
                    "source_node_id": "start",
                    "target_node_id": "while_1"
                },
                {
                    "id": "edge_2",
                    "source_node_id": "while_1",
                    "source_port_id": "out",
                    "target_node_id": "end"
                }
            ]
        }
        
        # Should not raise validation errors
        config = WorkflowConfig.from_dict(workflow)
        assert config is not None
        assert len(config.nodes) == 3
        
        # Build graph should work
        builder = WorkflowBuilder(config)
        graph = builder.build_graph()
        assert graph is not None

    def test_while_empty_body_validation_error(self):
        """Test that While node with empty body raises validation error at build time."""
        workflow_empty_nodes = {
            "name": "While Empty Body Test",
            "workflow_type": "chat",
            "nodes": [
                {
                    "id": "start",
                    "node_type": "builtins.Start",
                    "label": "Start",
                    "config": {}
                },
                {
                    "id": "while_1",
                    "node_type": "builtins.While",
                    "label": "While Loop",
                    "config": {
                        "condition": {
                            "expression": "state.counter < 10",
                            "format": "cel"
                        },
                        "body": {
                            "nodes": [],  # Empty nodes list
                            "edges": []
                        }
                    }
                },
                {
                    "id": "end",
                    "node_type": "builtins.End",
                    "label": "End",
                    "config": {}
                }
            ],
            "edges": [
                {
                    "id": "edge_1",
                    "source_node_id": "start",
                    "target_node_id": "while_1"
                },
                {
                    "id": "edge_2",
                    "source_node_id": "while_1",
                    "source_port_id": "out",
                    "target_node_id": "end"
                }
            ]
        }
        
        # Config creation should succeed (allows draft state)
        config = WorkflowConfig.from_dict(workflow_empty_nodes)
        assert config is not None
        
        # But building the graph should raise ValueError
        builder = WorkflowBuilder(config)
        with pytest.raises(ValueError) as exc_info:
            builder.build_graph()
        
        assert "While node 'while_1'" in str(exc_info.value)
        assert "must have a non-empty body" in str(exc_info.value)

    def test_while_no_body_validation_error(self):
        """Test that While node without body config raises validation error at build time."""
        workflow_no_body = {
            "name": "While No Body Test",
            "workflow_type": "chat",
            "nodes": [
                {
                    "id": "start",
                    "node_type": "builtins.Start",
                    "label": "Start",
                    "config": {}
                },
                {
                    "id": "while_1",
                    "node_type": "builtins.While",
                    "label": "While Loop",
                    "config": {
                        "condition": {
                            "expression": "state.counter < 10",
                            "format": "cel"
                        }
                        # No body field at all
                    }
                },
                {
                    "id": "end",
                    "node_type": "builtins.End",
                    "label": "End",
                    "config": {}
                }
            ],
            "edges": [
                {
                    "id": "edge_1",
                    "source_node_id": "start",
                    "target_node_id": "while_1"
                },
                {
                    "id": "edge_2",
                    "source_node_id": "while_1",
                    "source_port_id": "out",
                    "target_node_id": "end"
                }
            ]
        }
        
        # Config creation should succeed (allows draft state)
        config = WorkflowConfig.from_dict(workflow_no_body)
        assert config is not None
        
        # But building the graph should raise ValueError
        builder = WorkflowBuilder(config)
        with pytest.raises(ValueError) as exc_info:
            builder.build_graph()
        
        assert "While node 'while_1'" in str(exc_info.value)
        assert "must have a non-empty body" in str(exc_info.value)

