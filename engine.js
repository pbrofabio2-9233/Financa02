// ==========================================
// ENGINE.JS - Lógica de Negócios, Gráficos e Cálculos (Otimizado)
// ==========================================

window.ecoTiposReceita = ['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca', 'receita', 'emp_pessoal', 'compensacao'];
window.ecoTiposDespesa = ['despesas_gerais', 'emprestei_dinheiro', 'pag_emprestimo', 'dep_poupanca', 'emprestei_cartao', 'despesa', 'emp_concedido', 'emp_cartao'];

window.T_RECEITAS_APP = window.ecoTiposReceita;
window.T_DESPESAS_APP = window.ecoTiposDespesa;

window.ecoTempEmprestimo = null;
window.cartaoAtivoFatura = null; 
window.meuGrafico = null;
window.meuGraficoEvolucao = null;

function showToast(mensagem, tipo = 'sucesso') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    let corFundo = '#10b981'; let icone = 'fa-check-circle';
    
    if (tipo === 'exclusao') { corFundo = '#ef4444'; icone = 'fa-trash-alt'; } 
    else if (tipo === 'ajuste') { corFundo = '#3b82f6'; icone = 'fa-info-circle'; }

    toast.style.cssText = `background: ${corFundo}; color: #fff; padding: 12px 24px; border-radius: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 10px; opacity: 0; transform: translateY(-20px); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin-bottom: 10px;`;
    toast.innerHTML = `<i class="fas ${icone}" style="font-size:16px;"></i> ${mensagem}`;
    
    container.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 99999; display: flex; flex-direction: column; align-items: center;';
    container.appendChild(toast);

    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-20px)'; setTimeout(() => toast.remove(), 400); }, 3000);
}

