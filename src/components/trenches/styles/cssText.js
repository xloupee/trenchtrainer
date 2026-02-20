import { C } from "../config/constants";
export const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700;800;900&display=swap');
  :root{--mono:'Geist Mono','IBM Plex Mono','JetBrains Mono',monospace;}
  *{box-sizing:border-box;margin:0;padding:0}
  body{overflow:hidden;background:${C.bg};font-family:var(--mono)}

  /* ── Background ── */
  .grid-bg{position:absolute;inset:0;pointer-events:none;z-index:0;
    background-image:
      linear-gradient(rgba(74,222,128,0.022) 1px,transparent 1px),
      linear-gradient(90deg,rgba(74,222,128,0.022) 1px,transparent 1px);
    background-size:60px 60px;}
  .grid-bg::after{content:'';position:absolute;inset:0;
    background:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity:0.022;mix-blend-mode:overlay;pointer-events:none;}
  .grid-bg-lite::after{display:none;}

  /* ── Tab Bar ── */
  .tab-bar{display:flex;align-items:center;padding:0 20px;height:56px;
    background:linear-gradient(180deg,${C.bgAlt} 0%,${C.bg} 100%);
    border-bottom:1px solid ${C.border};flex-shrink:0;z-index:20;gap:2px;position:relative;}
  .tab-bar::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent 5%,${C.green}28 40%,${C.green}28 60%,transparent 95%);
    pointer-events:none;}
  .tab-logo{display:flex;align-items:center;gap:0;margin-right:24px;font-size:13px;font-weight:900;color:${C.text};letter-spacing:1px;}
  .tab-logo-btn{background:transparent;border:none;padding:0;cursor:pointer;transition:opacity 0.2s;}
  .tab-logo-btn:hover{opacity:0.75;}
  .tab-btn{padding:10px 22px;background:transparent;border:none;border-bottom:2px solid transparent;
    color:${C.textDim};font-size:11px;font-weight:600;font-family:var(--mono);cursor:pointer;
    letter-spacing:2px;transition:all 0.2s;margin-bottom:-1px;
    display:flex;align-items:center;gap:7px;position:relative;}
  .tab-btn:hover{color:${C.textMuted};background:rgba(255,255,255,0.018);}
  .tab-active{color:var(--accent)!important;border-bottom-color:var(--accent)!important;font-weight:800;}
  .tab-active::after{content:'';position:absolute;bottom:-1px;left:20%;right:20%;height:10px;
    background:var(--accent);filter:blur(12px);opacity:0.35;pointer-events:none;}
  .tab-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;animation:pulse 2.5s ease-in-out infinite;}

  /* ── HUD ── */
  .hud-div{width:1px;height:26px;background:linear-gradient(180deg,transparent,${C.border}90,transparent);margin:0 8px;flex-shrink:0;}

  /* ── Column Headers ── */
  .col-header{padding:8px 14px;border-bottom:1px solid ${C.border};display:flex;align-items:center;gap:6px;flex-shrink:0;
    background:linear-gradient(180deg,rgba(255,255,255,0.012),transparent);}
  .badge-beta{font-size:7px;color:${C.green};background:rgba(74,222,128,0.08);padding:2px 7px;border-radius:4px;
    border:1px solid rgba(74,222,128,0.16);letter-spacing:1.8px;font-weight:700;}
  .empty-msg{padding:32px;text-align:center;color:${C.textGhost};font-size:10px;margin-top:44px;line-height:1.9;letter-spacing:0.5px;}

  /* ── Token Row ── */
  .token-row{transition:background 0.12s ease;}
  .token-row:hover{background:rgba(255,255,255,0.01);}

  /* ── Menu Background ── */
  .menu-bg{min-height:100vh;min-height:100dvh;height:auto;width:100%;background:${C.bg};
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:var(--mono);color:${C.text};padding:28px;position:relative;overflow:hidden;}
  .menu-inner{position:relative;z-index:1;text-align:center;max-width:500px;width:100%;padding:0 24px;}
  .menu-glow-orb{position:absolute;width:640px;height:640px;border-radius:50%;filter:blur(160px);
    opacity:0.07;pointer-events:none;top:50%;left:50%;transform:translate(-50%,-50%);
    animation:breathe 6s ease-in-out infinite;}
  .menu-glow-orb.green{background:${C.green};}
  .menu-glow-orb.orange{background:${C.orange};}
  .menu-glow-orb.yellow{background:${C.yellow};opacity:0.1;}

  .mode-picker-page{padding:26px 20px;}
  .mode-picker-shell{position:relative;z-index:1;width:min(980px,100%);display:flex;flex-direction:column;align-items:center;text-align:center;}
  .mode-picker-head{margin-bottom:22px;}
  .mode-picker-kicker{font-size:10px;color:${C.yellow};letter-spacing:3px;margin-bottom:8px;font-weight:700;text-shadow:0 0 12px rgba(251,191,36,0.25);}
  .mode-picker-title{font-size:38px;letter-spacing:-1.2px;margin-bottom:10px;color:${C.text};text-shadow:0 0 24px rgba(251,191,36,0.16);}
  .mode-picker-subtitle{font-size:12px;color:${C.textMuted};line-height:1.75;max-width:560px;margin:0 auto;}
  .mode-picker-snapshot{width:min(780px,100%);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px;}
  .mode-snapshot-item{padding:12px 10px;border-radius:12px;border:1px solid ${C.border};background:linear-gradient(145deg,${C.bgCard},${C.bgAlt});text-align:center;}
  .mode-snapshot-label{font-size:8px;letter-spacing:1.6px;color:${C.textDim};margin-bottom:6px;}
  .mode-snapshot-value{font-size:17px;font-weight:900;color:${C.text};font-family:var(--mono);}
  .mode-recommend-card{width:min(780px,100%);padding:11px 13px;border:1px solid ${C.border};border-radius:12px;background:linear-gradient(145deg,rgba(251,191,36,0.08),rgba(251,191,36,0.03));margin-bottom:12px;text-align:left;}
  .mode-recommend-title{font-size:10px;letter-spacing:1.6px;color:${C.yellow};font-weight:800;margin-bottom:4px;}
  .mode-recommend-reason{font-size:11px;color:${C.textMuted};line-height:1.6;}
  .mode-continue-card{width:min(780px,100%);padding:14px 14px;border:1px solid ${C.border};border-radius:14px;background:linear-gradient(145deg,${C.bgCard},${C.bgAlt});margin-bottom:14px;text-align:left;}
  .mode-continue-label{font-size:8px;letter-spacing:2px;color:${C.textDim};margin-bottom:6px;}
  .mode-continue-copy{font-size:12px;color:${C.textMuted};line-height:1.65;margin-bottom:12px;}
  .mode-continue-copy b{color:${C.text};font-weight:800;}
  .mode-continue-actions{display:flex;gap:10px;align-items:center;}
  .mode-continue-btn{width:auto;padding:10px 14px;font-size:10px;letter-spacing:1.2px;}
  .mode-choose-btn{font-size:9px;padding:8px 10px;}
  .mode-picker-grid{width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
  .mode-picker-card{
    font-family:var(--mono);
    text-align:left;background:linear-gradient(145deg,${C.bgCard} 0%,${C.bgAlt} 100%);
    border:1px solid ${C.border};border-radius:16px;padding:18px 16px;cursor:pointer;
    box-shadow:0 8px 32px rgba(0,0,0,0.24),inset 0 1px 0 rgba(255,255,255,0.03);
    transition:transform 0.18s ease,border-color 0.18s ease,box-shadow 0.18s ease;
  }
  .mode-picker-card:hover{
    transform:translateY(-2px);
    border-color:color-mix(in srgb,var(--pick-accent) 48%,${C.border});
    box-shadow:0 12px 34px color-mix(in srgb,var(--pick-accent) 16%, transparent),0 8px 32px rgba(0,0,0,0.24);
  }
  .mode-picker-icon{font-size:22px;line-height:1;margin-bottom:12px;color:var(--pick-accent);text-shadow:0 0 12px color-mix(in srgb,var(--pick-accent) 35%, transparent);}
  .mode-picker-label{font-size:14px;font-weight:900;letter-spacing:0.6px;color:${C.text};margin-bottom:7px;}
  .mode-picker-desc{font-size:11px;line-height:1.65;color:${C.textMuted};}

  /* ── Practice Menu (2-col layout) ── */
  .prac-page{justify-content:center;padding:24px 32px;}
  .prac-shell{position:relative;z-index:1;width:min(980px,100%);display:grid;
    grid-template-columns:1fr 1.1fr;gap:56px;align-items:center;}
  .prac-brand{display:flex;flex-direction:column;align-items:flex-start;}
  .prac-right{display:flex;flex-direction:column;gap:14px;}

  /* Keep legacy classes for other uses */
  .practice-menu-bg{justify-content:center;padding:24px 32px;}
  .practice-shell{position:relative;z-index:1;width:min(980px,100%);display:flex;flex-direction:column;align-items:center;gap:16px;}
  .practice-hero{text-align:center;display:flex;flex-direction:column;align-items:center;}
  .practice-kicker{font-size:9px;letter-spacing:4px;color:${C.green};text-transform:uppercase;margin-bottom:10px;font-weight:700;}
  .practice-icon{font-size:62px;line-height:1;filter:drop-shadow(0 0 36px rgba(74,222,128,0.45));
    animation:float 3.2s ease-in-out infinite;margin-bottom:10px;}
  .practice-title{margin-bottom:6px;}
  .practice-subtitle{font-size:10px;color:${C.textDim};letter-spacing:8px;text-transform:uppercase;margin-bottom:14px;font-weight:600;}
  .practice-pills{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;}
  .practice-pill{font-size:9px;letter-spacing:1.2px;color:${C.textMuted};padding:6px 13px;border-radius:999px;
    border:1px solid ${C.border};background:linear-gradient(145deg,${C.bgCard},${C.bgAlt});}
  .practice-pill b{color:${C.greenBright};font-weight:800;}
  .practice-card{width:100%;text-align:center;border-radius:18px;border:1px solid ${C.borderLight};
    background:linear-gradient(145deg,rgba(22,32,50,0.98),rgba(14,20,32,0.97));
    box-shadow:0 14px 52px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.025),inset 0 1px 0 rgba(255,255,255,0.04);
    padding:32px 30px;}
  .practice-card-title{font-size:10px;color:${C.green};font-weight:800;letter-spacing:3.5px;text-transform:uppercase;margin-bottom:18px;}
  .practice-steps{display:grid;grid-template-columns:1fr;row-gap:14px;justify-items:center;}
  .practice-step{display:flex;align-items:center;justify-content:flex-start;gap:10px;font-size:13.5px;line-height:1.55;
    color:${C.textMuted};opacity:0;animation:slideUp 0.35s ease forwards;text-align:left;max-width:420px;width:fit-content;min-width:330px;}
  .practice-step-num{width:30px;flex-shrink:0;text-align:right;font-variant-numeric:tabular-nums;letter-spacing:0.4px;}
  .practice-card-foot{margin-top:18px;padding-top:14px;border-top:1px solid ${C.border};
    font-size:10px;letter-spacing:1.5px;color:${C.textMuted};text-transform:uppercase;}
  .btn-primary.practice-start-btn{width:min(260px,100%);font-size:13px;padding:12px 12px;letter-spacing:2px;}

  /* ── Auth ── */
  .auth-page{padding:24px 18px;overflow-y:auto;}
  .auth-shell{position:relative;z-index:1;width:min(960px,100%);
    display:grid;grid-template-columns:1.15fr 0.85fr;gap:20px;align-items:stretch;}
  .auth-brand-card,.auth-form-card{
    background:linear-gradient(145deg,${C.bgCard} 0%,${C.bgAlt} 100%);
    border:1px solid ${C.border};border-radius:18px;
    box-shadow:0 8px 40px rgba(0,0,0,0.3),0 0 0 1px rgba(255,255,255,0.02),inset 0 1px 0 rgba(255,255,255,0.03);}
  .auth-brand-card{padding:32px 32px;text-align:left;display:flex;flex-direction:column;justify-content:center;}
  .auth-lock{font-size:48px;line-height:1;margin-bottom:16px;filter:drop-shadow(0 0 30px rgba(74,222,128,0.35));}
  .auth-title{font-size:36px;margin-bottom:10px;letter-spacing:-1.5px;}
  .auth-subtitle{font-size:13px;line-height:1.75;color:${C.textMuted};max-width:440px;margin-bottom:22px;}
  .auth-points{display:flex;flex-direction:column;gap:10px;}
  .auth-point{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;
    border:1px solid ${C.border};background:rgba(255,255,255,0.018);
    font-size:12px;color:${C.textMuted};transition:border-color 0.2s,background 0.2s;}
  .auth-point:hover{border-color:${C.borderLight};background:rgba(255,255,255,0.028);}
  .auth-point span{font-size:17px;flex-shrink:0;}
  .auth-form-card{padding:26px;text-align:left;display:flex;flex-direction:column;}
  .auth-form-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:16px;}
  .auth-mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
  .auth-mode-btn{border:1px solid ${C.border};border-radius:10px;padding:11px 12px;
    font-size:11px;font-weight:800;letter-spacing:1.2px;font-family:var(--mono);
    cursor:pointer;transition:all 0.2s;}
  .auth-mode-btn:hover{transform:translateY(-1px);}
  .auth-input{font-size:13px;}
  .auth-email-hint{font-size:10px;color:${C.textGhost};padding:8px 12px;border-radius:8px;
    background:${C.bg};border:1px solid ${C.border};word-break:break-all;}
  .auth-msg{font-size:10px;line-height:1.6;margin-bottom:12px;padding:9px 12px;
    border-radius:10px;border:1px solid transparent;}

  /* ── Typography ── */
  .title-text{font-size:48px;font-weight:900;letter-spacing:-3px;margin:0 0 4px;
    color:${C.text};line-height:1.1;filter:drop-shadow(0 2px 24px rgba(0,0,0,0.3));}

  /* ── Glass Card ── */
  .glass-card{background:linear-gradient(145deg,${C.bgCard} 0%,${C.bgAlt} 100%);
    border:1px solid ${C.border};border-radius:16px;padding:22px;
    box-shadow:0 6px 32px rgba(0,0,0,0.28),0 0 0 1px rgba(255,255,255,0.02),inset 0 1px 0 rgba(255,255,255,0.03);}

  /* ── Buttons ── */
  .btn-primary{width:100%;padding:15px 24px;border:none;border-radius:12px;font-size:14px;font-weight:900;
    font-family:var(--mono);cursor:pointer;letter-spacing:2px;text-transform:uppercase;
    transition:transform 0.15s ease,box-shadow 0.25s ease,filter 0.2s ease;
    color:${C.bg};position:relative;overflow:hidden;}
  .btn-primary::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;
    background:linear-gradient(45deg,transparent 40%,rgba(255,255,255,0.1) 50%,transparent 60%);
    animation:shimmer 3.5s ease-in-out infinite;pointer-events:none;}
  .btn-primary:hover{transform:translateY(-2px);}
  .btn-primary:active{transform:scale(0.97)!important;}
  .btn-static::before{display:none;}
  .btn-static:hover{transform:none;}
  .btn-static:active{transform:none!important;}
  .btn-green{background:linear-gradient(135deg,${C.green},${C.greenDim});
    box-shadow:0 4px 24px rgba(74,222,128,0.2),inset 0 1px 0 rgba(255,255,255,0.12);}
  .btn-green:hover{box-shadow:0 8px 48px rgba(74,222,128,0.38),inset 0 1px 0 rgba(255,255,255,0.12);filter:brightness(1.06);}
  .btn-orange{background:linear-gradient(135deg,${C.orange},#c2410c);
    box-shadow:0 4px 24px rgba(251,146,60,0.2),inset 0 1px 0 rgba(255,255,255,0.12);}
  .btn-orange:hover{box-shadow:0 8px 48px rgba(251,146,60,0.38),inset 0 1px 0 rgba(255,255,255,0.12);filter:brightness(1.06);}
  .btn-blue{background:linear-gradient(135deg,${C.blue},${C.cyan});
    box-shadow:0 4px 24px rgba(96,165,250,0.2),inset 0 1px 0 rgba(255,255,255,0.12);}
  .btn-blue:hover{box-shadow:0 8px 48px rgba(96,165,250,0.38),inset 0 1px 0 rgba(255,255,255,0.12);filter:brightness(1.06);}
  .btn-ghost{background:transparent;border:1px solid ${C.border};border-radius:6px;color:${C.textDim};
    font-size:8px;font-family:var(--mono);cursor:pointer;padding:4px 12px;
    letter-spacing:1.5px;transition:all 0.2s;}
  .btn-ghost:hover{border-color:${C.red};color:${C.red};box-shadow:0 0 16px rgba(248,113,113,0.12);}

  /* ── Inputs ── */
  .input-field{width:100%;padding:12px 16px;background:${C.bgCard};border:1px solid ${C.border};
    border-radius:10px;color:${C.text};font-size:14px;font-family:var(--mono);outline:none;
    transition:border-color 0.25s,box-shadow 0.25s;box-shadow:inset 0 2px 6px rgba(0,0,0,0.18);}
  .input-field:focus{border-color:${C.green};box-shadow:inset 0 2px 6px rgba(0,0,0,0.18),0 0 0 3px rgba(74,222,128,0.1);}
  .input-field::placeholder{color:${C.textGhost};}

  /* ── Game Feedback ── */
  .screen-flash{position:absolute;inset:0;z-index:100;pointer-events:none;animation:flashOut 0.35s ease-out forwards;}
  .feedback-wrap{position:sticky;bottom:14px;left:0;right:0;display:flex;justify-content:center;pointer-events:none;z-index:50;}
  .feedback-pill{padding:11px 28px;border-radius:14px;font-size:15px;font-weight:900;letter-spacing:0.5px;
    animation:feedbackPop 1.1s ease-out forwards;backdrop-filter:blur(20px);
    box-shadow:0 10px 40px rgba(0,0,0,0.4);}
  .fb-hit{background:rgba(74,222,128,0.14);border:1px solid rgba(74,222,128,0.32);color:${C.green};
    box-shadow:0 10px 40px rgba(74,222,128,0.14);}
  .fb-miss{background:rgba(248,113,113,0.14);border:1px solid rgba(248,113,113,0.32);color:${C.red};
    box-shadow:0 10px 40px rgba(248,113,113,0.14);}
  .blink-dot{display:inline-block;width:4px;height:4px;border-radius:50%;background:${C.textDim};animation:blink 0.6s infinite;margin-right:4px;}

  /* ── Keyframes ── */
  @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
  @keyframes feedbackPop{0%{opacity:1;transform:scale(0.82)}20%{opacity:1;transform:scale(1.1)}100%{opacity:0;transform:scale(1) translateY(-18px)}}
  @keyframes flashOut{from{opacity:1}to{opacity:0}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.08}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
  @keyframes breathe{0%,100%{opacity:0.07;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.1;transform:translate(-50%,-50%) scale(1.18)}}
  @keyframes shimmer{0%{transform:translateX(-100%) rotate(45deg)}100%{transform:translateX(100%) rotate(45deg)}}
  @keyframes shake{0%,100%{transform:none}10%{transform:translateX(-5px) rotate(-0.5deg)}30%{transform:translateX(5px) rotate(0.5deg)}50%{transform:translateX(-3px)}70%{transform:translateX(3px) rotate(-0.3deg)}90%{transform:translateX(-1px)}}
  @keyframes countPop{0%{opacity:0;transform:scale(0.3)}40%{opacity:1;transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}
  @keyframes comboPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.5)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}60%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}}
  @keyframes holsterPulse{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.4)}50%{box-shadow:0 0 0 10px rgba(74,222,128,0)}}

  .shake{animation:shake 0.35s ease-in-out}
  .combo-burst{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:200;pointer-events:none;animation:comboPop 0.9s ease-out forwards}
  .combo-text{font-size:64px;font-weight:900;color:${C.orange};text-shadow:0 0 40px ${C.orange}40,0 0 80px ${C.orange}20;font-family:var(--mono)}

  /* ── Responsive ── */
  @media (max-width:860px){
    .mode-picker-snapshot{grid-template-columns:1fr;max-width:560px;}
    .mode-continue-actions{flex-direction:column;align-items:stretch;}
    .mode-continue-btn,.mode-choose-btn{width:100%;}
    .mode-picker-grid{grid-template-columns:1fr;max-width:560px;margin:0 auto;}
    .mode-picker-title{font-size:32px;}
    .prac-shell{grid-template-columns:1fr;gap:28px;}
    .prac-brand{align-items:center;text-align:center;}
    .auth-shell{grid-template-columns:1fr;max-width:560px;}
    .auth-brand-card{padding:22px 22px;}
    .auth-title{font-size:32px;}
    .auth-subtitle{font-size:12px;}
    .auth-point{font-size:11px;padding:10px 12px;}
    .auth-form-card{padding:22px;}
  }
  @media (max-width:700px){
    .prac-page{padding:16px 14px;}
    .practice-card{padding:24px 18px;border-radius:16px;}
    .practice-steps{grid-template-columns:1fr;}
    .practice-step{font-size:13px;}
  }

  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
  ::-webkit-scrollbar-thumb:hover{background:${C.borderLight}}
`;
