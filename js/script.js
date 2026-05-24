/**
 * MC'DU SALGADOS – Cardápio Digital
 *
 * ATUALIZAÇÕES NESTA VERSÃO:
 *  1. Limite de sabores proporcional à quantidade selecionada:
 *     - Assados:    25un→2 | 50un→3 | 75un→4 | 100un→5
 *     - Fritos:     25un→4 | 50un→5 | 75un→5 | 100un→5
 *     - Mini Pizzas:25un→4 | 50un→5 | 75un→5 | 100un→5
 *     - Controlado via data-sabores-por-qtd no HTML
 *  2. Mensagem WhatsApp inclui nome da empresa e CNPJ
 */

// ════════════════════════════════════════
// CONFIGURAÇÃO
// ════════════════════════════════════════

const WHATSAPP_NUMERO = '5519993985276';
const EMPRESA_NOME    = "MC'DU SALGADOS";
const EMPRESA_CNPJ    = '46.437.580/0001-80';
const TIMEZONE_LOJA    = 'America/Sao_Paulo';
const HORA_MINIMA_PEDIDO = '06:00';
const AVISO_DOMINGO = 'Atendimento aos domingos sujeito a confirmação. Verifique conosco se a data escolhida estará em funcionamento.';
const RAW_TAXAS_ENTREGA = [
  ['Residencial da Torre', 9],
  ['Parque das Palmeiras', 9],
  ['Jd Dona Leda', 9],
  ['Bom Jardim', 5],
  ['Bela Vista', 5],
  ['Jd Olinda', 5],
  ['Jd Florindo Caetano', 5],
  ['Jd Laranjeiras', 5],
  ['Saciloto 1 e 2', 5],
  ['Jd Medeiros', 5],
  ['Jd Jatobá', 5],
  ['Jd Martinelli', 10],
  ['Orlando Corrêa', 7],
  ['Itamaraty (perto do Pague Menos)', 8],
  ['Itamaraty (demais regiões)', 7],
  ['Perto do Pague Menos', 10],
  ['Jd do Lago', 8],
  ['Vila Nogueira', 8],
  ['Residencial Manhattan', 10],
  ['Residencial San Marino', 10],
  ['Escola Anglo', 10],
  ['Residencial São Luís', 12],
  ['Residencial Manacás', 15],
  ['Casinhas', 8],
  ['Resek 1, 2 e 3', 8],
  ['Conquista 1 e 2', 10],
  ['Centro', 7],
  ['Parque dos Trabalhadores', 5],
  ['Leonor', 5],
  ['São Vicente', 5],
  ['Coração Criança', 7],
  ['Vista Alegre', 7],
  ['Cosmópolis até a rodoviária', 25],
  ['Cosmópolis (bairros)', 35],
  ['Holambra até o moinho', 30],
  ['Holambra (bairros)', 45],
  ['Engenheiro Coelho (faculdade)', 38],
  ['Engenheiro Coelho (bairros)', 45],
  ['Jaguariúna (estação)', 50],
  ['Jaguariúna (bairros)', 60],
  ['Outros municípios', 0],
  ['Embrasatec', 8],
  ['Jardim Carolina', 5],
  ['Jardim Planalto', 5],
  ['Parque das Flores', 7],
  ['Conservani', 5],
  ['Jd Amaro', 5]
];

// Normaliza as chaves para lookup rápido (sem acentos e em maiúsculas)
const TAXAS_ENTREGA_POR_BAIRRO = RAW_TAXAS_ENTREGA.reduce((acc, [nome, taxa]) => {
  acc[normalizarTexto(nome)] = taxa;
  return acc;
}, {});

const BAIRROS_PARA_SUGESTAO = RAW_TAXAS_ENTREGA.map(([nome]) => nome);

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
  pedidoAgendado: false,
  agendadoForaExpediente: false,
  modoVisualizacao: false,
  pedido: {},
  entrega: {
    bairro: '',
    endereco: '',
    taxa: 0,
  },
};

// Test log buffer (populated only when present on window)
// (debug logs removed)

// ════════════════════════════════════════
// UTILITÁRIOS
// ════════════════════════════════════════

