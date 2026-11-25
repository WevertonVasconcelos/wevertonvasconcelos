// Peças reaproveitadas em várias telas, no visual da ficha de atendimento.
import { sb, q, urlsAssinadas, apagarArquivo } from "../banco.js";
import { h, moeda, dataBR, hojeISO, idade, avisar, mensagemErro, confirmar, janela, numeroOuNulo, ehImagem } from "../util.js";
import { TIPOS_PLANO, FORMAS_PAGAMENTO } from "../campos.js";
import { tituloFicha } from "../formulario.js";

// ---------- Estrutura da tela ----------
// Cabeçalho: "‹ voltar" e subtítulo à esquerda; título no estilo "FICHA DE ANAMNESE" à direita
export function cabecalho({ voltar, subtitulo, titulo, roxo = false, acoes }) {
  return h("div", { class: "cabecalho-ficha" },
    h("div", { class: "esquerda" },
      voltar ? h("a", { href: voltar[0], class: "voltar" }, "‹ " + voltar[1]) : null,
      subtitulo ? h("p", { class: "subtitulo" }, subtitulo) : null),
    h("div", { class: "direita" }, tituloFicha(titulo, roxo), acoes || null),
  );
}

// Quadro com título na borda (fieldset da ficha)
export function quadro(titulo, ...conteudo) {
  return h("fieldset", { class: "caixa" }, titulo ? h("legend", null, titulo) : null, ...conteudo);
}

export function pilula(texto) {
  return h("span", { class: "pilula" }, texto);
}

// Abas em etiqueta dourada. itens: [[chave, texto, href?]]
export function abas(itens, ativa, aoTrocar) {
  return h("nav", { class: "abas" }, itens.map(([k, t, href]) =>
    href
      ? h("a", { href, class: "aba" + (k === ativa ? " ativa" : "") }, t)
      : h("button", { type: "button", class: "aba" + (k === ativa ? " ativa" : ""), dataset: { aba: k }, onclick: () => aoTrocar(k) }, t)));
}

// Painel bege com os dados do paciente (topo da ficha de anamnese)
export function painelPaciente(p, extra) {
  const anos = idade(p.data_nascimento);
  const linha = (rotulo, valor, largura = "") =>
    h("div", { class: "painel-campo " + largura }, h("span", { class: "rotulo" }, rotulo), h("span", { class: "valor" }, valor || ""));
  return h("div", { class: "painel" },
    h("div", { class: "painel-grade" },
      linha("Nome", p.nome),
      linha("Idade", anos != null ? anos + " anos (" + dataBR(p.data_nascimento) + ")" : "", "meia"),
      h("div", { class: "painel-campo meia" }, h("span", { class: "rotulo" }, "Sexo"),
        h("span", { class: "valor caixinhas em-linha" },
          ["Feminino", "Masculino"].map((s) => h("span", { class: "caixinha" },
            h("input", { type: "checkbox", checked: p.sexo === s, disabled: true, tabindex: -1 }),
            h("span", { class: "quadrado" }), h("span", { class: "texto" }, s))))),
      linha("Endereço", p.endereco),
      linha("Telefone", p.telefone, "meia"),
      linha("Responsável/Cuidador", [p.responsavel, p.responsavel_telefone].filter(Boolean).join(" · "), "meia"),
    ),
    extra || null,
  );
}

// ---------- Fotos ----------
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
      arquivos.length > 1 ? h("button", { type: "button", class: "botao botao-secundario", onclick: () => ir(-1) }, "‹ Anterior") : null,
      aoApagar ? h("button", {
        type: "button", class: "botao botao-perigo-texto",
        onclick: async () => {
          if (!(await confirmar("Apagar este arquivo? Use só se foi enviado por engano.", { sim: "Apagar", perigo: true }))) return;
          try { await apagarArquivo(arquivos[i]); avisar("Arquivo apagado."); fechar(); aoApagar(arquivos[i]); }
          catch (e) { avisar(mensagemErro(e), "erro"); }
        },
      }, "Apagar") : null,
      arquivos.length > 1 ? h("button", { type: "button", class: "botao botao-secundario", onclick: () => ir(1) }, "Próxima ›") : null,
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

