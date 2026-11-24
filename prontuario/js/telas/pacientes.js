// Lista de pacientes e cadastro (painel bege do topo da ficha).
import { sb, q } from "../banco.js";
import { h, dataBR, dataHoraBR, idade, semAcentos, avisar, mensagemErro, edicao } from "../util.js";
import { SITUACOES_PACIENTE } from "../campos.js";
import { cabecalho, abas } from "./componentes.js";

let filtroSituacao = "em tratamento";
let textoBusca = "";

export async function telaPacientes(tela) {
  const pacientes = await q(sb.from("pacientes_lista").select("*").order("nome").limit(5000));
  const corpoTabela = h("tbody");
  const contagem = h("p", { class: "texto-suave pequeno" });
  const filtros = h("div");

  function desenhar() {
    filtros.replaceChildren(abas([...SITUACOES_PACIENTE, "todos"].map((s) => [s, s === "em tratamento" ? "Em tratamento" : s[0].toUpperCase() + s.slice(1)]),
      filtroSituacao, (k) => { filtroSituacao = k; desenhar(); }));
    const t = semAcentos(textoBusca).toLowerCase().trim();
    const lista = pacientes.filter((p) =>
      (filtroSituacao === "todos" || p.situacao === filtroSituacao) &&
      (!t || semAcentos(p.nome).toLowerCase().includes(t) || (p.telefone || "").includes(t)));
    contagem.textContent = lista.length + (lista.length === 1 ? " paciente" : " pacientes");
    corpoTabela.replaceChildren(...lista.map((p) => {
      const anos = idade(p.data_nascimento);
      return h("tr", { class: "clicavel", onclick: () => (location.hash = "#/paciente/" + p.id) },
        h("td", null,
          h("a", { href: "#/paciente/" + p.id, class: "paciente-nome" }, p.nome),
          p.situacao !== "em tratamento" ? [" ", h("span", { class: "etiqueta" }, p.situacao)] : null,
          h("div", { class: "pequeno texto-suave" }, [anos != null ? anos + " anos" : null, p.telefone].filter(Boolean).join(" · "))),
        h("td", { class: "col-data" }, p.ultimo_atendimento ? dataBR(p.ultimo_atendimento) : "—"),
      );
    }));
    if (!lista.length) {
      corpoTabela.replaceChildren(h("tr", null, h("td", { colspan: 2, class: "vazio" },
        pacientes.length ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda. Toque em “+ Novo paciente” para começar.")));
    }
  }

  tela.append(
    cabecalho({ titulo: ["", "PACIENTES"], acoes: h("a", { href: "#/paciente/novo", class: "botao botao-primario" }, "+ Novo paciente") }),
    h("div", { class: "busca-linha" },
      h("input", {
        type: "search", class: "busca", placeholder: "Buscar por nome ou telefone", value: textoBusca, autocomplete: "off",
        oninput: (e) => { textoBusca = e.target.value; desenhar(); },
      }),
      filtros,
    ),
    contagem,
    h("div", { class: "rolagem" },
      h("table", { class: "tabela-ficha" },
        h("thead", null, h("tr", null, h("th", null, "Paciente"), h("th", { class: "col-data" }, "Última sessão"))),
        corpoTabela)),
  );
  desenhar();
}

// ---------- Cadastro / edição (painel bege) ----------
export async function telaPacienteEditar(tela, id) {
  let p = { situacao: "em tratamento" };
  if (id) p = await q(sb.from("pacientes").select("*").eq("id", id).single());

  const linha = (nome, rotulo, largura = "", attrs = {}) =>
    h("label", { class: "painel-campo " + largura },
      h("span", { class: "rotulo" }, rotulo),
      h("input", { name: nome, type: attrs.type || "text", value: p[nome] || "", required: attrs.required, autocomplete: "off", inputmode: attrs.inputmode }));

  const form = h("form", { oninput: () => (edicao.suja = true) },
    h("div", { class: "painel" },
      h("div", { class: "painel-grade" },
        linha("nome", "Nome", "", { required: true }),
        linha("data_nascimento", "Nascimento", "meia", { type: "date" }),
        h("div", { class: "painel-campo meia" }, h("span", { class: "rotulo" }, "Sexo"),
          h("span", { class: "valor caixinhas em-linha" },
            ["Feminino", "Masculino"].map((s) => h("label", { class: "caixinha" },
              h("input", { type: "radio", name: "sexo", value: s, checked: p.sexo === s }),
              h("span", { class: "quadrado" }), h("span", { class: "texto" }, s))))),
        linha("endereco", "Endereço"),
        linha("telefone", "Telefone", "meia", { type: "tel" }),
        linha("cpf", "CPF", "meia", { inputmode: "numeric" }),
        linha("responsavel", "Responsável/Cuidador", "meia"),
        linha("responsavel_telefone", "Tel. do responsável", "meia", { type: "tel" }),
        h("label", { class: "painel-campo meia" }, h("span", { class: "rotulo" }, "Situação"),
          h("select", { name: "situacao", value: p.situacao }, SITUACOES_PACIENTE.map((s) => h("option", { value: s }, s)))),
        linha("observacoes", "Observações", "meia"),
      ),
    ),
    h("div", { class: "acoes-form" },
      h("a", { href: id ? "#/paciente/" + id : "#/pacientes", class: "botao botao-secundario" }, "Cancelar"),
      h("button", { type: "submit", class: "botao botao-primario" }, id ? "Salvar" : "Salvar e abrir a ficha de anamnese"),
    ),
  );

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const dados = {};
    ["nome", "data_nascimento", "cpf", "telefone", "situacao", "endereco", "responsavel", "responsavel_telefone", "observacoes"]
      .forEach((k) => { const v = form.elements[k].value.trim(); dados[k] = v === "" ? null : v; });
    const sexo = form.querySelector('[name="sexo"]:checked');
    dados.sexo = sexo ? sexo.value : null;
    if (!dados.nome) { avisar("Preencha o nome.", "erro"); return; }
    const botao = form.querySelector("[type=submit]");
    botao.disabled = true;
    try {
      let salvo;
      if (id) salvo = await q(sb.from("pacientes").update(dados).eq("id", id).select().single());
      else salvo = await q(sb.from("pacientes").insert(dados).select().single());
      edicao.suja = false;
      avisar("Paciente salvo.");
      location.hash = id ? "#/paciente/" + id : "#/paciente/" + salvo.id + "/admissao";
    } catch (erro) {
      avisar(mensagemErro(erro), "erro");
    } finally {
      botao.disabled = false;
    }
  });

  tela.append(
    cabecalho({
      voltar: id ? ["#/paciente/" + id, p.nome] : ["#/pacientes", "Pacientes"],
      subtitulo: id ? "Atualizado em " + dataHoraBR(p.atualizado_em) : null,
      titulo: id ? ["DADOS DO", "PACIENTE"] : ["NOVO", "PACIENTE"],
    }),
    form,
  );
}
