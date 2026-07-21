const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'eggs', 'scramjet.all.js');
let content = fs.readFileSync(file, 'utf8');

const target = 'e.Proxy("window.open",{apply(t){t.args[0]&&(t.args[0]=(0,a.Oy)(t.args[0],e.meta)),("_top"===t.args[1]||"_unfencedTop"===t.args[1])&&(t.args[1]=e.meta.topFrameName),"_parent"===t.args[1]&&(t.args[1]=e.meta.parentFrameName);let r=t.call();if(!r)return t.return(r);if(i.pX in r)return t.return(r[i.pX].global);{let e=new n.ScramjetClient(r);return e.hook(),t.return(e.global)}}})';

const replacement = 'e.Proxy("window.open",{apply(t){t.args[0]&&(t.args[0]=(0,a.Oy)(t.args[0],e.meta));if(e.global!==e.global.parent){try{const decoded=(0,a.v2)(t.args[0]);e.global.parent.dispatchEvent(new e.global.parent.CustomEvent("unstable-open-tab",{detail:{url:decoded}}));return t.return(null)}catch(err){console.error(err)}}("_top"===t.args[1]||"_unfencedTop"===t.args[1])&&(t.args[1]=e.meta.topFrameName),"_parent"===t.args[1]&&(t.args[1]=e.meta.parentFrameName);let r=t.call();if(!r)return t.return(r);if(i.pX in r)return t.return(r[i.pX].global);{let e=new n.ScramjetClient(r);return e.hook(),t.return(e.global)}}})';

if (!content.includes(target)) {
  console.error('Target not found in scramjet.all.js!');
  process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched scramjet.all.js!');
