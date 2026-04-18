// ===== SUPABASE =====
const SUPABASE_URL = 'https://nuuhkjuhlfiailmpxbit.supabase.co';
const SUPABASE_KEY = 'sb_publishable_69SlJA5oAyUNvA80DDpZ8Q_tKhDkp-s';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== ESTADO =====
let dados = [];
let refsTemp = [];
let fbEntradas = []; // entradas do feedback

// ===== OPÇÕES DE VALOR POR FINALIDADE =====
const VALORES = {
  'Compra': [
    'Até 200 mil', '200–400 mil', '400–600 mil',
    '600 mil–1 mi', '1 mi–2 mi', 'Acima de 2 mi', 'A consultar'
  ],
  'Locação': [
    'Até R$ 800/mês', 'R$ 800–1.500/mês', 'R$ 1.500–3.000/mês',
    'R$ 3.000–5.000/mês', 'Acima de R$ 5.000/mês', 'A consultar'
  ],
  'Investimento': [
    'Até 300 mil', '300–600 mil', '600 mil–1 mi',
    '1 mi–3 mi', 'Acima de 3 mi', 'A consultar'
  ]
};

const STATUS_LEAD_FEEDBACK = [
  'Sem resposta', 'Sem interesse', 'Visitou o imóvel',
  'Proposta enviada', 'Em negociação', 'Convertido', 'Outro'
];

function atualizarOpcoesValor() {
  const finalidade = document.getElementById('f-finalidade').value;
  const sel = document.getElementById('f-valor');
  const opcoes = VALORES[finalidade] || VALORES['Compra'];
  sel.innerHTML = opcoes.map(o => `<option value="${o}">${o}</option>`).join('');
}

// ===== INIT =====
async function init() {
  atualizarOpcoesValor();
  // data atual no campo de feedback
  document.getElementById('fb-data').value = new Date().toISOString().split('T')[0];
  fbEntradas = [];
  adicionarEntrada(); // começa com 1 entrada vazia
  mostrarLoading(true);
  await carregar();
  mostrarLoading(false);
  atualizarBadge();
}

function mostrarLoading(show) {
  const el = document.getElementById('loading');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ===== SUPABASE CRUD =====
async function carregar() {
  const { data, error } = await db.from('leads').select('*').order('criado_em', { ascending: false });
  if (error) { toast('Erro ao carregar: ' + error.message, '#DC2626'); return; }
  dados = data || [];
}

// ===== NAVEGAÇÃO =====
function switchTab(tab) {
  document.querySelectorAll('.nav-btn').forEach((b, i) => {
    b.classList.toggle('active',
      (i===0&&tab==='form') || (i===1&&tab==='list') || (i===2&&tab==='feedback')
    );
  });
  ['form','list','feedback'].forEach(t => {
    document.getElementById('sec-'+t).classList.toggle('active', t===tab);
  });
  if (tab === 'list') {
    mostrarLoading(true);
    carregar().then(() => { mostrarLoading(false); renderTabela(); atualizarStats(); });
  }
}

// ===== UTILS =====
function toast(msg, cor) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.background = cor || '#16A34A';
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2800);
}
function atualizarBadge() {
  const b = document.getElementById('count-badge');
  b.textContent = dados.length > 0 ? `(${dados.length})` : '';
}
function atualizarStats() {
  document.getElementById('s-total').textContent  = dados.length;
  document.getElementById('s-quente').textContent = dados.filter(d=>d.status==='Quente').length;
  document.getElementById('s-morno').textContent  = dados.filter(d=>d.status==='Morno').length;
  document.getElementById('s-conv').textContent   = dados.filter(d=>d.status==='Convertido').length;
}

