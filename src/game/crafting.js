import { assert } from '../core/errors.js';
import { cleanText, newId } from '../core/utils.js';

export const RECIPES = [
  {id:'luminous-tonic',name:'Tônico Luminoso',icon:'⚗',category:'Consumível',description:'Elixir simples de campo que restaura 35 HP.',ingredients:[{name:'Ervas Luminosas',quantity:2},{name:'Frasco de Água Clara',quantity:1}],result:{name:'Tônico Luminoso',icon:'⚗',description:'Restaura 35 HP. Produzido com ingredientes coletados.',type:'CONSUMABLE',rarity:'UNCOMMON',value:28,weight:.2,effects:[{type:'HEAL',value:35}],attributes:{}}},
  {id:'iron-edge',name:'Lâmina de Ferro Bruto',icon:'⚔',category:'Arma',description:'Arma forjada com material local. +3 ataque.',ingredients:[{name:'Fragmento de Ferro',quantity:2}],result:{name:'Lâmina de Ferro Bruto',icon:'⚔',description:'Uma lâmina funcional moldada durante a jornada.',type:'WEAPON',slot:'weapon',rarity:'UNCOMMON',value:55,weight:2.2,requirements:{level:2},effects:[],attributes:{attack:3}}},
  {id:'trail-charm',name:'Talismã da Trilha',icon:'✦',category:'Acessório',description:'Mistura metal e ervas para aguçar percepção e sorte.',ingredients:[{name:'Fragmento de Ferro',quantity:1},{name:'Ervas Luminosas',quantity:1}],result:{name:'Talismã da Trilha',icon:'✦',description:'Pequeno foco artesanal usado por viajantes.',type:'ACCESSORY',slot:'accessory',rarity:'UNCOMMON',value:48,weight:.2,requirements:{level:2},effects:[],attributes:{perception:1,luck:1}}},
  {id:'arcane-focus',name:'Foco do Limiar',icon:'◇',category:'Acessório',description:'Catalisador para magia e estudo. +1 magia e +1 inteligência.',ingredients:[{name:'Fragmento de Ferro',quantity:1},{name:'Ervas Luminosas',quantity:2}],result:{name:'Foco do Limiar',icon:'◇',description:'Um foco improvisado que ressoa com o mundo de Eidryss.',type:'ACCESSORY',slot:'accessory',rarity:'RARE',value:70,weight:.3,requirements:{level:3},effects:[],attributes:{magic:1,intelligence:1}}},
  {id:'field-armor',name:'Reforço de Campo',icon:'♜',category:'Armadura',description:'Camadas reforçadas com metal local. +3 defesa.',ingredients:[{name:'Fragmento de Ferro',quantity:3}],result:{name:'Reforço de Campo',icon:'♜',description:'Proteção modular feita longe de uma oficina completa.',type:'ARMOR',slot:'armor',rarity:'UNCOMMON',value:60,weight:3.2,requirements:{level:2},effects:[],attributes:{defense:3}}},
  {id:'clarity-draught',name:'Infusão de Clareza',icon:'☘',category:'Consumível',description:'Recupera 18 mana em uma ação.',ingredients:[{name:'Ervas Luminosas',quantity:2},{name:'Frasco de Água Clara',quantity:1}],result:{name:'Infusão de Clareza',icon:'☘',description:'Infusão de ervas que restaura foco mágico.',type:'CONSUMABLE',rarity:'UNCOMMON',value:30,weight:.2,effects:[{type:'MANA',value:18}],attributes:{}}},
];

function norm(value=''){return cleanText(value,120).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}

export function recipeStatus(character,recipe){
  const inventory=character?.inventory||[];
  return recipe.ingredients.map(ingredient=>{
    const total=inventory.filter(item=>norm(item.name)===norm(ingredient.name)).reduce((sum,item)=>sum+Number(item.quantity||0),0);
    return {...ingredient,have:total,ready:total>=ingredient.quantity};
  });
}

export function craft(character,recipeId){
  const recipe=RECIPES.find(item=>item.id===recipeId);assert(recipe,'UNKNOWN_RECIPE','Receita desconhecida.');
  const status=recipeStatus(character,recipe);assert(status.every(item=>item.ready),'MISSING_INGREDIENTS','Faltam ingredientes para fabricar este item.');
  for(const ingredient of recipe.ingredients){
    let remaining=ingredient.quantity;
    for(const item of character.inventory){
      if(remaining<=0||norm(item.name)!==norm(ingredient.name))continue;
      const take=Math.min(remaining,Number(item.quantity||0));item.quantity-=take;remaining-=take;
    }
  }
  character.inventory=character.inventory.filter(item=>Number(item.quantity||0)>0);
  const result={...structuredClone(recipe.result),id:newId(),quantity:1,metadata:{source:'crafting',recipeId:recipe.id}};
  character.inventory.push(result);
  return {recipe,result};
}
