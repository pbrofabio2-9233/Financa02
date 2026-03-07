// ==========================================
// ENGINE.JS - Lógica de Negócios e Cálculos (v26.0.8 - Notificações com Redirecionamento)
// ==========================================

window.ecoTempEmprestimo = null;
window.ecoTiposReceita = ['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca', 'receita', 'emp_pessoal', 'compensacao'];
window.ecoTiposDespesa = ['despesas_gerais', 'emprestei_dinheiro', 'pag_emprestimo', 'dep_poupanca', 'emprestei_cartao', 'despesa', 'emp_concedido', 'emp_cartao'];
window.cartaoAtivoFatura = null; 
window.meuGrafico = null;
window.meuGraficoEvolucao = null;

function showToast(mensagem) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-check-circle" style="color: var(--sucesso); font-size:18px;"></i> ${mensagem}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// ----------------------------------------------------
// CENTRAL DE NOTIFICAÇÕES (Motor de Ciclos)
// ----------------------------------------------------
window.verificarNotificacoesMotor = function() {
    const listaNotif = document.getElementById('lista-notificacoes');
    const badge = document.getElementById('badge-notificacao');
    if(!listaNotif || !badge) return;

    let htmlNotificacoes = '';
    let contadorUnread = 0;
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const dataHojeIso = hoje.toISOString().split('T')[0];

    // 1. Rastreador de Salários (Aviso Exato no Dia)
    (db.salarios || []).forEach(sal => {
        if (sal.dias.includes(diaHoje)) {
            const valorParcela = sal.valorTotal / sal.dias.length;
            const descEsperada = `${sal.nome} (${sal.frequencia})`;
            const jaLancado = db.lancamentos.find(l => l.data === dataHojeIso && l.desc === descEsperada && Math.abs(l.valor - valorParcela) < 0.01);

            if (!jaLancado) {
                contadorUnread++;
                htmlNotificacoes += `
                <div class="notif-card unread" id="notif-sal-${sal.id}">
                    <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                        <strong style="font-size: 13px; color: var(--texto-main);">💰 ${sal.nome}</strong>
                        <small style="color: var(--texto-sec); font-size: 10px; font-weight: bold;">Hoje</small>
                    </div>
                    <p style="font-size: 12px; color: var(--texto-sec); margin-bottom: 12px; line-height: 1.4;">
                        O valor de <strong>R$ ${valorParcela.toFixed(2)}</strong> (${sal.frequencia}) estava programado para hoje.
                    </p>
                    <button class="btn-primary" style="width: 100%; font-size: 12px; padding: 10px; background: var(--esmeralda);" onclick="event.stopPropagation(); confirmarSalarioMotor('${sal.nome}', ${valorParcela}, '${sal.contaId}', '${sal.frequencia}')">
                        Confirmar Recebimento
                    </button>
                </div>`;
            }
        }
    });

    // 2. Rastreador de Vencimentos e Atrasos (Contas Correntes/Boletos) - Aviso 3 Dias
    hoje.setHours(0,0,0,0);
    (db.lancamentos || []).forEach(l => {
        const conta = (db.contas || []).find(c => c.id === l.contaId);
        if (conta && conta.tipo === 'cartao') return; 
        
        const d = new Date(l.data + 'T00:00:00');
        if (!l.efetivado && window.ecoTiposDespesa.includes(l.tipo)) {
            const diasFaltando = Math.ceil((d - hoje) / (1000 * 60 * 60 * 24));
            
            if (diasFaltando <= 3) {
                contadorUnread++;
                let statusAviso = diasFaltando < 0 ? '🚨 Atrasado' : (diasFaltando === 0 ? '⚠️ Vence Hoje' : `⚠️ Vence em ${diasFaltando} dias`);

                // Adicionado cursor:pointer e onclick com redirecionamento
                htmlNotificacoes += `
                <div class="notif-card ${diasFaltando < 0 ? 'warning' : 'warning'}" style="cursor:pointer;" onclick="if(typeof redirecionarParaLancamento === 'function') redirecionarParaLancamento(${l.id}, '${l.data}')">
                    <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                        <strong style="font-size: 13px; color: var(--texto-main);">${statusAviso}</strong>
                    </div>
                    <p style="font-size: 12px; color: var(--texto-sec); margin-bottom: 12px;">A despesa <strong>${l.desc}</strong> (R$ ${l.valor.toFixed(2)}) precisa da sua atenção.</p>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-primary" style="flex:1; font-size: 11px; padding: 8px;" onclick="event.stopPropagation(); confirmarPagamento(${l.id}); verificarNotificacoesMotor();">Pagar Agora</button>
                    </div>
                </div>`;
            }
        }
    });

    // 3. Rastreador de Faturas de Cartão - Aviso 3 Dias
    (db.contas || []).filter(c => c.tipo === 'cartao').forEach(c => {
        let mesesFatura = {};
        
        (db.lancamentos || []).forEach(l => {
            if(l.contaId !== c.id) return;
            const mesFat = obterMesFaturaAviso(l.data, c.fechamento || 1);
            if(!mesesFatura[mesFat]) mesesFatura[mesFat] = 0;
            mesesFatura[mesFat] += window.ecoTiposReceita.includes(l.tipo) ? -l.valor : l.valor;
        });

        Object.keys(mesesFatura).forEach(mes => {
            const fatID = `${c.id}-${mes}`;
            if ((db.faturasPagas || []).includes(fatID)) return;
            
            const jaAmortizado = (db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0;
            const totalFinal = mesesFatura[mes] - jaAmortizado;
            if (totalFinal <= 0) return;

            let [anoF, mesF] = mes.split('-').map(Number);
            let diaVenc = c.vencimento || 1;
            let diaFech = c.fechamento || 1;
            
            if (diaVenc < diaFech) {
                mesF += 1;
                if (mesF > 12) { mesF = 1; anoF += 1; }
            }
            
            const dataVenc = new Date(anoF, mesF - 1, diaVenc);
            dataVenc.setHours(0,0,0,0);
            
            const diasFaltando = Math.ceil((dataVenc - hoje) / (1000 * 60 * 60 * 24));
            
            if (diasFaltando <= 3) {
                contadorUnread++;
                let txtDias = diasFaltando < 0 ? '🚨 Fatura Atrasada' : (diasFaltando === 0 ? '⚠️ Vence Hoje' : `⚠️ Vence em ${diasFaltando} dias`);
                
                // Adicionado cursor:pointer e onclick com redirecionamento para fatura
                htmlNotificacoes += `
                <div class="notif-card warning" style="cursor:pointer;" onclick="if(typeof redirecionarParaFatura === 'function') redirecionarParaFatura('${c.id}', '${mes}')">
                    <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                        <strong style="font-size: 13px; color: var(--texto-main);">💳 Fatura ${c.nome}</strong>
                        <small style="color: var(--alerta); font-size: 10px; font-weight: bold;">${txtDias}</small>
                    </div>
                    <p style="font-size: 12px; color: var(--texto-sec); margin-bottom: 12px;">O valor total de <strong>R$ ${totalFinal.toFixed(2)}</strong> está próximo do vencimento.</p>
                </div>`;
            }
        });
    });

    if(htmlNotificacoes === '') {
        htmlNotificacoes = '<div style="text-align:center; padding: 20px; color: var(--texto-sec); font-size: 12px;"><i class="fas fa-check-circle" style="font-size: 24px; color: var(--esmeralda); margin-bottom: 10px; display:block;"></i>Tudo em dia! Nenhuma pendência para hoje.</div>';
    }

    listaNotif.innerHTML = htmlNotificacoes;
    if (contadorUnread > 0) {
        badge.style.display = 'flex';
        badge.innerText = contadorUnread;
    } else {
        badge.style.display = 'none';
    }
}

function obterMesFaturaAviso(dataLancamento, diaFechamento) {
    if (!dataLancamento) return ""; 
    const [anoStr, mesStr, diaStr] = dataLancamento.split('T')[0].split('-'); 
    let ano = parseInt(anoStr, 10); 
    let mes = parseInt(mesStr, 10); 
    let dia = parseInt(diaStr, 10); 
    let diaFech = parseInt(diaFechamento, 10) || 1; 
    
    if (dia >= diaFech) { 
        mes += 1; 
        if (mes > 12) { mes = 1; ano += 1; } 
    } 
    return `${ano}-${mes.toString().padStart(2, '0')}`;
}

window.confirmarSalarioMotor = function(nome, valor, contaId, freq) {
    const hojeIso = new Date().toISOString().split('T')[0];
    db.lancamentos.push({
        id: Date.now(),
        data: hojeIso,
        tipo: 'receita',
        contaId: contaId,
        forma: 'Pix',
        desc: `${nome} (${freq})`,
        valor: valor,
        cat: 'Salário',
        efetivado: true
    });
    
    const c = db.contas.find(x => x.id === contaId);
    if(c) c.saldo += valor;
    
    save();
    showToast(`${nome} recebido com sucesso!`);
    if(typeof render === 'function') render();
    verificarNotificacoesMotor();
}

// ----------------------------------------------------
// CONTRATOS FIXOS E PARCELAMENTOS
// ----------------------------------------------------
window.salvarContaFixa = function() {
    const desc = document.getElementById('fixa-desc').value;
    const valor = parseFloat(document.getElementById('fixa-valor').value);
    const dia = parseInt(document.getElementById('fixa-dia').value);
    const cat = document.getElementById('fixa-cat').value;
    const contaId = document.getElementById('fixa-conta').value;

    if(!desc || isNaN(valor) || !dia || !cat || !contaId) return alert("Preencha todos os campos da Conta Fixa.");

    const conta = db.contas.find(c => c.id === contaId);
    const forma = conta.tipo === 'cartao' ? 'Crédito' : 'Boleto'; 

    const hoje = new Date();
    let mesAtual = hoje.getMonth() + 1;
    let anoAtual = hoje.getFullYear();

    let mesAnterior = mesAtual - 1;
    let anoAnterior = anoAtual;
    if (mesAnterior === 0) {
        mesAnterior = 12;
        anoAnterior--;
    }

    db.recorrencias.push({
        id: Date.now(),
        diaVencimento: dia,
        tipo: 'despesas_gerais',
        contaId: contaId,
        forma: forma,
        desc: desc,
        valor: valor,
        cat: cat,
        ultimoMesGerado: `${anoAnterior}-${mesAnterior.toString().padStart(2,'0')}`
    });

    save();
    processarRecorrencias();
    showToast("Conta Fixa Registrada e ativada!");
    
    document.getElementById('fixa-desc').value = '';
    document.getElementById('fixa-valor').value = '';
    
    if(typeof fecharModalContratos === 'function') fecharModalContratos();
    if(typeof render === 'function') render();
}

window.salvarParcelamentoAndamento = function() {
    const desc = document.getElementById('parc-desc').value;
    const valor = parseFloat(document.getElementById('parc-valor').value);
    const diaVenc = parseInt(document.getElementById('parc-dia').value);
    const parcAtual = parseInt(document.getElementById('parc-atual').value);
    const parcTotal = parseInt(document.getElementById('parc-total').value);
    const mesInput = document.getElementById('parc-mes').value;
    const cat = document.getElementById('parc-cat').value;
    const contaId = document.getElementById('parc-conta').value;

    if(!desc || isNaN(valor) || isNaN(diaVenc) || isNaN(parcAtual) || isNaN(parcTotal) || !mesInput || !cat || !contaId) {
        return alert("Preencha todos os campos do Parcelamento.");
    }
    if(parcAtual > parcTotal) {
        return alert("A parcela atual não pode ser maior que o total de parcelas.");
    }

    const conta = db.contas.find(c => c.id === contaId);
    const isCartao = conta.tipo === 'cartao';
    const forma = isCartao ? 'Crédito' : 'Boleto';

    let [anoStr, mesStr] = mesInput.split('-');
    let ano = parseInt(anoStr);
    let mes = parseInt(mesStr);
    let diaFechamento = conta.fechamento || 1;

    const groupId = 'grp_' + Date.now();
    let geradas = 0;

    for(let i = parcAtual; i <= parcTotal; i++) {
        let offset = i - parcAtual;
        let mesParcela = mes + offset;
        let anoParcela = ano;
        
        while(mesParcela > 12) {
            mesParcela -= 12;
            anoParcela += 1;
        }

        let dataFormatada = "";
        
        if (isCartao) {
            let diaCompra = 1; 
            let mCompra = mesParcela; 
            let aCompra = anoParcela;
            
            if (diaFechamento === 1) { 
                mCompra -= 1; 
                if(mCompra === 0) { mCompra = 12; aCompra -= 1; } 
                diaCompra = 28; 
            }
            
            let d = new Date(aCompra, mCompra - 1, diaCompra);
            dataFormatada = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        } 
        else {
            let d = new Date(anoParcela, mesParcela - 1, diaVenc);
            if (d.getMonth() + 1 !== mesParcela) { 
                d = new Date(anoParcela, mesParcela, 0); 
            } 
            dataFormatada = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        }

        db.lancamentos.push({
            id: Date.now() + i,
            idGrupo: groupId,
            data: dataFormatada,
            tipo: 'despesas_gerais',
            contaId: contaId,
            forma: forma,
            desc: `${desc} (${i}/${parcTotal})`,
            valor: valor,
            cat: cat,
            efetivado: false
        });
        geradas++;
    }

    save();
    showToast(`Injetadas ${geradas} parcelas no seu Extrato!`);
    
    document.getElementById('parc-desc').value = '';
    document.getElementById('parc-valor').value = '';
    document.getElementById('parc-dia').value = '';
    document.getElementById('parc-atual').value = '';
    document.getElementById('parc-total').value = '';
    
    if(typeof fecharModalContratos === 'function') fecharModalContratos();
    if(typeof render === 'function') render();
    if(typeof verificarNotificacoesMotor === 'function') verificarNotificacoesMotor();
}

window.excluirParcelamentoGrupo = function(idGrupo) {
    if(!confirm("Atenção: Tem certeza que deseja apagar TODAS as parcelas deste financiamento que ainda estão em aberto?")) return;
    
    const antes = db.lancamentos.length;
    db.lancamentos = db.lancamentos.filter(l => !(l.idGrupo === idGrupo && l.efetivado === false));
    const excluidas = antes - db.lancamentos.length;
    
    save();
    showToast(`${excluidas} parcelas apagadas com sucesso!`);
    
    if(typeof render === 'function') render();
    if(typeof verificarNotificacoesMotor === 'function') verificarNotificacoesMotor();
}

// ----------------------------------------------------
// ROTINAS DE LANÇAMENTOS E CADASTROS
// ----------------------------------------------------
function mudarDirecaoLancamento() {
    const direcaoSelect = document.getElementById('lanc-direcao');
    const tipoSelect = document.getElementById('lanc-tipo');
    
    if(!direcaoSelect || !tipoSelect) return;
    
    const direcao = direcaoSelect.value;
    tipoSelect.options.length = 0; 
    
    let listaTipos = direcao === 'despesa' 
        ? [
            { val: 'despesas_gerais', txt: 'Despesas Gerais' }, 
            { val: 'emprestei_cartao', txt: 'Emprestei Cartão' }, 
            { val: 'emprestei_dinheiro', txt: 'Emprestei Dinheiro' }, 
            { val: 'pag_emprestimo', txt: 'Pagamento Empréstimo' }, 
            { val: 'dep_poupanca', txt: 'Depósito Poupança' }
          ]
        : [
            { val: 'salario', txt: 'Salário' }, 
            { val: 'tomei_emprestimo', txt: 'Tomei Empréstimo' }, 
            { val: 'rec_emprestimo', txt: 'Recebimento Empréstimo' }, 
            { val: 'outras_receitas', txt: 'Outras Receitas' }, 
            { val: 'estorno', txt: 'Estorno' }, 
            { val: 'saque_poupanca', txt: 'Saque Poupança' }
          ];

    listaTipos.forEach(t => tipoSelect.options.add(new Option(t.txt, t.val)));
    atualizarRegrasLancamento();
}

function atualizarRegrasLancamento() {
    const direcaoSelect = document.getElementById('lanc-direcao');
    const tipoSelect = document.getElementById('lanc-tipo');
    const contaSelect = document.getElementById('lanc-conta');
    const boxFixo = document.getElementById('lanc-fixo');
    const catChipsContainer = document.getElementById('lanc-cat-chips');
    const catInputHidden = document.getElementById('lanc-cat');
    
    if(!tipoSelect || !contaSelect || !catChipsContainer || !catInputHidden || !boxFixo) return;

    const tipo = tipoSelect.value;
    const direcao = direcaoSelect.value;

    contaSelect.options.length = 0; 
    catChipsContainer.innerHTML = '';

    let listaCategorias = [];
    if (db.categorias && db.categorias.length > 0) {
        const catFiltradas = db.categorias.filter(c => c.tipo === direcao);
        listaCategorias = catFiltradas.map(c => ({ val: c.nome, txt: `${c.icone || ''} ${c.nome}`.trim() }));
    }
    
    if (listaCategorias.length === 0) {
        listaCategorias.push({ val: 'Outros', txt: '⚙️ Outros' });
    }

    listaCategorias.forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = `chip-cat ${index === 0 ? 'active' : ''}`;
        btn.innerHTML = cat.txt;
        btn.onclick = function() {
            document.querySelectorAll('#lanc-cat-chips .chip-cat').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            catInputHidden.value = cat.val;
        };
        catChipsContainer.appendChild(btn);
    });

    if (listaCategorias.length > 0) {
        catInputHidden.value = listaCategorias[0].val;
    } else {
        catInputHidden.value = '';
    }
    
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
    if (!contaAtiva) { 
        formaSelect.options.add(new Option('-', '')); 
        verificarFormaCredito(); 
        return; 
    }

    let listaFormas = [];
    if (contaAtiva.tipo === 'cartao') {
        listaFormas = [{ val: 'Crédito', txt: '💳 Crédito' }];
    } else if (contaAtiva.tipo === 'movimentacao') {
        if (tipo === 'salario') {
            listaFormas = [{ val: 'Pix', txt: '📱 Pix' }, { val: 'Transferência', txt: '🔄 Transferência' }];
        } else if (['tomei_emprestimo', 'rec_emprestimo', 'outras_receitas'].includes(tipo)) {
            listaFormas = [{ val: 'Pix', txt: '📱 Pix' }];
        } else if (tipo === 'estorno') {
            listaFormas = [{ val: 'Pix', txt: '📱 Pix' }, { val: 'Estorno Conta', txt: '↩️ Reembolso' }];
        } else {
            listaFormas = [{ val: 'Pix', txt: '📱 Pix' }, { val: 'Boleto', txt: '📄 Boleto' }, { val: 'Débito', txt: '🏧 Débito' }];
        }
    } else if (contaAtiva.tipo === 'investimento') {
        listaFormas = ['dep_poupanca', 'saque_poupanca'].includes(tipo) 
            ? [{ val: 'Transferência', txt: '🔄 Transferência' }, { val: 'Pix', txt: '📱 Pix' }] 
            : [{ val: 'Pix', txt: '📱 Pix' }, { val: 'Transferência', txt: '🔄 Transferência' }];
    }
    
    listaFormas.forEach(f => formaSelect.options.add(new Option(f.txt, f.val)));
    verificarFormaCredito();
}