function formatarBRL(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

function aplicarModoVisualizacao(ativo) {
  estado.modoVisualizacao = ativo;
  document.body.classList.toggle('modo-vitrine', ativo);
  const aviso = document.getElementById('aviso-vitrine');
  if (aviso) aviso.style.display = ativo ? 'block' : 'none';
}

function distribuirSabores(total, sabores) {
  if (!sabores.length) return [];
  const base  = Math.floor(total / sabores.length);
  const resto = total % sabores.length;
  return sabores.map((sabor, i) => ({ sabor, qtd: base + (i < resto ? 1 : 0) }));
}

function hojeISO() {
  return agoraNoFuso().dataISO;
}

function agoraNoFuso(timeZone = TIMEZONE_LOJA) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(new Date())
    .reduce((acc, parte) => {
      if (parte.type !== 'literal') acc[parte.type] = parte.value;
      return acc;
    }, {});

  return {
    dataISO: `${partes.year}-${partes.month}-${partes.day}`,
    horaMin: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

function horaParaMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function estaDentroHorarioFuncionamento(dataISO, horaMin) {
  const diaSemana = diaSemanaDeISO(dataISO);
  const horario = HORARIOS_FUNC[diaSemana];
  if (!horario) return false;
  const aberturaMins = horaParaMin(horario.abre);
  const fechaMins = horaParaMin(horario.fecha);
  return horaMin >= aberturaMins && horaMin <= fechaMins;
}

function parseMoedaInput(valor) {
  if (typeof valor !== 'string') return 0;
  const normalizado = valor.replace(',', '.').trim();
  const num = parseFloat(normalizado);
  return Number.isFinite(num) ? num : 0;
}

function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function diasEntreISO(isoA, isoB) {
  // Retorna número inteiro de dias de isoA até isoB (isoB - isoA)
  const [ay, am, ad] = isoA.split('-').map(Number);
  const [by, bm, bd] = isoB.split('-').map(Number);
  const a = new Date(ay, am - 1, ad);
  const b = new Date(by, bm - 1, bd);
  const diff = Math.floor((b - a) / 86400000);
  return diff;
}

function obterTaxaEntrega(bairro) {
  const chave = normalizarTexto(bairro);
  // Caso especial: 'Outros municipios' exige combinacao direta
  if (chave === normalizarTexto('Outros municípios')) return null;
  const taxa = TAXAS_ENTREGA_POR_BAIRRO[chave];
  return Number.isFinite(taxa) ? taxa : 0;
}

function diaSemanaDeISO(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * Converte a string "25:2,50:3,75:4,100:5" num objeto { 25:2, 50:3, 75:4, 100:5 }.
 */
function parseSaboresPorQtd(str) {
  if (!str) return null;
  const map = {};
  str.split(',').forEach(par => {
    const [qtd, max] = par.split(':').map(Number);
    if (!isNaN(qtd) && !isNaN(max)) map[qtd] = max;
  });
  return Object.keys(map).length ? map : null;
}

/**
 * Dado um mapa de {quantidade: maxSabores} e uma quantidade escolhida,
 * retorna quantos sabores são permitidos.
 *
 * Regra: usa o limite da menor chave do mapa que seja >= qty.
 * Se qty for maior que todas as chaves, usa o valor da maior chave.
 *
 * Exemplo (mapa assados {25:2, 50:3, 75:4, 100:5}):
 *   qty=25  → 2
 *   qty=30  → 3  (próxima chave ≥ 30 é 50)
 *   qty=75  → 4
 *   qty=200 → 5  (qty > todas as chaves, usa máximo)
 */
function calcularMaxSaboresPorQtd(saboresMap, qty) {
  if (!saboresMap) return 0; // 0 = sem limite

  const chaves = Object.keys(saboresMap).map(Number).sort((a, b) => a - b);

  // qty maior que todas as chaves → usa o limite da maior chave
  if (qty >= chaves[chaves.length - 1]) return saboresMap[chaves[chaves.length - 1]];

  // Encontra a menor chave que seja >= qty
  for (const chave of chaves) {
    if (qty <= chave) return saboresMap[chave];
  }

  return saboresMap[chaves[chaves.length - 1]];
}

// ════════════════════════════════════════
// TELA DE ENTRADA – VALIDAÇÃO DE HORÁRIO
// ════════════════════════════════════════

const inputData = document.getElementById('data-retirada');
const inputHora = document.getElementById('hora-retirada');
const hintDia   = document.getElementById('hint-dia');
const hintHora  = document.getElementById('hint-hora');

inputData.min = hojeISO();

function onDataChange() {
  const dataVal = inputData.value;
  const agoraLoja = agoraNoFuso();
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
  const diasAte = diasEntreISO(agoraLoja.dataISO, dataVal);

  if (!horario) {
    inputData.classList.add('invalido');
    hintDia.className = 'campo-hint erro';
    hintDia.textContent = `❌ ${DIAS_PT[diaSemana]} – Fechado`;
    inputData.value = '';
    return;
  }

  // Se a data for pelo menos 1 dia no futuro, permitimos agendar fora do horário
  if (diasAte >= 1) {
    inputData.classList.add('valido');
    hintDia.className = 'campo-hint ok';
    hintDia.textContent = diaSemana === 0
      ? `✔ Pedido agendado para ${DIAS_PT[diaSemana]} (1+ dia de antecedência). ${AVISO_DOMINGO}`
      : `✔ Pedido agendado para ${DIAS_PT[diaSemana]} (1+ dia de antecedência).`;
    inputHora.min = HORA_MINIMA_PEDIDO;
    inputHora.max = '23:59';
    return;
  }

  inputData.classList.add('valido');
  hintDia.className = 'campo-hint ok';
  hintDia.textContent = diaSemana === 0
    ? `✔ ${DIAS_PT[diaSemana]} – ${horario.abre} às ${horario.fecha}. ${AVISO_DOMINGO}`
    : `✔ ${DIAS_PT[diaSemana]} – ${horario.abre} às ${horario.fecha}`;

  let minHora = horario.abre;
  if (dataVal === agoraLoja.dataISO) {
    const agoraMin = agoraLoja.horaMin + 1;
    const abertMin = horaParaMin(horario.abre);
    const efetMin  = Math.max(agoraMin, abertMin);
    const hh = String(Math.floor(efetMin / 60)).padStart(2, '0');
    const mm = String(efetMin % 60).padStart(2, '0');
    minHora = `${hh}:${mm}`;
  }

  inputHora.min = minHora;
  inputHora.max = horario.fecha;
}

function onHoraChange() {
  const dataVal = inputData.value;
  const horaVal = inputHora.value;
  const agoraLoja = agoraNoFuso();

  inputHora.classList.remove('invalido', 'valido');
  hintHora.className = 'campo-hint';
  hintHora.textContent = '';

  if (!dataVal || !horaVal) return;

  const diaSemana    = diaSemanaDeISO(dataVal);
  const horario      = HORARIOS_FUNC[diaSemana];
  const diasAte = diasEntreISO(agoraLoja.dataISO, dataVal);
  // Se for dia fechado (ex: quarta), não valida hora aqui — deixa o botão tratar o erro
  if (!horario) return;

  // Se agendamento com 1+ dia de antecedência, valida apenas dentro da janela geral de retirada (06:00-22:00)
  const pickupInicio = horaParaMin(HORA_MINIMA_PEDIDO);
  const pickupFim = 22 * 60; // 22:00 em minutos
  if (diasAte >= 1) {
    const horaMins = horaParaMin(horaVal);
    if (horaMins < pickupInicio || horaMins > pickupFim) {
      inputHora.classList.add('invalido');
      hintHora.className = 'campo-hint erro';
      hintHora.textContent = `❌ Horário fora da janela de retirada. Atendemos das ${HORA_MINIMA_PEDIDO} às 22:00.`;
      return;
    }
    const dentroExpediente = estaDentroHorarioFuncionamento(dataVal, horaMins);
    inputHora.classList.add('valido');
    hintHora.className = 'campo-hint ok';
    hintHora.textContent = dentroExpediente
      ? '✔ Horário válido (dentro do horário de funcionamento)'
      : '✔ Horário programado (fora do horário de funcionamento)';
    return;
  }

  const horaMins     = horaParaMin(horaVal);
  const aberturaMins = horaParaMin(horario.abre);
  const fechaMins    = horaParaMin(horario.fecha);

  let minPermitido = aberturaMins;
  if (dataVal === agoraLoja.dataISO) {
    minPermitido = Math.max(aberturaMins, agoraLoja.horaMin + 1);
  }

  if (horaMins < minPermitido) {
    inputHora.classList.add('invalido');
    hintHora.className = 'campo-hint erro';
    hintHora.textContent = dataVal === hojeISO()
      ? '❌ Horário já passou. Escolha um horário futuro.'
      : `❌ Horário fora da janela de retirada. Atendemos a partir das ${horario.abre}.`;
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
  hintHora.textContent = '✔ Horário válido';
}

inputData.addEventListener('change', onDataChange);
inputHora.addEventListener('change', onHoraChange);

// ════════════════════════════════════════
// TELA DE ENTRADA – AVANÇAR
// ════════════════════════════════════════

document.getElementById('btn-fazer-pedido').addEventListener('click', () => {
  aplicarModoVisualizacao(false);
  const nome    = document.getElementById('nome-cliente').value.trim();
  const dataVal = inputData.value;
  const horaVal = inputHora.value;
  const agoraLoja = agoraNoFuso();
  // debug logs removed

  if (!nome)    { mostrarAlerta('Por favor, informe seu nome.'); return; }
  if (!dataVal) { mostrarAlerta('Escolha a data de retirada.'); return; }
  if (!horaVal) { mostrarAlerta('Escolha o horário de retirada.'); return; }

  const diaSemana = diaSemanaDeISO(dataVal);
  // debug logs removed
  const horario   = HORARIOS_FUNC[diaSemana];
  const diasAte = diasEntreISO(agoraLoja.dataISO, dataVal);
  // Considera 'agendado' apenas quando o cliente escolheu data >=1 dia e o horario
  // NÃO está dentro do horário de funcionamento da loja.
  const horaMins = horaParaMin(horaVal);
  const dentroExpedienteParaHora = estaDentroHorarioFuncionamento(dataVal, horaMins);
  const pedidoAgendado = diasAte >= 1 && !dentroExpedienteParaHora;

  // Impede agendamento em dias que a loja está fechada (ex: quarta-feira)
  if (!horario) {
    mostrarAlerta(`${DIAS_PT[diaSemana]} é dia de folga! Escolha outra data.`);
    return;
  }

  // Não permite iniciar pedidos antes do horário mínimo global (06:00)
  if (agoraLoja.horaMin < horaParaMin(HORA_MINIMA_PEDIDO)) {
    mostrarAlerta(`Os pedidos são liberados a partir das ${HORA_MINIMA_PEDIDO}.`);
    return;
  }

  const pickupInicio = horaParaMin(HORA_MINIMA_PEDIDO);
  // `horaMins` já foi calculado acima para decidir se é agendado
  const pickupFim = 22 * 60; // 22:00

  if (pedidoAgendado) {
    // Agendamentos (1+ dia) podem usar horários fora do expediente da loja,
    // porém devem estar dentro da janela de retirada (06:00-22:00).
    if (horaMins < pickupInicio || horaMins > pickupFim) {
        mostrarAlerta(`Horário fora da janela de retirada. Funcionamos das ${HORA_MINIMA_PEDIDO} às 22:00.`);
      return;
    }
  } else {
    // Pedidos para o mesmo dia devem obedecer ao horário de funcionamento da loja
    const aberturaMins = horaParaMin(horario.abre);
    const fechaMins = horaParaMin(horario.fecha);

    if (horaMins < aberturaMins) {
      mostrarAlerta(`Horário fora da janela de retirada. Funcionamos a partir das ${horario.abre}.`);
      return;
    }
    if (horaMins > fechaMins) {
      mostrarAlerta(`Horário fora da janela de retirada. Atendemos até as ${horario.fecha}.`);
      return;
    }
    if (dataVal === agoraLoja.dataISO) {
      const agoraMins = agoraLoja.horaMin;
      if (horaMins <= agoraMins) {
        mostrarAlerta('Escolha um horario futuro para a retirada.');
        return;
      }
    }
  }

  // Se for agendado fora do expediente, força retirada
  const agendadoForaExpediente = pedidoAgendado;

  const [y, m, d]       = dataVal.split('-');
  const dataFormatada   = `${d}/${m}/${y}`;
  const textoFormatado  = `${DIAS_PT[diaSemana]}, ${dataFormatada} as ${horaVal}`;

  estado.nomeCliente = nome;
  estado.pedidoAgendado = pedidoAgendado;
  estado.agendadoForaExpediente = agendadoForaExpediente;
  estado.retirada    = {
    dataStr:        dataVal,
    horaStr:        horaVal,
    textoFormatado,
    dataFormatada:  `${DIAS_PT[diaSemana]}, ${dataFormatada}`,
    horaFormatada:  horaVal,
    agendada:       pedidoAgendado,
  };

  if (agendadoForaExpediente) {
    const tipoPedidoEl = document.getElementById('tipo-pedido');
    const opcaoEntrega = tipoPedidoEl.querySelector('option[value="entrega"]');
    tipoPedidoEl.value = 'retirada';
    tipoPedidoEl.disabled = true;
    if (opcaoEntrega) opcaoEntrega.disabled = true;
  }
  // navigation

  // Tenta usar `mostrarTela` se disponível, caso contrário faz um fallback direto no DOM
  try {
    if (typeof mostrarTela === 'function') mostrarTela('tela-cardapio');
    else {
      document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
      const el = document.getElementById('tela-cardapio');
      if (el) el.classList.add('ativa');
      window.scrollTo(0, 0);
    }
  } catch (err) {
    // fallback direto (defensivo)
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    const el = document.getElementById('tela-cardapio');
    if (el) el.classList.add('ativa');
    window.scrollTo(0, 0);
  }
});

document.getElementById('btn-ver-cardapio').addEventListener('click', () => {
  aplicarModoVisualizacao(true);
  mostrarTela('tela-cardapio');
});

document.getElementById('aviso-vitrine').addEventListener('click', () => {
  aplicarModoVisualizacao(false);
  mostrarTela('tela-entrada');
});

document.getElementById('nome-cliente').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-fazer-pedido').click();
});

// ════════════════════════════════════════
// MÁSCARA DE TELEFONE
// Formata automaticamente: (XX) XXXXX-XXXX
// ════════════════════════════════════════

document.getElementById('telefone-cliente').addEventListener('input', function () {
  // Remove tudo que não for dígito
  let v = this.value.replace(/\D/g, '').slice(0, 11);

  if (v.length === 0) { this.value = ''; return; }

  // Aplica a máscara progressivamente
  if (v.length <= 2) {
    this.value = `(${v}`;
  } else if (v.length <= 7) {
    this.value = `(${v.slice(0,2)}) ${v.slice(2)}`;
  } else if (v.length <= 11) {
    // Celular: (XX) XXXXX-XXXX  ou  fixo: (XX) XXXX-XXXX
    const corte = v.length === 11 ? 7 : 6;
    this.value = `(${v.slice(0,2)}) ${v.slice(2, corte)}-${v.slice(corte)}`;
  }
});

document.getElementById('tipo-pedido').addEventListener('change', function () {
  if (estado.agendadoForaExpediente && this.value !== 'retirada') {
    this.value = 'retirada';
    return;
  }
  const isEntrega = this.value === 'entrega';
  document.getElementById('grupo-endereco').style.display  = isEntrega ? 'block' : 'none';
  document.getElementById('grupo-bairro').style.display    = isEntrega ? 'block' : 'none';
  document.getElementById('grupo-pagamento').style.display = isEntrega ? 'block' : 'none';

  // Reseta pagamento ao trocar tipo
  if (!isEntrega) resetarPagamento();

  atualizarTotais();
  atualizarResumoTotal();
});

document.getElementById('bairro-entrega').addEventListener('input', function () {
  const hintEl = document.getElementById('hint-bairro');
  const taxa = obterTaxaEntrega(this.value);

  estado.entrega.bairro = this.value.trim();
  estado.entrega.taxa = taxa;

  if (!this.value.trim()) {
    hintEl.textContent = '';
    hintEl.className = 'campo-hint';
    atualizarTotais();
    atualizarResumoTotal();
    return;
  }

  if (taxa > 0) {
    hintEl.textContent = `✔ Taxa de entrega: ${formatarBRL(taxa)}`;
    hintEl.className = 'campo-hint ok';
  } else {
    hintEl.textContent = '⚠ Bairro ainda não cadastrado na taxa de entrega.';
    hintEl.className = 'campo-hint erro';
  }

  atualizarTotais();
  atualizarResumoTotal();
});

// Populate `select` with bairros and handle change
function popularSelectBairros(filter) {
  const sel = document.getElementById('bairro-entrega');
  if (!sel) return;
  const q = normalizarTexto(filter || '');
  const matches = q
    ? BAIRROS_PARA_SUGESTAO.filter(n => normalizarTexto(n).includes(q))
    : BAIRROS_PARA_SUGESTAO;
  sel.innerHTML = '<option value="">Selecione...</option>' + matches.map(n => `\n    <option value="${n}">${n}</option>`).join('');
}

function onChangeBairroSelect() {
  const sel = document.getElementById('bairro-entrega');
  if (!sel) return;
  const val = sel.value || '';
  const hintEl = document.getElementById('hint-bairro');
  const taxa = obterTaxaEntrega(val);

  estado.entrega.bairro = val.trim();
  estado.entrega.taxa = taxa;

  if (!val) {
    hintEl.textContent = '';
    hintEl.className = 'campo-hint';
    atualizarTotais();
    atualizarResumoTotal();
    return;
  }

  if (taxa === null) {
    hintEl.textContent = '⚠ Outros municípios — combinar diretamente conosco.';
    hintEl.className = 'campo-hint erro';
  } else if (taxa > 0) {
    hintEl.textContent = `✔ Taxa de entrega: ${formatarBRL(taxa)}`;
    hintEl.className = 'campo-hint ok';
  } else {
    hintEl.textContent = '⚠ Bairro ainda não cadastrado na taxa de entrega.';
    hintEl.className = 'campo-hint erro';
  }

  atualizarTotais();
  atualizarResumoTotal();
}

// Initialize select immediately
popularSelectBairros();
document.getElementById('bairro-entrega').addEventListener('change', onChangeBairroSelect);

// ════════════════════════════════════════
// QUEBRA DE LINHA PARA IMPRESSÃO TÉRMICA
// Máx 32 chars por linha — evita corte no endereço
// ════════════════════════════════════════

/**
 * Quebra texto longo em múltiplas linhas para impressoras térmicas.
 * @param {string} chave   - Label completo com ": " (ex: "Endereco: ")
 * @param {string} valor   - Texto que pode ser longo
 * @param {number} largura - Máx caracteres por linha (padrão 32)
 */
function quebrarLinha(chave, valor, largura = 32) {
  const recuo   = ' '.repeat(chave.length);
  const palavras = valor.split(' ');
  const linhas  = [];
  let atual     = chave;

  for (const palavra of palavras) {
    const separador = atual === chave ? '' : ' ';
    if ((atual + separador + palavra).length <= largura) {
      atual += separador + palavra;
    } else {
      linhas.push(atual);
      atual = recuo + palavra;
    }
  }
  linhas.push(atual);
  return linhas.join('\n');
}

// ════════════════════════════════════════
// PAGAMENTO – lógica de seleção
// ════════════════════════════════════════

/** Reseta toda a seção de pagamento para o estado inicial */
function resetarPagamento() {
  document.querySelectorAll('.pgto-btn').forEach(b => b.classList.remove('selecionado'));
  document.getElementById('grupo-troco').style.display       = 'none';
  document.getElementById('grupo-valor-troco').style.display = 'none';
  document.querySelectorAll('.troco-btn').forEach(b => b.classList.remove('selecionado'));
  document.getElementById('valor-troco').value  = '';
  document.getElementById('hint-troco').textContent = '';
  document.getElementById('hint-troco').className  = 'campo-hint';
}

// Seleção da forma de pagamento
document.querySelectorAll('.pgto-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pgto-btn').forEach(b => b.classList.remove('selecionado'));
    btn.classList.add('selecionado');

    const isDinheiro = btn.dataset.pgto === 'dinheiro';
    document.getElementById('grupo-troco').style.display = isDinheiro ? 'block' : 'none';

    // Reseta troco se trocou para outra forma
    if (!isDinheiro) {
      document.getElementById('grupo-valor-troco').style.display = 'none';
      document.querySelectorAll('.troco-btn').forEach(b => b.classList.remove('selecionado'));
      document.getElementById('valor-troco').value = '';
      document.getElementById('hint-troco').textContent = '';
    }
  });
});

