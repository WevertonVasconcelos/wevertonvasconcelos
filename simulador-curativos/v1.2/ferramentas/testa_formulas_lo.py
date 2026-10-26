# Insere a aba Simulador_Novo (exportada por exportar_painel.js) no XLSX em uso, preenche cenários,
# recalcula no LibreOffice e imprime os resultados das fórmulas. Gera cenarios_resultados.json.
# Uso: python3 testa_formulas_lo.py planilha.xlsx painel.json pasta_trabalho saida.json [reparar3x]
import json, os, subprocess, sys, openpyxl
SRC, PAINEL, DIR, SAIDA = sys.argv[1:5]
REPARAR = len(sys.argv) > 5
cel = json.load(open(PAINEL))['celulas']
ENT = ['C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14']
RES = ['E7', 'G7', 'E10', 'G10', 'G13', 'G14', 'G15', 'G16', 'G17', 'G18', 'G19', 'G20', 'B16', 'J2', 'J3', 'J4', 'J5']
CEN = {
    'aceite_alexandre': ['Alexandre', 1500, 6, 'Clínica Center', 'Pix', 60, 0, None, None],
    'domicilio_2x': ['Paciente B', 1000, 5, 'Domicílio', 'Cartão 2x', 50, None, 20, 50],
    'dinheiro': ['Paciente C', 1000, 5, 'Domicílio', 'Dinheiro', None, None, None, None],
    'cartao3x': ['Paciente D', 1000, 4, 'Clínica Center', 'Cartão 3x', 30, 10, 15, 25],
    'cartao1x': ['Paciente E', 1000, 5, 'Clínica Center', 'Cartão 1x', 50, None, None, None],
    'prejuizo': ['Paciente F', 300, 5, 'Clínica Center', 'Pix', 50, 10, 20, 15],
    'dizima': ['Paciente G', 1300, 6, 'Clínica Center', 'Pix', 60, None, None, None],
    'zero_curativos': ['X', 1000, 0, 'Clínica Center', 'Pix', None, None, None, None],
    'fracionado': ['X', 1000, 2.5, 'Clínica Center', 'Pix', None, None, None, None],
    'negativo': ['X', 1000, 5, 'Clínica Center', 'Pix', None, -10, None, None],
    'sem_nome': [None, 1000, 5, 'Domicílio', 'Pix', None, None, None, None],
    'vazio': [None] * 9,
}
os.makedirs(os.path.join(DIR, 'out'), exist_ok=True)
saida = {}
for nome, vals in CEN.items():
    wb = openpyxl.load_workbook(SRC)
    if REPARAR:
        c = wb['Configurações']; c.unmerge_cells('A17:B18'); c['B17'] = 0.084
    ws = wb.create_sheet('Simulador_Novo', 0)
    for k, v in cel.items():
        ws[k] = v
    for k, v in zip(ENT, vals):
        ws[k] = v
    p = os.path.join(DIR, nome + '.xlsx'); wb.save(p)
    subprocess.run(['soffice', '--headless', '--calc', '--convert-to', 'xlsx', '--outdir', os.path.join(DIR, 'out'), p],
                   capture_output=True, check=True)
    r = openpyxl.load_workbook(os.path.join(DIR, 'out', nome + '.xlsx'), data_only=True)['Simulador_Novo']
    res = {k: r[k].value for k in RES}
    saida[nome] = {'entradas': dict(zip(ENT, vals)), 'resultados': res}
    print(f"{nome:17s} líquido={res['E7']!r} margem={res['G7']!r} porCur={res['E10']!r} total={res['G20']!r} "
          f"| clín={res['G13']!r} oper={res['G14']!r} simp={res['G15']!r} mat={res['G16']!r} desl={res['G17']!r} "
          f"outr={res['G18']!r} fix={res['G19']!r} | {res['B16']}")
json.dump(saida, open(SAIDA, 'w'), ensure_ascii=False, indent=1)
