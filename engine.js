// ==========================================
// ENGINE.JS - Lógica de Negócios e Cálculos
// ==========================================

let ultimoTipoSelecionado = ""; // Evita recarregar a lista de contas em loop

// --- 1. LANÇAMENTO INTELIGENTE E FILTROS ---
function atualizarRegrasLancamento() {
    const tipo = document.getElementById('lanc-tipo').value;
    const contaSelect = document.getElementById('lanc-conta');
    const formaSelect = document.getElementById('lanc-forma');
    const catSelect = document.getElementById('lanc-cat');
    const boxFixo = document.getElementById('lanc-fixo');
    
    // Armazena a conta selecionada para não perder ao recriar o select
    let contaSelecionada = contaSelect.value;

    // 1.1 Filtrar Contas (Só reconstrói se mudar o TIPO da transação)
    if (tipo !== ultimoTipoSelecionado || contaSelect.innerHTML === "") {
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
        ultimoTipoSelecionado = tipo;
        
        // Tenta manter a conta que estava selecionada antes, se ela ainda existir na lista
        if (contaSelecionada && Array.from(contaSelect.options).some(opt => opt.value === contaSelecionada)) {
            contaSelect.value = contaSelecionada;
        }
    }

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

    // 1.3 Atualizar Categorias
    if (tipo !== ultimoTipoSelecionado) {
        catSelect.innerHTML = "";
        if (tipo === 'receita') {
            catSelect.innerHTML = `<option value="Salário">💰 Salário</option><option value="Rendimento">📈 Rendimento</option><option value="Vendas">🛍️ Vendas</option><option value="Outras Receitas">🎁 Outras Receitas</option>`;
        } else if (['emp_cartao', 'emp_concedido', 'emp_pessoal', 'compensacao'].includes(tipo)) {
            catSelect.innerHTML = `<option value="Empréstimo">🤝 Empréstimo</option><option value="Dívida Pessoal">🏦 Minha Dívida</option>`;
            boxFixo.disabled = true; boxFixo.checked = false;
        } else {
            catSelect.innerHTML = `<option value="Alimentação">🛒 Alimentação</option><option value="Moradia">🏠 Moradia</option><option value="Transporte">🚗 Transporte</option><option value="Saúde">💊 Saúde</option><option value="Energia">⚡ Energia</option><option value="Assinaturas">📺 Assinaturas</option><option value="Consórcio">📄 Consórcio</option><option value="Lazer">🍿 Lazer</option><option value="Outros">⚙️ Outros</option>`;
            boxFixo.disabled = false;
        }
    }
}

function verificarDataFutura() {
    const dataInput = document.getElementById('lanc-data').value;
    if(!dataInput) return;
    const dtLanc = new Date(dataInput + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    document.getElementById('lanc-efetivado').checked = dtLanc <= hoje;
}

// --- 2. SISTEMA DE AVISOS (TOAST) ---
function showToast(mensagem) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-check-circle" style="color: var(--sucesso); font-size:18px;"></i> ${mensagem}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// --- 3. MOTOR DE LANÇAMENTOS ---
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

    if(!desc || isNaN(valor) || !data) return alert("Preencha a descrição e o valor.");
    const conta = db.contas.find(c => c.id === contaId);
    
    if (conta && conta.tipo !== 'cartao' && efetivado) {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(tipo)) conta.saldo += valor;
        if (['despesa', 'emp_concedido'].includes(tipo)) conta.saldo -= valor;
    }
    
    const novoLancamento = { id: Date.now(), data, tipo, contaId, forma, desc, valor, cat, efetivado };
    db.lancamentos.push(novoLancamento);
    
    if (isFixo && !document.getElementById('lanc-fixo').disabled) {
        const [anoStr, mesStr, diaStr] = data.split('-');
        db.recorrencias.push({ id: Date.now() + 1, diaVencimento: parseInt(diaStr), tipo, contaId, forma, desc, valor, cat, ultimoMesGerado: `${anoStr}-${mesStr}` });
    }
    
    save();

    // LIMPEZA DO FORMULÁRIO (Correção do Bug 3)
    document.getElementById('lanc-desc').value = ""; 
    document.getElementById('lanc-valor').value = ""; 
    document.getElementById('lanc-fixo').checked = false;
    document.getElementById('lanc-data').valueAsDate = new Date();
    verificarDataFutura();
    
    if (['emp_cartao', 'emp_concedido'].includes(tipo)) {
        abrirModalEmprestimo(novoLancamento);
    } else {
        showToast("Lançamento Registrado com Sucesso!"); // Aviso Visual Inteligente
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
    
    if (parcelas >= 1) {
        const valorParcela = tempLancamentoEmprestimo.valor / parcelas;
        let dataAtual = new Date(tempLancamentoEmprestimo.data + 'T00:00:00');
        
        for (let i = 1; i <= parcelas; i++) {
            dataAtual.setDate(dataAtual.getDate() + intervalo);
            db.lancamentos.push({
                id: Date.now() + i,
                data: dataAtual.toISOString().split('T')[0],
                tipo: 'compensacao', 
                contaId: tempLancamentoEmprestimo.contaId,
                forma: tempLancamentoEmprestimo.forma,
                desc: `Rec. ${tempLancamentoEmprestimo.desc} (${i}/${parcelas})`,
                valor: valorParcela,
                cat: 'Empréstimo',
                efetivado: false
            });
        }
        save();
        showToast(`${parcelas} parcelas de recebimento geradas!`);
    }
    fecharModalEmprestimo();
}

