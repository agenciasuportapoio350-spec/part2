# RankFlow - Product Requirements Document

## Informações do Projeto
- **Nome:** RankFlow
- **Descrição:** Sistema de Gestão para Google Empresas
- **Stack:** React + Tailwind + Shadcn UI | FastAPI | MongoDB
- **Versão:** 1.0.0
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
- [x] Conversão automática lead → cliente

### Clientes
- [x] Campo "plan": unico | recorrente
- [x] Separação por plano na interface
- [x] Checklist de onboarding (12 etapas)
- [x] Checklist semanal automático

### Agenda
- [x] Tarefas com data
- [x] Tipos: Onboarding, Recorrente, Follow-up, Outro
- [x] Vinculação com cliente ou lead

### Financeiro
- [x] Pagamentos vinculados a clientes
- [x] Tipos: Pontual e Recorrente
- [x] Datas em formato YYYY-MM-DD

### Dashboard
- [x] Tarefas do dia
- [x] Contagem de clientes
- [x] Alertas (leads parados, inadimplentes)

### Admin Master
- [x] Gestão de usuários
- [x] Logs de auditoria
- [x] Impersonação

---

## What's Been Implemented

### 05/03/2026 - Correções de Auditoria
1. ✅ Bug crítico: API de clientes (campo plan faltando)
2. ✅ Checklist inicial com 12 etapas corretas
3. ✅ Separação de clientes por plano na UI (2 colunas)
4. ✅ Checklist semanal automático para recorrentes
5. ✅ Modais de confirmação (substituindo window.confirm)

### Arquivos Modificados
- `/app/backend/server.py`
- `/app/frontend/src/pages/ClientsPage.js`
- `/app/frontend/src/pages/CRMPage.js`
- `/app/frontend/src/pages/AgendaPage.js`
- `/app/frontend/src/pages/FinancePage.js`
- `/app/frontend/src/components/ConfirmDialog.js` (novo)

### Migrações
- MongoDB: Adicionado `plan: "unico"` a clientes existentes

---

## Prioritized Backlog

### P0 - Crítico (Concluído)
- [x] Bug API clientes
- [x] Checklist 12 itens
- [x] Modais de confirmação

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
├── clients
├── tasks
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
