# RankFlow - Product Requirements Document

## Visão Geral
**Nome:** RankFlow  
**Tipo:** SaaS MVP  
**Público-alvo:** Gestores de Google Empresas, pequenos empresários, agências de marketing digital  
**Idioma:** Português (Brasil)  
**Moeda:** BRL (R$)

## Problem Statement Original
Desenvolver um SaaS MVP chamado RankFlow - sistema operacional para gestores de Google Empresas com foco em organização de vendas, entrega e financeiro.

## User Personas
1. **Gestor de Google Empresas** - Gerencia múltiplos clientes de Google Meu Negócio
2. **Agência de Marketing Digital** - Oferece serviços de gestão para clientes locais
3. **Consultor de SEO Local** - Trabalha com otimização de perfis empresariais

## Core Requirements (MVP)
- [x] Autenticação JWT (registro/login)
- [x] CRM de Vendas com Pipeline visual (Kanban)
- [x] Gestão de Clientes com checklist de onboarding
- [x] Tarefas recorrentes mensais
- [x] Agenda com filtros (hoje/semana/follow-ups)
- [x] Controle financeiro básico

## Arquitetura Técnica
- **Frontend:** React + TailwindCSS + Shadcn UI
- **Backend:** FastAPI + MongoDB
- **Autenticação:** JWT com bcrypt
- **Design:** Minimalista corporativo (Plus Jakarta Sans + DM Sans + JetBrains Mono)

## O que foi Implementado (22/02/2026)

### Módulos Completos
1. **Autenticação**
   - Registro de usuários
   - Login com JWT
   - Proteção de rotas

2. **CRM de Vendas**
   - Pipeline Kanban: Novo Lead → Contato Feito → Reunião → Proposta → Fechado → Perdido
   - Criação/edição/exclusão de leads
   - Campo de valor do contrato
   - Próximo contato e lembretes
   - Conversão de lead para cliente

3. **Gestão de Clientes**
   - Lista de clientes com busca
   - Detalhes do cliente
   - Checklist automático de onboarding (6 itens)
   - Tarefas recorrentes criadas automaticamente

4. **Agenda**
   - Filtros: Hoje, Semana, Follow-ups, Todas
   - Criação de tarefas
   - Tipos: Onboarding, Recorrente, Follow-up, Outro
   - Vinculação com cliente ou lead

5. **Financeiro**
   - Cards de estatísticas (recebido/pendente/previsto)
   - Tabela de pagamentos
   - Tipos: Pontual ou Recorrente
   - Toggle de status pago/pendente

6. **Dashboard**
   - Estatísticas gerais
   - Pipeline de vendas resumido
   - Receita do mês

## Prioritized Backlog

### P0 (MVP - Concluído)
- [x] Autenticação básica
- [x] CRUD de leads
- [x] Pipeline visual
- [x] Conversão lead → cliente
- [x] Checklist de onboarding
- [x] Tarefas recorrentes
- [x] Agenda com filtros
- [x] Controle financeiro

### P1 (Próximas Features)
- [ ] Drag and drop no Kanban
- [ ] Notificações de lembretes
- [ ] Relatórios em PDF
- [ ] Filtros avançados por período
- [ ] Edição de clientes

### P2 (Futuro)
- [ ] Integração com Google Calendar
- [ ] Multi-usuário/equipes
- [ ] Dashboard com gráficos
- [ ] Importação de leads via CSV
- [ ] API pública

## Next Action Items
1. Implementar drag-and-drop no pipeline Kanban
2. Adicionar edição de dados do cliente
3. Sistema de notificações para lembretes
4. Gráficos de evolução no dashboard
