# SuVeCa v3.0 — Auditoria Semântica Adversarial (Read-Only Before)

> **Status:** `AUDIT COMPLETED` • **Filas de Reparo Cirúrgico Criadas**

## 🔬 1. Diagnóstico por Coleção Canônica

| Coleção | Total Inspecionado | PASS | SUSPICIOUS / INVALID | Diagnóstico Principal |
|---|:---:|:---:|:---:|---|
| **Regras (`rules`)** | 103 | 96 | 7 | 7 regras com scope 'syntax' em fonética/ortografia. |
| **Procedimentos (`procedures`)** | 413 | 384 | 29 | 29 procedimentos com fragmentos ASCII nos passos operacionais. |
| **Exemplos (`examples`)** | 1602 | 1489 | 113 | 113 exemplos com título de tabela como prompt ou contaminação sintática em A00. |
| **Armadilhas (`exam_traps`)** | 600 | 600 | 0 | 0 armadilhas com contaminação sintática em fonética. |
| **Misconceptions** | 46 | 46 | 0 | 600/600 traps cobertas (100%), 0 vazios. |
| **Questões Oficiais (Payload)** | 2588 | 2588 | 0 | 100% dos 2.588 payloads imutáveis preservados. |
| **Apresentação de Questões** | 2588 | 0 | 2588 | 2588 enunciados com URLs/rodapés de apostila na camada bruta. |
| **Objetivos de Aprendizagem** | 115 visões | 115 | 0 | 0 views com ID bruto `OBJ-IP-...` em vez do texto. |
| **Content AST (Árvores ASCII)** | 115 visões | 37 | 78 | 78 views contendo árvores com pipe sem conversão para AST. |

## 🎯 2. Resumo da Fila de Reparo Cirúrgico (`repair-queue.json`)

- **Regras para correção de Scope de Domínio:** 7
- **Procedimentos para limpeza de ASCII nos passos:** 29
- **Exemplos para enriquecimento cirúrgico de prompt/passos:** 113
- **Armadilhas para limpeza de sintaxe em fonética:** 0
- **Questões para criação da camada limpa de Apresentação:** 2588
- **Unidades para resolução do texto do Objetivo de Aprendizagem:** 0
- **Unidades para estruturação do Content AST:** 78