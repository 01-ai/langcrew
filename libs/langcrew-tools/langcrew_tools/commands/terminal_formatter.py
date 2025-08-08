class TerminalFormatter:
    """终端格式构造工具"""

    # ANSI颜色代码
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
        """创建终端提示符"""
        color_code = self.COLORS.get(color, self.COLORS["green"])
        reset_code = self.COLORS["reset"]
        return f"{color_code}{self.username}@{self.hostname}:{path} ${reset_code}"

    def analyze_path_change(self, command, current_path="~", success=True):
        """分析命令是否会改变路径

        Args:
            command: 执行的命令
            current_path: 当前路径
            success: 命令是否成功执行

        Returns:
            新路径，如果路径没有改变则返回原路径
        """
        if not success:
            return current_path

        # 处理 ~ 路径
        if current_path == "~":
            current_path = f"/home/{self.username}"

        # 分析复合命令（用 && 连接的命令）
        commands = [cmd.strip() for cmd in command.split("&&")]
        new_path = current_path

        for cmd in commands:
            cmd = cmd.strip()

            # 匹配 cd 命令
            if cmd.startswith("cd "):
                target_path = cmd[3:].strip()

                if not target_path or target_path == "~":
                    new_path = f"/home/{self.username}"
                elif target_path.startswith("/"):
                    # 绝对路径
                    new_path = target_path
                elif target_path == "..":
                    # 上级目录
                    new_path = "/".join(new_path.split("/")[:-1]) or "/"
                elif target_path.startswith("../"):
                    # 相对路径向上
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
                    # 相对路径向下
                    if new_path == "/":
                        new_path = f"/{target_path}"
                    else:
                        new_path = f"{new_path}/{target_path}"

        # 转换回 ~ 表示法（如果是用户主目录）
        home_dir = f"/home/{self.username}"
        if new_path == home_dir:
            return "~"
        elif new_path.startswith(home_dir + "/"):
            return "~" + new_path[len(home_dir) :]

        return new_path

    def create_command_execution(
        self, command, current_path="~", new_path=None, output="", success=True
    ):
        """创建命令执行过程

        Args:
            command: 要执行的命令
            current_path: 当前路径
            new_path: 命令执行后的新路径（如果为None则自动分析）
            output: 命令输出
            success: 命令是否成功执行
        """
        result = []

        # 1. 显示命令行
        command_line = f"{self.create_prompt(current_path)} {command}"
        result.append(command_line)

        # 2. 显示命令输出（如果有）
        if output:
            result.append(output)

        # 3. 分析最终路径
        if new_path is None:
            final_path = self.analyze_path_change(command, current_path, success)
        else:
            final_path = new_path

        # 4. 显示命令执行后的提示符
        color = "green" if success else "red"
        final_prompt = self.create_prompt(final_path, color)
        result.append(final_prompt)

        return "\n".join(result)

    def create_terminal_session(self, commands):
        """创建完整的终端会话

        Args:
            commands: 列表，每个元素是字典:
                {
                    'command': '命令',
                    'current_path': '当前路径',
                    'new_path': '新路径（可选）',
                    'output': '输出结果（可选）',
                    'success': True/False（可选，默认True）
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

            # 创建命令执行
            execution = self.create_command_execution(
                command, cmd_current_path, new_path, output, success
            )
            session.append(execution)

            # 更新当前路径
            if new_path is not None:
                current_path = new_path
            else:
                # 自动分析路径变化
                success = cmd_info.get("success", True)
                current_path = self.analyze_path_change(
                    command, cmd_current_path, success
                )

        return "\n".join(session)
