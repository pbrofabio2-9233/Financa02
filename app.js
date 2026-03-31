// ==========================================
// APP.JS - Navegação, Temas e Sistema (Limpo e Unificado v28.9)
// ==========================================

// ----------------------------------------------------
// FUNÇÃO UTILITÁRIA: CAPTURA DO BANCO DE DADOS
// ----------------------------------------------------
// Esta função caça os dados para evitar que falhe (corrige o erro em vermelho)
const obterDadosSeguros = () => {
    let dados = null;
    try { dados = db; } catch(e) {} // Tenta pegar a variável direta do core.js
    if (!dados && typeof window.db !== 'undefined') dados = window.db; // Tenta pegar da janela
    
    // Se ainda estiver vazio, gera a estrutura limpa para não dar erro
    if (!dados || Object.keys(dados).length === 0) {
        dados = { contas: [], categorias: [], lancamentos: [], faturas: [], salarios: [], contratos: [] };
    }
    return dados;
};

// ----------------------------------------------------
// 1. GESTÃO DE MODAIS GERAIS
// ----------------------------------------------------
window.abrirModalSalarios = function() {
    const m = document.getElementById('modal-salarios');
    if (m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); if(typeof renderListaSalarios === 'function') renderListaSalarios(); }
};
window.fecharModalSalarios = function() {
    const m = document.getElementById('modal-salarios');
    if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); }
};

window.alternarPagamentoFatura = function(idFatura, valorFatura) {
    document.getElementById('hidden-pagar-fat-id').value = idFatura;
    if(valorFatura !== undefined) {
        document.getElementById('txt-pagar-fat-valor').innerText = "R$ " + (typeof fmtBR === 'function' ? fmtBR(valorFatura) : valorFatura.toFixed(2).replace('.', ','));
        document.getElementById('hidden-pagar-fat-val').value = valorFatura;
    }
    let selectConta = document.getElementById('select-conta-pagar-fat');
    const bancoLocal = obterDadosSeguros();
    
    if(selectConta && bancoLocal.contas) {
        selectConta.innerHTML = '';
        let contasValidas = bancoLocal.contas.filter(c => c.tipo !== 'cartao'); 
        contasValidas.forEach(c => { selectConta.innerHTML += `<option value="${c.id}">${c.nome} (Saldo: R$ ${typeof fmtBR === 'function' ? fmtBR(c.saldo) : c.saldo})</option>`; });
    }
    const modal = document.getElementById('modal-pagar-fatura');
    if(modal) { modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); }
};
window.fecharModalPagamentoFatura = function() {
    const m = document.getElementById('modal-pagar-fatura');
    if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); }
};

window.abrirModalAparencia = function() { const m = document.getElementById('modal-aparencia'); if (m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } };
window.fecharModalAparencia = function() { const m = document.getElementById('modal-aparencia'); if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); } };

window.selecionarTema = function(tema) {
    document.body.classList.remove('dark-mode', 'ocean-mode');
    if (tema === 'dark') document.body.classList.add('dark-mode');
    else if (tema === 'ocean') document.body.classList.add('ocean-mode');
    localStorage.setItem('eco_tema', tema);
    if (typeof window.renderGrafico === 'function') window.renderGrafico();
    if (typeof window.renderGraficoEvolucao === 'function') window.renderGraficoEvolucao();
    fecharModalAparencia();
};

window.abrirModalSistema = function() {
    const m = document.getElementById('modal-sistema');
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('active'), 10);
    if (typeof renderizarListaBackups === 'function') renderizarListaBackups(); 
};
window.fecharModalSistema = function() { const m = document.getElementById('modal-sistema'); if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); } };

