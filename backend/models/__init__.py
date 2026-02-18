from .schemas import (
    User, UserCreate, UserLogin, Token, UserRole,
    Company, CompanyCreate,
    XMLDocument, 
    LearnedRule, LearnedRuleCreate
)

# Modelos extraídos dos validadores
from .icms_models import (
    RegraICMS,
    RegraICMSCreate,
    RegraICMSUpdate,
    ExcecaoRegra,
    ExcecaoRegraCreate,
    ALIQUOTAS_ICMS_PADRAO,
    REGRAS_ICMS_PADRAO_NCM
)

from .pis_cofins_models import (
    RegraPisCofins,
    RegraPisCofinsCreate,
    RegraPisCofinsUpdate,
    CFOPS_CREDITO_PADRAO,
    CFOPS_SEM_CREDITO,
    CFOPS_SEM_DEBITO
)

__all__ = [
    'User', 'UserCreate', 'UserLogin', 'Token', 'UserRole',
    'Company', 'CompanyCreate',
    'XMLDocument',
    'LearnedRule', 'LearnedRuleCreate',
    # ICMS
    'RegraICMS', 'RegraICMSCreate', 'RegraICMSUpdate',
    'ExcecaoRegra', 'ExcecaoRegraCreate',
    'ALIQUOTAS_ICMS_PADRAO', 'REGRAS_ICMS_PADRAO_NCM',
    # PIS/COFINS
    'RegraPisCofins', 'RegraPisCofinsCreate', 'RegraPisCofinsUpdate',
    'CFOPS_CREDITO_PADRAO', 'CFOPS_SEM_CREDITO', 'CFOPS_SEM_DEBITO',
]
