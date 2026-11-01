from datetime import datetime
from typing import Literal
import re
from pydantic import BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        if len(value) > 320 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Enter your full name")
        return value

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not any(char.isalpha() for char in value) or not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one letter and one number")
        return value


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)


    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        if len(value) > 320 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value


class UserPublic(BaseModel):
    id: str
    full_name: str
    email: str
    role: Literal["student", "admin"]
    created_at: datetime


class MyProfileResponse(UserPublic):
    profile_data: dict = Field(default_factory=dict)


class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    college: str = Field(default="", max_length=120)
    degree: str = Field(default="", max_length=80)
    grad_year: str = Field(default="", max_length=4)
    target_role: str = Field(default="", max_length=120)
    career_goals: str = Field(default="", max_length=500)

    @field_validator("full_name")
    @classmethod
    def clean_profile_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Enter your full name")
        return value

    @field_validator("grad_year")
    @classmethod
    def valid_grad_year(cls, value: str) -> str:
        if value and not re.fullmatch(r"\d{4}", value):
            raise ValueError("Graduation year must be a four-digit year")
        return value


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserPublic


class AdminOverview(BaseModel):
    user_count: int
    student_count: int
    admin_count: int
    interview_count: int
    completed_interview_count: int
    recent_users: list[UserPublic]
