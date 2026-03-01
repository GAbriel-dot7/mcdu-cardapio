/**
 * MC'DU SALGADOS – Cardápio Digital
 *
 * LÓGICA DE CENTO:
 *  1. Sabores ficam visíveis imediatamente (sem precisar clicar na quantidade)
 *  2. Cliente escolhe a quantidade: 25 / 50 / 75 / 100 unidades
 *  3. Cliente toca nos sabores desejados (toggle simples)
 *  4. Sistema distribui automaticamente as unidades entre os sabores
 *
 * PREÇOS: proporcionais ao cento (precoCento × qtd / 100), sem arredondamento
 *
 * DISTRIBUIÇÃO AUTOMÁTICA:
 *  - divide igualmente; o resto é distribuído um a um nos primeiros sabores
 *  - Ex: 75 ÷ 4 sabores = 19/19/19/18
 */

// ════════════════════════════════════════
// CONFIGURAÇÃO
// ════════════════════════════════════════
const WHATSAPP_NUMERO = '5519993985276';

// ════════════════════════════════════════
// ESTADO GLOBAL
// ════════════════════════════════════════
const estado = {
  nomeCliente: '',
  pedido: {},
  /*
    pedido[catId] = {
      titulo:              string,
      tipo:                'unitario' | 'cento',
      precoUnit:           number,   // unitário: preço/un; cento: preço/100un
      itens:               [{sabor, qtd}],   // usado apenas em 'unitario'
      qtdSelecionada:      number,   // 25 | 50 | 75 | 100 (cento)
      saboresSelecionados: string[], // (cento)
    }
  */
};

// ════════════════════════════════════════
// UTILITÁRIOS
// ════════════════════════════════════════

function formatarBRL(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataHoraAtual() {
  const d = new Date();
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function mostrarAlerta(msg) {
  document.getElementById('modal-msg').textContent = msg;
  document.getElementById('modal-alerta').style.display = 'flex';
}
document.getElementById('modal-ok').addEventListener('click', () => {
  document.getElementById('modal-alerta').style.display = 'none';
});

function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');
  window.scrollTo(0, 0);
}

/**
 * Distribui `total` unidades entre `sabores` igualmente.
 * O resto da divisão vai para os primeiros sabores (um a mais cada).
 */
function distribuirSabores(total, sabores) {
  if (!sabores.length) return [];
  const base  = Math.floor(total / sabores.length);
  const resto = total % sabores.length;
  return sabores.map((sabor, i) => ({ sabor, qtd: base + (i < resto ? 1 : 0) }));
}

// ════════════════════════════════════════
// TELA DE ENTRADA
// ════════════════════════════════════════

document.getElementById('btn-entrar').addEventListener('click', () => {
  const nome = document.getElementById('nome-cliente').value.trim();
  if (!nome) { mostrarAlerta('Por favor, informe seu nome antes de continuar.'); return; }
  estado.nomeCliente = nome;
  mostrarTela('tela-cardapio');
});
document.getElementById('nome-cliente').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-entrar').click();
});

// ════════════════════════════════════════
// NAV DE CATEGORIAS
// ════════════════════════════════════════

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const s = document.getElementById(btn.dataset.cat);
    if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
  });
});

// ════════════════════════════════════════
// RENDERIZAÇÃO DOS BLOCOS DE CENTO
// Lê os data-* do HTML e monta o HTML interno
// ════════════════════════════════════════

