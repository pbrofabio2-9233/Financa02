// Registra o plugin de texto no Gráfico
Chart.register(ChartDataLabels);

let db = JSON.parse(localStorage.getItem('ecoDB_v23')) || {
    contas: [
        { id: 'c_padrao_mov', nome: 'Conta Padrão', tipo: 'movimentacao', saldo: 0, cor: '#2980b9' },
        { id: 'c_padrao_inv', nome: 'Poupança', tipo: 'investimento', saldo: 0, cor: '#27ae60' },
        { id: 'c_padrao_cred', nome: 'Cartão Padrão', tipo: 'cartao', meta: 1000, limite: 3000, fechamento: 5, vencimento: 10, cor: '#8a05be' }
    ],
    lancamentos: [],
    faturasPagas: []
};

let cartaoAtivoFatura = null;
let meuGrafico = null;
let contaDestinoImportacao = null; // Armazena qual conta receberá o extrato

const mesesTexto = {'01':'Janeiro', '02':'Fevereiro', '03':'Março', '04':'Abril', '05':'Maio', '06':'Junho', '07':'Julho', '08':'Agosto', '09':'Setembro', '10':'Outubro', '11':'Novembro', '12':'Dezembro'};

window.onload = () => {
    if (localStorage.getItem('ecoTheme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('btn-theme').classList.replace('fa-moon', 'fa-sun');
    }
    const hoje = new Date();
    document.getElementById('lanc-data').valueAsDate = hoje;
    document.getElementById('filtro-mes').value = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    populaSelectContas();
    atualizarRegrasLancamento();
    render();
};

// --- IMPORTAÇÃO DE EXTRATOS (OFX / CSV) ---

function abrirImportador(contaId) {
    contaDestinoImportacao = contaId;
    document.getElementById('file-import-ofx').click();
}

async function processarArquivoExtrato(event) {
    const file = event.target.files[0];
    if (!file || !contaDestinoImportacao) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const conteudo = e.target.result;
        if (file.name.toLowerCase().endsWith('.ofx')) {
            parseOFX(conteudo);
        } else if (file.name.toLowerCase().endsWith('.csv')) {
            parseCSV(conteudo);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Limpa o input
}

function parseOFX(data) {
    const transacoes = [];
    // Regex simples para capturar blocos de transação STMTTRN
    const blocos = data.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g);

    if (!blocos) {
        alert("Não encontramos transações válidas neste arquivo OFX.");
        return;
    }

    blocos.forEach(bloco => {
        const valor = parseFloat(bloco.match(/<TRNAMT>(.*)/)[1].replace(',', '.'));
        const dataOfx = bloco.match(/<DTPOSTED>(.*)/)[1]; // formato YYYYMMDD...
        const desc = bloco.match(/<MEMO>(.*)/) ? bloco.match(/<MEMO>(.*)/)[1] : (bloco.match(/<NAME>(.*)/) ? bloco.match(/<NAME>(.*)/)[1] : "Importado");
        
        const dataFormatada = `${dataOfx.substring(0,4)}-${dataOfx.substring(4,6)}-${dataOfx.substring(6,8)}`;
        
        transacoes.push({
            data: dataFormatada,
            valor: Math.abs(valor),
            tipo: valor < 0 ? 'despesa' : 'receita',
            desc: desc.trim()
        });
    });

    finalizarImportacao(transacoes);
}

function parseCSV(data) {
    const linhas = data.split('\n');
    const transacoes = [];
    
    // Pula cabeçalho se houver e tenta processar (Assumindo Data, Valor, Descrição)
    linhas.forEach(linha => {
        const cols = linha.split(',');
        if (cols.length >= 3) {
            const valor = parseFloat(cols[1].replace('"', '').replace(',', '.'));
            if (!isNaN(valor)) {
                transacoes.push({
                    data: cols[0].replace('"', ''), // Ajustar conforme o banco
                    valor: Math.abs(valor),
                    tipo: valor < 0 ? 'despesa' : 'receita',
                    desc: cols[2].replace('"', '')
                });
            }
        }
    });
    finalizarImportacao(transacoes);
}

function finalizarImportacao(novosLancamentos) {
    const conta = db.contas.find(c => c.id === contaDestinoImportacao);
    let adicionados = 0;
    let duplicados = 0;

    novosLancamentos.forEach(novo => {
        // Verifica se já existe um lançamento idêntico para evitar duplicidade
        const existe = db.lancamentos.find(l => 
            l.contaId === conta.id && 
            l.data === novo.data && 
            l.valor === novo.valor && 
            l.desc === novo.desc
        );

        if (!existe) {
            const id = Date.now() + Math.random();
            db.lancamentos.push({
                id,
                data: novo.data,
                tipo: novo.tipo,
                contaId: conta.id,
                forma: conta.tipo === 'cartao' ? 'Crédito' : 'Pix',
                desc: novo.desc,
                valor: novo.valor,
                cat: 'Outros'
            });

            if (conta.tipo !== 'cartao') {
                if (novo.tipo === 'receita') conta.saldo += novo.valor;
                else conta.saldo -= novo.valor;
            }
            adicionados++;
        } else {
            duplicados++;
        }
    });

    save();
    alert(`Importação concluída!\n✅ ${adicionados} novos lançamentos.\n⚠️ ${duplicados} duplicados ignorados.`);
    contaDestinoImportacao = null;
}

// --- FUNÇÕES DE INTERFACE ---

function toggleDarkMode() {
    const body = document.body;
    const icone = document.getElementById('btn-theme');
    body.classList.toggle('dark-mode');
    localStorage.setItem('ecoTheme', body.classList.contains('dark-mode') ? 'dark' : 'light');
    icone.classList.replace(body.classList.contains('dark-mode') ? 'fa-moon' : 'fa-sun', body.classList.contains('dark-mode') ? 'fa-sun' : 'fa-moon');
    renderGrafico();
}

function navegar(idAba, el) {
    document.querySelectorAll('.secao-app').forEach(s => s.classList.remove('active'));
    document.getElementById('aba-' + idAba).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('titulo-aba').innerText = el.querySelector('span').innerText;
    if(idAba === 'historico') renderHistorico();
    render();
}

function toggleAccordion(id) { document.getElementById(id).classList.toggle('active'); }
function toggleCamposCartao() { document.getElementById('campos-cartao-add').style.display = document.getElementById('nova-conta-tipo').value === 'cartao' ? 'block' : 'none'; }
function toggleFatura(id) { document.getElementById(id).classList.toggle('show'); }
function toggleEditConta(id) { document.getElementById(`form-edit-${id}`).classList.toggle('active'); }
function toggleEditLancamento(id) { document.getElementById(`edit-lanc-${id}`).classList.toggle('active'); }

function save() { localStorage.setItem('ecoDB_v23', JSON.stringify(db)); render(); }

// --- LOGICA FINANCEIRA ---

function adicionarLancamento() {
    const data = document.getElementById('lanc-data').value;
    const tipo = document.getElementById('lanc-tipo').value;
    const contaId = document.getElementById('lanc-conta').value;
    const desc = document.getElementById('lanc-desc').value;
    const valor = parseFloat(document.getElementById('lanc-valor').value);
    const cat = document.getElementById('lanc-cat').value;

    if(!desc || isNaN(valor) || !data) return alert("Preencha tudo.");

    const conta = db.contas.find(c => c.id === contaId);
    if (conta.tipo !== 'cartao') {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(tipo)) conta.saldo += valor;
        else if (['despesa', 'emp_concedido'].includes(tipo)) conta.saldo -= valor;
    }

    db.lancamentos.push({ id: Date.now(), data, tipo, contaId, desc, valor, cat, forma: document.getElementById('lanc-forma').value });
    save(); alert("Lançamento salvo!");
    document.getElementById('lanc-desc').value = ""; document.getElementById('lanc-valor').value = "";
}

