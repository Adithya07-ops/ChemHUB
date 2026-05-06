/* ChemHub — Enthalpy Calculator | NIST + PubChem */

const DHF = {
  'H2':0,'O2':0,'N2':0,'F2':0,'Cl2':0,'Br2':0,'I2':0,'C':0,'S':0,'P':0,
  'Na':0,'K':0,'Ca':0,'Mg':0,'Al':0,'Fe':0,'Cu':0,'Zn':0,'Ag':0,'Hg':0,'P4':0,'Si':0,
  'H2O':-285.83,'H2O(l)':-285.83,'H2O(g)':-241.82,
  'CO2':-393.51,'CO':-110.53,
  'CH4':-74.81,'C2H6':-84.68,'C3H8':-103.85,'C4H10':-126.15,
  'C2H4':52.47,'C2H2':226.73,'C6H6':49.0,'C6H12':-123.4,
  'CH3OH':-238.7,'C2H5OH':-277.7,'C3H7OH':-302.6,
  'HCHO':-108.6,'CH3CHO':-166.2,'CH3COOH':-484.5,'HCOOH':-424.72,
  'NH3':-46.11,'N2O':82.05,'NO':90.25,'NO2':33.18,'N2O4':9.16,'HNO3':-174.1,
  'HCl':-92.31,'HBr':-36.4,'HF':-271.1,'HI':26.48,
  'H2S':-20.6,'SO2':-296.83,'SO3':-395.72,'H2SO4':-814.0,
  'NaCl':-411.15,'NaOH':-425.6,'NaHCO3':-950.8,'Na2CO3':-1130.7,'NaNO3':-467.9,
  'KCl':-436.5,'KOH':-424.76,'KNO3':-494.6,
  'CaCO3':-1207.6,'CaO':-635.09,'Ca(OH)2':-986.09,
  'MgO':-601.6,'Mg(OH)2':-924.5,'Al2O3':-1675.7,
  'Fe2O3':-824.2,'Fe3O4':-1118.4,'FeO':-272.0,
  'CuO':-157.3,'Cu2O':-168.6,'ZnO':-350.5,
  'AgCl':-127.07,'HgO':-90.83,
  'CaCl2':-795.8,'MgCl2':-641.3,'AlCl3':-704.2,'FeCl3':-399.5,'ZnCl2':-415.1,
  'C12H22O11':-2222.1,'C6H12O6':-1274.5,
  'C2H5OC2H5':-279.5,'C6H5OH':-165.1,'C7H8':50.0,'C8H18':-208.4,'C10H8':150.6,
  'N2H4':50.63,'PCl3':-287.0,'PCl5':-374.9,'P4O10':-2984.0,'SiO2':-910.86,
  'CH3Cl':-81.9,'CCl4':-95.7,'CHCl3':-103.1,'CH2Cl2':-95.4,
};

const ALIASES = {
  'water':'H2O','steam':'H2O(g)','carbon dioxide':'CO2','carbon monoxide':'CO',
  'methane':'CH4','ethane':'C2H6','propane':'C3H8','butane':'C4H10',
  'ethylene':'C2H4','acetylene':'C2H2','ethyne':'C2H2','benzene':'C6H6','cyclohexane':'C6H12',
  'methanol':'CH3OH','ethanol':'C2H5OH','propanol':'C3H7OH',
  'formaldehyde':'HCHO','acetaldehyde':'CH3CHO','acetic acid':'CH3COOH','formic acid':'HCOOH',
  'ammonia':'NH3','nitric oxide':'NO','nitrogen dioxide':'NO2','hydrazine':'N2H4',
  'hydrochloric acid':'HCl','hydrogen chloride':'HCl','hydrogen sulfide':'H2S',
  'sulfur dioxide':'SO2','sulfur trioxide':'SO3','sulfuric acid':'H2SO4','nitric acid':'HNO3',
  'sodium chloride':'NaCl','table salt':'NaCl','sodium hydroxide':'NaOH',
  'calcium carbonate':'CaCO3','quicklime':'CaO','calcium oxide':'CaO',
  'iron oxide':'Fe2O3','rust':'Fe2O3','glucose':'C6H12O6','sucrose':'C12H22O11',
  'octane':'C8H18','toluene':'C7H8','naphthalene':'C10H8','phenol':'C6H5OH',
  'oxygen':'O2','hydrogen':'H2','nitrogen':'N2','chlorine':'Cl2','bromine':'Br2','iodine':'I2',
};

