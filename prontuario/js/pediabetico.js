// ============================================================
// AVALIAÇÃO DO PÉ DIABÉTICO
// Baseada nas diretrizes do IWGDF 2023:
//  - Prevenção (Bus et al., 2023): rastreio de perda da sensibilidade protetora (PSP)
//    e de doença arterial periférica (DAP); categorias de risco 0 a 3.
//  - DAP (IWGDF/ESVS/SVS, Fitridge et al., 2023): pulsos, Doppler, ITB, ITD,
//    pressão do hálux e TcPO2.
//  - Infecção (IWGDF/IDSA, Senneville et al., 2023): graus 1 a 4 e (O) para osteomielite.
//  - Classificação (Monteiro-Soares et al., 2023): SINBAD para comunicação
//    (descrever cada item, não só o total) e WIfI quando há DAP.
// Os cálculos são apoio à decisão: a conclusão é sempre da enfermeira.
// ============================================================
import { h, numeroOuNulo, numeroBR } from "./util.js";
import { areaLesao, folhaEl, lerCampos } from "./formulario.js";
import { camposDe } from "./campos.js";

const PE = (lado, sufixo) => [
  { id: "pd_mono_" + sufixo, rotulo: "Monofilamento 10 g — NÃO sentiu em:", tipo: "marcar", colunas: 1, opcoes: ["Hálux", "1ª cabeça do metatarso", "3ª cabeça do metatarso", "5ª cabeça do metatarso"] },
  { id: "pd_vibra_" + sufixo, rotulo: "Diapasão 128 Hz (hálux)", tipo: "radio", colunas: 1, opcoes: ["Presente", "Ausente"] },
];
const PULSOS = (sufixo) => [
  { id: "pd_pedioso_" + sufixo, rotulo: "Pulso pedioso", tipo: "radio", colunas: 1, opcoes: ["Presente", "Diminuído", "Ausente"] },
  { id: "pd_tibial_" + sufixo, rotulo: "Pulso tibial posterior", tipo: "radio", colunas: 1, opcoes: ["Presente", "Diminuído", "Ausente"] },
  { id: "pd_doppler_" + sufixo, rotulo: "Onda ao Doppler", tipo: "opcao", opcoes: ["Trifásica", "Bifásica", "Monofásica", "Não realizado"] },
];