function renderizarBlocosCento() {
  document.querySelectorAll('.cento-novo').forEach(bloco => {
    const catId      = bloco.dataset.cat;
    const titulo     = bloco.dataset.titulo;
    const precoCento = parseFloat(bloco.dataset.precoCento);
    const maxSabores = parseInt(bloco.dataset.maxSabores) || 0;
    const sabores    = bloco.dataset.sabores
      ? bloco.dataset.sabores.split('|').map(s => s.trim()).filter(Boolean)
      : [];
    const temSabores = sabores.length > 0;

    // Preços proporcionais exatos (sem arredondamento)
    const opcoes = [
      { qtd: 25,  preco: precoCento * 25  / 100 },
      { qtd: 50,  preco: precoCento * 50  / 100 },
      { qtd: 75,  preco: precoCento * 75  / 100 },
      { qtd: 100, preco: precoCento * 100 / 100 },
    ];

    // Botões de quantidade
    const botoesQtd = opcoes.map(o => `
      <button class="cn-btn-qtd" data-qtd="${o.qtd}">
        <span class="cn-qtd-numero">${o.qtd}</span>
        <span class="cn-qtd-label">unidades</span>
        <span class="cn-qtd-preco">${formatarBRL(o.preco)}</span>
      </button>`).join('');

    // Bloco de sabores (sempre visível se houver sabores)
    let blocoSabores = '';
    if (temSabores) {
      const avisoMax = maxSabores > 0
        ? `<span class="cn-aviso-max">Escolha até ${maxSabores} sabores</span>`
        : '';
      const btnsSabores = sabores
        .map(s => `<button class="cn-btn-sabor" data-sabor="${s}">${s}</button>`)
        .join('');

      blocoSabores = `
        <hr class="cn-divisor" />
        <div class="cn-sabores-area">
          <p class="cn-step-label">Escolha os sabores:</p>
          ${avisoMax}
          <div class="cn-sabores-lista">${btnsSabores}</div>
          <div class="cn-distribuicao">
            <p class="cn-distribuicao-titulo">✦ Distribuição automática</p>
            <div class="cn-distribuicao-itens"></div>
          </div>
        </div>`;
    }

    bloco.innerHTML = `
      <p class="cn-step-label">Quantas unidades?</p>
      <div class="cn-opcoes-qtd">${botoesQtd}</div>
      ${blocoSabores}`;

    // Inicializa as interações
    inicializarInteracoesCento(bloco, catId, titulo, precoCento, maxSabores, temSabores);
  });
}

// ════════════════════════════════════════
// INTERAÇÕES DE UM BLOCO DE CENTO
// ════════════════════════════════════════

function inicializarInteracoesCento(bloco, catId, titulo, precoCento, maxSabores, temSabores) {

  let qtdSelecionada      = 0;
  let saboresSelecionados = [];

  const btnQtds   = bloco.querySelectorAll('.cn-btn-qtd');
  const btnSabores= bloco.querySelectorAll('.cn-btn-sabor');
  const distBox   = bloco.querySelector('.cn-distribuicao');
  const distItens = bloco.querySelector('.cn-distribuicao-itens');

  // Salva ou remove categoria no estado global
  function salvarEstado() {
    const valido = qtdSelecionada > 0 &&
      (!temSabores || saboresSelecionados.length > 0);

    if (!valido) {
      delete estado.pedido[catId];
    } else {
      estado.pedido[catId] = {
        titulo,
        tipo:                'cento',
        precoUnit:           precoCento,
        qtdSelecionada,
        saboresSelecionados: [...saboresSelecionados],
      };
    }
    atualizarTotais();
  }

  // Atualiza o preview de distribuição
  function atualizarDistribuicao() {
    if (!temSabores || !distBox) return;
    if (saboresSelecionados.length === 0 || qtdSelecionada === 0) {
      distBox.style.display = 'none';
      return;
    }
    const dist = distribuirSabores(qtdSelecionada, saboresSelecionados);
    distItens.innerHTML = dist
      .map(d => `
        <div class="cn-dist-item">
          <span class="cn-dist-nome">${d.sabor}</span>
          <span class="cn-dist-qtd">${d.qtd} un.</span>
        </div>`)
      .join('');
    distBox.style.display = 'block';
  }

  // Atualiza visual dos botões de sabor (selecionado / bloqueado)
  function atualizarBotoesSabor() {
    if (!temSabores) return;
    const limiteAtingido = maxSabores > 0 && saboresSelecionados.length >= maxSabores;
    btnSabores.forEach(btn => {
      const sel = saboresSelecionados.includes(btn.dataset.sabor);
      btn.classList.toggle('selecionado', sel);
      btn.classList.toggle('bloqueado', limiteAtingido && !sel);
    });
  }

  // ── Clique na quantidade ──
  btnQtds.forEach(btn => {
    btn.addEventListener('click', () => {
      const novaQtd = parseInt(btn.dataset.qtd);

      if (qtdSelecionada === novaQtd) {
        // Segundo clique na mesma opção = desmarcar tudo
        qtdSelecionada        = 0;
        saboresSelecionados   = [];
        btnQtds.forEach(b => b.classList.remove('selecionado'));
        btnSabores.forEach(b => b.classList.remove('selecionado', 'bloqueado'));
        if (distBox) distBox.style.display = 'none';
        salvarEstado();
        return;
      }

      qtdSelecionada = novaQtd;
      btnQtds.forEach(b => b.classList.remove('selecionado'));
      btn.classList.add('selecionado');

      atualizarDistribuicao();
      atualizarBotoesSabor();
      salvarEstado();
    });
  });

  // ── Clique no sabor ──
  btnSabores.forEach(btn => {
    btn.addEventListener('click', () => {
      // Avisa para escolher quantidade primeiro, mas não bloqueia
      if (qtdSelecionada === 0) {
        mostrarAlerta('Escolha primeiro a quantidade (25, 50, 75 ou 100 unidades) acima.');
        return;
      }

      const sabor = btn.dataset.sabor;
      if (saboresSelecionados.includes(sabor)) {
        saboresSelecionados = saboresSelecionados.filter(s => s !== sabor);
      } else {
        if (maxSabores > 0 && saboresSelecionados.length >= maxSabores) {
          mostrarAlerta(`Máximo de ${maxSabores} sabores para esta categoria!\nDesmarque um para trocar.`);
          return;
        }
        saboresSelecionados.push(sabor);
      }

      atualizarBotoesSabor();
      atualizarDistribuicao();
      salvarEstado();
    });
  });
}

