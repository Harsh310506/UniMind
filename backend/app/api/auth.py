"""
Authentication API Routes - Register, Login, Refresh, Me
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    Token,
    TokenRefresh,
    UserResponse,
    MessageResponse,
    UpdateProfile,
    ChangePassword,
)
from app.models.user import User
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user account"""
    # Check if user already exists
    existing_user = await User.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Create new user
    new_user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
    )
    await new_user.insert()

    return UserResponse(
        user_id=new_user.user_id,
        email=new_user.email,
        full_name=new_user.full_name,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login and receive JWT tokens"""
    # Find user by email
    user = await User.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    # Generate tokens
    token_data = {"sub": user.user_id, "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: TokenRefresh):
    """Refresh access token using refresh token"""
    payload = decode_token(token_data.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Expected refresh token.",
        )

    user_id = payload.get("sub")
    user = await User.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Generate new tokens
    new_token_data = {"sub": user.user_id, "email": user.email}
    new_access_token = create_access_token(new_token_data)
    new_refresh_token = create_refresh_token(new_token_data)

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile"""
    return UserResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    data: UpdateProfile,
    current_user: User = Depends(get_current_user),
):
    """Update current user's display name"""
    current_user.full_name = data.full_name
    await current_user.save()
    return UserResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


@router.put("/password", response_model=MessageResponse)
async def change_password(
    data: ChangePassword,
    current_user: User = Depends(get_current_user),
):
    """Change the current user's password (requires old password verification)"""
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.hashed_password = hash_password(data.new_password)
    await current_user.save()
    return MessageResponse(message="Password updated successfully")
