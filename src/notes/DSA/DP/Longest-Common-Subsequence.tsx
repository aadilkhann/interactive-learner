import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  StepBack, 
  RotateCcw, 
  Settings, 
  Info,
  AlignLeft,
  Type
} from 'lucide-react';

// --- Types ---
interface StepState {
  i: number; // Current Row (Text1)
  j: number; // Current Col (Text2)
  dp: number[][]; // Snapshot of DP table
  phase: 'init' | 'compare' | 'match' | 'mismatch' | 'complete';
  explanation: string;
  codeLine: string;
  highlightRefs: { r: number; c: number; type: 'current' | 'source-diag' | 'source-top' | 'source-left' }[];
  val1: string; // Char from text1
  val2: string; // Char from text2
  matchResult?: boolean;
}

// --- Constants ---
const MAX_STR_LEN = 12;
const CELL_SIZE = 44;
const GAP_SIZE = 4;
const STRIDE = CELL_SIZE + GAP_SIZE;

export default function LCSVisualizer() {
  // --- State ---
  const [text1, setText1] = useState("abcde");
  const [text2, setText2] = useState("ace");
  
  // UI
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Simulation
  const [steps, setSteps] = useState<StepState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Logic ---
  useEffect(() => {
    generateSteps();
  }, [text1, text2]);

  const generateSteps = () => {
    const s1 = text1.length;
    const s2 = text2.length;
    const dp = Array(s1 + 1).fill(0).map(() => Array(s2 + 1).fill(0));
    const newSteps: StepState[] = [];

    // Initial Step
    newSteps.push({
      i: 0, j: 0,
      dp: JSON.parse(JSON.stringify(dp)),
      phase: 'init',
      explanation: `Initialize ${s1+1}x${s2+1} DP table with 0s. Row/Col 0 represents empty strings.`,
      codeLine: 'init',
      highlightRefs: [],
      val1: '', val2: ''
    });

    for (let i = 1; i <= s1; i++) {
      for (let j = 1; j <= s2; j++) {
        const char1 = text1[i - 1];
        const char2 = text2[j - 1];
        
        // 1. Compare Phase
        newSteps.push({
          i, j,
          dp: JSON.parse(JSON.stringify(dp)),
          phase: 'compare',
          explanation: `Compare text1[${i-1}] ('${char1}') with text2[${j-1}] ('${char2}').`,
          codeLine: 'check-match',
          highlightRefs: [{ r: i, c: j, type: 'current' }],
          val1: char1, val2: char2
        });

        if (char1 === char2) {
          // 2. Match Phase
          dp[i][j] = 1 + dp[i - 1][j - 1];
          newSteps.push({
            i, j,
            dp: JSON.parse(JSON.stringify(dp)),
            phase: 'match',
            explanation: `Match! '${char1}' == '${char2}'. Take diagonal value (${dp[i-1][j-1]}) + 1 = ${dp[i][j]}.`,
            codeLine: 'update-match',
            highlightRefs: [
              { r: i, c: j, type: 'current' },
              { r: i - 1, c: j - 1, type: 'source-diag' }
            ],
            val1: char1, val2: char2,
            matchResult: true
          });
        } else {
          // 2. Mismatch Phase
          const top = dp[i - 1][j];
          const left = dp[i][j - 1];
          dp[i][j] = Math.max(top, left);
          
          newSteps.push({
            i, j,
            dp: JSON.parse(JSON.stringify(dp)),
            phase: 'mismatch',
            explanation: `Mismatch! '${char1}' != '${char2}'. Take Max(Top: ${top}, Left: ${left}) = ${dp[i][j]}.`,
            codeLine: 'update-mismatch',
            highlightRefs: [
              { r: i, c: j, type: 'current' },
              { r: i - 1, c: j, type: 'source-top' },
              { r: i, c: j - 1, type: 'source-left' }
            ],
            val1: char1, val2: char2,
            matchResult: false
          });
        }
      }
    }

    // Complete
    newSteps.push({
      i: s1, j: s2,
      dp: JSON.parse(JSON.stringify(dp)),
      phase: 'complete',
      explanation: `Table complete. LCS length is ${dp[s1][s2]}.`,
      codeLine: 'return',
      highlightRefs: [{ r: s1, c: s2, type: 'current' }],
      val1: '', val2: ''
    });

    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // --- Controls ---
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) setCurrentStepIndex(p => p + 1);
    else setIsPlaying(false);
  };
  const handlePrev = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(p => p - 1);
  };
  const handleReset = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };
  const togglePlay = () => setIsPlaying(!isPlaying);

  useEffect(() => {
    if (isPlaying) timerRef.current = setInterval(handleNext, playbackSpeed);
    else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed]);

  const handleTextChange = (setter: (s: string) => void, val: string) => {
    if (val.length <= MAX_STR_LEN && /^[a-zA-Z0-9]*$/.test(val)) setter(val);
  };

  // --- Render Helpers ---
  const currentStep = steps[currentStepIndex];

  const getCellClass = (r: number, c: number) => {
    if (!currentStep) return { className: '', style: {} };
    const ref = currentStep.highlightRefs.find(h => h.r === r && h.c === c);
    
    let base = "flex items-center justify-center border text-sm transition-all duration-300 relative rounded-md font-mono ";
    const sizeStyle = { width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` };

    // Headers
    if (r === 0 && c === 0) return { className: base + "bg-slate-100 border-transparent text-slate-300", style: sizeStyle };
    if (r === 0) return { className: base + "bg-slate-50 border-slate-200 text-slate-500 font-bold", style: sizeStyle };
    if (c === 0) return { className: base + "bg-slate-50 border-slate-200 text-slate-500 font-bold", style: sizeStyle };

    base += "border-slate-200 ";

    // Active Highlights
    if (ref) {
      if (ref.type === 'current') return { className: base + "bg-yellow-200 border-yellow-500 text-yellow-900 font-bold ring-2 ring-yellow-400 z-10", style: sizeStyle };
      if (ref.type === 'source-diag') return { className: base + "bg-emerald-100 border-emerald-400 text-emerald-800", style: sizeStyle };
      if (ref.type === 'source-top' || ref.type === 'source-left') return { className: base + "bg-blue-100 border-blue-400 text-blue-800", style: sizeStyle };
    }

    // Processed history
    const isProcessed = r < currentStep.i || (r === currentStep.i && c <= currentStep.j);
    if (isProcessed) return { className: base + "bg-white text-slate-700", style: sizeStyle };

    return { className: base + "bg-slate-50 text-slate-300", style: sizeStyle };
  };

  const renderArrows = () => {
    if (!currentStep || currentStep.phase === 'init' || currentStep.phase === 'compare') return null;
    
    const target = currentStep.highlightRefs.find(h => h.type === 'current');
    const sources = currentStep.highlightRefs.filter(h => h.type !== 'current');
    
    if (!target) return null;

    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 overflow-visible">
        <defs>
          <marker id="arrow-emerald" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 L0,0" fill="#059669" />
          </marker>
          <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 L0,0" fill="#2563eb" />
          </marker>
        </defs>
        {sources.map((src, idx) => {
          // Adjust coordinates including headers
          const x1 = (src.c + 1) * STRIDE + CELL_SIZE / 2;
          const y1 = (src.r + 1) * STRIDE + CELL_SIZE / 2;
          const x2 = (target.c + 1) * STRIDE + CELL_SIZE / 2;
          const y2 = (target.r + 1) * STRIDE + CELL_SIZE / 2;

          // Shorten line
          const dx = x2 - x1;
          const dy = y2 - y1;
          const angle = Math.atan2(dy, dx);
          const shorten = 16;
          const x2s = x2 - shorten * Math.cos(angle);
          const y2s = y2 - shorten * Math.sin(angle);
          const x1s = x1 + shorten * Math.cos(angle);
          const y1s = y1 + shorten * Math.sin(angle);

          const isMatch = src.type === 'source-diag';
          const isWinner = !isMatch && currentStep.dp[src.r][src.c] === currentStep.dp[target.r][target.c];
          
          return (
            <line 
              key={idx}
              x1={x1s} y1={y1s} x2={x2s} y2={y2s}
              stroke={isMatch ? "#059669" : "#2563eb"}
              strokeWidth={isMatch || isWinner ? 2.5 : 1.5}
              strokeDasharray={(!isMatch && !isWinner) ? "4,4" : "none"}
              opacity={(!isMatch && !isWinner) ? 0.4 : 1}
              markerEnd={`url(#arrow-${isMatch ? 'emerald' : 'blue'})`}
            />
          );
        })}
      </svg>
    );
  };

  // --- Safe Render Guard ---
  if (!currentStep) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans items-center justify-center">
        <div className="text-slate-500 animate-pulse">Initializing Visualization...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <AlignLeft className="text-indigo-600" size={20} />
          <h1 className="font-bold text-lg">LCS Visualizer <span className="text-slate-400 font-normal text-sm ml-2">Tabulation Method</span></h1>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings size={16} />
          Config
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: Configuration */}
        <div className={`${isConfigOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0`}>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Text 1 (Rows)</label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  value={text1}
                  onChange={(e) => handleTextChange(setText1, e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="abcde"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Text 2 (Cols)</label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  value={text2}
                  onChange={(e) => handleTextChange(setText2, e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="ace"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">Max length: {MAX_STR_LEN} characters</p>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <label className="block text-sm font-semibold text-slate-700 mb-2">Animation Speed</label>
              <input 
                type="range" 
                min="100" 
                max="1500" 
                step="100"
                value={1600 - playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(1600 - parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800">
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> Logic</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><span className="text-emerald-700 font-bold">Match:</span> 1 + diagonal</li>
                <li><span className="text-blue-700 font-bold">Mismatch:</span> Max(top, left)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Visualization Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              
              {/* Grid Container */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-w-[300px] overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700">DP Table</h2>
                  <div className="flex gap-2 text-xs font-medium">
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded border border-emerald-200">Match (Diag)</span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200">Diff (Max)</span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
                  <div className="relative">
                    {renderArrows()}
                    
                    <div className="flex flex-col" style={{ gap: `${GAP_SIZE}px` }}>
                       {/* Column Headers (Text2) */}
                       <div className="flex" style={{ gap: `${GAP_SIZE}px`, marginLeft: `${STRIDE}px` }}>
                          <div style={{ width: `${CELL_SIZE}px` }} className="text-center text-xs font-bold text-slate-300">""</div>
                          {text2.split('').map((char, idx) => (
                             <div 
                               key={idx} 
                               style={{ width: `${CELL_SIZE}px` }} 
                               className={`text-center text-sm font-bold flex items-center justify-center h-8 ${currentStep?.j === idx + 1 ? 'text-indigo-600 scale-125 transition-transform' : 'text-slate-500'}`}
                             >
                               {char}
                             </div>
                          ))}
                       </div>

                       {/* Grid Rows */}
                       {currentStep?.dp.map((row, r) => (
                         <div key={r} className="flex" style={{ gap: `${GAP_SIZE}px` }}>
                           
                           {/* Row Header (Text1) */}
                           <div className="flex items-center justify-center font-bold" style={{ width: `${CELL_SIZE}px` }}>
                              {r === 0 ? (
                                <span className="text-xs text-slate-300">""</span>
                              ) : (
                                <span className={`text-sm ${currentStep?.i === r ? 'text-indigo-600 scale-125 transition-transform' : 'text-slate-500'}`}>
                                  {text1[r - 1]}
                                </span>
                              )}
                           </div>

                           {/* Cells */}
                           {row.map((val, c) => {
                             const { className, style } = getCellClass(r, c);
                             return (
                               <div key={c} className={className} style={style}>
                                 {val}
                               </div>
                             );
                           })}
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar: Code & Explanation */}
              <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0">
                
                {/* Step Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 text-sm">
                    Current Operation
                  </div>
                  <div className="p-4 space-y-4">
                     {currentStep?.phase !== 'init' && currentStep?.phase !== 'complete' ? (
                        <>
                          <div className="flex flex-col items-center gap-3">
                             <div className="flex items-center gap-4 text-xl font-mono font-bold">
                                <span className={`px-3 py-1 rounded bg-slate-100 border border-slate-200 ${currentStep?.val1 === currentStep?.val2 ? 'text-emerald-600' : 'text-slate-600'}`}>'{currentStep?.val1}'</span>
                                <span className="text-slate-400">vs</span>
                                <span className={`px-3 py-1 rounded bg-slate-100 border border-slate-200 ${currentStep?.val1 === currentStep?.val2 ? 'text-emerald-600' : 'text-slate-600'}`}>'{currentStep?.val2}'</span>
                             </div>
                             
                             {currentStep?.phase === 'match' && (
                               <div className="text-sm px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-100">
                                 Match Found! (+1)
                               </div>
                             )}
                             {currentStep?.phase === 'mismatch' && (
                               <div className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-100">
                                 Mismatch (Take Max)
                               </div>
                             )}
                          </div>

                          {/* Neighbor Values Table */}
                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider text-center">Neighbor Values</div>
                            <div className="grid grid-cols-2 gap-2 text-center text-sm font-mono">
                               {/* Diagonal */}
                               <div className={`p-2 rounded border transition-colors ${currentStep.phase === 'match' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
                                  <div className="text-[10px] uppercase text-slate-400">Diag</div>
                                  {currentStep.dp[currentStep.i-1]?.[currentStep.j-1] ?? '-'}
                               </div>
                               {/* Top */}
                               <div className={`p-2 rounded border transition-colors ${currentStep.phase === 'mismatch' && currentStep.dp[currentStep.i-1][currentStep.j] >= currentStep.dp[currentStep.i][currentStep.j-1] ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
                                  <div className="text-[10px] uppercase text-slate-400">Top</div>
                                  {currentStep.dp[currentStep.i-1]?.[currentStep.j] ?? '-'}
                               </div>
                               {/* Left */}
                               <div className={`p-2 rounded border transition-colors ${currentStep.phase === 'mismatch' && currentStep.dp[currentStep.i][currentStep.j-1] > currentStep.dp[currentStep.i-1][currentStep.j] ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
                                  <div className="text-[10px] uppercase text-slate-400">Left</div>
                                  {currentStep.dp[currentStep.i]?.[currentStep.j-1] ?? '-'}
                               </div>
                               {/* Current */}
                               <div className="p-2 rounded border bg-yellow-50 border-yellow-300 text-yellow-900 font-bold">
                                  <div className="text-[10px] uppercase text-yellow-600">Result</div>
                                  {currentStep.dp[currentStep.i][currentStep.j]}
                               </div>
                            </div>
                          </div>
                        </>
                     ) : (
                       <div className="text-center text-slate-400 text-sm py-2">
                         {currentStep?.phase === 'complete' ? 'Traversal Finished' : 'Starting...'}
                       </div>
                     )}
                     
                     <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-100 leading-relaxed">
                        {currentStep?.explanation}
                     </div>
                  </div>
                </div>

                {/* Code Block */}
                <div className="bg-slate-900 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col text-xs font-mono">
                   <div className="p-3 bg-slate-800 border-b border-slate-700 text-slate-300 font-sans font-semibold text-xs">
                     Java Implementation
                   </div>
                   <div className="p-4 text-slate-300 overflow-auto flex-1 leading-loose">
<pre>
{`int s1 = text1.length();
int s2 = text2.length();
int[][] dp = new int[s1+1][s2+1];

for (int i = 1; i <= s1; i++) {
  for (int j = 1; j <= s2; j++) {`}
  <div className={currentStep?.codeLine === 'check-match' ? 'bg-indigo-500/30 text-indigo-200 -mx-4 px-4 border-l-2 border-indigo-500' : ''}>
{`    if (text1.charAt(i-1) == text2.charAt(j-1))`}
  </div>
  <div className={currentStep?.codeLine === 'update-match' ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`      dp[i][j] = 1 + dp[i-1][j-1];`}
  </div>
  <div className={currentStep?.codeLine === 'update-mismatch' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`    else
      dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);`}
  </div>
{`  }
}
return dp[s1][s2];`}
</pre>
                   </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="h-20 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={togglePlay}
                className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                  isPlaying 
                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1"/>}
              </button>
              
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button onClick={handlePrev} disabled={currentStepIndex === 0} className="p-2 hover:bg-white rounded-md disabled:opacity-30 transition-colors">
                  <StepBack size={20} />
                </button>
                <button onClick={handleNext} disabled={currentStepIndex === steps.length - 1} className="p-2 hover:bg-white rounded-md disabled:opacity-30 transition-colors">
                  <StepForward size={20} />
                </button>
              </div>

              <button onClick={handleReset} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors ml-2">
                <RotateCcw size={20} />
              </button>
            </div>

            <div className="flex flex-col items-end">
               <div className="text-sm font-medium text-slate-900">
                 Step {currentStepIndex} of {steps.length - 1}
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}