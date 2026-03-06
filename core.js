// ==========================================
// CORE.JS - Banco de Dados e Funções Globais (v25.9.11 - Fix Backup Blob)
// ==========================================

let db = {
    contas: [],
    lancamentos: [],
    faturasPagas: [],
    amortizacoesFaturas: {},
    categorias: []
};

// Listas de tipos para referência na migração
const CORE_T_RECEITAS = ['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca', 'receita', 'emp_pessoal', 'compensacao'];
const CORE_T_DESPESAS = ['despesas_gerais', 'emprestei_dinheiro', 'pag_emprestimo', 'dep_poupanca', 'emprestei_cartao', 'despesa', 'emp_concedido', 'emp_cartao'];

function load() {
    const saved = localStorage.getItem('ecoDB');
    if (saved) {
        try {
            db = { ...db, ...JSON.parse(saved) };
        } catch (e) {
            console.error("Erro ao carregar banco de dados", e);
        }
    }
    migrarCategoriasAntigas();
}

function save() {
    localStorage.setItem('ecoDB', JSON.stringify(db));
}

function migrarCategoriasAntigas() {
    if (!db.categorias) db.categorias = [];
    
    const nomesCadastrados = db.categorias.map(c => c.nome.toLowerCase());
    let novasMigradas = 0;
    
    (db.lancamentos || []).forEach(l => {
        if (l.cat && !nomesCadastrados.includes(l.cat.toLowerCase())) {
            const isReceita = CORE_T_RECEITAS.includes(l.tipo);
            
            db.categorias.push({
                id: 'cat_mig_' + Date.now() + Math.floor(Math.random() * 1000),
                nome: l.cat, 
                icone: '📌', 
                cor: isReceita ? '#10b981' : '#64748b', 
                fixa: false,
                tipo: isReceita ? 'receita' : 'despesa'
            });
            
            nomesCadastrados.push(l.cat.toLowerCase());
            novasMigradas++;
        }
    });
    
    if (novasMigradas > 0) {
        console.log(`Sucesso: ${novasMigradas} categorias antigas foram resgatadas.`);
        save();
    }
}

function showToast(msg, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<i class="fas ${tipo === 'sucesso' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${msg}`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s forwards';
        setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
}

// --- FUNÇÕES DE BACKUP E RESET (AGORA COM TECNOLOGIA BLOB) ---

function exportarBackup() {
    save(); // Garante que tudo está salvo antes
    const dataStr = JSON.stringify(db, null, 2); // Formata bonitinho
    const blob = new Blob([dataStr], { type: "application/json" }); // Empacota sem limites
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    // Nome limpo: EcoBKP_20260310_1530.json
    const dataFormatada = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
    const nomeArquivo = `EcoBKP_${dataFormatada}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    
    // Limpeza de memória
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Salva histórico local
    let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || [];
    hist.unshift({ 
        id: Date.now(), 
        nome: nomeArquivo, 
        data: now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), 
        size: (blob.size / 1024).toFixed(1) + " KB", 
        dataObj: db 
    });
    if(hist.length > 5) hist.pop(); // Mantém os últimos 5
    localStorage.setItem('ecoDB_backups', JSON.stringify(hist));
    
    showToast("Backup gerado e salvo com sucesso!");
    if (typeof renderAbaConfig === 'function') renderAbaConfig();
}

function importarArquivoJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedDB = JSON.parse(e.target.result);
            // Trava de segurança: verifica se o arquivo é do EcoFinance
            if (importedDB && typeof importedDB === 'object' && importedDB.lancamentos) {
                db = { ...db, ...importedDB };
                save();
                showToast("Dados restaurados com sucesso!");
                setTimeout(() => location.reload(), 1500);
            } else {
                alert("O arquivo não possui o formato do EcoFinance.");
            }
        } catch (err) {
            alert("Arquivo inválido ou corrompido.");
        }
    };
    reader.readAsText(file);
}

function restaurarBackupLocal(id) {
    if(!confirm("Tem certeza? Isso vai substituir seus dados atuais pelos dados deste backup.")) return;
    let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || [];
    const b = hist.find(x => x.id === id);
    if(b && b.dataObj) {
        db = { ...db, ...b.dataObj };
        save();
        showToast("Backup restaurado!");
        setTimeout(() => location.reload(), 1500);
    }
}

function excluirBackupLocal(id) {
    if(!confirm("Excluir este backup local?")) return;
    let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || [];
    hist = hist.filter(x => x.id !== id);
    localStorage.setItem('ecoDB_backups', JSON.stringify(hist));
    if (typeof renderAbaConfig === 'function') renderAbaConfig();
    showToast("Backup removido.");
}

function confirmarReset() {
    if(confirm("ATENÇÃO EXTREMA: Isso vai apagar TODOS os seus dados, contas e lançamentos. Deseja continuar?")) {
        if(confirm("Tem certeza absoluta? Esta ação não pode ser desfeita!")) {
            localStorage.removeItem('ecoDB');
            localStorage.removeItem('ecoDB_backups'); // Limpa também o histórico de backups locais
            alert("Sistema resetado. O aplicativo será recarregado.");
            location.reload();
        }
    }
}

// Inicializa o banco ao carregar o arquivo
load();