// ════════════════════════════════════════
// ITENS UNITÁRIOS
// ════════════════════════════════════════

function initItensUnitarios() {
  document.querySelectorAll('.item-unitario, .item-cento-direto').forEach(item => {
    const catId  = item.dataset.cat;
    const sabor  = item.dataset.sabor;
    const preco  = parseFloat(item.dataset.preco);
    const titulo = item.closest('.categoria').querySelector('h2').textContent;

    const display  = item.querySelector('.qtd-valor');
    const btnMais  = item.querySelector('.btn-mais');
    const btnMenos = item.querySelector('.btn-menos');

    function ensureCat() {
      if (!estado.pedido[catId])
        estado.pedido[catId] = { titulo, tipo: 'unitario', precoUnit: preco, itens: [] };
    }

    function setItem(qtd) {
      ensureCat();
      const cat = estado.pedido[catId];
      const idx = cat.itens.findIndex(i => i.sabor === sabor);
      if (qtd <= 0) { if (idx >= 0) cat.itens.splice(idx, 1); }
      else if (idx >= 0) cat.itens[idx].qtd = qtd;
      else cat.itens.push({ sabor, qtd });
      if (cat.itens.length === 0) delete estado.pedido[catId];
    }

    btnMais.addEventListener('click', () => {
      const n = parseInt(display.textContent) + 1;
      display.textContent = n;
      setItem(n);
      atualizarTotais();
    });
    btnMenos.addEventListener('click', () => {
      const atual = parseInt(display.textContent);
      if (atual <= 0) return;
      const n = atual - 1;
      display.textContent = n;
      setItem(n);
      atualizarTotais();
    });
  });
}

// ════════════════════════════════════════
// TOTAIS E BADGE
// ════════════════════════════════════════

function calcularTotal() {
  let total = 0;
  for (const cat of Object.values(estado.pedido)) {
    if (cat.tipo === 'unitario')
      total += cat.itens.reduce((s, i) => s + cat.precoUnit * i.qtd, 0);
    else
      total += cat.precoUnit * (cat.qtdSelecionada / 100);
  }
  return total;
}

function contarSelecoes() {
  let n = 0;
  for (const cat of Object.values(estado.pedido)) {
    if (cat.tipo === 'unitario') n += cat.itens.reduce((s, i) => s + i.qtd, 0);
    else n += cat.qtdSelecionada || 0;
  }
  return n;
}

function atualizarTotais() {
  const total = calcularTotal();
  const count = contarSelecoes();
  document.getElementById('badge-itens').textContent = count;
  document.getElementById('valor-total').textContent = formatarBRL(total);
  document.getElementById('barra-total').style.display = count > 0 ? 'flex' : 'none';
}

// ════════════════════════════════════════
// VALIDAÇÃO
// ════════════════════════════════════════

function validarPedido() {
  if (Object.keys(estado.pedido).length === 0)
    return 'Seu pedido está vazio! Selecione pelo menos um item.';

  for (const [catId, cat] of Object.entries(estado.pedido)) {
    if (cat.tipo === 'cento') {
      if (!cat.qtdSelecionada)
        return `Em "${cat.titulo}": escolha a quantidade (25, 50, 75 ou 100).`;

      // Verifica se a categoria tem sabores disponíveis
      const blocoEl = document.querySelector(`.cento-novo[data-cat="${catId}"]`);
      if (blocoEl) {
        const temSabores = blocoEl.dataset.sabores && blocoEl.dataset.sabores.trim() !== '';
        if (temSabores && (!cat.saboresSelecionados || cat.saboresSelecionados.length === 0))
          return `Em "${cat.titulo}": escolha pelo menos 1 sabor.`;
      }
    }
  }
  return null;
}

