from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()


@router.get("/api/reports")
def list_reports(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), status_filter: Optional[str] = Query(None, alias="status"), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_admin(current_user)
    query = db.query(ContentReport)
    if status_filter:
        query = query.filter(ContentReport.status == status_filter)
    query = query.order_by(ContentReport.created_at.desc())
    return paginate(query, page, per_page, lambda report: report_to_dict(db, report))


@router.post("/api/reports")
def create_report(payload: ReportPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = utc_now()
    report = ContentReport(reporter_id=current_user.id, content_type=payload.content_type, content_id=payload.content_id, reason=payload.reason.strip(), status="open", created_at=now, updated_at=now)
    db.add(report)
    admin = db.query(User).filter(User.role == "admin").order_by(User.id).first()
    create_notification(db, admin.id if admin else None, "New content report", f"{current_user.first_name} reported {payload.content_type} #{payload.content_id}.", "report")
    db.commit()
    db.refresh(report)
    return report_to_dict(db, report)


@router.put("/api/reports/{report_id}")
def update_report_status(report_id: int, payload: Dict[str, str], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_admin(current_user)
    report = db.get(ContentReport, report_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    report.status = payload.get("status", report.status)
    report.updated_at = utc_now()
    db.commit()
    db.refresh(report)
    return report_to_dict(db, report)
