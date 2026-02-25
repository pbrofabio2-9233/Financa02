// ==========================================
// ENGINE.JS - Lógica de Negócios e Cálculos
// ==========================================

let ultimoTipoSelecionado = ""; 
let tempLancamentoEmprestimo = null;

// --- 1. SISTEMA DE AVISOS (TOAST) ---
function showToast(mensagem) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-check-circle" style="color: var(--sucesso); font-size:18px;"></i> ${mensagem}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// --- 2. LANÇAMENTO INTELIGENTE (Matriz de Regras Segura) ---
function atualizarRegrasLancamento() {
    const tipoSelect = document.getElementById('lanc-tipo');
    const contaSelect = document.getElementById('lanc-conta');
    const catSelect = document.getElementById('lanc-cat');
    const boxFixo = document.getElementById('lanc-fixo');
    
    // Trava de segurança caso a tela ainda esteja carregando
    if(!tipoSelect || !contaSelect || !catSelect || !boxFixo) return;

    const tipo = tipoSelect.value || 'despesas_gerais';
    
    // Categorias da Tabela
    const catsDespesa = `<option value="Alimentação">🛒 Alimentação</option><option value="Consórcio">📄 Consórcio</option><option value="Transporte">🚗 Transporte</option><option value="Energia">⚡ Energia</option><option value="Moradia">🏠 Moradia</option><option value="Saúde">💊 Saúde</option><option value="Lazer">🍿 Lazer</option><option value="Assinaturas">📺 Assinaturas</option><option value="Terceiros">🤝 Terceiros</option><option value="Outros">⚙️ Outros</option>`;
    const catsReceita = `<option value="Salário">💰 Salário</option><option value="Terceiros">🤝 Terceiros</option><option value="Estorno">↩️ Estorno</option><option value="Outros">🎁 Outros</option>`;

    // 2.1 Aplicar Categorias e Regra de Repetição
    const tiposReceita = ['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca'];
    catSelect.innerHTML = tiposReceita.includes(tipo) ? catsReceita : catsDespesa;

    if (tipo === 'despesas_gerais' || tipo === 'salario') {
        boxFixo.disabled = false;
    } else {
        boxFixo.disabled = true; 
        boxFixo.checked = false;
    }

    // 2.2 Filtrar Origem/Destino (Contas) - CONSTRUÇÃO EM LOTE PARA NÃO TRAVAR O NAVEGADOR
    let contaSelecionada = contaSelect.value;
    let htmlContas = ""; 
    let temConta = false;
    
    if (typeof db !== 'undefined' && db.contas) {
        db.contas.forEach(c => {
            let mostrar = false;
            
            // Aplicação da Matriz
            if (tipo === 'despesas_gerais' && (c.tipo === 'movimentacao' || c.tipo === 'cartao')) mostrar = true;
            else if (tipo === 'emprestei_cartao' && c.tipo === 'cartao') mostrar = true;
            else if (['emprestei_dinheiro', 'pag_emprestimo'].includes(tipo) && c.tipo === 'movimentacao') mostrar = true;
            else if (['dep_poupanca', 'saque_poupanca'].includes(tipo) && c.tipo === 'investimento') mostrar = true;
            else if (['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas'].includes(tipo) && c.tipo !== 'cartao') mostrar = true;
            else if (tipo === 'estorno') mostrar = true; 
            
            if (mostrar) {
                const icone = c.tipo === 'cartao' ? '💳' : (c.tipo === 'investimento' ? '📈' : '🏦');
                htmlContas += `<option value="${c.id}">${icone} ${c.nome}</option>`;
                if (c.id === contaSelecionada) temConta = true;
            }
        });
    }

    if (htmlContas === "") {
        htmlContas = '<option value="">Sem conta disponível</option>';
    }
    
    // Injeção única no HTML (Evita o Bug do Safari/Mobile)
    contaSelect.innerHTML = htmlContas;
    
    if (temConta) contaSelect.value = contaSelecionada;
    else contaSelect.selectedIndex = 0; 
    
    ultimoTipoSelecionado = tipo;
    
    // Dispara a próxima etapa
    atualizarFormaPagamento();
}

