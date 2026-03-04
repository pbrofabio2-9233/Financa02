// ==========================================
// ENGINE.JS - Lógica de Negócios e Cálculos (v25.8.1)
// ==========================================

// BLINDAGEM NUCLEAR
window.ecoTempEmprestimo = null;
window.ecoTiposReceita = ['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca'];
window.ecoTiposDespesa = ['despesas_gerais', 'emprestei_dinheiro', 'pag_emprestimo', 'dep_poupanca'];

function showToast(mensagem) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-check-circle" style="color: var(--sucesso); font-size:18px;"></i> ${mensagem}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function mudarDirecaoLancamento() {
    const direcaoSelect = document.getElementById('lanc-direcao');
    const tipoSelect = document.getElementById('lanc-tipo');
    if(!direcaoSelect || !tipoSelect) return;

    const direcao = direcaoSelect.value;
    tipoSelect.options.length = 0; 
    let listaTipos = direcao === 'despesa' 
        ? [{ val: 'despesas_gerais', txt: 'Despesas Gerais' }, { val: 'emprestei_cartao', txt: 'Emprestei Cartão' }, { val: 'emprestei_dinheiro', txt: 'Emprestei Dinheiro' }, { val: 'pag_emprestimo', txt: 'Pagamento Empréstimo' }, { val: 'dep_poupanca', txt: 'Depósito Poupança' }]
        : [{ val: 'salario', txt: 'Salário' }, { val: 'tomei_emprestimo', txt: 'Tomei Empréstimo' }, { val: 'rec_emprestimo', txt: 'Recebimento Empréstimo' }, { val: 'outras_receitas', txt: 'Outras Receitas' }, { val: 'estorno', txt: 'Estorno' }, { val: 'saque_poupanca', txt: 'Saque Poupança' }];

    listaTipos.forEach(t => tipoSelect.options.add(new Option(t.txt, t.val)));
    atualizarRegrasLancamento();
}

function atualizarRegrasLancamento() {
    const direcaoSelect = document.getElementById('lanc-direcao');
    const tipoSelect = document.getElementById('lanc-tipo');
    const contaSelect = document.getElementById('lanc-conta');
    const catSelect = document.getElementById('lanc-cat');
    const boxFixo = document.getElementById('lanc-fixo');
    if(!tipoSelect || !contaSelect || !catSelect || !boxFixo) return;

    const tipo = tipoSelect.value;
    const direcao = direcaoSelect.value;

    contaSelect.options.length = 0; catSelect.options.length = 0;

    const listaCategorias = direcao === 'receita' ? [
        { val: 'Salário', txt: '💰 Salário' }, { val: 'Terceiros', txt: '🤝 Terceiros' }, { val: 'Estorno', txt: '↩️ Estorno' }, { val: 'Outros', txt: '🎁 Outros' }
    ] : [
        { val: 'Alimentação', txt: '🛒 Alimentação' }, { val: 'Consórcio', txt: '📄 Consórcio' }, { val: 'Transporte', txt: '🚗 Transporte' }, { val: 'Energia', txt: '⚡ Energia' }, { val: 'Moradia', txt: '🏠 Moradia' }, { val: 'Saúde', txt: '💊 Saúde' }, { val: 'Lazer', txt: '🍿 Lazer' }, { val: 'Assinaturas', txt: '📺 Assinaturas' }, { val: 'Terceiros', txt: '🤝 Terceiros' }, { val: 'Outros', txt: '⚙️ Outros' }
    ];

    listaCategorias.forEach(cat => catSelect.options.add(new Option(cat.txt, cat.val)));
    boxFixo.disabled = !(tipo === 'despesas_gerais' || tipo === 'salario'); 
    if(boxFixo.disabled) boxFixo.checked = false;

    let temConta = false;
    if (typeof db !== 'undefined' && db.contas) {
        db.contas.forEach(c => {
            let mostrar = false;
            if (tipo === 'despesas_gerais' && (c.tipo === 'movimentacao' || c.tipo === 'cartao')) mostrar = true;
            else if (tipo === 'emprestei_cartao' && c.tipo === 'cartao') mostrar = true;
            else if (['emprestei_dinheiro', 'pag_emprestimo'].includes(tipo) && c.tipo === 'movimentacao') mostrar = true;
            else if (['dep_poupanca', 'saque_poupanca'].includes(tipo) && c.tipo === 'investimento') mostrar = true;
            else if (['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas'].includes(tipo) && c.tipo !== 'cartao') mostrar = true;
            else if (tipo === 'estorno') mostrar = true; 
            
            if (mostrar) {
                contaSelect.options.add(new Option(`${c.tipo === 'cartao' ? '💳' : (c.tipo === 'investimento' ? '📈' : '🏦')} ${c.nome}`, c.id));
                temConta = true;
            }
        });
    }
    if (!temConta) contaSelect.options.add(new Option('Sem conta compatível', ''));
    atualizarFormaPagamento();
}