function verificarFormaCredito() {
    const forma = document.getElementById('lanc-forma').value;
    const parcelasSelect = document.getElementById('lanc-parcelas');
    if (!parcelasSelect) return;
    
    if (forma === 'Crédito') { 
        parcelasSelect.style.display = 'block'; 
        atualizarParcelasCartao(); 
    } else { 
        parcelasSelect.style.display = 'none'; 
        parcelasSelect.options.length = 0; 
    }
}

function atualizarParcelasCartao() {
    const forma = document.getElementById('lanc-forma').value;
    if (forma !== 'Crédito') return;

    const valorTotal = parseFloat(document.getElementById('lanc-valor').value) || 0;
    const dataInput = document.getElementById('lanc-data').value;
    const contaId = document.getElementById('lanc-conta').value;
    const parcelasSelect = document.getElementById('lanc-parcelas');
    
    parcelasSelect.options.length = 0;

    if (!dataInput || !contaId || valorTotal <= 0) { 
        parcelasSelect.options.add(new Option('Insira Valor e Data', '1')); 
        return; 
    }
    
    const conta = db.contas.find(c => c.id === contaId);
    if (!conta || conta.tipo !== 'cartao') return;

    let [ano, mes, dia] = dataInput.split('-').map(Number);
    if (dia >= conta.fechamento) { 
        mes += 1; 
        if(mes > 12) { mes = 1; ano += 1; } 
    }
    
    const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    for (let i = 1; i <= 12; i++) {
        let valorParcela = (valorTotal / i).toFixed(2);
        let mesFinal = mes + (i - 1); 
        let anoFinal = ano;
        
        while(mesFinal > 12) { 
            mesFinal -= 12; 
            anoFinal += 1; 
        }
        
        let labelFatura = `${mesesNomes[mesFinal-1]}/${anoFinal.toString().slice(-2)}`;
        parcelasSelect.options.add(new Option(i === 1 ? `1x R$ ${valorParcela} (${labelFatura})` : `${i}x R$ ${valorParcela} (até ${labelFatura})`, i));
    }
}