function atualizarFormaPagamento() {
    const tipoSelect = document.getElementById('lanc-tipo');
    const contaSelect = document.getElementById('lanc-conta');
    const formaSelect = document.getElementById('lanc-forma');
    
    if(!tipoSelect || !contaSelect || !formaSelect) return;

    const tipo = tipoSelect.value;
    const contaId = contaSelect.value;
    let htmlFormas = "";

    if (!contaId || typeof db === 'undefined' || !db.contas) {
        formaSelect.innerHTML = '<option value="">-</option>';
        return;
    }

    const contaAtiva = db.contas.find(c => c.id === contaId);
    if (!contaAtiva) {
        formaSelect.innerHTML = '<option value="">-</option>';
        return;
    }

    // Aplicação da Matriz (Formas de Pagamento em Lote)
    if (contaAtiva.tipo === 'cartao') {
        htmlFormas = `<option value="Crédito">💳 Crédito</option>`;
    } 
    else if (contaAtiva.tipo === 'movimentacao') {
        if (tipo === 'salario') htmlFormas = `<option value="Pix">📱 Pix</option><option value="Transferência">🔄 Transferência</option>`;
        else if (['tomei_emprestimo', 'rec_emprestimo', 'outras_receitas'].includes(tipo)) htmlFormas = `<option value="Pix">📱 Pix</option>`;
        else if (tipo === 'estorno') htmlFormas = `<option value="Pix">📱 Pix</option><option value="Estorno Conta">↩️ Reembolso</option>`;
        else htmlFormas = `<option value="Pix">📱 Pix</option><option value="Boleto">📄 Boleto</option><option value="Débito">🏧 Débito</option>`;
    } 
    else if (contaAtiva.tipo === 'investimento') {
        if (['dep_poupanca', 'saque_poupanca'].includes(tipo)) htmlFormas = `<option value="Transferência">🔄 Transferência</option><option value="Pix">📱 Pix</option>`;
        else htmlFormas = `<option value="Pix">📱 Pix</option><option value="Transferência">🔄 Transferência</option>`;
    }
    
    // Injeção única
    formaSelect.innerHTML = htmlFormas;
}

function verificarDataFutura() {
    const dataInput = document.getElementById('lanc-data').value;
    if(!dataInput) return;
    const dtLanc = new Date(dataInput + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    document.getElementById('lanc-efetivado').checked = dtLanc <= hoje;
}

// --- 3. MOTOR DE LANÇAMENTOS E "EFEITO LENE" ---
const tiposReceitaParaSaldo = ['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca'];
const tiposDespesaParaSaldo = ['despesas_gerais', 'emprestei_dinheiro', 'pag_emprestimo', 'dep_poupanca'];

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
    
    // Cálculo do Saldo (Respeitando a Matriz)
    if (conta && conta.tipo !== 'cartao' && efetivado) {
        if (tiposReceitaParaSaldo.includes(tipo)) conta.saldo += valor;
        if (tiposDespesaParaSaldo.includes(tipo)) conta.saldo -= valor;
    }
    
    const novoLancamento = { id: Date.now(), data, tipo, contaId, forma, desc, valor, cat, efetivado };
    db.lancamentos.push(novoLancamento);
    
    if (isFixo && !document.getElementById('lanc-fixo').disabled) {
        const [anoStr, mesStr, diaStr] = data.split('-');
        db.recorrencias.push({ id: Date.now() + 1, diaVencimento: parseInt(diaStr), tipo, contaId, forma, desc, valor, cat, ultimoMesGerado: `${anoStr}-${mesStr}` });
    }
    
    save();

    // Limpeza visual do formulário
    document.getElementById('lanc-desc').value = ""; 
    document.getElementById('lanc-valor').value = ""; 
    document.getElementById('lanc-fixo').checked = false;
    document.getElementById('lanc-data').valueAsDate = new Date();
    verificarDataFutura();
    
    // Aciona Efeito Lene para Concessão ou Tomada de Empréstimo
    if (['emprestei_cartao', 'emprestei_dinheiro', 'tomei_emprestimo'].includes(tipo)) {
        abrirModalEmprestimo(novoLancamento);
    } else {
        showToast("Lançamento Registrado com Sucesso!");
    }
}

