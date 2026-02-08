"""
Companies router - Company CRUD and CNPJ lookup
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import requests

from models.schemas import User, Company, CompanyCreate, CompanyUpdate, UserRole
from services.database import db
from services.auth import get_current_user

router = APIRouter(prefix="/companies", tags=["Companies"])


def can_user_access_company(user: User, company_id: str = None, company_responsavel_ids: List[str] = None) -> bool:
    """
    Verifica se o usuário tem acesso a uma empresa.
    - Super Admin, Master, Admin: acesso a todas
    - Operacional: apenas empresas onde é responsável
    """
    if user.role in [UserRole.SUPER_ADMIN, UserRole.MASTER, UserRole.ADMIN]:
        return True
    
    # Para usuários operacionais, verificar se está na lista de responsáveis
    if company_responsavel_ids:
        return user.id in company_responsavel_ids
    
    # Fallback para company_ids do usuário (compatibilidade)
    if company_id and company_id in user.company_ids:
        return True
    
    return False


@router.post("", response_model=Company)
async def create_company(company_data: CompanyCreate, current_user: User = Depends(get_current_user)):
    """Create a new company"""
    # Apenas Master/Admin podem criar empresas
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.MASTER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar empresas")
    
    existing = await db.companies.find_one({"cnpj": company_data.cnpj})
    if existing:
        raise HTTPException(status_code=400, detail="CNPJ já cadastrado")
    
    company = Company(**company_data.model_dump())
    await db.companies.insert_one(company.model_dump())
    return company


@router.get("", response_model=List[Company])
async def list_companies(
    current_user: User = Depends(get_current_user),
    responsavel_id: Optional[str] = Query(None, description="Filtrar por ID do usuário responsável")
):
    """
    List companies based on user role:
    - Super Admin/Master/Admin: all companies (can filter by responsavel_id)
    - Operacional: only companies where user is responsible
    """
    query = {}
    
    if current_user.role in [UserRole.SUPER_ADMIN, UserRole.MASTER, UserRole.ADMIN]:
        # Admin pode ver todas, mas pode filtrar por responsável
        if responsavel_id:
            query["responsavel_ids"] = responsavel_id
    else:
        # Operacional só vê empresas onde é responsável
        query["$or"] = [
            {"responsavel_ids": current_user.id},
            {"id": {"$in": current_user.company_ids}}  # Fallback para compatibilidade
        ]
    
    companies = await db.companies.find(query, {"_id": 0}).to_list(None)
    return [Company(**c) for c in companies]


@router.get("/responsaveis")
async def list_responsaveis(current_user: User = Depends(get_current_user)):
    """
    List all users who can be responsible for companies (for filtering dropdown).
    Only Master/Admin can access.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.MASTER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    users = await db.users.find(
        {"is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
    ).to_list(None)
    
    return users


@router.get("/{company_id}", response_model=Company)
async def get_company(company_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific company by ID"""
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if not can_user_access_company(current_user, company_id, company.get("responsavel_ids", [])):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return Company(**company)


@router.put("/{company_id}")
async def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an existing company"""
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if not can_user_access_company(current_user, company_id, company.get("responsavel_ids", [])):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_data = {k: v for k, v in company_data.model_dump().items() if v is not None}
    if update_data:
        await db.companies.update_one({"id": company_id}, {"$set": update_data})
    
    updated = await db.companies.find_one({"id": company_id}, {"_id": 0})
    return Company(**updated)


@router.delete("/{company_id}")
async def delete_company(company_id: str, current_user: User = Depends(get_current_user)):
    """Delete a company (only if no documents exist)"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.MASTER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir empresas")
    
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    doc_count = await db.xml_documents.count_documents({"company_id": company_id})
    if doc_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir: empresa possui {doc_count} documento(s). Apague os documentos primeiro."
        )
    
    await db.companies.delete_one({"id": company_id})
    await db.learned_rules.delete_many({"company_id": company_id})
    
    return {"message": "Empresa excluída com sucesso", "company_id": company_id}
