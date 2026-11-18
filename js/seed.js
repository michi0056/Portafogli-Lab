// Portafogli del progetto 'Creazione Portafogli' (dall'artifact 'Confronto Portafogli', 25 ott 2026).
// 16 portafogli: i piani attuali di DEGIRO e TR MY non sono inclusi, come richiesto.
export const SEED = (function(){
  var SW=function(w,alt){return {n:'iShares Core MSCI World (SWDA / IWDA / EUNL)',w:w,isin:[{c:'IE00B4L5Y983'}].concat(alt||[]),ter:0.20,fx:'non coperto',info:'Replica fisica · accumulazione · EUR 132,9 mld · 1.252 titoli (justETF)'};};
  var EMI=function(w){return {n:'iShares Core MSCI EM IMI (EIMI)',w:w,isin:[{c:'IE00BKM4GZ66'}],ter:0.18,fx:'non coperto',info:'Replica fisica · accumulazione · EUR 38,4 mld · 2.902 titoli (justETF)'};};
  var VWH=function(w){return {n:'Vanguard FTSE All-World UCITS ETF USD Acc (VWCE)',w:w,isin:[{c:'IE00BK5BQT80'}],ter:0.14,fx:'non coperto',info:'Replica fisica · accumulazione · USD 62,7 mld · USA 60,5% (getquin)'};};
  var SEH=function(w){return {n:'iShares MSCI EM UCITS ETF USD Acc (SEMA)',w:w,isin:[{c:'IE00B4L5YC18'}],ter:0.18,fx:'non coperto',info:'Replica fisica · accumulazione · USD 10,6 mld (getquin)'};};
  var WSH=function(w){return {n:'iShares MSCI World Small Cap (WSML)',w:w,isin:[{c:'IE00BF4RFH31'}],ter:0.35,fx:'non coperto',info:'Replica fisica · accumulazione · USD 8,9 mld · USA 59,1% (getquin)'};};
  var SMH=function(w){return {n:'VanEck Semiconductor UCITS ETF (VVSM)',w:w,isin:[{c:'IE00BMC38736'}],ter:0.35,fx:'USD',info:'Accumulazione · EUR 8,4 mld · Nord America 74,4% (Wealthyhood). TER 0,35% dal documento di revisione: la scheda online riporta un valore anomalo, da verificare sul KID'};};
  var NDH=function(w){return {n:'iShares Nasdaq 100 UCITS ETF USD Acc (CNDX)',w:w,isin:[{c:'IE00B53SZB19'}],ter:0.30,fx:'USD',info:'Replica fisica · accumulazione · USD 29,3 mld · USA 95,5% (getquin)'};};
  var NVH=function(w){return {n:'NVIDIA Corporation',w:w,isin:[{c:'US67066G1040'}],ter:0,fx:'USD',info:'Azione · Nasdaq · rend. atteso 12,4% (CAPM, β 1,9) · σ 45% (Trefis, 1 ott 2026)'};};
  var PLH=function(w){return {n:'Palantir Technologies',w:w,isin:[{c:'US69608A1088'}],ter:0,fx:'USD',info:'Azione · rendimento atteso con CAPM e β stimato (documento di revisione)'};};
  var TSH=function(w){return {n:'Tesla',w:w,isin:[{c:'US88160R1014'}],ter:0,fx:'USD',info:'Azione · rendimento atteso con CAPM e β stimato (documento di revisione)'};};
  var BTH=function(w){return {n:'ETP Bitcoin fisico (da scegliere)',w:w,isin:null,ter:null,fx:'USD',info:'Il TER non è incluso nel calcolo del documento: un ETP reale ha un costo non nullo'};};
  var GDH=function(w){return {n:'WisdomTree Core Physical Gold USD Acc',w:w,isin:[{c:'JE00BN2CJ301'}],ter:0.12,fx:'USD',info:'Oro fisico · accumulazione · USD 2,16 mld (getquin)'};};
  var BDH=function(w){return {n:'Xtrackers Global Government Bond UCITS ETF 1C EUR Hedged',w:w,isin:[{c:'LU0378818131'}],ter:0.25,fx:'coperto in euro',info:'Indice FTSE WGBI mercati sviluppati · EUR 715,9 mln · USA ~47% dell\'indice (extraETF)'};};
  var revNote='Dal documento Portafoglio_DEGIRO_TR_MY_Revisione (25 ott 2026): senza prodotti a leva, modello a indice singolo con σ di mercato 16%, rendimenti ETF BNY CMA 2026 e CAPM con β stimati per titoli e prodotti nuovi. Il portafoglio attuale non è mostrato.';
  var P=[
   {id:'p1',n:'PAC Globale Ex-USA',s:'PAC Globale Ex-USA',c:'--c0',
    m:{lordo:7.58,ter:0.25,netto:7.33,vol:15.3,cagr:6.16,sharpe:0.33,usa:10,fx:80},
    fxPre:'>',fxSub:'stima',terNote:'ipotesi',
    h:[
     {n:'Azionario sviluppato Europa + Asia-Pacifico (ETF UCITS MSCI Europe / MSCI Pacific ex Japan)',w:35,isin:null,ter:0.25,fx:'in valuta locale'},
     {n:'Azionario Mercati Emergenti ampio (ETF UCITS MSCI EM IMI)',w:38,isin:null,ter:0.25,fx:'non coperto'},
     {n:'Azionario USA, quota satellite (ETF UCITS S&P 500 / MSCI USA)',w:10,isin:null,ter:0.25,fx:'USD'},
     {n:'Oro e metalli preziosi (ETC su oro fisico)',w:9,isin:null,ter:0.25,fx:'USD'},
     {n:'Obbligazionario EM hard currency (ETF UCITS Bloomberg/JPM EM USD Aggregate)',w:8,isin:null,ter:0.25,fx:'USD'}],
    note:'Il documento definisce le classi di attivo e il tipo di strumento, non gli ETF specifici: gli ISIN vanno scelti (classe ad accumulazione, TER contenuto).'},
   {id:'a',n:'Portafoglio 2 · Mix A',s:'Mix A',c:'--c1',
    m:{lordo:5.64,ter:0.06,netto:5.58,vol:8.9,cagr:5.19,sharpe:0.35,usa:0,fx:20}},
   {id:'b',n:'Portafoglio 2 · Mix B',s:'Mix B',c:'--c2',
    m:{lordo:6.16,ter:0.08,netto:6.07,vol:11.1,cagr:5.46,sharpe:0.33,usa:0,fx:30}},
   {id:'c',n:'Portafoglio 2 · Mix C',s:'Mix C',c:'--c3',
    m:{lordo:6.73,ter:0.11,netto:6.61,vol:13.6,cagr:5.69,sharpe:0.31,usa:0,fx:45}},
   {id:'d',n:'Portafoglio 2 · Mix D',s:'Mix D',c:'--c4',
    m:{lordo:7.16,ter:0.14,netto:7.02,vol:15.6,cagr:5.80,sharpe:0.30,usa:0,fx:60}},
   {id:'pac',n:'PAC 25 € · MSCI World + EM IMI',s:'PAC 25 €',c:'--c5',
    m:{lordo:7.00,ter:0.196,netto:6.80,vol:17,cagr:5.36,sharpe:0.26,usa:57,fx:90},
    terDp:3,usaPre:'~',fxPre:'>',fxSub:'stima',volSub:'da Portafoglio B',
    h:[SW(80),EMI(20)],
    note:'Alternativa a un solo ETF se il broker non accetta rate da 5 €: Vanguard FTSE All-World (VWCE), ISIN IE00BK5BQT80, secondo il tuo file (oggi con TER 0,14%, vedi Portafoglio A).'},
   {id:'oa',n:'Portafoglio A · Massima Semplicità',s:'Portafoglio A',c:'--c6',
    m:{lordo:7.7,ter:0.14,netto:7.56,vol:16,cagr:6.28,sharpe:0.33,usa:60,fx:90},
    usaPre:'~',fxPre:'>',fxSub:'stima',terNote:'il file indicava 0,22%',
    h:[{n:'Vanguard FTSE All-World UCITS ETF (VWCE)',w:100,isin:[{c:'IE00BK5BQT80'}],ter:0.14,fx:'non coperto',info:'Replica fisica · accumulazione · USD 62,7 mld · USA 60,5% · ~10% emergenti (getquin)'}],
    note:'Un solo ETF su circa 3.800 titoli di 47 paesi. Il TER di 0,14% viene dalla riduzione annunciata da Vanguard il 21 lug 2026 (da 0,19%, data di entrata in vigore non indicata); il tuo file riportava 0,22%. Alternative citate nel file: Amundi Prime All Country World (WEBN, ISIN IE0003XJA0J9, TER 0,07%, USD 835 mln secondo etfstream) e SPDR MSCI ACWI IMI (SPYI, ISIN da verificare).'},
   {id:'ob',n:'Portafoglio B · World/EM 80/20',s:'Portafoglio B',c:'--c7',
    m:{lordo:7.8,ter:0.196,netto:7.60,vol:17,cagr:6.16,sharpe:0.31,usa:57,fx:90},
    terDp:3,usaPre:'~',fxPre:'>',fxSub:'stima',
    h:[SW(80),EMI(20)],
    note:'Stessa composizione del PAC da 25 €. Cambia l\'ipotesi di rendimento: 7,8% (Capital Market Assumptions BNY 2026) contro il 7,0% base del PAC. Il file indica un satellite emergenti con circa 22,75% di semiconduttori e volatilità a 1 anno del 21,36%.'},
   {id:'oc',n:'Portafoglio C · Allocazione Senior',s:'Portafoglio C',c:'--c8',
    m:{lordo:7.93,ter:0.2145,netto:7.71,vol:16,cagr:6.44,sharpe:0.33,usa:50,fx:90},
    usaPre:'~',fxPre:'>',fxSub:'stima',terNote:'il file indicava ~0,18%',volSub:'rendimento ricalcolato: il file indicava 8,2%',
    h:[SW(60,[{c:'IE0003XJA0J9',l:'alternativa: Amundi Prime All Country World (WEBN), TER 0,07%'}]),EMI(20),
     {n:'iShares MSCI World Small Cap (WSML)',w:15,isin:[{c:'IE00BF4RFH31'}],ter:0.35,fx:'non coperto',info:'Replica fisica · accumulazione · USD 8,9 mld · USA 59,1% (getquin)'},
     {n:'iShares Physical Gold ETC (SGLN / IGLN)',w:5,isin:[{c:'IE00B4ND3602'},{c:null,l:'alternativa: WisdomTree Physical Gold (PHAU), ISIN da verificare'}],ter:0.12,fx:'USD',info:'Oro fisico · USD 38,7 mld (getquin)'}],
    note:'WEBN include già i mercati emergenti: usarlo al posto di SWDA porterebbe l\'esposizione emergenti oltre il 20% indicato. Rendimenti attesi per componente nel file: World 7,7%, EM 8,1%, small cap ~9,3%, oro 5,8%.'},
   {id:'id',n:'IDEALE · Rendimento / rischio',s:'IDEALE',c:'--c9',
    m:{lordo:7.25,ter:0.1955,netto:7.06,vol:12.4,cagr:6.29,sharpe:0.37,usa:40,fx:88},
    terDp:2,usaPre:'~',fxPre:'~',fxSub:'stima',terNote:'ipotesi su EM obbl. 0,25%',
    h:[SW(47,[{c:'IE0003XJA0J9',l:'alternativa: Amundi Prime All Country World (WEBN): include già emergenti, ridurre il peso EM'}]),EMI(8),
     {n:'iShares MSCI World Small Cap (WSML)',w:15,isin:[{c:'IE00BF4RFH31'}],ter:0.35,fx:'non coperto',info:'Replica fisica · accumulazione · USD 8,9 mld · USA 59,1% (getquin)'},
     {n:'iShares Physical Gold ETC (SGLN / IGLN)',w:8,isin:[{c:'IE00B4ND3602'}],ter:0.12,fx:'USD'},
     {n:'BTP diretti, metà a 5 anni e metà a 7-10 anni (MOT)',w:12,isin:[{c:null,l:'Il BTP Valore ha chiuso il collocamento il 23 ott 2026: usare BTP sul mercato secondario, ISIN da verificare'}],ter:0,fx:'nessuno (euro)'},
     {n:'ETF UCITS obbligazionario EM hard currency (indice Bloomberg/JPM EM USD Aggregate, non coperto)',w:10,isin:null,ter:0.25,fx:'USD'}],
    note:'Sei classi di attivo scelte con un\'ottimizzazione sul CAGR atteso con volatilità massima 12,5% e limiti di prudenza (mondo ≥40%, EM 8-15%, small cap ≤15%, oro ≤8%, titoli di Stato ≤20%, obbligazioni EM ≤10%). Rata su 300 €: 141 / 24 / 45 / 24 / 36 / 30 €. Volatilità, correlazioni e rendimento small cap (~9,3%) sono stime del team. Il PDF completo è nel progetto (Portafoglio_IDEALE.pdf).'},
   {id:'d2',n:'DEGIRO 2',s:'DEGIRO 2',c:'--c10',
    m:{lordo:9.88,ter:0.205,netto:9.67,vol:23.3,cagr:6.96,sharpe:0.32,usa:56,fx:98},
    terDp:3,usaPre:'~',fxPre:'~',fxSub:'stima',volSub:'stima da modello',
    h:[SEH(20),WSH(20),SMH(20),NDH(5),NVH(20),PLH(5),GDH(10)],
    note:revNote+' Scenario a pari rischio del DEGIRO attuale, con la diversificazione migliorata.'},
   {id:'t2',n:'TR MY2',s:'TR MY2',c:'--c13',
    m:{lordo:7.25,ter:0.203,netto:7.05,vol:13.0,cagr:6.20,sharpe:0.37,usa:40,fx:82},
    terDp:3,usaPre:'~',fxPre:'~',fxSub:'stima',volSub:'stima da modello',
    h:[VWH(36),SEH(20),WSH(20),GDH(10),BDH(14)],
    note:revNote+' Scenario a pari rischio di TR MY: stesso Sharpe di IDEALE (0,37) con volatilità 13,0%.'},
   {id:'d10',n:'DEGIRO (10)',s:'DEGIRO (10)',c:'--c11',
    m:{lordo:10.13,ter:0.216,netto:9.91,vol:24.7,cagr:6.86,sharpe:0.31,usa:60,fx:98},
    terDp:3,usaPre:'~',fxPre:'~',fxSub:'stima',volSub:'stima da modello',
    h:[SEH(20),WSH(20),SMH(25),NDH(5),NVH(20),PLH(5),GDH(5)],
    note:revNote+' Target 10% di rendimento lordo.'},
   {id:'t10',n:'TRMY (10)',s:'TRMY (10)',c:'--c14',
    m:{lordo:10.02,ter:0.133,netto:9.89,vol:24.4,cagr:6.92,sharpe:0.31,usa:63,fx:88},
    terDp:3,usaPre:'~',fxPre:'~',fxSub:'stima',volSub:'stima da modello',
    h:[VWH(10),SEH(10),WSH(15),SMH(5),NVH(20),PLH(10),TSH(10),BTH(5),GDH(5),BDH(10)],
    note:revNote+' Target 10% di rendimento lordo.'},
   {id:'d12',n:'DEGIRO (12)',s:'DEGIRO (12)',c:'--c12',
    m:{lordo:12.05,ter:0.114,netto:11.93,vol:32.5,cagr:6.64,sharpe:0.29,usa:74,fx:98},
    terDp:3,usaPre:'~',fxPre:'~',fxSub:'stima',volSub:'stima da modello',
    h:[SEH(5),WSH(20),SMH(10),NVH(20),PLH(20),TSH(15),BTH(10)],
    note:revNote+' Target 12% di rendimento lordo: a questo livello la volatilità riduce il CAGR rispetto al 10%.'},
   {id:'t12',n:'TRMY (12)',s:'TRMY (12)',c:'--c15',
    m:{lordo:12.00,ter:0.072,netto:11.93,vol:33.7,cagr:6.27,sharpe:0.28,usa:79,fx:93},
    terDp:3,usaPre:'~',fxPre:'~',fxSub:'stima',volSub:'stima da modello',
    h:[VWH(5),WSH(15),NVH(25),PLH(25),TSH(15),BTH(10),BDH(5)],
    note:revNote+' Target 12% di rendimento lordo: a questo livello la volatilità riduce il CAGR rispetto al 10%.'}
  ];
  var mixH=function(emu,em,btp){return [
    {n:'UBS Core MSCI EMU UCITS ETF acc · azionario Eurozona',w:emu,isin:[{c:'LU0950668870'}],ter:0.09,fx:'nessuno (euro)'},
    {n:'Amundi MSCI Emerging Markets Swap UCITS ETF acc · azionario emergenti',w:em,isin:[{c:'LU1681045370'}],ter:0.20,fx:'non coperto'},
    {n:'iShares Physical Gold ETC · oro fisico',w:10,isin:[{c:'IE00B4ND3602'}],ter:0.12,fx:'non coperto (USD)'},
    {n:'BTP diretti',w:btp,isin:[{c:'IT0005735201',l:'BTP Valore 27/10/2031'},{c:'IT0005735227',l:'BTP Valore Insieme 27/10/2031'},{c:null,l:'BTP nov 2031 (MOT): ISIN da verificare'}],ter:0,fx:'nessuno (euro)'}];};
  var mixNote='Il BTP Valore è in collocamento fino al 23 ott 2026 alle 13:00 e può chiudere prima; le cedole annunciate sono un minimo. Se incolli gli ISIN della tua watchlist li sostituisco con stessi pesi e scadenze.';
  P[1].h=mixH(30,10,50);P[2].h=mixH(35,20,35);P[3].h=mixH(35,35,20);P[4].h=mixH(30,50,10);
  [1,2,3,4].forEach(function(i){P[i].note=mixNote;});
  P.forEach(function(p){p.origin='progetto';});
  return P;
})();
