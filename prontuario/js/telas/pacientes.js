// Lista de pacientes e cadastro/edição dos dados pessoais.
import { sb, q } from "../banco.js";
import { h, dataBR, idade, semAcentos, avisar, mensagemErro, edicao } from "../util.js";
import { SITUACOES_PACIENTE } from "../campos.js";

let filtroSituacao = "em tratamento";
let textoBusca = "";

export async function telaPacientes(tela) {
  const pacientes = await q(sb.from("pacientes_lista").select("*").order("nome").limit(5000));
  const ultimo = Object.fromEntries(pacientes.map((p) => [p.id, p.ultimo_atendimento]));

  const lista = h("ul", { class: "lista-pacientes" });
  const contagem = h("p", { class: "texto-suave" });

  function desenhar() {
    const t = semAcentos(textoBusca).toLowerCase().trim();
    const filtrados = pacientes.filter((p) =>
      (filtroSituacao === "todos" || p.situacao === filtroSituacao) &&
      (!t || semAcentos(p.nome).toLowerCase().includes(t) || (p.telefone || "").includes(t)),
    );
    contagem.textContent = filtrados.length + (filtrados.length === 1 ? " paciente" : " pacientes");
    lista.replaceChildren(
      ...filtrados.map((p) => {
        const anos = idade(p.data_nascimento);
        return h("li", null,
          h("a", { href: "#/paciente/" + p.id, class: "item-paciente" },
            h("span", { class: "avatar" }, iniciais(p.nome)),
            h("span", { class: "item-paciente-texto" },
              h("strong", null, p.nome),
              h("small", null,
                [anos != null ? anos + " anos" : null, ultimo[p.id] ? "último atendimento " + dataBR(ultimo[p.id]) : "sem evoluções"]
                  .filter(Boolean).join(" · "),
              ),
            ),
            p.situacao !== "em tratamento" ? h("span", { class: "etiqueta" }, p.situacao) : null,
            h("span", { class: "seta", "aria-hidden": "true" }, "›"),
          ),
        );
      }),
    );
    if (!filtrados.length) {
      lista.replaceChildren(h("li", { class: "vazio" },
        pacientes.length ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda. Toque em “Novo paciente” para começar."));
    }
  }

  tela.append(
    h("div", { class: "cabecalho-tela" },
      h("div", null, h("p", { class: "sobretitulo" }, "Prontuário"), h("h1", null, "Pacientes")),
      h("a", { href: "#/paciente/novo", class: "botao botao-primario" }, "+ Novo paciente"),
    ),
    h("div", { class: "barra-filtros" },
      h("input", {
        type: "search", class: "busca", placeholder: "Buscar por nome ou telefone", value: textoBusca, autocomplete: "off",
        oninput: (e) => { textoBusca = e.target.value; desenhar(); },
      }),
      h("div", { class: "segmentos", role: "group", "aria-label": "Situação" },
        [...SITUACOES_PACIENTE, "todos"].map((s) =>
          h("button", {
            type: "button", class: "segmento" + (s === filtroSituacao ? " ativo" : ""),
            onclick: (e) => {
              filtroSituacao = s;
              e.target.parentElement.querySelectorAll(".segmento").forEach((b) => b.classList.toggle("ativo", b === e.target));
              desenhar();
            },
          }, s === "em tratamento" ? "Em tratamento" : s[0].toUpperCase() + s.slice(1)),
        ),
      ),
    ),
    contagem,
    lista,
  );
  desenhar();
}

function iniciais(nome) {
  const p = (nome || "?").trim().split(/\s+/);
  return ((p[0] || "")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

// ---------- Cadastro / edição ----------
export async function telaPacienteEditar(tela, id) {
  let p = { situacao: "em tratamento" };
  if (id) p = await q(sb.from("pacientes").select("*").eq("id", id).single());

  const campo = (nome, rotulo, attrs = {}, largura = "") =>
    h("div", { class: "campo" + (largura ? " campo-" + largura : "") },
      h("label", { for: "p-" + nome }, rotulo),
      attrs.tipo === "area"
        ? h("textarea", { id: "p-" + nome, name: nome, rows: 3, value: p[nome] || "" })
        : h("input", { id: "p-" + nome, name: nome, type: attrs.type || "text", value: p[nome] || "", required: attrs.required, autocomplete: "off", inputmode: attrs.inputmode }),
    );

  const form = h("form", { class: "cartao", oninput: () => (edicao.suja = true) },
    h("div", { class: "grade-campos" },
      campo("nome", "Nome completo *", { required: true }),
      campo("data_nascimento", "Data de nascimento", { type: "date" }, "terco"),
      h("div", { class: "campo campo-terco" },
        h("label", { for: "p-sexo" }, "Sexo"),
        h("select", { id: "p-sexo", name: "sexo", value: p.sexo || "" },
          h("option", { value: "" }, "—"), h("option", null, "Feminino"), h("option", null, "Masculino"), h("option", null, "Outro")),
      ),
      campo("cpf", "CPF", { inputmode: "numeric" }, "terco"),
      campo("telefone", "Telefone / WhatsApp", { type: "tel" }, "meia"),
      h("div", { class: "campo campo-meia" },
        h("label", { for: "p-situacao" }, "Situação"),
        h("select", { id: "p-situacao", name: "situacao", value: p.situacao }, SITUACOES_PACIENTE.map((s) => h("option", { value: s }, s))),
      ),
      campo("endereco", "Endereço"),
      campo("responsavel", "Responsável / cuidador", {}, "meia"),
      campo("responsavel_telefone", "Telefone do responsável", { type: "tel" }, "meia"),
      campo("observacoes", "Observações", { tipo: "area" }),
    ),
    h("div", { class: "acoes-form" },
      h("a", { href: id ? "#/paciente/" + id : "#/pacientes", class: "botao botao-secundario" }, "Cancelar"),
      h("button", { type: "submit", class: "botao botao-primario" }, "Salvar"),
    ),
  );

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const dados = {};
    ["nome", "data_nascimento", "sexo", "cpf", "telefone", "situacao", "endereco", "responsavel", "responsavel_telefone", "observacoes"]
      .forEach((k) => { const v = form.elements[k].value.trim(); dados[k] = v === "" ? null : v; });
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
    h("div", { class: "cabecalho-tela" },
      h("div", null,
        h("a", { href: id ? "#/paciente/" + id : "#/pacientes", class: "voltar" }, "‹ Voltar"),
        h("h1", null, id ? "Editar dados" : "Novo paciente"),
        id ? null : h("p", { class: "texto-suave" }, "Depois de salvar, você já vai para a ficha de admissão."),
      ),
    ),
    form,
  );
}
