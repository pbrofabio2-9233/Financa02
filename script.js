// Registra o plugin de texto no Gráfico
Chart.register(ChartDataLabels);

// Garantindo a persistência na v23 ou migrando para v24
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
let contaDestinoImportacao = null; 

const mesesTexto = {'01':'Janeiro', '02':'Fevereiro', '03':'Março', '04':'Abril', '05':'Maio', '06':'Junho', '07':'Julho', '08':'Agosto', '09':'Setembro', '10':'Outubro', '11':'Novembro', '12':'Dezembro'};

function formatarMesFatura(mesAnoStr) {
    const [ano, mes] = mesAnoStr.split('-');
    return `${mesesTexto[mes]} - ${ano}`;
}

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

// --- IMPORTAÇÃO DE EXTRATOS ---

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
        } else {
            alert("Por favor, selecione um arquivo .OFX (Extrato Bancário).");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

function parseOFX(data) {
    const transacoes = [];
    const blocos = data.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g);

    if (!blocos) {
        alert("Nenhuma transação encontrada no arquivo OFX.");
        return;
    }

    blocos.forEach(bloco => {
        const valorMatch = bloco.match(/<TRNAMT>(.*)/);
        const dataMatch = bloco.match(/<DTPOSTED>(.*)/);
        const descMatch = bloco.match(/<MEMO>(.*)/) || bloco.match(/<NAME>(.*)/);

        if (valorMatch && dataMatch) {
            const valor = parseFloat(valorMatch[1].replace(',', '.'));
            const d = dataMatch[1];
            const dataFormatada = `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}`;
            
            transacoes.push({
                data: dataFormatada,
                valor: Math.abs(valor),
                tipo: valor < 0 ? 'despesa' : 'receita',
                desc: descMatch ? descMatch[1].trim() : "Importado"
            });
        }
    });
    finalizarImportacao(transacoes);
}

function finalizarImportacao(novos) {
    const conta = db.contas.find(c => c.id === contaDestinoImportacao);
    let add = 0, dup = 0;

    novos.forEach(n => {
        const existe = db.lancamentos.find(l => 
            l.contaId === conta.id && l.data === n.data && l.valor === n.valor && l.desc === n.desc
        );

        if (!existe) {
            db.lancamentos.push({
                id: Date.now() + Math.random(),
                data: n.data,
                tipo: n.tipo,
                contaId: conta.id,
                forma: conta.tipo === 'cartao' ? 'Crédito' : 'Pix',
                desc: n.desc,
                valor: n.valor,
                cat: 'Outros'
            });
            if (conta.tipo !== 'cartao') {
                if (n.tipo === 'receita') conta.saldo += n.valor;
                else conta.saldo -= n.valor;
            }
            add++;
        } else { dup++; }
    });

    save();
    alert(`Sucesso!\n✅ ${add} importados\n⚠️ ${dup} duplicados ignorados`);
    contaDestinoImportacao = null;
}

// --- CORE ---

function save() { localStorage.setItem('ecoDB_v23', JSON.stringify(db)); render(); }

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
        if (conta.tipo === 'cartao') {
            const mesFat = getMesFatura(l.data, conta.fechamento);
            if (!db.faturasPagas.includes(`${conta.id}-${mesFat}`)) {
                calc.fatAberta += l.valor;
                if (mesFat === mesCorrente) calc.usoMetaCartao += l.valor;
            }
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

    renderAbaContas(); renderGrafico(); renderAbaFaturas(); renderAbaConfig();
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
                <small>Clique para ver detalhes (Em desenvolvimento)</small>
            </div>
        </div>`;
    });
}

// --- OUTRAS FUNÇÕES ---

function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('ecoTheme', isDark ? 'dark' : 'light');
    document.getElementById('btn-theme').classList.replace(isDark ? 'fa-moon' : 'fa-sun', isDark ? 'fa-sun' : 'fa-moon');
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

function populaSelectContas() {
    const s = document.getElementById('lanc-conta');
    s.innerHTML = db.contas.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}

function atualizarRegrasLancamento() {
    const f = document.getElementById('lanc-forma');
    f.innerHTML = `<option value="Pix">Pix</option><option value="Débito">Débito</option><option value="Crédito">Crédito</option>`;
}

function getMesFatura(data, fecha) {
    const parts = data.split('-');
    let y = parseInt(parts[0]), m = parseInt(parts[1]), d = parseInt(parts[2]);
    if (d >= fecha) { m++; if(m>12){m=1;y++;} }
    return `${y}-${m.toString().padStart(2,'0')}`;
}

// (Funções de Gráfico, Histórico e Configurações omitidas para brevidade, mas devem ser mantidas conforme v23.3)
function renderGrafico() { /* ... */ }
function renderHistorico() { /* ... */ }
function renderAbaFaturas() { /* ... */ }
function renderAbaConfig() { /* ... */ }
function adicionarLancamento() { /* ... */ }
function criarConta() { /* ... */ }
function exportarBackup() { /* ... */ }
function importarArquivoJSON(event) { /* ... */ }
function confirmarReset() { /* ... */ }