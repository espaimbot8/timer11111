import React, { useState, useEffect, useRef } from 'react';
import { 
  IconTimer, IconTarget, IconImage, IconCalendar, IconCheck, 
  IconPlus, IconTrash, IconSparkles, IconPlay, IconPause, IconBrain, IconSettings, IconChevronRight
} from './components/Icons';
import { TimerMode, WeeklyGoal, VisionItem, Exam, Task } from './types';
import { generateSubtasks, generateMotivation, getExamStudyTips } from './services/geminiService';

// --- Components ---

const ProgressBar = ({ progress, mode }: { progress: number, mode: TimerMode }) => (
  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-8 max-w-md relative">
    <div 
      className={`h-full transition-all duration-1000 ease-linear ${
        mode === TimerMode.FOCUS 
          ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 bg-[length:200%_100%] animate-[shimmer_2s_infinite]'
          : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
      }`}
      style={{ width: `${progress}%` }}
    />
  </div>
);

const FullScreenFocus = ({ 
  mode, timeLeft, totalTime, isActive, toggleTimer, onExit, taskLabel, onSkip
}: { 
  mode: TimerMode, timeLeft: number, totalTime: number, isActive: boolean, toggleTimer: () => void, onExit: () => void, taskLabel?: string, onSkip: () => void
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Theme determination
  const isBreak = mode === TimerMode.SHORT_BREAK || mode === TimerMode.LONG_BREAK;
  const bgClass = isBreak 
    ? 'bg-emerald-950/95 backdrop-blur-3xl' 
    : 'bg-dark/95 backdrop-blur-3xl';
  const textAccent = isBreak ? 'text-emerald-300' : 'text-violet-300';

  return (
    <div className={`fixed inset-0 z-50 ${bgClass} flex flex-col items-center justify-center animate-fade-in transition-colors duration-1000`}>
      <button 
        onClick={onExit}
        className="absolute top-8 right-8 text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"
      >
        <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">Exit Focus Mode</span>
        <div className="p-2 rounded-full border border-white/10 group-hover:border-white/30">✕</div>
      </button>

      <div className="text-center w-full max-w-2xl px-4">
        <div className="mb-8 animate-pulse-slow">
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-[0.2em] uppercase border ${
            isBreak ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-violet-500/10 border-violet-500/20 text-violet-300'
          }`}>
            {mode === TimerMode.FOCUS ? 'Deep Focus' : 'Recharge Time'}
          </span>
        </div>

        <h1 className="text-[8rem] md:text-[12rem] leading-none font-mono font-bold tracking-tighter text-white select-none tabular-nums drop-shadow-2xl">
          {formatTime(timeLeft)}
        </h1>

        {mode === TimerMode.FOCUS ? (
          <p className="text-xl text-slate-400 mt-8 font-light">Working on: <span className={textAccent}>{taskLabel}</span></p>
        ) : (
          <p className="text-xl text-slate-300 mt-8 font-light">Take a breath. You earned this.</p>
        )}

        <div className="flex flex-col items-center mt-12 gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTimer}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' 
                  : 'bg-white text-black hover:bg-slate-200 shadow-[0_0_40px_rgba(255,255,255,0.3)]'
              }`}
            >
              {isActive ? <IconPause className="w-8 h-8" /> : <IconPlay className="w-8 h-8 ml-1" />}
            </button>
            {/* Skip Button only visible if timer paused or if user wants to force skip */}
            <button 
               onClick={onSkip}
               className="w-12 h-12 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all border border-white/5"
               title="Skip Section"
            >
               <IconChevronRight className="w-5 h-5" />
            </button>
          </div>

          <ProgressBar progress={progress} mode={mode} />
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'goals' | 'vision' | 'exams'>('dashboard');
  
  // --- Timer State ---
  const [timerMode, setTimerMode] = useState<TimerMode>(TimerMode.FOCUS);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeVal, setEditTimeVal] = useState("25");

  // --- Goals State ---
  const [goals, setGoals] = useState<WeeklyGoal[]>([
    { id: '1', title: 'Finish Research Paper', progress: 60, tasks: [{ id: 't1', title: 'Find sources', status: 'DONE' as any }, { id: 't2', title: 'Write intro', status: 'DONE' as any }, { id: 't3', title: 'Draft body paragraphs', status: 'IN_PROGRESS' as any }] },
    { id: '2', title: 'Linear Algebra Pset', progress: 0, tasks: [{ id: 't4', title: 'Q1-Q5', status: 'TODO' as any }] }
  ]);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [loadingGoalId, setLoadingGoalId] = useState<string | null>(null);

  // --- Vision Board State ---
  const [visionItems, setVisionItems] = useState<VisionItem[]>([
    { id: 'v1', type: 'image', content: 'https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?auto=format&fit=crop&w=600&q=80', caption: 'Dream Setup' },
    { id: 'v2', type: 'quote', content: 'The future depends on what you do today.' },
    { id: 'v3', type: 'image', content: 'https://images.unsplash.com/photo-1555212697-194d092e3b8f?auto=format&fit=crop&w=600&q=80', caption: 'Graduation' },
  ]);
  const [newVisionContent, setNewVisionContent] = useState('');
  const [newVisionType, setNewVisionType] = useState<'image' | 'quote'>('image');

  // --- Exam State ---
  const [exams, setExams] = useState<Exam[]>([
    { id: 'e1', subject: 'Physics 101', date: new Date(Date.now() + 86400000 * 3).toISOString(), topics: ['Mechanics', 'Waves'] },
    { id: 'e2', subject: 'Psychology Midterm', date: new Date(Date.now() + 86400000 * 10).toISOString(), topics: ['Cognition', 'Memory'] }
  ]);
  const [newExamSub, setNewExamSub] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [loadingExamId, setLoadingExamId] = useState<string | null>(null);
  const [examTips, setExamTips] = useState<{[key:string]: string}>({});

  // --- Motivation ---
  const [motivation, setMotivation] = useState("Loading vibes...");

  // --- Countdown State ---
  const [now, setNow] = useState(new Date());

  // --- Effects ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  useEffect(() => {
      // Update clock for 2027 countdown
      const interval = setInterval(() => setNow(new Date()), 60000);
      generateMotivation("studying and achieving dreams").then(setMotivation);
      return () => clearInterval(interval);
  }, []);

  // --- Handlers ---

  const handleTimerComplete = () => {
    // Auto-switch mode logic
    const isFocus = timerMode === TimerMode.FOCUS;
    const nextMode = isFocus ? TimerMode.SHORT_BREAK : TimerMode.FOCUS;
    const nextDuration = isFocus ? 5 : 25;

    setTimerMode(nextMode);
    setTimerDuration(nextDuration * 60);
    setTimeLeft(nextDuration * 60);
    setEditTimeVal(nextDuration.toString());
    
    // We pause the timer so the user can take a breath and acknowledge the mode switch,
    // but we keep the FullScreen overlay open so they are locked in.
    // If they are in "Break" mode, they see the break screen. 
    // If they are back to "Focus", they see the focus screen.
    setTimerActive(false); 
  };

  const handleSkipTimer = () => {
    handleTimerComplete();
  };

  const toggleTimer = () => {
    if (!timerActive) {
      setTimerActive(true);
      setIsFullScreen(true);
    } else {
      setTimerActive(false);
    }
  };

  const handleTimeEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d{0,3}$/.test(val)) {
      setEditTimeVal(val);
    }
  };

  const saveTimeEdit = () => {
    setIsEditingTime(false);
    const mins = parseInt(editTimeVal) || 25;
    setTimerDuration(mins * 60);
    setTimeLeft(mins * 60);
  };

  const addGoal = async () => {
    if (!newGoalInput.trim()) return;
    const newGoal: WeeklyGoal = {
      id: Date.now().toString(),
      title: newGoalInput,
      progress: 0,
      tasks: []
    };
    setGoals([...goals, newGoal]);
    setNewGoalInput('');
    setLoadingGoalId(newGoal.id);
    const subtasks = await generateSubtasks(newGoal.title);
    const tasks: Task[] = subtasks.map((t, i) => ({
      id: `${newGoal.id}-${i}`,
      title: t,
      status: 'TODO' as any
    }));
    setGoals(prev => prev.map(g => g.id === newGoal.id ? { ...g, tasks } : g));
    setLoadingGoalId(null);
  };

  const toggleTask = (goalId: string, taskId: string) => {
    setGoals(goals.map(g => {
      if (g.id !== goalId) return g;
      const updatedTasks = g.tasks.map(t => 
        t.id === taskId ? { ...t, status: t.status === 'DONE' ? 'TODO' : 'DONE' as any } : t
      );
      const completed = updatedTasks.filter(t => t.status === 'DONE').length;
      const progress = updatedTasks.length ? Math.round((completed / updatedTasks.length) * 100) : 0;
      return { ...g, tasks: updatedTasks, progress };
    }));
  };

  const addVisionItem = () => {
    if (!newVisionContent) return;
    setVisionItems([...visionItems, {
      id: Date.now().toString(),
      type: newVisionType,
      content: newVisionContent,
      caption: newVisionType === 'image' ? '' : undefined
    }]);
    setNewVisionContent('');
  };

  const addExam = () => {
    if (!newExamSub || !newExamDate) return;
    setExams([...exams, {
      id: Date.now().toString(),
      subject: newExamSub,
      date: new Date(newExamDate).toISOString(),
      topics: []
    }]);
    setNewExamSub('');
    setNewExamDate('');
  };

  const getTipsForExam = async (examId: string, subject: string) => {
    setLoadingExamId(examId);
    const tips = await getExamStudyTips(subject);
    setExamTips(prev => ({...prev, [examId]: tips}));
    setLoadingExamId(null);
  };

  // Format time helper
  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Countdown Calculations ---
  const year2027 = new Date('2027-01-01T00:00:00');
  const nextYear = now.getFullYear() + 1;
  const endOfYear = new Date(nextYear, 0, 1);

  const msTo2027 = year2027.getTime() - now.getTime();
  const msToYearEnd = endOfYear.getTime() - now.getTime();

  const daysTo2027 = Math.max(0, Math.floor(msTo2027 / (1000 * 60 * 60 * 24)));
  const daysToYearEnd = Math.max(0, Math.floor(msToYearEnd / (1000 * 60 * 60 * 24)));


  // --- Render ---

  const SidebarItem = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex items-center w-full p-3 mb-2 rounded-xl transition-all duration-200 group ${activeTab === id ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
    >
      <div className={`p-2 rounded-lg mr-3 transition-colors ${activeTab === id ? 'bg-violet-500/20' : 'bg-transparent group-hover:bg-white/5'}`}>
        <Icon className={`w-5 h-5 ${activeTab === id ? 'text-violet-300' : 'text-slate-400'}`} />
      </div>
      <span className="font-medium tracking-wide">{label}</span>
    </button>
  );

  return (
    <>
      {/* Full Screen Focus Overlay */}
      {isFullScreen && (
        <FullScreenFocus 
          mode={timerMode}
          timeLeft={timeLeft}
          totalTime={timerDuration}
          isActive={timerActive}
          toggleTimer={() => setTimerActive(!timerActive)}
          onExit={() => { setIsFullScreen(false); setTimerActive(false); }}
          onSkip={handleSkipTimer}
          taskLabel={goals[0]?.title || "Deep Work"}
        />
      )}

      <div className="flex h-screen w-full text-white font-sans">
        {/* Navigation Sidebar */}
        <aside className="w-20 lg:w-64 glass-panel-strong flex flex-col p-4 lg:p-6 z-40 transition-all duration-300 border-r-0 lg:border-r border-white/5">
          <div className="mb-10 flex items-center justify-center lg:justify-start lg:space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <span className="font-bold text-black text-xs tracking-tighter">2027</span>
            </div>
            <h1 className="hidden lg:block text-2xl font-mono font-bold tracking-tight text-white">2027</h1>
          </div>

          <nav className="flex-1">
            <SidebarItem id="dashboard" label="Dashboard" icon={IconTimer} />
            <SidebarItem id="goals" label="Weekly Goals" icon={IconTarget} />
            <SidebarItem id="vision" label="Vision Board" icon={IconImage} />
            <SidebarItem id="exams" label="Evaluations" icon={IconCalendar} />
          </nav>

          <div className="mt-auto hidden lg:block p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5">
              <p className="text-xs font-medium text-fuchsia-300 uppercase tracking-wider mb-2">Daily Vibe</p>
              <p className="text-sm font-serif italic text-slate-300 leading-relaxed opacity-90">
                "{motivation}"
              </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative z-0 scroll-smooth">
          
          {/* DASHBOARD (HOME) */}
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto p-6 md:p-10 animate-fade-in pb-24">
              <header className="mb-10">
                  <h2 className="text-3xl font-bold mb-1">Welcome to the Future.</h2>
                  <p className="text-slate-400">Every second counts towards 2027.</p>
              </header>

              {/* 2027 COUNTDOWN HERO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Main 2027 Counter */}
                <div className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden group flex flex-col justify-center min-h-[200px] border-t border-white/10">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-600/20 rounded-full blur-[80px] group-hover:bg-violet-600/30 transition-colors duration-700"></div>
                    <div className="relative z-10">
                        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                            Time Until 2027
                        </h3>
                        <div className="flex items-baseline gap-3">
                            <span className="text-7xl md:text-8xl font-bold text-white tracking-tighter drop-shadow-lg">{daysTo2027}</span>
                            <span className="text-2xl text-slate-400 font-light">days</span>
                        </div>
                        <p className="text-slate-500 text-sm mt-4 font-mono">The clock is ticking on your dreams.</p>
                    </div>
                </div>

                {/* Year End Counter & Mini Stats */}
                <div className="flex flex-col gap-6">
                     <div className="glass-panel p-8 rounded-[2.5rem] flex-1 relative overflow-hidden group flex flex-col justify-center border-t border-white/10">
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px] group-hover:bg-emerald-500/20 transition-colors"></div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300 mb-2">Year Remaining</h3>
                        <div className="flex items-baseline gap-3">
                            <span className="text-5xl md:text-6xl font-bold text-white tracking-tighter">{daysToYearEnd}</span>
                            <span className="text-lg text-slate-400 font-light">days left in {now.getFullYear()}</span>
                        </div>
                     </div>

                     {/* Quick Motivation / Status */}
                     <div className="glass-panel px-8 py-6 rounded-[2rem] flex items-center justify-between border-t border-white/10">
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Current Status</div>
                            <div className="text-white font-medium">
                                {timerActive 
                                    ? (timerMode === TimerMode.FOCUS ? "🔥 Deep Focus Mode" : "🍃 Recharging") 
                                    : "Ready to start"}
                            </div>
                        </div>
                        <button onClick={() => setIsFullScreen(true)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                            <IconPlay className="w-4 h-4" />
                        </button>
                     </div>
                </div>
              </div>

              {/* Top Section: Timer Card & Quick Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                {/* Timer Card */}
                <div className="lg:col-span-2 glass-panel rounded-[2rem] p-8 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full gap-8">
                    <div className="flex-1 text-center md:text-left">
                       <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
                         <span className={`h-2 w-2 rounded-full ${timerMode === TimerMode.FOCUS ? 'bg-violet-500 shadow-[0_0_10px_#8b5cf6]' : 'bg-emerald-400 shadow-[0_0_10px_#34d399]'}`}></span>
                         <span className="text-sm font-medium tracking-widest uppercase text-slate-400">{timerMode} Mode</span>
                       </div>
                       
                       {/* Editable Timer Display */}
                       <div className="relative group/timer inline-block">
                         {isEditingTime ? (
                           <input 
                             autoFocus
                             type="number"
                             value={editTimeVal}
                             onChange={handleTimeEditChange}
                             onBlur={saveTimeEdit}
                             onKeyDown={(e) => e.key === 'Enter' && saveTimeEdit()}
                             className="text-7xl md:text-8xl font-bold bg-transparent text-white outline-none w-full max-w-[300px] border-b-2 border-violet-500 font-mono"
                           />
                         ) : (
                           <h2 
                             onClick={() => { setIsEditingTime(true); setEditTimeVal(Math.floor(timeLeft/60).toString()); }}
                             className="text-7xl md:text-8xl font-bold font-mono tracking-tighter text-white cursor-pointer hover:text-violet-200 transition-colors tabular-nums"
                           >
                             {formatTimeDisplay(timeLeft)}
                           </h2>
                         )}
                         {!isEditingTime && <div className="absolute -right-6 top-0 text-xs text-slate-500 opacity-0 group-hover/timer:opacity-100">✎</div>}
                       </div>
                       
                       <p className="text-slate-400 mt-2 text-sm">Click time to edit • Press play to focus</p>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      <button 
                        onClick={toggleTimer}
                        className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all duration-300"
                      >
                        <IconPlay className="w-8 h-8 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Next Eval Card */}
                <div className="glass-panel rounded-[2rem] p-6 flex flex-col justify-between relative overflow-hidden hover:border-white/20 transition-colors">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                     <IconCalendar className="w-24 h-24" />
                   </div>
                   <div>
                     <h3 className="text-lg font-medium text-slate-200 mb-1">Next Evaluation</h3>
                     {exams.length > 0 ? (
                       <>
                         <div className="text-3xl font-bold text-white mt-4 mb-1">{exams[0].subject}</div>
                         <div className="text-sm text-fuchsia-300 font-mono">
                           {Math.ceil((new Date(exams[0].date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Days Left
                         </div>
                       </>
                     ) : (
                       <div className="mt-4 text-slate-500 italic">No upcoming exams. Chill.</div>
                     )}
                   </div>
                   <button onClick={() => setActiveTab('exams')} className="mt-6 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition-colors flex items-center justify-center">
                     View All <IconChevronRight className="w-4 h-4 ml-1" />
                   </button>
                </div>
              </div>

              {/* Weekly Goals Widget */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Weekly Priorities</h3>
                  <button onClick={() => setActiveTab('goals')} className="text-sm text-violet-400 hover:text-violet-300">Manage Goals</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.slice(0, 4).map(goal => (
                    <div key={goal.id} className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:bg-white/5 transition-colors">
                       <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium text-lg">{goal.title}</h4>
                          <div className="text-xs font-mono text-slate-500">{goal.progress}%</div>
                       </div>
                       <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${goal.progress}%` }}></div>
                       </div>
                       <div className="mt-4 space-y-2">
                          {goal.tasks.slice(0, 2).map(task => (
                             <div key={task.id} onClick={() => toggleTask(goal.id, task.id)} className="flex items-center text-sm cursor-pointer group">
                                <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center transition-colors ${task.status === 'DONE' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                   {task.status === 'DONE' && <IconCheck className="w-3 h-3 text-black" />}
                                </div>
                                <span className={`transition-colors ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-slate-300 group-hover:text-white'}`}>{task.title}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                  ))}
                  <button onClick={() => setActiveTab('goals')} className="glass-panel border-dashed border-2 border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-white/30 transition-all">
                     <IconPlus className="w-8 h-8 mb-2 opacity-50" />
                     <span className="text-sm font-medium">Add New Goal</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GOALS TAB (Detailed) */}
          {activeTab === 'goals' && (
            <div className="max-w-5xl mx-auto p-8 animate-fade-in">
              <header className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl font-bold">Weekly Goals</h2>
                  <p className="text-slate-400 mt-1">Break down your ambitions.</p>
                </div>
                <div className="glass-panel p-1.5 rounded-xl flex shadow-lg">
                  <input 
                    type="text" 
                    placeholder="New goal..." 
                    className="bg-transparent border-none outline-none px-4 py-2 w-48 md:w-64 text-white placeholder-slate-500 text-sm"
                    value={newGoalInput}
                    onChange={(e) => setNewGoalInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                  />
                  <button onClick={addGoal} className="bg-violet-600 hover:bg-violet-500 text-white px-4 rounded-lg transition-colors text-sm font-medium">
                    Add
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(goal => (
                  <div key={goal.id} className="glass-panel rounded-2xl p-6 flex flex-col group hover:shadow-2xl hover:shadow-violet-900/10 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg pr-2 leading-tight text-white">{goal.title}</h3>
                      <button onClick={() => setGoals(goals.filter(g => g.id !== goal.id))} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-black/20 h-1.5 rounded-full mb-6 overflow-hidden">
                      <div 
                          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 shadow-[0_0_10px_#8b5cf6]"
                          style={{ width: `${goal.progress}%` }}
                      />
                    </div>

                    <div className="flex-1 space-y-3 mb-4">
                      {goal.tasks.length === 0 && loadingGoalId !== goal.id && (
                          <div className="text-center py-8 text-slate-600 text-sm italic">No subtasks yet.</div>
                      )}
                      {loadingGoalId === goal.id && (
                          <div className="flex items-center justify-center py-8 text-violet-300 text-sm animate-pulse">
                              <IconSparkles className="w-4 h-4 mr-2" />
                              AI is planning...
                          </div>
                      )}
                      {goal.tasks.map(task => (
                        <div 
                          key={task.id} 
                          onClick={() => toggleTask(goal.id, task.id)}
                          className="flex items-center cursor-pointer hover:bg-white/5 p-2 rounded-lg -mx-2 transition-colors group/task"
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-all ${task.status === 'DONE' ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-slate-600 bg-transparent group-hover/task:border-slate-400'}`}>
                            {task.status === 'DONE' && <IconCheck className="w-3.5 h-3.5 text-black" />}
                          </div>
                          <span className={`text-sm transition-colors ${task.status === 'DONE' ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-200'}`}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISION BOARD TAB */}
          {activeTab === 'vision' && (
            <div className="max-w-7xl mx-auto p-8 animate-fade-in h-full flex flex-col">
              <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div>
                  <h2 className="text-3xl font-bold">Vision Board</h2>
                  <p className="text-slate-400 mt-1">Manifest your aesthetic.</p>
                </div>
                <div className="flex space-x-2 glass-panel p-2 rounded-2xl w-full md:w-auto">
                  <select 
                    className="bg-transparent text-sm text-slate-300 outline-none border-r border-white/10 px-3"
                    value={newVisionType}
                    onChange={(e) => setNewVisionType(e.target.value as any)}
                  >
                    <option value="image" className="bg-slate-900">Image</option>
                    <option value="quote" className="bg-slate-900">Quote</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder={newVisionType === 'image' ? "Image URL..." : "Inspiring words..."} 
                    className="bg-transparent outline-none px-3 text-sm w-full md:w-64 text-white"
                    value={newVisionContent}
                    onChange={(e) => setNewVisionContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addVisionItem()}
                  />
                  <button onClick={addVisionItem} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors">
                    <IconPlus className="w-4 h-4" />
                  </button>
                </div>
              </header>

              <div className="columns-1 md:columns-3 lg:columns-4 gap-6 space-y-6 pb-10 mx-auto">
                {visionItems.map((item, idx) => (
                  <div 
                      key={item.id} 
                      className="break-inside-avoid glass-panel rounded-2xl overflow-hidden hover:shadow-[0_10px_30px_rgba(139,92,246,0.15)] transition-all duration-500 hover:-translate-y-2 group relative"
                  >
                    {item.type === 'image' ? (
                      <>
                        <img src={item.content} alt="Vision" className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" />
                        {item.caption && <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-xs text-center text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">{item.caption}</div>}
                      </>
                    ) : (
                      <div className="p-8 text-center bg-gradient-to-br from-slate-800/50 to-slate-900/50 flex flex-col items-center justify-center min-h-[200px]">
                        <IconSparkles className="w-6 h-6 mb-4 text-fuchsia-400 animate-pulse-slow" />
                        <p className="font-serif text-xl leading-relaxed text-slate-100 tracking-wide">"{item.content}"</p>
                      </div>
                    )}
                    <button 
                      onClick={() => setVisionItems(visionItems.filter(i => i.id !== item.id))}
                      className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 text-white hover:bg-red-500/80 transition-all duration-300"
                    >
                      <IconTrash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXAMS TAB */}
          {activeTab === 'exams' && (
            <div className="max-w-4xl mx-auto p-8 animate-fade-in">
               <header className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold">Evaluations</h2>
                  <p className="text-slate-400 mt-1">Track exams and deadlines.</p>
                </div>
                <div className="glass-panel p-2 rounded-xl flex space-x-2 items-center">
                  <input 
                    type="text" 
                    placeholder="Subject Name" 
                    className="bg-transparent outline-none px-3 text-sm w-32 md:w-48 text-white border-r border-white/10"
                    value={newExamSub}
                    onChange={(e) => setNewExamSub(e.target.value)}
                  />
                  <input 
                    type="date" 
                    className="bg-transparent outline-none px-3 text-sm text-slate-300"
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                  />
                  <button onClick={addExam} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white p-2 rounded-lg transition-colors">
                    <IconPlus className="w-4 h-4" />
                  </button>
                </div>
              </header>

              <div className="space-y-5">
                {exams.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(exam => {
                  const daysLeft = Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isUrgent = daysLeft <= 3;

                  return (
                    <div key={exam.id} className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-8 relative overflow-hidden group transition-all hover:border-white/20">
                      {isUrgent && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]"></div>}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-white">{exam.subject}</h3>
                          {isUrgent && <span className="bg-red-500/20 border border-red-500/30 text-red-200 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-medium">Urgent</span>}
                        </div>
                        <p className="text-slate-400 text-sm flex items-center font-mono">
                          <IconCalendar className="w-4 h-4 mr-2 opacity-70" />
                          {new Date(exam.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>

                      <div className="text-center min-w-[80px]">
                        <div className={`text-4xl font-bold tracking-tighter ${isUrgent ? 'text-red-400' : 'text-violet-300'}`}>{daysLeft}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mt-1">Days Left</div>
                      </div>

                      <div className="w-full md:w-72 bg-black/20 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                        {!examTips[exam.id] ? (
                            <button 
                              onClick={() => getTipsForExam(exam.id, exam.subject)}
                              disabled={loadingExamId === exam.id}
                              className="w-full h-full flex items-center justify-center text-xs text-fuchsia-300 hover:text-fuchsia-200 transition-colors py-2"
                            >
                              {loadingExamId === exam.id ? (
                                  <IconSparkles className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                  <IconBrain className="w-4 h-4 mr-2" />
                              )}
                              {loadingExamId === exam.id ? "Thinking..." : "Generate Study Strategy"}
                            </button>
                        ) : (
                            <div className="text-sm text-slate-300 leading-snug animate-fade-in">
                                <div className="flex items-center mb-2 text-fuchsia-300 text-[10px] uppercase tracking-wider font-bold">
                                    <IconSparkles className="w-3 h-3 mr-1" /> AI Strategy
                                </div>
                                <div className="whitespace-pre-wrap text-xs opacity-90 font-light font-mono">
                                  {examTips[exam.id]}
                                </div>
                            </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}