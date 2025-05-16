from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import logging

from ..database import get_db
from ..models import Chat, Report

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/reports")
def get_reports(user_id: int, db: Session = Depends(get_db)):
    """获取用户的研究报告列表"""
    try:
        reports = db.query(Report).filter(
            Report.user_id == user_id
        ).order_by(Report.updated_at.desc()).all()
        
        return reports
        
    except Exception as e:
        logger.error(f"Failed to get reports: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/thread/{thread_id}")
def get_report_by_thread(thread_id: str, user_id: int, db: Session = Depends(get_db)):
    """根据thread_id获取报告内容和聊天记录"""
    try:
        # 获取报告
        report = db.query(Report).filter(
            Report.thread_id == thread_id,
            Report.user_id == user_id
        ).first()
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
            
        # 获取聊天记录
        messages = db.query(Chat).filter(
            Chat.thread_id == thread_id,
            Chat.user_id == user_id
        ).order_by(Chat.created_at.asc()).all()
        
        # 构建响应
        response = {
            "id": report.id,
            "thread_id": report.thread_id,
            "title": report.title,
            "content": report.content,
            "created_at": report.created_at,
            "updated_at": report.updated_at,
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at
                }
                for msg in messages
            ]
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get report and messages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/reports/{report_id}")
def delete_report(report_id: int, user_id: int, db: Session = Depends(get_db)):
    """删除报告及其相关的聊天记录"""
    try:
        # 获取报告
        report = db.query(Report).filter(
            Report.id == report_id,
            Report.user_id == user_id
        ).first()
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
            
        # 删除相关的聊天记录
        db.query(Chat).filter(
            Chat.thread_id == report.thread_id,
            Chat.user_id == user_id
        ).delete()
        
        # 删除报告
        db.delete(report)
        db.commit()
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 