// Seleção de troco (Sim / Não)
document.querySelectorAll('.troco-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.troco-btn').forEach(b => b.classList.remove('selecionado'));
    btn.classList.add('selecionado');

    const precisaTroco = btn.dataset.troco === 'sim';
    document.getElementById('grupo-valor-troco').style.display = precisaTroco ? 'block' : 'none';

    if (!precisaTroco) {
      document.getElementById('valor-troco').value = '';
      document.getElementById('hint-troco').textContent = '';
      document.getElementById('hint-troco').className = 'campo-hint';
    }
  });
});

// Validação em tempo real do valor de troco
document.getElementById('valor-troco').addEventListener('input', function () {
  const hintEl   = document.getElementById('hint-troco');
  const totalEl  = document.getElementById('resumo-total');
  const totalStr = totalEl.textContent.replace(/[^\d,]/g, '').replace(',', '.');
  const total    = parseFloat(totalStr) || 0;
  const troco    = parseMoedaInput(this.value);

  if (troco <= 0) {
    hintEl.textContent = '';
    hintEl.className   = 'campo-hint';
    return;
  }
  if (troco < total) {
    hintEl.textContent = `⚠ Valor menor que o total do pedido (${document.getElementById('resumo-total').textContent}).`;
    hintEl.className   = 'campo-hint erro';
  } else {
    const diff = troco - total;
    hintEl.textContent = `✔ Troco: R$ ${diff.toFixed(2).replace('.', ',')}`;
    hintEl.className   = 'campo-hint ok';
  }
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
    const catId        = bloco.dataset.cat;
    const titulo       = bloco.dataset.titulo;
    const precoCento   = parseFloat(bloco.dataset.precoCento);
    const maxSabores   = parseInt(bloco.dataset.maxSabores) || 0;
    // Mapa de limite de sabores por quantidade (ex: "25:2,50:3,75:4,100:5")
    const saboresPorQtd = parseSaboresPorQtd(bloco.dataset.saboresPorQtd || '');
    const sabores      = bloco.dataset.sabores
      ? bloco.dataset.sabores.split('|').map(s => s.trim()).filter(Boolean)
      : [];
    const temSabores   = sabores.length > 0;

    const opcoesRapidas = [25, 50, 75, 100];
    const botoesQtd = opcoesRapidas.map(qtd => `
      <button class="cn-btn-qtd" data-qtd="${qtd}">
        <span class="cn-qtd-numero">${qtd}</span>
        <span class="cn-qtd-label">unidades</span>
        <span class="cn-qtd-preco">${formatarBRL(precoCento * qtd / 100)}</span>
      </button>`).join('');

    let blocoSabores = '';
    if (temSabores) {
      // O aviso de limite será atualizado dinamicamente pelo JS conforme a qty
      const btnsSabores = sabores
        .map(s => `<button class="cn-btn-sabor" data-sabor="${s}">${s}</button>`)
        .join('');

      blocoSabores = `
        <hr class="cn-divisor" />
        <div class="cn-sabores-area">
          <p class="cn-step-label">Escolha os sabores:</p>
          <span class="cn-aviso-max" style="display:none"></span>
          <div class="cn-sabores-lista">${btnsSabores}</div>
          <div class="cn-distribuicao">
            <p class="cn-distribuicao-titulo">Distribuicao automatica</p>
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
          <input type="number" class="cn-input-qtd" min="1" step="1" placeholder="Ex: 500" />
          <button class="cn-btn-aplicar">OK</button>
        </div>
      </div>
      ${blocoSabores}`;

    inicializarInteracoesCento(
      bloco, catId, titulo, precoCento,
      maxSabores, saboresPorQtd, temSabores
    );
  });
}

