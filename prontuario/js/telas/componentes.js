// Peças reaproveitadas em várias telas: fotos, planos e pagamentos.
import { sb, q, urlsAssinadas, apagarArquivo } from "../banco.js";
import { h, moeda, dataBR, hojeISO, avisar, mensagemErro, confirmar, janela, numeroOuNulo, ehImagem } from "../util.js";
import { TIPOS_PLANO, FORMAS_PAGAMENTO } from "../campos.js";

// ---------- Fotos ----------
// Grade de miniaturas; toque abre a foto grande.
export async function gradeFotos(arquivos, { aoApagar, rotulo } = {}) {
  const grade = h("div", { class: "grade-fotos" });
  if (!arquivos.length) return grade;
  const urls = await urlsAssinadas(arquivos.map((a) => a.caminho_mini || a.caminho));
  arquivos.forEach((a, i) => {
    const imagem = (a.tipo_mime || "").startsWith("image/");
    grade.append(
      h("button", { type: "button", class: "foto", onclick: () => abrirVisualizador(arquivos, i, aoApagar) },
        imagem
          ? h("img", { src: urls[a.caminho_mini || a.caminho], alt: a.legenda || "Foto", loading: "lazy" })
          : h("span", { class: "foto-doc" }, "📄", h("small", null, a.nome_original || "arquivo")),
        h("span", { class: "foto-data" }, rotulo ? rotulo(a) : dataBR(a.data)),
      ),
    );
  });
  return grade;
}

export async function abrirVisualizador(arquivos, indice, aoApagar) {
  let i = indice;
  const img = h("img", { class: "visualizador-img", alt: "" });
  const doc = h("a", { class: "botao botao-primario", target: "_blank", rel: "noopener" }, "Abrir arquivo");
  const legenda = h("p", { class: "visualizador-legenda" });
  const corpo = h("div", { class: "visualizador" },
    img, doc, legenda,
    h("div", { class: "visualizador-botoes" },
      h("button", { type: "button", class: "botao botao-secundario", onclick: () => ir(-1) }, "‹ Anterior"),
      aoApagar ? h("button", {
        type: "button", class: "botao botao-perigo-texto",
        onclick: async () => {
          if (!(await confirmar("Apagar este arquivo? Use só se foi enviado por engano.", { sim: "Apagar", perigo: true }))) return;
          try { await apagarArquivo(arquivos[i]); avisar("Arquivo apagado."); fechar(); aoApagar(arquivos[i]); }
          catch (e) { avisar(mensagemErro(e), "erro"); }
        },
      }, "Apagar") : null,
      h("button", { type: "button", class: "botao botao-secundario", onclick: () => ir(1) }, "Próxima ›"),
    ),
  );
  const { fechar } = janela("Foto", corpo);
  async function mostrar() {
    const a = arquivos[i];
    const urls = await urlsAssinadas([a.caminho]);
    const imagem = (a.tipo_mime || "").startsWith("image/");
    img.hidden = !imagem;
    doc.hidden = imagem;
    if (imagem) img.src = urls[a.caminho];
    else doc.href = urls[a.caminho];
    legenda.textContent = [dataBR(a.data), a.legenda, `${i + 1} de ${arquivos.length}`].filter(Boolean).join(" · ");
  }
  function ir(d) { i = (i + d + arquivos.length) % arquivos.length; mostrar(); }
  mostrar();
}

// Campo para escolher/tirar fotos, com prévia antes de salvar.
// Retorna { el, arquivos() }
export function escolherFotos({ texto = "Tirar ou escolher fotos", aceitar = "image/*", aoMudar } = {}) {
  const escolhidos = [];
  const previa = h("div", { class: "grade-fotos" });
  const entrada = h("input", { type: "file", accept: aceitar, multiple: true, hidden: true });
  entrada.addEventListener("change", () => {
    for (const f of entrada.files) escolhidos.push(f);
    entrada.value = "";
    desenhar();
    if (aoMudar) aoMudar();
  });
  function desenhar() {
    previa.replaceChildren(...escolhidos.map((f, i) =>
      h("div", { class: "foto foto-previa" },
        ehImagem(f) ? h("img", { src: URL.createObjectURL(f), alt: "" }) : h("span", { class: "foto-doc" }, "📄", h("small", null, f.name)),
        h("button", { type: "button", class: "foto-remover", "aria-label": "Tirar", onclick: () => { escolhidos.splice(i, 1); desenhar(); } }, "✕"),
      ),
    ));
  }
  const el = h("div", { class: "escolher-fotos" },
    h("button", { type: "button", class: "botao botao-secundario", onclick: () => entrada.click() }, "📷 " + texto),
    entrada, previa,
  );
  return { el, arquivos: () => escolhidos.slice(), limpar: () => { escolhidos.length = 0; desenhar(); } };
}