function atualizarFormaPagamento() {
    const tipo = document.getElementById('lanc-tipo').value;
    const contaId = document.getElementById('lanc-conta').value;
    const formaSelect = document.getElementById('lanc-forma');
    if(!formaSelect) return;
    formaSelect.options.length = 0;

    const contaAtiva = db.contas ? db.contas.find(c => c.id === contaId) : null;
    if (!contaAtiva) { formaSelect.options.add(new Option('-', '')); verificarFormaCredito(); return; }

    let listaFormas = [];
    if (contaAtiva.tipo === 'cartao') listaFormas = [{ val: 'Crédito', txt: '💳 Crédito' }];
    else if (contaAtiva.tipo === 'movimentacao') {
        if (tipo === 'salario') listaFormas = [{ val: 'Pix', txt: '📱 Pix' }, { val: 'Transferência', txt: '🔄 Transferência' }];
        else if (['tomei_emprestimo', 'rec_emprestimo', 'outras_receitas'].includes(tipo)) listaFormas = [{ val: 'Pix', txt: '📱 Pix' }];
        else if (tipo === 'estorno') listaFormas = [{ val: 'Pix', txt: '📱 Pix' }, { val: 'Estorno Conta', txt: '↩️ Reembolso' }];
        else listaFormas = [{ val: 'Pix', txt: '📱 Pix' }, { val: 'Boleto', txt: '📄 Boleto' }, { val: 'Débito', txt: '🏧 Débito' }];
    } else if (contaAtiva.tipo === 'investimento') {
        listaFormas = ['dep_poupanca', 'saque_poupanca'].includes(tipo) ? [{ val: 'Transferência', txt: '🔄 Transferência' }, { val: 'Pix', txt: '📱 Pix' }] : [{ val: 'Pix', txt: '📱 Pix' }, { val: 'Transferência', txt: '🔄 Transferência' }];
    }
    listaFormas.forEach(f => formaSelect.options.add(new Option(f.txt, f.val)));
    verificarFormaCredito();
}

function verificarFormaCredito() {
    const forma = document.getElementById('lanc-forma').value;
    const parcelasSelect = document.getElementById('lanc-parcelas');
    if (!parcelasSelect) return;
    if (forma === 'Crédito') { parcelasSelect.style.display = 'block'; atualizarParcelasCartao(); } 
    else { parcelasSelect.style.display = 'none'; parcelasSelect.options.length = 0; }
}