function verificarDataFutura() {
    const dataInput = document.getElementById('lanc-data').value;
    if(!dataInput) return;
    
    const dtLanc = new Date(dataInput + 'T00:00:00');
    const hoje = new Date(); 
    hoje.setHours(0,0,0,0);
    
    document.getElementById('lanc-efetivado').checked = dtLanc <= hoje;
}

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

    if(!desc || isNaN(valor) || !data || !contaId || !cat) return alert("Preencha todos os dados corretamente.");
    
    const conta = db.contas.find(c => c.id === contaId);
    const parcelasSelect = document.getElementById('lanc-parcelas');
    const qtdParcelas = (forma === 'Crédito' && parcelasSelect.style.display !== 'none') ? parseInt(parcelasSelect.value) || 1 : 1;

    if (qtdParcelas > 1 && forma === 'Crédito') {
        const valorParcela = valor / qtdParcelas;
        let [anoStr, mesStr, diaStr] = data.split('-');
        let dataBase = new Date(anoStr, parseInt(mesStr) - 1, diaStr);
        const groupId = 'grp_' + Date.now();
        
        for (let i = 1; i <= qtdParcelas; i++) {
            let d = new Date(dataBase); 
            d.setMonth(d.getMonth() + (i - 1));
            let dataParcelada = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
            db.lancamentos.push({ 
                id: Date.now() + i, 
                idGrupo: groupId, 
                data: dataParcelada, 
                tipo, 
                contaId, 
                forma, 
                desc: `${desc} (${i}/${qtdParcelas})`, 
                valor: valorParcela, 
                cat, 
                efetivado 
            });
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
            db.recorrencias.push({ 
                id: Date.now() + 1, 
                diaVencimento: parseInt(diaStr), 
                tipo, 
                contaId, 
                forma, 
                desc, 
                valor, 
                cat, 
                ultimoMesGerado: `${anoStr}-${mesStr}` 
            });
        }

        if (['emprestei_cartao', 'emprestei_dinheiro', 'tomei_emprestimo'].includes(tipo)) {
            abrirModalEmprestimo(novoLancamento); 
            save(); 
            if(typeof fecharModalLancamento === 'function') fecharModalLancamento();
            return; 
        }
    }
    
    save(); 
    
    document.getElementById('lanc-desc').value = ""; 
    document.getElementById('lanc-valor').value = ""; 
    document.getElementById('lanc-fixo').checked = false;
    document.getElementById('lanc-data').valueAsDate = new Date(); 
    verificarDataFutura();
    
    if(forma === 'Crédito') atualizarParcelasCartao();
    if(typeof fecharModalLancamento === 'function') fecharModalLancamento();
    if(typeof render === 'function') render();
    verificarNotificacoesMotor();
    
    showToast(qtdParcelas > 1 ? `Compra parcelada em ${qtdParcelas}x!` : "Lançamento Registrado!");
}

