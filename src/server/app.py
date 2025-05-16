# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import base64
import json
import logging
import os
from typing import List, cast, Optional
from uuid import uuid4
from datetime import datetime
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from langchain_core.messages import AIMessageChunk, ToolMessage
from langgraph.types import Command

from src.graph.builder import build_graph_with_memory
from src.podcast.graph.builder import build_graph as build_podcast_graph
from src.ppt.graph.builder import build_graph as build_ppt_graph
from src.prose.graph.builder import build_graph as build_prose_graph
from src.server.chat_request import (
    ChatMessage,
    ChatRequest,
    GeneratePodcastRequest,
    GeneratePPTRequest,
    GenerateProseRequest,
    TTSRequest,
)
from src.server.mcp_request import MCPServerMetadataRequest, MCPServerMetadataResponse
from src.server.mcp_utils import load_mcp_tools
from src.tools import VolcengineTTS
from .routes import auth
from .routes import chat  # 添加chat路由导入
from .database import SessionLocal, get_db
from .models import Chat, Report

logger = logging.getLogger(__name__)
# 设置日志级别为DEBUG以显示详细信息
logger.setLevel(logging.DEBUG)

app = FastAPI(
    title="DeerFlow API",
    description="API for Deer",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# 注册路由
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api", tags=["chat"])  # 修改前缀为/api

graph = build_graph_with_memory()

# 修正异步上下文管理器的实现
@asynccontextmanager
async def get_async_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    # 添加用户认证检查
    if not request.user_id:
        logger.error("User authentication required")
        raise HTTPException(
            status_code=401,
            detail="User authentication required"
        )
        
    thread_id = request.thread_id
    if thread_id == "__default__":
        thread_id = str(uuid4())
        logger.debug(f"Generated new thread_id: {thread_id}")
    
    # 如果有用户ID，保存用户消息到数据库
    if request.user_id and request.messages:
        logger.info(f"Attempting to save user message for user_id: {request.user_id}, thread_id: {thread_id}")
        try:
            async with get_async_db() as db:
                # 保存用户最新的消息
                last_message = request.messages[-1]
                content = (last_message.content if isinstance(last_message.content, str) 
                          else last_message.content[0].text)
                logger.debug(f"Message content: {content[:100]}...")  # 只记录前100个字符
                
                chat = Chat(
                    user_id=request.user_id,
                    thread_id=thread_id,
                    role=last_message.role,
                    content=content
                )
                db.add(chat)
                db.commit()
                logger.info(f"Successfully saved user message to database")
        except Exception as e:
            logger.error(f"Failed to save user message to database: {str(e)}", exc_info=True)
    else:
        logger.warning(f"Skipping database save - user_id: {request.user_id}, has_messages: {bool(request.messages)}")
    
    input_ = {
        "messages": request.model_dump()["messages"],
        "plan_iterations": 0,
        "final_report": "",
        "current_plan": None,
        "observations": [],
        "auto_accepted_plan": request.auto_accepted_plan,
        "enable_background_investigation": request.enable_background_investigation,
        "user_id": request.user_id,  # 添加用户ID
        "thread_id": thread_id,  # 添加线程ID
    }
    
    if not request.auto_accepted_plan and request.interrupt_feedback:
        resume_msg = f"[{request.interrupt_feedback}]"
        # add the last message to the resume message
        if request.messages:
            last_message = request.messages[-1]
            content = (last_message.content if isinstance(last_message.content, str) 
                      else last_message.content[0].text)
            resume_msg += f" {content}"
        input_ = Command(resume=resume_msg)
    
    return StreamingResponse(
        _astream_workflow_generator(
            request.model_dump()["messages"],
            thread_id,
            request.max_plan_iterations,
            request.max_step_num,
            request.auto_accepted_plan,
            request.interrupt_feedback,
            request.mcp_settings,
            request.enable_background_investigation,
            request.user_id,  # 传入用户ID
        ),
        media_type="text/event-stream",
    )


async def _astream_workflow_generator(
    messages: List[ChatMessage],
    thread_id: str,
    max_plan_iterations: int,
    max_step_num: int,
    auto_accepted_plan: bool,
    interrupt_feedback: str,
    mcp_settings: dict,
    enable_background_investigation: bool,
    user_id: Optional[int] = None,  # 添加用户ID参数
):
    logger.debug(f"Starting workflow generator for thread_id: {thread_id}, user_id: {user_id}")
    
    # 用于收集完整消息的变量
    current_message = {
        "content": "",
        "role": "",
        "is_complete": False
    }
    
    input_ = {
        "messages": messages,
        "plan_iterations": 0,
        "final_report": "",
        "current_plan": None,
        "observations": [],
        "auto_accepted_plan": auto_accepted_plan,
        "enable_background_investigation": enable_background_investigation,
        "user_id": user_id,  # 添加用户ID到状态中
        "thread_id": thread_id,  # 添加线程ID到状态中
        "locale": "zh-CN"  # 设置默认语言为中文
    }
    
    if not auto_accepted_plan and interrupt_feedback:
        resume_msg = f"[{interrupt_feedback}]"
        # add the last message to the resume message
        if messages:
            last_message = messages[-1]
            # 处理不同类型的消息内容
            if isinstance(last_message, dict):
                content = last_message.get('content', '')
                if isinstance(content, list) and content:
                    content = content[0].get('text', '')
            else:
                content = (last_message.content if isinstance(last_message.content, str) 
                          else last_message.content[0].text)
            resume_msg += f" {content}"
        input_ = Command(resume=resume_msg)
    
    config = {
        "thread_id": thread_id,
        "max_plan_iterations": max_plan_iterations,
        "max_step_num": max_step_num,
        "mcp_settings": mcp_settings,
        "user_id": user_id,  # 添加用户ID到配置中
    }
    
    async for agent, _, event_data in graph.astream(
        input_,
        config=config,
        stream_mode=["messages", "updates"],
        subgraphs=True,
    ):
        if isinstance(event_data, dict):
            if "__interrupt__" in event_data:
                logger.info(f"Handling interrupt event for thread_id: {thread_id}")
                # 保存中断消息到数据库
                if user_id:
                    try:
                        async with get_async_db() as db:
                            chat = Chat(
                                user_id=user_id,
                                thread_id=thread_id,
                                role="assistant",
                                content=event_data["__interrupt__"][0].value
                            )
                            db.add(chat)
                            db.commit()
                            logger.info(f"Successfully saved interrupt message to database")
                    except Exception as e:
                        logger.error(f"Failed to save interrupt message: {str(e)}", exc_info=True)
                
                yield _make_event(
                    "interrupt",
                    {
                        "thread_id": thread_id,
                        "id": event_data["__interrupt__"][0].ns[0],
                        "role": "assistant",
                        "content": event_data["__interrupt__"][0].value,
                        "finish_reason": "interrupt",
                        "options": [
                            {"text": "修改思路", "value": "edit_plan"},
                            {"text": "开始研究", "value": "accepted"},
                        ],
                    },
                )
            continue
        message_chunk, message_metadata = cast(
            tuple[AIMessageChunk, dict[str, any]], event_data
        )
        
        # 收集消息内容
        if not isinstance(message_chunk, ToolMessage):
            # 从 message_metadata 中获取角色信息，如果没有则默认为 "assistant"
            current_role = "assistant"
            if hasattr(message_chunk, "type") and message_chunk.type == "human":
                current_role = "user"
            
            if current_message["role"] != current_role:
                # 如果是新角色的消息，且之前有未保存的完整消息，先保存之前的消息
                if current_message["content"] and current_message["role"] and user_id:
                    try:
                        async with get_async_db() as db:
                            chat = Chat(
                                user_id=user_id,
                                thread_id=thread_id,
                                role=current_message["role"],
                                content=current_message["content"]
                            )
                            db.add(chat)
                            db.commit()
                            logger.info(f"Successfully saved complete message to database")
                    except Exception as e:
                        logger.error(f"Failed to save complete message: {str(e)}", exc_info=True)
                
                # 重置当前消息
                current_message["content"] = message_chunk.content
                current_message["role"] = current_role
                current_message["is_complete"] = False
            else:
                # 同一角色的消息，继续累积内容
                current_message["content"] += message_chunk.content
            
            # 检查消息是否完成
            if message_chunk.response_metadata and message_chunk.response_metadata.get("finish_reason"):
                current_message["is_complete"] = True
                # 保存完整的消息
                if user_id:
                    try:
                        async with get_async_db() as db:
                            chat = Chat(
                                user_id=user_id,
                                thread_id=thread_id,
                                role=current_message["role"],
                                content=current_message["content"]
                            )
                            db.add(chat)
                            db.commit()
                            logger.info(f"Successfully saved complete message to database")
                            # 重置当前消息
                            current_message["content"] = ""
                            current_message["role"] = ""
                            current_message["is_complete"] = False
                    except Exception as e:
                        logger.error(f"Failed to save complete message: {str(e)}", exc_info=True)
        
        event_stream_message: dict[str, any] = {
            "thread_id": thread_id,
            "agent": agent[0].split(":")[0],
            "id": message_chunk.id,
            "role": "assistant",
            "content": message_chunk.content,
        }
        if message_chunk.response_metadata and message_chunk.response_metadata.get("finish_reason"):
            event_stream_message["finish_reason"] = message_chunk.response_metadata.get(
                "finish_reason"
            )
        if isinstance(message_chunk, ToolMessage):
            # Tool Message - Return the result of the tool call
            event_stream_message["tool_call_id"] = message_chunk.tool_call_id
            yield _make_event("tool_call_result", event_stream_message)
        else:
            # AI Message - Raw message tokens
            if message_chunk.tool_calls:
                # AI Message - Tool Call
                event_stream_message["tool_calls"] = message_chunk.tool_calls
                event_stream_message["tool_call_chunks"] = (
                    message_chunk.tool_call_chunks
                )
                yield _make_event("tool_calls", event_stream_message)
            elif message_chunk.tool_call_chunks:
                # AI Message - Tool Call Chunks
                event_stream_message["tool_call_chunks"] = (
                    message_chunk.tool_call_chunks
                )
                yield _make_event("tool_call_chunks", event_stream_message)
            else:
                # AI Message - Raw message tokens
                yield _make_event("message_chunk", event_stream_message)


def _make_event(event_type: str, data: dict[str, any]):
    if data.get("content") == "":
        data.pop("content")
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using volcengine TTS API."""
    try:
        app_id = os.getenv("VOLCENGINE_TTS_APPID", "")
        if not app_id:
            raise HTTPException(
                status_code=400, detail="VOLCENGINE_TTS_APPID is not set"
            )
        access_token = os.getenv("VOLCENGINE_TTS_ACCESS_TOKEN", "")
        if not access_token:
            raise HTTPException(
                status_code=400, detail="VOLCENGINE_TTS_ACCESS_TOKEN is not set"
            )
        cluster = os.getenv("VOLCENGINE_TTS_CLUSTER", "volcano_tts")
        voice_type = os.getenv("VOLCENGINE_TTS_VOICE_TYPE", "BV700_V2_streaming")

        tts_client = VolcengineTTS(
            appid=app_id,
            access_token=access_token,
            cluster=cluster,
            voice_type=voice_type,
        )
        # Call the TTS API
        result = tts_client.text_to_speech(
            text=request.text[:1024],
            encoding=request.encoding,
            speed_ratio=request.speed_ratio,
            volume_ratio=request.volume_ratio,
            pitch_ratio=request.pitch_ratio,
            text_type=request.text_type,
            with_frontend=request.with_frontend,
            frontend_type=request.frontend_type,
        )

        if not result["success"]:
            raise HTTPException(status_code=500, detail=str(result["error"]))

        # Decode the base64 audio data
        audio_data = base64.b64decode(result["audio_data"])

        # Return the audio file
        return Response(
            content=audio_data,
            media_type=f"audio/{request.encoding}",
            headers={
                "Content-Disposition": (
                    f"attachment; filename=tts_output.{request.encoding}"
                )
            },
        )
    except Exception as e:
        logger.exception(f"Error in TTS endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/podcast/generate")
async def generate_podcast(request: GeneratePodcastRequest):
    try:
        report_content = request.content
        print(report_content)
        workflow = build_podcast_graph()
        final_state = workflow.invoke({"input": report_content})
        audio_bytes = final_state["output"]
        return Response(content=audio_bytes, media_type="audio/mp3")
    except Exception as e:
        logger.exception(f"Error occurred during podcast generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ppt/generate")
async def generate_ppt(request: GeneratePPTRequest):
    try:
        report_content = request.content
        print(report_content)
        workflow = build_ppt_graph()
        final_state = workflow.invoke({"input": report_content})
        generated_file_path = final_state["generated_file_path"]
        
        # 如果提供了用户ID和报告ID，更新报告记录
        if request.user_id and request.report_id:
            with get_db() as db:
                report = db.query(Report).filter(
                    Report.id == request.report_id,
                    Report.user_id == request.user_id
                ).first()
                if report:
                    report.content = report_content
                    report.updated_at = datetime.utcnow()
                    db.commit()
        
        with open(generated_file_path, "rb") as f:
            ppt_bytes = f.read()
        return Response(
            content=ppt_bytes,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as e:
        logger.exception(f"Error occurred during ppt generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/prose/generate")
async def generate_prose(request: GenerateProseRequest):
    try:
        logger.info(f"Generating prose for prompt: {request.prompt}")
        workflow = build_prose_graph()
        
        # 如果提供了用户ID和报告ID，更新报告记录
        if request.user_id and request.report_id:
            with get_db() as db:
                report = db.query(Report).filter(
                    Report.id == request.report_id,
                    Report.user_id == request.user_id
                ).first()
                if report:
                    report.content = request.prompt
                    report.updated_at = datetime.utcnow()
                    db.commit()
        
        events = workflow.astream(
            {
                "content": request.prompt,
                "option": request.option,
                "command": request.command,
            },
            stream_mode="messages",
            subgraphs=True,
        )
        return StreamingResponse(
            (f"data: {event[0].content}\n\n" async for _, event in events),
            media_type="text/event-stream",
        )
    except Exception as e:
        logger.exception(f"Error occurred during prose generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/mcp/server/metadata", response_model=MCPServerMetadataResponse)
async def mcp_server_metadata(request: MCPServerMetadataRequest):
    """Get information about an MCP server."""
    try:
        # Set default timeout with a longer value for this endpoint
        timeout = 300  # Default to 300 seconds for this endpoint

        # Use custom timeout from request if provided
        if request.timeout_seconds is not None:
            timeout = request.timeout_seconds

        # Load tools from the MCP server using the utility function
        tools = await load_mcp_tools(
            server_type=request.transport,
            command=request.command,
            args=request.args,
            url=request.url,
            env=request.env,
            timeout_seconds=timeout,
        )

        # Create the response with tools
        response = MCPServerMetadataResponse(
            transport=request.transport,
            command=request.command,
            args=request.args,
            url=request.url,
            env=request.env,
            tools=tools,
        )

        return response
    except Exception as e:
        if not isinstance(e, HTTPException):
            logger.exception(f"Error in MCP server metadata endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
        raise
