// ===== SUPABASE CONFIG =====
const SUPABASE_URL = 'https://nuuhkjuhlfiailmpxbit.supabase.co';
const SUPABASE_KEY = 'sb_publishable_69SlJA5oAyUNvA80DDpZ8Q_tKhDkp-s';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== ESTADO =====
let dados = [];
let refsTemp = [];

// ===== INIT =====
async function init() {
  mostrarLoading(true);
  await carregar();
  mostrarLoading(false);
  atualizarBadge();
}

function mostrarLoading(show) {
  const el = document.getElementById('loading');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ===== CARREGAR DO SUPABASE =====
async function carregar() {
  const { data, error } = await db
    .from('leads')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) {
    console.error(error);
    toast('Erro ao carregar dados: ' + error.message, '#DC2626');
    return;
  }
  dados = data || [];
}

// ===== NAVEGAÇÃO =====
function switchTab(tab) {
  document.querySelectorAll('.nav-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0 && tab === 'form') || (i === 1 && tab === 'list'));
  });
  document.getElementById('sec-form').classList.toggle('active', tab === 'form');
  document.getElementById('sec-list').classList.toggle('active', tab === 'list');
  if (tab === 'list') {
    mostrarLoading(true);
    carregar().then(() => {
      mostrarLoading(false);
      renderTabela();
      atualizarStats();
    });
  }
}

// ===== UTILS =====
function toast(msg, cor) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = cor || '#16A34A';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function atualizarBadge() {
  const b = document.getElementById('count-badge');
  b.textContent = dados.length > 0 ? `(${dados.length})` : '';
}

function atualizarStats() {
  document.getElementById('s-total').textContent  = dados.length;
  document.getElementById('s-quente').textContent = dados.filter(d => d.status === 'Quente').length;
  document.getElementById('s-morno').textContent  = dados.filter(d => d.status === 'Morno').length;
  document.getElementById('s-conv').textContent   = dados.filter(d => d.status === 'Convertido').length;
}

// ===== REFERÊNCIAS =====
function adicionarRef() {
  const inp = document.getElementById('f-ref-input');
  const val = inp.value.trim();
  if (!val) return;
  if (refsTemp.includes(val)) { toast('Referência já adicionada.', '#6B7280'); return; }
  refsTemp.push(val);
  inp.value = '';
  renderRefs();
}

function removerRef(ref) {
  refsTemp = refsTemp.filter(r => r !== ref);
  renderRefs();
}

function renderRefs() {
  document.getElementById('ref-list').innerHTML = refsTemp
    .map(r => `<span class="ref-tag">${r}<button onclick="removerRef('${r}')" title="Remover">×</button></span>`)
    .join('');
}

