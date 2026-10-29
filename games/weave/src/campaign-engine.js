import {label} from '@playground/game-sdk';
import {levelSession,boardInput,drawCells} from '@playground/game-sdk/level';
const groups=line=>{const out=[];let n=0;for(const v of [...line,false]){if(v)n++;else if(n){out.push(n);n=0;}}return out.length?out:[0];};
export function createCampaignGame(options){const {level}=options,session=levelSession(options),s=session.state,board=Array(25).fill(false),bounds={x:110,y:110,width:470,height:470};
 function solved(){return level.rows.every((clue,r)=>JSON.stringify(clue)===JSON.stringify(groups(board.slice(r*5,r*5+5))))&&level.cols.every((clue,c)=>JSON.stringify(clue)===JSON.stringify(groups(Array.from({length:5},(_,r)=>board[r*5+c]))));}
 const controls=boardInput({cols:5,bounds,activate(i){if(!session.active)return;board[i]=!board[i];session.step();s.score=board.filter(Boolean).length;if(solved())session.finish(true);}});
 return{update:dt=>session.update(dt),input:controls.input,getState(){return{...s,board:[...board],extra:`已填 ${board.filter(Boolean).length} 格`,hint:'按行列数字填色，符合全部线索即可完成'};},draw(ctx){drawCells(ctx,board,5,5,{bounds,selected:controls.selected,text:v=>v?'■':'',fill:v=>v?'#88aaa1':'#f4e6c7'});level.rows.forEach((clue,r)=>label(ctx,clue.join(' '),95,157+r*94,22,'#315f55','right'));level.cols.forEach((clue,c)=>clue.forEach((n,j)=>label(ctx,String(n),157+c*94,90-(clue.length-1-j)*26,23)));},destroy:()=>session.destroy()};
}
