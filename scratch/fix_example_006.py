import json
from pathlib import Path

CANONICAL_DIR = Path(r"c:\Users\origi\OneDrive\Desktop\Códigos\Notebook LM\Português\Integracao_Pedagogica\v2\canonical")
examples = [json.loads(l) for l in open(CANONICAL_DIR / "examples.jsonl", encoding="utf-8") if l.strip()]

for ex in examples:
    if ex["entityId"] == "WORKED_EXAMPLE-IP-A00-G07-006":
        ex["commonMistake"] = "Confundir a preposição 'por' com a conjunção integrante 'que' com a conjunção causal 'porque'."
        ex["examTip"] = "Verbo transitivo indireto com preposição 'por' antes de conjunção integrante 'que' exige grafia separada (por que)."

with open(CANONICAL_DIR / "examples.jsonl", "w", encoding="utf-8") as f:
    for ex in examples:
        f.write(json.dumps(ex, ensure_ascii=False) + "\n")

print("Exemplo WORKED_EXAMPLE-IP-A00-G07-006 reparado com precisão semântica.")