// ----------------------------------------------------
// 2. SISTEMA E BACKUPS (ARQUITETURA 100% NUVEM / FIREBASE)
// ----------------------------------------------------
window.exportarBackup = async function() {
    if (!window.usuarioLogado) return alert("Erro: Usuário não autenticado.");
    
    const bancoDados = obterDadosSeguros();
    const uid = window.usuarioLogado.uid;
    const dataAtual = new Date();
    const idBackup = 'bkp_' + dataAtual.getTime();

    const backupData = {
        id: idBackup,
        data: dataAtual.toLocaleString('pt-BR'),
        timestamp: dataAtual.getTime(),
        dados: JSON.stringify(bancoDados)
    };

    try {
        const btnBkp = event.target;
        const textoOriginal = btnBkp.innerHTML;
        btnBkp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando na nuvem...';
        btnBkp.disabled = true;

        await dbFirestore.collection('users').doc(uid).collection('backups').doc(idBackup).set(backupData);
        
        btnBkp.innerHTML = textoOriginal;
        btnBkp.disabled = false;

        if (typeof showToast === 'function') showToast("Backup salvo na nuvem!", "sucesso");
        renderizarListaBackups(); 
        
    } catch (error) {
        console.error("Erro ao salvar backup na nuvem:", error);
        alert("Falha ao salvar o backup. Verifique sua conexão com a internet.");
    }
};

window.renderizarListaBackups = async function() {
    const container = document.getElementById('lista-backups');
    if (!container || !window.usuarioLogado) return;

    container.innerHTML = '<p class="texto-vazio" style="font-size: 13px; color: var(--texto-sec); padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Buscando backups na nuvem...</p>';

    try {
        const uid = window.usuarioLogado.uid;
        const snapshot = await dbFirestore.collection('users').doc(uid).collection('backups').orderBy('timestamp', 'desc').get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="texto-vazio" style="font-size: 13px; color: var(--texto-sec); padding: 10px;">Nenhum backup encontrado na nuvem.</p>';
            return;
        }

        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const bkp = doc.data();
            const div = document.createElement('div');
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--linha); margin-bottom: 8px;";
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-cloud" style="color: var(--azul);"></i>
                    <span style="font-size: 13px; color: var(--texto-main); font-weight: 600;">${bkp.data}</span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--azul); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;" onclick="baixarBackupNuvem('${bkp.id}')" title="Baixar Arquivo">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--esmeralda); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;" onclick="restaurarBackupNuvem('${bkp.id}')" title="Restaurar Backup">
                        <i class="fas fa-upload"></i>
                    </button>
                    <button class="btn-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--perigo); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;" onclick="excluirBackupNuvem('${bkp.id}')" title="Apagar da Nuvem">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        container.innerHTML = '<p class="texto-vazio" style="font-size: 13px; color: var(--perigo); padding: 10px;">Erro ao carregar o histórico.</p>';
    }
};

window.baixarBackupNuvem = async function(id) {
    if (!window.usuarioLogado) return;
    const uid = window.usuarioLogado.uid;
    try {
        const doc = await dbFirestore.collection('users').doc(uid).collection('backups').doc(id).get();
        if (doc.exists) {
            const bkp = doc.data();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(bkp.dados);
            const downloadNode = document.createElement('a');
            downloadNode.setAttribute("href", dataStr);
            const nomeSeguro = bkp.data.replace(/[\/ :]/g, '-');
            downloadNode.setAttribute("download", `EcoFinance_Backup_${nomeSeguro}.json`);
            document.body.appendChild(downloadNode);
            downloadNode.click();
            downloadNode.remove();
        }
    } catch (error) { alert("Erro ao gerar o download."); }
};

window.restaurarBackupNuvem = async function(id) {
    const msg = "Atenção: Os dados do seu painel serão substituídos por este backup da nuvem. Continuar?";
    if (confirm(msg)) {
        if (!window.usuarioLogado) return;
        const uid = window.usuarioLogado.uid;
        try {
            const doc = await dbFirestore.collection('users').doc(uid).collection('backups').doc(id).get();
            if (doc.exists) {
                const bkp = doc.data();
                efetivarRestauracaoFirebase(JSON.parse(bkp.dados));
            } else { alert("Erro: Arquivo não encontrado no servidor."); }
        } catch (error) { alert("Erro ao buscar o backup."); }
    }
};