// ---------- Planos e pagamentos do paciente ----------
export async function painelFinanceiro(pacienteId, { compacto = false } = {}) {
  const caixa = h("div", { class: "painel-financeiro" });

  async function carregar() {
    const [planos, pagamentos, evolucoes] = await Promise.all([
      q(sb.from("planos").select("*").eq("paciente_id", pacienteId).order("inicio", { ascending: false })),
      q(sb.from("pagamentos").select("*").eq("paciente_id", pacienteId).order("data", { ascending: false })),
      q(sb.from("evolucoes").select("id, evolucao_materiais(quantidade, custo_unitario)").eq("paciente_id", pacienteId)),
    ]);
    const recebido = pagamentos.reduce((s, p) => s + Number(p.valor), 0);
    const custo = evolucoes.reduce((s, e) => s + e.evolucao_materiais.reduce((x, m) => x + m.quantidade * m.custo_unitario, 0), 0);

    caixa.replaceChildren(
      compacto ? null : h("div", { class: "numeros" },
        numero("Recebido", moeda(recebido)),
        numero("Custo de material", moeda(custo)),
        numero("Resultado", moeda(recebido - custo), recebido - custo < 0 ? "negativo" : ""),
        numero("Atendimentos", String(evolucoes.length)),
      ),
      h("div", { class: "subcabecalho" },
        h("h3", null, "Plano contratado e valores"),
        h("button", { type: "button", class: "botao botao-secundario botao-pequeno", onclick: () => editarPlano() }, "+ Plano"),
      ),
      planos.length
        ? h("ul", { class: "lista-simples" }, planos.map((p) =>
            h("li", null,
              h("div", null,
                h("strong", null, (TIPOS_PLANO[p.tipo] || p.tipo) + " · " + moeda(p.valor) + (p.tipo === "mensal" ? "/mês" : "")),
                h("small", null, [p.descricao, p.sessoes_previstas ? p.sessoes_previstas + " sessões" : null,
                  "desde " + dataBR(p.inicio) + (p.fim ? " até " + dataBR(p.fim) : ""), p.situacao === "encerrado" ? "encerrado" : null]
                  .filter(Boolean).join(" · ")),
              ),
              h("button", { type: "button", class: "botao-link", onclick: () => editarPlano(p) }, "Editar"),
            )))
        : h("p", { class: "texto-suave" }, "Nenhum plano cadastrado."),
      compacto ? null : h("div", { class: "subcabecalho" },
        h("h3", null, "Pagamentos recebidos"),
        h("button", { type: "button", class: "botao botao-secundario botao-pequeno", onclick: () => editarPagamento(null, planos) }, "+ Pagamento"),
      ),
      compacto ? null : pagamentos.length
        ? h("ul", { class: "lista-simples" }, pagamentos.map((p) =>
            h("li", null,
              h("div", null,
                h("strong", null, moeda(p.valor)),
                h("small", null, [dataBR(p.data), p.forma, p.descricao].filter(Boolean).join(" · ")),
              ),
              h("button", { type: "button", class: "botao-link", onclick: () => editarPagamento(p, planos) }, "Editar"),
            )))
        : h("p", { class: "texto-suave" }, "Nenhum pagamento registrado."),
    );
  }

  function editarPlano(p = { tipo: "mensal", situacao: "ativo", inicio: hojeISO() }) {
    const f = h("form", { class: "grade-campos" },
      campoSel("tipo", "Tipo", Object.entries(TIPOS_PLANO), p.tipo, "meia"),
      campoTxt("valor", "Valor (R$)", p.valor, "meia", "decimal"),
      campoTxt("descricao", "Descrição", p.descricao, "", null, "Ex.: curativo 3x/semana + laser"),
      campoTxt("sessoes_previstas", "Sessões previstas", p.sessoes_previstas, "meia", "numeric"),
      campoSel("situacao", "Situação", [["ativo", "Ativo"], ["encerrado", "Encerrado"]], p.situacao, "meia"),
      campoData("inicio", "Início", p.inicio, "meia"),
      campoData("fim", "Fim (opcional)", p.fim, "meia"),
      campoTxt("observacoes", "Observações", p.observacoes),
      h("div", { class: "acoes-form" },
        p.id ? h("button", { type: "button", class: "botao botao-perigo-texto", onclick: apagar }, "Apagar") : null,
        h("button", { type: "submit", class: "botao botao-primario" }, "Salvar"),
      ),
    );
    const { fechar } = janela(p.id ? "Editar plano" : "Novo plano", f);
    async function apagar() {
      if (!(await confirmar("Apagar este plano? Use só se foi cadastrado por engano.", { sim: "Apagar", perigo: true }))) return;
      try { await q(sb.from("planos").delete().eq("id", p.id)); fechar(); carregar(); } catch (e) { avisar(mensagemErro(e), "erro"); }
    }
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const d = {
        paciente_id: pacienteId,
        tipo: f.elements.tipo.value,
        valor: numeroOuNulo(f.elements.valor.value) || 0,
        descricao: f.elements.descricao.value.trim() || null,
        sessoes_previstas: numeroOuNulo(f.elements.sessoes_previstas.value),
        situacao: f.elements.situacao.value,
        inicio: f.elements.inicio.value || hojeISO(),
        fim: f.elements.fim.value || null,
        observacoes: f.elements.observacoes.value.trim() || null,
      };
      try {
        if (p.id) await q(sb.from("planos").update(d).eq("id", p.id));
        else await q(sb.from("planos").insert(d));
        fechar(); avisar("Plano salvo."); carregar();
      } catch (e) { avisar(mensagemErro(e), "erro"); }
    });
  }

  function editarPagamento(p, planos) {
    p = p || { data: hojeISO(), forma: "Pix" };
    const ativos = planos.filter((x) => x.situacao === "ativo" || x.id === p.plano_id);
    const f = h("form", { class: "grade-campos" },
      campoTxt("valor", "Valor (R$) *", p.valor, "meia", "decimal"),
      campoData("data", "Data", p.data, "meia"),
      campoSel("forma", "Forma", FORMAS_PAGAMENTO.map((x) => [x, x]), p.forma, "meia"),
      campoSel("plano_id", "Referente ao plano", [["", "—"], ...ativos.map((x) => [x.id, (TIPOS_PLANO[x.tipo] || x.tipo) + " " + moeda(x.valor)])], p.plano_id || "", "meia"),
      campoTxt("descricao", "Descrição", p.descricao, "", null, "Ex.: mensalidade de novembro"),
      h("div", { class: "acoes-form" },
        p.id ? h("button", { type: "button", class: "botao botao-perigo-texto", onclick: apagar }, "Apagar") : null,
        h("button", { type: "submit", class: "botao botao-primario" }, "Salvar"),
      ),
    );
    const { fechar } = janela(p.id ? "Editar pagamento" : "Novo pagamento", f);
    async function apagar() {
      if (!(await confirmar("Apagar este pagamento?", { sim: "Apagar", perigo: true }))) return;
      try { await q(sb.from("pagamentos").delete().eq("id", p.id)); fechar(); carregar(); } catch (e) { avisar(mensagemErro(e), "erro"); }
    }
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const valor = numeroOuNulo(f.elements.valor.value);
      if (!valor) { avisar("Informe o valor.", "erro"); return; }
      const d = {
        paciente_id: pacienteId, valor, data: f.elements.data.value || hojeISO(), forma: f.elements.forma.value,
        plano_id: f.elements.plano_id.value || null, descricao: f.elements.descricao.value.trim() || null,
      };
      try {
        if (p.id) await q(sb.from("pagamentos").update(d).eq("id", p.id));
        else await q(sb.from("pagamentos").insert(d));
        fechar(); avisar("Pagamento salvo."); carregar();
      } catch (e) { avisar(mensagemErro(e), "erro"); }
    });
  }

  await carregar();
  return caixa;
}

export function numero(rotulo, valor, classe = "") {
  return h("div", { class: "numero " + classe }, h("small", null, rotulo), h("strong", null, valor));
}

// Campos pequenos para janelas
export function campoTxt(nome, rotulo, valor, largura = "", modo = null, dica = "") {
  return h("div", { class: "campo" + (largura ? " campo-" + largura : "") },
    h("label", null, rotulo,
      h("input", { name: nome, type: "text", inputmode: modo, placeholder: dica, value: valor == null ? "" : String(valor).replace(modo === "decimal" ? "." : "\u0000", ","), autocomplete: "off" })));
}
export function campoData(nome, rotulo, valor, largura = "") {
  return h("div", { class: "campo" + (largura ? " campo-" + largura : "") },
    h("label", null, rotulo, h("input", { name: nome, type: "date", value: valor || "" })));
}
export function campoSel(nome, rotulo, opcoes, valor, largura = "") {
  return h("div", { class: "campo" + (largura ? " campo-" + largura : "") },
    h("label", null, rotulo,
      h("select", { name: nome, value: valor == null ? "" : valor }, opcoes.map(([v, t]) => h("option", { value: v }, t)))));
}
