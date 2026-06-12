from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()


@router.get("/api/departments")
def list_departments(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
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
    query = db.query(Contact).filter(Contact.department_id == department_id).order_by(Contact.name)
    return paginate(query, page, per_page, lambda contact: contact_to_dict(db, contact))


@router.get("/api/contacts")
def list_contacts(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), department_id: Optional[int] = None, status_filter: Optional[str] = Query(None, alias="status"), search: Optional[str] = None, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(Contact)
    if department_id:
        query = query.filter(Contact.department_id == department_id)
    if status_filter:
        query = query.filter(Contact.status == status_filter)
    if search:
        needle = f"%{search.lower()}%"
        query = query.filter(or_(
            Contact.name.ilike(needle),
            Contact.email.ilike(needle),
            Contact.position.ilike(needle),
            Contact.notes.ilike(needle),
            Contact.marital_status.ilike(needle),
            Contact.hiring_personality_test.ilike(needle),
            cast(Contact.skills, String).ilike(needle),
        ))
    query = query.order_by(Contact.created_at.desc())
    return paginate(query, page, per_page, lambda contact: contact_to_dict(db, contact))


@router.get("/api/contacts/{contact_id}")
def get_contact(contact_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    contact = db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    return contact_to_dict(db, contact)


@router.post("/api/contacts")
def create_contact(payload: ContactPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = utc_now()
    contact = Contact(**dump(payload), created_by_id=current_user.id, created_at=now, updated_at=now)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact_to_dict(db, contact)


@router.put("/api/contacts/{contact_id}")
def update_contact(contact_id: int, payload: ContactPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    contact = db.get(Contact, contact_id)
    if not contact or contact.created_by_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    for key, value in dump(payload).items():
        setattr(contact, key, value)
    contact.updated_at = utc_now()
    db.commit()
    db.refresh(contact)
    return contact_to_dict(db, contact)


@router.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, str]:
    contact = db.get(Contact, contact_id)
    if not contact or contact.created_by_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted"}
