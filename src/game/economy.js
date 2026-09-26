import { assert } from '../core/errors.js';
import { clamp, newId } from '../core/utils.js';
import { makeItem } from './catalog.js';

export const MARKET_ITEMS = [
  { id:'life-potion', name:'Poção de Vida', icon:'⚗', description:'Recupera até 25 HP. Estoque comum entre viajantes.', type:'CONSUMABLE', rarity:'COMMON', basePrice:18, factory:()=>makeItem('potion') },
  { id:'luminous-herb', name:'Ervas Luminosas', icon:'☘', description:'Ingrediente de alquimia e crafting.', type:'MATERIAL', rarity:'COMMON', basePrice:9, factory:()=>({id:newId(),name:'Ervas Luminosas',icon:'☘',description:'Folhas macias que brilham no escuro.',type:'MATERIAL',rarity:'COMMON',value:6,weight:.1,quantity:1,effects:[],attributes:{}}) },
  { id:'iron-fragment', name:'Fragmento de Ferro', icon:'◇', description:'Metal bruto para armas, armaduras e focos.', type:'MATERIAL', rarity:'COMMON', basePrice:12, factory:()=>({id:newId(),name:'Fragmento de Ferro',icon:'◇',description:'Um fragmento mineral útil para forja.',type:'MATERIAL',rarity:'COMMON',value:8,weight:.7,quantity:1,effects:[],attributes:{}}) },
  { id:'clear-water', name:'Frasco de Água Clara', icon:'◌', description:'Recurso de campo usado em infusões.', type:'MATERIAL', rarity:'COMMON', basePrice:7, factory:()=>({id:newId(),name:'Frasco de Água Clara',icon:'◌',description:'Água fresca recolhida de uma nascente próxima.',type:'MATERIAL',rarity:'COMMON',value:4,weight:.4,quantity:1,effects:[],attributes:{}}) },
  { id:'field-bandage', name:'Bandagem de Campo', icon:'✚', description:'Consumível simples que recupera 14 HP.', type:'CONSUMABLE', rarity:'COMMON', basePrice:13, factory:()=>({id:newId(),name:'Bandagem de Campo',icon:'✚',description:'Tecido limpo preparado para emergências.',type:'CONSUMABLE',rarity:'COMMON',value:9,weight:.1,quantity:1,effects:[{type:'HEAL',value:14}],attributes:{}}) },
];

export function ensureWallet(character) {
  character.coins = Math.max(0, Math.trunc(Number(character.coins ?? 75)));
  return character.coins;
}

export function economyMultiplier(world={}) {
  const danger=clamp(Number(world?.ecosystem?.dangerLevel||0),0,5);
  const tension=clamp(Number(world?.tension||0),0,100);
  return Number((1 + danger*.04 + tension*.0015).toFixed(2));
}

export function marketPresentation(character,world={}) {
  const multiplier=economyMultiplier(world);
  const coins=ensureWallet(character);
  return {
    name:'Mercado da Travessia', currency:'Coroas', coins, multiplier,
    items:MARKET_ITEMS.map(item=>({...item,factory:undefined,price:Math.max(1,Math.round(item.basePrice*multiplier)),affordable:coins>=Math.max(1,Math.round(item.basePrice*multiplier))})),
  };
}

function stackOrPush(character,item,quantity){
  const stackable=!item.slot && item.type!=='QUEST';
  if(stackable){
    const existing=(character.inventory||[]).find(candidate=>candidate.name===item.name&&candidate.type===item.type&&!candidate.slot);
    if(existing){existing.quantity=Number(existing.quantity||0)+quantity;return existing;}
  }
  item.quantity=quantity;character.inventory.push(item);return item;
}

export function buyMarketItem(character,world,marketId,quantity=1){
  ensureWallet(character);
  const definition=MARKET_ITEMS.find(item=>item.id===marketId);
  assert(definition,'UNKNOWN_MARKET_ITEM','Este item não está à venda.');
  const count=clamp(Math.trunc(Number(quantity||1)),1,10);
  const price=Math.max(1,Math.round(definition.basePrice*economyMultiplier(world)));
  const total=price*count;
  assert(character.coins>=total,'INSUFFICIENT_COINS','Coroas insuficientes para esta compra.');
  character.coins-=total;
  const item=stackOrPush(character,definition.factory(),count);
  return {item,total,unitPrice:price,quantity:count,coins:character.coins};
}

export function sellInventoryItem(character,world,itemId,quantity=1){
  ensureWallet(character);
  const item=(character.inventory||[]).find(candidate=>candidate.id===itemId);
  assert(item,'ITEM_UNAVAILABLE','Item não encontrado na mochila.');
  assert(item.type!=='QUEST'&&Number(item.value||0)>0,'ITEM_NOT_SELLABLE','Este item não pode ser vendido.');
  assert(!Object.values(character.equipment||{}).includes(item.id),'ITEM_EQUIPPED','Desequipe o item antes de vender.');
  const count=clamp(Math.trunc(Number(quantity||1)),1,Math.max(1,Number(item.quantity||1)));
  assert(Number(item.quantity||0)>=count,'ITEM_UNAVAILABLE','Quantidade indisponível.');
  const unit=Math.max(1,Math.round(Number(item.value||1)*.48/economyMultiplier(world)));
  const total=unit*count;
  item.quantity-=count;
  if(item.quantity<=0)character.inventory=character.inventory.filter(candidate=>candidate.id!==item.id);
  character.coins+=total;
  return {itemName:item.name,total,unitPrice:unit,quantity:count,coins:character.coins};
}
