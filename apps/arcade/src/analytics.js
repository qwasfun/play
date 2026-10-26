import {siteConfig} from './site-config.js';

export function createAnalytics({config=siteConfig.umami,scope=globalThis,document=scope.document}={}){
  const queue=[];
  function dispatch(event,data){try{Promise.resolve(scope.umami?.track?.(event,data)).catch(()=>{});}catch{}}
  if(config?.websiteId&&config?.scriptUrl&&document){
    try{
      const script=document.createElement('script');script.defer=true;script.src=config.scriptUrl;
      script.dataset.websiteId=config.websiteId;script.dataset.autoPageview='false';
      script.onload=()=>{for(const[event,data]of queue.splice(0))dispatch(event,data);};
      script.onerror=()=>{queue.length=0;};
      document.head.append(script);
    }catch{/* Analytics never controls game availability. */}
  }
  return (event,data)=>{
    if(!config?.websiteId)return;
    const clean={};
    // An explicit allowlist prevents future profile/session fields from leaking.
    for(const key of ['game_id','mode','rules_version','score','elapsed','won'])if(['string','number','boolean'].includes(typeof data?.[key]))clean[key]=data[key];
    if(scope.umami?.track)dispatch(event,clean);
    else if(queue.length<50)queue.push([event,clean]);
  };
}
