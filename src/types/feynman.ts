export type ExplanationMode = 'text' | 'audio_batch' | 'live_voice';

export interface FeynmanDiagnosisFlashcard {
  front: string;
  back: string;
  hint?: string;
  explanation: string;
  sourceRefs: string[];
}

export interface FeynmanDiagnosis {
  masteryScore: number; // 0 a 100
  conceptualAccuracy: 'alta' | 'parcial' | 'insuficiente';
  strengths: string[]; // O que o aluno explicou corretamente com as próprias palavras
  conceptualGaps: string[]; // O que foi omitido ou distorcido (lacunas conceituais)
  bancaTrapAddressed: boolean; // Se o aluno identificou a pegadinha clássica da banca
  bancaFeedback: string; // Parecer do examinador / tutor socrático
  suggestedFlashcard?: FeynmanDiagnosisFlashcard;
  sourceRefs: string[]; // Identificadores da base editorial homologada
}

export interface FeynmanEvaluationRequest {
  userId?: string;
  sourceType: 'module_section' | 'pbl_case';
  sourceId: string; // ex: 'IP-A14-S01' ou 'pbl_case_01'
  topicTitle: string;
  targetRuleContext?: string;
  mode: ExplanationMode;
  userText?: string;
  audioBase64?: string;
  audioMimeType?: string;
}

export interface FeynmanSessionRecord {
  id: string;
  userId: string;
  sourceType: 'module_section' | 'pbl_case';
  sourceId: string;
  topicTitle: string;
  mode: ExplanationMode;
  userTranscriptOrText: string;
  diagnosis: FeynmanDiagnosis;
  createdAt: string;
}