export const PE_DIABETICO = {
  titulo: ["AVALIAÇÃO DO", "PÉ DIABÉTICO"],
  roxo: true,
  colunas: [
    [
      {
        tipo: "caixa", rotulo: "Histórico e fatores de risco",
        campos: [
          { id: "pd_historia", tipo: "marcar", colunas: 1, opcoes: ["Úlcera prévia no pé", "Amputação menor prévia", "Amputação maior prévia", "Doença renal em estágio final / diálise", "Revascularização prévia", "Pé de Charcot prévio"] },
          { tipo: "grade", campos: [{ id: "pd_tempo_dm", rotulo: "Tempo de DM:", tipo: "numero", unidade: "anos" }] },
        ],
      },
      { tipo: "caixa", rotulo: "Sintomas", campos: [{ id: "pd_sintomas", tipo: "marcar", opcoes: ["Dormência / formigamento", "Queimação / dor neuropática", "Claudicação intermitente", "Dor em repouso", "Pés frios"] }] },
      {
        tipo: "caixa", rotulo: "Neuropatia (sensibilidade protetora)",
        campos: [
          { tipo: "lado", campos: [{ tipo: "caixa", rotulo: "Pé direito", campos: PE("direito", "d") }, { tipo: "caixa", rotulo: "Pé esquerdo", campos: PE("esquerdo", "e") }] },
          { id: "pd_ipswich", rotulo: "Teste do toque de Ipswich (se não houver monofilamento)", tipo: "radio", opcoes: ["Normal", "Alterado", "Não realizado"] },
          { id: "pd_psp", rotulo: "Conclusão: perda da sensibilidade protetora?", tipo: "radio", opcoes: ["Não", "Sim"] },
        ],
      },
      {
        tipo: "caixa", rotulo: "Deformidades e pele",
        campos: [
          { id: "pd_deformidades", tipo: "marcar", opcoes: ["Dedos em garra / martelo", "Hálux valgo", "Cabeças de metatarsos proeminentes", "Pé cavo", "Mobilidade articular limitada", "Charcot ativo (pé quente e edemaciado)", "Charcot crônico", "Amputação de dedo / raio"] },
          { id: "pd_pele", rotulo: "Lesões pré-ulcerativas e pele", tipo: "marcar", opcoes: ["Calosidade", "Hemorragia em calo", "Bolha", "Fissuras", "Micose interdigital", "Onicomicose", "Unha encravada / espessada", "Pele seca"] },
          { id: "pd_temp", rotulo: "Diferença de temperatura entre os pés > 2 °C?", tipo: "simnao", compacto: true },
        ],
      },
    ],
    [
      {
        tipo: "caixa", rotulo: "Doença arterial periférica (DAP)",
        campos: [
          { tipo: "lado", campos: [{ tipo: "caixa", rotulo: "Pé direito", campos: PULSOS("d") }, { tipo: "caixa", rotulo: "Pé esquerdo", campos: PULSOS("e") }] },
          {
            tipo: "grade",
            campos: [
              { id: "pd_itb_d", rotulo: "ITB D:", tipo: "numero" },
              { id: "pd_itd_d", rotulo: "ITD D:", tipo: "numero" },
              { id: "pd_ph_d", rotulo: "P. hálux D:", tipo: "numero", unidade: "mmHg" },
              { id: "pd_itb_e", rotulo: "ITB E:", tipo: "numero" },
              { id: "pd_itd_e", rotulo: "ITD E:", tipo: "numero" },
              { id: "pd_ph_e", rotulo: "P. hálux E:", tipo: "numero", unidade: "mmHg" },
              { id: "pd_tcpo2", rotulo: "TcPO2:", tipo: "numero", unidade: "mmHg" },
            ],
          },
          { id: "pd_dap", rotulo: "Conclusão: DAP?", tipo: "radio", opcoes: ["Não", "Sim", "Investigar"] },
        ],
      },
      {
        tipo: "caixa", rotulo: "Infecção (IWGDF/IDSA)",
        campos: [
          { id: "pd_inf_local", rotulo: "Sinais locais (2 ou mais = infecção)", tipo: "marcar", colunas: 1, opcoes: ["Edema ou endurecimento local", "Eritema > 0,5 cm ao redor da ferida", "Dor ou sensibilidade local", "Calor local", "Secreção purulenta"] },
          { tipo: "grade", campos: [{ id: "pd_inf_eritema", rotulo: "Eritema a partir da borda:", tipo: "numero", unidade: "cm" }] },
          { id: "pd_inf_profunda", rotulo: "Atinge estruturas profundas (abscesso, músculo, tendão, articulação, osso)?", tipo: "simnao" },
          { id: "pd_inf_sirs", rotulo: "Sinais sistêmicos (SIRS)", tipo: "marcar", colunas: 1, opcoes: ["Temperatura > 38 °C ou < 36 °C", "FC > 90 bpm", "FR > 20 irpm", "Leucócitos > 12.000 ou < 4.000 (ou > 10% bastões)"] },
          { id: "pd_ptb", rotulo: "Probe-to-bone (toque ósseo)", tipo: "radio", opcoes: ["Negativo", "Positivo", "Não realizado"] },
          { id: "pd_osteo", rotulo: "Osteomielite", tipo: "radio", opcoes: ["Não", "Suspeita", "Confirmada"] },
        ],
      },
      {
        tipo: "caixa", rotulo: "SINBAD",
        campos: [
          { id: "pd_sinbad_local", rotulo: "Local da úlcera", tipo: "radio", opcoes: ["Antepé", "Mediopé ou retropé"] },
          { id: "pd_sinbad_prof", rotulo: "Profundidade", tipo: "radio", colunas: 1, opcoes: ["Pele e subcutâneo", "Atinge músculo, tendão ou mais profundo"] },
        ],
      },
      {
        tipo: "caixa", rotulo: "WIfI (quando há DAP)",
        campos: [
          { id: "pd_wifi_w", rotulo: "W – Ferida", tipo: "opcao", opcoes: ["0 – sem úlcera (dor isquêmica de repouso)", "1 – úlcera pequena e rasa, sem gangrena", "2 – úlcera profunda (osso, articulação, tendão) ou gangrena de dedo", "3 – úlcera extensa e profunda ou gangrena extensa"] },
          { id: "pd_wifi_i", rotulo: "I – Isquemia", tipo: "opcao", opcoes: ["0 – ITB ≥ 0,80 ou hálux/TcPO2 ≥ 60", "1 – ITB 0,60–0,79 ou hálux/TcPO2 40–59", "2 – ITB 0,40–0,59 ou hálux/TcPO2 30–39", "3 – ITB < 0,40 ou hálux/TcPO2 < 30"] },
          { id: "pd_wifi_fi", rotulo: "fI – Infecção", tipo: "opcao", opcoes: ["0 – sem infecção", "1 – leve", "2 – moderada", "3 – grave (SIRS)"] },
        ],
      },
      {
        tipo: "caixa", rotulo: "Calçado e descarga",
        campos: [
          { id: "pd_calcado", rotulo: "Calçado", tipo: "radio", opcoes: ["Adequado", "Inadequado"] },
          { id: "pd_descarga", rotulo: "Descarga (offloading)", tipo: "opcao", opcoes: ["Nenhuma", "Bota gessada de contato total", "Bota removível até o joelho (não removível)", "Bota removível até o joelho", "Bota/órtese até o tornozelo", "Sandália ou calçado terapêutico", "Feltro / espuma", "Muletas ou cadeira de rodas"] },
          { id: "pd_adesao", rotulo: "Adesão à descarga", tipo: "radio", opcoes: ["Boa", "Parcial", "Ruim"] },
        ],
      },
    ],
  ],
  rodape: [
    {
      tipo: "caixa", rotulo: "Encaminhamentos e observações",
      campos: [
        { id: "pd_encaminhar", tipo: "marcar", opcoes: ["Cirurgia vascular", "Endocrinologia", "Ortopedia / cirurgia do pé", "Infectologia", "Podologia", "Urgência (infecção grave ou isquemia crítica)"] },
        { id: "pd_obs", tipo: "area" },
      ],
    },
  ],
};

