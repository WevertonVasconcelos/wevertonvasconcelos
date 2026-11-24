// Catálogo de materiais com custo unitário.
import { sb, q } from "../banco.js";
import { h, moeda, numeroOuNulo, avisar, mensagemErro, janela, confirmar } from "../util.js";
import { campoTxt } from "./componentes.js";

export async function telaMateriais(tela) {
  const materiais = await q(sb.from("materiais").select("*").order("ativo", { ascending: false }).order("nome"));

  tela.append(
    h("div", { class: "cabecalho-tela" },
      h("div", null, h("p", { class: "sobretitulo" }, "Cadastro"), h("h1", null, "Materiais")),
      h("button", { type: "button", class: "botao botao-primario", onclick: () => editar() }, "+ Material"),
    ),
    h("p", { class: "texto-suave" }, "O custo informado aqui é usado para calcular o gasto de cada atendimento. Se o preço mudar, edite: os atendimentos antigos mantêm o custo da época."),
    materiais.length
      ? h("div", { class: "cartao sem-padding" },
          h("table", { class: "tabela" },
            h("thead", null, h("tr", null, h("th", null, "Material"), h("th", null, "Unidade"), h("th", { class: "num" }, "Custo"), h("th", null, ""))),
            h("tbody", null, materiais.map((m) =>
              h("tr", { class: m.ativo ? "" : "inativo" },
                h("td", null, m.nome, m.ativo ? null : h("small", null, " (fora de uso)")),
                h("td", null, m.unidade),
                h("td", { class: "num" }, moeda(m.custo_unitario)),
                h("td", { class: "num" }, h("button", { type: "button", class: "botao-link", onclick: () => editar(m) }, "Editar")),
              ))),
          ))
      : h("div", { class: "cartao vazio" }, "Nenhum material cadastrado. Comece pelos que a Mariana mais usa (soro, gaze, coberturas, ataduras…)."),
  );

  function editar(m = { unidade: "un", ativo: true }) {
    const f = h("form", { class: "grade-campos" },
      campoTxt("nome", "Nome *", m.nome, "", null, "Ex.: Hidrofibra com prata 10x10"),
      campoTxt("unidade", "Unidade", m.unidade, "meia", null, "un, pacote, ml, rolo…"),
      campoTxt("custo_unitario", "Custo por unidade (R$)", m.custo_unitario, "meia", "decimal"),
      campoTxt("observacoes", "Observações", m.observacoes, "", null, "Fornecedor, marca…"),
      h("label", { class: "chip" }, h("input", { type: "checkbox", name: "ativo", checked: m.ativo }), h("span", null, "Em uso")),
      h("div", { class: "acoes-form" },
        m.id ? h("button", { type: "button", class: "botao botao-perigo-texto", onclick: apagar }, "Apagar") : null,
        h("button", { type: "submit", class: "botao botao-primario" }, "Salvar"),
      ),
    );
    const { fechar } = janela(m.id ? "Editar material" : "Novo material", f);
    async function apagar() {
      if (!(await confirmar("Apagar este material? Se ele já foi usado em algum atendimento, não será possível; nesse caso desmarque “Em uso”.", { sim: "Apagar", perigo: true }))) return;
      try { await q(sb.from("materiais").delete().eq("id", m.id)); fechar(); recarregar(); }
      catch (e) { avisar(/foreign key|violates/i.test(e.message || "") ? "Esse material já foi usado. Desmarque “Em uso” em vez de apagar." : mensagemErro(e), "erro"); }
    }
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const d = {
        nome: f.elements.nome.value.trim(),
        unidade: f.elements.unidade.value.trim() || "un",
        custo_unitario: numeroOuNulo(f.elements.custo_unitario.value) || 0,
        observacoes: f.elements.observacoes.value.trim() || null,
        ativo: f.elements.ativo.checked,
      };
      if (!d.nome) { avisar("Preencha o nome.", "erro"); return; }
      try {
        if (m.id) await q(sb.from("materiais").update(d).eq("id", m.id));
        else await q(sb.from("materiais").insert(d));
        fechar(); avisar("Material salvo."); recarregar();
      } catch (e) { avisar(mensagemErro(e), "erro"); }
    });
  }
}

function recarregar() {
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