function atualizarParcelasCartao() {
    const forma = document.getElementById('lanc-forma').value;
    if (forma !== 'Crédito') return;

    const valorTotal = parseFloat(document.getElementById('lanc-valor').value) || 0;
    const dataInput = document.getElementById('lanc-data').value;
    const contaId = document.getElementById('lanc-conta').value;
    const parcelasSelect = document.getElementById('lanc-parcelas');
    parcelasSelect.options.length = 0;

    if (!dataInput || !contaId || valorTotal <= 0) { parcelasSelect.options.add(new Option('Insira Valor e Data', '1')); return; }
    const conta = db.contas.find(c => c.id === contaId);
    if (!conta || conta.tipo !== 'cartao') return;

    let [ano, mes, dia] = dataInput.split('-').map(Number);
    if (dia >= conta.fechamento) { mes += 1; if(mes > 12) { mes = 1; ano += 1; } }
    const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    for (let i = 1; i <= 12; i++) {
        let valorParcela = (valorTotal / i).toFixed(2);
        let mesFinal = mes + (i - 1); let anoFinal = ano;
        while(mesFinal > 12) { mesFinal -= 12; anoFinal += 1; }
        let labelFatura = `${mesesNomes[mesFinal-1]}/${anoFinal.toString().slice(-2)}`;
        parcelasSelect.options.add(new Option(i === 1 ? `1x R$ ${valorParcela} (${labelFatura})` : `${i}x R$ ${valorParcela} (até ${labelFatura})`, i));
    }
}