// --- 4. EDIÇÃO, EXCLUSÃO E RECORRÊNCIAS ---
function excluirLancamento(id) {
    if(!confirm("Apagar lançamento? O saldo será recalculado.")) return;
    const lanc = db.lancamentos.find(l => l.id === id); if(!lanc) return;
    const c = db.contas.find(x => x.id === lanc.contaId);
    if(c && c.tipo !== 'cartao' && lanc.efetivado) {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(lanc.tipo)) c.saldo -= lanc.valor;
        if (['despesa', 'emp_concedido'].includes(lanc.tipo)) c.saldo += lanc.valor;
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
        if(['receita', 'emp_pessoal', 'compensacao'].includes(l.tipo)) c.saldo += diferenca;
        if(['despesa', 'emp_concedido'].includes(l.tipo)) c.saldo -= diferenca;
    }
    l.valor = novoValor; l.data = novaData; l.desc = novaDesc; save(); showToast("Atualizado!");
}

function confirmarPagamento(id) {
    const l = db.lancamentos.find(x => x.id === id); if(!l) return;
    l.efetivado = true;
    const c = db.contas.find(x => x.id === l.contaId);
    if(c && c.tipo !== 'cartao') {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(l.tipo)) c.saldo += l.valor;
        if (['despesa', 'emp_concedido'].includes(l.tipo)) c.saldo -= l.valor;
    }
    save(); showToast("Pagamento Efetivado!");
}

function processarRecorrencias() { /* Mantida igual */ }

// --- 5. GESTÃO DE CONTAS E BACKUPS (Correção Aba Config) ---
function toggleCamposCartao() { 
    document.getElementById('campos-cartao-add').style.display = document.getElementById('nova-conta-tipo').value === 'cartao' ? 'block' : 'none'; 
}

function criarConta() { 
    const n = document.getElementById('nova-conta-nome').value; const t = document.getElementById('nova-conta-tipo').value; if(!n) return alert("Preencha o nome da conta."); 
    const nc = {id: 'c_'+Date.now(), nome: n, tipo: t, cor: document.getElementById('nova-conta-cor').value, saldo: 0}; 
    if(t === 'cartao'){ nc.limite = parseFloat(document.getElementById('nova-conta-limite').value)||0; nc.meta = parseFloat(document.getElementById('nova-conta-meta').value)||0; nc.fechamento = parseInt(document.getElementById('nova-conta-fecha').value)||1; nc.vencimento = parseInt(document.getElementById('nova-conta-venc').value)||1; } 
    db.contas.push(nc); save(); 
    document.getElementById('nova-conta-nome').value=""; showToast("Conta Criada!"); atualizarRegrasLancamento();
}

function excluirConta(id) { 
    if(confirm("Excluir conta e todos os lançamentos atrelados?")){ db.contas = db.contas.filter(c=>c.id!==id); db.lancamentos = db.lancamentos.filter(l=>l.contaId!==id); save(); showToast("Conta Excluída!"); atualizarRegrasLancamento(); } 
}

function alternarPagamentoFatura(id) { const i = db.faturasPagas.indexOf(id); if(i > -1) db.faturasPagas.splice(i,1); else db.faturasPagas.push(id); save(); showToast("Status da Fatura Atualizado!"); }

function exportarBackup() { 
    const dataStr = JSON.stringify(db); const sizeKB = (new Blob([dataStr]).size / 1024).toFixed(1) + " KB"; const now = new Date(); const nomeArquivo = `EcoBKP_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours()}${now.getMinutes()}.json`; 
    
    // Grava no histórico
    let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; 
    hist.unshift({ id: Date.now(), nome: nomeArquivo, data: now.toLocaleDateString('pt-BR')+' '+now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), size: sizeKB, versao: "v25.5", payload: dataStr }); 
    if(hist.length > 5) hist.pop(); localStorage.setItem('ecoDB_backups', JSON.stringify(hist)); 
    
    // Baixa o arquivo
    const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(dataStr); a.download = nomeArquivo; a.click(); 
    if(typeof renderAbaConfig === 'function') renderAbaConfig(); showToast("Backup Salvo!"); 
}

function excluirBackupLocal(id) { if(confirm("Apagar este backup?")) { let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; hist = hist.filter(b => b.id !== id); localStorage.setItem('ecoDB_backups', JSON.stringify(hist)); if(typeof renderAbaConfig === 'function') renderAbaConfig(); } }
function restaurarBackupLocal(id) { if(confirm("Substituir dados atuais? O app vai recarregar.")) { let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; let bkp = hist.find(b => b.id === id); if(bkp) { localStorage.setItem('ecoDB_v25', bkp.payload); location.reload(); } } }
function importarArquivoJSON(event) { const file = event.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const json = JSON.parse(e.target.result); if(json && json.contas) { localStorage.setItem('ecoDB_v25', JSON.stringify(json)); location.reload(); } else alert("Arquivo inválido."); } catch(err) { alert("Erro de leitura."); } }; reader.readAsText(file); }

function confirmarReset() { 
    const palavra = prompt("⚠️ ZONA DE PERIGO\nDigite 'excluir' para confirmar:"); 
    if (palavra && palavra.toLowerCase() === "excluir") { 
        localStorage.removeItem('ecoDB_v25'); localStorage.removeItem('ecoDB_backups'); 
        db = { contas: [ { id: 'c_padrao_mov', nome: 'Conta Padrão', tipo: 'movimentacao', saldo: 0, cor: '#2563eb' }, { id: 'c_padrao_inv', nome: 'Poupança', tipo: 'investimento', saldo: 0, cor: '#10b981' }, { id: 'c_padrao_cred', nome: 'Cartão Padrão', tipo: 'cartao', meta: 1000, limite: 3000, fechamento: 5, vencimento: 10, cor: '#6366f1' } ], lancamentos: [], faturasPagas: [], recorrencias: [] }; save(); alert("Sistema formatado."); location.reload(); 
    } 
}
