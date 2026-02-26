// ==========================================
// CORE.JS - Banco de Dados e Estado Global
// ==========================================

// Registra o plugin de texto no Gráfico (Chart.js)
if (typeof Chart !== 'undefined') {
    Chart.register(ChartDataLabels);
}

// Estrutura de Meses para formatação
const mesesTexto = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'};
function formatarMesFatura(mesAnoStr) { 
    const [ano, mes] = mesAnoStr.split('-'); 
    return `${mesesTexto[mes]} - ${ano}`; 
}

// Inicialização e Leitura do Banco de Dados Local
let dbAntigo = JSON.parse(localStorage.getItem('ecoDB_v25')) || JSON.parse(localStorage.getItem('ecoDB_v23')) || {};

// Estrutura Principal de Dados
let db = {
    contas: dbAntigo.contas || [
        { id: 'c_padrao_mov', nome: 'Conta Padrão', tipo: 'movimentacao', saldo: 0, cor: '#2563eb' }, // Azul Corporativo
        { id: 'c_padrao_inv', nome: 'Poupança', tipo: 'investimento', saldo: 0, cor: '#10b981' }, // Verde Esmeralda
        { id: 'c_padrao_cred', nome: 'Cartão Padrão', tipo: 'cartao', meta: 1000, limite: 3000, fechamento: 5, vencimento: 10, cor: '#6366f1' } // Índigo
    ],
    lancamentos: (dbAntigo.lancamentos || []).map(l => ({...l, efetivado: l.efetivado !== false})),
    faturasPagas: dbAntigo.faturasPagas || [],
    recorrencias: dbAntigo.recorrencias || [] 
};

// Variáveis Globais de Estado (Controle de Interface)
let cartaoAtivoFatura = null;
let meuGrafico = null;
let meuGraficoEvolucao = null;
let tempLancamentoEmprestimo = null; // Armazena temporariamente os dados para o Modal de Parcelamento

// Função Central de Salvamento
function save() { 
    localStorage.setItem('ecoDB_v25', JSON.stringify(db)); 
    // A função render() será definida no ui.js, ela atualiza toda a tela
    if(typeof render === 'function') {
        render(); 
    }
}
