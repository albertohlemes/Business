"""
Authentication router - Login, Register, Profile endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
import requests

from models.schemas import User, UserCreate, UserUpdate, UserLogin, Token, UserRole, UserPreferencesUpdate
from services.database import db
from services.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def check_master_or_super_admin(user: User):
    """Verifica se o usuário tem permissão de Master ou Super Admin"""
    if user.role not in [UserRole.SUPER_ADMIN, UserRole.MASTER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas Master ou Admin podem realizar esta ação.")


@router.post("/register", response_model=User)
async def register(user_data: UserCreate):
    """Register a new user"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Map legacy roles to new roles
    role = user_data.role
    if role == "admin":
        role = UserRole.MASTER
    elif role == "client":
        role = UserRole.OPERACIONAL
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=role,
        company_ids=user_data.company_ids,
        preferences={"menu_mode": "vertical"}
    )
    user_dict = user.model_dump()
    user_dict["password_hash"] = get_password_hash(user_data.password)
    
    await db.users.insert_one(user_dict)
    return user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Authenticate user and return JWT token"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Usuário desativado. Contate o administrador.")
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_obj)


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user


@router.put("/me/preferences")
async def update_preferences(
    prefs: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user preferences (menu mode, etc.)"""
    update_data = {}
    if prefs.menu_mode:
        update_data["preferences.menu_mode"] = prefs.menu_mode
    
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
    
    return {"status": "ok", "preferences": {"menu_mode": prefs.menu_mode or current_user.preferences.get("menu_mode", "vertical")}}


# ========== GESTÃO DE USUÁRIOS (APENAS MASTER/ADMIN) ==========

@router.get("/users")
async def list_users(
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """List all users (only for Master/Admin)"""
    check_master_or_super_admin(current_user)
    
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    total = await db.users.count_documents({})
    
    return {"users": users, "total": total}


@router.post("/users", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new user (only for Master/Admin)"""
    check_master_or_super_admin(current_user)
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        company_ids=user_data.company_ids,
        created_by=current_user.id,
        preferences={"menu_mode": "vertical"}
    )
    user_dict = user.model_dump()
    user_dict["password_hash"] = get_password_hash(user_data.password)
    
    await db.users.insert_one(user_dict)
    return user


@router.get("/users/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific user (only for Master/Admin)"""
    check_master_or_super_admin(current_user)
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return User(**user)


@router.put("/users/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a user (only for Master/Admin)"""
    check_master_or_super_admin(current_user)
    
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Prevent changing Super Admin role by non-Super Admin
    if existing.get("role") == UserRole.SUPER_ADMIN and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Apenas Super Admin pode modificar outro Super Admin")
    
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return User(**updated)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Deactivate a user (only for Master/Admin)"""
    check_master_or_super_admin(current_user)
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Você não pode desativar a si mesmo")
    
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Prevent deactivating Super Admin by non-Super Admin
    if existing.get("role") == UserRole.SUPER_ADMIN and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Apenas Super Admin pode desativar outro Super Admin")
    
    # Soft delete - just deactivate
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"status": "ok", "message": "Usuário desativado com sucesso"}


@router.post("/users/{user_id}/reactivate")
async def reactivate_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Reactivate a deactivated user (only for Master/Admin)"""
    check_master_or_super_admin(current_user)
    
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"status": "ok", "message": "Usuário reativado com sucesso"}
