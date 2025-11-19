
import React, { useState, useEffect } from 'react';
import {
  IconTimer, IconTarget, IconImage, IconCalendar, IconCheck, IconPlus, IconTrash, IconSparkles, IconBrain, IconPlay, IconPause, IconChevronRight
} from './components/Icons';
import { TaskStatus, TimerMode } from './types';
import { generateSubtasks, generateMotivation, getExamStudyTips } from './services/geminiService';

const ProgressBar = ({ progress, mode }: { progress: number, mode: string }) => (
  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-8 max-w-md relative">
    <div className={`h-full transition-all duration-1000 ease-linear ${mode === TimerMode.FOCUS ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 bg-[length:200%_100%] animate-[shimmer_2s_infinite]' : 'bg-gradient-to-r from-emerald-400 to-cyan-400'}`} style={{ width: `${progress}%` }} />
  </div>
);

const FullScreenFocus = ({ mode, timeLeft, totalTime, isActive, toggleTimer, onExit, taskLabel, onSkip }: any) => {
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const isBreak = mode !== TimerMode.FOCUS;
  return (
    <div className={`fixed inset-0 z-50 ${isBreak ? 'bg-emerald-950/95' : 'bg-dark/95'} backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in transition-colors duration-1000`}>
      <button onClick={onExit} className="absolute top-8 right-8 text-slate-400 hover:text-white"><div className="p-2 rounded-full border border-white/10">✕</div></button>
      <div className="text-center w-full max-w-2xl px-4">
        <div className="mb-8 animate-pulse-slow"><span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-[0.2em] uppercase border ${isBreak ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-violet-500/10 border-violet-500/20 text-violet-300'}`}>{mode === TimerMode.FOCUS ? 'Deep Focus' : 'Recharge Time'}</span></div>
        <h1 className="text-[8rem] md:text-[12rem] leading-none font-mono font-bold tracking-tighter text-white tabular-nums">{formatTime(timeLeft)}</h1>
        <p className="text-xl text-slate-400 mt-8 font-light">{isBreak ? "Take a breath." : <span>Working on: <span className={isBreak ? 'text-emerald-300' : 'text-violet-300'}>{taskLabel}</span></span>}</p>
        <div className="flex flex-col items-center mt-12 gap-6">
          <div className="flex items-center gap-4">
            <button onClick={toggleTimer} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 ${isActive ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-black'}`}>{isActive ? <IconPause className="w-8 h-8" /> : <IconPlay className="w-8 h-8 ml-1" />}</button>
            <button onClick={onSkip} className="w-12 h-12 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center border border-white/5"><IconChevronRight className="w-5 h-5" /></button>
          </div>
          <ProgressBar progress={progress} mode={mode} />
        </div>
      </div>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [savedDuration, setSavedDuration] = useState(() => {
    try { return parseInt(localStorage.getItem('2027_timerDuration') || '1500'); } catch { return 1500; }
  });

  const [timerMode, setTimerMode] = useState(TimerMode.FOCUS);
  const [timeLeft, setTimeLeft] = useState(savedDuration);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(savedDuration);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeVal, setEditTimeVal] = useState((savedDuration/60).toString());
  
  const [goals, setGoals] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('2027_goals') || '[]'); } catch { return []; }
  });
  const [visionItems, setVisionItems] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('2027_visionItems') || '[]'); } catch { return []; }
  });
  const [exams, setExams] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('2027_exams') || '[]'); } catch { return []; }
  });

  const [newGoalInput, setNewGoalInput] = useState('');
  const [loadingGoalId, setLoadingGoalId] = useState<string | null>(null);
  const [newVisionContent, setNewVisionContent] = useState('');
  const [newVisionType, setNewVisionType] = useState('image');
  const [newExamSub, setNewExamSub] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [loadingExamId, setLoadingExamId] = useState<string | null>(null);
  const [examTips, setExamTips] = useState<Record<string, string>>({});
  const [motivation, setMotivation] = useState("Loading vibes...");
  const [now, setNow] = useState(new Date());

  useEffect(() => { localStorage.setItem('2027_goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('2027_visionItems', JSON.stringify(visionItems)); }, [visionItems]);
  useEffect(() => { localStorage.setItem('2027_exams', JSON.stringify(exams)); }, [exams]);
  useEffect(() => { localStorage.setItem('2027_timerDuration', savedDuration.toString()); }, [savedDuration]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) interval = setInterval(() => setTimeLeft(p => p - 1), 1000);
    else if (timeLeft === 0 && timerActive) handleTimerComplete();
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    generateMotivation("studying").then(setMotivation);
    return () => clearInterval(interval);
  }, []);

  const handleTimerComplete = () => {
    const isFocus = timerMode === TimerMode.FOCUS;
    const nextMode = isFocus ? TimerMode.SHORT_BREAK : TimerMode.FOCUS;
    const nextDuration = isFocus ? 5 * 60 : savedDuration; 
    setTimerMode(nextMode);
    setTimerDuration(nextDuration);
    setTimeLeft(nextDuration);
    setEditTimeVal((nextDuration/60).toString());
    setTimerActive(false);
  };

  const saveTimeEdit = () => {
    setIsEditingTime(false);
    const m = parseInt(editTimeVal) || 25;
    const seconds = m * 60;
    setSavedDuration(seconds); 
    setTimerDuration(seconds);
    setTimeLeft(seconds);
  };

  const addGoal = async () => {
    if (!newGoalInput.trim()) return;
    const newGoal = { id: Date.now().toString(), title: newGoalInput, progress: 0, tasks: [] };
    setGoals([...goals, newGoal]);
    setNewGoalInput('');
    setLoadingGoalId(newGoal.id);
    const subtasks = await generateSubtasks(newGoal.title);
    const tasks = subtasks.map((t, i) => ({ id: `${newGoal.id}-${i}`, title: t, status: TaskStatus.TODO }));
    setGoals(prev => prev.map(g => g.id === newGoal.id ? { ...g, tasks } : g));
    setLoadingGoalId(null);
  };

  const toggleTask = (gId: string, tId: string) => {
    setGoals(goals.map(g => {
      if (g.id !== gId) return g;
      const updatedTasks = g.tasks.map((t: any) => t.id === tId ? { ...t, status: t.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE } : t);
      const completed = updatedTasks.filter((t: any) => t.status === TaskStatus.DONE).length;
      return { ...g, tasks: updatedTasks, progress: updatedTasks.length ? Math.round((completed / updatedTasks.length) * 100) : 0 };
    }));
  };

  const deleteGoal = (id: string) => setGoals(goals.filter(g => g.id !== id));
  const deleteTask = (gId: string, tId: string) => {
      setGoals(goals.map(g => {
        if (g.id !== gId) return g;
        const updatedTasks = g.tasks.filter((t: any) => t.id !== tId);
        const completed = updatedTasks.filter((t: any) => t.status === TaskStatus.DONE).length;
        return { ...g, tasks: updatedTasks, progress: updatedTasks.length ? Math.round((completed / updatedTasks.length) * 100) : 0 };
      }));
  };
  const addVision = () => { if(newVisionContent) { setVisionItems([...visionItems, { id: Date.now().toString(), type: newVisionType, content: newVisionContent }]); setNewVisionContent(''); }};
  const addExam = () => { if(newExamSub && newExamDate) { setExams([...exams, { id: Date.now().toString(), subject: newExamSub, date: new Date(newExamDate).toISOString(), topics: [] }]); setNewExamSub(''); setNewExamDate(''); }};
  const deleteExam = (id: string) => setExams(exams.filter(e => e.id !== id));
  const getTips = async (id: string, sub: string) => { setLoadingExamId(id); const tips = await getExamStudyTips(sub); setExamTips(p => ({...p, [id]: tips})); setLoadingExamId(null); };

  const msTo2027 = new Date('2027-01-01').getTime() - now.getTime();
  const daysTo2027 = Math.max(0, Math.floor(msTo2027 / (86400000)));
  const daysToYearEnd = Math.max(0, Math.floor((new Date(now.getFullYear() + 1, 0, 1).getTime() - now.getTime()) / 86400000));

  return (
    <React.Fragment>
      {isFullScreen && <FullScreenFocus mode={timerMode} timeLeft={timeLeft} totalTime={timerDuration} isActive={timerActive} toggleTimer={() => setTimerActive(!timerActive)} onExit={() => setIsFullScreen(false)} onSkip={handleTimerComplete} taskLabel={goals[0]?.title || "Deep Work"} />}
      <div className="flex h-screen w-full text-white font-sans">
        <aside className="w-20 lg:w-64 glass-panel-strong flex flex-col p-4 lg:p-6 z-40 border-r border-white/5">
           <div className="mb-10 flex items-center justify-center lg:justify-start lg:space-x-3"><div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center"><span className="font-bold text-black text-xs">2027</span></div><h1 className="hidden lg:block text-2xl font-mono font-bold">2027</h1></div>
           <nav className="flex-1 space-y-2">
             {[
               {id: 'dashboard', label: 'Dashboard', icon: IconTimer},
               {id: 'goals', label: 'Weekly Goals', icon: IconTarget},
               {id: 'vision', label: 'Vision Board', icon: IconImage},
               {id: 'exams', label: 'Evaluations', icon: IconCalendar}
             ].map(i => (
               <button key={i.id} onClick={() => setActiveTab(i.id)} className={`flex items-center w-full p-3 rounded-xl transition-all ${activeTab === i.id ? 'bg-white/10 text-white border border-white/10' : 'text-slate-400 hover:bg-white/5'}`}>
                 <i.icon className={`w-5 h-5 mr-3 ${activeTab === i.id ? 'text-violet-300' : 'text-slate-400'}`} /><span className="hidden lg:block">{i.label}</span>
               </button>
             ))}
           </nav>
           <div className="hidden lg:block p-4 rounded-2xl bg-white/5 border border-white/5"><p className="text-xs text-fuchsia-300 uppercase tracking-wider mb-2">Daily Vibe</p><p className="text-sm italic text-slate-300">"{motivation}"</p></div>
        </aside>
        <main className="flex-1 overflow-y-auto relative z-0 p-6 md:p-10">
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto pb-24 animate-fade-in">
              <header className="mb-10"><h2 className="text-3xl font-bold mb-1">Welcome to the Future.</h2><p className="text-slate-400">Every second counts towards 2027.</p></header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                 <div className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-center min-h-[200px] border-t border-white/10">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-600/20 rounded-full blur-[80px]"></div>
                    <h3 className="relative z-10 text-xs font-bold uppercase tracking-[0.3em] text-violet-300 mb-4">Time Until 2027</h3>
                    <div className="relative z-10 flex items-baseline gap-3"><span className="text-7xl md:text-8xl font-bold text-white tracking-tighter">{daysTo2027}</span><span className="text-2xl text-slate-400">days</span></div>
                 </div>
                 <div className="flex flex-col gap-6">
                    <div className="glass-panel p-8 rounded-[2.5rem] flex-1 relative overflow-hidden flex flex-col justify-center border-t border-white/10">
                       <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px]"></div>
                       <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300 mb-2">Year Remaining</h3>
                       <div className="flex items-baseline gap-3"><span className="text-5xl md:text-6xl font-bold">{daysToYearEnd}</span><span className="text-lg text-slate-400">days left</span></div>
                    </div>
                    <div className="glass-panel px-8 py-6 rounded-[2rem] flex items-center justify-between border-t border-white/10">
                       <div><div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Status</div><div className="text-white font-medium">{timerActive ? (timerMode === TimerMode.FOCUS ? "🔥 Deep Focus" : "🍃 Recharging") : "Ready"}</div></div>
                       <button onClick={() => setIsFullScreen(true)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><IconPlay className="w-4 h-4" /></button>
                    </div>
                 </div>
              </div>
              <div className="glass-panel rounded-[2rem] p-8 mb-10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4"><span className={`h-2 w-2 rounded-full ${timerMode === TimerMode.FOCUS ? 'bg-violet-500' : 'bg-emerald-400'}`}></span><span className="text-sm uppercase tracking-widest text-slate-400">{timerMode} Mode</span></div>
                    {isEditingTime ? (
                       <input autoFocus type="number" value={editTimeVal} onChange={(e) => /^\d{0,3}$/.test(e.target.value) && setEditTimeVal(e.target.value)} onBlur={saveTimeEdit} onKeyDown={e => e.key === 'Enter' && saveTimeEdit()} className="text-7xl font-bold bg-transparent text-white outline-none w-full max-w-[300px] border-b-2 border-violet-500 font-mono" />
                    ) : (
                       <h2 onClick={() => { setIsEditingTime(true); setEditTimeVal(Math.floor(timeLeft/60).toString()); }} className="text-7xl md:text-8xl font-bold font-mono tracking-tighter cursor-pointer hover:text-violet-200 transition-colors">{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</h2>
                    )}
                    <p className="text-slate-400 mt-2 text-sm">Click time to edit • Press play to focus</p>
                 </div>
                 <button onClick={() => { if(!timerActive) setIsFullScreen(true); setTimerActive(!timerActive); }} className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-all"><IconPlay className="w-8 h-8 ml-1" /></button>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
             <div className="max-w-5xl mx-auto animate-fade-in">
                <header className="flex justify-between items-end mb-8"><div><h2 className="text-3xl font-bold">Weekly Goals</h2><p className="text-slate-400">Break down your ambitions.</p></div><div className="glass-panel p-1.5 rounded-xl flex"><input type="text" placeholder="New goal..." className="bg-transparent outline-none px-4 py-2 w-48 text-white text-sm" value={newGoalInput} onChange={e=>setNewGoalInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addGoal()} /><button onClick={addGoal} className="bg-violet-600 px-4 rounded-lg text-sm">Add</button></div></header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {goals.map(g => (
                      <div key={g.id} className="glass-panel rounded-2xl p-6 flex flex-col group hover:shadow-xl transition-all">
                         <div className="flex justify-between mb-4"><h3 className="font-semibold text-lg">{g.title}</h3><button onClick={()=>deleteGoal(g.id)} className="text-slate-600 hover:text-red-400"><IconTrash className="w-4 h-4"/></button></div>
                         <div className="w-full bg-black/20 h-1.5 rounded-full mb-6"><div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all" style={{width: `${g.progress}%`}}></div></div>
                         <div className="space-y-3">
                            {loadingGoalId === g.id && <div className="text-center text-xs text-violet-300 animate-pulse">Generating plan...</div>}
                            {g.tasks.map((t: any) => (
                               <div key={t.id} className="flex justify-between group/task cursor-pointer" onClick={()=>toggleTask(g.id, t.id)}>
                                  <div className="flex items-center"><div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${t.status === TaskStatus.DONE ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>{t.status === TaskStatus.DONE && <IconCheck className="w-3 h-3 text-black"/>}</div><span className={`text-sm ${t.status === TaskStatus.DONE ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{t.title}</span></div>
                                  <button onClick={(e)=>{e.stopPropagation(); deleteTask(g.id, t.id)}} className="opacity-0 group-hover/task:opacity-100 text-slate-600 hover:text-red-400"><IconTrash className="w-3 h-3"/></button>
                               </div>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'vision' && (
             <div className="max-w-7xl mx-auto animate-fade-in">
                <header className="flex justify-between items-center mb-10"><div><h2 className="text-3xl font-bold">Vision Board</h2><p className="text-slate-400">Manifest your aesthetic.</p></div><div className="flex gap-2 glass-panel p-2 rounded-xl"><select className="bg-transparent text-sm text-slate-300 outline-none" value={newVisionType} onChange={(e)=>setNewVisionType(e.target.value)}><option value="image" className="bg-dark">Image</option><option value="quote" className="bg-dark">Quote</option></select><input type="text" placeholder="URL or Text..." className="bg-transparent outline-none px-3 text-sm w-64" value={newVisionContent} onChange={e=>setNewVisionContent(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addVision()} /><button onClick={addVision} className="bg-white/10 p-2 rounded-lg"><IconPlus className="w-4 h-4"/></button></div></header>
                <div className="columns-1 md:columns-3 lg:columns-4 gap-6 space-y-6">
                   {visionItems.map(i => (
                      <div key={i.id} className="break-inside-avoid glass-panel rounded-2xl overflow-hidden group relative hover:-translate-y-2 transition-all">
                         {i.type === 'image' ? <><img src={i.content} className="w-full" />{i.caption && <div className="absolute bottom-0 inset-x-0 p-4 bg-black/60 text-xs text-center">{i.caption}</div>}</> : <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center bg-slate-800/50"><IconSparkles className="w-6 h-6 mb-4 text-fuchsia-400"/><p className="font-serif text-xl">"{i.content}"</p></div>}
                         <button onClick={()=>setVisionItems(visionItems.filter(x=>x.id!==i.id))} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"><IconTrash className="w-3 h-3"/></button>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'exams' && (
             <div className="max-w-4xl mx-auto animate-fade-in">
                <header className="flex justify-between items-end mb-10"><div><h2 className="text-3xl font-bold">Evaluations</h2><p className="text-slate-400">Track exams and deadlines.</p></div><div className="glass-panel p-2 rounded-xl flex gap-2"><input type="text" placeholder="Subject" className="bg-transparent outline-none px-3 text-sm w-32" value={newExamSub} onChange={e=>setNewExamSub(e.target.value)} /><input type="date" className="bg-transparent outline-none px-3 text-sm text-slate-300" value={newExamDate} onChange={e=>setNewExamDate(e.target.value)} /><button onClick={addExam} className="bg-fuchsia-600 p-2 rounded-lg"><IconPlus className="w-4 h-4"/></button></div></header>
                <div className="space-y-4">
                   {exams.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).map(e => {
                      const days = Math.ceil((new Date(e.date).getTime() - Date.now())/86400000);
                      return (
                         <div key={e.id} className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center gap-8 relative group">
                            <div className="flex-1"><h3 className="text-2xl font-bold">{e.subject}</h3><p className="text-sm text-slate-400 flex items-center gap-2"><IconCalendar className="w-4 h-4"/> {new Date(e.date).toLocaleDateString()}</p></div>
                            <div className="text-center"><div className={`text-4xl font-bold ${days<=3?'text-red-400':'text-violet-300'}`}>{days}</div><div className="text-[10px] uppercase tracking-widest text-slate-500">Days Left</div></div>
                            <div className="w-full md:w-72 bg-black/20 rounded-xl p-4 border border-white/5">
                               {!examTips[e.id] ? <button onClick={()=>getTips(e.id, e.subject)} disabled={loadingExamId===e.id} className="w-full h-full flex items-center justify-center text-xs text-fuchsia-300 hover:text-fuchsia-200 py-2">{loadingExamId===e.id ? <IconSparkles className="w-4 h-4 animate-spin"/> : <><IconBrain className="w-4 h-4 mr-2"/> Generate Strategy</>}</button> : <div className="text-xs text-slate-300 whitespace-pre-wrap font-mono opacity-90">{examTips[e.id]}</div>}
                            </div>
                            <button onClick={()=>deleteExam(e.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><IconTrash className="w-4 h-4"/></button>
                         </div>
                      );
                   })}
                </div>
             </div>
          )}
        </main>
      </div>
    </React.Fragment>
  );
}

export default App;