function abrirModalEmprestimo(lancamentoBase) {
    tempLancamentoEmprestimo = lancamentoBase;
    const modal = document.getElementById('modal-emprestimo');
    const isTomada = lancamentoBase.tipo === 'tomei_emprestimo';
    const txtAcao = isTomada ? 'tomou emprestado' : 'emprestou';
    const txtDestino = isTomada ? 'pagamento' : 'recebimento';
    
    document.getElementById('msg-modal-emp').innerText = `Você ${txtAcao} R$ ${lancamentoBase.valor.toFixed(2)} ("${lancamentoBase.desc}"). Como será o ${txtDestino}?`;
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
    
    if (parcelas >= 1) {
        const valorParcela = tempLancamentoEmprestimo.valor / parcelas;
        let dataAtual = new Date(tempLancamentoEmprestimo.data + 'T00:00:00');
        const isTomada = tempLancamentoEmprestimo.tipo === 'tomei_emprestimo';
        
        for (let i = 1; i <= parcelas; i++) {
            dataAtual.setDate(dataAtual.getDate() + intervalo);
            db.lancamentos.push({
                id: Date.now() + i,
                data: dataAtual.toISOString().split('T')[0],
                tipo: isTomada ? 'pag_emprestimo' : 'rec_emprestimo', 
                contaId: tempLancamentoEmprestimo.contaId,
                forma: tempLancamentoEmprestimo.forma,
                desc: `${isTomada ? 'Pag.' : 'Rec.'} ${tempLancamentoEmprestimo.desc} (${i}/${parcelas})`,
                valor: valorParcela,
                cat: 'Terceiros', 
                efetivado: false
            });
        }
        save();
        showToast(`${parcelas} parcelas de ${isTomada ? 'pagamento' : 'recebimento'} geradas!`);
    }
    fecharModalEmprestimo();
}

// --- 4. EDIÇÃO, EXCLUSÃO E RECORRÊNCIAS DE LANÇAMENTOS ---
function excluirLancamento(id) {
    if(!confirm("Apagar lançamento? O saldo será recalculado.")) return;
    const lanc = db.lancamentos.find(l => l.id === id); if(!lanc) return;
    const c = db.contas.find(x => x.id === lanc.contaId);
    
    if(c && c.tipo !== 'cartao' && lanc.efetivado) {
        if (tiposReceitaParaSaldo.includes(lanc.tipo)) c.saldo -= lanc.valor; 
        if (tiposDespesaParaSaldo.includes(lanc.tipo)) c.saldo += lanc.valor; 
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
        if(tiposReceitaParaSaldo.includes(l.tipo)) c.saldo += diferenca;
        if(tiposDespesaParaSaldo.includes(l.tipo)) c.saldo -= diferenca;
    }
    l.valor = novoValor; l.data = novaData; l.desc = novaDesc; save(); showToast("Movimentação Atualizada!");
}