const NAMES = {
  'H2O':'Water','H2O(g)':'Water (gas)','CO2':'Carbon dioxide','CO':'Carbon monoxide',
  'CH4':'Methane','C2H6':'Ethane','C3H8':'Propane','C4H10':'Butane',
  'C2H4':'Ethylene','C2H2':'Acetylene','C6H6':'Benzene','C6H12':'Cyclohexane',
  'CH3OH':'Methanol','C2H5OH':'Ethanol','CH3COOH':'Acetic acid','HCOOH':'Formic acid',
  'NH3':'Ammonia','NO':'Nitric oxide','NO2':'Nitrogen dioxide','HNO3':'Nitric acid',
  'HCl':'Hydrogen chloride','H2S':'Hydrogen sulfide',
  'SO2':'Sulfur dioxide','SO3':'Sulfur trioxide','H2SO4':'Sulfuric acid',
  'NaCl':'Sodium chloride','NaOH':'Sodium hydroxide','CaCO3':'Calcium carbonate',
  'CaO':'Calcium oxide','Ca(OH)2':'Calcium hydroxide',
  'Al2O3':'Aluminium oxide','Fe2O3':'Iron(III) oxide','Fe3O4':'Iron(II,III) oxide',
  'C6H12O6':'Glucose','C12H22O11':'Sucrose','C8H18':'Octane','C7H8':'Toluene',
  'H2':'Hydrogen gas','O2':'Oxygen gas','N2':'Nitrogen gas','C':'Carbon (graphite)',
  'N2H4':'Hydrazine','HF':'Hydrogen fluoride','HBr':'Hydrogen bromide',
  'C6H5OH':'Phenol','CCl4':'Carbon tetrachloride','SiO2':'Silicon dioxide',
};

/* ── Parser ── */
function parseReaction(raw) {
  const str = raw.replace(/→|⟶|=>/g,'→').replace(/\s*=\s*/g,'→').trim();
  const parts = str.split('→');
  if (parts.length !== 2) throw new Error('No reaction arrow found (use → or =).');
  const reactants = parseSide(parts[0]);
  const products  = parseSide(parts[1]);
  if (!reactants.length) throw new Error('No reactants found.');
  if (!products.length)  throw new Error('No products found.');
  return { reactants, products };
}

function parseSide(side) {
  return side.split(/\s*\+\s*/).map(t => parseTerm(t.trim())).filter(Boolean);
}

function parseTerm(term) {
  if (!term) return null;
  const m = term.match(/^(\d*\.?\d*)\s*([A-Za-z(].*)/);
  if (!m) throw new Error(`Cannot parse: "${term}"`);
  const coeff   = parseFloat(m[1]) || 1;
  const formula = m[2].trim().replace(/\(g\)|\(l\)|\(s\)|\(aq\)/gi, s => s.toLowerCase());
  return { coeff, formula };
}

function resolveFormula(f) {
  if (DHF[f] !== undefined) return f;
  const bare = f.replace(/\(g\)|\(l\)|\(s\)|\(aq\)/gi,'');
  if (DHF[bare] !== undefined) return bare;
  const alias = ALIASES[f.toLowerCase()];
  if (alias) return alias;
  return null;
}

/* ── PubChem ── */
async function fetchPubChem(formula) {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(formula)}/property/MolecularFormula,IUPACName,MolecularWeight,CanonicalSMILES/JSON`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    const p = d?.PropertyTable?.Properties?.[0];
    if (!p) return null;
    return {
      cid: p.CID, formula: p.MolecularFormula, iupac: p.IUPACName,
      mw: p.MolecularWeight, smiles: p.CanonicalSMILES,
      imgUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${p.CID}/PNG?record_type=2d&image_size=300x300`,
      pubUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${p.CID}`,
    };
  } catch { return null; }
}

/* ── UI ── */
function showToast(msg) {
  const t = document.getElementById('error-toast');
  document.getElementById('error-message').textContent = msg;
  t.classList.remove('hidden');
  requestAnimationFrame(() => t.classList.add('visible'));
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.classList.add('hidden'),400); }, 5000);
}

function setLoading(on) {
  const b = document.getElementById('calc-btn');
  b.classList.toggle('loading', on);
  b.disabled = on;
}

/* ── Background ── */
function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let pts = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  function create() {
    pts = Array.from({length:55}, () => ({
      x: Math.random()*canvas.width, y: Math.random()*canvas.height,
      r: Math.random()*1.5+0.4, dx:(Math.random()-.5)*.28, dy:(Math.random()-.5)*.28,
      opacity: Math.random()*.25+.04, hue: Math.random()<.5?22:0,
    }));
  }
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (const p of pts) {
      p.x+=p.dx; p.y+=p.dy;
      if(p.x<-10) p.x=canvas.width+10; if(p.x>canvas.width+10) p.x=-10;
      if(p.y<-10) p.y=canvas.height+10; if(p.y>canvas.height+10) p.y=-10;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`hsla(${p.hue},90%,65%,${p.opacity})`; ctx.fill();
    }
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++) {
      const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<130){
        ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(251,146,60,${.04*(1-d/130)})`; ctx.lineWidth=.5; ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  resize(); create(); draw();
  window.addEventListener('resize',()=>{resize();create();});
}

