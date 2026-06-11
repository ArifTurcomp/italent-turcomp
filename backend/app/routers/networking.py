from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()

@router.get("/api/connections")
def list_connections(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(ConnectionRequest).filter(
        or_(ConnectionRequest.requester_id == current_user.id, ConnectionRequest.recipient_id == current_user.id)
    )
    if status_filter:
        query = query.filter(ConnectionRequest.status == status_filter)
    return {"items": [connection_to_dict(db, item) for item in query.order_by(ConnectionRequest.created_at.desc()).all()]}


@router.post("/api/connections/request")
def send_connection_request(
    payload: ConnectionPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    if payload.recipient_id == current_user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot connect with yourself")
    if not db.get(User, payload.recipient_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipient not found")
    existing = (
        db.query(ConnectionRequest)
        .filter(
            or_(
                (ConnectionRequest.requester_id == current_user.id)
                & (ConnectionRequest.recipient_id == payload.recipient_id),
                (ConnectionRequest.requester_id == payload.recipient_id)
                & (ConnectionRequest.recipient_id == current_user.id),
            )
        )
        .first()
    )
    if existing:
        return connection_to_dict(db, existing)
    now = utc_now()
    connection = ConnectionRequest(
        requester_id=current_user.id,
        recipient_id=payload.recipient_id,
        message=(payload.message or "").strip(),
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(connection)
    create_notification(
        db,
        payload.recipient_id,
        "New connection request",
        f"{current_user.first_name} wants to connect.",
        "connection",
    )
    db.commit()
    db.refresh(connection)
    return connection_to_dict(db, connection)


@router.put("/api/connections/{connection_id}/respond")
def respond_connection_request(
    connection_id: int,
    payload: ConnectionResponsePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    connection = db.get(ConnectionRequest, connection_id)
    if not connection or connection.recipient_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Connection request not found")
    connection.status = payload.status
    connection.updated_at = utc_now()
    create_notification(
        db,
        connection.requester_id,
        "Connection request updated",
        f"{current_user.first_name} {payload.status} your connection request.",
        "connection",
    )
    db.commit()
    db.refresh(connection)
    return connection_to_dict(db, connection)


@router.get("/api/connections/mutual/{user_id}")
def mutual_connections(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    def accepted_partner_ids(owner_id: int) -> set[int]:
        rows = (
            db.query(ConnectionRequest)
            .filter(
                ConnectionRequest.status == "accepted",
                or_(ConnectionRequest.requester_id == owner_id, ConnectionRequest.recipient_id == owner_id),
            )
            .all()
        )
        return {row.recipient_id if row.requester_id == owner_id else row.requester_id for row in rows}

    mutual_ids = accepted_partner_ids(current_user.id) & accepted_partner_ids(user_id)
    users = db.query(User).filter(User.id.in_(mutual_ids)).all() if mutual_ids else []
    return {"items": [public_user(user) for user in users]}

@router.get("/api/discovery/suggestions")
def suggested_connections(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    connected_rows = (
        db.query(ConnectionRequest)
        .filter(
            ConnectionRequest.status == "accepted",
            or_(ConnectionRequest.requester_id == current_user.id, ConnectionRequest.recipient_id == current_user.id),
        )
        .all()
    )
    connected_ids = {row.recipient_id if row.requester_id == current_user.id else row.requester_id for row in connected_rows}
    connected_ids.add(current_user.id)
    query = db.query(User).filter(User.id.notin_(connected_ids))
    if current_user.department_id:
        query = query.order_by((User.department_id == current_user.department_id).desc(), User.id)
    return {"items": [public_user(user) for user in query.limit(10).all()]}


@router.get("/api/discovery/match")
def discovery_match(
    industry: Optional[str] = None,
    interest: Optional[str] = None,
    alumni_department_id: Optional[int] = None,
    nearby: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(User).filter(User.id != current_user.id)
    if alumni_department_id:
        query = query.filter(User.department_id == alumni_department_id)
    if industry:
        query = query.filter(User.position.ilike(f"%{industry}%"))
    if interest:
        query = query.filter(cast(User.skills, String).ilike(f"%{interest}%"))
    if nearby:
        query = query.filter(cast(User.contact_info, String).ilike(f"%{nearby}%"))
    return {"items": [public_user(user) for user in query.limit(20).all()]}