const DEFORMIDADES_ESTRUTURAIS = ["Dedos em garra / martelo", "Hálux valgo", "Cabeças de metatarsos proeminentes", "Pé cavo",
  "Mobilidade articular limitada", "Charcot ativo (pé quente e edemaciado)", "Charcot crônico", "Amputação de dedo / raio"];

export function temPeDiabetico(d) {
  return !!d && Object.keys(d).some((k) => k.startsWith("pd_"));
}

// Cálculos de apoio. d = valores (pd_* e lesao_* juntos)
export function calcularPeDiabetico(d) {
  const lista = (k) => d[k] || [];
  const n = (k) => numeroOuNulo(d[k]);

  // Neuropatia
  const sinaisPsp = [];
  if (lista("pd_mono_d").length) sinaisPsp.push("monofilamento alterado no pé D");
  if (lista("pd_mono_e").length) sinaisPsp.push("monofilamento alterado no pé E");
  if (d.pd_vibra_d === "Ausente" || d.pd_vibra_e === "Ausente") sinaisPsp.push("vibração ausente");
  if (d.pd_ipswich === "Alterado") sinaisPsp.push("Ipswich alterado");
  const psp = d.pd_psp === "Sim" ? true : d.pd_psp === "Não" ? false : sinaisPsp.length ? true : null;

  // DAP (IWGDF/ESVS/SVS 2023: ITB 0,9–1,3, ITD ≥ 0,70 e ondas tri/bifásicas tornam DAP menos provável)
  const sinaisDap = [];
  ["d", "e"].forEach((p) => {
    const L = p === "d" ? "D" : "E";
    if (d["pd_pedioso_" + p] === "Ausente" && d["pd_tibial_" + p] === "Ausente") sinaisDap.push("pulsos ausentes no pé " + L);
    if (d["pd_doppler_" + p] === "Monofásica") sinaisDap.push("onda monofásica no pé " + L);
    const itb = n("pd_itb_" + p);
    if (itb != null && (itb < 0.9 || itb > 1.3)) sinaisDap.push(`ITB ${numeroBR(itb, 2)} no pé ${L}`);
    const itd = n("pd_itd_" + p);
    if (itd != null && itd < 0.7) sinaisDap.push(`ITD ${numeroBR(itd, 2)} no pé ${L}`);
    const ph = n("pd_ph_" + p);
    if (ph != null && ph < 30) sinaisDap.push(`pressão do hálux ${ph} mmHg no pé ${L}`);
  });
  const tc = n("pd_tcpo2");
  if (tc != null && tc < 25) sinaisDap.push(`TcPO2 ${tc} mmHg`);
  const dap = d.pd_dap === "Sim" ? true : d.pd_dap === "Não" ? false : sinaisDap.length ? true : null;
  // Perfusão baixa: pressão do hálux < 30 ou TcPO2 < 25 → avaliação vascular com urgência
  const perfusaoCritica = ["d", "e"].some((p) => n("pd_ph_" + p) != null && n("pd_ph_" + p) < 30) || (tc != null && tc < 25);

  // Categoria de risco IWGDF 2023 (prevenção)
  const deformidade = lista("pd_deformidades").some((x) => DEFORMIDADES_ESTRUTURAIS.includes(x));
  const historiaAlto = lista("pd_historia").some((x) => /Úlcera prévia|Amputação|renal/.test(x));
  let risco = null;
  if (psp != null || dap != null) {
    if ((psp || dap) && historiaAlto) risco = { cat: 3, nome: "alto", intervalo: "a cada 1 a 3 meses" };
    else if ((psp && dap) || (psp && deformidade) || (dap && deformidade)) risco = { cat: 2, nome: "moderado", intervalo: "a cada 3 a 6 meses" };
    else if (psp || dap) risco = { cat: 1, nome: "baixo", intervalo: "a cada 6 a 12 meses" };
    else risco = { cat: 0, nome: "muito baixo", intervalo: "1 vez por ano" };
  }

  // Infecção IWGDF/IDSA 2023
  const nLocal = lista("pd_inf_local").length;
  const nSirs = lista("pd_inf_sirs").length;
  const profunda = d.pd_inf_profunda === "Sim";
  const eritema = n("pd_inf_eritema");
  const osteo = d.pd_osteo === "Confirmada" || d.pd_osteo === "Suspeita";
  let infeccao = null;
  if (nLocal || nSirs || profunda || d.pd_osteo || eritema != null) {
    let grau;
    if (nLocal < 2 && !profunda && !osteo) grau = 1;
    else if (nSirs >= 2) grau = 4;
    else if (profunda || (eritema != null && eritema > 2)) grau = 3;
    else grau = 2;
    if (osteo && grau < 3) grau = 3;
    const nomes = { 1: "sem infecção", 2: "leve", 3: "moderada", 4: "grave" };
    infeccao = { grau, rotulo: grau + (osteo ? "(O)" : ""), nome: nomes[grau] + (osteo ? " com osteomielite" + (d.pd_osteo === "Suspeita" ? " suspeita" : "") : "") };
  }

  // SINBAD (cada item 0 ou 1)
  const area = areaLesao(d);
  const itens = [
    ["S", "Local", d.pd_sinbad_local ? (d.pd_sinbad_local === "Antepé" ? 0 : 1) : null, d.pd_sinbad_local],
    ["I", "Isquemia", dap == null ? null : dap ? 1 : 0, dap == null ? "" : dap ? "fluxo prejudicado" : "fluxo preservado"],
    ["N", "Neuropatia", psp == null ? null : psp ? 1 : 0, psp == null ? "" : psp ? "PSP" : "sensibilidade preservada"],
    ["B", "Infecção", infeccao ? (infeccao.grau >= 2 ? 1 : 0) : null, infeccao ? infeccao.nome : ""],
    ["A", "Área", area == null ? null : area >= 1 ? 1 : 0, area == null ? "" : numeroBR(area, 2) + " cm²"],
    ["D", "Profundidade", d.pd_sinbad_prof ? (d.pd_sinbad_prof === "Pele e subcutâneo" ? 0 : 1) : null, d.pd_sinbad_prof],
  ];
  const completos = itens.filter((i) => i[2] != null);
  const sinbad = { itens, total: completos.reduce((s, i) => s + i[2], 0), completo: completos.length === 6 };

  const wifi = d.pd_wifi_w || d.pd_wifi_i || d.pd_wifi_fi
    ? `W${(d.pd_wifi_w || "?")[0]} I${(d.pd_wifi_i || "?")[0]} fI${(d.pd_wifi_fi || "?")[0]}` : null;

  return { psp, sinaisPsp, dap, sinaisDap, perfusaoCritica, deformidade, risco, infeccao, sinbad, wifi };
}