window.exportarExtratoCSV = function() {
    const mesFiltro = document.getElementById('filtro-mes') ? document.getElementById('filtro-mes').value : new Date().toISOString().substring(0,7);
    let exportData = (db.lancamentos || []).filter(l => l.data && l.data.substring(0,7) === mesFiltro);
    
    if (exportData.length === 0) return alert("Nenhum dado para exportar neste mês.");
    exportData.sort((a,b) => new Date(a.data) - new Date(b.data));

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data;Descrição;Categoria;Conta/Cartão;Direção;Status;Valor\n";

    exportData.forEach(l => {
        const c = (db.contas || []).find(x => x.id === l.contaId);
        const nomeConta = c ? c.nome : 'Excluída';
        const direcao = window.ecoTiposReceita.includes(l.tipo) ? 'Receita' : 'Despesa';
        const status = l.efetivado ? 'Efetivado' : 'Pendente';
        const dataPT = l.data.split('-').reverse().join('/');
        const valorLimpo = parseFloat(l.valor) || 0;
        const valorBR = valorLimpo.toFixed(2).replace('.', ',');
        
        csvContent += `${dataPT};"${l.desc}";"${l.cat}";"${nomeConta}";${direcao};${status};${valorBR}\n`;
    });

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `EcoFinance_Relatorio_${mesFiltro}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Relatório exportado para o Excel!");
}

window.verificarNotificacoesMotor = function() {
    const listaNotif = document.getElementById('lista-notificacoes');
    const badge = document.getElementById('badge-notificacao');
    if(!listaNotif || !badge) return;

    let htmlNotificacoes = '';
    let contadorUnread = 0;
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const dataHojeIso = hoje.toISOString().split('T')[0];

    (db.salarios || []).forEach(sal => {
        if (sal.dias && sal.dias.includes(diaHoje)) {
            const valorParcela = (parseFloat(sal.valorTotal) || 0) / sal.dias.length;
            const descEsperada = `${sal.nome} (${sal.frequencia})`;
            const jaLancado = db.lancamentos.find(l => l.data === dataHojeIso && l.desc === descEsperada && Math.abs((parseFloat(l.valor)||0) - valorParcela) < 0.01);

            if (!jaLancado) {
                contadorUnread++;
                htmlNotificacoes += `
                <div class="notif-card unread" style="background: var(--input-bg); border: 1px solid var(--esmeralda); padding: 12px; border-radius: 10px; margin-bottom: 10px;">
                    <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                        <strong style="font-size: 13px; color: var(--texto-main);">💰 ${sal.nome}</strong>
                        <small style="color: var(--esmeralda); font-size: 10px; font-weight: bold;">Hoje</small>
                    </div>
                    <p style="font-size: 12px; color: var(--texto-sec); margin-bottom: 12px;">O valor de <strong>R$ ${valorParcela.toFixed(2)}</strong> estava programado para hoje.</p>
                    <button class="btn-primary" style="width: 100%; font-size: 12px; padding: 10px; background: var(--esmeralda);" onclick="confirmarSalarioMotor('${sal.nome}', ${valorParcela}, '${sal.contaId}', '${sal.frequencia}')">Confirmar Recebimento</button>
                </div>`;
            }
        }
    });

    hoje.setHours(0,0,0,0);
    (db.lancamentos || []).forEach(l => {
        const conta = (db.contas || []).find(c => c.id === l.contaId);
        if (conta && conta.tipo === 'cartao') return; 
        
        if (l.data && !l.efetivado && window.ecoTiposDespesa.includes(l.tipo)) {
            const d = new Date(l.data + 'T00:00:00');
            const diasFaltando = Math.ceil((d - hoje) / 86400000);
            
            if (diasFaltando <= 3) {
                contadorUnread++;
                let statusAviso = diasFaltando < 0 ? '🚨 Atrasado' : (diasFaltando === 0 ? '⚠️ Vence Hoje' : `⚠️ Vence em ${diasFaltando} dias`);
                htmlNotificacoes += `
                <div class="notif-card" style="background: var(--input-bg); border: 1px solid ${diasFaltando < 0 ? 'var(--perigo)' : 'var(--alerta)'}; padding: 12px; border-radius: 10px; margin-bottom: 10px;">
                    <strong style="font-size: 13px; color: var(--texto-main); display:block; margin-bottom: 8px;">${statusAviso}</strong>
                    <p style="font-size: 12px; color: var(--texto-sec); margin-bottom: 12px;">A despesa <strong>${l.desc}</strong> (R$ ${(parseFloat(l.valor)||0).toFixed(2)}) precisa da sua atenção.</p>
                    <button class="btn-primary" style="width: 100%; font-size: 11px; padding: 8px;" onclick="confirmarPagamento(${l.id}); verificarNotificacoesMotor();">Pagar Agora</button>
                </div>`;
            }
        }
    });

    if(htmlNotificacoes === '') {
        htmlNotificacoes = '<div style="text-align:center; padding: 20px; color: var(--texto-sec); font-size: 12px;"><i class="fas fa-check-circle" style="font-size: 24px; color: var(--esmeralda); margin-bottom: 10px; display:block;"></i>Tudo em dia! Nenhuma pendência para hoje.</div>';
    }

    listaNotif.innerHTML = htmlNotificacoes;
    if (contadorUnread > 0) { badge.style.display = 'flex'; badge.innerText = contadorUnread; } 
    else { badge.style.display = 'none'; }
}

window.obterMesFaturaAviso = function(dataLancamento, diaFechamento) {
    if (!dataLancamento) return ""; 
    const [anoStr, mesStr, diaStr] = dataLancamento.split('T')[0].split('-'); 
    let ano = parseInt(anoStr, 10); let mes = parseInt(mesStr, 10); let dia = parseInt(diaStr, 10); 
    let diaFech = parseInt(diaFechamento, 10) || 1; 
    
    if (dia >= diaFech) { mes += 1; if (mes > 12) { mes = 1; ano += 1; } } 
    return `${ano}-${mes.toString().padStart(2, '0')}`;
}

window.confirmarSalarioMotor = function(nome, valor, contaId, freq) {
    const hojeIso = new Date().toISOString().split('T')[0];
    db.lancamentos.push({ id: Date.now(), data: hojeIso, tipo: 'receita', contaId: contaId, forma: 'Pix', desc: `${nome} (${freq})`, valor: valor, cat: 'Salário', efetivado: true });
    const c = db.contas.find(x => x.id === contaId);
    if(c) c.saldo += valor;
    save(); showToast(`${nome} recebido com sucesso!`);
    if(typeof render === 'function') render();
    verificarNotificacoesMotor();
}

window.renderGrafico = function() {
    const ctx = document.getElementById('graficoCategorias');
    if(!ctx) return;
    
    if(window.meuGrafico) window.meuGrafico.destroy();
    
    const mesFiltro = document.getElementById('filtro-mes') ? document.getElementById('filtro-mes').value : new Date().toISOString().substring(0,7);
    let totaisPorCat = {};
    let temDados = false;

    (db.lancamentos || []).forEach(l => {
        let valorLimpo = parseFloat(l.valor);
        if (isNaN(valorLimpo) || valorLimpo <= 0) return; 

        const conta = (db.contas || []).find(c => c.id === l.contaId);
        let mesRef = l.data ? l.data.substring(0,7) : '';
        
        if (conta && conta.tipo === 'cartao') {
            mesRef = window.obterMesFaturaAviso(l.data, conta.fechamento || 1);
        }

        if (mesRef === mesFiltro && window.ecoTiposDespesa.includes(l.tipo) && !['emprestei_cartao', 'emp_cartao', 'dep_poupanca'].includes(l.tipo)) {
            const catName = l.cat || 'Outros';
            totaisPorCat[catName] = (totaisPorCat[catName] || 0) + valorLimpo;
            temDados = true;
        }
    });

    if(!temDados) {
        ctx.parentNode.style.display = 'flex';
        ctx.parentNode.style.justifyContent = 'center';
        ctx.parentNode.style.alignItems = 'center';
        ctx.parentNode.innerHTML = '<span class="texto-vazio">Sem despesas este mês.</span>';
        return;
    }

    const isDark = document.body.classList.contains('dark-mode') || document.body.classList.contains('ocean-mode');
    const colorText = isDark ? '#f8fafc' : '#0f172a';

    const labels = Object.keys(totaisPorCat);
    const dataVals = Object.values(totaisPorCat);
    
    const bgColors = labels.map(nome => {
        const cDB = (db.categorias || []).find(c => c.nome === nome);
        return cDB ? cDB.cor : '#94a3b8';
    });

    window.meuGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: dataVals, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 4 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { color: colorText, font: { family: 'Inter', size: 11, weight: '500' }, boxWidth: 12, padding: 15 } },
                tooltip: { callbacks: { label: function(context) { return ' R$ ' + context.raw.toFixed(2).replace('.', ','); } } },
                datalabels: {
                    color: '#fff',
                    font: { family: 'Inter', weight: 'bold', size: 10 },
                    formatter: function(value) {
                        return 'R$ ' + value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    },
                    display: function(context) {
                        return context.dataset.data[context.dataIndex] > 0;
                    }
                }
            }
        }
    });
};

window.renderGraficoEvolucao = function() {
    const ctx = document.getElementById('graficoEvolucao');
    if(!ctx) return;
    
    if(window.meuGraficoEvolucao) window.meuGraficoEvolucao.destroy();
    
    const isDark = document.body.classList.contains('dark-mode') || document.body.classList.contains('ocean-mode');
    const colorText = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const selectAno = document.getElementById('filtro-ano-grafico');
    let anoAtual = new Date().getFullYear(); 
    
    if (selectAno) {
        if (selectAno.options.length === 0) {
            let anos = new Set();
            anos.add(anoAtual);
            (db.lancamentos || []).forEach(l => { if(l.data) anos.add(parseInt(l.data.split('-')[0])); });
            Array.from(anos).sort((a,b)=>b-a).forEach(a => selectAno.options.add(new Option(a, a)));
            selectAno.value = anoAtual;
        } else {
            anoAtual = parseInt(selectAno.value) || anoAtual;
        }
    }

    let mesesLabels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    let dadosRec = new Array(12).fill(0);
    let dadosDesp = new Array(12).fill(0);

    (db.lancamentos || []).forEach(l => {
        let valorLimpo = parseFloat(l.valor);
        if (isNaN(valorLimpo) || !l.data) return;
        
        const conta = (db.contas || []).find(c => c.id === l.contaId);
        let mesRef = l.data.substring(0,7);
        
        if (conta && conta.tipo === 'cartao') {
            mesRef = window.obterMesFaturaAviso(l.data, conta.fechamento || 1);
        }

        const [a, m] = mesRef.split('-').map(Number);
        if (a === anoAtual) {
            if (window.ecoTiposReceita.includes(l.tipo)) dadosRec[m - 1] += valorLimpo;
            else if (window.ecoTiposDespesa.includes(l.tipo) && !['emprestei_cartao', 'emp_cartao'].includes(l.tipo)) dadosDesp[m - 1] += valorLimpo;
        }
    });

    window.meuGraficoEvolucao = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mesesLabels,
            datasets: [
                { label: 'Receitas', data: dadosRec, backgroundColor: '#10b981', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.8 },
                { label: 'Despesas', data: dadosDesp, backgroundColor: '#ef4444', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.8 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { grid: { display: false }, ticks: { color: colorText, font: { family: 'Inter', size: 10 } } },
                y: { grid: { color: gridColor }, border: { display: false }, ticks: { color: colorText, font: { family: 'Inter', size: 10 }, callback: function(value) { return 'R$ ' + (value >= 1000 ? (value/1000).toFixed(1) + 'k' : value); } } }
            },
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, color: colorText, font: { family: 'Inter', size: 11 } } },
                tooltip: { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', titleColor: isDark ? '#fff' : '#000', bodyColor: isDark ? '#fff' : '#000', borderColor: isDark ? '#334155' : '#cbd5e1', borderWidth: 1, padding: 10, callbacks: { label: function(context) { return context.dataset.label + ': R$ ' + context.raw.toFixed(2).replace('.', ','); } } },
                datalabels: { display: false }
            }
        }
    });
};

function mudarDirecaoLancamento() {
    const direcaoSelect = document.getElementById('lanc-direcao');
    const tipoSelect = document.getElementById('lanc-tipo');
    if(!direcaoSelect || !tipoSelect) return;
    
    const direcao = direcaoSelect.value;
    tipoSelect.options.length = 0; 
    
    let listaTipos = direcao === 'despesa' 
        ? [ { val: 'despesas_gerais', txt: 'Despesas Gerais' }, { val: 'emprestei_cartao', txt: 'Emprestei Cartão' }, { val: 'emprestei_dinheiro', txt: 'Emprestei Dinheiro' }, { val: 'pag_emprestimo', txt: 'Pagamento Empréstimo' }, { val: 'dep_poupanca', txt: 'Depósito Poupança' } ]
        : [ { val: 'salario', txt: 'Salário' }, { val: 'tomei_emprestimo', txt: 'Tomei Empréstimo' }, { val: 'rec_emprestimo', txt: 'Recebimento Empréstimo' }, { val: 'outras_receitas', txt: 'Outras Receitas' }, { val: 'estorno', txt: 'Estorno' }, { val: 'saque_poupanca', txt: 'Saque Poupança' } ];

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
    if (listaCategorias.length === 0) listaCategorias.push({ val: 'Outros', txt: '⚙️ Outros' });

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

    catInputHidden.value = listaCategorias.length > 0 ? listaCategorias[0].val : '';
    boxFixo.disabled = !(tipo === 'despesas_gerais' || tipo === 'salario'); 
    if(boxFixo.disabled) boxFixo.checked = false;

    let temConta = false;
    if (db.contas) {
        db.contas.forEach(c => {
            let mostrar = false;
            if (tipo === 'despesas_gerais' && (c.tipo === 'movimentacao' || c.tipo === 'cartao')) mostrar = true;
            else if (tipo === 'emprestei_cartao' && c.tipo === 'cartao') mostrar = true;
            else if (['emprestei_dinheiro', 'pag_emprestimo'].includes(tipo) && c.tipo === 'movimentacao') mostrar = true;
            else if (['dep_poupanca', 'saque_poupanca'].includes(tipo) && c.tipo === 'investimento') mostrar = true;
            else if (['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas'].includes(tipo) && c.tipo !== 'cartao') mostrar = true;
            else if (tipo === 'estorno') mostrar = true; 
            
            if (mostrar) { contaSelect.options.add(new Option(`${c.tipo === 'cartao' ? '💳' : (c.tipo === 'investimento' ? '📈' : '🏦')} ${c.nome}`, c.id)); temConta = true; }
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
    if (contaAtiva.tipo === 'cartao') { listaFormas = [{ val: 'Crédito', txt: '💳 Crédito' }]; } 
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

    const valorTotal = window.parseMoeda ? window.parseMoeda('lanc-valor') : parseFloat(document.getElementById('lanc-valor').value.replace(/\./g, '').replace(',', '.')) || 0;
    const dataInput = document.getElementById('lanc-data').value;
    const contaId = document.getElementById('lanc-conta').value;
    const parcelasSelect = document.getElementById('lanc-parcelas');
    
    parcelasSelect.options.length = 0;

    if (!dataInput || !contaId || valorTotal <= 0) { parcelasSelect.options.add(new Option('Insira Valor e Data', '1')); return; }
    
    const conta = db.contas.find(c => c.id === contaId);
    if (!conta || conta.tipo !== 'cartao') return;

    let [ano, mes, dia] = dataInput.split('-').map(Number);
    if (dia >= (conta.fechamento||1)) { mes += 1; if(mes > 12) { mes = 1; ano += 1; } }
    
    const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    for (let i = 1; i <= 12; i++) {
        let valorParcela = (valorTotal / i).toFixed(2);
        let mesFinal = mes + (i - 1); 
        let anoFinal = ano;
        while(mesFinal > 12) { mesFinal -= 12; anoFinal += 1; }
        
        let labelFatura = `${mesesNomes[mesFinal-1]}/${anoFinal.toString().slice(-2)}`;
        parcelasSelect.options.add(new Option(i === 1 ? `1x R$ ${valorParcela.replace('.',',')} (${labelFatura})` : `${i}x R$ ${valorParcela.replace('.',',')} (até ${labelFatura})`, i));
    }
}

function verificarDataFutura() {
    const dataInput = document.getElementById('lanc-data').value;
    if(!dataInput) return;
    const dtLanc = new Date(dataInput + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    document.getElementById('lanc-efetivado').checked = dtLanc <= hoje;
}

window.adicionarLancamento = function() {
    const data = document.getElementById('lanc-data').value; 
    const tipo = document.getElementById('lanc-tipo').value;
    const contaId = document.getElementById('lanc-conta').value; 
    const desc = document.getElementById('lanc-desc').value;
    const valor = window.parseMoeda ? window.parseMoeda('lanc-valor') : parseFloat(document.getElementById('lanc-valor').value.replace(/\./g, '').replace(',', '.')) || 0; 
    const cat = document.getElementById('lanc-cat').value;
    const isFixo = document.getElementById('lanc-fixo').checked; 
    const efetivado = document.getElementById('lanc-efetivado').checked; 
    const forma = document.getElementById('lanc-forma').value;

    if(!desc || valor <= 0 || !data || !contaId || !cat) return alert("Preencha todos os dados corretamente.");
    
    const conta = db.contas.find(c => c.id === contaId);
    const parcelasSelect = document.getElementById('lanc-parcelas');
    const qtdParcelas = (forma === 'Crédito' && parcelasSelect.style.display !== 'none') ? parseInt(parcelasSelect.value) || 1 : 1;

    if (qtdParcelas > 1 && forma === 'Crédito') {
        const valorParcela = valor / qtdParcelas;
        let [anoStr, mesStr, diaStr] = data.split('-');
        let dataBase = new Date(anoStr, parseInt(mesStr) - 1, diaStr);
        const groupId = 'grp_' + Date.now();
        
        if(!db.contratos) db.contratos = [];
        db.contratos.push({ id: groupId, tipo: 'parc', desc, valor: valorParcela, dia: parseInt(diaStr), categoria: cat, conta: contaId, atual: 1, total: qtdParcelas });
        
        for (let i = 1; i <= qtdParcelas; i++) {
            let d = new Date(dataBase); 
            d.setMonth(d.getMonth() + (i - 1));
            let dataParcelada = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
            db.lancamentos.push({ id: Date.now() + i, idGrupo: groupId, data: dataParcelada, tipo, contaId, forma, desc: `${desc} (${i}/${qtdParcelas})`, valor: valorParcela, cat, efetivado: (i===1 ? efetivado : false) });
        }
    } else {
        if (conta && conta.tipo !== 'cartao' && efetivado) {
            if (window.ecoTiposReceita.includes(tipo)) conta.saldo += valor;
            if (window.ecoTiposDespesa.includes(tipo)) conta.saldo -= valor;
        }
        
        const novoLancamento = { id: Date.now(), data, tipo, contaId, forma, desc, valor, cat, efetivado, fixo: isFixo };
        
        if (isFixo && !document.getElementById('lanc-fixo').disabled) {
            const [anoStr, mesStr, diaStr] = data.split('-');
            const newIdFixa = 'fixa_' + Date.now();
            if(!db.contratos) db.contratos = [];
            db.contratos.push({ id: newIdFixa, tipo: 'fixa', desc, valor, dia: parseInt(diaStr), categoria: cat, conta: contaId });
            
            novoLancamento.idRecorrencia = newIdFixa; // Amarração
            db.lancamentos.push(novoLancamento); // Lança o primeiro mês

            // Projeta os 11 meses seguintes automaticamente
            let anoBase = parseInt(anoStr);
            let mesBase = parseInt(mesStr);
            for(let i = 1; i <= 11; i++) {
                let mesFuturo = mesBase + i;
                let anoFuturo = anoBase;
                while(mesFuturo > 12) { mesFuturo -= 12; anoFuturo += 1; }
                
                let d = new Date(anoFuturo, mesFuturo - 1, parseInt(diaStr));
                if (d.getMonth() + 1 !== mesFuturo) d = new Date(anoFuturo, mesFuturo, 0); 
                
                let dataForm = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
                
                db.lancamentos.push({ 
                    id: Date.now() + i + Math.floor(Math.random()*1000), 
                    idRecorrencia: newIdFixa, 
                    data: dataForm, 
                    tipo: tipo, 
                    contaId: contaId, 
                    forma: forma, 
                    desc: desc, 
                    valor: valor, 
                    cat: cat, 
                    efetivado: false,
                    fixo: true 
                });
            }
        } else {
            db.lancamentos.push(novoLancamento); // Lança normal
        }

        if (['emprestei_cartao', 'emprestei_dinheiro', 'tomei_emprestimo'].includes(tipo)) {
            abrirModalEmprestimo(novoLancamento); save(); 
            if(typeof fecharModalLancamento === 'function') fecharModalLancamento();
            return; 
        }
    }
    
    save(); 
    document.getElementById('lanc-desc').value = ""; document.getElementById('lanc-valor').value = ""; document.getElementById('lanc-fixo').checked = false; document.getElementById('lanc-data').valueAsDate = new Date(); 
    verificarDataFutura();
    if(forma === 'Crédito') atualizarParcelasCartao();
    if(typeof fecharModalLancamento === 'function') fecharModalLancamento();
    if(typeof render === 'function') render();
    verificarNotificacoesMotor();
    showToast(qtdParcelas > 1 ? `Compra parcelada em ${qtdParcelas}x!` : "Lançamento Registrado!", "sucesso");
}

window.abrirModalEmprestimo = function(lancamentoBase) { window.ecoTempEmprestimo = lancamentoBase; const modal = document.getElementById('modal-emprestimo'); const isTomada = lancamentoBase.tipo === 'tomei_emprestimo'; document.getElementById('msg-modal-emp').innerText = `Você ${isTomada ? 'tomou emprestado' : 'emprestou'} R$ ${lancamentoBase.valor.toFixed(2)} ("${lancamentoBase.desc}"). Como será o ${isTomada ? 'pagamento' : 'recebimento'}?`; document.getElementById('emp-sem-previsao').checked = false; if(typeof toggleCamposPrevisao === 'function') toggleCamposPrevisao(); modal.style.display = 'flex'; setTimeout(()=>modal.classList.add('active'), 10); }
window.fecharModalEmprestimo = function() { window.ecoTempEmprestimo = null; const m = document.getElementById('modal-emprestimo'); if(m) { m.classList.remove('active'); setTimeout(()=>m.style.display = 'none', 300); } }

window.gerarParcelasEmprestimo = function() {
    if (!window.ecoTempEmprestimo) return;
    const semPrevisao = document.getElementById('emp-sem-previsao').checked;
    const isTomada = window.ecoTempEmprestimo.tipo === 'tomei_emprestimo';
    let dataAtual = new Date(window.ecoTempEmprestimo.data + 'T00:00:00');

    if (semPrevisao) {
        db.lancamentos.push({ id: Date.now(), data: dataAtual.toISOString().split('T')[0], tipo: isTomada ? 'pag_emprestimo' : 'rec_emprestimo', contaId: window.ecoTempEmprestimo.contaId, forma: window.ecoTempEmprestimo.forma, desc: `${isTomada ? 'Pag.' : 'Rec.'} ${window.ecoTempEmprestimo.desc}`, valor: window.ecoTempEmprestimo.valor, valorOriginal: window.ecoTempEmprestimo.valor, valorAmortizado: 0, cat: 'Terceiros', efetivado: false, rolagem: true });
        showToast("Dívida registrada em rolagem mensal!", "ajuste");
    } else {
        const parcelas = parseInt(document.getElementById('emp-parcelas').value);
        const intervalo = parseInt(document.getElementById('emp-intervalo').value);
        if (parcelas >= 1) {
            const valorParcela = window.ecoTempEmprestimo.valor / parcelas;
            for (let i = 1; i <= parcelas; i++) {
                dataAtual.setDate(dataAtual.getDate() + intervalo);
                db.lancamentos.push({ id: Date.now() + i, data: dataAtual.toISOString().split('T')[0], tipo: isTomada ? 'pag_emprestimo' : 'rec_emprestimo', contaId: window.ecoTempEmprestimo.contaId, forma: window.ecoTempEmprestimo.forma, desc: `${isTomada ? 'Pag.' : 'Rec.'} ${window.ecoTempEmprestimo.desc} (${i}/${parcelas})`, valor: valorParcela, cat: 'Terceiros', efetivado: false, rolagem: false });
            }
            showToast(`${parcelas} parcelas geradas!`, "sucesso");
        }
    }
    save(); fecharModalEmprestimo(); 
    if(typeof render === 'function') render(); verificarNotificacoesMotor();
}

window.confirmarPagamentoParcial = function() {
    const idInput = document.getElementById('hidden-id-parcial').value;
    const valorPago = window.parseMoeda ? window.parseMoeda('input-valor-parcial') : parseFloat(document.getElementById('input-valor-parcial').value.replace(/\./g, '').replace(',', '.'));
    
    if (!idInput || valorPago <= 0) return alert("Insira um valor válido e maior que zero.");
    const lOriginal = db.lancamentos.find(l => l.id == idInput); if (!lOriginal) return;
    
    if (valorPago >= lOriginal.valor) { confirmarQuitacao(idInput); if (typeof fecharModalParcial === 'function') fecharModalParcial(); return; }
    
    if (lOriginal.valorOriginal === undefined) lOriginal.valorOriginal = lOriginal.valor;
    if (lOriginal.valorAmortizado === undefined) lOriginal.valorAmortizado = 0;
    
    lOriginal.valorAmortizado += valorPago; 
    lOriginal.valor -= valorPago;
    
    const c = db.contas.find(x => x.id === lOriginal.contaId);
    if (c && c.tipo !== 'cartao') { 
        if (window.ecoTiposReceita.includes(lOriginal.tipo)) c.saldo += valorPago; 
        if (window.ecoTiposDespesa.includes(lOriginal.tipo)) c.saldo -= valorPago; 
    }
    
    db.lancamentos.push({ id: Date.now() + Math.random(), data: new Date().toISOString().split('T')[0], tipo: lOriginal.tipo, contaId: lOriginal.contaId, forma: lOriginal.forma, desc: `[Amortização] ${lOriginal.desc.replace(' (Em Aberto)', '')}`, valor: valorPago, cat: lOriginal.cat, efetivado: true, rolagem: false });
    
    save(); if (typeof fecharModalParcial === 'function') fecharModalParcial(); 
    showToast("Amortização registrada!", "ajuste"); 
    if(typeof render === 'function') render(); verificarNotificacoesMotor();
}

window.confirmarQuitacao = function(id) {
    const lOriginal = db.lancamentos.find(l => l.id == id); if (!lOriginal) return;
    const valorPago = parseFloat(lOriginal.valor) || 0;
    const c = db.contas.find(x => x.id === lOriginal.contaId);
    
    if (c && c.tipo !== 'cartao') { 
        if (window.ecoTiposReceita.includes(lOriginal.tipo)) c.saldo += valorPago; 
        if (window.ecoTiposDespesa.includes(lOriginal.tipo)) c.saldo -= valorPago; 
    }
    
    db.lancamentos.push({ id: Date.now() + Math.random(), data: new Date().toISOString().split('T')[0], tipo: lOriginal.tipo, contaId: lOriginal.contaId, forma: lOriginal.forma, desc: `[Quitação] ${lOriginal.desc.replace(' (Em Aberto)', '')}`, valor: valorPago, cat: lOriginal.cat, efetivado: true, rolagem: false });
    db.lancamentos = db.lancamentos.filter(l => l.id != id); 
    
    save(); showToast("Dívida Quitada!", "sucesso"); 
    if(typeof render === 'function') render(); verificarNotificacoesMotor();
}

window.confirmarPagamento = function(id) {
    const l = db.lancamentos.find(x => x.id === id); if(!l) return;
    
    l.efetivado = true; 
    l.desc = l.desc.replace(' (Em Aberto)', '').replace(' (Restante)', '').trim();
    
    const c = db.contas.find(x => x.id === l.contaId);
    if(c && c.tipo !== 'cartao') { 
        if (window.ecoTiposReceita.includes(l.tipo)) c.saldo += parseFloat(l.valor)||0; 
        if (window.ecoTiposDespesa.includes(l.tipo)) c.saldo -= parseFloat(l.valor)||0; 
    }
    
    save(); showToast("Efetivado!", "sucesso"); 
    if(typeof render === 'function') render(); verificarNotificacoesMotor();
}

window.confirmarPagamentoFaturaBanco = function() {
    const fatID = document.getElementById('hidden-pagar-fat-id').value;
    const valorTotalFatura = parseFloat(document.getElementById('hidden-pagar-fat-val').value);
    const contaSelecionadaId = document.getElementById('select-conta-pagar-fat').value;

    if (!contaSelecionadaId) return alert("Selecione uma conta bancária para debitar o valor.");

    const contaDebito = db.contas.find(c => c.id === contaSelecionadaId);
    if (!contaDebito) return;

    contaDebito.saldo -= valorTotalFatura;

    const [contaCartaoId, mesRef] = fatID.split('-');
    const contaCartao = db.contas.find(c => c.id === contaCartaoId);
    const meses = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'};
    
    db.lancamentos.push({ id: Date.now(), desc: `Pagamento Fatura ${contaCartao.nome} (${meses[mesRef.split('-')[1]]}/${mesRef.split('-')[0]})`, valor: valorTotalFatura, data: new Date().toISOString().split('T')[0], contaId: contaDebito.id, cat: 'Outros', tipo: 'despesas_gerais', forma: 'Pix', efetivado: true });

    if (!db.faturasPagas) db.faturasPagas = [];
    db.faturasPagas.push(fatID);
    save();

    if(typeof fecharModalPagamentoFatura === 'function') fecharModalPagamentoFatura();
    showToast("Fatura paga e debitada da conta!", "sucesso");
    if(typeof render === 'function') render();
};

window.amortizarFatura = function(fatID) {
    const [contaId, mesRef] = fatID.split('-'); const conta = db.contas.find(c => c.id === contaId); if (!conta) return;
    
    let totalFat = 0; 
    db.lancamentos.forEach(l => { 
        if (l.contaId === conta.id && window.obterMesFaturaAviso(l.data, conta.fechamento || 1) === mesRef) {
            totalFat += (window.ecoTiposReceita.includes(l.tipo) ? -(parseFloat(l.valor)||0) : parseFloat(l.valor)||0); 
        }
    });
    
    const jaAmortizado = (db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0;
    
    document.getElementById('hidden-fat-id').value = fatID;
    const meses = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'};
    
    document.getElementById('txt-fatura-id-parcial').innerText = `${meses[mesRef.split('-')[1]]} / ${mesRef.split('-')[0]}`;
    document.getElementById('txt-valor-fatura-original').innerText = `R$ ${(totalFat - jaAmortizado).toFixed(2)}`;
    
    const modal = document.getElementById('modal-fatura-parcial'); 
    if(modal) { modal.style.display = 'flex'; setTimeout(()=>modal.classList.add('active'), 10); }
}

window.confirmarAmortizacaoFatura = function() {
    const fatID = document.getElementById('hidden-fat-id').value;
    const valorAmortizar = window.parseMoeda ? window.parseMoeda('input-amortizar-fatura') : parseFloat(document.getElementById('input-amortizar-fatura').value.replace(/\./g, '').replace(',', '.'));
    
    if (valorAmortizar <= 0) return alert("Valor inválido.");
    const contaCC = db.contas.find(c => c.tipo === 'movimentacao');
    if (!contaCC) return alert("Crie uma Conta Corrente para usar o dinheiro da Amortização.");
    
    if (!db.amortizacoesFaturas) db.amortizacoesFaturas = {};
    db.amortizacoesFaturas[fatID] = (db.amortizacoesFaturas[fatID] || 0) + valorAmortizar;
    
    contaCC.saldo -= valorAmortizar;
    const mesRef = fatID.split('-')[1]; 
    const meses = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'};
    
    db.lancamentos.push({ id: Date.now(), desc: `Amortização Fatura (${meses[mesRef]})`, valor: valorAmortizar, data: new Date().toISOString().split('T')[0], contaId: contaCC.id, cat: 'Outros', tipo: 'despesa', efetivado: true });
    
    save(); if(typeof fecharModalFaturaParcial === 'function') fecharModalFaturaParcial(); showToast("Fatura amortizada!", "ajuste"); 
    if(typeof render === 'function') render();
}

window.processarRolagensPendentes = function() {
    if (!db || !db.lancamentos) return;
    const hoje = new Date(); const anoAtual = hoje.getFullYear(); const mesAtual = hoje.getMonth() + 1; let atualizouAlgo = false;
    
    db.lancamentos.forEach(l => {
        if (l.data && l.rolagem && !l.efetivado) {
            let [anoLanc, mesLanc, diaLanc] = l.data.split('-').map(Number);
            if (anoLanc < anoAtual || (anoLanc === anoAtual && mesLanc < mesAtual)) { 
                const dReal = diaLanc > new Date(anoAtual, mesAtual, 0).getDate() ? new Date(anoAtual, mesAtual, 0).getDate() : diaLanc;
                l.data = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-${dReal.toString().padStart(2, '0')}`; 
                atualizouAlgo = true; 
            }
        }
    });
    if (atualizouAlgo) save();
}

