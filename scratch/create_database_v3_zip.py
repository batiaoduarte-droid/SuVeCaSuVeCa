#!/usr/bin/env python3
"""
scratch/create_database_v3_zip.py

Empacota a Base de Dados Pedagógica Completa do SuVeCa v3 em um arquivo ZIP consolidado.
Inclui:
1. Coleções Canônicas (21 coleções JSONL enriquecidas);
2. Visões de Apresentação (115 View Models JSON + manifesto);
3. Relatórios de Governança Editorial (98 casos finais adjudicados);
4. Relatórios de Auditoria e Hardening Semântico (QA e comparativo antes/depois);
5. Schemas e Manifestos.
"""

import os
import zipfile
import json
from pathlib import Path

ROOT = Path(r"c:\Users\origi\OneDrive\Desktop\Códigos")
CANONICAL_V2 = ROOT / "Notebook LM" / "Português" / "Integracao_Pedagogica" / "v2"
APP_DIR = ROOT / "SuVeCaSuVeCa"
VIEWS_DIR = APP_DIR / "public" / "knowledge" / "pedagogical" / "views"
QA_DIR = APP_DIR / "qa" / "semantic-hardening"

ZIP_OUTPUT = ROOT / "suveca_base_dados_pedagogica_v3_completa.zip"

print(f"Criando arquivo ZIP: {ZIP_OUTPUT}")

# Criar manifesto formal v3 para o pacote
manifest_v3 = {
    "packageName": "suveca-pedagogical-database-v3",
    "version": "3.0.0",
    "releaseDate": "2026-08-18",
    "status": "final_production",
    "editorialGovernance": {
        "adjudicatedCases": 98,
        "publicationStatus": "final",
        "reopenPolicy": "explicit_only",
        "anomalousExamBoardCases": 19,
        "officialQuestionsImmutability": True
    },
    "metrics": {
        "totalPedagogicalUnits": 115,
        "standardUnitsA00_A13": 102,
        "cumulativeReviewsA14": 13,
        "explanationBlocks": 11098,
        "canonicalTables": 364,
        "tablesEmbeddedInViews": 315,
        "canonicalRules": 103,
        "decisionProcedures": 413,
        "criticalContrasts": 211,
        "workedExamples": 1602,
        "examTraps": 600,
        "misconceptionArchetypes": 46,
        "officialQuestionsCorpus": 2588,
        "questionBlocksLinked": 466,
        "questionPedagogyRecords": 466,
        "uniqueOfficialQuestionsLinked": 257,
        "knowledgeGraphRelations": 1687,
        "claimLevelEvidenceLinks": 981,
        "learningObjectives": 190,
        "retrievalSummaries": 102,
        "editorialDecisions": 181
    },
    "viewModels": {
        "viewSchemaVersion": "1.0.0",
        "totalGeneratedViews": 115,
        "unresolvedRefs": 0,
        "unknownBlockTypes": 0
    }
}

with zipfile.ZipFile(ZIP_OUTPUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
    # 1. Manifesto Principal v3
    zipf.writestr("manifest_v3.json", json.dumps(manifest_v3, indent=2, ensure_ascii=False))
    
    # 2. README do Pacote
    readme_content = """# Base de Dados Pedagógica Canônica SuVeCa v3.0

Esta base de dados representa o acervo pedagógico consolidado e enriquecido do ecossistema SuVeCa (v3.0.0).

## Estrutura do Pacote

- `canonical/`: 21 coleções canônicas em formato JSONL com integridade relacional estrita (regras, procedimentos, contrastes, exemplos, armadilhas, misconceptions, questões oficiais imutáveis, Question Intelligence, grafos e evidências).
- `views/`: 115 View Models JSON pré-compilados prontos para consumo por frontends React/Web (102 unidades regulares A00–A13 + 13 revisões cumulativas A14) com 0 broken refs.
- `governance/`: Relatórios completos de decisões editoriais e os 98 casos finais de conciliação normativa adjudicados.
- `qa/`: Relatórios de auditoria de linha de base (baseline), auditoria final e comparativo antes/depois do refinamento semântico.
"""
    zipf.writestr("README.md", readme_content)

    # 3. Coleções Canônicas (canonical/*.jsonl)
    canonical_dir = CANONICAL_V2 / "canonical"
    for file in sorted(canonical_dir.glob("*.jsonl")):
        zipf.write(file, f"canonical/{file.name}")
        print(f"  + canonical/{file.name}")

    # 4. View Models (views/*.json)
    for file in sorted(VIEWS_DIR.glob("*.json")):
        zipf.write(file, f"views/{file.name}")
    print(f"  + 115 View Models + manifest em views/")

    # 5. Governança e Relatórios Editoriais
    if (ROOT / "relatorio_incertezas_editoriais_normativas.md").exists():
        zipf.write(ROOT / "relatorio_incertezas_editoriais_normativas.md", "governance/relatorio_incertezas_editoriais_normativas.md")
    if (ROOT / "relatorio_incertezas_editoriais_normativas.json").exists():
        zipf.write(ROOT / "relatorio_incertezas_editoriais_normativas.json", "governance/relatorio_incertezas_editoriais_normativas.json")
    if (CANONICAL_V2 / "DECISOES_EDITORIAIS_PENDENTES.md").exists():
        zipf.write(CANONICAL_V2 / "DECISOES_EDITORIAIS_PENDENTES.md", "governance/DECISOES_EDITORIAIS_ORIGINAIS.md")
    print(f"  + Relatórios de governança em governance/")

    # 6. Auditoria de QA e Hardening Semântico
    for file in sorted(QA_DIR.glob("*")):
        if file.is_file():
            zipf.write(file, f"qa/{file.name}")
    print(f"  + Relatórios de QA em qa/")

size_mb = ZIP_OUTPUT.stat().st_size / (1024 * 1024)
print(f"\n=======================================================")
print(f"ZIP Gerado com Sucesso: {ZIP_OUTPUT}")
print(f"Tamanho Final: {size_mb:.2f} MB ({ZIP_OUTPUT.stat().st_size} bytes)")
print(f"=======================================================")
