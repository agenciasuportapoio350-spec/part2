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
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isPast(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function isThisWeek(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  return date >= today && date <= weekEnd;
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