window.excluirLancamento = function(id) {
    const lanc = (db.lancamentos || []).find(l => String(l.id) === String(id)); 
    if(!lanc) return;

    if (lanc.idGrupo) {
        if(confirm("📦 Este item faz parte de um parcelamento.\n\nDeseja apagar TODAS as parcelas pendentes desta compra de uma só vez?")) {
            db.lancamentos = db.lancamentos.filter(l => {
                if (String(l.idGrupo) === String(lanc.idGrupo) && !l.efetivado) return false;
                if (String(l.id) === String(id)) return false; 
                return true;
            });
            if (db.contratos) db.contratos = db.contratos.filter(c => String(c.id) !== String(lanc.idGrupo));
            save(); showToast("Parcelamento completo apagado!", "exclusao"); 
            if(typeof render === 'function') render(); if(typeof renderListaContratos === 'function') renderListaContratos();
            return;
        } else return;
    }

    const executarExclusaoNormal = () => {
        const c = db.contas.find(x => x.id === lanc.contaId);
        if(c && c.tipo !== 'cartao' && lanc.efetivado) { 
            const valLimpo = parseFloat(lanc.valor) || 0;
            if (window.ecoTiposReceita.includes(lanc.tipo)) c.saldo -= valLimpo; 
            if (window.ecoTiposDespesa.includes(lanc.tipo)) c.saldo += valLimpo; 
        }
        db.lancamentos = db.lancamentos.filter(l => String(l.id) !== String(id)); 
        save(); showToast("Lançamento Apagado!", "exclusao"); 
        if(typeof render === 'function') render(); if(typeof renderListaContratos === 'function') renderListaContratos();
    };

    if(typeof abrirConfirmacao === 'function') abrirConfirmacao("Apagar lançamento? O saldo será recalculado.", executarExclusaoNormal);
    else if(confirm("Apagar lançamento? O saldo será recalculado.")) executarExclusaoNormal();
};

