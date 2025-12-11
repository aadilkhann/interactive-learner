import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookOpen, ChevronRight, Menu, X } from 'lucide-react';

// 1. DYNAMIC IMPORT MAGIC
// This tells Vite to find ALL .tsx files inside the 'notes' folder
const modules = import.meta.glob('./notes/**/*.tsx', { eager: true });

// 2. Process paths into a clean structure
const routes = Object.keys(modules).map((path) => {
  // path is like "./notes/DSA/DP/UniquePaths.tsx"
  const cleanPath = path.replace('./notes/', '').replace('.tsx', '');
  const [subject, topic, ...rest] = cleanPath.split('/');
  const name = rest.join('/') || topic; // Handle cases with less depth
  
  // Dynamic Component Import
  const Component = (modules[path] as any).default;
  
  return { path: `/${cleanPath}`, name, subject, topic, Component, originalPath: cleanPath };
});

// Helper to group routes by Subject -> Topic
const groupedRoutes = routes.reduce((acc, route) => {
  if (!acc[route.subject]) acc[route.subject] = {};
  if (!acc[route.subject][route.topic]) acc[route.subject][route.topic] = [];
  acc[route.subject][route.topic].push(route);
  return acc;
}, {} as Record<string, Record<string, typeof routes>>);

// --- UI COMPONENTS ---

const Sidebar = ({ isOpen, close }: { isOpen: boolean; close: () => void }) => {
  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 transform transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static border-r border-slate-800`}>
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <h1 className="font-bold text-xl flex items-center gap-2">
          <BookOpen className="text-blue-400" /> My Notes
        </h1>
        <button onClick={close} className="md:hidden"><X /></button>
      </div>
      
      <div className="overflow-y-auto h-[calc(100vh-64px)] p-4 space-y-6">
        {Object.entries(groupedRoutes).map(([subject, topics]) => (
          <div key={subject}>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{subject}</h2>
            <div className="space-y-4">
              {Object.entries(topics).map(([topic, notes]) => (
                <div key={topic} className="pl-2 border-l border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-300 mb-1 pl-2">{topic}</h3>
                  <div className="flex flex-col">
                    {notes.map((note) => (
                      <Link 
                        key={note.path} 
                        to={note.path} 
                        onClick={close}
                        className="text-sm py-1.5 pl-4 hover:text-white hover:bg-white/5 rounded-r transition-colors text-slate-400 block"
                      >
                        {note.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {routes.length === 0 && (
          <div className="text-sm text-slate-500 italic">No notes found in src/notes</div>
        )}
      </div>
    </div>
  );
};

const Layout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const currentRoute = routes.find(r => `/${r.originalPath}` === location.pathname);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} close={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b p-4 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}><Menu /></button>
          <span className="font-bold">My Learning Repo</span>
        </div>

        {/* Content Area */}
        <main className="flex-1 p-0 overflow-auto">
          {currentRoute ? (
             <currentRoute.Component />
          ) : (
            <div className="p-10 text-center">
              <h2 className="text-2xl font-bold text-slate-700">Welcome to your Notebook</h2>
              <p className="text-slate-500 mt-2">Select a topic from the sidebar to view the explainer.</p>
              <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-lg inline-block text-left">
                <p className="font-bold">How to add a new note:</p>
                <code className="block mt-2 text-sm bg-blue-100 p-2 rounded">
                  src/notes/Subject/Topic/MyNewFile.tsx
                </code>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<Layout />} />
      </Routes>
    </Router>
  );
}