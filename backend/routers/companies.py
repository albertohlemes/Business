"""
Companies router - Company CRUD and CNPJ lookup
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import requests

from models.schemas import User, Company, CompanyCreate, CompanyUpdate
from services.database import db
from services.auth import get_current_user

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.post("", response_model=Company)
async def create_company(company_data: CompanyCreate, current_user: User = Depends(get_current_user)):
    """Create a new company"""
    existing = await db.companies.find_one({"cnpj": company_data.cnpj})
    if existing:
        raise HTTPException(status_code=400, detail="CNPJ já cadastrado")
    
    company = Company(**company_data.model_dump())
    await db.companies.insert_one(company.model_dump())
    return company


@router.get("", response_model=List[Company])
async def list_companies(current_user: User = Depends(get_current_user)):
    """List all companies"""
    if current_user.role == "admin":
        companies = await db.companies.find({}, {"_id": 0}).to_list(None)
    else:
        companies = await db.companies.find(
            {"id": {"$in": current_user.company_ids}},
            {"_id": 0}
        ).to_list(None)
    return [Company(**c) for c in companies]


@router.get("/{company_id}", response_model=Company)
async def get_company(company_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific company by ID"""
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user.role != "admin" and company_id not in current_user.company_ids:
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
    
    if current_user.role != "admin" and company_id not in current_user.company_ids:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_data = {k: v for k, v in company_data.model_dump().items() if v is not None}
    if update_data:
        await db.companies.update_one({"id": company_id}, {"$set": update_data})
    
    updated = await db.companies.find_one({"id": company_id}, {"_id": 0})
    return Company(**updated)


@router.delete("/{company_id}")
async def delete_company(company_id: str, current_user: User = Depends(get_current_user)):
    """Delete a company (only if no documents exist)"""
    if current_user.role != "admin":
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
