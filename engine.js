// ==========================================
// ENGINE.JS - Lógica de Negócios e Cálculos
// ==========================================

// --- 1. LANÇAMENTO INTELIGENTE E FILTROS ---

function atualizarRegrasLancamento() {
    const tipo = document.getElementById('lanc-tipo').value;
    const contaSelect = document.getElementById('lanc-conta');
    const formaSelect = document.getElementById('lanc-forma');
    const catSelect = document.getElementById('lanc-cat');
    const boxFixo = document.getElementById('lanc-fixo');
    const boxEfetivado = document.getElementById('lanc-efetivado');

    // 1.1 Filtrar Contas (Origem/Destino)
    contaSelect.innerHTML = "";
    db.contas.forEach(c => {
        let mostrar = false;
        if (tipo === 'emp_cartao' && c.tipo === 'cartao') mostrar = true;
        else if (['receita', 'emp_pessoal', 'compensacao'].includes(tipo) && ['movimentacao', 'investimento'].includes(c.tipo)) mostrar = true;
        else if (['despesa', 'emp_concedido'].includes(tipo) && c.tipo !== 'investimento') mostrar = true;
        
        if (mostrar) {
            const icone = c.tipo === 'cartao' ? '💳' : (c.tipo === 'investimento' ? '📈' : '🏦');
            contaSelect.innerHTML += `<option value="${c.id}">${icone} ${c.nome}</option>`;
        }
    });

    // 1.2 Atualizar Formas de Pagamento
    const contaId = contaSelect.value;
    const contaAtiva = db.contas.find(c => c.id === contaId);
    formaSelect.innerHTML = "";
    
    if (contaAtiva) {
        if (contaAtiva.tipo === 'cartao') {
            formaSelect.innerHTML = `<option value="Crédito">💳 Crédito</option><option value="Estorno">↩️ Estorno</option>`;
        } else if (contaAtiva.tipo === 'movimentacao') {
            formaSelect.innerHTML = `<option value="Pix">📱 Pix</option><option value="Boleto">📄 Boleto</option><option value="Débito">🏧 Débito</option>`;
        } else if (contaAtiva.tipo === 'investimento') {
            formaSelect.innerHTML = `<option value="Transferencia">🔄 Transferência</option><option value="Rendimento">📈 Rendimento</option>`;
        }
    }

    // 1.3 Atualizar Categorias Dinamicamente
    catSelect.innerHTML = "";
    if (tipo === 'receita') {
        catSelect.innerHTML = `<option value="Salário">💰 Salário</option><option value="Rendimento">📈 Rendimento</option><option value="Vendas">🛍️ Vendas</option><option value="Outras Receitas">🎁 Outras Receitas</option>`;
    } else if (['emp_cartao', 'emp_concedido', 'emp_pessoal', 'compensacao'].includes(tipo)) {
        catSelect.innerHTML = `<option value="Empréstimo">🤝 Empréstimo a Terceiros</option><option value="Dívida Pessoal">🏦 Minha Dívida</option>`;
        boxFixo.disabled = true; boxFixo.checked = false; // Desabilita repetição para empréstimos
    } else {
        catSelect.innerHTML = `<option value="Alimentação">🛒 Alimentação</option><option value="Moradia">🏠 Moradia</option><option value="Transporte">🚗 Transporte</option><option value="Saúde">💊 Saúde</option><option value="Energia">⚡ Energia</option><option value="Assinaturas">📺 Assinaturas</option><option value="Consórcio">📄 Consórcio</option><option value="Lazer">🍿 Lazer</option><option value="Outros">⚙️ Outros</option>`;
        boxFixo.disabled = false;
    }
}