window.excluirBackupNuvem = async function(id) {
    if (confirm("Deseja apagar este backup da NUVEM definitivamente?")) {
        if (!window.usuarioLogado) return;
        const uid = window.usuarioLogado.uid;
        try {
            await dbFirestore.collection('users').doc(uid).collection('backups').doc(id).delete();
            renderizarListaBackups();
            if (typeof showToast === 'function') showToast("Backup apagado!", "exclusao");
        } catch (error) { alert("Erro ao apagar o backup."); }
    }
};

window.importarArquivoJSON = function(event) {
    const file = event.target.files[0]; 
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let importedDB = JSON.parse(e.target.result);
            if (typeof importedDB === 'string') importedDB = JSON.parse(importedDB); // Anti-envelope duplo

            if (importedDB && Array.isArray(importedDB.contas)) {
                efetivarRestauracaoFirebase(importedDB);
                event.target.value = ''; 
            } else { 
                alert("Arquivo inválido. O sistema não encontrou as contas neste arquivo."); 
            }
        } catch (err) { 
            alert("Erro ao ler o arquivo. Certifique-se de que é um backup válido .json"); 
        }
    };
    reader.readAsText(file);
};

window.confirmarReset = function() {
    const msg = "PERIGO: Isso apagará TODOS os dados desta conta. Continuar?";
    const acaoApagar = () => { 
        efetivarRestauracaoFirebase({ contas: [], categorias: [], lancamentos: [], faturas: [], salarios: [], contratos: [] });
    };
    if (typeof abrirConfirmacao === 'function') abrirConfirmacao(msg, acaoApagar); 
    else if (confirm(msg)) acaoApagar();
};

async function efetivarRestauracaoFirebase(dadosImportados) {
    try {
        // Injeta os dados forçadamente na memória
        try { db = dadosImportados; } catch(e) { window.db = dadosImportados; }
        
        // Empurra pra nuvem via core.js
        if (typeof save === 'function') await save(); 

        if (typeof render === 'function') render();
        if (typeof renderHistorico === 'function') renderHistorico();
        if (typeof fecharModalSistema === 'function') fecharModalSistema();
        
        if (typeof showToast === 'function') showToast("Painel atualizado e sincronizado!", "sucesso");
        else alert("Painel restaurado com sucesso!");

    } catch (error) {
        console.error("Erro ao sincronizar restauração:", error);
        alert("Falha na sincronização. Verifique sua conexão.");
    }
}