/* ── Calculate ── */
async function calculate() {
  const raw = document.getElementById('reaction-input').value.trim();
  if (!raw) { showToast('Please enter a balanced equation.'); return; }
  setLoading(true);
  try {
    const { reactants, products } = parseReaction(raw);
    const allSpecies = [
      ...reactants.map(s=>({...s,role:'Reactant'})),
      ...products.map(s=>({...s,role:'Product'})),
    ];
    let sumProd=0, sumReact=0;
    const resolved=[], unknown=[];
    for (const sp of allSpecies) {
      const key = resolveFormula(sp.formula);
      const dhf = key!==null ? DHF[key] : undefined;
      resolved.push({...sp, key: key||sp.formula, dhf});
      if (dhf===undefined) unknown.push(sp.formula);
      else if (sp.role==='Product')   sumProd  += sp.coeff*dhf;
      else if (sp.role==='Reactant')  sumReact += sp.coeff*dhf;
    }
    const dH = sumProd - sumReact;
    const pubchemData = await Promise.all(resolved.map(sp=>fetchPubChem(sp.key)));
    renderResults(raw, resolved, sumProd, sumReact, dH, pubchemData, unknown);
  } catch(err) {
    showToast(err.message||'An error occurred.');
  } finally { setLoading(false); }
}