function abrirModalEmprestimo(lancamentoBase) { 
    window.ecoTempEmprestimo = lancamentoBase; 
    const modal = document.getElementById('modal-emprestimo'); 
    const isTomada = lancamentoBase.tipo === 'tomei_emprestimo'; 
    document.getElementById('msg-modal-emp').innerText = `Você ${isTomada ? 'tomou emprestado' : 'emprestou'} R$ ${lancamentoBase.valor.toFixed(2)} ("${lancamentoBase.desc}"). Como será o ${isTomada ? 'pagamento' : 'recebimento'}?`; 
    document.getElementById('emp-sem-previsao').checked = false; 
    if(typeof toggleCamposPrevisao === 'function') toggleCamposPrevisao(); 
    modal.style.display = 'flex'; 
    setTimeout(()=>modal.classList.add('active'), 10); 
}

function fecharModalEmprestimo() { 
    window.ecoTempEmprestimo = null; 
    const m = document.getElementById('modal-emprestimo'); 
    if(m) { 
        m.classList.remove('active'); 
        setTimeout(()=>m.style.display = 'none', 300); 
    } 
}

function gerarParcelasEmprestimo() {
    if (!window.ecoTempEmprestimo) return;
    const semPrevisao = document.getElementById('emp-sem-previsao').checked;
    const isTomada = window.ecoTempEmprestimo.tipo === 'tomei_emprestimo';
    let dataAtual = new Date(window.ecoTempEmprestimo.data + 'T00:00:00');

    if (semPrevisao) {
        db.lancamentos.push({ 
            id: Date.now(), 
            data: dataAtual.toISOString().split('T')[0], 
            tipo: isTomada ? 'pag_emprestimo' : 'rec_emprestimo', 
            contaId: window.ecoTempEmprestimo.contaId, 
            forma: window.ecoTempEmprestimo.forma, 
            desc: `${isTomada ? 'Pag.' : 'Rec.'} ${window.ecoTempEmprestimo.desc}`, 
            valor: window.ecoTempEmprestimo.valor, 
            valorOriginal: window.ecoTempEmprestimo.valor, 
            valorAmortizado: 0, 
            cat: 'Terceiros', 
            efetivado: false, 
            rolagem: true 
        });
        showToast("Dívida registrada em rolagem mensal!");
    } else {
        const parcelas = parseInt(document.getElementById('emp-parcelas').value);
        const intervalo = parseInt(document.getElementById('emp-intervalo').value);
        if (parcelas >= 1) {
            const valorParcela = window.ecoTempEmprestimo.valor / parcelas;
            for (let i = 1; i <= parcelas; i++) {
                dataAtual.setDate(dataAtual.getDate() + intervalo);
                db.lancamentos.push({ 
                    id: Date.now() + i, 
                    data: dataAtual.toISOString().split('T')[0], 
                    tipo: isTomada ? 'pag_emprestimo' : 'rec_emprestimo', 
                    contaId: window.ecoTempEmprestimo.contaId, 
                    forma: window.ecoTempEmprestimo.forma, 
                    desc: `${isTomada ? 'Pag.' : 'Rec.'} ${window.ecoTempEmprestimo.desc} (${i}/${parcelas})`, 
                    valor: valorParcela, 
                    cat: 'Terceiros', 
                    efetivado: false, 
                    rolagem: false 
                });
            }
            showToast(`${parcelas} parcelas geradas!`);
        }
    }
    save(); 
    fecharModalEmprestimo(); 
    if(typeof render === 'function') render(); 
    verificarNotificacoesMotor();
}