// ----------------------------------------------------
// TRANSFERÊNCIA EXPRESSA (ECOSHARE)
// ----------------------------------------------------
window.gerarCodigoTransferencia = async function() {
    if (!window.usuarioLogado) return alert("Precisa estar logado para gerar um código.");
    
    const bancoDados = obterDadosSeguros();

    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    const transferData = {
        codigo: codigo,
        dados: JSON.stringify(bancoDados),
        criadoEm: new Date().getTime(),
        dono: window.usuarioLogado.uid
    };

    const btn = event.target;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
    btn.disabled = true;

    try {
        await dbFirestore.collection('transfers').doc(codigo).set(transferData);
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Código Gerado!',
                html: `Vá na outra conta, clique em <b>Usar Código</b> e digite:<br><br><b style="font-size: 32px; letter-spacing: 6px; color: var(--azul); background: var(--input-bg); padding: 10px 20px; border-radius: 12px; border: 1px dashed var(--linha); display: inline-block;">${codigo}</b><br><br><small style="color: var(--texto-sec);">Este código é de uso único e expira em breve.</small>`,
                icon: 'success',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#3b82f6'
            });
        } else {
            prompt("Seu código de transferência foi gerado! Copie o código abaixo:", codigo);
        }
    } catch(error) {
        console.error("Erro ao gerar código:", error);
        alert("Falha na conexão. Tente novamente.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};

window.importarPorCodigo = async function() {
    if (!window.usuarioLogado) return alert("Precisa estar logado para usar um código.");

    let codigoDigitado;
    
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Resgatar Backup',
            text: 'Digite o código de 6 dígitos gerado no outro dispositivo:',
            input: 'text',
            inputAttributes: { maxlength: 6, style: 'text-transform: uppercase; text-align: center; font-size: 24px; letter-spacing: 4px;' },
            showCancelButton: true,
            confirmButtonText: 'Resgatar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981'
        });
        if (!result.isConfirmed || !result.value) return;
        codigoDigitado = result.value;
    } else {
        codigoDigitado = prompt("Digite o código de 6 dígitos:");
        if (!codigoDigitado) return;
    }

    const codigoTratado = codigoDigitado.trim().toUpperCase();
    if (codigoTratado.length !== 6) return alert("O código deve ter exatamente 6 caracteres.");

    try {
        if (typeof showToast === 'function') showToast("Buscando dados na nuvem...", "ajuste");

        const doc = await dbFirestore.collection('transfers').doc(codigoTratado).get();
        
        if (doc.exists) {
            const data = doc.data();
            const bancoImportado = JSON.parse(data.dados);

            const confirmar = confirm("Encontramos os dados! Deseja substituir seu painel atual por este backup?");
            if (confirmar) {
                await efetivarRestauracaoFirebase(bancoImportado);
                await dbFirestore.collection('transfers').doc(codigoTratado).delete(); // Apaga o código após uso
                
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ title: 'Transferência Concluída!', text: 'Seus dados foram sincronizados com sucesso.', icon: 'success', confirmButtonColor: '#10b981' });
                }
            }
        } else {
            alert("Código inválido, expirado ou já utilizado.");
        }
    } catch(error) {
        alert("Ocorreu um erro ao verificar o código.");
    }
};

// ----------------------------------------------------
// 3. NAVEGAÇÃO E FILTROS DE INTERFACE
// ----------------------------------------------------
window.navegar = function(idSecao, elemento) {
    document.querySelectorAll('.secao-app').forEach(s => s.classList.remove('active'));
    const secaoAlvo = document.getElementById('aba-' + idSecao);
    if (secaoAlvo) secaoAlvo.classList.add('active');
    if (elemento) { document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active')); elemento.classList.add('active'); }
    window.scrollTo({top: 0, behavior: 'smooth'});
    if (idSecao === 'dashboard' && typeof window.iniciarCarrosselBI === 'function') { window.iniciarCarrosselBI(); window.iniciarCarrosselRadar(); }
};

window.irParaExtrato = function() {
    if (typeof fecharNotificacoes === 'function') fecharNotificacoes();
    window.navegar('historico');
    document.querySelectorAll('#menu-lateral .menu-item').forEach(el => el.classList.remove('active'));
    let itens = document.querySelectorAll('#menu-lateral .menu-item'); if (itens.length >= 3) itens[2].classList.add('active');
};

window.irParaFaturas = function() {
    window.navegar('faturas');
    document.querySelectorAll('#menu-lateral .menu-item').forEach(el => el.classList.remove('active'));
    let itens = document.querySelectorAll('#menu-lateral .menu-item'); if (itens.length >= 2) itens[1].classList.add('active');
};

window.toggleNovaContaArea = function() { const div = document.getElementById('area-nova-conta'); if (div) div.style.display = div.style.display === 'none' ? 'block' : 'none'; };

window.mudarFiltroStatus = function(status, elemento) {
    const inputStatus = document.getElementById('filtro-status'); if (inputStatus) inputStatus.value = status;
    document.querySelectorAll('.status-btn').forEach(btn => { btn.classList.remove('active'); btn.style.background = 'var(--input-bg)'; btn.style.color = 'var(--texto-sec)'; btn.style.border = '1px solid var(--linha)'; });
    if (elemento) { elemento.classList.add('active'); elemento.style.background = 'var(--azul)'; elemento.style.color = '#fff'; elemento.style.border = 'none'; }
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
};

window.mudarFiltroCategoriaExtrato = function(cat) {
    const inputCat = document.getElementById('filtro-cat'); if (inputCat) inputCat.value = cat;
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
};

window.mudarMesFiltro = function(delta) {
    const input = document.getElementById('filtro-mes'); if (!input) return;
    let val = input.value; if (!val) val = new Date().toISOString().substring(0,7);
    let [ano, mes] = val.split('-').map(Number); mes += delta;
    if (mes > 12) { mes = 1; ano += 1; } else if (mes < 1) { mes = 12; ano -= 1; }
    input.value = `${ano}-${mes.toString().padStart(2, '0')}`;
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
    if (typeof window.renderGrafico === 'function') window.renderGrafico();
};

// ----------------------------------------------------
// 4. LÓGICA DE EDIÇÃO DE LANÇAMENTOS (UNIFICADA)
// ----------------------------------------------------
window.idLancamentoEdicaoAtual = null;

window.fecharModalEdicaoLancamento = function() {
    const m = document.getElementById('modal-edicao-lancamento');
    if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); }
    window.idLancamentoEdicaoAtual = null;
};