// Quadro de resultados (atualiza ao vivo)
export function resultadoPeDiabeticoEl(r) {
  const linha = (rotulo, valor, dica) => h("div", { class: "pd-linha" }, h("span", null, rotulo), h("b", null, valor), dica ? h("small", null, dica) : null);
  const simNao = (v) => (v == null ? "—" : v ? "sim" : "não");
  const alertas = [];
  if (r.infeccao && r.infeccao.grau === 4) alertas.push("Infecção grave (SIRS): encaminhar para urgência.");
  if (r.perfusaoCritica) alertas.push("Pressão do hálux < 30 mmHg ou TcPO2 < 25 mmHg: avaliação vascular com urgência.");
  if (r.infeccao && r.infeccao.grau === 3) alertas.push("Infecção moderada: considerar avaliação médica para antibiótico e exames.");
  return h("div", { class: "pd-resultado" },
    alertas.map((a) => h("p", { class: "pd-alerta" }, a)),
    linha("Perda da sensibilidade protetora", simNao(r.psp), r.sinaisPsp.length ? r.sinaisPsp.join(", ") : null),
    linha("Doença arterial periférica", simNao(r.dap), r.sinaisDap.length ? r.sinaisDap.join(", ") : null),
    linha("Categoria de risco IWGDF", r.risco ? `${r.risco.cat} (${r.risco.nome})` : "—", r.risco ? "Rastreio do pé " + r.risco.intervalo + " (após cicatrizar)" : null),
    linha("Infecção IWGDF/IDSA", r.infeccao ? `grau ${r.infeccao.rotulo}` : "—", r.infeccao ? r.infeccao.nome : null),
    linha("SINBAD", `${r.sinbad.total}/6${r.sinbad.completo ? "" : " (incompleto)"}`,
      r.sinbad.itens.map((i) => `${i[0]} ${i[2] == null ? "?" : i[2]}`).join(" · ")),
    r.wifi ? linha("WIfI", r.wifi) : null,
    h("p", { class: "pd-fonte" }, "Base: diretrizes IWGDF 2023 (prevenção, DAP, infecção IWGDF/IDSA e classificação). Os cálculos são apoio: a conclusão é da enfermeira."),
  );
}