// ===== REFS DO FORMULÁRIO =====
function adicionarRef() {
  const inp = document.getElementById('f-ref-input');
  const val = inp.value.trim();
  if (!val) return;
  if (refsTemp.includes(val)) { toast('Referência já adicionada.', '#6B7280'); return; }
  refsTemp.push(val); inp.value = ''; renderRefs();
}
function removerRef(ref) {
  refsTemp = refsTemp.filter(r => r !== ref); renderRefs();
}
function renderRefs() {
  document.getElementById('ref-list').innerHTML = refsTemp
    .map(r => `<span class="ref-tag">${r}<button onclick="removerRef('${r}')" title="Remover">×</button></span>`)
    .join('');
}

// ===== SALVAR LEAD =====
async function salvar() {
  const nome = document.getElementById('f-nome').value.trim();
  const tel  = document.getElementById('f-tel').value.trim();
  if (!nome || !tel) { toast('Nome e telefone são obrigatórios.', '#DC2626'); return; }

  const btn = document.querySelector('#sec-form .btn-primary');
  btn.disabled = true; btn.textContent = 'Salvando...';

  const { error } = await db.from('leads').insert([{
    nome, tel,
    email:       document.getElementById('f-email').value.trim()  || null,
    cpf:         document.getElementById('f-cpf').value.trim()    || null,
    cidade:      document.getElementById('f-cidade').value.trim() || null,
    tipo_imovel: document.getElementById('f-tipo-imovel').value,
    finalidade:  document.getElementById('f-finalidade').value,
    valor:       document.getElementById('f-valor').value,
    bairro:      document.getElementById('f-bairro').value.trim() || null,
    quartos:     document.getElementById('f-quartos').value       || null,
    status:      document.getElementById('f-status').value,
    refs:        [...refsTemp],
    obs:         document.getElementById('f-obs').value.trim()    || null,
  }]);

  btn.disabled = false; btn.textContent = 'Salvar lead';

  if (error) { toast('Erro ao salvar: ' + error.message, '#DC2626'); return; }

  ['f-nome','f-email','f-tel','f-cpf','f-cidade','f-bairro','f-obs']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-quartos').value = '';
  document.getElementById('f-status').value  = 'Quente';
  atualizarOpcoesValor();
  refsTemp = []; renderRefs();
  await carregar(); atualizarBadge();
  toast('Lead salvo no Supabase!');
}

// ===== DELETAR =====
async function deletar(id) {
  if (!confirm('Remover este lead?')) return;
  const { error } = await db.from('leads').delete().eq('id', id);
  if (error) { toast('Erro ao deletar: ' + error.message, '#DC2626'); return; }
  dados = dados.filter(d => d.id !== id);
  atualizarBadge(); renderTabela(); atualizarStats();
  toast('Lead removido.', '#6B7280');
}

// ===== TABELA =====
const statusBadge = s => {
  const m = {Quente:'b-quente',Morno:'b-morno',Frio:'b-frio',Convertido:'b-conv'};
  return `<span class="badge ${m[s]||'b-frio'}">${s}</span>`;
};

function renderTabela() {
  const q = (document.getElementById('busca').value||'').toLowerCase();
  const filtrado = dados.filter(d =>
    d.nome.toLowerCase().includes(q) ||
    d.tel.includes(q) ||
    (d.email||'').toLowerCase().includes(q) ||
    (d.refs||[]).some(r=>r.toLowerCase().includes(q))
  );
  const tbody = document.getElementById('tbody');
  const empty = document.getElementById('empty-state');
  if (!filtrado.length) { tbody.innerHTML=''; empty.style.display=''; return; }
  empty.style.display = 'none';
  tbody.innerHTML = filtrado.map(d => `
    <tr>
      <td><strong>${d.nome}</strong></td>
      <td>${d.tel}</td>
      <td>${d.tipo_imovel}</td>
      <td>${d.finalidade}</td>
      <td style="white-space:nowrap">${d.valor}</td>
      <td>${statusBadge(d.status)}</td>
      <td><div class="refs-cell">${(d.refs||[]).length ? d.refs.map(r=>`<span class="ref-mini">${r}</span>`).join('') : '—'}</div></td>
      <td style="white-space:nowrap">
        <button class="btn-ver"    onclick="verDetalhes(${d.id})">Ver</button>
        <button class="btn-pdf"    onclick="gerarPDF(${d.id})">PDF</button>
        <button class="btn-danger" onclick="deletar(${d.id})">Del</button>
      </td>
    </tr>`).join('');
}