window.excluirContrato = function(idOuGrupo) {
    if(confirm("Deseja apagar este registro e cancelar TODAS as parcelas/recorrências futuras de uma vez?")) {
        if (db.contratos) db.contratos = db.contratos.filter(c => String(c.id) !== String(idOuGrupo));
        if (db.recorrencias) db.recorrencias = db.recorrencias.filter(r => String(r.id) !== String(idOuGrupo));
        
        if (db.lancamentos) {
            db.lancamentos = db.lancamentos.filter(l => {
                if (String(l.idGrupo) === String(idOuGrupo) && !l.efetivado) return false;
                if (String(l.idRecorrencia) === String(idOuGrupo) && !l.efetivado) return false;
                if (String(l.id) === String(idOuGrupo) && !l.efetivado) return false;
                return true;
            });
        }
        save(); showToast("Excluído com sucesso!", "exclusao");
        if(typeof renderListaContratos === 'function') renderListaContratos();
        if(typeof render === 'function') render();
    }
};

window.salvarParcelamentoAndamento = function() {
    const desc = document.getElementById('parc-desc').value;
    const valor = window.parseMoeda ? window.parseMoeda('parc-valor') : parseFloat(document.getElementById('parc-valor').value.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
    const diaVenc = parseInt(document.getElementById('parc-dia').value);
    const parcAtual = parseInt(document.getElementById('parc-atual').value);
    const parcTotal = parseInt(document.getElementById('parc-total').value);
    const mesInput = document.getElementById('parc-mes').value; 
    const cat = document.getElementById('parc-cat').value;
    const contaId = document.getElementById('parc-conta').value;

    if(!desc || valor <= 0 || isNaN(diaVenc) || isNaN(parcAtual) || isNaN(parcTotal) || !mesInput || !cat || !contaId) return alert("Preencha todos os campos do Parcelamento.");

    const conta = db.contas.find(c => c.id === contaId);
    const forma = conta.tipo === 'cartao' ? 'Crédito' : 'Boleto';
    let [anoStr, mesStr] = mesInput.split('-'); let ano = parseInt(anoStr); let mes = parseInt(mesStr);
    const groupId = 'grp_' + Date.now();
    let geradas = 0;

    if(!db.contratos) db.contratos = [];
    db.contratos.push({ id: groupId, tipo: 'parc', desc, valor, dia: diaVenc, categoria: cat, conta: contaId, atual: parcAtual, total: parcTotal });

    for(let i = parcAtual; i <= parcTotal; i++) {
        let offset = i - parcAtual; let mesParcela = mes + offset; let anoParcela = ano;
        while(mesParcela > 12) { mesParcela -= 12; anoParcela += 1; }
        let d = new Date(anoParcela, mesParcela - 1, diaVenc);
        if (d.getMonth() + 1 !== mesParcela) d = new Date(anoParcela, mesParcela, 0); 
        let dataFormatada = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;

        db.lancamentos.push({ id: Date.now() + i + Math.floor(Math.random()*1000), idGrupo: groupId, data: dataFormatada, tipo: 'despesas_gerais', contaId: contaId, forma: forma, desc: `${desc} (${i}/${parcTotal})`, valor: valor, cat: cat, efetivado: false });
        geradas++;
    }

    save(); showToast(`Injetadas ${geradas} parcelas!`);
    document.getElementById('parc-desc').value = ''; document.getElementById('parc-valor').value = ''; document.getElementById('parc-dia').value = '';
    
    if(typeof fecharModalContratos === 'function') fecharModalContratos(); if(typeof render === 'function') render(); if(typeof renderListaContratos === 'function') renderListaContratos();
};

window.salvarContaFixa = function() {
    const desc = document.getElementById('fixa-desc').value;
    const valor = window.parseMoeda ? window.parseMoeda('fixa-valor') : parseFloat(document.getElementById('fixa-valor').value.replace(/\./g, '').replace(',', '.'));
    const dia = parseInt(document.getElementById('fixa-dia').value);
    const cat = document.getElementById('fixa-cat').value;
    const contaId = document.getElementById('fixa-conta').value;

    if(!desc || valor <= 0 || !dia || !cat || !contaId) return alert("Preencha todos os campos da Conta Fixa.");

    const newId = 'fixa_' + Date.now();
    if(!db.contratos) db.contratos = [];
    db.contratos.push({ id: newId, tipo: 'fixa', desc, valor, dia, categoria: cat, conta: contaId });

    // NOVA INJEÇÃO AUTOMÁTICA (Projeta 12 meses a partir do mês atual)
    const conta = db.contas.find(c => c.id === contaId);
    const forma = (conta && conta.tipo === 'cartao') ? 'Crédito' : 'Boleto';
    const hoje = new Date();
    let anoAtual = hoje.getFullYear();
    let mesAtual = hoje.getMonth() + 1;

    let geradas = 0;
    for (let i = 0; i < 12; i++) {
        let mesParc = mesAtual + i;
        let anoParc = anoAtual;
        while(mesParc > 12) { mesParc -= 12; anoParc += 1; }
        
        let d = new Date(anoParc, mesParc - 1, dia);
        if (d.getMonth() + 1 !== mesParc) d = new Date(anoParc, mesParc, 0); 
        
        let dataForm = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;

        db.lancamentos.push({ 
            id: Date.now() + i + Math.floor(Math.random()*1000), 
            idRecorrencia: newId, 
            data: dataForm, 
            tipo: 'despesas_gerais', 
            contaId: contaId, 
            forma: forma, 
            desc: desc, 
            valor: valor, 
            cat: cat, 
            efetivado: false,
            fixo: true
        });
        geradas++;
    }

    save(); showToast(`Conta Fixa Registrada (${geradas} meses projetados)!`);
    document.getElementById('fixa-desc').value = ''; document.getElementById('fixa-valor').value = '';
    
    if(typeof fecharModalContratos === 'function') fecharModalContratos(); if(typeof render === 'function') render(); if(typeof renderListaContratos === 'function') renderListaContratos();
};

window.toggleCamposCartao = function() { document.getElementById('campos-cartao-add').style.display = document.getElementById('nova-conta-tipo').value === 'cartao' ? 'block' : 'none'; }

window.criarConta = function() {
    const n = document.getElementById('nova-conta-nome').value; const t = document.getElementById('nova-conta-tipo').value;
    if(!n) return alert("Preencha o nome da conta.");
    const nc = { id: 'c_' + Date.now(), nome: n, tipo: t, cor: document.getElementById('nova-conta-cor').value, saldo: 0 };
    if(t === 'cartao'){ nc.limite = window.parseMoeda ? window.parseMoeda('nova-conta-limite') : 0; nc.meta = window.parseMoeda ? window.parseMoeda('nova-conta-meta') : 0; nc.fechamento = parseInt(document.getElementById('nova-conta-fecha').value)||1; nc.vencimento = parseInt(document.getElementById('nova-conta-venc').value)||1; }
    db.contas.push(nc); save(); document.getElementById('nova-conta-nome').value = ""; showToast("Conta Criada com Sucesso!", "sucesso"); mudarDirecaoLancamento();
    if(typeof toggleNovaContaArea === 'function') toggleNovaContaArea(); if(typeof render === 'function') render();
}

window.excluirConta = function(id) {
    if(typeof abrirConfirmacao === 'function') {
        abrirConfirmacao("Excluir conta e todos os lançamentos atrelados?", () => { db.contas = db.contas.filter(c=>c.id!==id); db.lancamentos = db.lancamentos.filter(l=>l.contaId!==id); save(); showToast("Conta Excluída!", "exclusao"); mudarDirecaoLancamento(); if(typeof render === 'function') render(); });
    }
}

window.salvarEdicaoConta = function(id) {
    const c = db.contas.find(x => x.id === id); c.nome = document.getElementById(`edit-nome-${id}`).value; c.cor = document.getElementById(`edit-cor-${id}`).value;
    if(c.tipo === 'cartao'){ c.limite = window.parseMoeda ? window.parseMoeda(`edit-limite-${id}`) : parseFloat(document.getElementById(`edit-limite-${id}`).value.replace(/\./g, '').replace(',','.'))||0; c.meta = window.parseMoeda ? window.parseMoeda(`edit-meta-${id}`) : parseFloat(document.getElementById(`edit-meta-${id}`).value.replace(/\./g, '').replace(',','.'))||0; c.fechamento = parseInt(document.getElementById(`edit-fecha-${id}`).value) || 1; c.vencimento = parseInt(document.getElementById(`edit-venc-${id}`).value) || 1; } 
    else { c.saldo = window.parseMoeda ? window.parseMoeda(`edit-saldo-${id}`) : parseFloat(document.getElementById(`edit-saldo-${id}`).value.replace(/\./g, '').replace(',','.'))||0; }
    save(); showToast("Conta Atualizada!", "ajuste"); mudarDirecaoLancamento(); if(typeof render === 'function') render();
}

window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lanc-direcao')) mudarDirecaoLancamento();
    processarRolagensPendentes();
    setTimeout(() => { verificarNotificacoesMotor(); }, 500);
});

setTimeout(() => { if (document.getElementById('lanc-tipo') && document.getElementById('lanc-tipo').options.length === 0) mudarDirecaoLancamento(); }, 300);