export function textoResumoPeDiabetico(r) {
  const partes = [];
  if (r.risco) partes.push("Risco IWGDF " + r.risco.cat);
  if (r.infeccao) partes.push("Infecção " + r.infeccao.rotulo);
  partes.push("SINBAD " + r.sinbad.total + "/6");
  if (r.wifi) partes.push(r.wifi);
  return partes.join(" · ");
}

export const CAMPOS_PE_DIABETICO = () => camposDe(PE_DIABETICO);

// Botão "Abrir avaliação de pé diabético" + a folha + o quadro de resultados.
// lerTudo(): devolve os valores atuais da avaliação da lesão (para área e etiologia).
export function blocoPeDiabetico(valores, lerTudo, { etiologia } = {}) {
  const aberto = temPeDiabetico(valores) || etiologia === "Pé diabético";
  const resultado = h("div");
  const folha = folhaEl(PE_DIABETICO, valores, { semTitulo: false });
  const corpo = h("div", { class: "pd-corpo", hidden: !aberto }, folha, h("fieldset", { class: "caixa pd-quadro" }, h("legend", null, "Resultado"), resultado));
  const botao = h("button", { type: "button", class: "botao botao-dourado botao-pd", "aria-expanded": String(aberto) });
  function rotular() {
    const a = !corpo.hidden;
    botao.textContent = a ? "Fechar avaliação de pé diabético" : "Abrir avaliação de pé diabético";
    botao.setAttribute("aria-expanded", String(a));
  }
  botao.addEventListener("click", () => { corpo.hidden = !corpo.hidden; rotular(); if (!corpo.hidden) corpo.scrollIntoView({ behavior: "smooth", block: "start" }); });
  function atualizar() {
    const d = { ...lerTudo(), ...lerCampos(corpo, CAMPOS_PE_DIABETICO()) };
    resultado.replaceChildren(resultadoPeDiabeticoEl(calcularPeDiabetico(d)));
  }
  corpo.addEventListener("input", atualizar);
  rotular();
  requestAnimationFrame(atualizar);
  function abrir() { if (corpo.hidden) { corpo.hidden = false; rotular(); } }
  return { el: h("div", { class: "pd-bloco" }, botao, corpo), atualizar, abrir };
}
