from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()

@router.get("/api/community")
def list_community(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(CommunityPost)
    if category:
        query = query.filter(CommunityPost.category == category)
    query = query.order_by(CommunityPost.created_at.desc())
    return paginate(query, page, per_page, lambda post: post_to_dict(db, post, current_user.id))


@router.get("/api/community/{post_id}")
def get_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    return post_to_dict(db, post, current_user.id)


@router.post("/api/community")
def create_post(
    payload: CommunityPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    now = utc_now()
    post = CommunityPost(
        **dump(payload),
        author_id=current_user.id,
        likes=0,
        comments_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post_to_dict(db, post, current_user.id)


@router.put("/api/community/{post_id}")
def update_post(
    post_id: int,
    payload: CommunityPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post or post.author_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    for key, value in dump(payload).items():
        setattr(post, key, value)
    post.updated_at = utc_now()
    db.commit()
    db.refresh(post)
    return post_to_dict(db, post, current_user.id)


@router.delete("/api/community/{post_id}")
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    post = db.get(CommunityPost, post_id)
    if not post or post.author_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    db.query(CommunityComment).filter(CommunityComment.post_id == post_id).delete()
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}


@router.post("/api/community/{post_id}/like")
def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    post.likes += 1
    post.updated_at = utc_now()
    db.commit()
    db.refresh(post)
    return post_to_dict(db, post, current_user.id)


@router.get("/api/community/{post_id}/comments")
def list_comments(
    post_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    query = db.query(CommunityComment).filter(CommunityComment.post_id == post_id).order_by(CommunityComment.created_at)
    return paginate(query, page, per_page, lambda comment: comment_to_dict(db, comment))


@router.post("/api/community/{post_id}/comments")
def create_comment(
    post_id: int,
    payload: CommentPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    now = utc_now()
    comment = CommunityComment(
        post_id=post_id,
        author_id=current_user.id,
        content=payload.content.strip(),
        created_at=now,
        updated_at=now,
    )
    db.add(comment)
    post.comments_count = db.query(CommunityComment).filter(CommunityComment.post_id == post_id).count() + 1
    post.updated_at = now
    if post.author_id != current_user.id:
        create_notification(
            db,
            post.author_id,
            "New comment on your post",
            f"{current_user.first_name} commented on your community post.",
            "comment",
        )
    db.commit()
    db.refresh(comment)
    return comment_to_dict(db, comment)


@router.put("/api/community/comments/{comment_id}")
def update_comment(
    comment_id: int,
    payload: CommentPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    comment = db.get(CommunityComment, comment_id)
    if not comment or comment.author_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    comment.content = payload.content.strip()
    comment.updated_at = utc_now()
    db.commit()
    db.refresh(comment)
    return comment_to_dict(db, comment)


@router.delete("/api/community/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    comment = db.get(CommunityComment, comment_id)
    if not comment or (comment.author_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    post = db.get(CommunityPost, comment.post_id)
    db.delete(comment)
    db.commit()
    if post:
        post.comments_count = db.query(CommunityComment).filter(CommunityComment.post_id == post.id).count()
        post.updated_at = utc_now()

@router.post("/api/community/{post_id}/react")
def react_to_post(
    post_id: int,
    payload: ReactionPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    reaction = db.query(PostReaction).filter(PostReaction.post_id == post_id, PostReaction.user_id == current_user.id).first()
    if reaction:
        reaction.reaction_type = payload.reaction_type
    else:
        reaction = PostReaction(post_id=post_id, user_id=current_user.id, reaction_type=payload.reaction_type, created_at=utc_now())
        db.add(reaction)
    post.likes = db.query(PostReaction).filter(PostReaction.post_id == post_id).count()
    post.updated_at = utc_now()
    db.commit()
    db.refresh(post)
    return post_to_dict(db, post, current_user.id)


@router.post("/api/community/{post_id}/bookmark")
def bookmark_post(post_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    existing = db.query(PostBookmark).filter(PostBookmark.post_id == post_id, PostBookmark.user_id == current_user.id).first()
    is_bookmarked = True
    if existing:
        db.delete(existing)
        is_bookmarked = False
    else:
        db.add(PostBookmark(post_id=post_id, user_id=current_user.id, created_at=utc_now()))
    db.commit()
    bookmark_count = db.query(PostBookmark).filter(PostBookmark.post_id == post_id).count()
    return {
        "message": "Bookmarked" if is_bookmarked else "Unbookmarked",
        "post_id": post_id,
        "is_bookmarked": is_bookmarked,
        "bookmark_count": bookmark_count,
    }


@router.get("/api/bookmarks")
def list_bookmarks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.query(PostBookmark).filter(PostBookmark.user_id == current_user.id).order_by(PostBookmark.created_at.desc()).all()
    posts = [db.get(CommunityPost, row.post_id) for row in rows]
    return {"items": [post_to_dict(db, post, current_user.id) for post in posts if post]}


@router.post("/api/community/{post_id}/poll-vote")
def vote_poll(
    post_id: int,
    payload: PollVotePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post or post.content_type != "poll":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Poll not found")
    options = post.poll_options or []
    if payload.option_index >= len(options):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid poll option")
    now = utc_now()
    vote = db.query(PollVote).filter(PollVote.post_id == post_id, PollVote.user_id == current_user.id).first()
    if vote:
        vote.option_index = payload.option_index
        vote.updated_at = now
    else:
        db.add(PollVote(post_id=post_id, user_id=current_user.id, option_index=payload.option_index, created_at=now, updated_at=now))
    db.commit()
    totals = db.query(PollVote.option_index, func.count(PollVote.id)).filter(PollVote.post_id == post_id).group_by(PollVote.option_index).all()
    return {"post_id": post_id, "results": {str(option): count for option, count in totals}}


@router.post("/api/community/{post_id}/share")
def share_post(
    post_id: int,
    payload: CommunityPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    source = db.get(CommunityPost, post_id)
    if not source:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    now = utc_now()
    post = CommunityPost(
        **dump(payload),
        shared_post_id=post_id,
        author_id=current_user.id,
        likes=0,
        comments_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post_to_dict(db, post, current_user.id)


@router.put("/api/community/{post_id}/schedule")
def schedule_post(
    post_id: int,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post or post.author_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    post.scheduled_at = payload.get("scheduled_at")
    post.updated_at = utc_now()
    db.commit()
    db.refresh(post)
    return post_to_dict(db, post, current_user.id)


@router.put("/api/community/{post_id}/pin")
def pin_post(
    post_id: int,
    payload: Dict[str, bool],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    if post.community_id:
        require_community_manager(db, current_user, post.community_id)
    elif post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot pin this post")
    post.pinned = bool(payload.get("pinned", True))
    post.updated_at = utc_now()
    db.commit()
    db.refresh(post)

