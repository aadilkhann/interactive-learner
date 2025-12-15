import React, { useState, useMemo } from 'react';
import { Database, ArrowRightLeft,  ArrowRight, ArrowLeft, XCircle, Info } from 'lucide-react';

const SQLJoinVisualizer = () => {
  const [joinType, setJoinType] = useState('INNER');

  // Source Data
  const employees = [
    { id: 1, name: 'Alice', role: 'Dev', dept_id: 101 },
    { id: 2, name: 'Bob', role: 'Manager', dept_id: 102 },
    { id: 3, name: 'Charlie', role: 'Intern', dept_id: null }, // No Department
  ];

  const departments = [
    { id: 101, name: 'Product' },
    { id: 102, name: 'Sales' },
    { id: 103, name: 'Engineering' }, // No Employees
  ];

  // Logic to simulate SQL Joins
  const resultData = useMemo(() => {
    let results = [];
    
    // Helper to format a row
    const createRow = (emp, dept) => ({
      emp_name: emp ? emp.name : 'NULL',
      emp_role: emp ? emp.role : 'NULL',
      dept_id_fk: emp ? (emp.dept_id || 'NULL') : 'NULL',
      dept_id_pk: dept ? dept.id : 'NULL',
      dept_name: dept ? dept.name : 'NULL',
      matchStatus: emp && dept ? 'match' : (emp ? 'left-only' : 'right-only')
    });

    if (joinType === 'INNER') {
      employees.forEach(emp => {
        const dept = departments.find(d => d.id === emp.dept_id);
        if (dept) results.push(createRow(emp, dept));
      });
    } 
    else if (joinType === 'LEFT') {
      employees.forEach(emp => {
        const dept = departments.find(d => d.id === emp.dept_id);
        results.push(createRow(emp, dept));
      });
    } 
    else if (joinType === 'RIGHT') {
      departments.forEach(dept => {
        const matchingEmps = employees.filter(e => e.dept_id === dept.id);
        if (matchingEmps.length > 0) {
          matchingEmps.forEach(emp => results.push(createRow(emp, dept)));
        } else {
          results.push(createRow(null, dept));
        }
      });
    } 
    else if (joinType === 'FULL') {
      // 1. Get all matches and Left specific
      employees.forEach(emp => {
        const dept = departments.find(d => d.id === emp.dept_id);
        results.push(createRow(emp, dept));
      });
      // 2. Add Right specific that weren't caught
      departments.forEach(dept => {
        const hasMatch = employees.some(e => e.dept_id === dept.id);
        if (!hasMatch) {
          results.push(createRow(null, dept));
        }
      });
    }
    return results;
  }, [joinType]);

  const explanations = {
    INNER: {
      title: "Inner Join (Intersection)",
      desc: "Only returns rows where there is a match in BOTH tables.",
      note: "Notice Charlie is gone (no dept) and Engineering is gone (no employees).",
      color: "bg-blue-100 text-blue-800"
    },
    LEFT: {
      title: "Left Join",
      desc: "Returns ALL rows from the Left table (Employees), and matched rows from the Right.",
      note: "Charlie is here! But his department columns are NULL.",
      color: "bg-green-100 text-green-800"
    },
    RIGHT: {
      title: "Right Join",
      desc: "Returns ALL rows from the Right table (Departments), and matched rows from the Left.",
      note: "Engineering is here! But the employee columns are NULL.",
      color: "bg-purple-100 text-purple-800"
    },
    FULL: {
      title: "Full Outer Join",
      desc: "Returns EVERYTHING from both tables.",
      note: "You see matches, unmatched employees (Charlie), AND unmatched departments (Engineering).",
      color: "bg-orange-100 text-orange-800"
    }
  };

  const VennDiagram = ({ type }) => {
    // Simple SVG Venn Diagram representation
    const leftFill = type === 'LEFT' || type === 'FULL' ? "#3b82f6" : "#e5e7eb";
    const rightFill = type === 'RIGHT' || type === 'FULL' ? "#3b82f6" : "#e5e7eb";
    const centerFill = "#2563eb"; 

    return (
      <svg viewBox="0 0 200 120" className="h-24 w-auto mx-auto mb-4">
        <circle cx="70" cy="60" r="45" fill={leftFill} opacity="0.5" />
        <circle cx="130" cy="60" r="45" fill={rightFill} opacity="0.5" />
        {/* Intersection */}
        <path d="M 98,28 A 45,45 0 0,1 98,92 A 45,45 0 0,1 98,28" fill={centerFill} opacity="1" />
        <text x="50" y="65" fontSize="12" fill="black" fontWeight="bold">L</text>
        <text x="145" y="65" fontSize="12" fill="black" fontWeight="bold">R</text>
      </svg>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          SQL Join Visualizer
        </h1>
        <p className="text-gray-600 mt-2">Interactive playground to understand how tables connect</p>
      </header>

      {/* Source Tables Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Table A: Employees */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-700">Left Table: Employees</h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">id, name, dept_id</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 rounded-tl">ID</th>
                <th className="p-2">Name</th>
                <th className="p-2 rounded-tr">Dept_ID</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="p-2 text-gray-500">{e.id}</td>
                  <td className="p-2 font-medium">{e.name}</td>
                  <td className={`p-2 font-mono ${e.dept_id === null ? 'text-red-500 italic' : 'text-blue-600'}`}>
                    {e.dept_id === null ? 'NULL' : e.dept_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table B: Departments */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-700">Right Table: Departments</h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">id, name</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 rounded-tl">ID</th>
                <th className="p-2 rounded-tr">Name</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(d => (
                <tr key={d.id} className="border-t border-gray-100">
                  <td className="p-2 text-blue-600 font-mono">{d.id}</td>
                  <td className="p-2 font-medium">{d.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controls & Visualization */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gray-800 text-white p-4 flex flex-wrap gap-2 justify-center">
          {['INNER', 'LEFT', 'RIGHT', 'FULL'].map((type) => (
            <button
              key={type}
              onClick={() => setJoinType(type)}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                joinType === type 
                  ? 'bg-blue-500 text-white scale-105 shadow-lg ring-2 ring-blue-300' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {type} JOIN
            </button>
          ))}
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Visual Diagram */}
            <div className="w-full md:w-1/3 flex flex-col items-center justify-center border-r border-gray-100 pr-4">
               <VennDiagram type={joinType} />
               <div className="text-center">
                  <h3 className="font-bold text-lg mb-1">{explanations[joinType].title}</h3>
                  <p className="text-sm text-gray-500">{explanations[joinType].desc}</p>
               </div>
            </div>

            {/* Code & Logic */}
            <div className="w-full md:w-2/3">
              <div className="bg-gray-100 rounded-lg p-4 mb-4 font-mono text-sm shadow-inner overflow-x-auto">
                <span className="text-purple-400">SELECT</span> * <br/>
                <span className="text-purple-400">FROM</span> Employees <span className="text-red-400">E</span><br/>
                <span className="text-blue-400 font-bold">{joinType} JOIN</span> Departments <span className="text-red-400">D</span><br/>
                <span className="text-purple-400">ON</span> <span className="text-red-400">E</span>.dept_id = <span className="text-red-400">D</span>.id;
              </div>

              <div className={`p-4 rounded-lg flex items-start gap-3 ${explanations[joinType].color}`}>
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{explanations[joinType].note}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Result Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
         <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
           <ArrowRightLeft className="w-5 h-5 text-blue-500" />
           Result Set
         </h3>
         <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 border-b-2 border-gray-200">
                <th className="p-3 text-left border-r border-gray-300">Emp Name</th>
                <th className="p-3 text-left border-r border-gray-300">Role</th>
                <th className="p-3 text-left border-r-4 border-gray-400 bg-gray-200">E.dept_id</th>
                <th className="p-3 text-left bg-gray-200 border-r border-gray-300">D.id</th>
                <th className="p-3 text-left">Dept Name</th>
              </tr>
            </thead>
            <tbody>
              {resultData.map((row, idx) => (
                <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${
                  row.matchStatus === 'match' ? 'bg-green-50' : 
                  row.matchStatus === 'left-only' ? 'bg-blue-50' : 'bg-purple-50'
                }`}>
                  <td className={`p-3 border-r border-gray-200 ${row.emp_name === 'NULL' ? 'text-gray-400 italic' : 'font-medium'}`}>
                    {row.emp_name}
                  </td>
                  <td className={`p-3 border-r border-gray-200 ${row.emp_role === 'NULL' ? 'text-gray-400 italic' : ''}`}>
                    {row.emp_role}
                  </td>
                  <td className={`p-3 border-r-4 border-gray-300 font-mono ${row.dept_id_fk === 'NULL' ? 'text-red-400 italic' : 'text-blue-600'}`}>
                    {row.dept_id_fk}
                  </td>
                  <td className={`p-3 border-r border-gray-200 font-mono ${row.dept_id_pk === 'NULL' ? 'text-red-400 italic' : 'text-blue-600'}`}>
                    {row.dept_id_pk}
                  </td>
                  <td className={`p-3 ${row.dept_name === 'NULL' ? 'text-gray-400 italic' : 'font-medium'}`}>
                    {row.dept_name}
                  </td>
                </tr>
              ))}
              {resultData.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400">No rows returned</td>
                </tr>
              )}
            </tbody>
          </table>
         </div>
      </div>
    </div>
  );
};

export default SQLJoinVisualizer;