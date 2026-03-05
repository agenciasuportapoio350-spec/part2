# AUDITORIA TÉCNICA - RankFlow

**Data:** 05/03/2026  
**Versão do Sistema:** 0.1.0  
**Stack:** React + Tailwind + Shadcn UI | FastAPI | MongoDB

---

## 1. FUNCIONALIDADES OK

### 1.1 Autenticação
- [x] Login com JWT funcionando
- [x] Registro de novos usuários
- [x] Proteção de rotas
- [x] Logout
- [x] Super Admin padrão criado automaticamente

### 1.2 CRM - Pipeline de Leads
- [x] Pipeline com 6 estágios: novo_lead, contato_feito, reuniao, proposta, fechado, perdido
- [x] Criação/edição/exclusão de leads
- [x] Campos: nome, email, telefone, empresa, valor do contrato
- [x] Próximo contato e lembretes
- [x] Botão WhatsApp nos leads

### 1.3 Clientes
- [x] Campo "Plano" implementado (unico/recorrente)
- [x] Criação manual de clientes
- [x] Edição de informações do cliente
- [x] Exclusão de cliente (com cascata para tarefas/pagamentos)
- [x] Botão WhatsApp nos clientes

### 1.4 Agenda
- [x] Criação de tarefas com data
- [x] Filtros: Hoje, Semana, Follow-ups, Todas
- [x] Tipos: Onboarding, Recorrente, Follow-up, Outro
- [x] Vinculação com cliente ou lead
- [x] Alerta de tarefas atrasadas

### 1.5 Financeiro
- [x] Pagamentos vinculados a clientes
- [x] Tipos: Pontual e Recorrente
- [x] Toggle pago/pendente
- [x] Filtros: Todos, Pagos, Pendentes, Em Atraso
- [x] Cards de estatísticas
- [x] Próximos vencimentos (7 dias)

### 1.6 Dashboard
- [x] Tarefas do dia listadas
- [x] Contagem de clientes
- [x] Alertas (leads parados, inadimplentes, meta)
- [x] Pipeline resumido

### 1.7 Admin Master
- [x] Gestão de usuários
- [x] Logs de auditoria
- [x] Impersonar usuários
- [x] Estatísticas globais

---

## 2. PROBLEMAS ENCONTRADOS

### 2.1 CRÍTICO - Bug na API de Clientes

**Arquivo:** `/app/backend/server.py`  
**Linhas:** 545-611 (convert_lead_to_client)

**Problema:** Quando um lead é convertido em cliente, o campo `plan` NÃO é adicionado ao documento. O `ClientResponse` exige o campo `plan`, causando erro 500.

```python
# ATUAL (server.py linha 565-577) - FALTA O CAMPO plan
client_doc = {
    "id": client_id,
    "name": lead["name"],
    # ... outros campos
    "checklist": checklist,
    # ❌ FALTA: "plan": "recorrente",  # ou valor do lead
}
```

**Impacto:** Clientes criados via conversão de lead não aparecem na listagem (500 Internal Server Error).

**Dados existentes no banco estão sem o campo `plan`:**
```
Keys: ['id', 'name', 'email', 'phone', 'company', 'contract_value', 'notes', 'checklist', 'user_id', 'created_at', 'updated_at']
Has plan?: False  ❌
```

---

### 2.2 CRÍTICO - Checklist Inicial Incorreto

**Requisito:** 12 etapas de checklist inicial  
**Atual:** 6 etapas na conversão, 4 etapas na criação manual

**Checklist na conversão de lead (server.py linha 556-563):**
```python
checklist = [
    "Revisão do perfil",
    "SEO descrição",
    "Inserção serviços",
    "Fotos",
    "Primeira postagem",
    "Pedido de avaliação",
]  # ❌ Apenas 6 itens
```

**Checklist na criação manual (server.py linha 633-638):**
```python
checklist = [
    "Criar NAP",
    "Solicitar Acesso ou Criar Perfil",
    "Solicitar Fotos e Imagens",
    "Editar Perfil",
]  # ❌ Apenas 4 itens
```

