export function copyName(name:string,items:readonly {name:string}[]):string{
 const base=name.replace(/(?: copy(?: \d+)?)+$/i,"")+" copy";
 const names=new Set(items.map(i=>i.name));
 if(!names.has(base))return base;
 let number=2;while(names.has(`${base} ${number}`))number++;
 return `${base} ${number}`;
}