// ════════════════════════════════════════
// INTERAÇÕES DE UM BLOCO DE CENTO
// ════════════════════════════════════════

function inicializarInteracoesCento(
  bloco, catId, titulo, precoCento,
  maxSaboresGlobal, saboresPorQtd, temSabores
) {
  let qtdSelecionada      = 0;
  let saboresSelecionados = [];
  // Limite ativo (recalculado quando a qty muda)
  let maxSaboresAtivo     = maxSaboresGlobal;

  const btnQtds    = bloco.querySelectorAll('.cn-btn-qtd');
  const inputQtd   = bloco.querySelector('.cn-input-qtd');
  const btnAplicar = bloco.querySelector('.cn-btn-aplicar');
  const btnSabores = bloco.querySelectorAll('.cn-btn-sabor');
  const distBox    = bloco.querySelector('.cn-distribuicao');
  const distItens  = bloco.querySelector('.cn-distribuicao-itens');
  const avisoMax   = bloco.querySelector('.cn-aviso-max');

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

  // ── Atualiza o aviso de limite conforme qty ──
  function atualizarAvisoMax() {
    if (!avisoMax) return;
    if (maxSaboresAtivo > 0) {
      avisoMax.textContent = `Escolha ate ${maxSaboresAtivo} sabores`;
      avisoMax.style.display = 'inline-flex';
    } else {
      avisoMax.style.display = 'none';
    }
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

  // ── Visual dos botões de sabor (selecionado / bloqueado) ──
  function atualizarBotoesSabor() {
    if (!temSabores) return;
    const limiteAtingido = maxSaboresAtivo > 0 &&
      saboresSelecionados.length >= maxSaboresAtivo;

    btnSabores.forEach(btn => {
      const sel = saboresSelecionados.includes(btn.dataset.sabor);
      btn.classList.toggle('selecionado', sel);
      btn.classList.toggle('bloqueado', limiteAtingido && !sel);
    });
  }

  /**
   * Ao mudar a quantidade:
   *  1. Recalcula o limite de sabores para a nova qty
   *  2. Remove sabores excedentes (se o novo limite for menor)
   *  3. Atualiza visuais
   */
  function aplicarQuantidade(qtd) {
    qtdSelecionada = qtd;

    // Recalcula limite de sabores
    if (saboresPorQtd) {
      maxSaboresAtivo = calcularMaxSaboresPorQtd(saboresPorQtd, qtd);
    } else {
      maxSaboresAtivo = maxSaboresGlobal;
    }

    // Remove sabores excedentes se necessário
    if (maxSaboresAtivo > 0 && saboresSelecionados.length > maxSaboresAtivo) {
      saboresSelecionados = saboresSelecionados.slice(0, maxSaboresAtivo);
    }

    atualizarAvisoMax();
    atualizarBotoesSabor();
    atualizarDistribuicao();
    salvarEstado();
  }

  // ── Limpa toda a seleção do bloco ──
  function limparTudo() {
    qtdSelecionada      = 0;
    saboresSelecionados = [];
    maxSaboresAtivo     = maxSaboresGlobal;
    btnQtds.forEach(b => b.classList.remove('selecionado'));
    btnSabores.forEach(b => b.classList.remove('selecionado', 'bloqueado'));
    inputQtd.value = '';
    inputQtd.classList.remove('ativo');
    if (distBox) distBox.style.display = 'none';
    if (avisoMax) avisoMax.style.display = 'none';
    salvarEstado();
  }

  // ── Botões rápidos ──
  btnQtds.forEach(btn => {
    btn.addEventListener('click', () => {
      const novaQtd = parseInt(btn.dataset.qtd);
      if (qtdSelecionada === novaQtd) { limparTudo(); return; }

      btnQtds.forEach(b => b.classList.remove('selecionado'));
      inputQtd.value = '';
      inputQtd.classList.remove('ativo');
      btn.classList.add('selecionado');
      aplicarQuantidade(novaQtd);
    });
  });

  // ── Campo livre + botão OK ──
  function aplicarInputQtd() {
    const raw = inputQtd.value.trim();
    const val = parseInt(raw);
    if (!raw || isNaN(val) || val < 1) {
      mostrarAlerta('Digite uma quantidade valida (minimo 1).');
      inputQtd.focus();
      return;
    }
    btnQtds.forEach(b => b.classList.remove('selecionado'));
    inputQtd.classList.add('ativo');
    aplicarQuantidade(val);
  }

  btnAplicar.addEventListener('click', aplicarInputQtd);
  inputQtd.addEventListener('keydown', e => { if (e.key === 'Enter') aplicarInputQtd(); });

  // ── Clique no sabor ──
  btnSabores.forEach(btn => {
    btn.addEventListener('click', () => {
      if (qtdSelecionada === 0) {
        mostrarAlerta('Primeiro escolha a quantidade acima (botoes rapidos ou campo livre).');
        return;
      }

      const sabor = btn.dataset.sabor;

      if (saboresSelecionados.includes(sabor)) {
        // Desmarcar
        saboresSelecionados = saboresSelecionados.filter(s => s !== sabor);
      } else {
        // Marcar — verifica limite
        if (maxSaboresAtivo > 0 && saboresSelecionados.length >= maxSaboresAtivo) {
          mostrarAlerta(
            `Para ${qtdSelecionada} unidades, o limite e de ${maxSaboresAtivo} sabore${maxSaboresAtivo > 1 ? 's' : ''}.\nDesmarque um para trocar.`
          );
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

    if (!Number.isFinite(preco) || preco <= 0) {
      item.classList.add('preco-indisponivel');
      display.textContent = '-';
      btnMais.disabled = true;
      btnMenos.disabled = true;
      btnMais.setAttribute('aria-disabled', 'true');
      btnMenos.setAttribute('aria-disabled', 'true');
      return;
    }

    function ensureCat() {
      if (!estado.pedido[catId])
        estado.pedido[catId] = { titulo, tipo: 'unitario', precoUnit: preco, itens: [] };
    }

    function setItem(qtd) {
      ensureCat();
      const cat = estado.pedido[catId];
      const idx = cat.itens.findIndex(i => i.sabor === sabor);
      if (qtd <= 0) { if (idx >= 0) cat.itens.splice(idx, 1); }
      // Armazena o preço individual do item para suportar categorias com preços variados (ex: Bebidas)
      else {
        const unidades = item.dataset && item.dataset.unidades ? parseInt(item.dataset.unidades) : undefined;
        if (idx >= 0) {
          cat.itens[idx].qtd = qtd;
          if (unidades) cat.itens[idx].unidades = unidades;
        } else {
          const novo = { sabor, qtd, preco };
          if (unidades) novo.unidades = unidades;
          cat.itens.push(novo);
        }
      }
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
      // Usa o preço individual do item quando disponível (ex: bebidas com preços variados)
      // Caso contrário usa o precoUnit da categoria (retrocompatível)
      total += cat.itens.reduce((s, i) => s + (i.preco !== undefined ? i.preco : cat.precoUnit) * i.qtd, 0);
    else
      total += cat.precoUnit * (cat.qtdSelecionada / 100);
  }
  return total;
}

function calcularTotalComEntrega() {
  const tipoPedido = document.getElementById('tipo-pedido').value;
  const taxaEntrega = tipoPedido === 'entrega' ? (estado.entrega.taxa === null ? 0 : (estado.entrega.taxa || 0)) : 0;
  return calcularTotal() + taxaEntrega;
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
  const total = calcularTotalComEntrega();
  const count = contarSelecoes();
  document.getElementById('badge-itens').textContent = count;
  document.getElementById('valor-total').textContent = formatarBRL(total);
  document.getElementById('barra-total').style.display = count > 0 ? 'flex' : 'none';
}

function atualizarResumoTotal() {
  const resumoTotalEl = document.getElementById('resumo-total');
  if (!resumoTotalEl) return;

  const tipoPedido = document.getElementById('tipo-pedido').value;
  const taxaEntrega = tipoPedido === 'entrega' ? (estado.entrega.taxa || 0) : 0;
  resumoTotalEl.textContent = formatarBRL(calcularTotal() + taxaEntrega);
}

// ════════════════════════════════════════
// VALIDAÇÃO DO PEDIDO
// ════════════════════════════════════════

function validarPedido() {
  if (Object.keys(estado.pedido).length === 0)
    return 'Seu pedido esta vazio! Selecione pelo menos um item.';

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
  document.getElementById('resumo-retirada').textContent = estado.pedidoAgendado
    ? `AGENDADO - ${estado.retirada.textoFormatado}`
    : estado.retirada.textoFormatado;

  // Reseta tipo, endereço, pagamento e telefone ao abrir o resumo
  const tipoPedidoEl = document.getElementById('tipo-pedido');
  const opcaoEntrega = tipoPedidoEl.querySelector('option[value="entrega"]');
  tipoPedidoEl.disabled = estado.agendadoForaExpediente;
  if (opcaoEntrega) opcaoEntrega.disabled = estado.agendadoForaExpediente;
  tipoPedidoEl.value = estado.agendadoForaExpediente ? 'retirada' : '';
  document.getElementById('endereco-entrega').value     = '';
  document.getElementById('bairro-entrega').value       = '';
  document.getElementById('telefone-cliente').value     = '';
  document.getElementById('grupo-endereco').style.display  = 'none';
  document.getElementById('grupo-bairro').style.display    = 'none';
  document.getElementById('grupo-pagamento').style.display = 'none';
  document.getElementById('alerta-resumo').style.display   = 'none';
  document.getElementById('hint-bairro').textContent = '';
  document.getElementById('hint-bairro').className = 'campo-hint';
  estado.entrega = { bairro: '', endereco: '', taxa: 0 };
  resetarPagamento();

  if (estado.agendadoForaExpediente) {
    document.getElementById('tipo-pedido').dispatchEvent(new Event('change'));
  }

  // Mostra aviso visual no resumo quando agendado fora do expediente
  if (estado.agendadoForaExpediente) {
    const alertaEl = document.getElementById('alerta-resumo');
    alertaEl.textContent = 'Pedido agendado fora do horário de funcionamento — favor combinar se é possível realizar o pedido.';
    alertaEl.style.display = 'block';
  }

  const lista = document.getElementById('resumo-lista');
  lista.innerHTML = '';
  let totalGeral = 0;

  for (const [catId, cat] of Object.entries(estado.pedido)) {
    const div = document.createElement('div');
    div.className = 'resumo-categoria';
    let html = `<h3>${cat.titulo}</h3>`;

    if (cat.tipo === 'unitario') {
      for (const item of cat.itens) {
        const precoItem = item.preco !== undefined ? item.preco : cat.precoUnit;
        const v = precoItem * item.qtd;
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

  atualizarResumoTotal();
}

['btn-ver-resumo', 'btn-ver-pedido'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    if (estado.modoVisualizacao) {
      mostrarAlerta('Modo visualização ativo. Volte e toque em "Fazer Pedido" para continuar.');
      return;
    }
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
// Formato limpo para impressão térmica — sem emojis
// Inclui nome da empresa e CNPJ
// ════════════════════════════════════════

function gerarMensagem() {
  const tipoPedido  = estado.agendadoForaExpediente ? 'retirada' : document.getElementById('tipo-pedido').value;
  const endereco    = document.getElementById('endereco-entrega').value.trim();
  const bairro      = document.getElementById('bairro-entrega').value.trim();
  const pgtoSel     = document.querySelector('.pgto-btn.selecionado');
  const formaPgto   = pgtoSel ? pgtoSel.dataset.pgto : '';
  const trocoSel    = document.querySelector('.troco-btn.selecionado');
  const precisaTroco= trocoSel ? trocoSel.dataset.troco === 'sim' : false;
  const valorTroco  = parseMoedaInput(document.getElementById('valor-troco').value);

  const telefone    = document.getElementById('telefone-cliente').value.trim();

  let msg = `${EMPRESA_NOME}\n`;
  msg += `CNPJ: ${EMPRESA_CNPJ}\n`;
  msg += `================================\n`;
  msg += `NOVO PEDIDO\n`;
  if (estado.pedidoAgendado) {
    msg += `Status: AGENDADO\n`;
  }
  msg += `Data: ${estado.retirada.dataFormatada}\n`;
    if (diaSemanaDeISO(estado.retirada.dataStr) === 0) {
      msg += `${AVISO_DOMINGO}\n`;
    }
  msg += `================================\n`;
  msg += `Cliente: ${estado.nomeCliente}\n`;
  msg += `Telefone: ${telefone}\n`;

  if (tipoPedido === 'retirada') {
    msg += `Tipo: RETIRADA${estado.pedidoAgendado ? ' (AGENDADO)' : ''}\n`;
    msg += `Horario: ${estado.retirada.horaFormatada}\n`;
  } else {
    msg += `Tipo: ENTREGA\n`;
    msg += quebrarLinha('Endereco: ', endereco) + '\n';
    if (bairro) {
      msg += `Bairro: ${bairro}\n`;
      const taxaEntrega = obterTaxaEntrega(bairro);
      if (taxaEntrega === null) {
        msg += `Outros municípios — combinar diretamente conosco\n`;
      } else if (taxaEntrega > 0) {
        msg += `Taxa de entrega: ${formatarBRL(taxaEntrega)}\n`;
      }
    }
    msg += `Horario: ${estado.retirada.horaFormatada}\n`;

    // Pagamento
    const nomesPgto = { pix: 'PIX', cartao: 'CARTAO', dinheiro: 'DINHEIRO' };
    msg += `Pagamento: ${nomesPgto[formaPgto] || formaPgto.toUpperCase()}\n`;

    if (formaPgto === 'dinheiro') {
      if (precisaTroco && valorTroco > 0) {
        const totalPed = calcularTotalComEntrega();
        const diffTroco = valorTroco - totalPed;
        msg += `Troco para: R$ ${valorTroco.toFixed(2).replace('.', ',')}\n`;
        msg += `Troco a devolver: R$ ${diffTroco.toFixed(2).replace('.', ',')}\n`;
      } else {
        msg += `Troco: Nao precisa\n`;
      }
    }
  }

  // Aviso quando o pedido foi agendado fora do horário de funcionamento
  if (estado.agendadoForaExpediente) {
    msg += `Observacao: Pedido agendado fora do horário de funcionamento — favor combinar se é possível realizar o pedido.\n`;
  }

  msg += `--------------------------------\n\n`;

  // Itens do pedido
  for (const cat of Object.values(estado.pedido)) {
    msg += `${cat.titulo.toUpperCase()}\n`;

    if (cat.tipo === 'unitario') {
      for (const item of cat.itens) {
        const precoItem = item.preco !== undefined ? item.preco : cat.precoUnit;
        const v = precoItem * item.qtd;
        const unidadesPart = item.unidades ? ` — ${item.unidades} un.` : '';
        msg += `- ${item.sabor}${unidadesPart}: ${item.qtd}x  ${formatarBRL(v)}\n`;
      }
    } else {
      const v = cat.precoUnit * (cat.qtdSelecionada / 100);
      msg += `- ${cat.qtdSelecionada} unidades  ${formatarBRL(v)}\n`;
      if (cat.saboresSelecionados && cat.saboresSelecionados.length) {
        for (const d of distribuirSabores(cat.qtdSelecionada, cat.saboresSelecionados))
          msg += `  > ${d.sabor}: ${d.qtd} un.\n`;
      }
    }
    msg += '\n';
  }

  msg += `================================\n`;
  msg += `TOTAL: ${formatarBRL(calcularTotalComEntrega())}\n`;
  msg += `================================\n`;
  msg += `Pedido via cardapio digital\n`;
  msg += `${EMPRESA_NOME}`;

  return msg;
}

// ════════════════════════════════════════
// ENVIO WHATSAPP – com validação de tipo/endereço
// ════════════════════════════════════════

document.getElementById('btn-whatsapp').addEventListener('click', () => {
  const tipoPedido = document.getElementById('tipo-pedido').value;
  const endereco   = document.getElementById('endereco-entrega').value.trim();
  const bairro     = document.getElementById('bairro-entrega').value.trim();
  const alertaEl   = document.getElementById('alerta-resumo');

  // Valida itens
  const erroPedido = validarPedido();
  if (erroPedido) {
    alertaEl.textContent = erroPedido;
    alertaEl.style.display = 'block';
    return;
  }

  // Valida telefone
  const telefone = document.getElementById('telefone-cliente').value.trim();
  if (!telefone || telefone.replace(/\D/g, '').length < 10) {
    alertaEl.textContent = 'Informe seu telefone para contato.';
    alertaEl.style.display = 'block';
    document.getElementById('telefone-cliente').focus();
    return;
  }

  // Valida tipo de pedido
  if (!tipoPedido) {
    alertaEl.textContent = 'Selecione o tipo de pedido: Retirada ou Entrega.';
    alertaEl.style.display = 'block';
    return;
  }

  if (tipoPedido === 'entrega') {
    // Valida endereço
    if (!endereco) {
      alertaEl.textContent = 'Informe o endereco para entrega.';
      alertaEl.style.display = 'block';
      document.getElementById('endereco-entrega').focus();
      return;
    }

    // Valida bairro para cálculo da taxa
    if (!bairro) {
      alertaEl.textContent = 'Informe o bairro para calcular a taxa de entrega.';
      alertaEl.style.display = 'block';
      document.getElementById('bairro-entrega').focus();
      return;
    }

    const taxaEntrega = obterTaxaEntrega(bairro);
    estado.entrega = { bairro, endereco, taxa: taxaEntrega };
    if (taxaEntrega <= 0) {
      // If it's Outros municípios (taxaEntrega === null), allow sending but notify in message.
      if (taxaEntrega === null) {
        alertaEl.textContent = 'Outros municípios — combinaremos a entrega diretamente com o cliente.';
        alertaEl.style.display = 'block';
      } else {
        alertaEl.textContent = 'Bairro nao cadastrado na taxa de entrega; confirme a lista antes de enviar.';
        alertaEl.style.display = 'block';
        document.getElementById('bairro-entrega').focus();
        return;
      }
    }

    // Valida forma de pagamento
    const pgtoSel = document.querySelector('.pgto-btn.selecionado');
    if (!pgtoSel) {
      alertaEl.textContent = 'Selecione a forma de pagamento.';
      alertaEl.style.display = 'block';
      document.getElementById('grupo-pagamento').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Valida troco quando dinheiro
    if (pgtoSel.dataset.pgto === 'dinheiro') {
      const trocoSel = document.querySelector('.troco-btn.selecionado');
      if (!trocoSel) {
        alertaEl.textContent = 'Informe se vai precisar de troco.';
        alertaEl.style.display = 'block';
        return;
      }
      if (trocoSel.dataset.troco === 'sim') {
        const valorTroco = parseMoedaInput(document.getElementById('valor-troco').value);
        if (valorTroco <= 0) {
          alertaEl.textContent = 'Informe o valor para o troco.';
          alertaEl.style.display = 'block';
          document.getElementById('valor-troco').focus();
          return;
        }
        if (valorTroco < calcularTotalComEntrega()) {
          alertaEl.textContent = 'O valor do troco nao pode ser menor que o total do pedido.';
          alertaEl.style.display = 'block';
          document.getElementById('valor-troco').focus();
          return;
        }
      }
    }
  }

  alertaEl.style.display = 'none';
  window.open(
    `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(gerarMensagem())}`,
    '_blank'
  );
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

// Expose a small debug/test API to the global window for automated checks.
// This does not change app logic — it only exposes internal helpers/state.
// debug API removed
