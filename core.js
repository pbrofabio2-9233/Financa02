// ==========================================
// CORE.JS - Banco de Dados, Inicialização e Memória (Otimizado)
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
    salarios: []
};

// Padronização Absoluta das Chaves de Memória (Evita duplicação de bancos)
const DB_KEY = 'eco_db';
const THEME_KEY = 'eco_tema';

function save() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function load() {
    // Sistema de Migração Inteligente: Puxa do banco velho (ecoDB) para o novo (eco_db) se necessário
    let saved = localStorage.getItem(DB_KEY);
    
    if (!saved) {
        saved = localStorage.getItem('ecoDB'); 
        if (saved) {
            localStorage.setItem(DB_KEY, saved); 
            localStorage.removeItem('ecoDB'); 
        }
    }

    if (saved) {
        try {
            let parsed = JSON.parse(saved);
            db = { ...db, ...parsed };
            
            // Garantia Estrutural (Evita o erro "Cannot read properties of undefined")
            if (!db.categorias) db.categorias = [];
            if (!db.faturasPagas) db.faturasPagas = [];
            if (!db.amortizacoesFaturas) db.amortizacoesFaturas = {};
            if (!db.recorrencias) db.recorrencias = [];
            if (!db.salarios) db.salarios = [];
            if (!db.lancamentos) db.lancamentos = [];
            if (!db.contas) db.contas = [];

            // Migração legado para o formato de múltiplos salários
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
                delete db.configSalario; 
                save();
            }
        } catch (err) {
            console.error("Erro Crítico ao ler o banco de dados:", err);
        }
    }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
load();

window.addEventListener('DOMContentLoaded', () => {
    // Validação e aplicação do tema no carregamento
    const temaAtual = localStorage.getItem(THEME_KEY) || 'light';
    document.body.classList.remove('dark-mode', 'ocean-mode');
    if (temaAtual === 'dark') document.body.classList.add('dark-mode');
    else if (temaAtual === 'ocean') document.body.classList.add('ocean-mode');

    // Inicia a renderização caso o arquivo UI já esteja pronto
    if (typeof render === 'function') render();
});