function confirmarPagamento(id) {
    const l = db.lancamentos.find(x => x.id === id); if(!l) return;
    l.efetivado = true;
    const c = db.contas.find(x => x.id === l.contaId);
    
    if(c && c.tipo !== 'cartao') {
        if (tiposReceitaParaSaldo.includes(l.tipo)) c.saldo += l.valor;
        if (tiposDespesaParaSaldo.includes(l.tipo)) c.saldo -= l.valor;
    }
    save(); showToast("Pagamento Efetivado!");
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
                if (tiposReceitaParaSaldo.includes(rec.tipo)) conta.saldo += rec.valor;
                if (tiposDespesaParaSaldo.includes(rec.tipo)) conta.saldo -= rec.valor;
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

// --- 5. GESTÃO DE CONTAS ---
function toggleCamposCartao() { 
    document.getElementById('campos-cartao-add').style.display = document.getElementById('nova-conta-tipo').value === 'cartao' ? 'block' : 'none'; 
}

function criarConta() { 
    const n = document.getElementById('nova-conta-nome').value; 
    const t = document.getElementById('nova-conta-tipo').value; 
    if(!n) return alert("Preencha o nome da conta."); 
    
    const nc = {id: 'c_'+Date.now(), nome: n, tipo: t, cor: document.getElementById('nova-conta-cor').value, saldo: 0}; 
    if(t === 'cartao'){ 
        nc.limite = parseFloat(document.getElementById('nova-conta-limite').value)||0; 
        nc.meta = parseFloat(document.getElementById('nova-conta-meta').value)||0; 
        nc.fechamento = parseInt(document.getElementById('nova-conta-fecha').value)||1; 
        nc.vencimento = parseInt(document.getElementById('nova-conta-venc').value)||1; 
    } 
    db.contas.push(nc); save(); 
    document.getElementById('nova-conta-nome').value=""; 
    showToast("Conta Criada!"); 
    atualizarRegrasLancamento();
}

function excluirConta(id) { 
    if(confirm("Excluir conta e todos os lançamentos atrelados?")){ 
        db.contas = db.contas.filter(c=>c.id!==id); 
        db.lancamentos = db.lancamentos.filter(l=>l.contaId!==id); 
        save(); showToast("Conta Excluída!"); 
        atualizarRegrasLancamento(); 
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
    showToast("Conta Atualizada!"); 
    atualizarRegrasLancamento(); 
}

// --- 6. FATURAS, BACKUPS E RESET ---
function alternarPagamentoFatura(id) { 
    const i = db.faturasPagas.indexOf(id); 
    if(i > -1) db.faturasPagas.splice(i,1); else db.faturasPagas.push(id); 
    save(); showToast("Status da Fatura Atualizado!"); 
}

function exportarBackup() { 
    const dataStr = JSON.stringify(db); 
    const sizeKB = (new Blob([dataStr]).size / 1024).toFixed(1) + " KB"; 
    const now = new Date(); 
    const nomeArquivo = `EcoBKP_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours()}${now.getMinutes()}.json`; 
    
    let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; 
    hist.unshift({ id: Date.now(), nome: nomeArquivo, data: now.toLocaleDateString('pt-BR')+' '+now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), size: sizeKB, versao: "v25.6", payload: dataStr }); 
    if(hist.length > 5) hist.pop(); localStorage.setItem('ecoDB_backups', JSON.stringify(hist)); 
    
    const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(dataStr); a.download = nomeArquivo; a.click(); 
    if(typeof renderAbaConfig === 'function') renderAbaConfig(); showToast("Backup Salvo!"); 
}

function excluirBackupLocal(id) { 
    if(confirm("Apagar este backup?")) { 
        let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; 
        hist = hist.filter(b => b.id !== id); 
        localStorage.setItem('ecoDB_backups', JSON.stringify(hist)); 
        if(typeof renderAbaConfig === 'function') renderAbaConfig(); 
    } 
}

function restaurarBackupLocal(id) { 
    if(confirm("Substituir dados atuais? O app vai recarregar.")) { 
        let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; 
        let bkp = hist.find(b => b.id === id); 
        if(bkp) { localStorage.setItem('ecoDB_v25', bkp.payload); location.reload(); } 
    } 
}

function importarArquivoJSON(event) { 
    const file = event.target.files[0]; if(!file) return; 
    const reader = new FileReader(); 
    reader.onload = function(e) { 
        try { 
            const json = JSON.parse(e.target.result); 
            if(json && json.contas) { localStorage.setItem('ecoDB_v25', JSON.stringify(json)); location.reload(); } 
            else alert("Arquivo inválido."); 
        } catch(err) { alert("Erro de leitura."); } 
    }; 
    reader.readAsText(file); 
}

function confirmarReset() { 
    const palavra = prompt("⚠️ ZONA DE PERIGO\nIsso apagará TODO o seu histórico. Digite 'excluir' para confirmar:"); 
    if (palavra && palavra.toLowerCase() === "excluir") { 
        localStorage.removeItem('ecoDB_v25'); localStorage.removeItem('ecoDB_backups'); 
        db = { contas: [ { id: 'c_padrao_mov', nome: 'Conta Corrente', tipo: 'movimentacao', saldo: 0, cor: '#2563eb' }, { id: 'c_padrao_inv', nome: 'Poupança', tipo: 'investimento', saldo: 0, cor: '#10b981' }, { id: 'c_padrao_cred', nome: 'Cartão Padrão', tipo: 'cartao', meta: 1000, limite: 3000, fechamento: 5, vencimento: 10, cor: '#6366f1' } ], lancamentos: [], faturasPagas: [], recorrencias: [] }; 
        save(); alert("Sistema formatado."); location.reload(); 
    } 
}

// INICIALIZAÇÃO DE SEGURANÇA
setTimeout(() => {
    if (document.getElementById('lanc-tipo')) atualizarRegrasLancamento();
}, 200);
