/* ============================================================
   FINANCE TRACKER — app.js
   Seções:
     1. Estado e variáveis
     2. Referências ao DOM
     3. Utilitários
     4. Persistência (localStorage)
     5. Validação inline
     6. Resumo (saldo, receitas, despesas)
     7. Gráfico (Chart.js)
     8. Lista de transações
     9. Renderização geral
    10. Eventos
    11. Inicialização
============================================================ */

/* ── 1. ESTADO E VARIÁVEIS ── */

let transacoes = JSON.parse(localStorage.getItem("financas")) || [];
let filtroAtivo = "todos";
let grafico = null;

const CORES_GRAFICO = [
  "#8b5cf6",
  "#a78bfa",
  "#6d28d9",
  "#34d399",
  "#f87171",
  "#fbbf24",
  "#60a5fa",
];

/* ── 2. REFERÊNCIAS AO DOM ── */

const listaEl = document.getElementById("lista-transacoes");
const listaVaziaEl = document.getElementById("lista-vazia");
const saldoEl = document.getElementById("saldo");
const receitasEl = document.getElementById("total-receitas");
const despesasEl = document.getElementById("total-despesas");
const btnAdicionarEl = document.getElementById("btn-adicionar");
const descricaoEl = document.getElementById("descricao");
const valorEl = document.getElementById("valor");
const tipoEl = document.getElementById("tipo");
const categoriaEl = document.getElementById("categoria");
const graficoContEl = document.getElementById("grafico-container");
const graficoCanvasEl = document.getElementById("grafico-categorias");

/* ── 3. UTILITÁRIOS ── */

// Formata número para moeda brasileira: 1250 → R$ 1.250,00
function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

// Capitaliza primeira letra: "alimentacao" → "Alimentacao"
function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Gera ID único baseado no timestamp atual
function gerarId() {
  return Date.now();
}

/* ── 4. PERSISTÊNCIA (localStorage) ── */

// Salva o array de transações no navegador
// Os dados persistem mesmo fechando o navegador
function salvar() {
  localStorage.setItem("financas", JSON.stringify(transacoes));
}

/* ── 5. VALIDAÇÃO INLINE ── */

// Exibe mensagem de erro embaixo do campo, sem usar alert()
function mostrarErro(el, mensagem) {
  const anterior = el.parentElement.querySelector(".erro-msg");
  if (anterior) anterior.remove();

  const msg = document.createElement("span");
  msg.classList.add("erro-msg");
  msg.textContent = mensagem;
  el.parentElement.appendChild(msg);

  // Borda vermelha no campo com problema
  el.style.borderColor = "var(--red)";

  // Remove automaticamente após 3 segundos
  setTimeout(() => {
    msg.remove();
    el.style.borderColor = "";
  }, 3000);
}

// Remove erro quando o usuário começa a digitar
function limparErro(el) {
  const erro = el.parentElement.querySelector(".erro-msg");
  if (erro) erro.remove();
  el.style.borderColor = "";
}

/* ── 6. RESUMO ── */

// Recalcula e atualiza os 3 cards do topo
function atualizarResumo() {
  const totalReceitas = transacoes
    .filter((t) => t.tipo === "receita")
    .reduce((soma, t) => soma + t.valor, 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === "despesa")
    .reduce((soma, t) => soma + t.valor, 0);

  const saldo = totalReceitas - totalDespesas;

  saldoEl.textContent = formatarMoeda(saldo);
  receitasEl.textContent = formatarMoeda(totalReceitas);
  despesasEl.textContent = formatarMoeda(totalDespesas);

  // Saldo fica vermelho quando negativo
  saldoEl.style.color = saldo < 0 ? "var(--red)" : "var(--purple2)";
}

/* ── 7. GRÁFICO (Chart.js) ── */

// Agrupa despesas por categoria e retorna labels + valores
function calcularDespesasPorCategoria() {
  const agrupado = {};

  transacoes
    .filter((t) => t.tipo === "despesa")
    .forEach((t) => {
      agrupado[t.categoria] = (agrupado[t.categoria] || 0) + t.valor;
    });

  return {
    labels: Object.keys(agrupado).map(capitalizar),
    valores: Object.values(agrupado),
  };
}

