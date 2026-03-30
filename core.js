// ==========================================
// CORE.JS - Banco de Dados na Nuvem (Firestore) e Inicialização
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

const DB_KEY = 'eco_db';
const THEME_KEY = 'eco_tema';

// ==========================================
// NOVA FUNÇÃO SAVE (Manda para a Nuvem)
// ==========================================
async function save() {
    // Continua salvando um backup local por segurança
    localStorage.setItem(DB_KEY, JSON.stringify(db));

    // Se tiver um usuário logado, manda pro Firestore na "gaveta" dele
    if (window.usuarioLogado) {
        try {
            const uid = window.usuarioLogado.uid;
            // set() salva ou sobrescreve os dados no documento do usuário
            await dbFirestore.collection('users').doc(uid).set(db);
        } catch (error) {
            console.error("Erro ao salvar dados na nuvem:", error);
        }
    }
}

// ==========================================
// NOVA FUNÇÃO LOAD (Puxa da Nuvem)
// ==========================================
async function load() {
    // Se não houver usuário logado, não tenta carregar nada
    if (!window.usuarioLogado) return;

    try {
        const uid = window.usuarioLogado.uid;
        // Tenta puxar a "gaveta" de dados desse usuário específico
        const doc = await dbFirestore.collection('users').doc(uid).get();
        
        if (doc.exists) {
            // O usuário já tem dados na nuvem, vamos usá-los!
            let parsed = doc.data();
            db = { ...db, ...parsed };
        } else {
            // O usuário NÃO tem dados na nuvem (Conta Nova).
            // Vamos checar se ele tem dados locais antigos perdidos no PC dele.
            let savedLocal = localStorage.getItem(DB_KEY) || localStorage.getItem('ecoDB');
            
            if (savedLocal) {
                console.log("Migrando dados locais antigos para a nuvem...");
                let parsed = JSON.parse(savedLocal);
                db = { ...db, ...parsed };
            }
            
            // Salva na nuvem (seja o banco vazio padrão ou os dados locais migrados)
            await save();
        }

        // Garantia Estrutural (Evita o erro "Cannot read properties of undefined")
        if (!db.categorias) db.categorias = [];
        if (!db.faturasPagas) db.faturasPagas = [];
        if (!db.amortizacoesFaturas) db.amortizacoesFaturas = {};
        if (!db.recorrencias) db.recorrencias = [];
        if (!db.salarios) db.salarios = [];
        if (!db.lancamentos) db.lancamentos = [];
        if (!db.contas) db.contas = [];

        // Atualiza a tela do aplicativo agora que os dados chegaram da internet!
        if (typeof render === 'function') render();

    } catch (err) {
        console.error("Erro Crítico ao carregar o banco de dados da nuvem:", err);
        alert("Aviso: Não foi possível conectar ao banco de dados na nuvem. Verifique sua internet.");
    }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
// Atenção: Removemos o load() daqui. Quem vai chamar o load() agora é o Fiscal da Porta (auth.js)
// logo após confirmar que o usuário tem permissão para entrar.

window.addEventListener('DOMContentLoaded', () => {
    // Validação e aplicação do tema no carregamento
    const temaAtual = localStorage.getItem(THEME_KEY) || 'light';
    document.body.classList.remove('dark-mode', 'ocean-mode');
    if (temaAtual === 'dark') document.body.classList.add('dark-mode');
    else if (temaAtual === 'ocean') document.body.classList.add('ocean-mode');
});