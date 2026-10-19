export function node(tag, text) { const el=document.createElement(tag); if(text!==undefined)el.textContent=text; return el; }
export function input(type='text') { const el=node('input'); el.type=type; return el; }
export function select(options) { const el=node('select'); for(const [value,label] of options){const option=node('option',label);option.value=value;el.append(option);}return el; }
export function field(label, control) { const el=node('label'); const text=node('span',label);el.append(text,control);return el; }
export function button(label, action, type='button') { const el=node('button',label);el.type=type;if(action)el.addEventListener('click',action);return el; }
