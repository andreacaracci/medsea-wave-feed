/** Public, read-only historical forecast panel for Brega Marine Watch (Phase 2). */
import {loadMarineJson} from './marine_history_client.mjs';

const names = {
  sicily_channel: ['Canale di Sicilia', 'Sicily Channel'],
  central_corridor: ['Corridoio centrale', 'Central Corridor'],
  syrte_entrance: ['Ingresso Sirte', 'Syrte Entrance'],
  brega_offshore: ['Brega offshore', 'Brega Offshore'],
};
const root = new URL('./', import.meta.url);
const indexUrl = new URL('forecast/archive/index.json', root);
const box = document.getElementById('history-body');
const heading = document.getElementById('history-title');
const subtitle = document.getElementById('history-subtitle');
let loaded = null, failure = null;
const tt = (it,en) => document.querySelector('.language button.active')?.dataset.lang === 'en' ? en : it;
const ele = (tag, text, cls) => {
  const n=document.createElement(tag);
  if (text !== undefined) n.textContent=String(text);
  if (cls) n.className=cls;
  return n;
};
function link(url, label) {
  const a=ele('a',label); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; return a;
}
function fmt(v, digits=2) { return typeof v==='number' && Number.isFinite(v) ? v.toFixed(digits) : '—'; }
function localTime(s) { if(!s) return '—'; const d=new Date(s);return Number.isNaN(+d)?'—':new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-GB':'it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Tripoli'}).format(d); }
function delta(s) {
  if(!s || typeof s.minimum_delta!=='number'||typeof s.maximum_delta!=='number')return '—';
  if(s.compared_hours===0)return '—';
  if(Math.abs(s.minimum_delta)<0.005 && Math.abs(s.maximum_delta)<0.005)return '±0,00 m';
  return (s.minimum_delta>=0?'+':'')+fmt(s.minimum_delta)+' / '+(s.maximum_delta>=0?'+':'')+fmt(s.maximum_delta)+' m';
}
function event(s) {
  const ep=s?.episode_transitions || [];
  if(!ep.length)return tt('Nessuna transizione','No transitions');
  return ep.map(x=>{
    const val=x.status || x.state || '—';
    const trend=x.intensity_change || '—';
    const arrival=x.arrival_change || '—';
    return `${val} · ${trend} · ${arrival}`;
  }).join(' | ');
}
function render() {
  if(!box)return;
  document.documentElement.lang=tt('it','en');
  heading.textContent=tt('Storico e confronto delle emissioni','Forecast run history and comparison');
  subtitle.textContent=tt('Confronti tra previsioni numeriche per la stessa ora futura. Nessuna stazione è una boa di osservazione.','Numerical-model forecasts compared for identical future times. Stations are not observation buoys.');
  box.replaceChildren();
  if(failure) {
    box.append(ele('p',tt('Archivio non ancora disponibile. Il quadro delle previsioni sopra continua a funzionare.','Archive not available yet. The forecast dashboard above still works.')));
    return;
  }
  if(!loaded){box.append(ele('p',tt('Caricamento storico…','Loading history…')));return;}
  const {index, comparison}=loaded;
  const stats=ele('div',undefined,'history-summary');
  const cards=[
    [index.emissions?.length||0,tt('Emissioni archiviate','Archived exports')],
    [index.history?.length||0,tt('Confronti disponibili','Run comparisons')],
    [localTime(index.emissions?.at(-1)?.generated_at_utc),tt('Ultima esportazione · ora libica','Last export · Libya time')],
  ];
  for(const [value,label] of cards){const card=ele('div',undefined,'history-stat');card.append(ele('b',value),ele('span',label));stats.append(card);}
  box.append(stats);
  const note=ele('p',tt('Le esportazioni non identificano necessariamente cicli modellistici indipendenti. Soglie sperimentali, non autorizzano decisioni operative.','Exports do not necessarily represent independent model cycles. Experimental thresholds; not an operational authorization.'),'history-note');
  box.append(note);
  if(comparison?.stations){
    const wrapper=ele('div',undefined,'data-table');const table=ele('table');
    const head=ele('thead');const tr=ele('tr');
    for(const s of [tt('Stazione','Station'),tt('Hs max previsto','Forecast max Hs'),tt('Δ Hs alla stessa ora','Δ Hs at same hour'),tt('Evoluzione episodio','Episode changes')])tr.append(ele('th',s));
    head.append(tr);table.append(head);const body=ele('tbody');
    for(const id of ['sicily_channel','central_corridor','syrte_entrance','brega_offshore']) {
      const station=comparison.stations[id];if(!station)continue;
      const r=ele('tr');const label=names[id]?.[tt(0,1)]||id;
      r.append(ele('td',label),ele('td',fmt(station.current_intensity?.significant_wave_height_m)+' m'),ele('td',delta(station.delta_summary?.significant_wave_height_m)),ele('td',event(station)));
      body.append(r);
    }
    table.append(body);wrapper.append(table);box.append(wrapper);
    box.append(ele('p',tt('Δ Hs è l’intervallo delle variazioni nelle ore previsionali comuni, non la differenza dei due massimi.','Δ Hs is the range of changes over matching forecast hours, not the difference between the two maxima.')));
  } else {box.append(ele('p',tt('Una sola emissione archiviata: il confronto apparirà dopo la successiva emissione distinta.','Only one archived export: comparisons will appear after the next distinct export.')));}
  const links=ele('div',undefined,'history-links');links.append(link(indexUrl.href,tt('Apri indice archivio','Open archive index')));
  if(index.latest_comparison_path)links.append(link(new URL(index.latest_comparison_path,root).href,tt('Scarica ultimo confronto (JSON gzip)','Download latest comparison (gzip JSON)')));
  box.append(links);
}
async function load(){
 try{
  const index=await loadMarineJson(indexUrl);let comparison=null;
  if(index.latest_comparison_path){
    const path=String(index.latest_comparison_path);
    if(!path.startsWith('forecast/archive/') || path.includes('..'))throw new Error('Unsafe history path');
    comparison=await loadMarineJson(new URL(path,root));
  }
  loaded={index,comparison};failure=null;
 }catch(e){failure=e;}
 render();
}
if(box){
 document.querySelectorAll('.language button').forEach(btn=>btn.addEventListener('click',render));
 load();
}
