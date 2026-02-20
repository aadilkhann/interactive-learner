import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  StepBack, 
  RotateCcw, 
  Settings, 
  Info,
  GitFork,
  Target,
  Network
} from 'lucide-react';

// --- Types ---
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  x: number;
  y: number;

  constructor(val: number) {
    this.val = val;
    this.left = null;
    this.right = null;
    this.x = 0;
    this.y = 0;
  }
}

interface StepState {
  // Navigation
  currentNode: TreeNode | null; // The 'root' in the function
  
  // Status
  phase: 'visit' | 'check_base' | 'recurse_left' | 'recurse_right' | 'process_return' | 'found_lca';
  
  // Variables in scope
  leftResult: number | null | 'pending';
  rightResult: number | null | 'pending';
  returnValue: number | null; // What this call returns
  
  // Visuals
  activePath: number[]; // Path from root to current node (stack)
  foundP: boolean;
  foundQ: boolean;
  
  // Meta
  explanation: string;
  codeLine: number;
}

// --- Constants ---
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const NODE_RADIUS = 20;

export default function LCAVisualizer() {
  // --- State ---
  const [treeInput, setTreeInput] = useState("[3,5,1,6,2,0,8,null,null,7,4]");
  const [pVal, setPVal] = useState(5);
  const [qVal, setQVal] = useState(1);
  const [root, setRoot] = useState<TreeNode | null>(null);
  
  // UI
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Simulation
  const [steps, setSteps] = useState<StepState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Tree Utilities ---

  // Parse [1,2,null,3] string to array
  const parseTreeArray = (str: string): (number | null)[] => {
    try {
        const clean = str.replace(/[\[\]]/g, '');
        if (!clean.trim()) return [];
        return clean.split(',').map(s => {
            const val = s.trim();
            if (val === 'null' || val === '') return null;
            const num = parseInt(val);
            return isNaN(num) ? null : num;
        });
    } catch (e) {
        return [];
    }
  };

  // BFS Build
  const buildTree = (arr: (number | null)[]): TreeNode | null => {
    if (arr.length === 0 || arr[0] === null) return null;
    const root = new TreeNode(arr[0]);
    const queue: TreeNode[] = [root];
    let i = 1;
    while (i < arr.length) {
        const curr = queue.shift();
        if (!curr) break;
        
        // Left
        if (i < arr.length) {
            const val = arr[i++];
            if (val !== null) {
                curr.left = new TreeNode(val);
                queue.push(curr.left);
            }
        }
        // Right
        if (i < arr.length) {
            const val = arr[i++];
            if (val !== null) {
                curr.right = new TreeNode(val);
                queue.push(curr.right);
            }
        }
    }
    return root;
  };

  // Layout Algorithm (Recursive Partition)
  const layoutTree = (root: TreeNode | null) => {
    if (!root) return;
    
    const getDepth = (n: TreeNode | null): number => {
        if (!n) return 0;
        return 1 + Math.max(getDepth(n.left), getDepth(n.right));
    };
    const maxDepth = getDepth(root);
    
    // Spread reduces as we go deeper
    const setCoords = (node: TreeNode | null, x: number, y: number, spread: number, level: number) => {
        if (!node) return;
        node.x = x;
        node.y = y;
        
        // Dynamic spread based on depth to fit canvas
        // Level 0: width/4 spread
        // Deeper levels reduce spread
        const nextSpread = spread * 0.55; 
        const nextY = y + 70;
        
        setCoords(node.left, x - spread, nextY, nextSpread, level + 1);
        setCoords(node.right, x + spread, nextY, nextSpread, level + 1);
    };

    // Initial spread calculation based on tree depth
    const initialSpread = Math.min(180, CANVAS_WIDTH / 3); 
    setCoords(root, CANVAS_WIDTH / 2, 50, initialSpread, 0);
  };

  // --- Tree Construction Effect ---
  useEffect(() => {
    const arr = parseTreeArray(treeInput);
    const newRoot = buildTree(arr);
    layoutTree(newRoot);
    setRoot(newRoot);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [treeInput]);

  // --- Logic Generation ---
  useEffect(() => {
    if (root) {
      generateSteps();
    }
  }, [root, pVal, qVal]);

  const generateSteps = () => {
    if (!root) return;
    const newSteps: StepState[] = [];
    const path: number[] = [];

    const recurse = (node: TreeNode | null): number | null => {
      // 1. Visit
      newSteps.push({
        currentNode: node,
        phase: 'visit',
        leftResult: 'pending', rightResult: 'pending', returnValue: null,
        activePath: [...path, node ? node.val : -1], // -1 for null
        foundP: false, foundQ: false,
        explanation: node ? `Visiting Node ${node.val}.` : `Reached null node.`,
        codeLine: 1
      });

      // 2. Check Base Cases
      newSteps.push({
        currentNode: node,
        phase: 'check_base',
        leftResult: 'pending', rightResult: 'pending', returnValue: null,
        activePath: [...path, node ? node.val : -1],
        foundP: false, foundQ: false,
        explanation: node ? `Checking if Node ${node.val} is null, p (${pVal}), or q (${qVal}).` : `Base case: Node is null. Return null.`,
        codeLine: 2
      });

      if (node === null) {
        return null;
      }

      if (node.val === pVal || node.val === qVal) {
        newSteps.push({
          currentNode: node,
          phase: 'process_return',
          leftResult: 'pending', rightResult: 'pending', returnValue: node.val,
          activePath: [...path, node.val],
          foundP: node.val === pVal, foundQ: node.val === qVal,
          explanation: `Found ${node.val === pVal ? 'p' : 'q'}! Returning node ${node.val}.`,
          codeLine: 3
        });
        return node.val;
      }

      // 3. Recurse Left
      path.push(node.val);
      newSteps.push({
        currentNode: node,
        phase: 'recurse_left',
        leftResult: 'pending', rightResult: 'pending', returnValue: null,
        activePath: [...path],
        foundP: false, foundQ: false,
        explanation: `Recursively calling LCA on left child of ${node.val}.`,
        codeLine: 5
      });

      const left = recurse(node.left);

      // 4. Recurse Right
      newSteps.push({
        currentNode: node,
        phase: 'recurse_right',
        leftResult: left, rightResult: 'pending', returnValue: null,
        activePath: [...path],
        foundP: false, foundQ: false,
        explanation: `Left call returned ${left}. Now recursively calling LCA on right child of ${node.val}.`,
        codeLine: 6
      });

      const right = recurse(node.right);
      path.pop();

      // 5. Process Return
      let result: number | null = null;
      if (left !== null && right !== null) {
        result = node.val;
        newSteps.push({
          currentNode: node,
          phase: 'found_lca',
          leftResult: left, rightResult: right, returnValue: result,
          activePath: [...path], 
          foundP: true, foundQ: true,
          explanation: `Both Left (${left}) and Right (${right}) returned non-null. Node ${node.val} is the LCA!`,
          codeLine: 8
        });
      } else {
        result = left !== null ? left : right;
        newSteps.push({
          currentNode: node,
          phase: 'process_return',
          leftResult: left, rightResult: right, returnValue: result,
          activePath: [...path],
          foundP: false, foundQ: false,
          explanation: `Left is ${left}, Right is ${right}. Returning ${result !== null ? result : 'null'}.`,
          codeLine: 10
        });
      }

      return result;
    };

    recurse(root);
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

  // --- Rendering Tree ---
  const renderTreeLines = (node: TreeNode | null) => {
    if (!node) return null;
    return (
      <React.Fragment key={node.val}>
        {node.left && (
          <line 
            x1={node.x} y1={node.y} 
            x2={node.left.x} y2={node.left.y} 
            stroke="#cbd5e1" strokeWidth="2" 
          />
        )}
        {node.right && (
          <line 
            x1={node.x} y1={node.y} 
            x2={node.right.x} y2={node.right.y} 
            stroke="#cbd5e1" strokeWidth="2" 
          />
        )}
        {renderTreeLines(node.left)}
        {renderTreeLines(node.right)}
      </React.Fragment>
    );
  };

  const renderTreeNodes = (node: TreeNode | null) => {
    if (!node) return null;
    
    const step = steps[currentStepIndex];
    
    // Status Determination
    const isCurrent = step?.currentNode?.val === node.val;
    const isP = node.val === pVal;
    const isQ = node.val === qVal;
    
    const isReturning = step?.phase === 'process_return' && isCurrent;
    const isLCA = step?.phase === 'found_lca' && isCurrent;
    const isActiveStack = step?.activePath.includes(node.val);

    let circleFill = "white";
    let stroke = "#94a3b8"; // slate-400
    let strokeWidth = 2;
    let textColor = "#475569"; // slate-600

    if (isLCA) {
      circleFill = "#fef08a"; // yellow-200
      stroke = "#eab308"; // yellow-500
      strokeWidth = 4;
      textColor = "#854d0e";
    } else if (isReturning && step.returnValue !== null) {
      circleFill = "#bbf7d0"; // green-200
      stroke = "#22c55e"; // green-500
      textColor = "#14532d";
    } else if (isCurrent) {
      circleFill = "#bfdbfe"; // blue-200
      stroke = "#3b82f6"; // blue-500
      strokeWidth = 3;
    } else if (isActiveStack) {
      stroke = "#60a5fa"; // blue-400
      strokeWidth = 3;
    }

    const isTarget = isP || isQ;
    if (isTarget && !isLCA && !isCurrent) {
        stroke = isP ? "#ec4899" : "#8b5cf6"; 
        strokeWidth = 3;
    }

    return (
      <g key={node.val}>
        <circle 
          cx={node.x} cy={node.y} r={NODE_RADIUS} 
          fill={circleFill} stroke={stroke} strokeWidth={strokeWidth}
          className="transition-all duration-300"
        />
        <text 
          x={node.x} y={node.y} dy="5" 
          textAnchor="middle" fontSize="14" fontWeight="bold" fill={textColor}
          className="pointer-events-none"
        >
          {node.val}
        </text>
        
        {isP && (
          <g transform={`translate(${node.x - 25}, ${node.y - 25})`}>
            <circle r="10" fill="#ec4899" className="animate-pulse"/>
            <text dy="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">P</text>
          </g>
        )}
        {isQ && (
          <g transform={`translate(${node.x + 25}, ${node.y - 25})`}>
            <circle r="10" fill="#8b5cf6" className="animate-pulse"/>
            <text dy="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Q</text>
          </g>
        )}

        {isReturning && step.returnValue !== null && (
           <g transform={`translate(${node.x}, ${node.y - 35})`} className="animate-bounce">
             <rect x="-30" y="-15" width="60" height="20" rx="10" fill="#22c55e" />
             <text y="-1" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
               Ret: {step.returnValue}
             </text>
           </g>
        )}

        {renderTreeNodes(node.left)}
        {renderTreeNodes(node.right)}
      </g>
    );
  };

  const currentStep = steps[currentStepIndex];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <GitFork className="text-blue-600" size={20} />
          <h1 className="font-bold text-lg">Lowest Common Ancestor <span className="text-slate-400 font-normal text-sm ml-2">Binary Tree (DFS)</span></h1>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings size={16} />
          Config
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Configuration */}
        <div className={`${isConfigOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0`}>
          <div className="p-6 space-y-6">
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Network size={14}/> Tree Array (Level Order)</label>
              <textarea 
                value={treeInput}
                onChange={(e) => setTreeInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm min-h-[80px]"
                placeholder="[3,5,1,6,2,0,8,null,null,7,4]"
              />
              <p className="text-xs text-slate-400 mt-1">Use 'null' for missing nodes.</p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">P Value</label>
                <input 
                  type="number" 
                  value={pVal}
                  onChange={(e) => setPVal(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-pink-500 font-mono"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Q Value</label>
                <input 
                  type="number" 
                  value={qVal}
                  onChange={(e) => setQVal(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-violet-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <label className="block text-sm font-semibold text-slate-700 mb-2">Animation Speed</label>
              <input 
                type="range" 
                min="100" 
                max="2000" 
                step="100"
                value={2100 - playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(2100 - parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800">
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> How to Use</p>
              1. Enter tree in level-order (array).<br/>
              2. Set P and Q values (must exist in tree).<br/>
              3. Watch the DFS find the LCA.
            </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              
              {/* Visualizer Panel */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[400px] overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">Visualization</h2>
                  <div className="flex gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500"></div> P</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-violet-500"></div> Q</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Current</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> LCA</span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                   <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
                      {renderTreeLines(root)}
                      {renderTreeNodes(root)}
                   </svg>
                </div>

                {/* State Bar */}
                <div className="border-t border-slate-100 bg-slate-50 p-4 grid grid-cols-3 gap-4 text-sm font-mono">
                    <div className="bg-white p-2 rounded border border-slate-200 text-center">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Left Return</div>
                        <div className={`font-bold ${currentStep?.leftResult !== null && currentStep?.leftResult !== 'pending' ? 'text-blue-600' : 'text-slate-400'}`}>
                            {currentStep?.leftResult === 'pending' ? '...' : (currentStep?.leftResult ?? 'null')}
                        </div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200 text-center">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Right Return</div>
                        <div className={`font-bold ${currentStep?.rightResult !== null && currentStep?.rightResult !== 'pending' ? 'text-purple-600' : 'text-slate-400'}`}>
                            {currentStep?.rightResult === 'pending' ? '...' : (currentStep?.rightResult ?? 'null')}
                        </div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200 text-center">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Current Result</div>
                        <div className={`font-bold ${currentStep?.returnValue !== null ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {currentStep?.returnValue ?? 'null'}
                        </div>
                    </div>
                </div>
              </div>

              {/* Code Panel */}
              <div className="w-full xl:w-96 bg-slate-900 rounded-xl shadow-sm overflow-hidden flex flex-col shrink-0">
                <div className="p-3 bg-slate-800 border-b border-slate-700 text-slate-300 font-sans font-semibold text-xs">
                  Java Solution
                </div>
                <div className="p-4 text-slate-300 overflow-auto flex-1 font-mono text-xs leading-loose">
<pre>
{`public TreeNode lowestCommonAncestor(TreeNode root, 
                                     TreeNode p, 
                                     TreeNode q) {`}
  <div className={currentStep?.codeLine === 1 ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`  // Base case: root is null, p, or q?`}
  </div>
  <div className={currentStep?.codeLine === 2 ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`  if (root == null || root == p || root == q) {`}
  </div>
  <div className={currentStep?.codeLine === 3 ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`    return root;
  }`}
  </div>

  <div className={currentStep?.codeLine === 5 ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`  TreeNode left = lowestCommonAncestor(root.left, p, q);`}
  </div>
  <div className={currentStep?.codeLine === 6 ? 'bg-purple-500/30 text-purple-200 -mx-4 px-4 border-l-2 border-purple-500' : ''}>
{`  TreeNode right = lowestCommonAncestor(root.right, p, q);`}
  </div>

  <div className={currentStep?.codeLine === 8 ? 'bg-yellow-500/30 text-yellow-200 -mx-4 px-4 border-l-2 border-yellow-500' : ''}>
{`  if (left != null && right != null) return root;`}
  </div>

  <div className={currentStep?.codeLine === 10 ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`  return left != null ? left : right;
}`}
  </div>
</pre>
                </div>
                
                {/* Explanation Box */}
                <div className="p-4 border-t border-slate-700 bg-slate-800 text-slate-300 text-sm min-h-[100px]">
                    {currentStep?.explanation || "Ready."}
                </div>
              </div>

            </div>
          </div>

          {/* Controls Footer */}
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

            <div className="flex flex-col items-end max-w-xl text-right">
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