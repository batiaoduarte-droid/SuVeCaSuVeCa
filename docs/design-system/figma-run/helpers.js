const V=Object.fromEntries((await figma.variables.getLocalVariablesAsync()).map(v=>[v.name,v]));
const TS=Object.fromEntries((await figma.getLocalTextStylesAsync()).map(s=>[s.name,s]));
const ES=Object.fromEntries((await figma.getLocalEffectStylesAsync()).map(s=>[s.name,s]));
await Promise.all(Object.values(TS).map(s=>figma.loadFontAsync(s.fontName)));
const created=[];
function paint(n){if(!V[n])throw new Error('Unknown variable '+n);return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',V[n]);}
function fill(n,key){n.fills=key?[paint(key)]:[];}
function border(n,key='border/subtle',w=1){n.strokes=[paint(key)];n.strokeWeight=w;}
function rad(n,r){for(const k of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])n.setBoundVariable(k,V['radius/'+r]);}
function gap(n,v){n.setBoundVariable('itemSpacing',V['space/'+v]);}
function pad(n,v,h=v){for(const k of ['paddingTop','paddingBottom'])n.setBoundVariable(k,V['space/'+v]);for(const k of ['paddingLeft','paddingRight'])n.setBoundVariable(k,V['space/'+h]);}
function box(parent,name,width,dir='VERTICAL',bg=null,p=0,g=12){const n=figma.createAutoLayout(dir);created.push(n);n.name=name;fill(n,bg);n.resize(width,1);n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='FIXED';pad(n,p);gap(n,g);if(parent)parent.appendChild(n);return n;}
function stretch(n){n.layoutSizingHorizontal='FILL';return n;}
async function txt(parent,chars,style='Body/Default',color='text/primary',fillWidth=true){const n=figma.createText();created.push(n);n.name=chars.slice(0,48);await n.setTextStyleIdAsync(TS[style].id);n.characters=chars;fill(n,color);parent.appendChild(n);n.textAutoResize='HEIGHT';if(fillWidth)n.layoutSizingHorizontal='FILL';else n.textAutoResize='WIDTH_AND_HEIGHT';return n;}
function allIds(nodes=created){return [...new Set(nodes.flatMap(n=>[n.id,...('findAll'in n?n.findAll(()=>true).map(x=>x.id):[])]))];}
async function doc(page,title,desc,width=1200){const roots=page.children;const y=roots.length?Math.max(...roots.map(n=>n.y+n.height))+80:80;const n=box(page,title,width,'VERTICAL','surface/default',32,16);n.x=80;n.y=y;rad(n,16);await txt(n,title,'Display/Desktop','text/strong');await txt(n,desc,'Body/Reading','text/muted');return n;}
async function cell(parent,title,body,width=320,tone='surface/subtle'){const n=box(parent,title,width,'VERTICAL',tone,24,12);rad(n,12);await txt(n,title,'Heading/Card','text/strong');await txt(n,body);return n;}
function cmp(name,w=220,dir='HORIZONTAL'){const c=figma.createComponent();created.push(c);c.name=name;c.layoutMode=dir;c.resize(w,44);c.primaryAxisSizingMode='AUTO';c.counterAxisSizingMode='FIXED';c.counterAxisAlignItems=dir==='HORIZONTAL'?'CENTER':'MIN';pad(c,12,16);gap(c,8);fill(c,'surface/default');rad(c,10);return c;}
function prop(owner,node,label='Label'){const k=owner.addComponentProperty(label,'TEXT',node.characters);node.componentPropertyReferences={...node.componentPropertyReferences,characters:k};return k;}
function variants(page,name,comps,cols=4,desc=''){const set=figma.combineAsVariants(comps,page);created.push(set);set.name=name;set.description=desc;const cw=Math.max(...comps.map(c=>c.width)),ch=Math.max(...comps.map(c=>c.height));comps.forEach((c,i)=>{c.x=24+(i%cols)*(cw+24);c.y=24+Math.floor(i/cols)*(ch+24);});set.resize(Math.min(cols,comps.length)*(cw+24)+24,Math.ceil(comps.length/cols)*(ch+24)+24);fill(set,'surface/subtle');rad(set,16);const others=page.children.filter(n=>n.id!==set.id&&!comps.some(c=>c.id===n.id));set.x=80;set.y=others.length?Math.max(...others.map(n=>n.y+n.height))+40:80;return set;}
async function inst(parent,compId,label){const c=await figma.getNodeByIdAsync(compId);const n=c.createInstance();created.push(n);parent.appendChild(n);if(label!==undefined){const k=Object.keys(n.componentProperties).find(k=>k.startsWith('Label#')||k.startsWith('Title#'));if(k)n.setProperties({[k]:label});}return n;}
