/**
 * MC'DU SALGADOS – Cardápio Digital
 *
 * NOVIDADES NESTA VERSÃO:
 *  1. Tela de entrada: nome + data + hora de retirada com validação de
 *     horário de funcionamento (quarta fechado, horários por dia da semana)
 *  2. Sistema de cento escalável: botões rápidos (25/50/75/100) +
 *     campo numérico livre para qualquer quantidade positiva (ex: 500, 1000)
 *     Preço: precoCento × (quantidade / 100) — sempre exato
 */

// ════════════════════════════════════════
// CONFIGURAÇÃO
// ════════════════════════════════════════

const WHATSAPP_NUMERO = '5519993985276';

/**
 * Horários de funcionamento por dia da semana.
 * Índice 0 = domingo, 1 = segunda, ..., 6 = sábado.
 * null = fechado.
 */
const HORARIOS_FUNC = {
  0: { abre: '09:00', fecha: '18:00' }, // Domingo
  1: { abre: '14:00', fecha: '22:00' }, // Segunda
  2: { abre: '14:00', fecha: '22:00' }, // Terça
  3: null,                               // Quarta – FECHADO
  4: { abre: '14:00', fecha: '22:00' }, // Quinta
  5: { abre: '14:00', fecha: '22:00' }, // Sexta
  6: { abre: '14:00', fecha: '22:00' }, // Sábado
};

const DIAS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// ════════════════════════════════════════
// ESTADO GLOBAL
// ════════════════════════════════════════

