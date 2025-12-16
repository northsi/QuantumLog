import React, { useState, useRef, useEffect } from 'react';
import { Project, NotebookEntry, EntryType, CodeStatus } from '../types';
import { Plus, BookOpen, Code, Lightbulb, Calculator, X, Link, Trash2, Bot, ArrowDownUp, Edit3, Save } from 'lucide-react';
import { fileToBase64 } from '../services/storageService';
import { askResearchAssistant } from '../services/geminiService';

// --- Rich Text Editor Component ---
interface RichEditorProps {
  initialContent: string;
  onContentChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const RichEditor: React.FC<RichEditorProps> = ({ initialContent, onContentChange, placeholder, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgWidth, setImgWidth] = useState<number>(100);

  // Sync state with selected image
  useEffect(() => {
    if (selectedImg) {
      const w = selectedImg.style.width;
      // Parse "50%" to 50, default to 100 if unset
      setImgWidth(w ? parseInt(w) : 100);
    }
  }, [selectedImg]);

  // Handle paste: Intercept images and insert as <img> tags, allow text as normal
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        hasImage = true;
        const blob = items[i].getAsFile();
        if (blob) {
          try {
            const base64 = await fileToBase64(blob);
            // Insert image at cursor
            const imgHtml = `<img src="${base64}" style="width: 100%; max-width: 100%; margin: 8px 0; border-radius: 4px; border: 1px solid #e2e8f0; cursor: pointer;" />&nbsp;`;
            document.execCommand('insertHTML', false, imgHtml);
          } catch (err) {
            console.error("Image paste failed", err);
          }
        }
      }
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      setSelectedImg(target as HTMLImageElement);
    } else {
      // Deselect if clicking elsewhere in the editor
      setSelectedImg(null);
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value);
    setImgWidth(newVal);
    if (selectedImg) {
      selectedImg.style.width = `${newVal}%`;
      if (editorRef.current) onContentChange(editorRef.current.innerHTML);
    }
  };

  const handleDeleteImg = () => {
    if (selectedImg) {
      selectedImg.remove();
      setSelectedImg(null);
      if (editorRef.current) onContentChange(editorRef.current.innerHTML);
    }
  };

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialContent) {
      // Only set initial content on mount or reset to prevent cursor jumping if we were to sync blindly
      if (initialContent === '' || editorRef.current.innerHTML === '') {
         editorRef.current.innerHTML = initialContent;
      }
    }
  }, [initialContent]);

  return (
    <div className="relative group">
      {/* Image Toolbar - Visible when image is selected */}
      {selectedImg && (
        <div className="absolute top-2 right-2 z-20 bg-white shadow-lg border border-slate-200 rounded-lg p-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
           <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Img Size</span>
           <input 
             type="range" 
             min="10" 
             max="100" 
             value={imgWidth} 
             onChange={handleWidthChange}
             className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
           />
           <span className="text-xs text-slate-500 w-8 text-right">{imgWidth}%</span>
           <div className="w-px h-4 bg-slate-200 mx-1"></div>
           <button 
             onClick={handleDeleteImg}
             className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
             title="Remove Image"
           >
             <Trash2 size={16} />
           </button>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        className={`outline-none min-h-[120px] ${className} empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400`}
        onPaste={handlePaste}
        onInput={handleInput}
        onClick={handleClick}
        data-placeholder={placeholder}
        style={{ whiteSpace: 'pre-wrap' }} 
      />
    </div>
  );
};

// --- Main Project View ---

interface ProjectViewProps {
  projects: Project[];
  entries: NotebookEntry[];
  onAddProject: (title: string, desc: string) => void;
  onAddEntry: (entry: NotebookEntry) => void;
  onUpdateEntry: (entry: NotebookEntry) => void;
  onDeleteProject: (id: string) => void;
  onDeleteEntry: (id: string) => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ 
  projects, entries, onAddProject, onAddEntry, onUpdateEntry, onDeleteProject, onDeleteEntry 
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EntryType>(EntryType.INSPIRATION);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // New Project Form
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  // New Entry State
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryContentHtml, setNewEntryContentHtml] = useState(''); // Stores HTML
  const [newEntryCodeStatus, setNewEntryCodeStatus] = useState<CodeStatus>(CodeStatus.SUCCESS);
  const [linkedEntries, setLinkedEntries] = useState<string[]>([]);

  // Editing State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // AI Chat
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectEntries = entries.filter(e => e.projectId === selectedProjectId);

  const handleCreateProject = () => {
    if (newProjTitle) {
      onAddProject(newProjTitle, newProjDesc);
      setNewProjTitle('');
      setNewProjDesc('');
      setShowNewProjectModal(false);
    }
  };

  const handleSubmitEntry = () => {
    if (!selectedProjectId || !newEntryTitle.trim()) return;

    const entry: NotebookEntry = {
      id: Date.now().toString(),
      projectId: selectedProjectId,
      type: activeTab,
      title: newEntryTitle,
      content: newEntryContentHtml, // Save as HTML
      createdAt: Date.now(),
      attachments: [], // We now embed images in content, but keep empty array for type safety
      codeStatus: activeTab === EntryType.CODE ? newEntryCodeStatus : undefined,
      linkedEntryIds: activeTab === EntryType.INSPIRATION ? linkedEntries : undefined
    };

    onAddEntry(entry);
    
    // Reset
    setNewEntryTitle('');
    setNewEntryContentHtml('');
    setLinkedEntries([]);
    setNewEntryCodeStatus(CodeStatus.SUCCESS);
  };

  const startEditing = (entry: NotebookEntry) => {
    // If there are legacy attachments, append them to the HTML content for editing
    let contentToEdit = entry.content;
    if (entry.attachments && entry.attachments.length > 0) {
      const imagesHtml = entry.attachments.map(att => `<img src="${att.data}" style="width: 100%; max-width: 100%; margin: 8px 0; cursor: pointer;" />`).join('<br/>');
      contentToEdit += `<br/><br/>${imagesHtml}`;
    }
    setEditingContent(contentToEdit);
    setEditingEntryId(entry.id);
  };

  const saveEditing = (entry: NotebookEntry) => {
    const updatedEntry: NotebookEntry = {
      ...entry,
      content: editingContent,
      attachments: [] // Clear attachments as they are now embedded in content
    };
    onUpdateEntry(updatedEntry);
    setEditingEntryId(null);
    setEditingContent('');
  };

  const handleAskAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    // Strip HTML tags for AI context to save tokens and reduce noise
    const plainTextEntries = projectEntries.slice(0, 5).map(e => {
        const temp = document.createElement('div');
        temp.innerHTML = e.content;
        return `${e.type}: ${e.title}\n${temp.textContent || temp.innerText || ""}`;
    }).join('\n');

    const context = `
      Project: ${selectedProject?.title}
      Description: ${selectedProject?.description}
      Recent Entries:
      ${plainTextEntries}
    `;
    const res = await askResearchAssistant(aiPrompt, context);
    setAiResponse(res);
    setAiLoading(false);
  };

  const sortedEntries = projectEntries
    .filter(e => e.type === activeTab)
    .sort((a, b) => {
      return sortOrder === 'asc' 
        ? a.createdAt - b.createdAt 
        : b.createdAt - a.createdAt;
    });

  if (!selectedProjectId) {
    return (
      <div className="p-8 h-full overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Research Projects</h2>
            <p className="text-slate-500">Manage your experiments and theoretical models</p>
          </div>
          <button 
            onClick={() => setShowNewProjectModal(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={20} /> New Project
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedProjectId(p.id)}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-cyan-400 cursor-pointer transition-all hover:shadow-md group"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">{p.title}</h3>
              <p className="text-slate-600 text-sm line-clamp-3 mb-4">{p.description}</p>
              <div className="flex justify-between items-center mt-auto">
                <span className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {showNewProjectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
              <h3 className="text-lg font-bold mb-4">Create New Project</h3>
              <input
                className="w-full border p-2 rounded mb-3 outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Project Title"
                value={newProjTitle}
                onChange={e => setNewProjTitle(e.target.value)}
              />
              <textarea
                className="w-full border p-2 rounded mb-4 outline-none focus:ring-2 focus:ring-cyan-500 h-24"
                placeholder="Description (Objective, Theory...)"
                value={newProjDesc}
                onChange={e => setNewProjDesc(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNewProjectModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button onClick={handleCreateProject} className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700">Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- INSIDE A PROJECT ---

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar for Project */}
      <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4">
        <button onClick={() => setSelectedProjectId(null)} className="p-2 text-slate-400 hover:text-slate-600 mb-4">
          <X size={24} />
        </button>
        <TabButton icon={<Lightbulb size={24} />} active={activeTab === EntryType.INSPIRATION} onClick={() => setActiveTab(EntryType.INSPIRATION)} tooltip="Inspiration & Log" />
        <TabButton icon={<BookOpen size={24} />} active={activeTab === EntryType.LITERATURE} onClick={() => setActiveTab(EntryType.LITERATURE)} tooltip="Literature" />
        <TabButton icon={<Code size={24} />} active={activeTab === EntryType.DERIVATION} onClick={() => setActiveTab(EntryType.DERIVATION)} tooltip="Derivation" />
        <TabButton icon={<Calculator size={24} />} active={activeTab === EntryType.CODE} onClick={() => setActiveTab(EntryType.CODE)} tooltip="Code & Results" />
        
        <div className="mt-auto">
          <button 
            onClick={() => setShowAiPanel(!showAiPanel)}
            className={`p-2 rounded-xl transition-all ${showAiPanel ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            <Bot size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{selectedProject?.title}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{activeTab}</p>
              <div className="h-4 w-px bg-slate-300 mx-2"></div>
              <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-600 transition-colors"
              >
                <ArrowDownUp size={12} />
                {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex gap-6">
          {/* Feed of Entries */}
          <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
            {/* New Entry Input */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <input
                className="w-full text-lg font-semibold mb-2 outline-none placeholder:text-slate-300"
                placeholder="Title of entry..."
                value={newEntryTitle}
                onChange={e => setNewEntryTitle(e.target.value)}
              />
              
              <RichEditor 
                initialContent={newEntryContentHtml}
                onContentChange={setNewEntryContentHtml}
                placeholder={`Write your ${activeTab.toLowerCase()} notes here... Copy-paste images directly into the text.`}
                className="text-slate-600 mb-4 border-l-2 border-slate-100 pl-2 focus:border-cyan-300 transition-colors"
              />

              {/* Specific Controls per Type */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex gap-3">
                  {activeTab === EntryType.CODE && (
                    <div className="flex bg-slate-100 rounded p-1">
                      {[CodeStatus.SUCCESS, CodeStatus.FAILED, CodeStatus.OPTIMIZE].map(status => (
                        <button
                          key={status}
                          onClick={() => setNewEntryCodeStatus(status)}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                            newEntryCodeStatus === status 
                            ? status === 'SUCCESS' ? 'bg-emerald-500 text-white' : status === 'FAILED' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                            : 'text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === EntryType.INSPIRATION && (
                    <div className="relative group">
                       <button className="flex items-center gap-1 text-slate-500 hover:text-cyan-600 text-sm">
                         <Link size={16} /> Link References
                       </button>
                       <div className="absolute top-full left-0 mt-2 w-64 bg-white border shadow-lg rounded-lg p-2 hidden group-hover:block z-10 max-h-60 overflow-y-auto">
                         {projectEntries.filter(e => e.type !== EntryType.INSPIRATION).map(e => (
                           <div 
                             key={e.id} 
                             onClick={() => setLinkedEntries(prev => prev.includes(e.id) ? prev.filter(id => id !== e.id) : [...prev, e.id])}
                             className={`p-2 text-xs border-b cursor-pointer hover:bg-slate-50 ${linkedEntries.includes(e.id) ? 'bg-cyan-50 text-cyan-700' : ''}`}
                           >
                             <span className="font-bold">[{e.type[0]}]</span> {e.title}
                           </div>
                         ))}
                       </div>
                    </div>
                  )}
                  {linkedEntries.length > 0 && <span className="text-xs text-cyan-600 flex items-center">{linkedEntries.length} linked</span>}
                </div>

                <button 
                  onClick={handleSubmitEntry}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Save Entry
                </button>
              </div>
            </div>

            {/* Entry List */}
            <div className="space-y-4">
              {sortedEntries.map(entry => (
                <div key={entry.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 text-lg">{entry.title}</h4>
                    <div className="flex items-center gap-2">
                       {entry.codeStatus && (
                         <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                           entry.codeStatus === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                           entry.codeStatus === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                         }`}>
                           {entry.codeStatus}
                         </span>
                       )}
                       <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
                       
                       {/* Edit Toggle */}
                       {editingEntryId === entry.id ? (
                          <button onClick={() => saveEditing(entry)} className="text-emerald-500 hover:text-emerald-700 p-1 bg-emerald-50 rounded">
                            <Save size={16} />
                          </button>
                       ) : (
                          <button onClick={() => startEditing(entry)} className="text-slate-400 hover:text-cyan-600 p-1 hover:bg-slate-100 rounded">
                            <Edit3 size={16} />
                          </button>
                       )}

                       <button onClick={() => onDeleteEntry(entry.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  
                  {editingEntryId === entry.id ? (
                    <div className="mt-2 p-2 border border-cyan-200 rounded-lg bg-slate-50">
                      <RichEditor 
                        initialContent={editingContent}
                        onContentChange={setEditingContent}
                        className="text-slate-700 min-h-[150px]"
                      />
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-slate-600 mb-4 font-light leading-relaxed">
                      {/* Render HTML content. We also check for legacy attachments to display them for backward compatibility */}
                      <div dangerouslySetInnerHTML={{ __html: entry.content }} />
                      
                      {/* Backward Compatibility for old image structure */}
                      {entry.attachments && entry.attachments.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                          {entry.attachments.map((att, i) => (
                            <img key={i} src={att.data} className="rounded border border-slate-100 w-full object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {entry.linkedEntryIds && entry.linkedEntryIds.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                      {entry.linkedEntryIds.map(linkId => {
                        const linked = entries.find(e => e.id === linkId);
                        if (!linked) return null;
                        return (
                          <div key={linkId} onClick={() => setActiveTab(linked.type)} className="text-xs bg-slate-100 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 border px-2 py-1 rounded cursor-pointer flex items-center gap-1">
                            <Link size={10} /> {linked.title}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Side Panel */}
        {showAiPanel && (
          <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-xl border-l border-slate-200 z-10 flex flex-col">
             <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
               <h3 className="font-bold flex items-center gap-2"><Bot size={18}/> AI Assistant</h3>
               <button onClick={() => setShowAiPanel(false)}><X size={18}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                {aiResponse && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-700 mb-4 whitespace-pre-wrap">
                    {aiResponse}
                  </div>
                )}
             </div>
             <div className="p-4 border-t border-slate-200 bg-white">
               <textarea 
                  className="w-full text-sm border p-2 rounded mb-2 h-20 outline-none focus:border-indigo-500"
                  placeholder="Ask about formulas, optimization..."
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
               />
               <button 
                disabled={aiLoading}
                onClick={handleAskAI}
                className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300"
               >
                 {aiLoading ? 'Thinking...' : 'Ask Gemini'}
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ icon, active, onClick, tooltip }: any) => (
  <button
    onClick={onClick}
    title={tooltip}
    className={`p-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30' 
        : 'text-slate-400 hover:bg-slate-100 hover:text-cyan-600'
    }`}
  >
    {icon}
  </button>
);