// Cria ou atualiza o gráfico de rosca
function atualizarGrafico() {
  const despesas = transacoes.filter((t) => t.tipo === "despesa");

  // Sem despesas → esconde o gráfico
  if (despesas.length === 0) {
    graficoContEl.style.display = "none";
    return;
  }

  const { labels, valores } = calcularDespesasPorCategoria();

  // Destrói instância anterior para evitar conflito no canvas
  if (grafico) {
    grafico.destroy();
  }

  graficoContEl.style.display = "block";

  grafico = new Chart(graficoCanvasEl, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: valores,
          backgroundColor: CORES_GRAFICO.slice(0, labels.length),
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#7c6fa0",
            font: { size: 12, family: "DM Sans" },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: {
          callbacks: {
            // Formata o valor no tooltip como R$
            label: (context) => " " + formatarMoeda(context.parsed),
          },
        },
      },
    },
  });
}

/* ── 8. LISTA DE TRANSAÇÕES ── */

// Cria o elemento <li> de uma transação
function criarItemLista(transacao) {
  const sinal = transacao.tipo === "receita" ? "+" : "-";

  const li = document.createElement("li");
  li.classList.add("lista-item", transacao.tipo);
  li.innerHTML = `
    <div class="item-info">
      <span class="item-descricao">${transacao.descricao}</span>
      <span class="item-categoria">${capitalizar(transacao.categoria)}</span>
    </div>
    <div class="item-direita">
      <span class="item-valor ${transacao.tipo}">
        ${sinal} ${formatarMoeda(transacao.valor)}
      </span>
      <button class="btn-deletar" data-id="${transacao.id}" title="Remover transação">
        ✕
      </button>
    </div>
  `;

  return li;
}

// Renderiza a lista completa respeitando o filtro ativo
function renderizarLista() {
  listaEl.innerHTML = "";

  const transacoesFiltradas =
    filtroAtivo === "todos"
      ? transacoes
      : transacoes.filter((t) => t.tipo === filtroAtivo);

  if (transacoesFiltradas.length === 0) {
    listaVaziaEl.style.display = "block";
    return;
  }

  listaVaziaEl.style.display = "none";

  // Exibe da mais recente para a mais antiga
  [...transacoesFiltradas]
    .reverse()
    .forEach((t) => listaEl.appendChild(criarItemLista(t)));
}

/* ── 9. RENDERIZAÇÃO GERAL ── */

// Atualiza tudo de uma vez — chamada sempre que os dados mudam
function atualizar() {
  atualizarResumo();
  atualizarGrafico();
  renderizarLista();
}

/* ── 10. EVENTOS ── */

// Adicionar transação
btnAdicionarEl.addEventListener("click", () => {
  const descricao = descricaoEl.value.trim();
  const valor = parseFloat(valorEl.value);
  const tipo = tipoEl.value;
  const categoria = categoriaEl.value;

  // Valida os campos — mostra erro inline sem alert()
  let valido = true;

  if (!descricao) {
    mostrarErro(descricaoEl, "Adicione uma descrição");
    valido = false;
  }

  if (!valor || valor <= 0) {
    mostrarErro(valorEl, "Insira um valor válido");
    valido = false;
  }

  if (!valido) return;

  transacoes.push({ id: gerarId(), descricao, valor, tipo, categoria });
  salvar();
  atualizar();

  // Limpa os campos e devolve o foco para descrição
  descricaoEl.value = "";
  valorEl.value = "";
  descricaoEl.focus();
});

// Limpa o erro quando o usuário começa a corrigir o campo
descricaoEl.addEventListener("input", () => limparErro(descricaoEl));
valorEl.addEventListener("input", () => limparErro(valorEl));

// Adicionar com Enter nos campos de descrição e valor
[descricaoEl, valorEl].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnAdicionarEl.click();
  });
});

// Deletar transação via delegação de evento na lista
// (funciona para elementos criados dinamicamente)
listaEl.addEventListener("click", (e) => {
  if (!e.target.classList.contains("btn-deletar")) return;

  const id = Number(e.target.dataset.id);
  transacoes = transacoes.filter((t) => t.id !== id);
  salvar();
  atualizar();
});

// Botões de filtro
document.querySelectorAll(".filtro").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".filtro")
      .forEach((b) => b.classList.remove("ativo"));
    btn.classList.add("ativo");
    filtroAtivo = btn.dataset.filtro;
    renderizarLista();
  });
});

/* ── 11. INICIALIZAÇÃO ── */

// Renderiza os dados salvos no localStorage ao carregar a página
atualizar();
