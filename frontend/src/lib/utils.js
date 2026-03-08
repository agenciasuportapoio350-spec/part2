import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateString) {
  if (!dateString) return "-";
  // Criar data sem ajuste de timezone (para datas tipo YYYY-MM-DD)
  const parts = dateString.split("T")[0].split("-");
  if (parts.length === 3) {
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isToday(dateString) {
  if (!dateString) return false;
  // Extrair apenas a parte da data (YYYY-MM-DD)
  const datePart = dateString.split("T")[0];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return datePart === todayStr;
}

export function isPast(dateString) {
  if (!dateString) return false;
  // Extrair apenas a parte da data (YYYY-MM-DD)
  const datePart = dateString.split("T")[0];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  // Comparar strings de data (YYYY-MM-DD é comparável lexicograficamente)
  return datePart < todayStr;
}

export function isThisWeek(dateString) {
  if (!dateString) return false;
  // Extrair apenas a parte da data (YYYY-MM-DD)
  const datePart = dateString.split("T")[0];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
  
  return datePart >= todayStr && datePart <= weekEndStr;
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
  recorrente: { label: "Recorrente", color: "blue" },
  unico: { label: "Único", color: "slate" },
};

export const PAYMENT_TYPES = {
  pontual: { label: "Pontual", color: "blue" },
  recorrente: { label: "Recorrente", color: "emerald" },
};

// Máscara de moeda BRL
export function formatCurrencyInput(value) {
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Converte para centavos e formata
  const cents = parseInt(numbers, 10);
  const reais = cents / 100;
  
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrencyToNumber(value) {
  if (!value) return 0;
  // Remove R$, pontos e troca vírgula por ponto
  const clean = value.toString()
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(clean) || 0;
}
