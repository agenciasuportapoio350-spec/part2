# RankFlow - Product Requirements Document

## Informações do Projeto
- **Nome:** RankFlow
- **Descrição:** Sistema de Gestão para Google Empresas
- **Stack:** React + Tailwind + Shadcn UI | FastAPI | MongoDB
- **Versão:** 1.1.0
- **Última Atualização:** 05/03/2026

---

## Problem Statement Original
Sistema de gestão para agências de marketing digital que gerenciam perfis de clientes no Google Empresas, com CRM, gestão de clientes, agenda de tarefas, controle financeiro e painel administrativo.

---

## User Personas

### 1. Gestor de Marketing
- Gerencia múltiplos clientes de Google Empresas
- Precisa de CRM para acompanhar leads
- Executa checklist de onboarding para novos clientes
- Monitora tarefas semanais recorrentes

### 2. Super Admin
- Gerencia todos os usuários do sistema
- Acessa logs de auditoria
- Pode impersonar usuários para suporte

---

## Core Requirements (Estáticos)

### Autenticação
- [x] Login com email/senha
- [x] Registro de novos usuários
- [x] JWT Token (24h)
- [x] Roles: USER, ADMIN, SUPER_ADMIN

### CRM
- [x] Pipeline de leads (6 estágios)
- [x] Conversão lead → cliente com escolha de plano
- [x] Modal pergunta plano ao fechar lead

### Clientes
- [x] Campo "plan": unico | recorrente
- [x] Separação por plano na interface
- [x] Checklist de onboarding (12 etapas) - igual para todos
- [x] Checklist semanal automático (apenas recorrentes)
- [x] Tarefas do cliente separadas da Agenda

### Agenda
- [x] Tarefas com data
- [x] Tipos: Onboarding, Recorrente, Follow-up, Outro
- [x] Vinculação com cliente ou lead
- [x] Apenas tarefas gerais (não inclui tarefas internas de cliente)

### Financeiro
- [x] Pagamentos vinculados a clientes
- [x] Tipos: Pontual e Recorrente
- [x] Datas em formato YYYY-MM-DD

### Dashboard
- [x] Tarefas do dia (apenas da Agenda)
- [x] Contagem de clientes
- [x] Alertas (leads parados, inadimplentes)

### Admin Master
- [x] Gestão de usuários
- [x] Logs de auditoria
- [x] Impersonação

---

## What's Been Implemented

### 05/03/2026 - Painel de Operação (v1.2.0)
1. ✅ Nova página /operations com listas filtradas por prioridade
2. ✅ Dashboard com contadores clicáveis (Atrasados/Pendentes/Onboarding)
3. ✅ API /operations/stats para estatísticas operacionais
4. ✅ Sidebar com link para Operação

### 05/03/2026 - Ajustes CRM/Clientes (v1.1.0)
1. ✅ Modal de escolha de plano ao converter lead (Recorrente/Único)
2. ✅ Tarefas do cliente NÃO vão mais para Agenda
3. ✅ Checklist inicial igual para todos (12 itens)

### 05/03/2026 - Correções de Auditoria (v1.0.0)
1. ✅ Bug crítico: API de clientes (campo plan faltando)
2. ✅ Checklist inicial com 12 etapas corretas
3. ✅ Separação de clientes por plano na UI (2 colunas)
4. ✅ Checklist semanal automático para recorrentes
5. ✅ Modais de confirmação (substituindo window.confirm)

### Arquivos Modificados (v1.2.0)
- `/app/backend/server.py` - Endpoint /operations/stats
- `/app/frontend/src/pages/OperationsPage.js` (novo)
- `/app/frontend/src/pages/DashboardPage.js` - Contadores de operação
- `/app/frontend/src/components/Layout.js` - Link na sidebar
- `/app/frontend/src/App.js` - Rota /operations

---

## Prioritized Backlog

### P0 - Crítico (Concluído)
- [x] Bug API clientes
- [x] Checklist 12 itens
- [x] Modais de confirmação
- [x] Escolha de plano na conversão
- [x] Separação tarefas cliente vs agenda

### P1 - Próximas Features
- [ ] Drag and drop no Kanban
- [ ] Notificações de lembretes
- [ ] Relatórios em PDF
- [ ] Filtros avançados por período
- [ ] Alerta visual quando checklist semanal está atrasado

### P2 - Futuro
- [ ] Integração com Google Calendar
- [ ] Multi-usuário/equipes
- [ ] Dashboard com gráficos avançados
- [ ] Importação de leads via CSV
- [ ] Integração com WhatsApp Business API

---

## Technical Architecture

### Frontend (Port 3000)
```
React 18 + Tailwind CSS + Shadcn UI
├── Context API (Auth)
├── React Router v6
├── Axios (API client)
└── Sonner (Toasts)
```

### Backend (Port 8001)
```
FastAPI + Motor (Async MongoDB)
├── JWT Authentication
├── Role-based Access Control
├── Pydantic Models
└── CORS middleware
```

### Database (Port 27017)
```
MongoDB Collections:
├── users
├── leads
├── clients (com checklist e weekly_tasks)
├── tasks (apenas tarefas da Agenda)
├── payments
└── audit_logs
```

---

## Next Tasks
1. Implementar alerta visual para checklist semanal atrasado
2. Adicionar drag and drop no pipeline CRM
3. Criar sistema de notificações
4. Implementar relatórios PDF

---

*Documento atualizado em 05/03/2026*
