import { C } from "../config/constants";
function ModePickerScreen({session,onSelect,onLogOut}){
  const username=session?.user?.user_metadata?.username||session?.user?.email?.split("@")[0]||"signed in";
  const cards=[
    {key:"practice",label:"Practice",desc:"Train your reaction speed and accuracy on your own.",icon:"⚡",color:C.green},
    {key:"1v1",label:"1v1 Duel",desc:"Go head-to-head against another player on the same rounds.",icon:"⚔",color:C.orange},
    {key:"profile",label:"Profile",desc:"View your stats, rank, and recent match history.",icon:"📊",color:C.cyan},
  ];

  return(
    <div className="menu-bg prac-page"><div className="grid-bg"/>
      <div className="prac-shell" style={{maxWidth:900,width:"100%"}}>
        
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:10,color:C.green,letterSpacing:5,fontWeight:800,marginBottom:16}}>WELCOME BACK</div>
          <h1 style={{fontSize:56,fontWeight:900,letterSpacing:-3,color:C.text,marginBottom:12}}>{username.toUpperCase()}</h1>
          <div style={{fontSize:12,color:C.textMuted,maxWidth:500,margin:"0 auto"}}>Pick a mode to continue.</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:16,marginBottom:32}}>
          {cards.map((card)=>(
            <button key={card.key} onClick={()=>onSelect(card.key)} className="glass-card" style={{padding:28,textAlign:"left",cursor:"pointer",transition:"all 0.2s",background:"black",border:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.borderColor=card.color} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{fontSize:24,marginBottom:16,color:card.color}}>{card.icon}</div>
              <div style={{fontSize:14,fontWeight:900,letterSpacing:1,color:C.text,marginBottom:8}}>{card.label}</div>
              <div style={{fontSize:11,color:C.textMuted,lineHeight:1.6}}>{card.desc}</div>
            </button>
          ))}
        </div>

        <div style={{textAlign:"center"}}>
          <button onClick={onLogOut} className="btn-ghost" style={{fontSize:9,padding:"8px 24px"}}>LOG OUT</button>
        </div>

      </div>
    </div>
  );
}

export default ModePickerScreen;
