import fs from 'node:fs';
import vm from 'node:vm';
const names=['book-open','arrow-right','search','check','x','chevron-down','circle-help','timer','sparkles','circle-alert','loader-circle','more-horizontal','brain','graduation-cap','cpu'];
function readIcon(name) {
  const source=fs.readFileSync(`node_modules/lucide-react/dist/esm/icons/${name}.js`,'utf8');
  const alias=source.match(/export \{ default \} from '\.\/([^']+)\.js'/);
  if(alias) return readIcon(alias[1]);
  const match=source.match(/const __iconNode = ([\s\S]*?);\r?\nconst /);
  if(!match) throw new Error(`No icon geometry found: ${name}`);
  return vm.runInNewContext(match[1]);
}
const icons=Object.fromEntries(names.map(name=>{const nodes=readIcon(name);const svg='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#115e59" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+nodes.map(([tag,attrs])=>'<'+tag+' '+Object.entries(attrs).filter(([key])=>key!=='key').map(([k,v])=>k+'="'+v+'"').join(' ')+'/>').join('')+'</svg>';return [name,svg];}));
fs.writeFileSync('docs/design-system/figma-run/lucide-icons.json',JSON.stringify(icons,null,2));
console.log(JSON.stringify(icons));