/* ── Render ── */
function renderResults(rawEq, resolved, sumProd, sumReact, dH, pcData, unknown) {
  document.getElementById('empty-state').classList.add('hidden');
  const wrap = document.getElementById('results-wrap');
  wrap.classList.remove('hidden');

  const isExo = dH < -0.01, isEndo = dH > 0.01;
  const valCls  = isExo?'exo':isEndo?'endo':'neutral';
  const badgeCls= isExo?'badge-exo':isEndo?'badge-endo':'badge-zero';
  const typeLbl = isExo?'🔥 Exothermic':isEndo?'❄️ Endothermic':'⚖️ Thermoneutral';

  /* 1. Summary */
  document.getElementById('summary-reaction').textContent = fmtReaction(resolved);
  const sv = document.getElementById('summary-value');
  sv.textContent = `${dH>=0?'+':''}${dH.toFixed(2)} kJ/mol`;
  sv.className = `summary-value ${valCls}`;
  const sb = document.getElementById('summary-badge');
  sb.textContent = typeLbl; sb.className = `summary-badge ${badgeCls}`;
  const bar = document.getElementById('energy-bar-fill');
  bar.style.width='0%'; bar.className=`energy-bar-fill ${isEndo?'endo':''}`;
  setTimeout(()=>{ bar.style.width=Math.min(Math.abs(dH)/1000*100,100)+'%'; },80);

  /* 2. Balance panel */
  const prods   = resolved.filter(s=>s.role==='Product');
  const reacts  = resolved.filter(s=>s.role==='Reactant');

  function balanceMolRow(sp, isProduct) {
    const contrib = sp.dhf!==undefined ? sp.coeff*sp.dhf : null;
    const valCls2 = sp.dhf===undefined?'unknown-val':sp.dhf===0?'zero-val':isProduct?'product-val':'reactant-val';
    const contribStr = contrib!==null ? `${contrib>=0?'+':''}${contrib.toFixed(2)} kJ/mol` : '—';
    const el = document.createElement('div');
    el.className='balance-mol-row';
    el.innerHTML=`
      <div class="bm-left">
        <span class="bm-formula">${sp.formula}</span>
        <span class="bm-expr">${sp.coeff} × (${sp.dhf!==undefined?sp.dhf.toFixed(2):'?'} kJ/mol)</span>
      </div>
      <span class="bm-dhf ${valCls2}">${sp.dhf===undefined?'⚠ Unknown':contribStr}</span>`;
    return el;
  }

  const bpEl = document.getElementById('balance-products');
  const brEl = document.getElementById('balance-reactants');
  bpEl.innerHTML=''; brEl.innerHTML='';
  prods.forEach((sp,i)=>{ const r=balanceMolRow(sp,true); r.style.animationDelay=`${i*60}ms`; bpEl.appendChild(r); });
  reacts.forEach((sp,i)=>{ const r=balanceMolRow(sp,false); r.style.animationDelay=`${i*60}ms`; brEl.appendChild(r); });

  const bpt = document.getElementById('balance-products-total');
  bpt.innerHTML=`<span>Σ ΔHf°(products)</span><span>${sumProd>=0?'+':''}${sumProd.toFixed(2)} kJ/mol</span>`;
  const brt = document.getElementById('balance-reactants-total');
  brt.innerHTML=`<span>Σ ΔHf°(reactants)</span><span>${sumReact>=0?'+':''}${sumReact.toFixed(2)} kJ/mol</span>`;

  const bdh = document.getElementById('balance-dh');
  bdh.textContent=`${dH>=0?'+':''}${dH.toFixed(2)}\nkJ/mol`;
  bdh.className=`balance-dh ${valCls}`;

  /* 3. Molecule table */
  const rowsEl = document.getElementById('molecule-rows');
  rowsEl.innerHTML='';
  resolved.forEach((sp,i)=>{
    const isP=sp.role==='Product';
    const contrib=sp.dhf!==undefined?sp.coeff*sp.dhf:null;
    const row=document.createElement('div');
    row.className='molecule-row'; row.style.animationDelay=`${i*55}ms`;
    row.innerHTML=`
      <span class="mol-formula">${sp.formula}</span>
      <span class="${isP?'mol-role-product':'mol-role-reactant'}">${sp.role}</span>
      <span class="mol-coeff">${sp.coeff}</span>
      <span class="mol-dhf">${sp.dhf!==undefined?sp.dhf.toFixed(2):'<span class="unknown-warn">⚠ ?</span>'}</span>
      <span class="${contrib===null?'mol-contrib-zero':isP&&contrib>0?'mol-contrib-pos':!isP&&contrib<0?'mol-contrib-neg':contrib===0?'mol-contrib-zero':isP?'mol-contrib-neg':'mol-contrib-pos'}">
        ${contrib!==null?(contrib>=0?'+':'')+contrib.toFixed(2):'—'}
      </span>`;
    rowsEl.appendChild(row);
  });

  /* 4. Calc steps */
  const stepsEl=document.getElementById('calc-steps');
  stepsEl.innerHTML='';
  const pTerms=resolved.filter(s=>s.role==='Product'&&s.dhf!==undefined);
  const rTerms=resolved.filter(s=>s.role==='Reactant'&&s.dhf!==undefined);
  const pExpr=pTerms.map(s=>`(${s.coeff}×${s.dhf.toFixed(2)})`).join(' + ')||'0';
  const rExpr=rTerms.map(s=>`(${s.coeff}×${s.dhf.toFixed(2)})`).join(' + ')||'0';
  [
    {label:'Formula',   expr:'ΔH°rxn = Σ ΔHf°(products) − Σ ΔHf°(reactants)'},
    {label:'Products',  expr:`Σ ΔHf°(products) = ${pExpr} = ${sumProd.toFixed(2)} kJ/mol`},
    {label:'Reactants', expr:`Σ ΔHf°(reactants) = ${rExpr} = ${sumReact.toFixed(2)} kJ/mol`},
    {label:'Substituting', expr:`ΔH°rxn = ${sumProd.toFixed(2)} − (${sumReact.toFixed(2)})`},
    {label:'Result', expr:`ΔH°rxn = ${dH>=0?'+':''}${dH.toFixed(2)} kJ/mol`, result:true, cls:valCls},
  ].forEach((s,i)=>{
    const el=document.createElement('div');
    el.className='step-item'; el.style.animationDelay=`${i*75}ms`;
    el.innerHTML=`<span class="step-label">${s.label}</span>
      <span class="${s.result?`step-result ${s.cls}`:'step-expr'}">${s.expr}</span>`;
    stepsEl.appendChild(el);
  });
  if (unknown.length) {
    const w=document.createElement('div');
    w.className='step-item'; w.style.borderLeftColor='rgba(245,158,11,0.6)';
    w.innerHTML=`<span class="step-label">⚠ Missing data</span>
      <span class="step-expr" style="color:var(--warning)">No ΔHf° for: ${unknown.join(', ')} — excluded from sum.</span>`;
    stepsEl.appendChild(w);
  }

  /* 5. Molecule cards with large structure */
  const gridEl=document.getElementById('molecule-cards-grid');
  gridEl.innerHTML='';
  resolved.forEach((sp,i)=>{
    const pc=pcData[i];
    const isP=sp.role==='Product';
    const name=pc?.iupac||NAMES[sp.key]||sp.formula;
    const mw=pc?.mw?`${parseFloat(pc.mw).toFixed(2)} g/mol`:'—';
    const dhfStr=sp.dhf!==undefined?`${sp.dhf.toFixed(2)} kJ/mol`:'Not in database';
    const contrib=sp.dhf!==undefined?`${isP?'+':'−'}${Math.abs(sp.coeff*sp.dhf).toFixed(2)} kJ/mol`:'—';
    const dhfCls=sp.dhf===undefined?'unknown-val':sp.dhf===0?'zero-val':isP?'product-val':'reactant-val';

    const card=document.createElement('div');
    card.className=`mol-card ${isP?'product-card':'reactant-card'}`;
    card.style.animationDelay=`${i*90}ms`;

    const imgHtml = pc
      ? `<img class="mol-structure-img" src="${pc.imgUrl}" alt="Structure of ${sp.formula}" loading="lazy"
           onerror="this.parentElement.innerHTML='<div class=\\'mol-structure-placeholder\\'><div class=\\'mol-structure-placeholder-icon\\'>⚗️</div><div class=\\'mol-structure-placeholder-text\\'>Structure not available</div></div>'">`
      : `<div class="mol-structure-placeholder">
           <div class="mol-structure-placeholder-icon">⚗️</div>
           <div class="mol-structure-placeholder-text">No structure data</div>
         </div>`;

    const pubUrl=pc?pc.pubUrl:`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(sp.formula)}`;

    card.innerHTML=`
      <div class="mol-structure-hero">
        ${imgHtml}
        <span class="mol-role-ribbon ${isP?'ribbon-product':'ribbon-reactant'}">${sp.role}</span>
      </div>
      <div class="mol-card-body">
        <div class="mol-card-top">
          <div>
            <div class="mol-card-formula">${sp.formula}</div>
            <div class="mol-card-name">${name}</div>
            ${pc?`<div class="mol-cid">PubChem CID: ${pc.cid}</div>`:''}
          </div>
        </div>
        <div class="mol-dhf-hero">
          <div class="mol-dhf-hero-label">Standard Enthalpy of Formation (ΔHf°)</div>
          <div class="mol-dhf-hero-value ${dhfCls}">${dhfStr}</div>
          <div class="mol-dhf-hero-sub">at 25°C, 1 atm — NIST standard state</div>
        </div>
        <div class="mol-stats-grid">
          <div class="mol-stat-box">
            <div class="mol-stat-box-label">Coefficient</div>
            <div class="mol-stat-box-value">${sp.coeff}</div>
          </div>
          <div class="mol-stat-box">
            <div class="mol-stat-box-label">Mol. Weight</div>
            <div class="mol-stat-box-value">${mw}</div>
          </div>
          <div class="mol-stat-box" style="grid-column:1/-1">
            <div class="mol-stat-box-label">Contribution to ΔH°rxn (n × ΔHf°)</div>
            <div class="mol-stat-box-value ${isP?'orange':'blue'}">${contrib}</div>
          </div>
        </div>
        <div class="mol-card-links">
          <a href="${pubUrl}" target="_blank" rel="noopener" class="mol-link mol-link-pubchem">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            PubChem
          </a>
          <a href="https://chemcompute.org/gamess/submit" target="_blank" rel="noopener" class="mol-link mol-link-chemcompute">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
            ChemCompute
          </a>
        </div>
      </div>`;
    gridEl.appendChild(card);
  });

  if (window.innerWidth < 1024) wrap.scrollIntoView({behavior:'smooth',block:'start'});
}

function fmtReaction(resolved) {
  const r=resolved.filter(s=>s.role==='Reactant').map(s=>`${s.coeff>1?s.coeff:''}${s.formula}`).join(' + ');
  const p=resolved.filter(s=>s.role==='Product').map(s=>`${s.coeff>1?s.coeff:''}${s.formula}`).join(' + ');
  return `${r} → ${p}`;
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded',()=>{
  initBackground();
  document.getElementById('quick-chips').addEventListener('click',e=>{
    const c=e.target.closest('[data-reaction]');
    if(c) document.getElementById('reaction-input').value=c.dataset.reaction;
  });
  document.getElementById('calc-btn').addEventListener('click',calculate);
  document.getElementById('reaction-input').addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();calculate();}
  });
  const tc=document.getElementById('toast-close');
  if(tc) tc.addEventListener('click',()=>{
    const t=document.getElementById('error-toast');
    t.classList.remove('visible');
    setTimeout(()=>t.classList.add('hidden'),400);
  });
});
