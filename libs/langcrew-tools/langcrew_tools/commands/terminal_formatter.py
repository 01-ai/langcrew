class TerminalFormatter:
    """Terminal format construction tool"""

    # ANSI color codes
    COLORS = {
        "green": "\u001b[32m",
        "red": "\u001b[31m",
        "yellow": "\u001b[33m",
        "blue": "\u001b[34m",
        "magenta": "\u001b[35m",
        "cyan": "\u001b[36m",
        "white": "\u001b[37m",
        "reset": "\u001b[0m",
    }

    def __init__(self, username="user", hostname="sandbox"):
        self.username = username
        self.hostname = hostname

    def create_prompt(self, path="~", color="green"):
        """Create terminal prompt"""
        color_code = self.COLORS.get(color, self.COLORS["green"])
        reset_code = self.COLORS["reset"]
        return f"{color_code}{self.username}@{self.hostname}:{path} ${reset_code}"

    def analyze_path_change(self, command, current_path="~", success=True):
        """Analyze whether the command will change the path

        Args:
            command: The command to execute
            current_path: Current path
            success: Whether the command executed successfully

        Returns:
            New path, returns original path if path doesn't change
        """
        if not success:
            return current_path

        # Handle ~ path
        if current_path == "~":
            current_path = f"/home/{self.username}"

        # Analyze compound commands (commands connected with &&)
        commands = [cmd.strip() for cmd in command.split("&&")]
        new_path = current_path

        for cmd in commands:
            cmd = cmd.strip()

            # Match cd command
            if cmd.startswith("cd "):
                target_path = cmd[3:].strip()

                if not target_path or target_path == "~":
                    new_path = f"/home/{self.username}"
                elif target_path.startswith("/"):
                    # Absolute path
                    new_path = target_path
                elif target_path == "..":
                    # Parent directory
                    new_path = "/".join(new_path.split("/")[:-1]) or "/"
                elif target_path.startswith("../"):
                    # Relative path upward
                    parts = target_path.split("/")
                    temp_path = new_path
                    for part in parts:
                        if part == "..":
                            temp_path = "/".join(temp_path.split("/")[:-1]) or "/"
                        elif part and part != ".":
                            temp_path = (
                                f"{temp_path}/{part}"
                                if temp_path != "/"
                                else f"/{part}"
                            )
                    new_path = temp_path
                else:
                    # Relative path downward
                    if new_path == "/":
                        new_path = f"/{target_path}"
                    else:
                        new_path = f"{new_path}/{target_path}"

        # Convert back to ~ notation (if it's user home directory)
        home_dir = f"/home/{self.username}"
        if new_path == home_dir:
            return "~"
        elif new_path.startswith(home_dir + "/"):
            return "~" + new_path[len(home_dir) :]

        return new_path

    def create_command_execution(
        self, command, current_path="~", new_path=None, output="", success=True
    ):
        """Create command execution process

        Args:
            command: Command to execute
            current_path: Current path
            new_path: New path after command execution (auto-analyze if None)
            output: Command output
            success: Whether the command executed successfully
        """
        result = []

        # 1. Display command line
        command_line = f"{self.create_prompt(current_path)} {command}"
        result.append(command_line)

        # 2. Display command output (if any)
        if output:
            result.append(output)

        # 3. Analyze final path
        if new_path is None:
            final_path = self.analyze_path_change(command, current_path, success)
        else:
            final_path = new_path

        # 4. Display prompt after command execution
        color = "green" if success else "red"
        final_prompt = self.create_prompt(final_path, color)
        result.append(final_prompt)

        return "\n".join(result)

    def create_terminal_session(self, commands):
        """Create complete terminal session

        Args:
            commands: List, each element is a dictionary:
                {
                    'command': 'command',
                    'current_path': 'current path',
                    'new_path': 'new path (optional)',
                    'output': 'output result (optional)',
                    'success': True/False (optional, default True)
                }
        """
        session = []
        current_path = "~"

        for cmd_info in commands:
            command = cmd_info.get("command", "")
            cmd_current_path = cmd_info.get("current_path", current_path)
            new_path = cmd_info.get("new_path")
            output = cmd_info.get("output", "")
            success = cmd_info.get("success", True)

            # Create command execution
            execution = self.create_command_execution(
                command, cmd_current_path, new_path, output, success
            )
            session.append(execution)

            # Update current path
            if new_path is not None:
                current_path = new_path
            else:
                # Auto-analyze path changes
                success = cmd_info.get("success", True)
                current_path = self.analyze_path_change(
                    command, cmd_current_path, success
                )

        return "\n".join(session)