// ===== SALVAR =====
async function salvar() {
  const nome = document.getElementById('f-nome').value.trim();
  const tel  = document.getElementById('f-tel').value.trim();
  if (!nome || !tel) { toast('Nome e telefone são obrigatórios.', '#DC2626'); return; }

  const btn = document.querySelector('#sec-form .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const registro = {
    nome,
    tel,
    email:       document.getElementById('f-email').value.trim()       || null,
    cpf:         document.getElementById('f-cpf').value.trim()          || null,
    cidade:      document.getElementById('f-cidade').value.trim()       || null,
    tipo_imovel: document.getElementById('f-tipo-imovel').value,
    finalidade:  document.getElementById('f-finalidade').value,
    valor:       document.getElementById('f-valor').value,
    bairro:      document.getElementById('f-bairro').value.trim()       || null,
    quartos:     document.getElementById('f-quartos').value             || null,
    status:      document.getElementById('f-status').value,
    refs:        [...refsTemp],
    obs:         document.getElementById('f-obs').value.trim()          || null,
  };

  const { error } = await db.from('leads').insert([registro]);

  btn.disabled = false;
  btn.textContent = 'Salvar lead';

  if (error) {
    console.error(error);
    toast('Erro ao salvar: ' + error.message, '#DC2626');
    return;
  }

  ['f-nome','f-email','f-tel','f-cpf','f-cidade','f-bairro','f-obs'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f-quartos').value = '';
  document.getElementById('f-status').value  = 'Quente';
  refsTemp = [];
  renderRefs();

  await carregar();
  atualizarBadge();
  toast('Lead salvo no Supabase!');
}

// ===== DELETAR =====
async function deletar(id) {
  if (!confirm('Remover este lead?')) return;
  const { error } = await db.from('leads').delete().eq('id', id);
  if (error) { toast('Erro ao deletar: ' + error.message, '#DC2626'); return; }
  dados = dados.filter(d => d.id !== id);
  atualizarBadge();
  renderTabela();
  atualizarStats();
  toast('Lead removido.', '#6B7280');
}

// ===== TABELA =====
const statusBadge = s => {
  const map = { Quente:'b-quente', Morno:'b-morno', Frio:'b-frio', Convertido:'b-conv' };
  return `<span class="badge ${map[s] || 'b-frio'}">${s}</span>`;
};

function renderTabela() {
  const q = (document.getElementById('busca').value || '').toLowerCase();
  const filtrado = dados.filter(d =>
    d.nome.toLowerCase().includes(q) ||
    d.tel.includes(q) ||
    (d.email || '').toLowerCase().includes(q) ||
    (d.refs || []).some(r => r.toLowerCase().includes(q))
  );

  const tbody = document.getElementById('tbody');
  const empty = document.getElementById('empty-state');

  if (!filtrado.length) { tbody.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';

  tbody.innerHTML = filtrado.map(d => `
    <tr>
      <td><strong>${d.nome}</strong></td>
      <td>${d.tel}</td>
      <td>${d.tipo_imovel}</td>
      <td>${d.finalidade}</td>
      <td style="white-space:nowrap">${d.valor}</td>
      <td>${statusBadge(d.status)}</td>
      <td><div class="refs-cell">${
        (d.refs||[]).length
          ? d.refs.map(r=>`<span class="ref-mini">${r}</span>`).join('')
          : '—'
      }</div></td>
      <td style="white-space:nowrap">
        <button class="btn-ver"    onclick="verDetalhes(${d.id})">Ver</button>
        <button class="btn-pdf"    onclick="gerarPDF(${d.id})">PDF</button>
        <button class="btn-danger" onclick="deletar(${d.id})">Del</button>
      </td>
    </tr>`).join('');
}

// ===== MODAL =====
function verDetalhes(id) {
  const d = dados.find(x => x.id === id);
  if (!d) return;
  const dataFormatada = d.criado_em ? new Date(d.criado_em).toLocaleString('pt-BR') : '—';
  const rows = [
    ['Nome',            d.nome],
    ['Telefone',        d.tel],
    ['E-mail',          d.email         || '—'],
    ['CPF',             d.cpf           || '—'],
    ['Cidade',          d.cidade        || '—'],
    ['Tipo de imóvel',  d.tipo_imovel],
    ['Finalidade',      d.finalidade],
    ['Faixa de valor',  d.valor],
    ['Bairro / região', d.bairro        || '—'],
    ['Quartos',         d.quartos       || 'Indiferente'],
    ['Status',          d.status],
    ['Referências',     (d.refs||[]).length ? d.refs.join(', ') : '—'],
    ['Observações',     d.obs           || '—'],
    ['Cadastrado em',   dataFormatada],
  ];
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-header">
      <strong>${d.nome}</strong>
      <button class="modal-close" onclick="fecharModal()">×</button>
    </div>
    ${rows.map(([l,v]) => `<div class="detail-row"><span>${l}</span><span>${v}</span></div>`).join('')}
    <div class="modal-actions">
      <button class="btn-pdf"       onclick="gerarPDF(${d.id})">⬇ Baixar PDF</button>
      <button class="btn-secondary" onclick="fecharModal()">Fechar</button>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

function fecharModal() {
  document.getElementById('modal').classList.remove('open');
}

// ===== GERAR PDF =====
function gerarPDF(id) {
  const d = dados.find(x => x.id === id);
  if (!d) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginL = 20, pageW = 210, contentW = pageW - marginL * 2;
  let y = 20;

  doc.setFillColor(26,26,24);
  doc.rect(0,0,pageW,18,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(13); doc.setFont('helvetica','bold');
  doc.text('CRM Imobiliario - Ficha do Lead', marginL, 12);

  y = 30;
  doc.setTextColor(26,26,24); doc.setFontSize(16);
  doc.text(d.nome, marginL, y);

  y += 6;
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(107,107,104);
  const dataF = d.criado_em ? new Date(d.criado_em).toLocaleDateString('pt-BR') : '';
  doc.text(`Cadastrado em: ${dataF}   |   Status: ${d.status}`, marginL, y);

  y += 5;
  doc.setDrawColor(226,226,223); doc.setLineWidth(0.4);
  doc.line(marginL, y, pageW-marginL, y);

  const secoes = [
    { titulo:'DADOS PESSOAIS', campos:[
      ['Telefone',d.tel],['E-mail',d.email||'—'],['CPF',d.cpf||'—'],['Cidade',d.cidade||'—']
    ]},
    { titulo:'INTERESSE NO IMOVEL', campos:[
      ['Tipo',d.tipo_imovel],['Finalidade',d.finalidade],['Valor',d.valor],
      ['Bairro',d.bairro||'—'],['Quartos',d.quartos||'Indiferente']
    ]},
    { titulo:'REFERENCIAS', campos: (d.refs||[]).length
      ? d.refs.map((r,i)=>[`Ref. ${String(i+1).padStart(2,'0')}`,r])
      : [['','Nenhuma referencia informada']]
    },
    { titulo:'OBSERVACOES', campos:[['',d.obs||'Sem observacoes.']] },
  ];

  secoes.forEach(sec => {
    y += 10;
    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(155,155,152);
    doc.text(sec.titulo, marginL, y);
    y += 4; doc.setLineWidth(0.3); doc.setDrawColor(226,226,223);
    doc.line(marginL, y, pageW-marginL, y); y += 5;

    sec.campos.forEach(([label, valor]) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(107,107,104);
      if (label) doc.text(label, marginL, y);
      doc.setFont('helvetica','normal'); doc.setTextColor(26,26,24);
      const colX = label ? marginL+52 : marginL;
      const linhas = doc.splitTextToSize(valor, label ? contentW-52 : contentW);
      linhas.forEach((ln,i) => { if(y>270){doc.addPage();y=20;} doc.text(ln,colX,y+i*5); });
      y += linhas.length*5+2;
    });
  });

  const totalPags = doc.getNumberOfPages();
  for (let i = 1; i <= totalPags; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(155,155,152);
    doc.text(`CRM Imobiliario  •  Pagina ${i} de ${totalPags}`, marginL, 290);
    doc.text(new Date().toLocaleString('pt-BR'), pageW-marginL, 290, {align:'right'});
  }

  doc.save(`lead_${d.nome.replace(/\s+/g,'_').toLowerCase()}.pdf`);
  toast('PDF gerado!');
}

// ===== EXPORTAR CSV =====
function exportarCSV() {
  if (!dados.length) { toast('Nenhum dado para exportar.', '#6B7280'); return; }
  const cols   = ['nome','tel','email','cpf','cidade','tipo_imovel','finalidade','valor','bairro','quartos','status','obs'];
  const header = ['Nome','Telefone','E-mail','CPF','Cidade','Tipo Imóvel','Finalidade','Valor','Bairro','Quartos','Status','Observações','Referências','Cadastrado em'];
  const linhas = [
    header.join(','),
    ...dados.map(d => [
      ...cols.map(c => `"${(d[c]||'').toString().replace(/"/g,'""')}"`),
      `"${(d.refs||[]).join('; ')}"`,
      `"${d.criado_em ? new Date(d.criado_em).toLocaleString('pt-BR') : ''}"`,
    ].join(',')),
  ];
  const blob = new Blob(['\uFEFF'+linhas.join('\n')],{type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'leads_imoveis.csv'; a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV exportado!');
}

// ===== START =====
init();
