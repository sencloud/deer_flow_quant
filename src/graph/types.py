# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import operator
from typing import Annotated, Optional

from langgraph.graph import MessagesState

from src.prompts.planner_model import Plan


class State(MessagesState):
    """State for the agent system, extends MessagesState with next field."""

    # Runtime Variables
    locale: str = "zh-CN"  # 默认使用中文
    observations: list[str] = []
    plan_iterations: int = 0
    current_plan: Plan | str = None
    final_report: str = ""
    auto_accepted_plan: bool = False
    enable_background_investigation: bool = True
    background_investigation_results: str = None
    
    # User and Thread Information
    user_id: Optional[int] = None
    thread_id: Optional[str] = None