// Campo para tirar/escolher fotos, com prévia antes de salvar
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

    caixa.replaceChildren(...[
      compacto ? null : h("div", { class: "numeros" },
        numero("Recebido", moeda(recebido), "destaque"),
        numero("Custo de material", moeda(custo)),
        numero("Resultado", moeda(recebido - custo), recebido - custo < 0 ? "negativo" : ""),
        numero("Sessões", String(evolucoes.length)),
      ),
      h("div", null,
        h("div", { class: "linha-pilula" }, pilula("Plano contratado e valores"),
          h("button", { type: "button", class: "botao botao-secundario botao-pequeno", onclick: () => editarPlano() }, "+ Plano")),
        planos.length
          ? h("div", { class: "rolagem" }, h("table", { class: "tabela-ficha" },
              h("thead", null, h("tr", null, h("th", null, "Plano"), h("th", null, "Período"), h("th", { class: "num" }, "Valor"), h("th", null, ""))),
              h("tbody", null, planos.map((p) => h("tr", { class: p.situacao === "encerrado" ? "inativo" : "" },
                h("td", null, h("b", null, TIPOS_PLANO[p.tipo] || p.tipo),
                  [p.descricao, p.sessoes_previstas ? p.sessoes_previstas + " sessões" : null].filter(Boolean).length
                    ? h("div", { class: "pequeno texto-suave" }, [p.descricao, p.sessoes_previstas ? p.sessoes_previstas + " sessões" : null].filter(Boolean).join(" · ")) : null),
                h("td", null, dataBR(p.inicio) + (p.fim ? " a " + dataBR(p.fim) : "") + (p.situacao === "encerrado" ? " (encerrado)" : "")),
                h("td", { class: "num" }, moeda(p.valor) + (p.tipo === "mensal" ? "/mês" : "")),
                h("td", { class: "num" }, h("button", { type: "button", class: "botao-link", onclick: () => editarPlano(p) }, "Editar")),
              )))))
          : h("p", { class: "texto-suave" }, "Nenhum plano cadastrado."),
      ),
      compacto ? null : h("div", null,
        h("div", { class: "linha-pilula" }, pilula("Pagamentos recebidos"),
          h("button", { type: "button", class: "botao botao-secundario botao-pequeno", onclick: () => editarPagamento(null, planos) }, "+ Pagamento")),
        pagamentos.length
          ? h("div", { class: "rolagem" }, h("table", { class: "tabela-ficha" },
              h("thead", null, h("tr", null, h("th", { class: "col-data" }, "Data"), h("th", null, "Descrição"), h("th", { class: "num" }, "Valor"), h("th", null, ""))),
              h("tbody", null, pagamentos.map((p) => h("tr", null,
                h("td", { class: "col-data" }, dataBR(p.data)),
                h("td", null, [p.forma, p.descricao].filter(Boolean).join(" · ")),
                h("td", { class: "num" }, moeda(p.valor)),
                h("td", { class: "num" }, h("button", { type: "button", class: "botao-link", onclick: () => editarPagamento(p, planos) }, "Editar")),
              )))))
          : h("p", { class: "texto-suave" }, "Nenhum pagamento registrado."),
      ),
    ].filter(Boolean));
  }

  function editarPlano(p = { tipo: "mensal", situacao: "ativo", inicio: hojeISO() }) {
    const f = h("form", null,
      campoSel("tipo", "Tipo", Object.entries(TIPOS_PLANO), p.tipo),
      campoTxt("valor", "Valor (R$)", p.valor, "decimal"),
      campoTxt("descricao", "Descrição", p.descricao, null, "Ex.: curativo 3x/semana + laser"),
      campoTxt("sessoes_previstas", "Sessões previstas", p.sessoes_previstas, "numeric"),
      campoSel("situacao", "Situação", [["ativo", "Ativo"], ["encerrado", "Encerrado"]], p.situacao),
      campoData("inicio", "Início", p.inicio),
      campoData("fim", "Fim (opcional)", p.fim),
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
    const f = h("form", null,
      campoTxt("valor", "Valor (R$) *", p.valor, "decimal"),
      campoData("data", "Data", p.data),
      campoSel("forma", "Forma", FORMAS_PAGAMENTO.map((x) => [x, x]), p.forma),
      campoSel("plano_id", "Referente ao plano", [["", "—"], ...ativos.map((x) => [x.id, (TIPOS_PLANO[x.tipo] || x.tipo) + " " + moeda(x.valor)])], p.plano_id || ""),
      campoTxt("descricao", "Descrição", p.descricao, null, "Ex.: mensalidade de novembro"),
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

// Campos pequenos das janelas
export function campoTxt(nome, rotulo, valor, modo = null, dica = "") {
  return h("div", { class: "campo" },
    h("label", null, rotulo,
      h("input", {
        name: nome, type: "text", class: "caixa-entrada", inputmode: modo, placeholder: dica, autocomplete: "off",
        value: valor == null ? "" : modo === "decimal" ? String(valor).replace(".", ",") : String(valor),
      })));
}
export function campoData(nome, rotulo, valor) {
  return h("div", { class: "campo" }, h("label", null, rotulo, h("input", { name: nome, type: "date", class: "caixa-entrada", value: valor || "" })));
}
export function campoSel(nome, rotulo, opcoes, valor) {
  return h("div", { class: "campo" },
    h("label", null, rotulo,
      h("select", { name: nome, class: "caixa-entrada", value: valor == null ? "" : valor }, opcoes.map(([v, t]) => h("option", { value: v }, t)))));
}