function confirmarPagamentoParcial() {
    const idInput = document.getElementById('hidden-id-parcial').value;
    const valorPago = parseFloat(document.getElementById('input-valor-parcial').value);
    
    if (!idInput || isNaN(valorPago) || valorPago <= 0) return alert("Insira um valor válido e maior que zero.");
    
    const lOriginal = db.lancamentos.find(l => l.id == idInput); 
    if (!lOriginal) return;
    
    if (valorPago >= lOriginal.valor) { 
        confirmarQuitacao(idInput); 
        if (typeof fecharModalParcial === 'function') fecharModalParcial(); 
        return; 
    }
    
    if (lOriginal.valorOriginal === undefined) lOriginal.valorOriginal = lOriginal.valor;
    if (lOriginal.valorAmortizado === undefined) lOriginal.valorAmortizado = 0;
    
    lOriginal.valorAmortizado += valorPago; 
    lOriginal.valor -= valorPago;
    
    const c = db.contas.find(x => x.id === lOriginal.contaId);
    if (c && c.tipo !== 'cartao') { 
        if (window.ecoTiposReceita.includes(lOriginal.tipo)) c.saldo += valorPago; 
        if (window.ecoTiposDespesa.includes(lOriginal.tipo)) c.saldo -= valorPago; 
    }
    
    db.lancamentos.push({ 
        id: Date.now() + Math.random(), 
        data: new Date().toISOString().split('T')[0], 
        tipo: lOriginal.tipo, 
        contaId: lOriginal.contaId, 
        forma: lOriginal.forma, 
        desc: `[Amortização] ${lOriginal.desc.replace(' (Em Aberto)', '')}`, 
        valor: valorPago, 
        cat: lOriginal.cat, 
        efetivado: true, 
        rolagem: false 
    });
    
    save(); 
    if (typeof fecharModalParcial === 'function') fecharModalParcial(); 
    showToast("Amortização registrada!"); 
    if(typeof render === 'function') render(); 
    verificarNotificacoesMotor();
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
    
    db.lancamentos.push({ 
        id: Date.now() + Math.random(), 
        data: new Date().toISOString().split('T')[0], 
        tipo: lOriginal.tipo, 
        contaId: lOriginal.contaId, 
        forma: lOriginal.forma, 
        desc: `[Quitação] ${lOriginal.desc.replace(' (Em Aberto)', '')}`, 
        valor: valorPago, 
        cat: lOriginal.cat, 
        efetivado: true, 
        rolagem: false 
    });
    
    db.lancamentos = db.lancamentos.filter(l => l.id != id); 
    save(); 
    showToast("Dívida Quitada!"); 
    if(typeof render === 'function') render(); 
    verificarNotificacoesMotor();
}

