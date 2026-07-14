from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=16)
    password: str = Field(min_length=8)


class RegisterRequest(LoginRequest):
    username: str = Field(min_length=2)
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    position: str = Field(min_length=1)
    skills: List[str] = Field(default_factory=list)
    notes: Optional[str] = ""
    gender: str = "prefer_not_to_say"
    marital_status: str = "single"
    job_status: str = "not_specified"
    offers_free_coaching: bool = False
    offers_free_counselling: bool = False
    requests_free_coaching: bool = False
    requests_free_counselling: bool = False
    role: str = "user"
    department_ids: List[int] = Field(min_items=1)
    terms_accepted: bool = False


class ProfileUpdateRequest(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    position: str = Field(min_length=1)
    skills: List[str] = Field(default_factory=list)
    notes: Optional[str] = ""
    gender: str = "prefer_not_to_say"
    marital_status: str = "single"
    job_status: str = "not_specified"
    offers_free_coaching: bool = False
    offers_free_counselling: bool = False
    requests_free_coaching: bool = False
    requests_free_counselling: bool = False
    # User status (e.g. active/inactive). Used by /api/users/me update.
    status: str = "active"
    department_ids: List[int] = Field(min_items=1)
    profile_picture: Optional[str] = ""
    cover_photo: Optional[str] = ""
    bio: Optional[str] = ""
    portfolio_url: Optional[str] = ""
    resume_url: Optional[str] = ""
    contact_info: Dict[str, Any] = Field(default_factory=dict)
    privacy_settings: Dict[str, Any] = Field(default_factory=dict)


class ExtendedProfilePayload(ProfileUpdateRequest):
    work_experience: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[Dict[str, Any]] = Field(default_factory=list)


class PrivacyPayload(BaseModel):
    privacy_settings: Dict[str, Any] = Field(default_factory=dict)


class DepartmentPayload(BaseModel):
    name: str
    description: Optional[str] = ""
    leader_id: Optional[int] = None


class ContactPayload(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    position: str
    skills: List[str] = Field(default_factory=list)
    notes: Optional[str] = ""
    marital_status: str = "single"
    hiring_personality_test: Optional[str] = ""
    department_id: Optional[int] = None
    status: str = "active"


class JobPayload(BaseModel):
    title: str
    description: str
    requirements: List[str] = Field(default_factory=list)
    company: Optional[str] = ""
    location: Optional[str] = ""
    job_type: Optional[str] = ""
    department_id: Optional[int] = None
    status: str = "open"
    closing_date: Optional[str] = None


class CommunityPayload(BaseModel):
    title: Optional[str] = ""
    content: str
    category: str = "General"
    content_type: str = "text"
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    poll_options: List[str] = Field(default_factory=list)
    hashtags: List[str] = Field(default_factory=list)
    mentions: List[int] = Field(default_factory=list)
    scheduled_at: Optional[str] = None
    community_id: Optional[int] = None


class CommentPayload(BaseModel):
    content: str = Field(min_length=1)
    attachments: List[Dict[str, Any]] = Field(default_factory=list)


class MessagePayload(BaseModel):
    recipient_id: Optional[int] = None
    content: str = Field(min_length=1)
    room_id: Optional[int] = None
    message_type: str = "text"
    attachment_url: Optional[str] = ""
    voice_url: Optional[str] = ""


class EventPayload(BaseModel):
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    event_type: str = "Workshop"
    event_date: str = Field(min_length=1)
    location: Optional[str] = ""
    virtual_link: Optional[str] = ""
    status: str = "scheduled"


class RsvpPayload(BaseModel):
    response: str = "going"


class NotificationPayload(BaseModel):
    user_id: int
    title: str = Field(min_length=1)
    message: str = Field(min_length=1)
    notification_type: str = "general"


class ReportPayload(BaseModel):
    content_type: str = Field(min_length=1)
    content_id: int
    reason: str = Field(min_length=1)


class SocialLoginPayload(BaseModel):
    provider: str = Field(min_length=1)
    provider_user_id: str = Field(min_length=1)
    email: EmailStr
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    username: Optional[str] = None
    position: Optional[str] = ""
    department_id: Optional[int] = None


class TwoFactorPayload(BaseModel):
    enabled: bool = True


class CommunityGroupPayload(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = ""
    category: str = "General"
    rules: List[str] = Field(default_factory=list)
    privacy: str = "public"
    status: str = "active"


class MembershipPayload(BaseModel):
    user_id: int
    role: str = "member"
    status: str = "active"


class ConnectionPayload(BaseModel):
    recipient_id: int
    message: Optional[str] = ""


class SupportRequestPayload(BaseModel):
    recipient_id: int
    request_type: str = Field(pattern="^(coaching|counselling)$")
    message: Optional[str] = ""


class ConnectionResponsePayload(BaseModel):
    status: str = Field(pattern="^(accepted|rejected)$")


class EndorsementPayload(BaseModel):
    skill: str = Field(min_length=1)
    note: Optional[str] = ""


class RecommendationPayload(BaseModel):
    content: str = Field(min_length=1)
    relationship: Optional[str] = ""


class ReactionPayload(BaseModel):
    reaction_type: str = "like"


class PollVotePayload(BaseModel):
    option_index: int = Field(ge=0)


class ForumTopicPayload(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = ""
    tags: List[str] = Field(default_factory=list)


class ForumThreadPayload(BaseModel):
    topic_id: int
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)
    tags: List[str] = Field(default_factory=list)


class ForumReplyPayload(BaseModel):
    body: str = Field(min_length=1)
    is_expert_answer: bool = False


class KnowledgePayload(BaseModel):
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)
    item_type: str = "article"
    tags: List[str] = Field(default_factory=list)
    url: Optional[str] = ""
    status: str = "published"


class ChatRoomPayload(BaseModel):
    name: Optional[str] = ""
    participant_ids: List[int] = Field(default_factory=list)
    room_type: str = "group"


class LearningPayload(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = ""
    item_type: str = "course"
    skills: List[str] = Field(default_factory=list)
    provider: Optional[str] = ""
    url: Optional[str] = ""
    status: str = "active"


class MentorshipProfilePayload(BaseModel):
    profile_type: str = "mentor"
    goals: Optional[str] = ""
    expertise: List[str] = Field(default_factory=list)
    availability: Optional[str] = ""
    status: str = "active"


class MentorshipSessionPayload(BaseModel):
    mentor_id: int
    mentee_id: int
    scheduled_at: str = Field(min_length=1)
    topic: str = Field(min_length=1)
    notes: Optional[str] = ""
    progress: Optional[str] = ""
    status: str = "scheduled"


class JobApplicationPayload(BaseModel):
    cover_note: Optional[str] = ""
    resume_url: Optional[str] = ""


class JobAlertPayload(BaseModel):
    query: Optional[str] = ""
    filters: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class NotificationSettingPayload(BaseModel):
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    preferences: Dict[str, Any] = Field(default_factory=dict)


class ReputationPayload(BaseModel):
    user_id: int
    points: int
    reason: str = Field(min_length=1)
    source_type: Optional[str] = ""
    source_id: Optional[int] = None


class BadgePayload(BaseModel):
    user_id: int
    badge_name: str = Field(min_length=1)
    description: Optional[str] = ""


class AdminStatusPayload(BaseModel):
    status: str = Field(min_length=1)


class RolePayload(BaseModel):
    role: str = Field(min_length=1)
