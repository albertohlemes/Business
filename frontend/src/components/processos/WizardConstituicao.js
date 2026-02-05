import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { 
    Building2, ChevronLeft, ChevronRight, Upload, X, RefreshCw, CheckCircle2,
    Users, MapPin, Briefcase, DollarSign, FileText, Plus, Trash2, FileDown, Copy,
    User, Percent, Sparkles, Search
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Estados brasileiros
const ESTADOS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
    'SP', 'SE', 'TO'
];

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];
const REGIMES_CASAMENTO = ['Comunhão Parcial de Bens', 'Comunhão Universal de Bens', 'Separação Total de Bens', 'Participação Final nos Aquestos'];

// Banco de CNAEs mais comuns
const BANCO_CNAES = [
    // COMÉRCIO VAREJISTA
    { codigo: '47.11-3-01', descricao: 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - hipermercados' },
    { codigo: '47.11-3-02', descricao: 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - supermercados' },
    { codigo: '47.12-1-00', descricao: 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns' },
    { codigo: '47.21-1-02', descricao: 'Padaria e confeitaria com predominância de revenda' },
    { codigo: '47.21-1-03', descricao: 'Comércio varejista de laticínios e frios' },
    { codigo: '47.22-9-01', descricao: 'Comércio varejista de carnes - açougues' },
    { codigo: '47.23-7-00', descricao: 'Comércio varejista de bebidas' },
    { codigo: '47.24-5-00', descricao: 'Comércio varejista de hortifrutigranjeiros' },
    { codigo: '47.29-6-99', descricao: 'Comércio varejista de produtos alimentícios em geral ou especializado em produtos alimentícios não especificados anteriormente' },
    { codigo: '47.41-5-00', descricao: 'Comércio varejista de tintas e materiais para pintura' },
    { codigo: '47.42-3-00', descricao: 'Comércio varejista de material elétrico' },
    { codigo: '47.43-1-00', descricao: 'Comércio varejista de vidros' },
    { codigo: '47.44-0-01', descricao: 'Comércio varejista de ferragens e ferramentas' },
    { codigo: '47.44-0-02', descricao: 'Comércio varejista de madeira e artefatos' },
    { codigo: '47.44-0-03', descricao: 'Comércio varejista de materiais hidráulicos' },
    { codigo: '47.44-0-04', descricao: 'Comércio varejista de cal, areia, pedra britada, tijolos e telhas' },
    { codigo: '47.44-0-05', descricao: 'Comércio varejista de materiais de construção não especificados anteriormente' },
    { codigo: '47.44-0-99', descricao: 'Comércio varejista de materiais de construção em geral' },
    { codigo: '47.51-2-01', descricao: 'Comércio varejista especializado de equipamentos e suprimentos de informática' },
    { codigo: '47.52-1-00', descricao: 'Comércio varejista especializado de equipamentos de telefonia e comunicação' },
    { codigo: '47.53-9-00', descricao: 'Comércio varejista especializado de eletrodomésticos e equipamentos de áudio e vídeo' },
    { codigo: '47.54-7-01', descricao: 'Comércio varejista de móveis' },
    { codigo: '47.54-7-02', descricao: 'Comércio varejista de artigos de colchoaria' },
    { codigo: '47.54-7-03', descricao: 'Comércio varejista de artigos de iluminação' },
    { codigo: '47.55-5-01', descricao: 'Comércio varejista de tecidos' },
    { codigo: '47.55-5-02', descricao: 'Comercio varejista de artigos de armarinho' },
    { codigo: '47.55-5-03', descricao: 'Comercio varejista de artigos de cama, mesa e banho' },
    { codigo: '47.56-3-00', descricao: 'Comércio varejista especializado de instrumentos musicais e acessórios' },
    { codigo: '47.57-1-00', descricao: 'Comércio varejista especializado de peças e acessórios para aparelhos eletroeletrônicos para uso doméstico' },
    { codigo: '47.59-8-01', descricao: 'Comércio varejista de artigos de tapeçaria, cortinas e persianas' },
    { codigo: '47.59-8-99', descricao: 'Comércio varejista de outros artigos de uso doméstico não especificados anteriormente' },
    { codigo: '47.61-0-01', descricao: 'Comércio varejista de livros' },
    { codigo: '47.61-0-02', descricao: 'Comércio varejista de jornais e revistas' },
    { codigo: '47.61-0-03', descricao: 'Comércio varejista de artigos de papelaria' },
    { codigo: '47.62-8-00', descricao: 'Comércio varejista de discos, CDs, DVDs e fitas' },
    { codigo: '47.63-6-01', descricao: 'Comércio varejista de brinquedos e artigos recreativos' },
    { codigo: '47.63-6-02', descricao: 'Comércio varejista de artigos esportivos' },
    { codigo: '47.63-6-03', descricao: 'Comércio varejista de bicicletas e triciclos; peças e acessórios' },
    { codigo: '47.63-6-04', descricao: 'Comércio varejista de artigos de caça, pesca e camping' },
    { codigo: '47.63-6-05', descricao: 'Comércio varejista de embarcações e outros veículos recreativos; peças e acessórios' },
    { codigo: '47.71-7-01', descricao: 'Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas' },
    { codigo: '47.71-7-02', descricao: 'Comércio varejista de produtos farmacêuticos, com manipulação de fórmulas' },
    { codigo: '47.71-7-03', descricao: 'Comércio varejista de produtos farmacêuticos homeopáticos' },
    { codigo: '47.72-5-00', descricao: 'Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal' },
    { codigo: '47.73-3-00', descricao: 'Comércio varejista de artigos médicos e ortopédicos' },
    { codigo: '47.74-1-00', descricao: 'Comércio varejista de artigos de óptica' },
    { codigo: '47.81-4-00', descricao: 'Comércio varejista de artigos do vestuário e acessórios' },
    { codigo: '47.82-2-01', descricao: 'Comércio varejista de calçados' },
    { codigo: '47.82-2-02', descricao: 'Comércio varejista de artigos de viagem' },
    { codigo: '47.83-1-01', descricao: 'Comércio varejista de artigos de joalheria' },
    { codigo: '47.83-1-02', descricao: 'Comércio varejista de artigos de relojoaria' },
    { codigo: '47.84-9-00', descricao: 'Comércio varejista de gás liquefeito de petróleo (GLP)' },
    { codigo: '47.85-7-01', descricao: 'Comércio varejista de antiguidades' },
    { codigo: '47.85-7-99', descricao: 'Comércio varejista de outros artigos usados' },
    { codigo: '47.89-0-01', descricao: 'Comércio varejista de suvenires, bijuterias e artesanatos' },
    { codigo: '47.89-0-02', descricao: 'Comércio varejista de plantas e flores naturais' },
    { codigo: '47.89-0-03', descricao: 'Comércio varejista de objetos de arte' },
    { codigo: '47.89-0-04', descricao: 'Comércio varejista de animais vivos e de artigos e alimentos para animais de estimação' },
    { codigo: '47.89-0-05', descricao: 'Comércio varejista de produtos saneantes domissanitários' },
    { codigo: '47.89-0-06', descricao: 'Comércio varejista de fogos de artifício e artigos pirotécnicos' },
    { codigo: '47.89-0-07', descricao: 'Comércio varejista de equipamentos para escritório' },
    { codigo: '47.89-0-08', descricao: 'Comércio varejista de artigos fotográficos e para filmagem' },
    { codigo: '47.89-0-09', descricao: 'Comércio varejista de armas e munições' },
    { codigo: '47.89-0-99', descricao: 'Comércio varejista de outros produtos não especificados anteriormente' },
    
    // COMÉRCIO ATACADISTA
    { codigo: '46.11-7-00', descricao: 'Representantes comerciais e agentes do comércio de matérias-primas agrícolas e animais vivos' },
    { codigo: '46.12-5-00', descricao: 'Representantes comerciais e agentes do comércio de combustíveis, minerais, produtos siderúrgicos e químicos' },
    { codigo: '46.13-3-00', descricao: 'Representantes comerciais e agentes do comércio de madeira, material de construção e ferragens' },
    { codigo: '46.14-1-00', descricao: 'Representantes comerciais e agentes do comércio de máquinas, equipamentos, embarcações e aeronaves' },
    { codigo: '46.15-0-00', descricao: 'Representantes comerciais e agentes do comércio de eletrodomésticos, móveis e artigos de uso doméstico' },
    { codigo: '46.16-8-00', descricao: 'Representantes comerciais e agentes do comércio de têxteis, vestuário, calçados e artigos de viagem' },
    { codigo: '46.17-6-00', descricao: 'Representantes comerciais e agentes do comércio de produtos alimentícios, bebidas e fumo' },
    { codigo: '46.18-4-01', descricao: 'Representantes comerciais e agentes do comércio de medicamentos, cosméticos e produtos de perfumaria' },
    { codigo: '46.18-4-02', descricao: 'Representantes comerciais e agentes do comércio de instrumentos e materiais odonto-médico-hospitalares' },
    { codigo: '46.18-4-03', descricao: 'Representantes comerciais e agentes do comércio de jornais, revistas e outras publicações' },
    { codigo: '46.18-4-99', descricao: 'Outros representantes comerciais e agentes do comércio especializado em produtos não especificados anteriormente' },
    { codigo: '46.19-2-00', descricao: 'Representantes comerciais e agentes do comércio de mercadorias em geral não especializado' },
    { codigo: '46.37-1-06', descricao: 'Comércio atacadista de sorvetes' },
    { codigo: '46.37-1-07', descricao: 'Comércio atacadista de chocolates, confeitos, balas, bombons e semelhantes' },
    { codigo: '46.46-0-01', descricao: 'Comércio atacadista de cosméticos e produtos de perfumaria' },
    { codigo: '46.46-0-02', descricao: 'Comércio atacadista de produtos de higiene pessoal' },
    { codigo: '46.47-8-01', descricao: 'Comércio atacadista de artigos de escritório e de papelaria' },
    { codigo: '46.49-4-01', descricao: 'Comércio atacadista de equipamentos elétricos de uso pessoal e doméstico' },
    { codigo: '46.49-4-02', descricao: 'Comércio atacadista de aparelhos eletrônicos de uso pessoal e doméstico' },
    { codigo: '46.51-6-01', descricao: 'Comércio atacadista de equipamentos de informática' },
    { codigo: '46.51-6-02', descricao: 'Comércio atacadista de suprimentos para informática' },
    { codigo: '46.52-4-00', descricao: 'Comércio atacadista de componentes eletrônicos e equipamentos de telefonia e comunicação' },
    { codigo: '46.91-5-00', descricao: 'Comércio atacadista de mercadorias em geral, com predominância de produtos alimentícios' },
    { codigo: '46.93-1-00', descricao: 'Comércio atacadista de mercadorias em geral, sem predominância de alimentos ou de insumos agropecuários' },
    
    // ALIMENTAÇÃO
    { codigo: '56.11-2-01', descricao: 'Restaurantes e similares' },
    { codigo: '56.11-2-02', descricao: 'Bares e outros estabelecimentos especializados em servir bebidas' },
    { codigo: '56.11-2-03', descricao: 'Lanchonetes, casas de chá, de sucos e similares' },
    { codigo: '56.11-2-04', descricao: 'Bares e outros estabelecimentos especializados em servir bebidas, sem entretenimento' },
    { codigo: '56.11-2-05', descricao: 'Bares e outros estabelecimentos especializados em servir bebidas, com entretenimento' },
    { codigo: '56.12-1-00', descricao: 'Serviços ambulantes de alimentação' },
    { codigo: '56.20-1-01', descricao: 'Fornecimento de alimentos preparados preponderantemente para empresas' },
    { codigo: '56.20-1-02', descricao: 'Serviços de alimentação para eventos e recepções - bufê' },
    { codigo: '56.20-1-03', descricao: 'Cantinas - serviços de alimentação privativos' },
    { codigo: '56.20-1-04', descricao: 'Fornecimento de alimentos preparados preponderantemente para consumo domiciliar' },
    
    // TECNOLOGIA E INFORMÁTICA
    { codigo: '62.01-5-01', descricao: 'Desenvolvimento de programas de computador sob encomenda' },
    { codigo: '62.01-5-02', descricao: 'Web design' },
    { codigo: '62.02-3-00', descricao: 'Desenvolvimento e licenciamento de programas de computador customizáveis' },
    { codigo: '62.03-1-00', descricao: 'Desenvolvimento e licenciamento de programas de computador não-customizáveis' },
    { codigo: '62.04-0-00', descricao: 'Consultoria em tecnologia da informação' },
    { codigo: '62.09-1-00', descricao: 'Suporte técnico, manutenção e outros serviços em tecnologia da informação' },
    { codigo: '63.11-9-00', descricao: 'Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet' },
    { codigo: '63.19-4-00', descricao: 'Portais, provedores de conteúdo e outros serviços de informação na internet' },
    { codigo: '95.11-8-00', descricao: 'Reparação e manutenção de computadores e de equipamentos periféricos' },
    
    // SERVIÇOS PROFISSIONAIS
    { codigo: '69.11-7-01', descricao: 'Serviços advocatícios' },
    { codigo: '69.11-7-02', descricao: 'Atividades auxiliares da justiça' },
    { codigo: '69.11-7-03', descricao: 'Agente de propriedade industrial' },
    { codigo: '69.12-5-00', descricao: 'Cartórios' },
    { codigo: '69.20-6-01', descricao: 'Atividades de contabilidade' },
    { codigo: '69.20-6-02', descricao: 'Atividades de consultoria e auditoria contábil e tributária' },
    { codigo: '70.20-4-00', descricao: 'Atividades de consultoria em gestão empresarial, exceto consultoria técnica específica' },
    { codigo: '70.21-2-00', descricao: 'Relações públicas' },
    { codigo: '70.22-6-00', descricao: 'Outras atividades de consultoria em gestão empresarial' },
    { codigo: '71.11-1-00', descricao: 'Serviços de arquitetura' },
    { codigo: '71.12-0-00', descricao: 'Serviços de engenharia' },
    { codigo: '71.19-7-01', descricao: 'Serviços de cartografia, topografia e geodésia' },
    { codigo: '71.19-7-02', descricao: 'Atividades de estudos geológicos' },
    { codigo: '71.19-7-03', descricao: 'Serviços de desenho técnico relacionados à arquitetura e engenharia' },
    { codigo: '71.19-7-04', descricao: 'Serviços de perícia técnica relacionados à segurança do trabalho' },
    { codigo: '71.19-7-99', descricao: 'Atividades técnicas relacionadas à engenharia e arquitetura não especificadas anteriormente' },
    { codigo: '71.20-1-00', descricao: 'Testes e análises técnicas' },
    
    // PUBLICIDADE E MARKETING
    { codigo: '73.11-4-00', descricao: 'Agências de publicidade' },
    { codigo: '73.12-2-00', descricao: 'Agenciamento de espaços para publicidade, exceto em veículos de comunicação' },
    { codigo: '73.19-0-01', descricao: 'Criação de estandes para feiras e exposições' },
    { codigo: '73.19-0-02', descricao: 'Promoção de vendas' },
    { codigo: '73.19-0-03', descricao: 'Marketing direto' },
    { codigo: '73.19-0-04', descricao: 'Consultoria em publicidade' },
    { codigo: '73.19-0-99', descricao: 'Outras atividades de publicidade não especificadas anteriormente' },
    { codigo: '73.20-3-00', descricao: 'Pesquisas de mercado e de opinião pública' },
    
    // DESIGN E FOTOGRAFIA
    { codigo: '74.10-2-01', descricao: 'Design' },
    { codigo: '74.10-2-02', descricao: 'Design de interiores' },
    { codigo: '74.10-2-03', descricao: 'Design de produto' },
    { codigo: '74.20-0-01', descricao: 'Atividades de produção de fotografias, exceto aérea e submarina' },
    { codigo: '74.20-0-02', descricao: 'Atividades de produção de fotografias aéreas e submarinas' },
    { codigo: '74.20-0-03', descricao: 'Laboratórios fotográficos' },
    { codigo: '74.20-0-04', descricao: 'Filmagem de festas e eventos' },
    { codigo: '74.20-0-05', descricao: 'Serviços de microfilmagem' },
    
    // SAÚDE
    { codigo: '86.10-1-01', descricao: 'Atividades de atendimento hospitalar, exceto pronto-socorro e unidades para atendimento a urgências' },
    { codigo: '86.10-1-02', descricao: 'Atividades de atendimento em pronto-socorro e unidades hospitalares para atendimento a urgências' },
    { codigo: '86.21-6-01', descricao: 'UTI móvel' },
    { codigo: '86.21-6-02', descricao: 'Serviços móveis de atendimento a urgências, exceto por UTI móvel' },
    { codigo: '86.22-4-00', descricao: 'Serviços de remoção de pacientes, exceto os serviços móveis de atendimento a urgências' },
    { codigo: '86.30-5-01', descricao: 'Atividade médica ambulatorial com recursos para realização de procedimentos cirúrgicos' },
    { codigo: '86.30-5-02', descricao: 'Atividade médica ambulatorial com recursos para realização de exames complementares' },
    { codigo: '86.30-5-03', descricao: 'Atividade médica ambulatorial restrita a consultas' },
    { codigo: '86.30-5-04', descricao: 'Atividade odontológica' },
    { codigo: '86.30-5-06', descricao: 'Serviços de vacinação e imunização humana' },
    { codigo: '86.30-5-07', descricao: 'Atividades de reprodução humana assistida' },
    { codigo: '86.30-5-99', descricao: 'Atividades de atenção ambulatorial não especificadas anteriormente' },
    { codigo: '86.40-2-01', descricao: 'Laboratórios de anatomia patológica e citológica' },
    { codigo: '86.40-2-02', descricao: 'Laboratórios clínicos' },
    { codigo: '86.40-2-03', descricao: 'Serviços de diálise e nefrologia' },
    { codigo: '86.40-2-04', descricao: 'Serviços de tomografia' },
    { codigo: '86.40-2-05', descricao: 'Serviços de diagnóstico por imagem com uso de radiação ionizante, exceto tomografia' },
    { codigo: '86.40-2-06', descricao: 'Serviços de ressonância magnética' },
    { codigo: '86.40-2-07', descricao: 'Serviços de diagnóstico por imagem sem uso de radiação ionizante, exceto ressonância magnética' },
    { codigo: '86.40-2-08', descricao: 'Serviços de diagnóstico por registro gráfico - ECG, EEG e outros exames análogos' },
    { codigo: '86.40-2-09', descricao: 'Serviços de diagnóstico por métodos ópticos - endoscopia e outros exames análogos' },
    { codigo: '86.40-2-10', descricao: 'Serviços de quimioterapia' },
    { codigo: '86.40-2-11', descricao: 'Serviços de radioterapia' },
    { codigo: '86.40-2-12', descricao: 'Serviços de hemoterapia' },
    { codigo: '86.40-2-13', descricao: 'Serviços de litotripsia' },
    { codigo: '86.40-2-14', descricao: 'Serviços de bancos de células e tecidos humanos' },
    { codigo: '86.40-2-99', descricao: 'Atividades de serviços de complementação diagnóstica e terapêutica não especificadas anteriormente' },
    { codigo: '86.50-0-01', descricao: 'Atividades de enfermagem' },
    { codigo: '86.50-0-02', descricao: 'Atividades de profissionais da nutrição' },
    { codigo: '86.50-0-03', descricao: 'Atividades de psicologia e psicanálise' },
    { codigo: '86.50-0-04', descricao: 'Atividades de fisioterapia' },
    { codigo: '86.50-0-05', descricao: 'Atividades de terapia ocupacional' },
    { codigo: '86.50-0-06', descricao: 'Atividades de fonoaudiologia' },
    { codigo: '86.50-0-07', descricao: 'Atividades de terapia de nutrição enteral e parenteral' },
    { codigo: '86.50-0-99', descricao: 'Atividades de profissionais da área de saúde não especificadas anteriormente' },
    { codigo: '86.60-7-00', descricao: 'Atividades de apoio à gestão de saúde' },
    
    // CONSTRUÇÃO CIVIL
    { codigo: '41.10-7-00', descricao: 'Incorporação de empreendimentos imobiliários' },
    { codigo: '41.20-4-00', descricao: 'Construção de edifícios' },
    { codigo: '42.11-1-01', descricao: 'Construção de rodovias e ferrovias' },
    { codigo: '42.11-1-02', descricao: 'Pintura para sinalização em pistas rodoviárias e aeroportos' },
    { codigo: '42.12-0-00', descricao: 'Construção de obras de arte especiais' },
    { codigo: '42.13-8-00', descricao: 'Obras de urbanização - ruas, praças e calçadas' },
    { codigo: '42.21-9-01', descricao: 'Construção de barragens e represas para geração de energia elétrica' },
    { codigo: '42.21-9-02', descricao: 'Construção de estações e redes de distribuição de energia elétrica' },
    { codigo: '42.21-9-03', descricao: 'Manutenção de redes de distribuição de energia elétrica' },
    { codigo: '42.21-9-04', descricao: 'Construção de estações e redes de telecomunicações' },
    { codigo: '42.21-9-05', descricao: 'Manutenção de estações e redes de telecomunicações' },
    { codigo: '42.22-7-01', descricao: 'Construção de redes de abastecimento de água, coleta de esgoto e construções correlatas, exceto obras de irrigação' },
    { codigo: '42.22-7-02', descricao: 'Obras de irrigação' },
    { codigo: '42.23-5-00', descricao: 'Construção de redes de transportes por dutos, exceto para água e esgoto' },
    { codigo: '42.91-0-00', descricao: 'Obras portuárias, marítimas e fluviais' },
    { codigo: '42.92-8-01', descricao: 'Montagem de estruturas metálicas' },
    { codigo: '42.92-8-02', descricao: 'Obras de montagem industrial' },
    { codigo: '42.99-5-01', descricao: 'Construção de instalações esportivas e recreativas' },
    { codigo: '42.99-5-99', descricao: 'Outras obras de engenharia civil não especificadas anteriormente' },
    { codigo: '43.11-8-01', descricao: 'Demolição de edifícios e outras estruturas' },
    { codigo: '43.11-8-02', descricao: 'Preparação de canteiro e limpeza de terreno' },
    { codigo: '43.12-6-00', descricao: 'Perfurações e sondagens' },
    { codigo: '43.13-4-00', descricao: 'Obras de terraplenagem' },
    { codigo: '43.19-3-00', descricao: 'Serviços de preparação do terreno não especificados anteriormente' },
    { codigo: '43.21-5-00', descricao: 'Instalação e manutenção elétrica' },
    { codigo: '43.22-3-01', descricao: 'Instalações hidráulicas, sanitárias e de gás' },
    { codigo: '43.22-3-02', descricao: 'Instalação e manutenção de sistemas centrais de ar condicionado, de ventilação e refrigeração' },
    { codigo: '43.22-3-03', descricao: 'Instalações de sistema de prevenção contra incêndio' },
    { codigo: '43.29-1-01', descricao: 'Instalação de painéis publicitários' },
    { codigo: '43.29-1-02', descricao: 'Instalação de equipamentos para orientação à navegação marítima, fluvial e lacustre' },
    { codigo: '43.29-1-03', descricao: 'Instalação, manutenção e reparação de elevadores, escadas e esteiras rolantes' },
    { codigo: '43.29-1-04', descricao: 'Montagem e instalação de sistemas e equipamentos de iluminação e sinalização em vias públicas, portos e aeroportos' },
    { codigo: '43.29-1-05', descricao: 'Tratamentos térmicos, acústicos ou de vibração' },
    { codigo: '43.29-1-99', descricao: 'Outras obras de instalações em construções não especificadas anteriormente' },
    { codigo: '43.30-4-01', descricao: 'Impermeabilização em obras de engenharia civil' },
    { codigo: '43.30-4-02', descricao: 'Instalação de portas, janelas, tetos, divisórias e armários embutidos de qualquer material' },
    { codigo: '43.30-4-03', descricao: 'Obras de acabamento em gesso e estuque' },
    { codigo: '43.30-4-04', descricao: 'Serviços de pintura de edifícios em geral' },
    { codigo: '43.30-4-05', descricao: 'Aplicação de revestimentos e de resinas em interiores e exteriores' },
    { codigo: '43.30-4-99', descricao: 'Outras obras de acabamento da construção' },
    { codigo: '43.91-6-00', descricao: 'Obras de fundações' },
    { codigo: '43.99-1-01', descricao: 'Administração de obras' },
    { codigo: '43.99-1-02', descricao: 'Montagem e desmontagem de andaimes e outras estruturas temporárias' },
    { codigo: '43.99-1-03', descricao: 'Obras de alvenaria' },
    { codigo: '43.99-1-04', descricao: 'Serviços de operação e fornecimento de equipamentos para transporte e elevação de cargas e pessoas para uso em obras' },
    { codigo: '43.99-1-05', descricao: 'Perfuração e construção de poços de água' },
    { codigo: '43.99-1-99', descricao: 'Serviços especializados para construção não especificados anteriormente' },
    
    // TRANSPORTE
    { codigo: '49.11-6-00', descricao: 'Transporte ferroviário de carga' },
    { codigo: '49.12-4-01', descricao: 'Transporte ferroviário de passageiros intermunicipal e interestadual' },
    { codigo: '49.12-4-02', descricao: 'Transporte ferroviário de passageiros municipal e em região metropolitana' },
    { codigo: '49.12-4-03', descricao: 'Transporte metroviário' },
    { codigo: '49.21-3-01', descricao: 'Transporte rodoviário coletivo de passageiros, com itinerário fixo, municipal' },
    { codigo: '49.21-3-02', descricao: 'Transporte rodoviário coletivo de passageiros, com itinerário fixo, intermunicipal em região metropolitana' },
    { codigo: '49.22-1-01', descricao: 'Transporte rodoviário coletivo de passageiros, com itinerário fixo, intermunicipal, exceto em região metropolitana' },
    { codigo: '49.22-1-02', descricao: 'Transporte rodoviário coletivo de passageiros, com itinerário fixo, interestadual' },
    { codigo: '49.22-1-03', descricao: 'Transporte rodoviário coletivo de passageiros, com itinerário fixo, internacional' },
    { codigo: '49.23-0-01', descricao: 'Serviço de táxi' },
    { codigo: '49.23-0-02', descricao: 'Serviço de transporte de passageiros - locação de automóveis com motorista' },
    { codigo: '49.24-8-00', descricao: 'Transporte escolar' },
    { codigo: '49.29-9-01', descricao: 'Transporte rodoviário coletivo de passageiros, sob regime de fretamento, municipal' },
    { codigo: '49.29-9-02', descricao: 'Transporte rodoviário coletivo de passageiros, sob regime de fretamento, intermunicipal, interestadual e internacional' },
    { codigo: '49.29-9-03', descricao: 'Organização de excursões em veículos rodoviários próprios, municipal' },
    { codigo: '49.29-9-04', descricao: 'Organização de excursões em veículos rodoviários próprios, intermunicipal, interestadual e internacional' },
    { codigo: '49.29-9-99', descricao: 'Outros transportes rodoviários de passageiros não especificados anteriormente' },
    { codigo: '49.30-2-01', descricao: 'Transporte rodoviário de carga, exceto produtos perigosos e mudanças, municipal' },
    { codigo: '49.30-2-02', descricao: 'Transporte rodoviário de carga, exceto produtos perigosos e mudanças, intermunicipal, interestadual e internacional' },
    { codigo: '49.30-2-03', descricao: 'Transporte rodoviário de produtos perigosos' },
    { codigo: '49.30-2-04', descricao: 'Transporte rodoviário de mudanças' },
    { codigo: '52.11-7-01', descricao: 'Armazéns gerais - emissão de warrant' },
    { codigo: '52.11-7-02', descricao: 'Guarda-móveis' },
    { codigo: '52.11-7-99', descricao: 'Depósitos de mercadorias para terceiros, exceto armazéns gerais e guarda-móveis' },
    { codigo: '52.12-5-00', descricao: 'Carga e descarga' },
    { codigo: '52.50-8-01', descricao: 'Comissaria de despachos' },
    { codigo: '52.50-8-02', descricao: 'Atividades de despachantes aduaneiros' },
    { codigo: '52.50-8-03', descricao: 'Agenciamento de cargas, exceto para o transporte marítimo' },
    { codigo: '52.50-8-04', descricao: 'Organização logística do transporte de carga' },
    { codigo: '52.50-8-05', descricao: 'Operador de transporte multimodal - OTM' },
    { codigo: '53.20-2-01', descricao: 'Serviços de malote não realizados pelo Correio Nacional' },
    { codigo: '53.20-2-02', descricao: 'Serviços de entrega rápida' },
    
    // EDUCAÇÃO
    { codigo: '85.11-2-00', descricao: 'Educação infantil - creche' },
    { codigo: '85.12-1-00', descricao: 'Educação infantil - pré-escola' },
    { codigo: '85.13-9-00', descricao: 'Ensino fundamental' },
    { codigo: '85.20-1-00', descricao: 'Ensino médio' },
    { codigo: '85.31-7-00', descricao: 'Educação superior - graduação' },
    { codigo: '85.32-5-00', descricao: 'Educação superior - graduação e pós-graduação' },
    { codigo: '85.33-3-00', descricao: 'Educação superior - pós-graduação e extensão' },
    { codigo: '85.41-4-00', descricao: 'Educação profissional de nível técnico' },
    { codigo: '85.42-2-00', descricao: 'Educação profissional de nível tecnológico' },
    { codigo: '85.50-3-01', descricao: 'Administração de caixas escolares' },
    { codigo: '85.50-3-02', descricao: 'Atividades de apoio à educação, exceto caixas escolares' },
    { codigo: '85.91-1-00', descricao: 'Ensino de esportes' },
    { codigo: '85.92-9-01', descricao: 'Ensino de dança' },
    { codigo: '85.92-9-02', descricao: 'Ensino de artes cênicas, exceto dança' },
    { codigo: '85.92-9-03', descricao: 'Ensino de música' },
    { codigo: '85.92-9-99', descricao: 'Ensino de arte e cultura não especificado anteriormente' },
    { codigo: '85.93-7-00', descricao: 'Ensino de idiomas' },
    { codigo: '85.99-6-01', descricao: 'Formação de condutores' },
    { codigo: '85.99-6-02', descricao: 'Cursos de pilotagem' },
    { codigo: '85.99-6-03', descricao: 'Treinamento em informática' },
    { codigo: '85.99-6-04', descricao: 'Treinamento em desenvolvimento profissional e gerencial' },
    { codigo: '85.99-6-05', descricao: 'Cursos preparatórios para concursos' },
    { codigo: '85.99-6-99', descricao: 'Outras atividades de ensino não especificadas anteriormente' },
    
    // ATIVIDADES IMOBILIÁRIAS
    { codigo: '68.10-2-01', descricao: 'Compra e venda de imóveis próprios' },
    { codigo: '68.10-2-02', descricao: 'Aluguel de imóveis próprios' },
    { codigo: '68.10-2-03', descricao: 'Loteamento de imóveis próprios' },
    { codigo: '68.21-8-01', descricao: 'Corretagem na compra e venda e avaliação de imóveis' },
    { codigo: '68.21-8-02', descricao: 'Corretagem no aluguel de imóveis' },
    { codigo: '68.22-6-00', descricao: 'Gestão e administração da propriedade imobiliária' },
    
    // SERVIÇOS PESSOAIS
    { codigo: '96.01-7-01', descricao: 'Lavanderias' },
    { codigo: '96.01-7-02', descricao: 'Tinturarias' },
    { codigo: '96.01-7-03', descricao: 'Toalheiros' },
    { codigo: '96.02-5-01', descricao: 'Cabeleireiros, manicure e pedicure' },
    { codigo: '96.02-5-02', descricao: 'Atividades de estética e outros serviços de cuidados com a beleza' },
    { codigo: '96.03-3-01', descricao: 'Gestão e manutenção de cemitérios' },
    { codigo: '96.03-3-02', descricao: 'Serviços de cremação' },
    { codigo: '96.03-3-03', descricao: 'Serviços de sepultamento' },
    { codigo: '96.03-3-04', descricao: 'Serviços de funerárias' },
    { codigo: '96.03-3-05', descricao: 'Serviços de somatoconservação' },
    { codigo: '96.03-3-99', descricao: 'Atividades funerárias e serviços relacionados não especificados anteriormente' },
    { codigo: '96.09-2-02', descricao: 'Agências matrimoniais' },
    { codigo: '96.09-2-04', descricao: 'Exploração de máquinas de serviços pessoais acionadas por moeda' },
    { codigo: '96.09-2-05', descricao: 'Atividades de sauna e banhos' },
    { codigo: '96.09-2-06', descricao: 'Serviços de tatuagem e colocação de piercing' },
    { codigo: '96.09-2-07', descricao: 'Alojamento de animais domésticos' },
    { codigo: '96.09-2-08', descricao: 'Higiene e embelezamento de animais domésticos' },
    { codigo: '96.09-2-99', descricao: 'Outras atividades de serviços pessoais não especificadas anteriormente' },
    
    // VEÍCULOS E AUTOPEÇAS
    { codigo: '45.11-1-01', descricao: 'Comércio a varejo de automóveis, camionetas e utilitários novos' },
    { codigo: '45.11-1-02', descricao: 'Comércio a varejo de automóveis, camionetas e utilitários usados' },
    { codigo: '45.11-1-03', descricao: 'Comércio por atacado de automóveis, camionetas e utilitários novos e usados' },
    { codigo: '45.11-1-04', descricao: 'Comércio por atacado de caminhões novos e usados' },
    { codigo: '45.11-1-05', descricao: 'Comércio por atacado de reboques e semi-reboques novos e usados' },
    { codigo: '45.11-1-06', descricao: 'Comércio por atacado de ônibus e micro-ônibus novos e usados' },
    { codigo: '45.12-9-01', descricao: 'Representantes comerciais e agentes do comércio de veículos automotores' },
    { codigo: '45.12-9-02', descricao: 'Comércio sob consignação de veículos automotores' },
    { codigo: '45.20-0-01', descricao: 'Serviços de manutenção e reparação mecânica de veículos automotores' },
    { codigo: '45.20-0-02', descricao: 'Serviços de lanternagem ou funilaria e pintura de veículos automotores' },
    { codigo: '45.20-0-03', descricao: 'Serviços de manutenção e reparação elétrica de veículos automotores' },
    { codigo: '45.20-0-04', descricao: 'Serviços de alinhamento e balanceamento de veículos automotores' },
    { codigo: '45.20-0-05', descricao: 'Serviços de lavagem, lubrificação e polimento de veículos automotores' },
    { codigo: '45.20-0-06', descricao: 'Serviços de borracharia para veículos automotores' },
    { codigo: '45.20-0-07', descricao: 'Serviços de instalação, manutenção e reparação de acessórios para veículos automotores' },
    { codigo: '45.20-0-08', descricao: 'Serviços de capotaria' },
    { codigo: '45.30-7-01', descricao: 'Comércio por atacado de peças e acessórios novos para veículos automotores' },
    { codigo: '45.30-7-02', descricao: 'Comércio por atacado de pneumáticos e câmaras-de-ar' },
    { codigo: '45.30-7-03', descricao: 'Comércio a varejo de peças e acessórios novos para veículos automotores' },
    { codigo: '45.30-7-04', descricao: 'Comércio a varejo de peças e acessórios usados para veículos automotores' },
    { codigo: '45.30-7-05', descricao: 'Comércio a varejo de pneumáticos e câmaras-de-ar' },
    { codigo: '45.30-7-06', descricao: 'Representantes comerciais e agentes do comércio de peças e acessórios novos e usados para veículos automotores' },
    { codigo: '45.41-2-01', descricao: 'Comércio por atacado de motocicletas e motonetas' },
    { codigo: '45.41-2-02', descricao: 'Comércio por atacado de peças e acessórios para motocicletas e motonetas' },
    { codigo: '45.41-2-03', descricao: 'Comércio a varejo de motocicletas e motonetas novas' },
    { codigo: '45.41-2-04', descricao: 'Comércio a varejo de motocicletas e motonetas usadas' },
    { codigo: '45.41-2-05', descricao: 'Comércio a varejo de peças e acessórios para motocicletas e motonetas' },
    { codigo: '45.42-1-01', descricao: 'Representantes comerciais e agentes do comércio de motocicletas e motonetas, peças e acessórios' },
    { codigo: '45.42-1-02', descricao: 'Comércio sob consignação de motocicletas e motonetas' },
    { codigo: '45.43-9-00', descricao: 'Manutenção e reparação de motocicletas e motonetas' },
    
    // ALUGUEL E LOCAÇÃO
    { codigo: '77.11-0-00', descricao: 'Locação de automóveis sem condutor' },
    { codigo: '77.19-5-01', descricao: 'Locação de embarcações sem tripulação, exceto para fins recreativos' },
    { codigo: '77.19-5-02', descricao: 'Locação de aeronaves sem tripulação' },
    { codigo: '77.19-5-99', descricao: 'Locação de outros meios de transporte não especificados anteriormente, sem condutor' },
    { codigo: '77.21-7-00', descricao: 'Aluguel de equipamentos recreativos e esportivos' },
    { codigo: '77.22-5-00', descricao: 'Aluguel de fitas de vídeo, DVDs e similares' },
    { codigo: '77.23-3-00', descricao: 'Aluguel de objetos do vestuário, joias e acessórios' },
    { codigo: '77.29-2-01', descricao: 'Aluguel de aparelhos de jogos eletrônicos' },
    { codigo: '77.29-2-02', descricao: 'Aluguel de móveis, utensílios e aparelhos de uso doméstico e pessoal; instrumentos musicais' },
    { codigo: '77.29-2-03', descricao: 'Aluguel de material médico' },
    { codigo: '77.29-2-99', descricao: 'Aluguel de outros objetos pessoais e domésticos não especificados anteriormente' },
    { codigo: '77.31-4-00', descricao: 'Aluguel de máquinas e equipamentos agrícolas sem operador' },
    { codigo: '77.32-2-01', descricao: 'Aluguel de máquinas e equipamentos para construção sem operador, exceto andaimes' },
    { codigo: '77.32-2-02', descricao: 'Aluguel de andaimes' },
    { codigo: '77.33-1-00', descricao: 'Aluguel de máquinas e equipamentos para escritório' },
    { codigo: '77.39-0-01', descricao: 'Aluguel de máquinas e equipamentos para extração de minérios e petróleo, sem operador' },
    { codigo: '77.39-0-02', descricao: 'Aluguel de equipamentos científicos, médicos e hospitalares, sem operador' },
    { codigo: '77.39-0-03', descricao: 'Aluguel de palcos, coberturas e outras estruturas de uso temporário, exceto andaimes' },
    { codigo: '77.39-0-99', descricao: 'Aluguel de outras máquinas e equipamentos comerciais e industriais não especificados anteriormente, sem operador' },
    { codigo: '77.40-3-00', descricao: 'Gestão de ativos intangíveis não-financeiros' },
    
    // OUTROS SERVIÇOS
    { codigo: '74.90-1-01', descricao: 'Serviços de tradução, interpretação e similares' },
    { codigo: '74.90-1-02', descricao: 'Escafandria e mergulho' },
    { codigo: '74.90-1-03', descricao: 'Serviços de agronomia e de consultoria às atividades agrícolas e pecuárias' },
    { codigo: '74.90-1-04', descricao: 'Atividades de intermediação e agenciamento de serviços e negócios em geral, exceto imobiliários' },
    { codigo: '74.90-1-05', descricao: 'Agenciamento de profissionais para atividades esportivas, culturais e artísticas' },
    { codigo: '74.90-1-99', descricao: 'Outras atividades profissionais, científicas e técnicas não especificadas anteriormente' },
    { codigo: '78.10-8-00', descricao: 'Seleção e agenciamento de mão-de-obra' },
    { codigo: '78.20-5-00', descricao: 'Locação de mão-de-obra temporária' },
    { codigo: '78.30-2-00', descricao: 'Fornecimento e gestão de recursos humanos para terceiros' },
    { codigo: '80.11-1-01', descricao: 'Atividades de vigilância e segurança privada' },
    { codigo: '80.11-1-02', descricao: 'Serviços de adestramento de cães de guarda' },
    { codigo: '80.12-9-00', descricao: 'Atividades de transporte de valores' },
    { codigo: '80.20-0-01', descricao: 'Atividades de monitoramento de sistemas de segurança eletrônico' },
    { codigo: '80.20-0-02', descricao: 'Outras atividades de serviços de segurança' },
    { codigo: '80.30-7-00', descricao: 'Atividades de investigação particular' },
    { codigo: '81.11-7-00', descricao: 'Serviços combinados para apoio a edifícios, exceto condomínios prediais' },
    { codigo: '81.12-5-00', descricao: 'Condomínios prediais' },
    { codigo: '81.21-4-00', descricao: 'Limpeza em prédios e em domicílios' },
    { codigo: '81.22-2-00', descricao: 'Imunização e controle de pragas urbanas' },
    { codigo: '81.29-0-00', descricao: 'Atividades de limpeza não especificadas anteriormente' },
    { codigo: '81.30-3-00', descricao: 'Atividades paisagísticas' },
    { codigo: '82.11-3-00', descricao: 'Serviços combinados de escritório e apoio administrativo' },
    { codigo: '82.19-9-01', descricao: 'Fotocópias' },
    { codigo: '82.19-9-99', descricao: 'Preparação de documentos e serviços especializados de apoio administrativo não especificados anteriormente' },
    { codigo: '82.20-2-00', descricao: 'Atividades de teleatendimento' },
    { codigo: '82.30-0-01', descricao: 'Serviços de organização de feiras, congressos, exposições e festas' },
    { codigo: '82.30-0-02', descricao: 'Casas de festas e eventos' },
    { codigo: '82.91-1-00', descricao: 'Atividades de cobrança e informações cadastrais' },
    { codigo: '82.92-0-00', descricao: 'Envasamento e empacotamento sob contrato' },
    { codigo: '82.99-7-01', descricao: 'Medição de consumo de energia elétrica, gás e água' },
    { codigo: '82.99-7-02', descricao: 'Emissão de vales-alimentação, vales-transporte e similares' },
    { codigo: '82.99-7-03', descricao: 'Serviços de gravação de carimbos, exceto confecção' },
    { codigo: '82.99-7-04', descricao: 'Leiloeiros independentes' },
    { codigo: '82.99-7-05', descricao: 'Serviços de levantamento de fundos sob contrato' },
    { codigo: '82.99-7-06', descricao: 'Casas lotéricas' },
    { codigo: '82.99-7-07', descricao: 'Salas de acesso à internet' },
    { codigo: '82.99-7-99', descricao: 'Outras atividades de serviços prestados principalmente às empresas não especificadas anteriormente' },
];

// Função para converter número para extenso
const numeroParaExtenso = (valor) => {
    if (!valor || valor === 0) return '';
    
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    
    const converterGrupo = (n) => {
        if (n === 0) return '';
        if (n === 100) return 'cem';
        
        let resultado = '';
        const c = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;
        
        if (c > 0) resultado += centenas[c];
        
        if (d === 1) {
            if (resultado) resultado += ' e ';
            resultado += especiais[u];
        } else {
            if (d > 1) {
                if (resultado) resultado += ' e ';
                resultado += dezenas[d];
            }
            if (u > 0) {
                if (resultado) resultado += ' e ';
                resultado += unidades[u];
            }
        }
        return resultado;
    };
    
    const num = Math.floor(valor);
    const centavos = Math.round((valor - num) * 100);
    
    if (num === 0 && centavos > 0) {
        return `${converterGrupo(centavos)} centavo${centavos > 1 ? 's' : ''}`;
    }
    
    let resultado = '';
    
    const milhoes = Math.floor(num / 1000000);
    if (milhoes > 0) {
        resultado += converterGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões');
    }
    
    const milhares = Math.floor((num % 1000000) / 1000);
    if (milhares > 0) {
        if (resultado) resultado += ' ';
        if (milhares === 1) {
            resultado += 'mil';
        } else {
            resultado += converterGrupo(milhares) + ' mil';
        }
    }
    
    const resto = num % 1000;
    if (resto > 0) {
        if (resultado) {
            resultado += (resto < 100 ? ' e ' : ' ');
        }
        resultado += converterGrupo(resto);
    }
    
    resultado += ' rea' + (num === 1 ? 'l' : 'is');
    
    if (centavos > 0) {
        resultado += ' e ' + converterGrupo(centavos) + ' centavo' + (centavos > 1 ? 's' : '');
    }
    
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
};

// Função para formatar moeda
const formatarMoeda = (valor) => {
    const numero = valor.replace(/\D/g, '');
    const valorNumerico = parseFloat(numero) / 100;
    return valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Componente de qualificação de sócio com endereço completo
const SocioCard = ({ socio, index, onChange, onRemove, canRemove }) => {
    const docInputRef = useRef(null);
    const enderecoInputRef = useRef(null);
    const [extraindo, setExtraindo] = useState(false);
    const [extraindoEndereco, setExtraindoEndereco] = useState(false);
    
    const handleDocUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setExtraindo(true);
        toast.info('Extraindo dados do documento...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await axios.post(`${API_URL}/api/constituicao/extrair-socio`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success && response.data.dados) {
                const dados = response.data.dados;
                onChange({
                    ...socio,
                    nome: dados.nome || socio.nome,
                    cpf: dados.cpf || socio.cpf,
                    rg: dados.rg || socio.rg,
                    orgaoEmissor: dados.orgao_emissor || socio.orgaoEmissor,
                    nacionalidade: dados.nacionalidade || socio.nacionalidade,
                    dataNascimento: dados.data_nascimento || socio.dataNascimento,
                    cidadeNascimento: dados.cidade_nascimento || socio.cidadeNascimento,
                    estadoNascimento: dados.estado_nascimento || socio.estadoNascimento,
                    estadoCivil: dados.estado_civil || socio.estadoCivil,
                    profissao: dados.profissao || socio.profissao,
                    documentos: [...(socio.documentos || []), file]
                });
                toast.success('Dados pessoais extraídos!');
            } else {
                onChange({
                    ...socio,
                    documentos: [...(socio.documentos || []), file]
                });
                toast.info('Documento anexado');
            }
        } catch (error) {
            console.error('Erro na extração:', error);
            onChange({
                ...socio,
                documentos: [...(socio.documentos || []), file]
            });
            toast.warning('Documento anexado (extração indisponível)');
        } finally {
            setExtraindo(false);
            if (docInputRef.current) docInputRef.current.value = '';
        }
    };

    const handleEnderecoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setExtraindoEndereco(true);
        toast.info('Extraindo endereço do documento...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('campo', 'endereco');
            
            const response = await axios.post(`${API_URL}/api/constituicao/extrair-campo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success && response.data.valor) {
                const dados = response.data.valor;
                if (typeof dados === 'object') {
                    onChange({
                        ...socio,
                        endereco: {
                            ...socio.endereco,
                            logradouro: dados.logradouro || socio.endereco?.logradouro || '',
                            numero: dados.numero || socio.endereco?.numero || '',
                            complemento: dados.complemento || socio.endereco?.complemento || '',
                            bairro: dados.bairro || socio.endereco?.bairro || '',
                            cidade: dados.cidade || socio.endereco?.cidade || '',
                            estado: dados.estado || socio.endereco?.estado || 'SP',
                            cep: dados.cep || socio.endereco?.cep || ''
                        }
                    });
                    toast.success('Endereço extraído!');
                }
            }
        } catch (error) {
            console.error('Erro na extração:', error);
            toast.error('Erro ao extrair endereço');
        } finally {
            setExtraindoEndereco(false);
            if (enderecoInputRef.current) enderecoInputRef.current.value = '';
        }
    };

    // Função para buscar CEP nos Correios
    const handleBuscarCep = async () => {
        const cepLimpo = enderecoSocio.cep?.replace(/\D/g, '') || '';
        if (cepLimpo.length !== 8) {
            toast.error('CEP deve ter 8 dígitos');
            return;
        }
        
        try {
            const response = await axios.get(`${API_URL}/api/cep/${cepLimpo}`);
            if (response.data.success && response.data.endereco) {
                const dados = response.data.endereco;
                onChange({
                    ...socio,
                    endereco: {
                        ...enderecoSocio,
                        logradouro: dados.logradouro || enderecoSocio.logradouro,
                        bairro: dados.bairro || enderecoSocio.bairro,
                        cidade: dados.cidade || enderecoSocio.cidade,
                        estado: dados.estado || enderecoSocio.estado,
                        cep: dados.cep || enderecoSocio.cep
                    }
                });
                toast.success('Endereço atualizado via Correios!');
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            toast.error('CEP não encontrado');
        }
    };

    // Inicializar endereço como objeto se não existir
    const enderecoSocio = socio.endereco && typeof socio.endereco === 'object' 
        ? socio.endereco 
        : { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' };
    
    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="font-medium text-white">Sócio {index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        disabled={extraindo}
                        className="text-xs bg-red-600/20 text-red-500 hover:bg-red-600/30 px-3 py-1.5 rounded flex items-center gap-1"
                    >
                        {extraindo ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Preencher Dados com IA
                    </button>
                    {canRemove && (
                        <button onClick={onRemove} className="text-zinc-500 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            
            <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleDocUpload} />
            <input ref={enderecoInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleEnderecoUpload} />
            
            <p className="text-xs text-zinc-500">
                Anexe CNH ou RG para preenchimento automático dos dados pessoais
            </p>
            
            {/* Dados Pessoais */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">Nome Completo <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.nome}
                        onChange={(e) => onChange({ ...socio, nome: e.target.value.toUpperCase() })}
                        placeholder="NOME COMPLETO EM MAIÚSCULAS"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">CPF <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.cpf}
                        onChange={(e) => onChange({ ...socio, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">RG <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.rg}
                        onChange={(e) => onChange({ ...socio, rg: e.target.value })}
                        placeholder="00.000.000-0"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">Órgão Emissor <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.orgaoEmissor}
                        onChange={(e) => onChange({ ...socio, orgaoEmissor: e.target.value })}
                        placeholder="SSP/SP"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">Nacionalidade <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.nacionalidade}
                        onChange={(e) => onChange({ ...socio, nacionalidade: e.target.value })}
                        placeholder="Brasileiro(a)"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
            </div>
            
            {/* Naturalidade e Data de Nascimento */}
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">Data de Nascimento</Label>
                    <Input
                        type="date"
                        value={socio.dataNascimento || ''}
                        onChange={(e) => onChange({ ...socio, dataNascimento: e.target.value })}
                        className="bg-zinc-900 border-zinc-700 mt-1"
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">Cidade de Nascimento</Label>
                    <Input
                        value={socio.cidadeNascimento || ''}
                        onChange={(e) => onChange({ ...socio, cidadeNascimento: e.target.value })}
                        placeholder="São Paulo"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">Estado de Nascimento</Label>
                    <Select value={socio.estadoNascimento || ''} onValueChange={(v) => onChange({ ...socio, estadoNascimento: v })}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1">
                            <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                            {ESTADOS.map(uf => (
                                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">Estado Civil <span className="text-red-500">*</span></Label>
                    <Select value={socio.estadoCivil} onValueChange={(v) => onChange({ ...socio, estadoCivil: v })}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1">
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                            {ESTADOS_CIVIS.map(ec => (
                                <SelectItem key={ec} value={ec}>{ec}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {socio.estadoCivil === 'Casado(a)' && (
                    <div className="col-span-2">
                        <Label className="text-zinc-500 text-xs">Regime de Casamento <span className="text-red-500">*</span></Label>
                        <Select value={socio.regimeCasamento} onValueChange={(v) => onChange({ ...socio, regimeCasamento: v })}>
                            <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700">
                                {REGIMES_CASAMENTO.map(rc => (
                                    <SelectItem key={rc} value={rc}>{rc}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className={socio.estadoCivil === 'Casado(a)' ? '' : 'col-span-2'}>
                    <Label className="text-zinc-500 text-xs">Profissão <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.profissao}
                        onChange={(e) => onChange({ ...socio, profissao: e.target.value })}
                        placeholder="Empresário(a)"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
            </div>
            
            {/* Endereço do Sócio */}
            <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-zinc-400 text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        Endereço Residencial
                    </Label>
                    <button 
                        type="button"
                        onClick={() => enderecoInputRef.current?.click()}
                        disabled={extraindoEndereco}
                        className="text-xs bg-red-600/20 text-red-500 hover:bg-red-600/30 px-3 py-1.5 rounded flex items-center gap-1"
                    >
                        {extraindoEndereco ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Preencher Endereço com IA
                    </button>
                </div>
                
                <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-2">
                            <Label className="text-zinc-500 text-xs">Logradouro <span className="text-red-500">*</span></Label>
                            <Input
                                value={enderecoSocio.logradouro}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, logradouro: e.target.value } })}
                                placeholder="Rua, Avenida, etc."
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Número <span className="text-red-500">*</span></Label>
                            <Input
                                value={enderecoSocio.numero}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, numero: e.target.value } })}
                                placeholder="123"
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Complemento</Label>
                            <Input
                                value={enderecoSocio.complemento}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, complemento: e.target.value } })}
                                placeholder="Apto, Sala"
                                className="bg-zinc-900 border-zinc-700 mt-1"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <Label className="text-zinc-500 text-xs">Bairro <span className="text-red-500">*</span></Label>
                            <Input
                                value={enderecoSocio.bairro}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, bairro: e.target.value } })}
                                placeholder="Bairro"
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Cidade <span className="text-red-500">*</span></Label>
                            <Input
                                value={enderecoSocio.cidade}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, cidade: e.target.value } })}
                                placeholder="Cidade"
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Estado <span className="text-red-500">*</span></Label>
                            <Select 
                                value={enderecoSocio.estado} 
                                onValueChange={(v) => onChange({ ...socio, endereco: { ...enderecoSocio, estado: v } })}
                            >
                                <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                    {ESTADOS.map(uf => (
                                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">CEP <span className="text-red-500">*</span></Label>
                            <div className="flex gap-1 mt-1">
                                <Input
                                    value={enderecoSocio.cep}
                                    onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, cep: e.target.value } })}
                                    placeholder="00000-000"
                                    className="bg-zinc-900 border-zinc-700"
                                    required
                                />
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    onClick={handleBuscarCep}
                                    className="bg-blue-600 hover:bg-blue-700 px-2"
                                >
                                    <Search className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Documentos anexados */}
            {socio.documentos && socio.documentos.length > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                    <Label className="text-zinc-500 text-xs mb-2 block">Documentos anexados</Label>
                    <div className="flex flex-wrap gap-2">
                        {socio.documentos.map((doc, i) => (
                            <span key={i} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {doc.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente de tabela de participação
const TabelaParticipacao = ({ socios, capitalSocial, onUpdateParticipacao }) => {
    const capitalNumerico = parseFloat(capitalSocial?.replace(/\./g, '').replace(',', '.') || 0);
    const totalParticipacao = socios.reduce((acc, s) => acc + (parseFloat(s.participacao) || 0), 0);
    
    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full">
                <thead className="bg-zinc-900">
                    <tr>
                        <th className="text-left p-3 text-xs text-zinc-400 uppercase">Sócio</th>
                        <th className="text-center p-3 text-xs text-zinc-400 uppercase">% Participação <span className="text-red-500">*</span></th>
                        <th className="text-right p-3 text-xs text-zinc-400 uppercase">Valor (R$)</th>
                        <th className="text-center p-3 text-xs text-zinc-400 uppercase">Administrador</th>
                    </tr>
                </thead>
                <tbody>
                    {socios.map((socio, index) => {
                        const valorQuotas = capitalNumerico * (parseFloat(socio.participacao) || 0) / 100;
                        return (
                            <tr key={index} className="border-t border-zinc-800">
                                <td className="p-3 text-white">{socio.nome || `Sócio ${index + 1}`}</td>
                                <td className="p-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={socio.participacao || ''}
                                            onChange={(e) => onUpdateParticipacao(index, 'participacao', e.target.value)}
                                            className="bg-zinc-900 border-zinc-700 w-20 text-center"
                                            required
                                        />
                                        <Percent className="w-4 h-4 text-zinc-500" />
                                    </div>
                                </td>
                                <td className="p-3 text-right text-zinc-400">
                                    {valorQuotas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-center">
                                    <input
                                        type="checkbox"
                                        checked={socio.administrador || false}
                                        onChange={(e) => onUpdateParticipacao(index, 'administrador', e.target.checked)}
                                        className="w-4 h-4 accent-red-600"
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-zinc-900">
                    <tr>
                        <td className="p-3 text-white font-medium">Total</td>
                        <td className={`p-3 text-center font-medium ${totalParticipacao === 100 ? 'text-green-500' : 'text-red-500'}`}>
                            {totalParticipacao}%
                        </td>
                        <td className="p-3 text-right text-white font-medium">
                            {capitalNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3"></td>
                    </tr>
                </tfoot>
            </table>
            {totalParticipacao !== 100 && (
                <div className="p-3 bg-red-950/30 border-t border-red-900/50 text-red-400 text-sm">
                    ⚠️ A soma das participações deve ser exatamente 100%
                </div>
            )}
        </div>
    );
};

// Componente de seleção de CNAEs
const SeletorCNAEs = ({ cnaes, onAdd, onRemove }) => {
    const [busca, setBusca] = useState('');
    const [showLista, setShowLista] = useState(false);
    const [cnaeManual, setCnaeManual] = useState('');
    
    const cnaesFiltrados = BANCO_CNAES.filter(cnae => 
        cnae.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        cnae.descricao.toLowerCase().includes(busca.toLowerCase())
    );
    
    const handleSelectCnae = (cnae) => {
        const cnaeStr = `${cnae.codigo} - ${cnae.descricao}`;
        if (!cnaes.includes(cnaeStr)) {
            onAdd(cnaeStr);
        }
        setBusca('');
        setShowLista(false);
    };
    
    const handleAddManual = () => {
        if (cnaeManual.trim() && !cnaes.includes(cnaeManual.trim())) {
            onAdd(cnaeManual.trim());
            setCnaeManual('');
        }
    };
    
    return (
        <div className="space-y-4">
            {/* Busca no banco de CNAEs */}
            <div>
                <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                    Buscar CNAE <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        value={busca}
                        onChange={(e) => {
                            setBusca(e.target.value);
                            setShowLista(true);
                        }}
                        onFocus={() => setShowLista(true)}
                        placeholder="Digite o código ou descrição do CNAE..."
                        className="bg-zinc-950 border-zinc-800 pl-10"
                    />
                    
                    {showLista && busca && (
                        <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg max-h-60 overflow-y-auto">
                            {cnaesFiltrados.length > 0 ? (
                                cnaesFiltrados.map((cnae, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleSelectCnae(cnae)}
                                        className="w-full text-left p-3 hover:bg-zinc-800 border-b border-zinc-800 last:border-0"
                                    >
                                        <span className="text-red-500 font-mono text-sm">{cnae.codigo}</span>
                                        <span className="text-zinc-300 text-sm ml-2">{cnae.descricao}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="p-3 text-zinc-500 text-sm">
                                    Nenhum CNAE encontrado. Use o campo abaixo para adicionar manualmente.
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                    Pesquise entre os CNAEs mais comuns ou adicione manualmente abaixo
                </p>
            </div>
            
            {/* Adicionar CNAE manual */}
            <div>
                <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                    Adicionar CNAE Manualmente
                </Label>
                <div className="flex gap-2">
                    <Input
                        value={cnaeManual}
                        onChange={(e) => setCnaeManual(e.target.value)}
                        placeholder="00.00-0-00 - Descrição da atividade"
                        className="bg-zinc-950 border-zinc-800 flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddManual()}
                    />
                    <Button onClick={handleAddManual} className="bg-red-600 hover:bg-red-700">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            
            {/* CNAEs selecionados */}
            {cnaes.length > 0 && (
                <div>
                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                        CNAEs Selecionados ({cnaes.length})
                    </Label>
                    <div className="space-y-2">
                        {cnaes.map((cnae, index) => (
                            <div key={index} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded p-3">
                                <span className="text-sm text-zinc-300">{cnae}</span>
                                <button onClick={() => onRemove(index)} className="text-zinc-500 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const WizardConstituicao = ({ open, onClose, onComplete, processoEditando }) => {
    const [step, setStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [processoId, setProcessoId] = useState(null);
    const [modoEdicao, setModoEdicao] = useState(false);
    
    // Step 1 - Dados da Empresa
    const [razaoSocial, setRazaoSocial] = useState('');
    const [nomeFantasia, setNomeFantasia] = useState('');
    const [capitalSocial, setCapitalSocial] = useState('');
    const [capitalExtenso, setCapitalExtenso] = useState('');
    
    // Step 2 - Sócios
    const [numSocios, setNumSocios] = useState(2);
    const [socios, setSocios] = useState([
        { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', dataNascimento: '', cidadeNascimento: '', estadoNascimento: '', estadoCivil: '', regimeCasamento: '', profissao: 'Empresário(a)', endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' }, participacao: '50', administrador: true, documentos: [] },
        { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', dataNascimento: '', cidadeNascimento: '', estadoNascimento: '', estadoCivil: '', regimeCasamento: '', profissao: 'Empresário(a)', endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' }, participacao: '50', administrador: false, documentos: [] }
    ]);
    
    // Step 4 - Endereço da Empresa
    const [endereco, setEndereco] = useState({
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: 'SP',
        cep: ''
    });
    const [extraindoEndereco, setExtraindoEndereco] = useState(false);
    const enderecoInputRef = useRef(null);
    
    // Step 5 - CNAEs
    const [cnaes, setCnaes] = useState([]);
    const [objetoSocial, setObjetoSocial] = useState('');
    const [gerandoObjeto, setGerandoObjeto] = useState(false);
    
    // Step 6 - Resultado
    const [contratoGerado, setContratoGerado] = useState('');

    // Atualizar capital por extenso automaticamente
    useEffect(() => {
        if (capitalSocial) {
            const valorNumerico = parseFloat(capitalSocial.replace(/\./g, '').replace(',', '.')) || 0;
            if (valorNumerico > 0) {
                setCapitalExtenso(numeroParaExtenso(valorNumerico));
            }
        }
    }, [capitalSocial]);

    // Ajustar array de sócios quando numSocios muda
    const ajustarSocios = useCallback(() => {
        setSocios(prevSocios => {
            if (numSocios > prevSocios.length) {
                const novos = [...prevSocios];
                for (let i = prevSocios.length; i < numSocios; i++) {
                    novos.push({ 
                        nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', 
                        dataNascimento: '', cidadeNascimento: '', estadoNascimento: '',
                        estadoCivil: '', regimeCasamento: '', profissao: 'Empresário(a)', 
                        endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' },
                        participacao: '', administrador: false, documentos: [] 
                    });
                }
                return novos;
            } else if (numSocios < prevSocios.length) {
                return prevSocios.slice(0, numSocios);
            }
            return prevSocios;
        });
    }, [numSocios]);

    useEffect(() => {
        ajustarSocios();
    }, [ajustarSocios]);

    // Carregar dados do processo para edição
    useEffect(() => {
        if (open && processoEditando && processoEditando.tipo_processo === 'constituicao') {
            setModoEdicao(true);
            setProcessoId(processoEditando.id);
            
            // Carregar dados da empresa
            setRazaoSocial(processoEditando.razao_social || processoEditando.nome_empresa || '');
            setNomeFantasia(processoEditando.nome_fantasia || '');
            setCapitalSocial(processoEditando.capital_social || '');
            
            // Carregar sócios
            if (processoEditando.socios && processoEditando.socios.length > 0) {
                const sociosFormatados = processoEditando.socios.map((s, idx) => ({
                    nome: s.nome || '',
                    cpf: s.cpf || '',
                    rg: s.rg || '',
                    orgaoEmissor: s.orgaoEmissor || s.orgao_emissor || '',
                    nacionalidade: s.nacionalidade || 'Brasileiro(a)',
                    dataNascimento: s.dataNascimento || s.data_nascimento || '',
                    cidadeNascimento: s.cidadeNascimento || s.cidade_nascimento || '',
                    estadoNascimento: s.estadoNascimento || s.estado_nascimento || '',
                    estadoCivil: s.estadoCivil || s.estado_civil || '',
                    regimeCasamento: s.regimeCasamento || s.regime_casamento || '',
                    profissao: s.profissao || 'Empresário(a)',
                    endereco: s.endereco || { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' },
                    participacao: s.participacao || '',
                    administrador: s.administrador || idx === 0,
                    documentos: s.documentos || []
                }));
                setSocios(sociosFormatados);
                setNumSocios(sociosFormatados.length);
            }
            
            // Carregar endereço
            if (processoEditando.endereco) {
                setEndereco(processoEditando.endereco);
            }
            
            // Carregar CNAEs
            if (processoEditando.cnaes && processoEditando.cnaes.length > 0) {
                setCnaes(processoEditando.cnaes);
            }
            
            // Carregar objeto social
            if (processoEditando.objeto_social) {
                setObjetoSocial(processoEditando.objeto_social);
            }
            
            // Carregar contrato gerado
            if (processoEditando.conteudo_gerado) {
                setContratoGerado(processoEditando.conteudo_gerado);
            }
        } else if (open && !processoEditando) {
            setModoEdicao(false);
        }
    }, [open, processoEditando]);

    const resetWizard = () => {
        setStep(1);
        setRazaoSocial('');
        setNomeFantasia('');
        setCapitalSocial('');
        setCapitalExtenso('');
        setNumSocios(2);
        setSocios([
            { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', dataNascimento: '', cidadeNascimento: '', estadoNascimento: '', estadoCivil: '', regimeCasamento: '', profissao: 'Empresário(a)', endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' }, participacao: '50', administrador: true, documentos: [] },
            { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', dataNascimento: '', cidadeNascimento: '', estadoNascimento: '', estadoCivil: '', regimeCasamento: '', profissao: 'Empresário(a)', endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' }, participacao: '50', administrador: false, documentos: [] }
        ]);
        setEndereco({ logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' });
        setCnaes([]);
        setObjetoSocial('');
        setContratoGerado('');
        setProcessoId(null);
        setModoEdicao(false);
    };

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    const handleCapitalChange = (e) => {
        const valor = e.target.value.replace(/\D/g, '');
        if (valor) {
            setCapitalSocial(formatarMoeda(valor));
        } else {
            setCapitalSocial('');
        }
    };

    const handleEnderecoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setExtraindoEndereco(true);
        toast.info('Extraindo endereço do documento...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('campo', 'endereco');
            
            const response = await axios.post(`${API_URL}/api/constituicao/extrair-campo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success && response.data.valor) {
                const dados = response.data.valor;
                if (typeof dados === 'object') {
                    setEndereco(prev => ({
                        ...prev,
                        logradouro: dados.logradouro || prev.logradouro,
                        numero: dados.numero || prev.numero,
                        complemento: dados.complemento || prev.complemento,
                        bairro: dados.bairro || prev.bairro,
                        cidade: dados.cidade || prev.cidade,
                        estado: dados.estado || prev.estado,
                        cep: dados.cep || prev.cep
                    }));
                    toast.success('Endereço extraído!');
                }
            }
        } catch (error) {
            console.error('Erro na extração:', error);
            toast.error('Erro ao extrair endereço');
        } finally {
            setExtraindoEndereco(false);
            if (enderecoInputRef.current) enderecoInputRef.current.value = '';
        }
    };

    // Função para buscar CEP nos Correios
    const buscarCep = async (cep, setEnderecoFn) => {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) {
            toast.error('CEP deve ter 8 dígitos');
            return;
        }
        
        try {
            const response = await axios.get(`${API_URL}/api/cep/${cepLimpo}`);
            if (response.data.success && response.data.endereco) {
                const dados = response.data.endereco;
                setEnderecoFn(prev => ({
                    ...prev,
                    logradouro: dados.logradouro || prev.logradouro,
                    bairro: dados.bairro || prev.bairro,
                    cidade: dados.cidade || prev.cidade,
                    estado: dados.estado || prev.estado,
                    cep: dados.cep || prev.cep
                }));
                toast.success('Endereço atualizado via Correios!');
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            toast.error('CEP não encontrado');
        }
    };

    const handleSocioChange = (index, socioAtualizado) => {
        setSocios(prev => {
            const novos = [...prev];
            novos[index] = socioAtualizado;
            return novos;
        });
    };

    const handleRemoveSocio = (index) => {
        if (socios.length <= 1) return;
        setSocios(prev => prev.filter((_, i) => i !== index));
        setNumSocios(prev => prev - 1);
    };

    const handleUpdateParticipacao = (index, field, value) => {
        setSocios(prev => {
            const novos = [...prev];
            novos[index] = { ...novos[index], [field]: value };
            return novos;
        });
    };

    const handleAddCnae = (cnae) => {
        setCnaes(prev => [...prev, cnae]);
    };

    const handleRemoveCnae = (index) => {
        setCnaes(prev => prev.filter((_, i) => i !== index));
    };

    const handleGerarObjetoSocial = async () => {
        if (cnaes.length === 0) {
            toast.error('Adicione pelo menos um CNAE');
            return;
        }
        
        setGerandoObjeto(true);
        try {
            const response = await axios.post(`${API_URL}/api/constituicao/gerar-objeto-social`, {
                cnaes: cnaes
            });
            
            if (response.data.objeto_social) {
                setObjetoSocial(response.data.objeto_social);
                toast.success('Objeto social gerado!');
            }
        } catch (error) {
            console.error('Erro ao gerar objeto social:', error);
            toast.error('Erro ao gerar objeto social');
        } finally {
            setGerandoObjeto(false);
        }
    };

    const formatarEnderecoSocio = (endereco) => {
        if (!endereco || typeof endereco !== 'object') return '';
        const parts = [];
        if (endereco.logradouro) parts.push(endereco.logradouro);
        if (endereco.numero) parts.push(endereco.numero);
        if (endereco.complemento) parts.push(endereco.complemento);
        if (endereco.bairro) parts.push(endereco.bairro);
        if (endereco.cidade && endereco.estado) parts.push(`${endereco.cidade}-${endereco.estado}`);
        if (endereco.cep) parts.push(`CEP ${endereco.cep}`);
        return parts.join(', ');
    };

    const handleGerarContrato = async () => {
        setProcessing(true);
        try {
            const formData = new FormData();
            formData.append('tipo_alteracao', 'constituicao');
            formData.append('descricao', `Constituição de ${razaoSocial}`);
            
            const uploadRes = await axios.post(`${API_URL}/api/minutas/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setProcessoId(uploadRes.data.id);
            
            const response = await axios.post(`${API_URL}/api/constituicao/gerar-contrato`, {
                minuta_id: uploadRes.data.id,
                empresa: {
                    razao_social: razaoSocial,
                    nome_fantasia: nomeFantasia,
                    capital_social: capitalSocial,
                    capital_extenso: capitalExtenso,
                    endereco: endereco,
                    objeto_social: objetoSocial
                },
                socios: socios.map(s => ({
                    nome: s.nome,
                    cpf: s.cpf,
                    rg: s.rg,
                    orgao_emissor: s.orgaoEmissor,
                    nacionalidade: s.nacionalidade,
                    estado_civil: s.estadoCivil,
                    regime_casamento: s.regimeCasamento,
                    profissao: s.profissao,
                    endereco: formatarEnderecoSocio(s.endereco),
                    participacao: s.participacao,
                    administrador: s.administrador
                })),
                cnaes: cnaes
            });
            
            if (response.data.contrato) {
                setContratoGerado(response.data.contrato);
                setProcessoId(response.data.minuta_id || uploadRes.data.id);
                toast.success('Contrato social gerado!');
                setStep(6);
                onComplete();
            }
        } catch (error) {
            console.error('Erro ao gerar contrato:', error);
            toast.error('Erro ao gerar contrato social');
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(contratoGerado);
        toast.success('Texto copiado!');
    };

    const downloadPDF = async () => {
        if (!processoId) return;
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${processoId}/download/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `contrato_social_${razaoSocial.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('PDF baixado!');
        } catch (e) {
            toast.error('Erro ao baixar PDF');
        }
    };

    const downloadWord = async () => {
        if (!processoId) return;
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${processoId}/download/word`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `contrato_social_${razaoSocial.replace(/\s+/g, '_')}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Word baixado!');
        } catch (e) {
            toast.error('Erro ao baixar Word');
        }
    };

    // Validação de cada etapa
    const canProceed = () => {
        switch (step) {
            case 1:
                return razaoSocial.trim() && capitalSocial.trim();
            case 2:
                return socios.every(s => {
                    const end = s.endereco && typeof s.endereco === 'object' ? s.endereco : {};
                    return s.nome.trim() && s.cpf.trim() && s.rg.trim() && s.orgaoEmissor.trim() && 
                           s.nacionalidade.trim() && s.estadoCivil && s.profissao.trim() &&
                           end.logradouro && end.numero && end.bairro && end.cidade && end.estado && end.cep;
                });
            case 3:
                const total = socios.reduce((acc, s) => acc + (parseFloat(s.participacao) || 0), 0);
                return total === 100;
            case 4:
                return endereco.logradouro && endereco.numero && endereco.bairro && 
                       endereco.cidade && endereco.estado && endereco.cep;
            case 5:
                return cnaes.length > 0 && objetoSocial.trim();
            default:
                return true;
        }
    };

    const stepLabels = ['Empresa', 'Sócios', 'Participação', 'Endereço', 'CNAEs', 'Resultado'];

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="border-b border-zinc-800 pb-4">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-red-500" />
                        Nova Constituição de Empresa
                    </DialogTitle>
                    <div className="flex items-center gap-1 mt-4">
                        {[1,2,3,4,5,6].map(s => (
                            <div key={s} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                    step >= s ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'
                                }`}>{s}</div>
                                {s < 6 && <div className={`w-8 h-1 ${step > s ? 'bg-red-600' : 'bg-zinc-800'}`} />}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 mt-1 px-1">
                        {stepLabels.map((label, i) => (
                            <span key={i} className={step === i + 1 ? 'text-red-500' : ''}>{label}</span>
                        ))}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Dados da Empresa */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-red-500" />
                                    Dados da Empresa
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Preencha os dados básicos. Campos com <span className="text-red-500">*</span> são obrigatórios.
                                </p>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Razão Social <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        value={razaoSocial}
                                        onChange={(e) => setRazaoSocial(e.target.value.toUpperCase())}
                                        placeholder="EMPRESA EXEMPLO LTDA"
                                        className="bg-zinc-950 border-zinc-800"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Nome Fantasia
                                    </Label>
                                    <Input
                                        value={nomeFantasia}
                                        onChange={(e) => setNomeFantasia(e.target.value)}
                                        placeholder="Nome comercial (opcional)"
                                        className="bg-zinc-950 border-zinc-800"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                            Capital Social <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">R$</span>
                                            <Input
                                                type="text"
                                                value={capitalSocial}
                                                onChange={handleCapitalChange}
                                                placeholder="0,00"
                                                className="bg-zinc-950 border-zinc-800 pl-10"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block flex items-center gap-2">
                                            Capital por Extenso
                                            <Sparkles className="w-3 h-3 text-red-500" />
                                            <span className="text-red-500 text-[10px] font-normal">(automático)</span>
                                        </Label>
                                        <Input
                                            value={capitalExtenso}
                                            readOnly
                                            placeholder="Gerado automaticamente"
                                            className="bg-zinc-950 border-zinc-800 text-zinc-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Qualificação dos Sócios */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-red-500" />
                                    Qualificação dos Sócios
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Todos os campos são <span className="text-red-500">obrigatórios</span> para evitar exigências da Junta Comercial.
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-4">
                                <Label className="text-zinc-400 text-sm">Número de sócios:</Label>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setNumSocios(Math.max(1, numSocios - 1))} className="border-zinc-700 h-8 w-8 p-0">-</Button>
                                    <span className="text-white font-medium w-8 text-center">{numSocios}</span>
                                    <Button size="sm" variant="outline" onClick={() => setNumSocios(numSocios + 1)} className="border-zinc-700 h-8 w-8 p-0">+</Button>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {socios.map((socio, index) => (
                                    <SocioCard
                                        key={index}
                                        socio={socio}
                                        index={index}
                                        onChange={(s) => handleSocioChange(index, s)}
                                        onRemove={() => handleRemoveSocio(index)}
                                        canRemove={socios.length > 1}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Participação Societária */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-red-500" />
                                    Participação Societária
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Defina a participação de cada sócio. A soma deve ser <span className="text-red-500">exatamente 100%</span>.
                                </p>
                            </div>
                            
                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-400">Capital Social Total:</span>
                                    <span className="text-xl font-bold text-white">R$ {capitalSocial || '0,00'}</span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-1">{capitalExtenso}</div>
                            </div>
                            
                            <TabelaParticipacao socios={socios} capitalSocial={capitalSocial} onUpdateParticipacao={handleUpdateParticipacao} />
                        </div>
                    )}

                    {/* Step 4: Endereço da Empresa */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-red-500" />
                                    Endereço da Empresa
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Todos os campos são <span className="text-red-500">obrigatórios</span>.
                                </p>
                            </div>
                            
                            <div className="flex justify-end mb-4">
                                <input ref={enderecoInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleEnderecoUpload} />
                                <Button variant="outline" onClick={() => enderecoInputRef.current?.click()} disabled={extraindoEndereco} className="border-red-600/50 text-red-500 hover:bg-red-600/10">
                                    {extraindoEndereco ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Preencher com IA
                                </Button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Logradouro <span className="text-red-500">*</span></Label>
                                        <Input value={endereco.logradouro} onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })} placeholder="Rua, Avenida, etc." className="bg-zinc-950 border-zinc-800" required />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Número <span className="text-red-500">*</span></Label>
                                        <Input value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} placeholder="123" className="bg-zinc-950 border-zinc-800" required />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Complemento</Label>
                                        <Input value={endereco.complemento} onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })} placeholder="Sala, Andar, etc." className="bg-zinc-950 border-zinc-800" />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Bairro <span className="text-red-500">*</span></Label>
                                        <Input value={endereco.bairro} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} placeholder="Bairro" className="bg-zinc-950 border-zinc-800" required />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Cidade <span className="text-red-500">*</span></Label>
                                        <Input value={endereco.cidade} onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })} placeholder="São Paulo" className="bg-zinc-950 border-zinc-800" required />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Estado <span className="text-red-500">*</span></Label>
                                        <Select value={endereco.estado} onValueChange={(v) => setEndereco({ ...endereco, estado: v })}>
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-700">
                                                {ESTADOS.map(uf => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">CEP <span className="text-red-500">*</span></Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                value={endereco.cep} 
                                                onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })} 
                                                placeholder="00000-000" 
                                                className="bg-zinc-950 border-zinc-800" 
                                                required 
                                            />
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                onClick={() => buscarCep(endereco.cep, setEndereco)}
                                                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                                            >
                                                <Search className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: CNAEs e Objeto Social */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-red-500" />
                                    CNAEs e Objeto Social
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Selecione os CNAEs e gere o objeto social automaticamente.
                                </p>
                            </div>
                            
                            <SeletorCNAEs cnaes={cnaes} onAdd={handleAddCnae} onRemove={handleRemoveCnae} />
                            
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-zinc-400 text-xs uppercase">Objeto Social <span className="text-red-500">*</span></Label>
                                    <Button size="sm" onClick={handleGerarObjetoSocial} disabled={cnaes.length === 0 || gerandoObjeto} className="bg-red-600 hover:bg-red-700">
                                        {gerandoObjeto ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        Gerar com IA
                                    </Button>
                                </div>
                                <Textarea value={objetoSocial} onChange={(e) => setObjetoSocial(e.target.value)} placeholder="Selecione os CNAEs e clique em 'Gerar com IA'..." className="bg-zinc-950 border-zinc-800 min-h-[150px]" required />
                            </div>
                        </div>
                    )}

                    {/* Step 6: Resultado */}
                    {step === 6 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Contrato Social Gerado</h3>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={downloadWord} className="bg-blue-600 hover:bg-blue-700">
                                        <FileText className="w-4 h-4 mr-2" /> Word
                                    </Button>
                                    <Button size="sm" onClick={downloadPDF} className="bg-red-600 hover:bg-red-700">
                                        <FileDown className="w-4 h-4 mr-2" /> PDF
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={copyToClipboard} className="border-zinc-700">
                                        <Copy className="w-4 h-4 mr-2" /> Copiar
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-white text-black rounded-lg p-6 max-h-[450px] overflow-y-auto border">
                                <pre className="text-sm whitespace-pre-wrap font-serif leading-relaxed" style={{fontFamily: 'Times New Roman, serif'}}>{contratoGerado}</pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-800 p-4 flex justify-between">
                    <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : handleClose()} className="border-zinc-700">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </Button>
                    
                    {step < 6 ? (
                        <Button onClick={() => step === 5 ? handleGerarContrato() : setStep(step + 1)} disabled={!canProceed() || processing} className="bg-red-600 hover:bg-red-700">
                            {processing ? (<><RefreshCw className="w-4 h-4 mr-1 animate-spin" />Gerando...</>) : step === 5 ? (<>Gerar Contrato<ChevronRight className="w-4 h-4 ml-1" /></>) : (<>Próximo<ChevronRight className="w-4 h-4 ml-1" /></>)}
                        </Button>
                    ) : (
                        <Button onClick={handleClose} className="bg-red-600 hover:bg-red-700">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Concluir
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WizardConstituicao;