function verificarDataFutura() {
    const dataInput = document.getElementById('lanc-data').value;
    if(!dataInput) return;
    const dtLanc = new Date(dataInput + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const checkboxEfetivado = document.getElementById('lanc-efetivado');
    checkboxEfetivado.checked = dtLanc <= hoje;
}

// --- 2. MOTOR DE LANÇAMENTOS E "EFEITO LENE" ---

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

    if(!desc || isNaN(valor) || !data) return alert("Preencha todos os dados.");
    const conta = db.contas.find(c => c.id === contaId);
    
    // Impacto Imediato no Saldo (Se não for cartão e for efetivado)
    if (conta.tipo !== 'cartao' && efetivado) {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(tipo)) conta.saldo += valor;
        if (['despesa', 'emp_concedido'].includes(tipo)) conta.saldo -= valor;
    }
    
    const novoLancamento = { id: Date.now(), data, tipo, contaId, forma, desc, valor, cat, efetivado };
    db.lancamentos.push(novoLancamento);
    
    // Tratamento de Recorrência Mensal
    if (isFixo && !boxFixo.disabled) {
        const [anoStr, mesStr, diaStr] = data.split('-');
        db.recorrencias.push({ id: Date.now() + 1, diaVencimento: parseInt(diaStr), tipo, contaId, forma, desc, valor, cat, ultimoMesGerado: `${anoStr}-${mesStr}` });
    }
    
    save();

    // Limpar formulário
    document.getElementById('lanc-desc').value = ""; 
    document.getElementById('lanc-valor').value = ""; 
    document.getElementById('lanc-fixo').checked = false;
    
    // O Efeito Lene (Disparar Modal de Parcelamento)
    if (['emp_cartao', 'emp_concedido'].includes(tipo)) {
        abrirModalEmprestimo(novoLancamento);
    } else {
        alert(efetivado ? "Lançamento Registrado com Sucesso!" : "Previsão Salva!");
    }
}

function abrirModalEmprestimo(lancamentoBase) {
    tempLancamentoEmprestimo = lancamentoBase;
    const modal = document.getElementById('modal-emprestimo');
    document.getElementById('msg-modal-emp').innerText = `Você emprestou R$ ${lancamentoBase.valor.toFixed(2)} para "${lancamentoBase.desc}". Como será o recebimento?`;
    modal.classList.add('active');
}

function fecharModalEmprestimo() {
    tempLancamentoEmprestimo = null;
    document.getElementById('modal-emprestimo').classList.remove('active');
}

function gerarParcelasEmprestimo() {
    if (!tempLancamentoEmprestimo) return;
    const parcelas = parseInt(document.getElementById('emp-parcelas').value);
    const intervalo = parseInt(document.getElementById('emp-intervalo').value);
    
    if (parcelas > 1) {
        const valorParcela = tempLancamentoEmprestimo.valor / parcelas;
        let dataAtual = new Date(tempLancamentoEmprestimo.data + 'T00:00:00');
        
        for (let i = 1; i <= parcelas; i++) {
            dataAtual.setDate(dataAtual.getDate() + intervalo);
            const dataStr = dataAtual.toISOString().split('T')[0];
            
            db.lancamentos.push({
                id: Date.now() + i,
                data: dataStr,
                tipo: 'compensacao', // Entrada
                contaId: tempLancamentoEmprestimo.contaId,
                forma: tempLancamentoEmprestimo.forma,
                desc: `Rec. ${tempLancamentoEmprestimo.desc} (${i}/${parcelas})`,
                valor: valorParcela,
                cat: 'Empréstimo',
                efetivado: false // Fica como previsão no futuro
            });
        }
        save();
        alert(`${parcelas} parcelas de recebimento geradas com sucesso!`);
    }
    fecharModalEmprestimo();
}

// --- 3. EDIÇÃO INSTANTÂNEA E EXCLUSÃO ---

