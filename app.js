/* ============================================================
   FINANCE TRACKER — app.js
   Seções:
     1. Estado e variáveis
     2. Referências ao DOM
     3. Utilitários
     4. Persistência (localStorage)
     5. Resumo (saldo, receitas, despesas)
     6. Gráfico (Chart.js)
     7. Lista de transações
     8. Renderização geral
     9. Eventos
    10. Inicialização
============================================================ */


/* ── 1. ESTADO E VARIÁVEIS ── */

let transacoes  = JSON.parse(localStorage.getItem('financas')) || [];
let filtroAtivo = 'todos';
let grafico     = null;

// Paleta de cores do gráfico (combina com o tema roxo)
const CORES_GRAFICO = [
  '#8b5cf6', // roxo principal
  '#a78bfa', // roxo claro
  '#6d28d9', // roxo escuro
  '#34d399', // verde
  '#f87171', // vermelho
  '#fbbf24', // amarelo
  '#60a5fa', // azul
];


/* ── 2. REFERÊNCIAS AO DOM ── */

const listaEl         = document.getElementById('lista-transacoes');
const listaVaziaEl    = document.getElementById('lista-vazia');
const saldoEl         = document.getElementById('saldo');
const receitasEl      = document.getElementById('total-receitas');
const despesasEl      = document.getElementById('total-despesas');
const btnAdicionarEl  = document.getElementById('btn-adicionar');
const descricaoEl     = document.getElementById('descricao');
const valorEl         = document.getElementById('valor');
const tipoEl          = document.getElementById('tipo');
const categoriaEl     = document.getElementById('categoria');
const graficoContEl   = document.getElementById('grafico-container');
const graficoCanvasEl = document.getElementById('grafico-categorias');


/* ── 3. UTILITÁRIOS ── */

// Formata número para moeda brasileira: 1250 → R$ 1.250,00
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
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
function salvar() {
  localStorage.setItem('financas', JSON.stringify(transacoes));
}


/* ── 5. RESUMO ── */

// Recalcula e atualiza os 3 cards do topo
function atualizarResumo() {
  const totalReceitas = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((soma, t) => soma + t.valor, 0);

  const totalDespesas = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((soma, t) => soma + t.valor, 0);

  const saldo = totalReceitas - totalDespesas;

  saldoEl.textContent    = formatarMoeda(saldo);
  receitasEl.textContent = formatarMoeda(totalReceitas);
  despesasEl.textContent = formatarMoeda(totalDespesas);

  // Saldo fica vermelho quando negativo
  saldoEl.style.color = saldo < 0 ? 'var(--red)' : 'var(--purple2)';
}


/* ── 6. GRÁFICO (Chart.js) ── */

// Agrupa despesas por categoria e retorna { labels, valores }
function calcularDespesasPorCategoria() {
  const agrupado = {};

  transacoes
    .filter(t => t.tipo === 'despesa')
    .forEach(t => {
      agrupado[t.categoria] = (agrupado[t.categoria] || 0) + t.valor;
    });

  return {
    labels: Object.keys(agrupado).map(capitalizar),
    valores: Object.values(agrupado),
  };
}

// Cria ou atualiza o gráfico de rosca
function atualizarGrafico() {
  const despesas = transacoes.filter(t => t.tipo === 'despesa');

  // Sem despesas → esconde o gráfico
  if (despesas.length === 0) {
    graficoContEl.style.display = 'none';
    return;
  }

  const { labels, valores } = calcularDespesasPorCategoria();

  // Destrói a instância anterior antes de recriar
  // (evita conflito de canvas no Chart.js)
  if (grafico) {
    grafico.destroy();
  }

  graficoContEl.style.display = 'block';

  grafico = new Chart(graficoCanvasEl, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: valores,
        backgroundColor: CORES_GRAFICO.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#7c6fa0',
            font: { size: 12, family: 'DM Sans' },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: {
          callbacks: {
            // Exibe o valor formatado em R$ no tooltip
            label: (context) => ' ' + formatarMoeda(context.parsed),
          },
        },
      },
    },
  });
}


/* ── 7. LISTA DE TRANSAÇÕES ── */

// Cria o elemento <li> de uma transação
function criarItemLista(transacao) {
  const sinal = transacao.tipo === 'receita' ? '+' : '-';

  const li = document.createElement('li');
  li.classList.add('lista-item', transacao.tipo);
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

// Renderiza a lista completa (respeitando o filtro ativo)
function renderizarLista() {
  listaEl.innerHTML = '';

  const transacoesFiltradas = filtroAtivo === 'todos'
    ? transacoes
    : transacoes.filter(t => t.tipo === filtroAtivo);

  if (transacoesFiltradas.length === 0) {
    listaVaziaEl.style.display = 'block';
    return;
  }

  listaVaziaEl.style.display = 'none';

  // Exibe da mais recente para a mais antiga
  [...transacoesFiltradas]
    .reverse()
    .forEach(t => listaEl.appendChild(criarItemLista(t)));
}


/* ── 8. RENDERIZAÇÃO GERAL ── */

// Atualiza tudo de uma vez — chamada sempre que os dados mudam
function atualizar() {
  atualizarResumo();
  atualizarGrafico();
  renderizarLista();
}


/* ── 9. EVENTOS ── */

// Botão "Adicionar Transação"
btnAdicionarEl.addEventListener('click', () => {
  const descricao = descricaoEl.value.trim();
  const valor     = parseFloat(valorEl.value);
  const tipo      = tipoEl.value;
  const categoria = categoriaEl.value;

  // Validações
  if (!descricao) {
    alert('Por favor, adicione uma descrição.');
    return;
  }
  if (!valor || valor <= 0) {
    alert('Por favor, insira um valor válido.');
    return;
  }

  // Cria a nova transação e adiciona ao array
  const novaTransacao = {
    id: gerarId(),
    descricao,
    valor,
    tipo,
    categoria,
  };

  transacoes.push(novaTransacao);
  salvar();
  atualizar();

  // Limpa os campos após adicionar
  descricaoEl.value = '';
  valorEl.value     = '';
  descricaoEl.focus();
});

// Permite adicionar com Enter no campo de descrição ou valor
[descricaoEl, valorEl].forEach(el => {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnAdicionarEl.click();
  });
});

// Deletar transação (delegação de evento na lista)
// Escutamos cliques na lista inteira em vez de cada botão,
// pois os botões são criados dinamicamente pelo JavaScript.
listaEl.addEventListener('click', (e) => {
  if (!e.target.classList.contains('btn-deletar')) return;

  const id = Number(e.target.dataset.id);
  transacoes = transacoes.filter(t => t.id !== id);
  salvar();
  atualizar();
});

// Botões de filtro (Todos / Receitas / Despesas)
document.querySelectorAll('.filtro').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    filtroAtivo = btn.dataset.filtro;
    renderizarLista();
  });
});


/* ── 10. INICIALIZAÇÃO ── */

// Quando a página carrega, renderiza os dados já salvos no localStorage
atualizar();