window.abrirModalEdicaoLancamento = function(id) {
    const bancoLocal = obterDadosSeguros();
    const l = (bancoLocal.lancamentos || []).find(x => String(x.id) === String(id));
    if (!l) return;

    if (l.efetivado) {
        let bloqueado = true;
        const c = (bancoLocal.contas || []).find(acc => String(acc.id) === String(l.contaId));
        if (c && c.tipo === 'cartao') {
            let mesFat = "";
            if (l.data) {
                const [anoStr, mesStr, diaStr] = l.data.split('T')[0].split('-');
                let anoF = parseInt(anoStr, 10); let mesF = parseInt(mesStr, 10); let diaF = parseInt(diaStr, 10);
                let diaFech = parseInt(c.fechamento, 10) || 1;
                if (diaF >= diaFech) { mesF += 1; if (mesF > 12) { mesF = 1; anoF += 1; } }
                mesFat = `${anoF}-${mesF.toString().padStart(2, '0')}`;
            }
            if (mesFat && !(bancoLocal.faturasPagas || []).includes(`${c.id}-${mesFat}`)) bloqueado = false; 
        }
        
        if (bloqueado) {
            if(typeof showToast === 'function') showToast("Reabra o lançamento antes de editar.", "alerta");
            else alert("Bloqueado: Para evitar erros de saldo, reabra este lançamento antes de editá-lo.");
            return;
        }
    }

    window.idLancamentoEdicaoAtual = id;

    const descEl = document.getElementById('edit-modal-desc'); const valorEl = document.getElementById('edit-modal-valor');
    const dataEl = document.getElementById('edit-modal-data'); const catEl = document.getElementById('edit-modal-cat'); const contaEl = document.getElementById('edit-modal-conta');

    if(descEl) descEl.value = l.desc || '';
    if(valorEl) valorEl.value = parseFloat(l.valor || 0).toFixed(2).replace('.', ',');
    if(dataEl) dataEl.value = l.data || '';

    if(catEl) catEl.innerHTML = '<option value="">Outros</option>' + (bancoLocal.categorias || []).map(cat => `<option value="${cat.nome}" ${l.cat === cat.nome ? 'selected' : ''}>${cat.icone || ''} ${cat.nome}</option>`).join('');
    if(contaEl) contaEl.innerHTML = (bancoLocal.contas || []).map(acc => `<option value="${acc.id}" ${String(l.contaId) === String(acc.id) ? 'selected' : ''}>${acc.nome}</option>`).join('');

    const m = document.getElementById('modal-edicao-lancamento');
    if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); }
};