// ===== MODAL =====
function verDetalhes(id) {
  const d = dados.find(x=>x.id===id); if (!d) return;
  const dataF = d.criado_em ? new Date(d.criado_em).toLocaleString('pt-BR') : '—';
  const rows = [
    ['Nome',d.nome],['Telefone',d.tel],['E-mail',d.email||'—'],
    ['CPF',d.cpf||'—'],['Cidade',d.cidade||'—'],
    ['Tipo de imóvel',d.tipo_imovel],['Finalidade',d.finalidade],
    ['Faixa de valor',d.valor],['Bairro / região',d.bairro||'—'],
    ['Quartos',d.quartos||'Indiferente'],['Status',d.status],
    ['Referências',(d.refs||[]).length?d.refs.join(', '):'—'],
    ['Observações',d.obs||'—'],['Cadastrado em',dataF],
  ];
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-header">
      <strong>${d.nome}</strong>
      <button class="modal-close" onclick="fecharModal()">×</button>
    </div>
    ${rows.map(([l,v])=>`<div class="detail-row"><span>${l}</span><span>${v}</span></div>`).join('')}
    <div class="modal-actions">
      <button class="btn-pdf"       onclick="gerarPDF(${d.id})">⬇ Baixar PDF</button>
      <button class="btn-secondary" onclick="fecharModal()">Fechar</button>
    </div>`;
  document.getElementById('modal').classList.add('open');
}
function fecharModal() { document.getElementById('modal').classList.remove('open'); }

// ===== PDF INDIVIDUAL =====
function gerarPDF(id) {
  const d = dados.find(x=>x.id===id); if (!d) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'mm',format:'a4'});
  const mL=20, pW=210, cW=pW-mL*2;
  let y=20;

  doc.setFillColor(26,26,24); doc.rect(0,0,pW,18,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont('helvetica','bold');
  doc.text('CRM Imobiliario - Ficha do Lead', mL, 12);

  y=30; doc.setTextColor(26,26,24); doc.setFontSize(16);
  doc.text(d.nome, mL, y);
  y+=6; doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(107,107,104);
  const dataF = d.criado_em ? new Date(d.criado_em).toLocaleDateString('pt-BR') : '';
  doc.text(`Cadastrado em: ${dataF}   |   Status: ${d.status}`, mL, y);
  y+=5; doc.setDrawColor(226,226,223); doc.setLineWidth(0.4);
  doc.line(mL,y,pW-mL,y);

  const secs = [
    {t:'DADOS PESSOAIS', c:[['Telefone',d.tel],['E-mail',d.email||'—'],['CPF',d.cpf||'—'],['Cidade',d.cidade||'—']]},
    {t:'INTERESSE NO IMOVEL', c:[['Tipo',d.tipo_imovel],['Finalidade',d.finalidade],['Valor',d.valor],['Bairro',d.bairro||'—'],['Quartos',d.quartos||'Indiferente']]},
    {t:'REFERENCIAS', c:(d.refs||[]).length?d.refs.map((r,i)=>[`Ref. ${String(i+1).padStart(2,'0')}`,r]):[['','Nenhuma']]},
    {t:'OBSERVACOES', c:[['',d.obs||'Sem observacoes.']]},
  ];

  secs.forEach(sec => {
    y+=10;
    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(155,155,152);
    doc.text(sec.t, mL, y); y+=4;
    doc.setLineWidth(0.3); doc.setDrawColor(226,226,223); doc.line(mL,y,pW-mL,y); y+=5;
    sec.c.forEach(([lb,vl]) => {
      if(y>270){doc.addPage();y=20;}
      doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(107,107,104);
      if(lb) doc.text(lb,mL,y);
      doc.setFont('helvetica','normal'); doc.setTextColor(26,26,24);
      const cx = lb?mL+52:mL;
      const ls = doc.splitTextToSize(vl, lb?cW-52:cW);
      ls.forEach((l,i)=>{if(y>270){doc.addPage();y=20;} doc.text(l,cx,y+i*5);});
      y+=ls.length*5+2;
    });
  });

  const tp=doc.getNumberOfPages();
  for(let i=1;i<=tp;i++){
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(155,155,152);
    doc.text(`CRM Imobiliario  •  Pagina ${i} de ${tp}`,mL,290);
    doc.text(new Date().toLocaleString('pt-BR'),pW-mL,290,{align:'right'});
  }
  doc.save(`lead_${d.nome.replace(/\s+/g,'_').toLowerCase()}.pdf`);
  toast('PDF gerado!');
}

// ===== EXPORTAR CSV =====
function exportarCSV() {
  if (!dados.length) { toast('Nenhum dado para exportar.','#6B7280'); return; }
  const cols = ['nome','tel','email','cpf','cidade','tipo_imovel','finalidade','valor','bairro','quartos','status','obs'];
  const header = ['Nome','Telefone','E-mail','CPF','Cidade','Tipo Imóvel','Finalidade','Valor','Bairro','Quartos','Status','Observações','Referências','Cadastrado em'];
  const linhas = [header.join(','), ...dados.map(d=>[
    ...cols.map(c=>`"${(d[c]||'').toString().replace(/"/g,'""')}"`),
    `"${(d.refs||[]).join('; ')}"`,
    `"${d.criado_em?new Date(d.criado_em).toLocaleString('pt-BR'):''}"`,
  ].join(','))];
  const blob = new Blob(['\uFEFF'+linhas.join('\n')],{type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='leads_imoveis.csv'; a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV exportado!');
}

// ===== FEEDBACK DE LEADS =====
let fbContador = 0;

function adicionarEntrada() {
  fbContador++;
  const id = fbContador;
  fbEntradas.push({ id, ref: '', leads: [] });
  renderEntradas();
  // adiciona 1 lead vazio automaticamente
  adicionarLeadNaEntrada(id);
}

function removerEntrada(id) {
  fbEntradas = fbEntradas.filter(e => e.id !== id);
  renderEntradas();
}

function adicionarLeadNaEntrada(entradaId) {
  const entrada = fbEntradas.find(e => e.id === entradaId);
  if (!entrada) return;
  entrada.leads.push({ id: Date.now() + Math.random(), nome: '', status: STATUS_LEAD_FEEDBACK[0], obs: '' });
  renderEntradas();
}

function removerLeadDaEntrada(entradaId, leadId) {
  const entrada = fbEntradas.find(e => e.id === entradaId);
  if (!entrada) return;
  entrada.leads = entrada.leads.filter(l => l.id !== leadId);
  renderEntradas();
}

function renderEntradas() {
  const container = document.getElementById('fb-entradas');
  if (!fbEntradas.length) {
    container.innerHTML = '<p style="font-size:13px;color:var(--text-hint);padding:1rem 0;">Nenhum imóvel adicionado. Clique em "+ Adicionar imóvel" abaixo.</p>';
    return;
  }

  container.innerHTML = fbEntradas.map((entrada, idx) => `
    <div class="fb-entrada" id="entrada-${entrada.id}">
      <div class="fb-entrada-header">
        <div class="fb-num">${idx+1}</div>
        <input
          class="fb-ref-input"
          type="text"
          placeholder="Referência do imóvel (ex: 02486.001)"
          value="${entrada.ref}"
          oninput="fbEntradas.find(e=>e.id===${entrada.id}).ref=this.value"
          style="flex:1;font-family:'SF Mono','Fira Code',monospace;font-weight:600;"
        />
        <button class="btn-remover-entrada" onclick="removerEntrada(${entrada.id})" title="Remover imóvel">×</button>
      </div>

      <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">
        Leads (${entrada.leads.length})
      </div>

      <div class="fb-leads-lista" id="leads-${entrada.id}">
        ${entrada.leads.map(lead => `
          <div class="fb-lead-item">
            <input
              type="text"
              placeholder="Nome do lead (opcional)"
              value="${lead.nome}"
              oninput="fbAtualizarLead(${entrada.id},${lead.id},'nome',this.value)"
            />
            <select onchange="fbAtualizarLead(${entrada.id},${lead.id},'status',this.value)">
              ${STATUS_LEAD_FEEDBACK.map(s => `<option value="${s}" ${lead.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
            <button class="btn-remover-lead" onclick="removerLeadDaEntrada(${entrada.id},${lead.id})" title="Remover lead">×</button>
          </div>
        `).join('')}
      </div>

      <button class="btn-add-lead" onclick="adicionarLeadNaEntrada(${entrada.id})">+ Adicionar lead</button>
    </div>
  `).join('');
}

function fbAtualizarLead(entradaId, leadId, campo, valor) {
  const entrada = fbEntradas.find(e => e.id === entradaId);
  if (!entrada) return;
  const lead = entrada.leads.find(l => l.id === leadId);
  if (lead) lead[campo] = valor;
}

function limparFeedback() {
  if (!confirm('Limpar todo o formulário de feedback?')) return;
  fbEntradas = [];
  fbContador = 0;
  document.getElementById('fb-corretor').value = '';
  document.getElementById('fb-obs-geral').value = '';
  document.getElementById('fb-data').value = new Date().toISOString().split('T')[0];
  adicionarEntrada();
  toast('Formulário limpo.', '#6B7280');
}

// ===== PDF DO FEEDBACK =====
function gerarPDFFeedback() {
  // sincroniza refs do DOM antes de gerar
  fbEntradas.forEach(entrada => {
    const el = document.querySelector(`#entrada-${entrada.id} .fb-ref-input`);
    if (el) entrada.ref = el.value.trim();
  });

  const corretor  = document.getElementById('fb-corretor').value.trim() || 'Não informado';
  const dataVal   = document.getElementById('fb-data').value;
  const dataF     = dataVal ? new Date(dataVal+'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const obsGeral  = document.getElementById('fb-obs-geral').value.trim();

  if (!fbEntradas.length) { toast('Adicione ao menos um imóvel.', '#DC2626'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const mL=20, pW=210, cW=pW-mL*2;
  let y=20;

  // Cabeçalho
  doc.setFillColor(26,26,24); doc.rect(0,0,pW,22,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(14); doc.setFont('helvetica','bold');
  doc.text('Relatorio de Feedback de Leads', mL, 10);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text(`Corretor: ${corretor}   |   Data: ${dataF}`, mL, 17);

  y = 34;

  // Observação geral
  if (obsGeral) {
    doc.setFontSize(9); doc.setFont('helvetica','italic'); doc.setTextColor(107,107,104);
    const obsLines = doc.splitTextToSize(`Obs. gerais: ${obsGeral}`, cW);
    obsLines.forEach(l => { doc.text(l, mL, y); y+=5; });
    y+=2;
  }

  // Resumo geral
  const totalImoveis = fbEntradas.length;
  const totalLeads   = fbEntradas.reduce((acc,e)=>acc+e.leads.length,0);
  const countStatus  = {};
  fbEntradas.forEach(e => e.leads.forEach(l => {
    countStatus[l.status] = (countStatus[l.status]||0)+1;
  }));

  doc.setFillColor(245,245,243); doc.rect(mL, y, cW, 22, 'F');
  doc.setDrawColor(226,226,223); doc.setLineWidth(0.4); doc.rect(mL, y, cW, 22, 'S');
  doc.setTextColor(26,26,24); doc.setFontSize(10); doc.setFont('helvetica','bold');
  doc.text(`Resumo`, mL+6, y+8);
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(107,107,104);
  doc.text(`Imoveis analisados: ${totalImoveis}`, mL+6, y+15);
  doc.text(`Total de leads: ${totalLeads}`, mL+60, y+15);

  // contagem de status resumida
  const statusResumo = Object.entries(countStatus).map(([k,v])=>`${k}: ${v}`).join('   ');
  const srLines = doc.splitTextToSize(statusResumo, cW-12);
  srLines.forEach((l,i)=>{ doc.text(l, mL+6, y+15+(i+1)*5); });
  y += 22 + srLines.length*5 + 6;

  // Separador
  doc.setDrawColor(226,226,223); doc.setLineWidth(0.5);
  doc.line(mL, y, pW-mL, y); y+=8;

  // Entradas por imóvel
  fbEntradas.forEach((entrada, idx) => {
    if (y > 260) { doc.addPage(); y=20; }

    const ref = entrada.ref || `Imóvel ${idx+1}`;
    const totalL = entrada.leads.length;

    // Título do imóvel
    doc.setFillColor(239,246,255); doc.rect(mL, y-4, cW, 12, 'F');
    doc.setTextColor(29,78,216); doc.setFontSize(11); doc.setFont('helvetica','bold');
    doc.text(`${String(idx+1).padStart(2,'0')}.  ${ref}`, mL+4, y+4);
    doc.setTextColor(107,107,104); doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text(`${totalL} lead${totalL!==1?'s':''}`, pW-mL-4, y+4, {align:'right'});
    y += 14;

    if (!entrada.leads.length) {
      doc.setFontSize(9); doc.setTextColor(155,155,152);
      doc.text('Nenhum lead registrado.', mL+4, y); y+=8;
    } else {
      entrada.leads.forEach((lead, li) => {
        if (y > 270) { doc.addPage(); y=20; }
        doc.setFontSize(9); doc.setFont('helvetica','normal');

        // bolinha numerada
        doc.setFillColor(107,107,104); doc.circle(mL+3, y-1, 2, 'F');
        doc.setTextColor(255,255,255); doc.setFontSize(7);
        doc.text(String(li+1), mL+3, y, {align:'center'});

        doc.setFontSize(9); doc.setTextColor(26,26,24);
        const nomeL = lead.nome || 'Lead sem nome';
        doc.setFont('helvetica','bold');
        doc.text(nomeL, mL+8, y);

        // status com cor
        const statusColors = {
          'Visitou o imóvel':  [240,253,244,22,101,52],
          'Convertido':        [240,253,244,22,101,52],
          'Proposta enviada':  [239,246,255,29,78,216],
          'Em negociação':     [254,252,232,146,64,14],
          'Sem interesse':     [254,242,242,153,27,27],
          'Sem resposta':      [245,245,243,107,107,104],
          'Outro':             [245,245,243,107,107,104],
        };
        const sc = statusColors[lead.status] || statusColors['Outro'];
        const statusTxt = lead.status;
        const sw = doc.getTextWidth(statusTxt)+8;
        doc.setFillColor(sc[0],sc[1],sc[2]); doc.roundedRect(pW-mL-sw-2, y-5, sw, 7, 1, 1, 'F');
        doc.setTextColor(sc[3],sc[4],sc[5]); doc.setFont('helvetica','bold'); doc.setFontSize(8);
        doc.text(statusTxt, pW-mL-sw/2-2, y, {align:'center'});

        y+=7;
      });
    }

    y+=4;
    doc.setDrawColor(226,226,223); doc.setLineWidth(0.3);
    doc.line(mL, y, pW-mL, y); y+=6;
  });

  // Rodapé
  const tp = doc.getNumberOfPages();
  for (let i=1;i<=tp;i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(155,155,152);
    doc.text(`CRM Imobiliario  •  Feedback de Leads  •  Pagina ${i} de ${tp}`, mL, 290);
    doc.text(new Date().toLocaleString('pt-BR'), pW-mL, 290, {align:'right'});
  }

  doc.save(`feedback_leads_${dataVal||'relatorio'}.pdf`);
  toast('PDF do relatório gerado!');
}

// ===== START =====
init();
