"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("bollettino.html","utf8");
const found=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
assert.ok(found,"Sorgente JS non trovato");
let script=found[1];
assert.match(script,/load\(\);\s*\}\)\(\);\s*$/);
script=script.replace(/load\(\);\s*\}\)\(\);\s*$/,"globalThis.__test={qualify,build,revision};\n})();");
const context={document:{getElementById:()=>({addEventListener(){}})},Intl,Date,console};
vm.runInNewContext(script,context,{timeout:1000});
const {qualify,build,revision}=context.__test;
assert.equal(typeof qualify,"function");
const T=Date.parse("2026-11-14T13:15:00Z"),ONE=3600000,START=Date.parse("2026-11-14T14:00:00Z");
const row=(i,hit=false)=>({
 valid_time_utc:new Date(START+i*ONE).toISOString(),
 primary_swell_height_m:hit?.27:.10,
 primary_swell_mean_period_s:hit?9.2:3,
 primary_swell_from_deg:hit?320:140,
 secondary_swell_height_m:.05,secondary_swell_mean_period_s:3,secondary_swell_from_deg:40,
 significant_wave_height_m:hit?.38:.18,wave_peak_period_s:hit?8.8:3
});
const rows=Array.from({length:125},(_,i)=>row(i,[6,7].includes(i)));
const doc={dataset_id:"cmems_mod_med_wav_anfc_4.2km_PT1H-i",
 measurement_type:"numerical_model_forecast_not_observation",
 generated_at_utc:"2026-11-14T13:00:00Z",
 stations:{brega_offshore:{forecast:rows}}};
assert.equal(qualify(rows[6]),true);
assert.equal(qualify(rows[0]),false);
assert.equal(qualify({}),null);
let result=build(doc,T);
assert.equal(result.events.length,1,"Due ore sopra soglia danno un episodio");
assert.equal(result.events[0].hours,2);
assert.equal(result.missing,0,"Con 125 ore valide nessuna mancanza");
const one={...doc,stations:{brega_offshore:{forecast:rows.map((r,i)=>i===7?row(i,false):r)}}};
assert.equal(build(one,T).events.length,0,"Un'ora sola non dà episodio");
const incomplete={...doc,stations:{brega_offshore:{forecast:rows.filter((r,i)=>i!==4)}}};
assert.equal(build(incomplete,T).missing,1,"Un'ora mancante non diventa calma");
const stale={...doc,generated_at_utc:"2026-11-14T06:00:00Z"};
assert.throws(()=>build(stale,T),/non aggiornata/);
const history={history:[{generated_at_utc:doc.generated_at_utc,
 stations:{brega_offshore:{quality:{status:"complete"},episode_changes:[{
 status:"confirmed",matching_ambiguous:false,arrival_change:"earlier",
 arrival_shift_hours:-3,peak_deltas:{significant_wave_height_m:.03}}]}}}]};
assert.match(revision(history,doc),/anticipato di 3 ore/);
assert.match(revision(history,doc),/0,03 m/);
assert.match(revision({history:[]},doc),/non disponibile/);
assert.ok(html.includes("non")&&html.includes("risacca"),"La sicurezza deve essere distinta dalla previsione offshore");
console.log("Bollettino web 4D1: 10 controlli superati (syntax, 2h, 1h, missing, stale, revision, HSE).");