function excluirLancamento(idLancamento) {
    if(!confirm("Apagar lançamento? O saldo será recalculado.")) return;
    const lanc = db.lancamentos.find(l => l.id === idLancamento); if(!lanc) return;
    const c = db.contas.find(x => x.id === lanc.contaId);
    
    // Estorno do Saldo se já estava efetivado
    if(c && c.tipo !== 'cartao' && lanc.efetivado) {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(lanc.tipo)) c.saldo -= lanc.valor;
        if (['despesa', 'emp_concedido'].includes(lanc.tipo)) c.saldo += lanc.valor;
    }
    db.lancamentos = db.lancamentos.filter(l => l.id !== idLancamento); 
    save(); // Renderiza automaticamente
}

function salvarEdicaoLancamento(idLancamento) {
    const l = db.lancamentos.find(x => x.id === idLancamento);
    const novoValor = parseFloat(document.getElementById(`e-lanc-val-${idLancamento}`).value);
    const novaData = document.getElementById(`e-lanc-data-${idLancamento}`).value;
    const novaDesc = document.getElementById(`e-lanc-desc-${idLancamento}`).value;

    if(!novaDesc || isNaN(novoValor) || !novaData) return alert("Preencha todos os dados.");
    
    const c = db.contas.find(x => x.id === l.contaId);
    if(c && c.tipo !== 'cartao' && l.efetivado) {
        const diferenca = novoValor - l.valor;
        if(['receita', 'emp_pessoal', 'compensacao'].includes(l.tipo)) c.saldo += diferenca;
        if(['despesa', 'emp_concedido'].includes(l.tipo)) c.saldo -= diferenca;
    }
    
    l.valor = novoValor; 
    l.data = novaData; 
    l.desc = novaDesc;
    
    save(); // O save() agora chama o render(), que reconstrói a tela com o bloco já fechado!
}

function confirmarPagamento(idLancamento) {
    const l = db.lancamentos.find(x => x.id === idLancamento);
    if(!l) return;
    l.efetivado = true;
    const c = db.contas.find(x => x.id === l.contaId);
    if(c && c.tipo !== 'cartao') {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(l.tipo)) c.saldo += l.valor;
        if (['despesa', 'emp_concedido'].includes(l.tipo)) c.saldo -= l.valor;
    }
    save(); 
}

// --- 4. MOTOR DE RECORRÊNCIA ---

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
                if (['receita', 'emp_pessoal', 'compensacao'].includes(rec.tipo)) conta.saldo += rec.valor;
                if (['despesa', 'emp_concedido'].includes(rec.tipo)) conta.saldo -= rec.valor;
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

// --- 5. ENGENHARIA DE DADOS E RESET INTELIGENTE ---

function exportarBackup() { 
    const dataStr = JSON.stringify(db); 
    const now = new Date(); 
    const nomeArquivo = `EcoFinance_BKP_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}.json`; 
    const a = document.createElement('a'); 
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(dataStr); 
    a.download = nomeArquivo; 
    a.click(); 
}

function confirmarReset() { 
    const palavra = prompt("⚠️ ZONA DE PERIGO\nIsso apagará TODO o seu histórico. Digite a palavra 'excluir' para confirmar:"); 
    if (palavra && palavra.toLowerCase() === "excluir") { 
        // Limpa tudo do navegador
        localStorage.removeItem('ecoDB_v25'); 
        localStorage.removeItem('ecoDB_backups'); 
        
        // Recria apenas as 3 contas padrão
        db = {
            contas: [
                { id: 'c_padrao_mov', nome: 'Conta Padrão', tipo: 'movimentacao', saldo: 0, cor: '#2563eb' },
                { id: 'c_padrao_inv', nome: 'Poupança', tipo: 'investimento', saldo: 0, cor: '#10b981' },
                { id: 'c_padrao_cred', nome: 'Cartão Padrão', tipo: 'cartao', meta: 1000, limite: 3000, fechamento: 5, vencimento: 10, cor: '#6366f1' }
            ],
            lancamentos: [], faturasPagas: [], recorrencias: []
        };
        save();
        alert("Sistema formatado. Contas padrão restauradas.");
        location.reload(); 
    } 
}
