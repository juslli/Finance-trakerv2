// ============================================================
// 1. ESTADO DA APLICAÇÃO
// Todas as transações ficam nesse array.
// Carregamos do localStorage se já existir algo salvo.
// ============================================================
let transacoes = JSON.parse(localStorage.getItem('financas')) || [];
let filtroAtivo = 'todos';

// ============================================================
// 2. REFERÊNCIAS AO HTML
// Pegamos os elementos uma vez e reutilizamos.
// ============================================================
const listaEl        = document.getElementById('lista-transacoes');
const listaVaziaEl   = document.getElementById('lista-vazia');
const saldoEl        = document.getElementById('saldo');
const receitasEl     = document.getElementById('total-receitas');
const despesasEl     = document.getElementById('total-despesas');
const btnAdicionar   = document.getElementById('btn-adicionar');

// ============================================================
// 3. FORMATAR MOEDA
// Intl.NumberFormat formata número para R$ 1.250,00 automaticamente
// ============================================================
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

// ============================================================
// 4. SALVAR NO LOCALSTORAGE
// Sempre que o array mudar, salvamos. Os dados persistem
// mesmo fechando o navegador.
// ============================================================
function salvar() {
  localStorage.setItem('financas', JSON.stringify(transacoes));
}

// ============================================================
// 5. ATUALIZAR OS CARDS DE RESUMO
// Recalcula saldo, receitas e despesas do zero toda vez.
// ============================================================
function atualizarResumo() {
  const receitas  = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((soma, t) => soma + t.valor, 0);

  const despesas  = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((soma, t) => soma + t.valor, 0);

  const saldo = receitas - despesas;

  saldoEl.textContent    = formatarMoeda(saldo);
  receitasEl.textContent = formatarMoeda(receitas);
  despesasEl.textContent = formatarMoeda(despesas);

  // Saldo fica vermelho se negativo
  saldoEl.style.color = saldo < 0 ? '#f87171' : '#f8fafc';
}

// ============================================================
// 6. RENDERIZAR A LISTA
// Limpa a lista e redesenha todas as transações filtradas.
// ============================================================
function renderizarLista() {
  listaEl.innerHTML = '';

  const filtradas = filtroAtivo === 'todos'
    ? transacoes
    : transacoes.filter(t => t.tipo === filtroAtivo);

  if (filtradas.length === 0) {
    listaVaziaEl.style.display = 'block';
    return;
  }

  listaVaziaEl.style.display = 'none';

  // Mostramos do mais recente para o mais antigo
  [...filtradas].reverse().forEach(transacao => {
    const sinal = transacao.tipo === 'receita' ? '+' : '-';

    const item = document.createElement('li');
    item.classList.add('lista-item', transacao.tipo);
    item.innerHTML = `
      <div class="item-info">
        <span class="item-descricao">${transacao.descricao}</span>
        <span class="item-categoria">${transacao.categoria}</span>
      </div>
      <div class="item-direita">
        <span class="item-valor ${transacao.tipo}">
          ${sinal} ${formatarMoeda(transacao.valor)}
        </span>
        <button class="btn-deletar" data-id="${transacao.id}">✕</button>
      </div>
    `;

    listaEl.appendChild(item);
  });
}

// ============================================================
// 7. ATUALIZAR TUDO DE UMA VEZ
// Uma função que chama tudo — facilita manutenção.
// ============================================================
function atualizar() {
  atualizarResumo();
  renderizarLista();
}

// ============================================================
// 8. ADICIONAR TRANSAÇÃO
// Lê os inputs, valida, cria objeto e salva.
// ============================================================
btnAdicionar.addEventListener('click', () => {
  const descricao  = document.getElementById('descricao').value.trim();
  const valor      = parseFloat(document.getElementById('valor').value);
  const tipo       = document.getElementById('tipo').value;
  const categoria  = document.getElementById('categoria').value;

  // Validação simples
  if (!descricao) {
    alert('Por favor, adicione uma descrição.');
    return;
  }
  if (!valor || valor <= 0) {
    alert('Por favor, insira um valor válido.');
    return;
  }

  // Criamos um objeto de transação com ID único
  const novaTransacao = {
    id: Date.now(), // ID baseado em timestamp — sempre único
    descricao,
    valor,
    tipo,
    categoria
  };

  transacoes.push(novaTransacao);
  salvar();
  atualizar();

  // Limpa o formulário
  document.getElementById('descricao').value = '';
  document.getElementById('valor').value = '';
});

// ============================================================
// 9. DELETAR TRANSAÇÃO
// Usamos delegação de eventos: ouvimos cliques na LISTA,
// não em cada botão — mais eficiente e funciona
// com elementos criados dinamicamente.
// ============================================================
listaEl.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-deletar')) {
    const id = Number(e.target.dataset.id);
    transacoes = transacoes.filter(t => t.id !== id);
    salvar();
    atualizar();
  }
});

// ============================================================
// 10. FILTROS
// ============================================================
document.querySelectorAll('.filtro').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    filtroAtivo = btn.dataset.filtro;
    renderizarLista();
  });
});

// ============================================================
// 11. INICIALIZAR
// Quando a página carrega, já renderizamos os dados salvos.
// ============================================================
atualizar();