function confirmarPagamento(id) {
    const l = db.lancamentos.find(x => x.id === id); 
    if(!l) return;
    
    l.efetivado = true; 
    l.desc = l.desc.replace(' (Em Aberto)', '').replace(' (Restante)', '').trim();
    
    const c = db.contas.find(x => x.id === l.contaId);
    if(c && c.tipo !== 'cartao') { 
        if (window.ecoTiposReceita.includes(l.tipo)) c.saldo += l.valor; 
        if (window.ecoTiposDespesa.includes(l.tipo)) c.saldo -= l.valor; 
    }
    
    save(); 
    showToast("Efetivado!"); 
    if(typeof render === 'function') render(); 
    verificarNotificacoesMotor();
}

function excluirLancamento(id) {
    if(!confirm("Apagar lançamento? O saldo será recalculado.")) return;
    
    const lanc = db.lancamentos.find(l => l.id === id); 
    if(!lanc) return;
    
    const c = db.contas.find(x => x.id === lanc.contaId);
    if(c && c.tipo !== 'cartao' && lanc.efetivado) { 
        if (window.ecoTiposReceita.includes(lanc.tipo)) c.saldo -= lanc.valor; 
        if (window.ecoTiposDespesa.includes(lanc.tipo)) c.saldo += lanc.valor; 
    }
    
    db.lancamentos = db.lancamentos.filter(l => l.id !== id); 
    save(); 
    showToast("Apagado!"); 
    if(typeof render === 'function') render(); 
    verificarNotificacoesMotor();
}

