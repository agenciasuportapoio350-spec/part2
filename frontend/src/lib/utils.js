import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ============ MOEDA BRL ============

export function formatCurrency(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num || 0);
}

// Formata número para exibição no input (1234.56 -> "1.234,56")
export function formatCurrencyInput(value) {
  if (!value && value !== 0) return "";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse string formatada para número (1.234,56 -> 1234.56)
export function parseCurrencyInput(value) {
  if (!value) return 0;
  // Remove pontos de milhar e troca vírgula por ponto
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Máscara de moeda enquanto digita
export function maskCurrency(value) {
  // Remove tudo que não é número
  let v = value.replace(/\D/g, "");
  // Converte para centavos
  v = (parseInt(v) / 100).toFixed(2);
  // Formata para pt-BR
  return v === "NaN" ? "0,00" : parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============ DATAS (DATE-ONLY - SEM TIMEZONE) ============

// Retorna data de hoje como string "YYYY-MM-DD" (local, sem UTC)
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Formata "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss" para "DD/MM/YYYY" (sem new Date UTC)
export function formatDate(dateString) {
  if (!dateString) return "-";
  // Pega apenas a parte da data (antes do T se existir)
  const datePart = dateString.split("T")[0];
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "-";
  return `${day}/${month}/${year}`;
}

// Formata datetime ISO para "DD/MM/YYYY HH:mm"
export function formatDateTime(dateString) {
  if (!dateString) return "-";
  const [datePart, timePart] = dateString.split("T");
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "-";
  
  let time = "";
  if (timePart) {
    const [hour, minute] = timePart.split(":");
    time = ` ${hour}:${minute}`;
  }
  return `${day}/${month}/${year}${time}`;
}

// Verifica se a data é hoje (comparação de strings, sem timezone)
export function isToday(dateString) {
  if (!dateString) return false;
  const datePart = dateString.split("T")[0];
  const today = getTodayDateString();
  return datePart === today;
}

// Verifica se a data é passada (comparação de strings)
export function isPast(dateString) {
  if (!dateString) return false;
  const datePart = dateString.split("T")[0];
  const today = getTodayDateString();
  return datePart < today;
}

// Verifica se a data está nos próximos 7 dias
export function isThisWeek(dateString) {
  if (!dateString) return false;
  const datePart = dateString.split("T")[0];
  const today = getTodayDateString();
  
  // Calcula data de 7 dias à frente
  const now = new Date();
  now.setDate(now.getDate() + 7);
  const weekEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  
  return datePart >= today && datePart <= weekEnd;
}

export const PIPELINE_STAGES = {
  novo_lead: { label: "Novo Lead", color: "blue" },
  contato_feito: { label: "Contato Feito", color: "purple" },
  reuniao: { label: "Reunião", color: "amber" },
  proposta: { label: "Proposta", color: "cyan" },
  fechado: { label: "Fechado", color: "emerald" },
  perdido: { label: "Perdido", color: "red" },
};

export const TASK_TYPES = {
  onboarding: { label: "Onboarding", color: "violet" },
  recorrente: { label: "Recorrente", color: "blue" },
  follow_up: { label: "Follow-up", color: "amber" },
  outro: { label: "Outro", color: "slate" },
};

export const PAYMENT_TYPES = {
  pontual: { label: "Pontual", color: "blue" },
  recorrente: { label: "Recorrente", color: "emerald" },
};
