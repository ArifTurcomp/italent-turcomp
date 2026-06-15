from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()


@router.get("/api/departments")
def list_departments(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(Department).order_by(Department.name)
    return paginate(query, page, per_page, lambda department: department_to_dict(department, db))


@router.get("/api/departments/{department_id}")
def get_department(department_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    department = db.get(Department, department_id)
    if not department:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    return department_to_dict(department, db)


@router.post("/api/departments")
def create_department(payload: DepartmentPayload, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = utc_now()
    department = Department(**dump(payload), created_at=now, updated_at=now)
    db.add(department)
    db.commit()
    db.refresh(department)
    return department_to_dict(department, db)


@router.put("/api/departments/{department_id}")
def update_department(department_id: int, payload: DepartmentPayload, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    department = db.get(Department, department_id)
    if not department:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    for key, value in dump(payload).items():
        setattr(department, key, value)
    department.updated_at = utc_now()
    db.commit()
    db.refresh(department)
    return department_to_dict(department, db)


@router.get("/api/departments/{department_id}/members")
def department_members(department_id: int, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(User).filter(User.department_id == department_id).order_by(User.first_name, User.last_name)
    return paginate(query, page, per_page, lambda user: user_directory_to_dict(db, user, _.id))


@router.get("/api/contacts")
def list_contacts(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), department_id: Optional[int] = None, status_filter: Optional[str] = Query(None, alias="status"), search: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(User).filter(User.id != current_user.id)
    if department_id:
        query = query.filter(User.department_id == department_id)
    if status_filter:
        query = query.filter(User.status == status_filter)
    if search:
        needle = f"%{search.lower()}%"
        query = query.filter(or_(
            User.first_name.ilike(needle),
            User.last_name.ilike(needle),
            User.username.ilike(needle),
            User.email.ilike(needle),
            User.position.ilike(needle),
            User.notes.ilike(needle),
            User.marital_status.ilike(needle),
            cast(User.skills, String).ilike(needle),
        ))
    query = query.order_by(User.created_at.desc())
    return paginate(query, page, per_page, lambda user: user_directory_to_dict(db, user, current_user.id))


@router.get("/api/contacts/{contact_id}")
def get_contact(contact_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    user = db.get(User, contact_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
    return user_directory_to_dict(db, user, _.id)


@router.post("/api/contacts")
def create_contact(_: User = Depends(get_current_user)) -> Dict[str, Any]:
    raise HTTPException(status.HTTP_403_FORBIDDEN, "People must register and sign in before they can be added.")


@router.put("/api/contacts/{contact_id}")
def update_contact(contact_id: int, _: User = Depends(get_current_user)) -> Dict[str, Any]:
    raise HTTPException(status.HTTP_403_FORBIDDEN, "People profiles are managed by the registered account owner.")


@router.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: int, _: User = Depends(get_current_user)) -> Dict[str, str]:
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Registered people cannot be removed from the directory by another user.")