**Requisito - 12 etapas:**
1. Criar perfil / Reivindicar acesso
2. Revisão do Perfil / Editar
3. Coletar fotos / Imagens
4. Primeira postagem
5. Pedir avaliação
6. Segunda postagem
7. Responder avaliação
8. Terceira postagem
9. Quarta postagem
10. Responder avaliação
11. Revisar perfil
12. Enviar acesso ao cliente

---

### 2.3 MÉDIO - Checklist Semanal Incompleto

**Requisito:** Após completar os 12 itens iniciais, ativar automaticamente checklist semanal com 5 itens.

**Status Atual:**
- [x] Tarefas da semana existem (weekly_tasks)
- [x] Reset automático toda segunda-feira
- [ ] ❌ NÃO existe ativação automática após completar checklist inicial
- [ ] ❌ NÃO existe alerta visual quando checklist semanal está atrasado
- [ ] ❌ Checklist semanal não tem os itens padrão pré-definidos

**Itens padrão do checklist semanal (não implementado):**
1. Postagem 1 da semana
2. Postagem 2 da semana
3. Postagem 3 da semana
4. Pedido de avaliação
5. Resposta de avaliação

---

### 2.4 MÉDIO - Clientes Não Separados por Plano

**Requisito:** Clientes exibidos em 2 colunas (Plano Recorrente / Plano Único)

**Status Atual:** Todos os clientes em um único grid, sem separação por plano.

**Arquivo:** `/app/frontend/src/pages/ClientsPage.js`

---

### 2.5 MÉDIO - Conversão Automática Lead→Cliente Incompleta

**Requisito:** Quando estágio muda para "Fechado", automaticamente cria um cliente.

**Status Atual:**
- [x] Existe botão "Converter em Cliente" no menu do lead
- [ ] ❌ NÃO converte automaticamente quando estágio muda para "fechado"

A mudança de estágio é apenas um update simples:
```python
# CRMPage.js linha 88-96
const handleStageChange = async (leadId, newStage) => {
    await api.put(`/leads/${leadId}`, { stage: newStage });
    // ❌ Não verifica se newStage === "fechado" para converter
}
```

---

### 2.6 MÉDIO - Confirmação de Ações Inadequada

**Requisito:** Modal de confirmação antes de: Excluir, Concluir tarefas, Alterar estágio para perdido

**Status Atual:**
- [x] Exclusão usa `window.confirm()` - funciona mas é feio
- [ ] ❌ Concluir tarefa NÃO tem confirmação
- [ ] ❌ Alterar estágio para "perdido" NÃO tem confirmação

**Recomendação:** Usar AlertDialog do Shadcn UI em vez de `window.confirm()`

---

### 2.7 BAIXO - Máscara de Moeda Ausente

**Requisito:** Exibição de valores monetários com máscara BRL (R$ 1.234,56)

**Status Atual:**
- [x] Exibição formatada funciona (`formatCurrency` em utils.js)
- [ ] ❌ Input de valores usa `type="number"` nativo (sem máscara BRL)

O usuário digita `1234.56` em vez de `1.234,56`

---

### 2.8 BAIXO - Armazenamento de Datas

**Requisito:** Datas armazenadas como YYYY-MM-DD sem erro de timezone

**Status Atual:**
- [x] Backend armazena em ISO format
- [x] Frontend trata corretamente (utils.js linha 17-26 evita timezone issues)
- [x] Comparação de datas funciona sem problemas

**Testado e funcionando corretamente.**

---

## 3. MELHORIAS RECOMENDADAS

### 3.1 Prioridade ALTA

1. **Corrigir bug crítico de clientes sem plan**
   - Adicionar campo `plan` na conversão de lead
   - Migrar dados existentes no MongoDB
   - Tornar campo `plan` opcional no ClientResponse OU garantir valor default

2. **Implementar checklist correto com 12 etapas**
   - Atualizar array de checklist no backend
   - Consistência entre criação manual e conversão

3. **Ativar checklist semanal automaticamente**
   - Detectar quando todos os 12 itens iniciais estão completos
   - Criar tarefas semanais padrão
   - Adicionar alerta visual de atraso

4. **Separar clientes por plano**
   - Duas colunas na página de clientes
   - Filtrar por `plan === "recorrente"` e `plan === "unico"`

### 3.2 Prioridade MÉDIA