function salvarEdicaoLancamento(id) {
    const l = db.lancamentos.find(x => x.id === id);
    const novoValor = parseFloat(document.getElementById(`e-lanc-val-${id}`).value);
    const novaData = document.getElementById(`e-lanc-data-${id}`).value;
    const novaDesc = document.getElementById(`e-lanc-desc-${id}`).value;
    
    if(!novaDesc || isNaN(novoValor) || !novaData) return alert("Preencha todos os dados.");
    
    const c = db.contas.find(x => x.id === l.contaId);
    if(c && c.tipo !== 'cartao' && l.efetivado) { 
        const dif = novoValor - l.valor; 
        if(window.ecoTiposReceita.includes(l.tipo)) c.saldo += dif; 
        if(window.ecoTiposDespesa.includes(l.tipo)) c.saldo -= dif; 
    }
    
    l.valor = novoValor; 
    l.data = novaData; 
    l.desc = novaDesc; 
    
    save(); 
    showToast("Atualizado!"); 
    if(typeof render === 'function') render(); 
    verificarNotificacoesMotor();
}

function amortizarFatura(fatID) {
    const [contaId, mesRef] = fatID.split('-'); 
    const conta = db.contas.find(c => c.id === contaId); 
    if (!conta) return;
    
    let totalFat = 0; 
    db.lancamentos.forEach(l => { 
        if (l.contaId === conta.id && getMesFaturaLogico(l.data, conta.fechamento) === mesRef) {
            totalFat += (window.ecoTiposReceita.includes(l.tipo) ? -l.valor : l.valor); 
        }
    });
    
    const jaAmortizado = (db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0;
    
    document.getElementById('hidden-fat-id').value = fatID;
    const meses = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'};
    
    document.getElementById('txt-fatura-id-parcial').innerText = `${meses[mesRef.split('-')[1]]} / ${mesRef.split('-')[0]}`;
    document.getElementById('txt-valor-fatura-original').innerText = `R$ ${(totalFat - jaAmortizado).toFixed(2)}`;
    
    const modal = document.getElementById('modal-fatura-parcial'); 
    if(modal) { 
        modal.style.display = 'flex'; 
        setTimeout(()=>modal.classList.add('active'), 10); 
    }
}

function fecharModalFaturaParcial() {
    const m = document.getElementById('modal-fatura-parcial'); 
    if(m) { 
        m.classList.remove('active'); 
        setTimeout(()=>m.style.display = 'none', 300); 
        document.getElementById('input-amortizar-fatura').value = ''; 
    }
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
        id: Date.now(), 
        desc: `Amortização Fatura (${meses[mesRef]})`, 
        valor: valorAmortizar, 
        data: new Date().toISOString().split('T')[0], 
        contaId: contaCC.id, 
        cat: 'Outros', 
        tipo: 'despesa', 
        efetivado: true 
    });
    
    save(); 
    fecharModalFaturaParcial(); 
    showToast("Fatura amortizada!"); 
    if(typeof render === 'function') render();
}

