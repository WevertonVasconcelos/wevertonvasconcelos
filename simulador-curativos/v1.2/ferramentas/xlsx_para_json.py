# Converte o XLSX em uso (v1.1) para JSON {aba: {A1: valor}} com os valores calculados, para o teste em Node.
import json, sys, datetime, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
mesc = {ws.title: [str(r) for r in ws.merged_cells.ranges] for ws in wb}
out = {}
for ws in wb:
    d = {}
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if v is None: continue
            if isinstance(v, datetime.datetime): v = {'data': v.isoformat()}
            d[c.coordinate] = v
    out[ws.title] = {'celulas': d, 'mescladas': mesc[ws.title]}
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