function criarConta() {
    const nome = document.getElementById('nova-conta-nome').value;
    const tipo = document.getElementById('nova-conta-tipo').value;
    if(!nome) return;
    const nova = { id: 'c_'+Date.now(), nome, tipo, cor: document.getElementById('nova-conta-cor').value, saldo: 0 };
    if(tipo==='cartao'){
        nova.limite = parseFloat(document.getElementById('nova-conta-limite').value)||0;
        nova.meta = parseFloat(document.getElementById('nova-conta-meta').value)||0;
        nova.fechamento = parseInt(document.getElementById('nova-conta-fecha').value)||5;
        nova.vencimento = parseInt(document.getElementById('nova-conta-venc').value)||10;
    }
    db.contas.push(nova); save(); populaSelectContas();
}

// --- RENDERIZAÇÃO ---

function render() {
    const hoje = new Date();
    const mesCorrente = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    let calc = { despesas: 0, receitas: 0, fatAberta: 0, fatFechada: 0, saldoLivre: 0, investido: 0, usoMetaCartao: 0, metaTotalCartao: 0 };

    db.contas.forEach(c => {
        if(c.tipo === 'movimentacao') calc.saldoLivre += c.saldo;
        if(c.tipo === 'investimento') calc.investido += c.saldo;
        if(c.tipo === 'cartao') calc.metaTotalCartao += c.meta;
    });

    db.lancamentos.forEach(l => {
        const conta = db.contas.find(c => c.id === l.contaId);
        if(!conta) return;
        if (l.data.substring(0,7) === mesCorrente) {
            if (l.tipo === 'despesa') calc.despesas += l.valor;
            if (l.tipo === 'receita') calc.receitas += l.valor;
        }
        if (conta.tipo === 'cartao' && l.tipo === 'despesa') {
            // Lógica de fatura simplificada para o dash
            calc.fatAberta += l.valor;
            if (l.data.substring(0,7) === mesCorrente) calc.usoMetaCartao += l.valor;
        }
    });

    document.getElementById('dash-receitas').innerText = `R$ ${calc.receitas.toFixed(2)}`;
    document.getElementById('dash-despesas').innerText = `R$ ${calc.despesas.toFixed(2)}`;
    document.getElementById('dash-fat-aberta').innerText = `R$ ${calc.fatAberta.toFixed(2)}`;
    document.getElementById('dash-saldo-livre').innerText = `R$ ${calc.saldoLivre.toFixed(2)}`;
    document.getElementById('dash-investido').innerText = `R$ ${calc.investido.toFixed(2)}`;
    
    const pMeta = calc.metaTotalCartao > 0 ? (calc.usoMetaCartao / calc.metaTotalCartao) * 100 : 0;
    document.getElementById('meta-bar').style.width = Math.min(pMeta, 100) + "%";
    document.getElementById('uso-meta-texto').innerText = `R$ ${calc.usoMetaCartao.toFixed(2)} / R$ ${calc.metaTotalCartao.toFixed(2)}`;

    renderAbaContas(); renderGrafico();
}