function alternarPagamentoFatura(id) {
    const i = db.faturasPagas.indexOf(id); 
    if(i > -1) {
        db.faturasPagas.splice(i,1); 
    } else {
        db.faturasPagas.push(id); 
    }
    save(); 
    showToast("Fatura Atualizada!"); 
    if(typeof render === 'function') render();
}

function processarRolagensPendentes() {
    const hoje = new Date(); 
    const anoAtual = hoje.getFullYear(); 
    const mesAtual = hoje.getMonth() + 1; 
    let atualizouAlgo = false;
    
    db.lancamentos.forEach(l => {
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
    const anoAtual = hoje.getFullYear(); 
    const mesAtual = hoje.getMonth() + 1; 
    let gerouNovo = false;
    
    db.recorrencias.forEach(rec => {
        let [anoUltimo, mesUltimo] = rec.ultimoMesGerado.split('-').map(Number);
        
        while (anoUltimo < anoAtual || (anoUltimo === anoAtual && mesUltimo < mesAtual)) {
            mesUltimo++; 
            if (mesUltimo > 12) { 
                mesUltimo = 1; 
                anoUltimo++; 
            }
            
            const mesStr = mesUltimo.toString().padStart(2, '0');
            const dataLancamento = ajustarDataDia(anoUltimo, mesUltimo, rec.diaVencimento);
            const dtLanc = new Date(dataLancamento + 'T00:00:00');
            const isEfetivado = dtLanc <= hoje;

            const novoL = { 
                id: Date.now() + Math.random(), 
                data: dataLancamento, 
                tipo: rec.tipo, 
                contaId: rec.contaId, 
                forma: rec.forma, 
                desc: rec.desc, 
                valor: rec.valor, 
                cat: rec.cat, 
                efetivado: isEfetivado 
            };
            
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

function toggleCamposCartao() {
    document.getElementById('campos-cartao-add').style.display = document.getElementById('nova-conta-tipo').value === 'cartao' ? 'block' : 'none';
}

function criarConta() {
    const n = document.getElementById('nova-conta-nome').value;
    const t = document.getElementById('nova-conta-tipo').value;
    
    if(!n) return alert("Preencha o nome da conta.");
    
    const nc = {
        id: 'c_' + Date.now(), 
        nome: n, 
        tipo: t, 
        cor: document.getElementById('nova-conta-cor').value, 
        saldo: 0
    };
    
    if(t === 'cartao'){
        nc.limite = parseFloat(document.getElementById('nova-conta-limite').value)||0;
        nc.meta = parseFloat(document.getElementById('nova-conta-meta').value)||0;
        nc.fechamento = parseInt(document.getElementById('nova-conta-fecha').value)||1;
        nc.vencimento = parseInt(document.getElementById('nova-conta-venc').value)||1;
    }
    
    db.contas.push(nc);
    save();
    
    document.getElementById('nova-conta-nome').value = "";
    showToast("Conta Criada!");
    mudarDirecaoLancamento();
    if(typeof toggleNovaContaArea === 'function') toggleNovaContaArea();
    if(typeof render === 'function') render();
}

function excluirConta(id) {
    if(confirm("Excluir conta e todos os lançamentos atrelados?")){
        db.contas = db.contas.filter(c=>c.id!==id);
        db.lancamentos = db.lancamentos.filter(l=>l.contaId!==id);
        save();
        showToast("Conta Excluída!");
        mudarDirecaoLancamento();
        if(typeof render === 'function') render();
    }
}

function toggleEditConta(id) {
    const el = document.getElementById(`edit-conta-${id}`);
    if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function salvarEdicaoConta(id) {
    const c = db.contas.find(x => x.id === id);
    c.nome = document.getElementById(`edit-nome-${id}`).value;
    c.cor = document.getElementById(`edit-cor-${id}`).value;
    
    if(c.tipo === 'cartao'){
        c.limite = parseFloat(document.getElementById(`edit-limite-${id}`).value) || 0;
        c.meta = parseFloat(document.getElementById(`edit-meta-${id}`).value) || 0;
        c.fechamento = parseInt(document.getElementById(`edit-fecha-${id}`).value) || 1;
        c.vencimento = parseInt(document.getElementById(`edit-venc-${id}`).value) || 1;
    } else {
        c.saldo = parseFloat(document.getElementById(`edit-saldo-${id}`).value) || 0;
    }
    
    save();
    showToast("Atualizada!");
    mudarDirecaoLancamento();
    if(typeof render === 'function') render();
}

window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lanc-direcao')) mudarDirecaoLancamento();
    processarRolagensPendentes();
    processarRecorrencias();
    setTimeout(() => { verificarNotificacoesMotor(); }, 500);
});

setTimeout(() => {
    if (document.getElementById('lanc-tipo') && document.getElementById('lanc-tipo').options.length === 0) {
        mudarDirecaoLancamento();
    }
}, 300);
