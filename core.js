// ==========================================
// CORE.JS - Banco de Dados e Inicialização (v26.0.3 - Múltiplos Salários e Contratos)
// ==========================================

let db = {
    contas: [],
    lancamentos: [],
    categorias: [
        { id: 'cat_1', nome: 'Alimentação', icone: '🍔', cor: '#ef4444', fixa: false, tipo: 'despesa' },
        { id: 'cat_2', nome: 'Transporte', icone: '🚗', cor: '#f59e0b', fixa: false, tipo: 'despesa' },
        { id: 'cat_3', nome: 'Moradia', icone: '🏠', cor: '#3b82f6', fixa: true, tipo: 'despesa' },
        { id: 'cat_4', nome: 'Salário', icone: '💰', cor: '#10b981', fixa: true, tipo: 'receita' }
    ],
    faturasPagas: [],
    amortizacoesFaturas: {},
    recorrencias: [],
    salarios: [] // NOVO: Matriz de múltiplos salários com divisão de valores
};

function save() {
    localStorage.setItem('ecoDB', JSON.stringify(db));
}

function load() {
    const saved = localStorage.getItem('ecoDB');
    if (saved) {
        let parsed = JSON.parse(saved);
        db = { ...db, ...parsed };
        
        // Garante a existência das matrizes vitais
        if (!db.categorias) db.categorias = [];
        if (!db.faturasPagas) db.faturasPagas = [];
        if (!db.amortizacoesFaturas) db.amortizacoesFaturas = {};
        if (!db.recorrencias) db.recorrencias = [];
        if (!db.salarios) db.salarios = [];

        // Migração do usuário (se ele tinha a config antiga de salário, converte para o novo formato)
        if (db.configSalario) {
            if (db.configSalario.ativo) {
                db.salarios.push({
                    id: Date.now(),
                    nome: 'Salário Principal',
                    valorTotal: db.configSalario.valor,
                    frequencia: 'mensal',
                    dias: [db.configSalario.dia],
                    contaId: db.configSalario.contaId
                });
            }
            delete db.configSalario; // Limpa o velho
            save();
        }
    }
}

function exportarBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const date = new Date();
    const nomeArquivo = `EcoFinance_Backup_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}.json`;
    downloadAnchorNode.setAttribute("download", nomeArquivo);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    registrarBackupLocal(nomeArquivo);
}

function importarArquivoJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedDB = JSON.parse(e.target.result);
            if (importedDB && importedDB.contas && importedDB.lancamentos) {
                db = importedDB;
                save();
                alert("Backup restaurado com sucesso!");
                location.reload();
            } else {
                alert("Arquivo de backup inválido.");
            }
        } catch (err) {
            alert("Erro ao ler o arquivo.");
        }
    };
    reader.readAsText(file);
}

function confirmarReset() {
    if(confirm("ATENÇÃO: Isso apagará TODOS os seus dados. Tem certeza?")) {
        if(confirm("Última chance! Confirma a exclusão de tudo?")) {
            localStorage.removeItem('ecoDB');
            location.reload();
        }
    }
}

function registrarBackupLocal(nome) {
    let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || [];
    const dbString = JSON.stringify(db);
    const sizeKB = (new Blob([dbString]).size / 1024).toFixed(1) + ' KB';
    hist.unshift({ id: Date.now(), data: new Date().toLocaleString(), nome: nome, size: sizeKB, dados: dbString });
    if (hist.length > 5) hist.pop(); 
    localStorage.setItem('ecoDB_backups', JSON.stringify(hist));
    if (typeof renderAbaConfig === 'function') renderAbaConfig();
}

function restaurarBackupLocal(id) {
    if(!confirm("Deseja restaurar este backup? Os dados atuais serão substituídos.")) return;
    let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || [];
    const b = hist.find(x => x.id === id);
    if (b) {
        db = JSON.parse(b.dados);
        save();
        location.reload();
    }
}

function excluirBackupLocal(id) {
    if(!confirm("Excluir este backup histórico?")) return;
    let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || [];
    hist = hist.filter(x => x.id !== id);
    localStorage.setItem('ecoDB_backups', JSON.stringify(hist));
    if (typeof renderAbaConfig === 'function') renderAbaConfig();
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('ecoTheme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    if (typeof renderGrafico === 'function') renderGrafico();
    if (typeof renderGraficoEvolucao === 'function') renderGraficoEvolucao();
}

load();
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('ecoTheme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
    if (typeof render === 'function') render();
});