const estado = {
  nomeCliente: '',
  retirada: { dataStr: '', horaStr: '', textoFormatado: '' },
  pedido: {},
  /*
    pedido[catId] = {
      titulo:              string,
      tipo:                'unitario' | 'cento',
      precoUnit:           number,
      itens:               [{sabor, qtd}],       // 'unitario'
      qtdSelecionada:      number,               // 'cento'
      saboresSelecionados: string[],             // 'cento'
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
 * Resto vai 1 a 1 para os primeiros sabores.
 * Ex: distribuir(100, ['A','B','C']) → 34/33/33
 */
function distribuirSabores(total, sabores) {
  if (!sabores.length) return [];
  const base  = Math.floor(total / sabores.length);
  const resto = total % sabores.length;
  return sabores.map((sabor, i) => ({ sabor, qtd: base + (i < resto ? 1 : 0) }));
}

/** Retorna a data de hoje no formato YYYY-MM-DD */
function hojeISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Converte "HH:MM" em minutos desde meia-noite */
function horaParaMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Retorna o índice do dia da semana (0-6) para uma string "YYYY-MM-DD" */
function diaSemanaDeISO(isoStr) {
  // Usar UTC para evitar problemas de fuso horário no parsing
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// ════════════════════════════════════════
// TELA DE ENTRADA – VALIDAÇÃO DE HORÁRIO
// ════════════════════════════════════════

const inputData  = document.getElementById('data-retirada');
const inputHora  = document.getElementById('hora-retirada');
const hintDia    = document.getElementById('hint-dia');
const hintHora   = document.getElementById('hint-hora');

// Define data mínima = hoje
inputData.min = hojeISO();

/**
 * Atualiza o hint de dia e os limites do campo de hora.
 * Chamado sempre que o usuário muda a data.
 */
function onDataChange() {
  const dataVal = inputData.value;
  inputData.classList.remove('invalido', 'valido');
  hintDia.className = 'campo-hint';
  hintDia.textContent = '';
  inputHora.value = '';
  inputHora.removeAttribute('min');
  inputHora.removeAttribute('max');
  inputHora.classList.remove('invalido', 'valido');
  hintHora.className = 'campo-hint';
  hintHora.textContent = '';

  if (!dataVal) return;

  const diaSemana = diaSemanaDeISO(dataVal);
  const horario   = HORARIOS_FUNC[diaSemana];

  if (!horario) {
    // Fechado
    inputData.classList.add('invalido');
    hintDia.className = 'campo-hint erro';
    hintDia.textContent = `❌ ${DIAS_PT[diaSemana]} – Fechado`;
    inputData.value = '';
    return;
  }

  inputData.classList.add('valido');
  hintDia.className = 'campo-hint ok';
  hintDia.textContent = `✔ ${DIAS_PT[diaSemana]} – ${horario.abre} às ${horario.fecha}`;

  // Define limites de hora
  let minHora = horario.abre;

  // Se a data escolhida é hoje, o horário mínimo é o maior entre
  // a abertura e o horário atual + 1 minuto (não permite hora passada)
  if (dataVal === hojeISO()) {
    const agora  = new Date();
    const agoraMin = agora.getHours() * 60 + agora.getMinutes() + 1;
    const aberturaMin = horaParaMin(horario.abre);
    const efetMin = Math.max(agoraMin, aberturaMin);
    const hh = String(Math.floor(efetMin / 60)).padStart(2, '0');
    const mm = String(efetMin % 60).padStart(2, '0');
    minHora = `${hh}:${mm}`;
  }

  inputHora.min = minHora;
  inputHora.max = horario.fecha;
}

/**
 * Valida o horário escolhido e atualiza o hint.
 */
function onHoraChange() {
  const dataVal = inputData.value;
  const horaVal = inputHora.value;

  inputHora.classList.remove('invalido', 'valido');
  hintHora.className = 'campo-hint';
  hintHora.textContent = '';

  if (!dataVal || !horaVal) return;

  const diaSemana = diaSemanaDeISO(dataVal);
  const horario   = HORARIOS_FUNC[diaSemana];
  if (!horario) return;

  const horaMins    = horaParaMin(horaVal);
  const aberturaMins= horaParaMin(horario.abre);
  const fechaMins   = horaParaMin(horario.fecha);

  // Verifica se é hoje e hora passada
  let minPermitido = aberturaMins;
  if (dataVal === hojeISO()) {
    const agora = new Date();
    minPermitido = Math.max(aberturaMins, agora.getHours() * 60 + agora.getMinutes() + 1);
  }

  if (horaMins < minPermitido) {
    inputHora.classList.add('invalido');
    hintHora.className = 'campo-hint erro';
    if (dataVal === hojeISO() && horaMins < horaParaMin(new Date().getHours() + ':' + new Date().getMinutes())) {
      hintHora.textContent = '❌ Horário já passou. Escolha um horário futuro.';
    } else {
      hintHora.textContent = `❌ Ainda não abrimos. Abre às ${horario.abre}.`;
    }
    return;
  }

  if (horaMins > fechaMins) {
    inputHora.classList.add('invalido');
    hintHora.className = 'campo-hint erro';
    hintHora.textContent = `❌ Após o fechamento (${horario.fecha}).`;
    return;
  }

  inputHora.classList.add('valido');
  hintHora.className = 'campo-hint ok';
  hintHora.textContent = `✔ Horário válido`;
}

inputData.addEventListener('change', onDataChange);
inputHora.addEventListener('change', onHoraChange);

// ════════════════════════════════════════
// TELA DE ENTRADA – AVANÇAR
// ════════════════════════════════════════

document.getElementById('btn-entrar').addEventListener('click', () => {
  const nome    = document.getElementById('nome-cliente').value.trim();
  const dataVal = inputData.value;
  const horaVal = inputHora.value;

  if (!nome) {
    mostrarAlerta('Por favor, informe seu nome.');
    return;
  }
  if (!dataVal) {
    mostrarAlerta('Escolha a data de retirada.');
    return;
  }
  if (!horaVal) {
    mostrarAlerta('Escolha o horário de retirada.');
    return;
  }

  // Valida novamente programaticamente (campo pode ter sido digitado manualmente)
  const diaSemana = diaSemanaDeISO(dataVal);
  const horario   = HORARIOS_FUNC[diaSemana];

  if (!horario) {
    mostrarAlerta(`${DIAS_PT[diaSemana]} é dia de folga! Escolha outra data.`);
    return;
  }

  const horaMins     = horaParaMin(horaVal);
  const aberturaMins = horaParaMin(horario.abre);
  const fechaMins    = horaParaMin(horario.fecha);

  if (horaMins < aberturaMins) {
    mostrarAlerta(`Ainda não abrimos nesse dia. Funcionamos a partir das ${horario.abre}.`);
    return;
  }
  if (horaMins > fechaMins) {
    mostrarAlerta(`Já encerramos nesse horário. Fechamos às ${horario.fecha}.`);
    return;
  }
  if (dataVal === hojeISO()) {
    const agora    = new Date();
    const agoraMins= agora.getHours() * 60 + agora.getMinutes();
    if (horaMins <= agoraMins) {
      mostrarAlerta('Escolha um horário futuro para a retirada.');
      return;
    }
  }

  // Formata a data para exibição (DD/MM/AAAA)
  const [y, m, d] = dataVal.split('-');
  const dataFormatada = `${d}/${m}/${y}`;
  const textoFormatado = `${DIAS_PT[diaSemana]}, ${dataFormatada} às ${horaVal}`;

  estado.nomeCliente = nome;
  estado.retirada    = { dataStr: dataVal, horaStr: horaVal, textoFormatado };

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

    // Botões rápidos com preços proporcionais
    const opcoesRapidas = [25, 50, 75, 100];
    const botoesQtd = opcoesRapidas.map(qtd => `
      <button class="cn-btn-qtd" data-qtd="${qtd}">
        <span class="cn-qtd-numero">${qtd}</span>
        <span class="cn-qtd-label">unidades</span>
        <span class="cn-qtd-preco">${formatarBRL(precoCento * qtd / 100)}</span>
      </button>`).join('');

    // Bloco de sabores (sempre visível se tiver sabores)
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
      <div class="cn-custom-bloco">
        <span class="cn-custom-label">Ou informe outra quantidade:</span>
        <div class="cn-custom-row">
          <input
            type="number"
            class="cn-input-qtd"
            min="1"
            step="1"
            placeholder="Ex: 500"
          />
          <button class="cn-btn-aplicar">OK</button>
        </div>
      </div>
      ${blocoSabores}`;

    inicializarInteracoesCento(bloco, catId, titulo, precoCento, maxSabores, temSabores);
  });
}

// ════════════════════════════════════════
// INTERAÇÕES DE UM BLOCO DE CENTO
// ════════════════════════════════════════

function inicializarInteracoesCento(bloco, catId, titulo, precoCento, maxSabores, temSabores) {

  let qtdSelecionada      = 0;
  let saboresSelecionados = [];

  const btnQtds    = bloco.querySelectorAll('.cn-btn-qtd');
  const inputQtd   = bloco.querySelector('.cn-input-qtd');
  const btnAplicar = bloco.querySelector('.cn-btn-aplicar');
  const btnSabores = bloco.querySelectorAll('.cn-btn-sabor');
  const distBox    = bloco.querySelector('.cn-distribuicao');
  const distItens  = bloco.querySelector('.cn-distribuicao-itens');

  // ── Salva no estado global ──
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

  // ── Preview de distribuição ──
  function atualizarDistribuicao() {
    if (!temSabores || !distBox) return;
    if (!saboresSelecionados.length || !qtdSelecionada) {
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

  // ── Visual dos botões de sabor ──
  function atualizarBotoesSabor() {
    if (!temSabores) return;
    const limiteAtingido = maxSabores > 0 && saboresSelecionados.length >= maxSabores;
    btnSabores.forEach(btn => {
      const sel = saboresSelecionados.includes(btn.dataset.sabor);
      btn.classList.toggle('selecionado', sel);
      btn.classList.toggle('bloqueado', limiteAtingido && !sel);
    });
  }

  // ── Aplica uma quantidade (vinda de botão rápido ou input) ──
  function aplicarQuantidade(qtd) {
    qtdSelecionada = qtd;
    atualizarDistribuicao();
    atualizarBotoesSabor();
    salvarEstado();
  }

  // ── Limpa toda a seleção do bloco ──
  function limparTudo() {
    qtdSelecionada      = 0;
    saboresSelecionados = [];
    btnQtds.forEach(b => b.classList.remove('selecionado'));
    btnSabores.forEach(b => b.classList.remove('selecionado', 'bloqueado'));
    inputQtd.value = '';
    inputQtd.classList.remove('ativo');
    if (distBox) distBox.style.display = 'none';
    salvarEstado();
  }

  // ── Botões rápidos ──
  btnQtds.forEach(btn => {
    btn.addEventListener('click', () => {
      const novaQtd = parseInt(btn.dataset.qtd);

      if (qtdSelecionada === novaQtd) {
        // Segundo clique = desmarcar tudo
        limparTudo();
        return;
      }

      // Desmarca todos os botões e o input
      btnQtds.forEach(b => b.classList.remove('selecionado'));
      inputQtd.value = '';
      inputQtd.classList.remove('ativo');

      btn.classList.add('selecionado');
      aplicarQuantidade(novaQtd);
    });
  });

  // ── Botão "OK" do campo livre ──
  function aplicarInputQtd() {
    const raw = inputQtd.value.trim();
    const val = parseInt(raw);

    if (!raw || isNaN(val) || val < 1) {
      mostrarAlerta('Digite uma quantidade válida (mínimo 1).');
      inputQtd.focus();
      return;
    }

    // Desmarca botões rápidos
    btnQtds.forEach(b => b.classList.remove('selecionado'));
    inputQtd.classList.add('ativo');

    aplicarQuantidade(val);
  }

  btnAplicar.addEventListener('click', aplicarInputQtd);
  inputQtd.addEventListener('keydown', e => {
    if (e.key === 'Enter') aplicarInputQtd();
  });

  // ── Clique no sabor ──
  btnSabores.forEach(btn => {
    btn.addEventListener('click', () => {
      if (qtdSelecionada === 0) {
        mostrarAlerta('Primeiro escolha a quantidade acima (botões rápidos ou campo livre).');
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
      display.textContent = n; setItem(n); atualizarTotais();
    });
    btnMenos.addEventListener('click', () => {
      const atual = parseInt(display.textContent);
      if (atual <= 0) return;
      const n = atual - 1;
      display.textContent = n; setItem(n); atualizarTotais();
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
// VALIDAÇÃO DO PEDIDO
// ════════════════════════════════════════

function validarPedido() {
  if (Object.keys(estado.pedido).length === 0)
    return 'Seu pedido está vazio! Selecione pelo menos um item.';

  for (const [catId, cat] of Object.entries(estado.pedido)) {
    if (cat.tipo === 'cento') {
      if (!cat.qtdSelecionada)
        return `Em "${cat.titulo}": escolha a quantidade.`;

      const blocoEl = document.querySelector(`.cento-novo[data-cat="${catId}"]`);
      if (blocoEl) {
        const temSabores = blocoEl.dataset.sabores && blocoEl.dataset.sabores.trim() !== '';
        if (temSabores && (!cat.saboresSelecionados || !cat.saboresSelecionados.length))
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
  document.getElementById('resumo-nome').textContent     = estado.nomeCliente;
  document.getElementById('resumo-retirada').textContent = estado.retirada.textoFormatado;

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

      if (cat.saboresSelecionados && cat.saboresSelecionados.length) {
        for (const d of distribuirSabores(cat.qtdSelecionada, cat.saboresSelecionados)) {
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
  msg += `🕐 *Retirada:* ${estado.retirada.textoFormatado}\n`;
  msg += `─────────────────────────\n\n`;

  for (const cat of Object.values(estado.pedido)) {
    msg += `📦 *${cat.titulo}*\n`;
    if (cat.tipo === 'unitario') {
      for (const item of cat.itens)
        msg += `   • ${item.sabor}: ${item.qtd}x — ${formatarBRL(cat.precoUnit * item.qtd)}\n`;
    } else {
      const v = cat.precoUnit * (cat.qtdSelecionada / 100);
      msg += `   • ${cat.qtdSelecionada} unidades — ${formatarBRL(v)}\n`;
      if (cat.saboresSelecionados && cat.saboresSelecionados.length) {
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