5. **Conversão automática Lead→Cliente**
   - Interceptar mudança de estágio para "fechado"
   - Perguntar se deseja converter ou apenas fechar

6. **Modais de confirmação com AlertDialog**
   - Substituir `window.confirm()` 
   - Adicionar confirmação em concluir tarefa
   - Adicionar confirmação em marcar como "perdido"

7. **Input de moeda com máscara**
   - Usar biblioteca de máscara (react-number-format)
   - Exibir R$ 1.234,56 enquanto digita

### 3.3 Prioridade BAIXA

8. **Drag and Drop no Kanban**
   - Usar @dnd-kit/core ou react-beautiful-dnd

9. **Exportar relatórios em PDF**

10. **Filtros avançados por período**

---

## 4. RISCOS TÉCNICOS

### 4.1 Dados Inconsistentes no MongoDB
- Clientes existentes **não possuem** o campo `plan`
- Necessário migration script para corrigir

### 4.2 Response Model Rígido
- `ClientResponse` exige campo `plan` que pode não existir
- Opção: tornar `plan` opcional (`Optional[str] = None`)

### 4.3 Duplicação de Lógica
- Checklist de onboarding definido em 2 lugares diferentes:
  - `convert_lead_to_client` (6 itens)
  - `create_client` (4 itens)
- **Recomendação:** Criar constante única `DEFAULT_CHECKLIST`

### 4.4 Falta de Validação
- Não existe validação se lead já foi convertido
- Pode criar clientes duplicados do mesmo lead

---

## 5. ARQUIVOS PRINCIPAIS DO PROJETO

### Backend
```
/app/backend/
├── server.py          # API FastAPI (1552 linhas)
├── requirements.txt   # Dependências Python
└── .env               # Variáveis de ambiente
```

### Frontend
```
/app/frontend/src/
├── App.js                    # Rotas principais
├── App.css                   # Estilos customizados
├── index.js                  # Entry point
├── contexts/
│   └── AuthContext.js        # Contexto de autenticação
├── lib/
│   ├── api.js                # Axios config
│   └── utils.js              # Helpers (formatCurrency, formatDate, etc)
├── components/
│   ├── Layout.js             # Layout principal
│   ├── AdminLayout.js        # Layout admin
│   ├── ErrorBoundary.js      # Error handler
│   └── ui/                   # Componentes Shadcn UI (46 arquivos)
└── pages/
    ├── LoginPage.js          # Tela de login/registro
    ├── DashboardPage.js      # Dashboard principal
    ├── CRMPage.js            # Pipeline Kanban
    ├── ClientsPage.js        # Lista de clientes
    ├── ClientDetailPage.js   # Perfil do cliente
    ├── AgendaPage.js         # Agenda/tarefas
    ├── FinancePage.js        # Controle financeiro
    └── admin/
        ├── AdminDashboardPage.js
        ├── AdminUsersPage.js
        ├── AdminUserDetailPage.js
        └── AdminAuditPage.js
```

### Banco de Dados (MongoDB)
```
Collections:
- users      # Usuários do sistema
- leads      # Leads do CRM
- clients    # Clientes convertidos
- tasks      # Tarefas da agenda
- payments   # Pagamentos (não existe ainda, usar via clients)
- audit_logs # Logs de auditoria admin
```

---

## 6. RESUMO EXECUTIVO

| Categoria | Status |
|-----------|--------|
| Autenticação | ✅ OK |
| CRM Pipeline | ✅ OK |
| Conversão Lead→Cliente | ⚠️ Bug crítico |
| Gestão de Clientes | ⚠️ Incompleto |
| Checklist Inicial | ❌ Incorreto (6 itens vs 12) |
| Checklist Semanal | ❌ Não implementado |
| Separação por Plano | ❌ Não implementado |
| Agenda | ✅ OK |
| Financeiro | ✅ OK |
| Dashboard | ✅ OK |
| Modais de Confirmação | ⚠️ Parcial |
| Admin Master | ✅ OK |

**Próximo Passo Recomendado:** Corrigir o bug crítico de clientes sem `plan` que está causando erro 500 na API.

---

*Auditoria realizada por E1 - Emergent Agent*