// ════════════════════════════════════════
// TELA DE RESUMO
// ════════════════════════════════════════

function construirResumo() {
  document.getElementById('resumo-nome').textContent = estado.nomeCliente;
  document.getElementById('resumo-data').textContent = dataHoraAtual();

  const lista = document.getElementById('resumo-lista');
  lista.innerHTML = '';
  let totalGeral = 0;

  for (const [catId, cat] of Object.entries(estado.pedido)) {
    const div = document.createElement('div');
    div.className = 'resumo-categoria';
    let html = `<h3>${cat.titulo}</h3>`;

    if (cat.tipo === 'unitario') {
      for (const item of cat.itens) {
        const v = cat.precoUnit * item.qtd;
        totalGeral += v;
        html += `
          <div class="resumo-item">
            <span class="resumo-item-nome">${item.sabor}</span>
            <span class="resumo-item-qtd">${item.qtd}×</span>
            <span class="resumo-item-preco">${formatarBRL(v)}</span>
          </div>`;
      }
    } else {
      const v = cat.precoUnit * (cat.qtdSelecionada / 100);
      totalGeral += v;
      html += `
        <div class="resumo-item">
          <span class="resumo-item-nome">${cat.qtdSelecionada} unidades</span>
          <span class="resumo-item-qtd"></span>
          <span class="resumo-item-preco">${formatarBRL(v)}</span>
        </div>`;

      if (cat.saboresSelecionados && cat.saboresSelecionados.length > 0) {
        const dist = distribuirSabores(cat.qtdSelecionada, cat.saboresSelecionados);
        for (const d of dist) {
          html += `
            <div class="resumo-item" style="padding-left:24px">
              <span class="resumo-item-nome" style="color:var(--cinza-txt)">↳ ${d.sabor}</span>
              <span class="resumo-item-qtd">${d.qtd} un.</span>
              <span class="resumo-item-preco"></span>
            </div>`;
        }
      }
    }

    div.innerHTML = html;
    lista.appendChild(div);
  }

  document.getElementById('resumo-total').textContent = formatarBRL(totalGeral);
}

['btn-ver-resumo', 'btn-ver-pedido'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    const erro = validarPedido();
    if (erro) { mostrarAlerta(erro); return; }
    construirResumo();
    mostrarTela('tela-resumo');
  });
});

document.getElementById('btn-voltar-cardapio').addEventListener('click', () => {
  mostrarTela('tela-cardapio');
});

// ════════════════════════════════════════
// MENSAGEM WHATSAPP
// ════════════════════════════════════════

function gerarMensagem() {
  let msg = `*Pedido – MC'DU Salgados*\n\n`;
  msg += `👤 *Cliente:* ${estado.nomeCliente}\n`;
  msg += `📅 *Data/Hora:* ${dataHoraAtual()}\n`;
  msg += `─────────────────────────\n\n`;

  for (const cat of Object.values(estado.pedido)) {
    msg += `📦 *${cat.titulo}*\n`;
    if (cat.tipo === 'unitario') {
      for (const item of cat.itens)
        msg += `   • ${item.sabor}: ${item.qtd}x — ${formatarBRL(cat.precoUnit * item.qtd)}\n`;
    } else {
      const v = cat.precoUnit * (cat.qtdSelecionada / 100);
      msg += `   • ${cat.qtdSelecionada} unidades — ${formatarBRL(v)}\n`;
      if (cat.saboresSelecionados && cat.saboresSelecionados.length > 0) {
        for (const d of distribuirSabores(cat.qtdSelecionada, cat.saboresSelecionados))
          msg += `     ↳ ${d.sabor}: ${d.qtd} un.\n`;
      }
    }
    msg += '\n';
  }

  msg += `─────────────────────────\n`;
  msg += `💰 *TOTAL: ${formatarBRL(calcularTotal())}*\n`;
  msg += `─────────────────────────\n`;
  msg += `_Pedido enviado pelo cardápio digital MC'DU Salgados_`;
  return msg;
}

document.getElementById('btn-whatsapp').addEventListener('click', () => {
  const erro = validarPedido();
  if (erro) {
    const el = document.getElementById('alerta-resumo');
    el.textContent = erro; el.style.display = 'block';
    return;
  }
  document.getElementById('alerta-resumo').style.display = 'none';
  window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(gerarMensagem())}`, '_blank');
});

// ════════════════════════════════════════
// INICIALIZAÇÃO
// ════════════════════════════════════════

function init() {
  renderizarBlocosCento();
  initItensUnitarios();
  atualizarTotais();
}

init();