function renderAbaContas() {
    const lista = document.getElementById('lista-contas-saldos');
    if(!lista) return;
    lista.innerHTML = `<h3><i class="fas fa-wallet"></i> Suas Contas</h3>`;
    db.contas.forEach(c => {
        lista.innerHTML += `
        <div class="conta-bloco">
            <div class="conta-resumo" style="border-left-color:${c.cor}" onclick="toggleFatura('det-c-${c.id}')">
                <div><strong>${c.nome}</strong><br><small>${c.tipo}</small></div>
                <div style="text-align:right;">
                    <b>R$ ${c.saldo.toFixed(2)}</b><br>
                    <button class="btn-import" onclick="event.stopPropagation(); abrirImportador('${c.id}')">
                        <i class="fas fa-file-import"></i> Importar Extrato
                    </button>
                </div>
            </div>
            <div id="det-c-${c.id}" class="conta-detalhes">
                <small>Últimos lançamentos aparecem no Histórico.</small>
            </div>
        </div>`;
    });
}

// (As demais funções de gráfico, histórico e backup permanecem as mesmas da v23.3 para manter estabilidade)
function renderGrafico() { /* ... código anterior ... */ }
function renderHistorico() { /* ... código anterior ... */ }
function populaSelectContas() {
    const select = document.getElementById('lanc-conta');
    select.innerHTML = db.contas.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}
function atualizarRegrasLancamento() {
    const forma = document.getElementById('lanc-forma');
    forma.innerHTML = `<option value="Pix">Pix</option><option value="Débito">Débito</option><option value="Dinheiro">Dinheiro</option><option value="Crédito">Crédito</option>`;
}
function exportarBackup() { /* ... código anterior ... */ }
function importarArquivoJSON(event) { /* ... código anterior ... */ }
function confirmarReset() { /* ... código anterior ... */ }