window.salvarEdicaoLancamentoModal = function() {
    if (!window.idLancamentoEdicaoAtual) return;
    const bancoLocal = obterDadosSeguros();
    const l = bancoLocal.lancamentos.find(x => String(x.id) === String(window.idLancamentoEdicaoAtual));
    if (!l) return;

    l.desc = document.getElementById('edit-modal-desc').value;
    l.valor = parseFloat(document.getElementById('edit-modal-valor').value.replace(/\./g, '').replace(',', '.')) || 0;
    l.data = document.getElementById('edit-modal-data').value;
    l.cat = document.getElementById('edit-modal-cat').value;
    l.contaId = document.getElementById('edit-modal-conta').value;
    
    if(typeof save === 'function') save();
    fecharModalEdicaoLancamento();
    if (typeof showToast === 'function') showToast("Lançamento atualizado!", "sucesso");
    
    if (typeof render === 'function') render();
    if (typeof renderHistorico === 'function') renderHistorico();
};

// ----------------------------------------------------
// 5. EFETIVAÇÃO E CÁLCULO DE SALDO (UNIFICADO)
// ----------------------------------------------------
window.toggleEfetivado = function(id) {
    const bancoLocal = obterDadosSeguros();
    const l = (bancoLocal.lancamentos || []).find(x => String(x.id) === String(id));
    if (!l) return;

    const isReceita = (window.ecoTiposReceita && window.ecoTiposReceita.includes(l.tipo)) || (typeof T_RECEITAS !== 'undefined' && T_RECEITAS.includes(l.tipo)) || l.tipo === 'salario';
    const isDespesa = (window.ecoTiposDespesa && window.ecoTiposDespesa.includes(l.tipo)) || (typeof T_DESPESAS !== 'undefined' && T_DESPESAS.includes(l.tipo)) || (!isReceita && (l.fixo || l.parcelas || l.tipo === 'conta_fixa'));

    const conta = (bancoLocal.contas || []).find(c => String(c.id) === String(l.contaId));
    l.efetivado = !l.efetivado;

    if (l.efetivado && ['salario', 'outras_receitas', 'compensacao'].includes(l.tipo)) l.tipo = 'receita'; 

    if (conta && conta.tipo !== 'cartao') {
        let valorNum = parseFloat(l.valor) || 0;
        if (l.efetivado) {
            if (isReceita) conta.saldo += valorNum;
            else if (isDespesa) conta.saldo -= valorNum;
        } else {
            if (isReceita) conta.saldo -= valorNum;
            else if (isDespesa) conta.saldo += valorNum;
        }
    }

    if (typeof save === 'function') save();
    if (typeof showToast === 'function') showToast(l.efetivado ? "✅ Efetivado!" : "⏳ Marcado como pendente.", "sucesso");
    if (typeof render === 'function') render(); 
    if (typeof renderHistorico === 'function') renderHistorico();
};

