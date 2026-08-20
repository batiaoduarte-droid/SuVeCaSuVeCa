/**
 * Study Visual Tokens - Gramática Semântica Pedagógica
 * 
 * Define cores, ícones, bordas e estilos para cada tipo de conhecimento.
 * Elimina duplicação de classes e garante coerência cognitiva.
 */

export type StudyTone =
  | 'rule'        // Regra/norma: teal/verde escuro, balança/check
  | 'procedure'   // Procedimento/passo: azul/ciano, passos numerados
  | 'contrast'    // Contraste: divisão dual, comparação
  | 'example'     // Exemplo resolvido: verde suave / raciocínio guiado
  | 'trap'        // Pegadinha de banca: âmbar/laranja
  | 'exception'   // Exceção/limite: violeta/púrpura
  | 'mnemonic'    // Memorização rápida: amarelo/âmbar dourado
  | 'concept'     // Conceito/taxonomia: slate/teal neutro
  | 'question'    // Questão/avaliação: azul institucional
  | 'suveca';     // Ordem canônica SuVeCA: paleta canônica

export interface StudyToneConfig {
  tone: StudyTone;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  surfaceBg: string;
  surfaceBorder: string;
  accentColor: string;
  headerBg: string;
  headerText: string;
  highlightText: string;
}

export const STUDY_TONES: Record<StudyTone, StudyToneConfig> = {
  rule: {
    tone: 'rule',
    label: 'Regra Decisiva',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-900',
    badgeBorder: 'border-teal-300',
    surfaceBg: 'bg-teal-50/40',
    surfaceBorder: 'border-teal-200',
    accentColor: 'text-teal-700',
    headerBg: 'bg-teal-900',
    headerText: 'text-white',
    highlightText: 'text-teal-950',
  },
  procedure: {
    tone: 'procedure',
    label: 'Roteiro de Resolução',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-900',
    badgeBorder: 'border-sky-300',
    surfaceBg: 'bg-sky-50/30',
    surfaceBorder: 'border-sky-200',
    accentColor: 'text-sky-700',
    headerBg: 'bg-sky-900',
    headerText: 'text-white',
    highlightText: 'text-sky-950',
  },
  contrast: {
    tone: 'contrast',
    label: 'Contraste de Prova',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    surfaceBg: 'bg-slate-50/60',
    surfaceBorder: 'border-slate-200',
    accentColor: 'text-slate-700',
    headerBg: 'bg-slate-800',
    headerText: 'text-white',
    highlightText: 'text-slate-900',
  },
  example: {
    tone: 'example',
    label: 'Exemplo Comentado',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
    surfaceBg: 'bg-emerald-50/30',
    surfaceBorder: 'border-emerald-200',
    accentColor: 'text-emerald-700',
    headerBg: 'bg-emerald-900',
    headerText: 'text-white',
    highlightText: 'text-emerald-950',
  },
  trap: {
    tone: 'trap',
    label: 'Pegadinha de Banca',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    surfaceBg: 'bg-amber-50/40',
    surfaceBorder: 'border-amber-200',
    accentColor: 'text-amber-700',
    headerBg: 'bg-amber-800',
    headerText: 'text-white',
    highlightText: 'text-amber-950',
  },
  exception: {
    tone: 'exception',
    label: 'Exceção / Limite',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
    surfaceBg: 'bg-purple-50/30',
    surfaceBorder: 'border-purple-200',
    accentColor: 'text-purple-700',
    headerBg: 'bg-purple-900',
    headerText: 'text-white',
    highlightText: 'text-purple-950',
  },
  mnemonic: {
    tone: 'mnemonic',
    label: 'Memorização Rápida',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-950',
    badgeBorder: 'border-yellow-400',
    surfaceBg: 'bg-yellow-50/30',
    surfaceBorder: 'border-yellow-200',
    accentColor: 'text-yellow-800',
    headerBg: 'bg-yellow-800',
    headerText: 'text-white',
    highlightText: 'text-yellow-950',
  },
  concept: {
    tone: 'concept',
    label: 'Conceito & Taxonomia',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    surfaceBg: 'bg-white',
    surfaceBorder: 'border-slate-200',
    accentColor: 'text-teal-700',
    headerBg: 'bg-teal-950',
    headerText: 'text-white',
    highlightText: 'text-slate-900',
  },
  question: {
    tone: 'question',
    label: 'Questão Oficial',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-900',
    badgeBorder: 'border-indigo-300',
    surfaceBg: 'bg-white',
    surfaceBorder: 'border-indigo-200',
    accentColor: 'text-indigo-700',
    headerBg: 'bg-indigo-900',
    headerText: 'text-white',
    highlightText: 'text-indigo-950',
  },
  suveca: {
    tone: 'suveca',
    label: 'Método SuVeCA',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-900',
    badgeBorder: 'border-teal-300',
    surfaceBg: 'bg-teal-950/5',
    surfaceBorder: 'border-teal-300',
    accentColor: 'text-teal-800',
    headerBg: 'bg-gradient-to-r from-teal-950 to-teal-800',
    headerText: 'text-white',
    highlightText: 'text-teal-950',
  },
};

export const SUVECA_BLOCK_COLORS = {
  su: {
    tag: 'SU',
    name: 'Sujeito',
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    border: 'border-blue-500',
    bg: 'bg-blue-50/70',
    text: 'text-blue-950',
    pill: 'bg-blue-800 text-white',
  },
  ve: {
    tag: 'VE',
    name: 'Verbo',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    border: 'border-emerald-500',
    bg: 'bg-emerald-50/70',
    text: 'text-emerald-950',
    pill: 'bg-emerald-800 text-white',
  },
  c: {
    tag: 'C',
    name: 'Complementos',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    border: 'border-amber-500',
    bg: 'bg-amber-50/70',
    text: 'text-amber-950',
    pill: 'bg-amber-800 text-white',
  },
  a: {
    tag: 'A',
    name: 'Adjuntos',
    badge: 'bg-purple-100 text-purple-900 border-purple-300',
    border: 'border-purple-500',
    bg: 'bg-purple-50/70',
    text: 'text-purple-950',
    pill: 'bg-purple-800 text-white',
  },
  pred: {
    tag: 'PRED',
    name: 'Predicativo',
    badge: 'bg-rose-100 text-rose-900 border-rose-300',
    border: 'border-rose-500',
    bg: 'bg-rose-50/70',
    text: 'text-rose-950',
    pill: 'bg-rose-800 text-white',
  },
};
