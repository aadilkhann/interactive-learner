import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  StepBack, 
  RotateCcw, 
  Settings, 
  Hash, 
  Code,
  Info,
  Maximize
} from 'lucide-react';

// --- Types ---
interface StepState {
  st: number;
  ed: number;
  map: Record<string, number>;
  ans: number;
  phase: 'scan' | 'duplicate_found' | 'move_start' | 'update_map' | 'update_ans';
  explanation: string;
  codeLine: string;
  duplicateIndex?: number; // Index of the duplicate character if found
  currentDuplicateValue?: string; // The character causing the collision
}

// --- Constants ---
const MAX_STRING_LENGTH = 20;

export default function SubstringVisualizer() {
  // --- State ---
  // Input
  const [inputString, setInputString] = useState("abcabcbb");
  
  // UI
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Simulation
  const [steps, setSteps] = useState<StepState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Logic ---
  useEffect(() => {
    const s = inputString;
    const n = s.length;
    const newSteps: StepState[] = [];
    
    let st = 0;
    let ans = 0;
    const map: Record<string, number> = {};

    // Initial Step
    newSteps.push({
      st: 0,
      ed: -1,
      map: { ...map },
      ans: 0,
      phase: 'scan',
      explanation: 'Initialize start (st) = 0, max length (ans) = 0, and an empty Map.',
      codeLine: 'init'
    });

    for (let ed = 0; ed < n; ed++) {
      const char = s[ed];

      // Step: Scan current character
      newSteps.push({
        st,
        ed,
        map: { ...map },
        ans,
        phase: 'scan',
        explanation: `Expand window end (ed) to index ${ed}. Current character is '${char}'.`,
        codeLine: 'loop-start'
      });

      // Check for duplicate
      const hasDuplicate = map.hasOwnProperty(char);
      const prevIndex = hasDuplicate ? map[char] : -1;
      
      if (hasDuplicate) {
        // Step: Duplicate found visualization
        newSteps.push({
          st,
          ed,
          map: { ...map },
          ans,
          phase: 'duplicate_found',
          explanation: `Map contains '${char}' at index ${prevIndex}.`,
          codeLine: 'check-map',
          duplicateIndex: prevIndex,
          currentDuplicateValue: char
        });

        // Calculate new start
        const newStart = Math.max(st, prevIndex + 1);
        
        // Step: Move start pointer logic
        newSteps.push({
          st: newStart, // Visualize the jump
          ed,
          map: { ...map },
          ans,
          phase: 'move_start',
          explanation: `Update start: max(current_st: ${st}, prev_index + 1: ${prevIndex + 1}) = ${newStart}.`,
          codeLine: 'update-st',
          duplicateIndex: prevIndex,
          currentDuplicateValue: char
        });
        
        st = newStart;
      } else {
        // Optional Step just to show we checked
        /* newSteps.push({
          st,
          ed,
          map: { ...map },
          ans,
          phase: 'scan',
          explanation: `'${char}' is not in the map, or map is empty. Safe to proceed.`,
          codeLine: 'check-map'
        });
        */
      }

      // Step: Update Map
      const oldVal = map[char];
      map[char] = ed;
      newSteps.push({
        st,
        ed,
        map: { ...map },
        ans,
        phase: 'update_map',
        explanation: `Update map: '${char}' is now at index ${ed}.`,
        codeLine: 'put-map'
      });

      // Step: Update Answer
      const currentLen = ed - st + 1;
      const newAns = Math.max(ans, currentLen);
      newSteps.push({
        st,
        ed,
        map: { ...map },
        ans: newAns,
        phase: 'update_ans',
        explanation: `Window size: ${ed} - ${st} + 1 = ${currentLen}. Max ans: ${newAns}.`,
        codeLine: 'calc-ans'
      });
      ans = newAns;
    }

    // Final Step
    newSteps.push({
      st,
      ed: n - 1,
      map: { ...map },
      ans,
      phase: 'scan',
      explanation: `Traversal complete. Longest substring length is ${ans}.`,
      codeLine: 'return'
    });

    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [inputString]);

  // --- Controls ---
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(handleNext, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed]);

  const handleStringChange = (val: string) => {
    if (val.length <= MAX_STRING_LENGTH) {
      setInputString(val);
      handleReset();
    }
  };

  // --- Render Helpers ---
  const currentStep = steps[currentStepIndex];

  // Colors for visualization
  const getCharStyle = (index: number) => {
    if (!currentStep) return "bg-white border-slate-200 text-slate-400";

    const { st, ed, duplicateIndex, phase } = currentStep;
    
    // Base style
    let style = "border text-lg font-mono font-medium transition-all duration-300 ";
    
    // Highlight Duplicate Collision
    if (phase === 'duplicate_found' && index === duplicateIndex) {
      return style + "bg-red-100 border-red-500 text-red-700 shadow-[0_0_0_2px_rgba(239,68,68,0.4)] z-20 scale-110";
    }

    // Current pointer (ed)
    if (index === ed) {
      return style + "bg-yellow-100 border-yellow-500 text-yellow-900 shadow-sm z-10";
    }

    // Within Window
    if (index >= st && index <= ed) {
      return style + "bg-blue-50 border-blue-300 text-blue-800";
    }

    // Default / Outside window
    return style + "bg-white border-slate-200 text-slate-400 opacity-60";
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Maximize className="text-blue-600" size={20} />
          <h1 className="font-bold text-lg">Longest Substring <span className="text-slate-400 font-normal text-sm ml-2">Sliding Window</span></h1>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings size={16} />
          Configs
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Config Panel */}
        <div className={`${isConfigOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0`}>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Input String</label>
              <input 
                type="text" 
                value={inputString}
                onChange={(e) => handleStringChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono tracking-widest outline-none"
                placeholder="Type here..."
              />
              <p className="text-xs text-slate-400 mt-1 flex justify-between">
                <span>Try: "pwwkew", "abcabcbb"</span>
                <span>{inputString.length}/{MAX_STRING_LENGTH}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Speed</label>
              <input 
                type="range" 
                min="100" 
                max="2000" 
                step="100"
                value={2100 - playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(2100 - parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800">
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> How it works</p>
              The <strong>Sliding Window</strong> technique uses two pointers. The 'end' pointer expands the window. If a repeating character is found, the 'start' pointer jumps forward to exclude the duplicate.
            </div>
          </div>
        </div>

        {/* Main Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              
              {/* Visual Stage */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-w-[300px] overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700">Visualization</h2>
                  <div className="flex gap-4 text-sm font-mono">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> st: {currentStep?.st}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> ed: {currentStep?.ed}</span>
                    <span className="flex items-center gap-1.5 font-bold text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span> ans: {currentStep?.ans}</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col p-8 items-center overflow-y-auto">
                  
                  {/* String Visualization */}
                  <div className="relative mb-16">
                    <div className="flex gap-2">
                      {inputString.split('').map((char, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2">
                          <span className="text-xs text-slate-300 font-mono">{idx}</span>
                          <div className={`w-12 h-12 flex items-center justify-center rounded-lg ${getCharStyle(idx)}`}>
                            {char}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pointers Overlay */}
                    {currentStep && (
                      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        {/* Start Pointer */}
                        <div 
                          className="absolute -bottom-8 transition-all duration-300 flex flex-col items-center text-green-600"
                          style={{ left: `calc(${currentStep.st * 56}px + 24px + ${currentStep.st * 0}px)`, transform: 'translateX(-50%)' }}
                        >
                          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-green-500 mb-1"></div>
                          <span className="text-xs font-bold font-mono">st</span>
                        </div>

                        {/* End Pointer */}
                         {currentStep.ed >= 0 && (
                          <div 
                            className="absolute -bottom-8 transition-all duration-300 flex flex-col items-center text-yellow-600"
                            style={{ left: `calc(${currentStep.ed * 56}px + 24px + ${currentStep.ed * 0}px)`, transform: 'translateX(-50%)' }}
                          >
                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-yellow-500 mb-1"></div>
                            <span className="text-xs font-bold font-mono">ed</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hash Map Visualization */}
                  <div className="w-full max-w-2xl bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-3 text-slate-500 text-sm font-semibold border-b border-slate-200 pb-2">
                      <Hash size={14} /> HashMap (Character → Last Seen Index)
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {currentStep && Object.entries(currentStep.map).length === 0 && (
                        <span className="text-slate-400 text-sm italic py-2">Map is empty</span>
                      )}
                      {currentStep && Object.entries(currentStep.map).map(([char, idx]) => {
                         const isMatch = currentStep.currentDuplicateValue === char && currentStep.phase !== 'update_map';
                         return (
                          <div 
                            key={char} 
                            className={`flex flex-col items-center p-2 min-w-[60px] rounded-lg border transition-colors ${
                              isMatch 
                                ? 'bg-red-50 border-red-300 animate-pulse' 
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <span className={`text-lg font-mono font-bold ${isMatch ? 'text-red-600' : 'text-slate-700'}`}>{char}</span>
                            <span className="text-xs text-slate-400 mt-1">idx: {idx}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Code & Logic Side */}
              <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0">
                
                {/* Code Block */}
                <div className="bg-slate-900 rounded-xl shadow-sm overflow-hidden flex flex-col text-xs font-mono leading-relaxed">
                   <div className="p-3 bg-slate-800 border-b border-slate-700 text-slate-300 font-sans font-semibold text-xs flex justify-between items-center">
                     <span className="flex items-center gap-2"><Code size={14}/> Java Solution</span>
                   </div>
                   <div className="p-4 text-slate-300 overflow-auto">
<pre className="space-y-1">
{`class Solution {
  public int lengthOfLongestSubstring(String s) {
    int n=s.length();
    int st=0,ed=0;
    int ans=0;
    Map<Character,Integer> stt=new HashMap<>();`}
  
  <div className={`transition-colors duration-200 px-1 -mx-1 rounded ${currentStep?.codeLine === 'loop-start' ? 'bg-yellow-500/30 text-yellow-200' : ''}`}>
    {`
    for(ed=0;ed<n;ed++){`}
  </div>
  <div className={`transition-colors duration-200 px-1 -mx-1 rounded ${currentStep?.codeLine === 'check-map' ? 'bg-yellow-500/30 text-yellow-200' : ''}`}>
    {`      if(stt.containsKey(s.charAt(ed))){`}
  </div>
  <div className={`transition-colors duration-200 px-1 -mx-1 rounded ${currentStep?.codeLine === 'update-st' ? 'bg-yellow-500/30 text-yellow-200' : ''}`}>
    {`        st=Math.max(st,stt.get(s.charAt(ed))+1);
      }`}
  </div>
  <div className={`transition-colors duration-200 px-1 -mx-1 rounded ${currentStep?.codeLine === 'put-map' ? 'bg-yellow-500/30 text-yellow-200' : ''}`}>
    {`
      stt.put(s.charAt(ed),ed);`}
  </div>
  <div className={`transition-colors duration-200 px-1 -mx-1 rounded ${currentStep?.codeLine === 'calc-ans' ? 'bg-yellow-500/30 text-yellow-200' : ''}`}>
    {`      ans=Math.max(ans,ed-st+1);
    }`}
  </div>
{`    return ans;
  }
}`}
</pre>
                   </div>
                </div>

              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="h-20 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={togglePlay}
                className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                  isPlaying 
                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
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

            <div className="flex flex-col items-end max-w-lg text-right">
               <div className="text-sm font-medium text-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-300" key={currentStepIndex}>
                 {currentStep?.explanation}
               </div>
               <div className="text-xs text-slate-400 mt-1">
                 Step {currentStepIndex} of {steps.length - 1}
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}