// ----------------------------------------------------
// 6. INICIALIZAÇÃO VISUAL (POP-UPS E OBSERVERS)
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const obsNotificacoes = new MutationObserver(() => {
        const notifTexts = document.querySelectorAll('#lista-notificacoes, .notificacao-card, .drawer-body');
        notifTexts.forEach(el => {
            if (el.innerHTML.includes('em 1 dias')) el.innerHTML = el.innerHTML.replace(/em 1 dias/g, '<b>amanhã</b>');
            if (el.innerHTML.includes('em 0 dias')) el.innerHTML = el.innerHTML.replace(/em 0 dias/g, '<b>hoje</b>');
            if (el.innerHTML.includes('-1 dias')) el.innerHTML = el.innerHTML.replace(/-1 dias/g, '<b>ontem</b>');
        });
    });
    const gavetaNotificacoes = document.getElementById('gaveta-notificacoes');
    if (gavetaNotificacoes) obsNotificacoes.observe(gavetaNotificacoes, { childList: true, subtree: true });

    setTimeout(() => {
        const bancoLocal = obterDadosSeguros();
        const hojeObj = new Date();
        const strHoje = `${hojeObj.getFullYear()}-${(hojeObj.getMonth()+1).toString().padStart(2,'0')}-${hojeObj.getDate().toString().padStart(2,'0')}`;
        const vencendoHoje = (bancoLocal.lancamentos || []).filter(l => l.data === strHoje && !l.efetivado && (l.tipo === 'despesa' || l.tipo === 'despesas_gerais' || l.fixa || l.parcelas));

        if (vencendoHoje.length > 0) {
            const popupAviso = document.createElement('div');
            popupAviso.className = 'modal-overlay active';
            popupAviso.style.cssText = 'display:flex; z-index:9999999;';
            let htmlContas = vencendoHoje.map(c => `<div style="background:var(--input-bg); padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid var(--perigo);"><div><strong style="font-size:13px; color:var(--texto-main); display:block;">${c.desc}</strong><small style="color:var(--texto-sec); font-size:11px;">Vence Hoje!</small></div><strong style="color:var(--perigo); font-size:14px;">R$ ${parseFloat(c.valor).toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></div>`).join('');
            popupAviso.innerHTML = `<div class="modal-content" style="max-width: 320px; text-align: center;"><div style="font-size: 40px; color: var(--perigo); margin-bottom: 10px;"><i class="fas fa-calendar-times"></i></div><h3 style="margin-bottom: 5px; color: var(--texto-main);">Contas Vencendo Hoje</h3><p style="font-size: 12px; color: var(--texto-sec); margin-bottom: 15px;">Você tem ${vencendoHoje.length} lançamento(s) pendente(s) hoje.</p><div style="text-align:left; max-height:150px; overflow-y:auto; margin-bottom:15px;">${htmlContas}</div><div class="flex-between"><button class="btn-outline" style="width:48%" onclick="this.parentElement.parentElement.parentElement.remove()">Fechar</button><button class="btn-primary" style="width:48%; background:var(--perigo);" onclick="this.parentElement.parentElement.parentElement.remove(); document.getElementById('filtro-status').value = 'em_aberto'; navegar('historico'); document.querySelector('.menu-item:nth-child(3)').classList.add('active'); if(typeof renderHistorico === 'function') renderHistorico();">Ir para Extrato</button></div></div>`;
            document.body.appendChild(popupAviso);
        }
    }, 1500);

    document.querySelectorAll('.carrossel-wrapper').forEach(wrapper => {
        let startX = 0; let finalX = 0;
        wrapper.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive: true});
        wrapper.addEventListener('touchmove', e => { finalX = e.touches[0].clientX; }, {passive: true});
        wrapper.addEventListener('touchend', e => {
            const diff = startX - finalX;
            if (Math.abs(diff) > 40) { 
                const slides = wrapper.querySelectorAll('.carrossel-slide');
                if (slides.length < 2) return;
                let idxAtual = Array.from(slides).findIndex(s => s.classList.contains('active'));
                slides[idxAtual].classList.remove('active');
                if (diff > 0) idxAtual = (idxAtual + 1) % slides.length; else idxAtual = (idxAtual - 1 + slides.length) % slides.length;
                slides[idxAtual].classList.add('active');
            }
        });
    });
    
    setTimeout(() => {
        const modalEdicao = document.getElementById('modal-edicao-lancamento');
        if (modalEdicao) {
            const btnFecharX = modalEdicao.querySelector('.modal-header .btn-icon'); const btnCancelar = modalEdicao.querySelector('.btn-outline');
            if (btnFecharX) btnFecharX.onclick = window.fecharModalEdicaoLancamento; if (btnCancelar) btnCancelar.onclick = window.fecharModalEdicaoLancamento;
        }
    }, 500);
});