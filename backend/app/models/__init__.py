# Re-export all models from sub-modules so existing code can continue using
# `from app.models import SomeModel` without any changes.
from app.models.core import *  # noqa: F401,F403
from app.models.content import *  # noqa: F401,F403
from app.models.social import *  # noqa: F401,F403
from app.models.forum_learning import *  # noqa: F401,F403
from app.models.career_admin import *  # noqa: F401,F403