function verificarDataFutura() {
    const dataInput = document.getElementById('lanc-data').value;
    if(!dataInput) return;
    const dtLanc = new Date(dataInput + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    document.getElementById('lanc-efetivado').checked = dtLanc <= hoje;
}

// --- ADIÇÃO DE LANÇAMENTOS E EFEITO LENE ---
function adicionarLancamento() {
    const data = document.getElementById('lanc-data').value; 
    const tipo = document.getElementById('lanc-tipo').value;
    const contaId = document.getElementById('lanc-conta').value; 
    const desc = document.getElementById('lanc-desc').value;
    const valor = parseFloat(document.getElementById('lanc-valor').value); 
    const cat = document.getElementById('lanc-cat').value;
    const isFixo = document.getElementById('lanc-fixo').checked; 
    const efetivado = document.getElementById('lanc-efetivado').checked; 
    const forma = document.getElementById('lanc-forma').value;

    if(!desc || isNaN(valor) || !data || !contaId) return alert("Preencha todos os dados corretamente.");
    const conta = db.contas.find(c => c.id === contaId);
    const parcelasSelect = document.getElementById('lanc-parcelas');
    const qtdParcelas = (forma === 'Crédito' && parcelasSelect.style.display !== 'none') ? parseInt(parcelasSelect.value) || 1 : 1;

    if (qtdParcelas > 1 && forma === 'Crédito') {
        const valorParcela = valor / qtdParcelas;
        let [anoStr, mesStr, diaStr] = data.split('-');
        let dataBase = new Date(anoStr, parseInt(mesStr) - 1, diaStr);
        for (let i = 1; i <= qtdParcelas; i++) {
            let d = new Date(dataBase); d.setMonth(d.getMonth() + (i - 1));
            let dataParcelada = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
            db.lancamentos.push({ id: Date.now() + i, data: dataParcelada, tipo, contaId, forma, desc: `${desc} (${i}/${qtdParcelas})`, valor: valorParcela, cat, efetivado });
        }
    } else {
        if (conta && conta.tipo !== 'cartao' && efetivado) {
            if (window.ecoTiposReceita.includes(tipo)) conta.saldo += valor;
            if (window.ecoTiposDespesa.includes(tipo)) conta.saldo -= valor;
        }
        const novoLancamento = { id: Date.now(), data, tipo, contaId, forma, desc, valor, cat, efetivado };
        db.lancamentos.push(novoLancamento);
        
        if (isFixo && !document.getElementById('lanc-fixo').disabled) {
            const [anoStr, mesStr, diaStr] = data.split('-');
            db.recorrencias.push({ id: Date.now() + 1, diaVencimento: parseInt(diaStr), tipo, contaId, forma, desc, valor, cat, ultimoMesGerado: `${anoStr}-${mesStr}` });
        }

        if (['emprestei_cartao', 'emprestei_dinheiro', 'tomei_emprestimo'].includes(tipo)) {
            abrirModalEmprestimo(novoLancamento); save(); return; 
        }
    }
    save(); 
    document.getElementById('lanc-desc').value = ""; document.getElementById('lanc-valor').value = ""; document.getElementById('lanc-fixo').checked = false;
    document.getElementById('lanc-data').valueAsDate = new Date(); verificarDataFutura();
    if(forma === 'Crédito') atualizarParcelasCartao();
    showToast(qtdParcelas > 1 ? `Compra parcelada em ${qtdParcelas}x com sucesso!` : "Lançamento Registrado com Sucesso!");
}

function abrirModalEmprestimo(lancamentoBase) {
    window.ecoTempEmprestimo = lancamentoBase;
    const modal = document.getElementById('modal-emprestimo');
    const isTomada = lancamentoBase.tipo === 'tomei_emprestimo';
    document.getElementById('msg-modal-emp').innerText = `Você ${isTomada ? 'tomou emprestado' : 'emprestou'} R$ ${lancamentoBase.valor.toFixed(2)} ("${lancamentoBase.desc}"). Como será o ${isTomada ? 'pagamento' : 'recebimento'}?`;
    document.getElementById('emp-sem-previsao').checked = false;
    if(typeof toggleCamposPrevisao === 'function') toggleCamposPrevisao();
    modal.style.display = 'flex'; modal.classList.add('active');
}

function fecharModalEmprestimo() {
    window.ecoTempEmprestimo = null;
    const m = document.getElementById('modal-emprestimo');
    if(m) { m.style.display = 'none'; m.classList.remove('active'); }
}

function gerarParcelasEmprestimo() {
    if (!window.ecoTempEmprestimo) return;
    const semPrevisao = document.getElementById('emp-sem-previsao').checked;
    const isTomada = window.ecoTempEmprestimo.tipo === 'tomei_emprestimo';
    let dataAtual = new Date(window.ecoTempEmprestimo.data + 'T00:00:00');

    if (semPrevisao) {
        db.lancamentos.push({
            id: Date.now(), data: dataAtual.toISOString().split('T')[0], tipo: isTomada ? 'pag_emprestimo' : 'rec_emprestimo', contaId: window.ecoTempEmprestimo.contaId, forma: window.ecoTempEmprestimo.forma,
            desc: `${isTomada ? 'Pag.' : 'Rec.'} ${window.ecoTempEmprestimo.desc}`,
            valor: window.ecoTempEmprestimo.valor, valorOriginal: window.ecoTempEmprestimo.valor, valorAmortizado: 0,
            cat: 'Terceiros', efetivado: false, rolagem: true 
        });
        showToast("Dívida registrada em rolagem mensal automática!");
    } else {
        const parcelas = parseInt(document.getElementById('emp-parcelas').value);
        const intervalo = parseInt(document.getElementById('emp-intervalo').value);
        if (parcelas >= 1) {
            const valorParcela = window.ecoTempEmprestimo.valor / parcelas;
            for (let i = 1; i <= parcelas; i++) {
                dataAtual.setDate(dataAtual.getDate() + intervalo);
                db.lancamentos.push({
                    id: Date.now() + i, data: dataAtual.toISOString().split('T')[0], tipo: isTomada ? 'pag_emprestimo' : 'rec_emprestimo', contaId: window.ecoTempEmprestimo.contaId, forma: window.ecoTempEmprestimo.forma,
                    desc: `${isTomada ? 'Pag.' : 'Rec.'} ${window.ecoTempEmprestimo.desc} (${i}/${parcelas})`,
                    valor: valorParcela, cat: 'Terceiros', efetivado: false, rolagem: false
                });
            }
            showToast(`${parcelas} parcelas geradas!`);
        }
    }
    save(); fecharModalEmprestimo();
}

// --- AMORTIZAÇÃO AVANÇADA DE EMPRÉSTIMOS ---
function confirmarPagamentoParcial() {
    const idInput = document.getElementById('hidden-id-parcial').value;
    const valorPago = parseFloat(document.getElementById('input-valor-parcial').value);
    if (!idInput || isNaN(valorPago) || valorPago <= 0) return alert("Insira um valor válido e maior que zero.");
    
    const lOriginal = db.lancamentos.find(l => l.id == idInput);
    if (!lOriginal) return;
    
    if (valorPago >= lOriginal.valor) {
        alert("O valor inserido quita totalmente a dívida. Realizando Quitação Total.");
        confirmarQuitacao(idInput);
        if (typeof fecharModalParcial === 'function') fecharModalParcial();
        return;
    }
    
    // Inicializa rastreadores
    if (lOriginal.valorOriginal === undefined) lOriginal.valorOriginal = lOriginal.valor;
    if (lOriginal.valorAmortizado === undefined) lOriginal.valorAmortizado = 0;
    
    // Atualiza a dívida matriz (sem mudar de mês prematuramente)
    lOriginal.valorAmortizado += valorPago;
    lOriginal.valor -= valorPago;
    
    // Cria o lançamento real do pagamento efetuado agora
    const c = db.contas.find(x => x.id === lOriginal.contaId);
    if (c && c.tipo !== 'cartao') {
        if (window.ecoTiposReceita.includes(lOriginal.tipo)) c.saldo += valorPago;
        if (window.ecoTiposDespesa.includes(lOriginal.tipo)) c.saldo -= valorPago;
    }
    
    const descLimpa = lOriginal.desc.replace(' (Em Aberto)', '').trim();
    db.lancamentos.push({
        id: Date.now() + Math.random(), data: new Date().toISOString().split('T')[0], tipo: lOriginal.tipo, contaId: lOriginal.contaId, forma: lOriginal.forma,
        desc: `[Amortização] ${descLimpa}`, valor: valorPago, cat: lOriginal.cat, efetivado: true, rolagem: false 
    });
    
    save();
    if (typeof fecharModalParcial === 'function') fecharModalParcial();
    showToast("Amortização registrada! Dívida atualizada.");
}

function confirmarQuitacao(id) {
    const lOriginal = db.lancamentos.find(l => l.id == id);
    if (!lOriginal) return;

    const valorPago = lOriginal.valor;
    const c = db.contas.find(x => x.id === lOriginal.contaId);
    if (c && c.tipo !== 'cartao') {
        if (window.ecoTiposReceita.includes(lOriginal.tipo)) c.saldo += valorPago;
        if (window.ecoTiposDespesa.includes(lOriginal.tipo)) c.saldo -= valorPago;
    }

    const descLimpa = lOriginal.desc.replace(' (Em Aberto)', '').trim();
    db.lancamentos.push({
        id: Date.now() + Math.random(), data: new Date().toISOString().split('T')[0], tipo: lOriginal.tipo, contaId: lOriginal.contaId, forma: lOriginal.forma,
        desc: `[Quitação] ${descLimpa}`, valor: valorPago, cat: lOriginal.cat, efetivado: true, rolagem: false
    });

    // A dívida acabou, removemos a âncora
    db.lancamentos = db.lancamentos.filter(l => l.id != id);
    save(); showToast("Dívida Quitada com sucesso!");
}

function confirmarPagamento(id) {
    const l = db.lancamentos.find(x => x.id === id); if(!l) return;
    l.efetivado = true; l.desc = l.desc.replace(' (Em Aberto)', '').replace(' (Restante)', '').trim();
    const c = db.contas.find(x => x.id === l.contaId);
    if(c && c.tipo !== 'cartao') {
        if (window.ecoTiposReceita.includes(l.tipo)) c.saldo += l.valor;
        if (window.ecoTiposDespesa.includes(l.tipo)) c.saldo -= l.valor;
    }
    save(); showToast("Pagamento Efetivado!");
}

function excluirLancamento(id) {
    if(!confirm("Apagar lançamento? O saldo será recalculado.")) return;
    const lanc = db.lancamentos.find(l => l.id === id); if(!lanc) return;
    const c = db.contas.find(x => x.id === lanc.contaId);
    if(c && c.tipo !== 'cartao' && lanc.efetivado) {
        if (window.ecoTiposReceita.includes(lanc.tipo)) c.saldo -= lanc.valor; 
        if (window.ecoTiposDespesa.includes(lanc.tipo)) c.saldo += lanc.valor; 
    }
    db.lancamentos = db.lancamentos.filter(l => l.id !== id); save(); showToast("Lançamento apagado!");
}

function salvarEdicaoLancamento(id) {
    const l = db.lancamentos.find(x => x.id === id);
    const novoValor = parseFloat(document.getElementById(`e-lanc-val-${id}`).value);
    const novaData = document.getElementById(`e-lanc-data-${id}`).value;
    const novaDesc = document.getElementById(`e-lanc-desc-${id}`).value;
    if(!novaDesc || isNaN(novoValor) || !novaData) return alert("Preencha todos os dados.");
    
    const c = db.contas.find(x => x.id === l.contaId);
    if(c && c.tipo !== 'cartao' && l.efetivado) {
        const diferenca = novoValor - l.valor;
        if(window.ecoTiposReceita.includes(l.tipo)) c.saldo += diferenca;
        if(window.ecoTiposDespesa.includes(l.tipo)) c.saldo -= diferenca;
    }
    l.valor = novoValor; l.data = novaData; l.desc = novaDesc; save(); showToast("Movimentação Atualizada!");
}

// --- AMORTIZAÇÃO DE FATURA DE CARTÃO ---
function amortizarFatura(fatID) {
    const [contaId, mesRef] = fatID.split('-');
    const conta = db.contas.find(c => c.id === contaId);
    if (!conta) return;
    let totalFat = 0;
    db.lancamentos.forEach(l => {
        if (l.contaId === conta.id && getMesFaturaLogico(l.data, conta.fechamento) === mesRef) totalFat += (window.ecoTiposReceita.includes(l.tipo) ? -l.valor : l.valor);
    });
    const jaAmortizado = (db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0;
    document.getElementById('hidden-fat-id').value = fatID;
    
    // Usa a mesma função de formatação do Fatura
    const meses = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'};
    document.getElementById('txt-fatura-id-parcial').innerText = `${meses[mesRef.split('-')[1]]} / ${mesRef.split('-')[0]}`;
    document.getElementById('txt-valor-fatura-original').innerText = `R$ ${(totalFat - jaAmortizado).toFixed(2)}`;
    
    const modal = document.getElementById('modal-fatura-parcial');
    if(modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
}

function fecharModalFaturaParcial() {
    const m = document.getElementById('modal-fatura-parcial');
    if(m) { m.style.display = 'none'; m.classList.remove('active'); document.getElementById('input-amortizar-fatura').value = ''; }
}

function confirmarAmortizacaoFatura() {
    const fatID = document.getElementById('hidden-fat-id').value;
    const valorAmortizar = parseFloat(document.getElementById('input-amortizar-fatura').value);
    if (!valorAmortizar || valorAmortizar <= 0) return alert("Valor inválido.");

    const contaCC = db.contas.find(c => c.tipo === 'movimentacao');
    if (!contaCC) return alert("Crie uma Conta Corrente para usar o dinheiro da Amortização.");

    if (!db.amortizacoesFaturas) db.amortizacoesFaturas = {};
    db.amortizacoesFaturas[fatID] = (db.amortizacoesFaturas[fatID] || 0) + valorAmortizar;
    contaCC.saldo -= valorAmortizar;

    const mesRef = fatID.split('-')[1];
    const meses = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'};
    
    db.lancamentos.push({
        id: Date.now(), desc: `Amortização Fatura (${meses[mesRef]})`, valor: valorAmortizar, data: new Date().toISOString().split('T')[0],
        contaId: contaCC.id, cat: 'Outros', tipo: 'despesa', efetivado: true
    });

    save(); fecharModalFaturaParcial(); showToast("Fatura amortizada no extrato!");
}

// --- ROTINAS DE VIRADA DE MÊS ---
function processarRolagensPendentes() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    let atualizouAlgo = false;
    
    db.lancamentos.forEach(l => {
        // A mágica: Só transfere a dívida de mês quando o mês REALMENTE virar no calendário!
        if (l.rolagem && !l.efetivado) {
            let [anoLanc, mesLanc, diaLanc] = l.data.split('-').map(Number);
            if (anoLanc < anoAtual || (anoLanc === anoAtual && mesLanc < mesAtual)) {
                l.data = ajustarDataDia(anoAtual, mesAtual, diaLanc);
                atualizouAlgo = true;
            }
        }
    });
    if (atualizouAlgo) save();
}

function processarRecorrencias() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear(); const mesAtual = hoje.getMonth() + 1;
    let gerouNovo = false;

    db.recorrencias.forEach(rec => {
        let [anoUltimo, mesUltimo] = rec.ultimoMesGerado.split('-').map(Number);
        while (anoUltimo < anoAtual || (anoUltimo === anoAtual && mesUltimo < mesAtual)) {
            mesUltimo++; if (mesUltimo > 12) { mesUltimo = 1; anoUltimo++; }
            const mesStr = mesUltimo.toString().padStart(2, '0');
            const dataLancamento = ajustarDataDia(anoUltimo, mesUltimo, rec.diaVencimento);
            const dtLanc = new Date(dataLancamento + 'T00:00:00');
            const isEfetivado = dtLanc <= hoje;

            const novoL = { id: Date.now() + Math.random(), data: dataLancamento, tipo: rec.tipo, contaId: rec.contaId, forma: rec.forma, desc: rec.desc + " (Fixo)", valor: rec.valor, cat: rec.cat, efetivado: isEfetivado };
            db.lancamentos.push(novoL);
            
            const conta = db.contas.find(c => c.id === rec.contaId);
            if (conta && conta.tipo !== 'cartao' && isEfetivado) {
                if (window.ecoTiposReceita.includes(rec.tipo)) conta.saldo += rec.valor;
                if (window.ecoTiposDespesa.includes(rec.tipo)) conta.saldo -= rec.valor;
            }
            rec.ultimoMesGerado = `${anoUltimo}-${mesStr}`; 
            gerouNovo = true;
        }
    });
    if (gerouNovo) save();
}

function ajustarDataDia(ano, mes, diaVencimentoOriginal) {
    const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
    const diaReal = diaVencimentoOriginal > ultimoDiaDoMes ? ultimoDiaDoMes : diaVencimentoOriginal;
    return `${ano}-${mes.toString().padStart(2, '0')}-${diaReal.toString().padStart(2, '0')}`;
}

// --- GESTÃO E EDIÇÃO DE CONTAS ---
function toggleCamposCartao() { document.getElementById('campos-cartao-add').style.display = document.getElementById('nova-conta-tipo').value === 'cartao' ? 'block' : 'none'; }
function criarConta() { 
    const n = document.getElementById('nova-conta-nome').value; const t = document.getElementById('nova-conta-tipo').value; 
    if(!n) return alert("Preencha o nome da conta."); 
    const nc = {id: 'c_'+Date.now(), nome: n, tipo: t, cor: document.getElementById('nova-conta-cor').value, saldo: 0}; 
    if(t === 'cartao'){ nc.limite = parseFloat(document.getElementById('nova-conta-limite').value)||0; nc.meta = parseFloat(document.getElementById('nova-conta-meta').value)||0; nc.fechamento = parseInt(document.getElementById('nova-conta-fecha').value)||1; nc.vencimento = parseInt(document.getElementById('nova-conta-venc').value)||1; } 
    db.contas.push(nc); save(); document.getElementById('nova-conta-nome').value=""; showToast("Conta Criada!"); mudarDirecaoLancamento(); if(typeof toggleNovaContaArea === 'function') toggleNovaContaArea();
}
function excluirConta(id) { 
    if(confirm("Excluir conta e todos os lançamentos atrelados?")){ db.contas = db.contas.filter(c=>c.id!==id); db.lancamentos = db.lancamentos.filter(l=>l.contaId!==id); save(); showToast("Conta Excluída!"); mudarDirecaoLancamento(); } 
}
function toggleEditConta(id) { const el = document.getElementById(`edit-conta-${id}`); if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
function salvarEdicaoConta(id) { 
    const c = db.contas.find(x => x.id === id); 
    c.nome = document.getElementById(`edit-nome-${id}`).value; c.cor = document.getElementById(`edit-cor-${id}`).value; 
    if(c.tipo === 'cartao'){ c.limite = parseFloat(document.getElementById(`edit-limite-${id}`).value) || 0; c.meta = parseFloat(document.getElementById(`edit-meta-${id}`).value) || 0; c.fechamento = parseInt(document.getElementById(`edit-fecha-${id}`).value) || 1; c.vencimento = parseInt(document.getElementById(`edit-venc-${id}`).value) || 1; } 
    else { c.saldo = parseFloat(document.getElementById(`edit-saldo-${id}`).value) || 0; }
    save(); showToast("Conta e Saldo Atualizados!"); mudarDirecaoLancamento();
}

// --- BACKUPS COM FORMATO LEGÍVEL ---
function alternarPagamentoFatura(id) { const i = db.faturasPagas.indexOf(id); if(i > -1) db.faturasPagas.splice(i,1); else db.faturasPagas.push(id); save(); showToast("Fatura Atualizada!"); }
function exportarBackup() { 
    // AGORA EXPORTA O JSON BONITO E LEGÍVEL
    const dataStr = JSON.stringify(db, null, 2); 
    const sizeKB = (new Blob([dataStr]).size / 1024).toFixed(1) + " KB"; 
    const now = new Date(); 
    const nomeArquivo = `EcoBKP_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours()}${now.getMinutes()}.json`; 
    
    let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; 
    hist.unshift({ id: Date.now(), nome: nomeArquivo, data: now.toLocaleDateString('pt-BR')+' '+now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), size: sizeKB, versao: "v25.8.1", payload: dataStr }); 
    if(hist.length > 5) hist.pop(); localStorage.setItem('ecoDB_backups', JSON.stringify(hist)); 
    
    const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(dataStr); a.download = nomeArquivo; a.click(); 
    if(typeof renderAbaConfig === 'function') renderAbaConfig(); showToast("Backup Formato Legível Salvo!"); 
}
function excluirBackupLocal(id) { if(confirm("Apagar este backup?")) { let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; hist = hist.filter(b => b.id !== id); localStorage.setItem('ecoDB_backups', JSON.stringify(hist)); if(typeof renderAbaConfig === 'function') renderAbaConfig(); } }
function restaurarBackupLocal(id) { if(confirm("Substituir dados atuais? O app vai recarregar.")) { let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; let bkp = hist.find(b => b.id === id); if(bkp) { localStorage.setItem('ecoDB_v25', bkp.payload); location.reload(); } } }
function importarArquivoJSON(event) { const file = event.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const json = JSON.parse(e.target.result); if(json && json.contas) { localStorage.setItem('ecoDB_v25', JSON.stringify(json)); location.reload(); } else alert("Arquivo inválido."); } catch(err) { alert("Erro de leitura."); } }; reader.readAsText(file); }
function confirmarReset() { const palavra = prompt("⚠️ ZONA DE PERIGO\nApagará TODO o histórico. Digite 'excluir':"); if (palavra && palavra.toLowerCase() === "excluir") { localStorage.removeItem('ecoDB_v25'); localStorage.removeItem('ecoDB_backups'); db = { contas: [ { id: 'c_padrao_mov', nome: 'Conta Corrente', tipo: 'movimentacao', saldo: 0, cor: '#2563eb' } ], lancamentos: [], faturasPagas: [], recorrencias: [] }; save(); alert("Sistema formatado."); location.reload(); } }

window.addEventListener('DOMContentLoaded', () => { if (document.getElementById('lanc-direcao')) mudarDirecaoLancamento(); processarRolagensPendentes(); processarRecorrencias(); });
setTimeout(() => { if (document.getElementById('lanc-tipo') && document.getElementById('lanc-tipo').options.length === 0) mudarDirecaoLancamento(); }, 300);
