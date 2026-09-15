import {writeFile} from 'node:fs/promises';
import {seedCatalog as catalog,rarities,cardValue,chance} from '../lib/catalog';
const lines=['# Card catalog — 108 pictures','', 'Ash rarities follow the supplied list. Satchel rarities were assigned with the owner’s approval. Prices are Spunk Nuggets.',''];
for(const ca of catalog.cases){
 lines.push(`## ${ca.name} — ${ca.price} SN`,'','| Card | Rarity | Base value | Case chance |','|---|---|---:|---:|');
 const items=catalog.items.filter(i=>ca.weights.some(w=>w.itemId===i.id)).sort((a,b)=>rarities.indexOf(b.rarity)-rarities.indexOf(a.rarity)||a.name.localeCompare(b.name));
 for(const i of items)lines.push(`| ${i.name} | ${i.rarity} | ${cardValue(i).toLocaleString('en-GB')} | ${chance(ca,i.id).toFixed(4)}% |`);
 lines.push('');
}
await writeFile('CATALOG.md',lines.join('\n')+'\n');
