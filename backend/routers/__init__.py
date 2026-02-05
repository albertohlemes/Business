"""
Routers package - API endpoints organized by domain
"""
from .auth import router as auth_router
from .companies import router as companies_router
from .cnpj import router as cnpj_router

__all__ = ['auth_router', 'companies_router', 'cnpj_router']
