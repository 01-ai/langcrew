# LangCrew

LangCrew is a high-level multi-agent development framework built on LangGraph, offering out-of-the-box core capabilities to help construct complex agent collaboration systems:

1. **Beyond Traditional Flexible Paradigms**: Provides a simple, highly configurable development experience, featuring powerful built-in mechanisms such as HITL (Human-in-the-Loop), dynamic workflow orchestration, and event-driven processes—empowering stronger agent collaboration.

2. **Full-Stack Support for Productization**: Comes with an accompanying Agent-UI protocol and React component library, enabling the frontend to clearly visualize agent planning, scheduling, execution processes, and tool invocation details. This significantly accelerates the journey from agent development to productization, allowing for rapid delivery to users.

3. **Application Templates for Fast Launch**: Offers a rich variety of ready-to-use templates, enabling rapid prototyping and deployment of multi-agent solutions across a wide range of industries and scenarios.

4. **Integrated Development and Operations Support**: Integrates free SaaS services, seamlessly covering system construction, deep observability, sandbox environments, and deployment resources—simplifying the entire lifecycle from development to operations.

A powerful multi-agent framework built on LangGraph with CrewAI-compatible features.

## Features

- **Agent-based Architecture**: Define agents with specific roles, goals, and backstories
- **Task Management**: Create and execute tasks with clear descriptions and expected outputs
- **Crew Coordination**: Organize agents and tasks into crews for collaborative work
- **LangGraph Integration**: Built on LangGraph for robust workflow management
- **CrewAI Context Mechanism**: Full support for task context passing and dependencies
- **Tool Integration**: Support for various tools and integrations
- **Web Interface**: Optional web-based interface for crew management
- **MCP Support**: Model Context Protocol integration for enhanced capabilities

## Local Development with Docker Compose

To get started with LangCrew for local development, you can use the provided `docker-compose.yml` file to set up the development environment quickly.

### Prerequisites

- Docker and Docker Compose installed on your system
- Git for cloning the repository

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd langcrew
   ```

2. **Start the development environment**:
   ```bash
   docker-compose up -d
   ```

3. **Access the web interface**:
   - Open your browser and navigate to `http://localhost:3600`
   - The web interface will be available for managing agents and crews

4. **Stop the development environment**:
   ```bash
   docker-compose down
   ```

### Development Workflow

- **Hot Reload**: The web application supports hot reloading for development
- **Service Management**: Use `docker-compose logs -f` to monitor service logs
- **Environment Variables**: Modify the `.env` file or docker-compose.yml for configuration changes
- **Database**: The setup includes necessary database services for development

### Troubleshooting

- If you encounter port conflicts, check the `docker-compose.yml` file and modify ports as needed
- Ensure Docker has sufficient resources allocated (recommended: 4GB RAM, 2 CPU cores)
- For persistent data, the setup includes volume mounts for databases and application data