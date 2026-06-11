from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()

@router.get("/api/jobs")
def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    department_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(Job)
    if department_id:
        query = query.filter(Job.department_id == department_id)
    if status_filter:
        query = query.filter(Job.status == status_filter)
    query = query.order_by(Job.created_at.desc())
    return paginate(query, page, per_page, lambda job: job_to_dict(db, job))


@router.get("/api/jobs/{job_id}")
def get_job(
    job_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    return job_to_dict(db, job)


@router.post("/api/jobs")
def create_job(
    payload: JobPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    now = utc_now()
    job = Job(**dump(payload), created_by_id=current_user.id, posted_date=now, created_at=now, updated_at=now)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job_to_dict(db, job)


@router.put("/api/jobs/{job_id}")
def update_job(
    job_id: int,
    payload: JobPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    job = db.get(Job, job_id)
    if not job or job.created_by_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    for key, value in dump(payload).items():
        setattr(job, key, value)
    job.updated_at = utc_now()
    db.commit()
    db.refresh(job)
    return job_to_dict(db, job)


@router.delete("/api/jobs/{job_id}")
def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    job = db.get(Job, job_id)
    if not job or job.created_by_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}

@router.post("/api/jobs/{job_id}/apply")
def apply_job(
    job_id: int,
    payload: JobApplicationPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    if not db.get(Job, job_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    now = utc_now()
    application = db.query(JobApplication).filter(JobApplication.job_id == job_id, JobApplication.applicant_id == current_user.id).first()
    if application:
        application.cover_note = payload.cover_note
        application.resume_url = payload.resume_url or current_user.resume_url
        application.updated_at = now
    else:
        application = JobApplication(
            job_id=job_id,
            applicant_id=current_user.id,
            cover_note=payload.cover_note,
            resume_url=payload.resume_url or current_user.resume_url,
            created_at=now,
            updated_at=now,
        )
        db.add(application)
    db.commit()
    db.refresh(application)
    return application_to_dict(db, application)


@router.get("/api/jobs/{job_id}/applications")
def list_job_applications(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    job = db.get(Job, job_id)
    if not job or (job.created_by_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    rows = db.query(JobApplication).filter(JobApplication.job_id == job_id).order_by(JobApplication.created_at.desc()).all()
    return {"items": [application_to_dict(db, row) for row in rows]}


@router.post("/api/jobs/{job_id}/save")
def save_job(job_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, str]:
    if not db.get(Job, job_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    existing = db.query(SavedJob).filter(SavedJob.job_id == job_id, SavedJob.user_id == current_user.id).first()
    if not existing:
        db.add(SavedJob(job_id=job_id, user_id=current_user.id, created_at=utc_now()))
        db.commit()
    return {"message": "Job saved"}


@router.get("/api/career/saved-jobs")
def list_saved_jobs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.query(SavedJob).filter(SavedJob.user_id == current_user.id).order_by(SavedJob.created_at.desc()).all()
    jobs = [db.get(Job, row.job_id) for row in rows]
    return {"items": [job_to_dict(db, job) for job in jobs if job]}


@router.get("/api/career/job-recommendations")
def job_recommendations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(Job).filter(Job.status == "open")
    skill_terms = current_user.skills or []
    if skill_terms:
        filters = [cast(Job.requirements, String).ilike(f"%{skill}%") for skill in skill_terms]
        query = query.filter(or_(*filters))
    return {"items": [job_to_dict(db, job) for job in query.order_by(Job.created_at.desc()).limit(20).all()]}


@router.get("/api/career/job-alerts")
def list_job_alerts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.query(JobAlert).filter(JobAlert.user_id == current_user.id).order_by(JobAlert.created_at.desc()).all()
    return {"items": [job_alert_to_dict(row) for row in rows]}


@router.post("/api/career/job-alerts")
def create_job_alert(
    payload: JobAlertPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    now = utc_now()
    alert = JobAlert(user_id=current_user.id, **dump(payload), created_at=now, updated_at=now)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return job_alert_to_dict(alert)


@router.get("/api/career/tools")
def career_tools(_: User = Depends(get_current_user)) -> Dict[str, Any]:
    return {
        "items": [
            {"key": "resume_builder", "name": "Resume Builder", "status": "available"},
            {"key": "portfolio_showcase", "name": "Portfolio Showcase", "status": "available"},
            {"key": "interview_preparation", "name": "Interview Preparation", "status": "available"},
            {"key": "career_coaching", "name": "Career Coaching", "status": "available"},
        ]
    }

