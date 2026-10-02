"use client";
import type {ReactNode} from "react";

export type IconName="home"|"plus"|"layers"|"swatch"|"history"|"undo"|"redo"|"download"|"save"|"chevron-left"|"chevron-right"|"x"|"move"|"copy"|"lock"|"unlock"|"trash"|"grid"|"box"|"settings"|"search"|"check"|"warning"|"cloud"|"rotate";

const paths:Record<IconName,ReactNode>={
  home:<><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V21h14V9.8"/><path d="M9 21v-7h6v7"/></>,
  plus:<><path d="M12 5v14"/><path d="M5 12h14"/></>,
  layers:<><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></>,
  swatch:<><path d="M12 3a9 9 0 1 0 9 9c0-1.2-.8-2-2-2h-2.5a1.5 1.5 0 0 1 0-3H18a6 6 0 0 0-6-4Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10" cy="6.8" r=".8"/><circle cx="6.5" cy="14" r=".8"/></>,
  history:<><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v5l3 2"/></>,
  undo:<><path d="M9 7 4 12l5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/></>,
  redo:<><path d="m15 7 5 5-5 5"/><path d="M19 12h-8a6 6 0 0 0-6 6"/></>,
  download:<><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
  save:<><path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h9V3"/><path d="M7 21v-7h10v7"/></>,
  "chevron-left":<path d="m15 18-6-6 6-6"/>,
  "chevron-right":<path d="m9 18 6-6-6-6"/>,
  x:<><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
  move:<><path d="M12 2v20"/><path d="m8 6 4-4 4 4"/><path d="m8 18 4 4 4-4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/><path d="m18 8 4 4-4 4"/></>,
  copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  lock:<><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  unlock:<><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/></>,
  trash:<><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/></>,
  grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  box:<><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5"/><path d="M12 12v9"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.8-2L17 5l-2-2-2.8.8a7 7 0 0 0-2 0L7 3 5 5l.8 2.8a7 7 0 0 0-.8 2L3 10.5v3l2 .7a7 7 0 0 0 .8 2L5 19l2 2 2.8-.8a7 7 0 0 0 2 0L15 21l2-2-.8-2.8a7 7 0 0 0 .8-2l2-.7Z"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  check:<path d="m5 12 4 4L19 6"/>,
  warning:<><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5"/><path d="M12 18h.01"/></>,
  cloud:<><path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.3 8.6 4.8 4.8 0 0 0 7 18Z"/></>,
  rotate:<><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 0-2.05 4.95"/></>
};

export function Icon({name,size=18,className=""}:{name:IconName;size?:number;className?:string}){
  return <svg className={"icon "+className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
