#!/usr/bin/env bash
# Roda toda a bateria de testes da v1.2 sobre um XLSX exportado da planilha em uso.
# Uso: ./rodar_testes.sh caminho/para/planilha_em_uso.xlsx
# Requer: python3 + openpyxl, LibreOffice (soffice), Node.js.
set -euo pipefail
XLSX="$1"
AQUI="$(cd "$(dirname "$0")" && pwd)"
GS="$AQUI/../apps-script/Codigo.gs"
T="$(mktemp -d)"
python3 -I "$AQUI/xlsx_para_json.py" "$XLSX" "$T/planilha.json"
node "$AQUI/exportar_painel.js" "$GS" "$T/planilha.json" "$T/painel.json"
python3 -I "$AQUI/testa_formulas_lo.py" "$XLSX" "$T/painel.json" "$T/lo" "$T/cenarios.json"
node "$AQUI/teste_script.js" "$GS" "$T/planilha.json" "$T/cenarios.json"
