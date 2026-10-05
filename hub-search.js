(function(root){
    'use strict';
    function normalize(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
    function matches(text,query){const normalized=normalize(text),tokens=normalize(query).split(/\s+/).filter(Boolean);return tokens.every(token=>normalized.includes(token));}
    if(typeof module!=='undefined'){module.exports={normalize,matches};return;}
    const input=document.getElementById('labSearch');if(!input)return;
    const cards=[...document.querySelectorAll('.nav-card')],clear=document.getElementById('clearSearch'),count=document.getElementById('searchCount'),empty=document.getElementById('noResults');
    const searchable=cards.map(card=>[card,[...card.querySelectorAll('.card-title,.card-meta,.card-desc')].map(el=>el.textContent).join(' ')]);
    function filter(){let visible=0;for(const [card,text] of searchable){card.hidden=!matches(text,input.value);if(!card.hidden)visible++;}clear.hidden=!input.value;empty.hidden=visible>0;count.textContent=visible===cards.length?visible+' labs':visible+' of '+cards.length+' labs';}
    input.addEventListener('input',filter);
    input.addEventListener('keydown',event=>{if(event.key==='Escape'){input.value='';filter();}});
    clear.addEventListener('click',()=>{input.value='';filter();input.focus();});
    input.closest('form').addEventListener('submit',event=>event.preventDefault());
    filter();
})(typeof window!=='undefined'?window:globalThis);
