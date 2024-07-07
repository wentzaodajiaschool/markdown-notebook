import React, { useState, useEffect, useCallback, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { ChevronLeft, ChevronRight, Search, Eye, Edit, Columns } from 'lucide-react';
import rehypePrism from 'rehype-prism-plus';
import remarkGfm from 'remark-gfm';

// 初始章節數據
const initialChapters = [
  { id: 1, title: '公司簡介', content: '# 公司簡介\n\n我們是一家致力於創新的科技公司...' },
  { id: 2, title: '員工守則', content: '# 員工守則\n\n1. 尊重同事\n2. 保護公司機密\n3. 追求卓越' },
  { id: 3, title: '培訓計劃', content: '# 培訓計劃\n\n## 新員工入職\n\n- 公司文化介紹\n- 基本技能培訓\n- 團隊建設活動' },
];

// 編輯器模式枚舉
const EditorMode = {
  EDIT: 'edit',
  PREVIEW: 'preview',
  SPLIT: 'split',
};

// Imgur 上傳函數
const uploadToImgur = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        Authorization: 'Client-ID a0a92307b538c2f',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('上傳失敗');
    }

    const result = await response.json();
    return result.data.link;
  } catch (error) {
    console.error('圖片上傳錯誤:', error);
    return null;
  }
};

const Notebook = () => {
  // 狀態管理
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chapters, setChapters] = useState(initialChapters);
  const [currentChapter, setCurrentChapter] = useState(chapters[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editorMode, setEditorMode] = useState(EditorMode.EDIT);
  const [stats, setStats] = useState({ lines: 0, words: 0, chars: 0 });

  // 引用編輯器元素
  const editorRef = useRef(null);

  // 切換側邊欄
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // 選擇章節
  const handleChapterClick = useCallback((chapter) => {
    setCurrentChapter(chapter);
  }, []);

  // 更新章節內容
  const handleContentChange = useCallback((newContent) => {
    setCurrentChapter(prevChapter => ({ ...prevChapter, content: newContent }));
    setChapters(prevChapters => 
      prevChapters.map(ch => ch.id === currentChapter.id ? { ...ch, content: newContent } : ch)
    );
    
    // 更新統計信息
    const lines = newContent.split('\n').length;
    const words = newContent.trim().split(/\s+/).length;
    const chars = newContent.length;
    setStats({ lines, words, chars });
  }, [currentChapter.id]);

  // 處理圖片上傳
  const handleImageUpload = useCallback(async (file) => {
    const imageUrl = await uploadToImgur(file);
    if (imageUrl) {
      const imageMarkdown = `![uploaded image](${imageUrl})`;
      const newContent = currentChapter.content + '\n' + imageMarkdown;
      handleContentChange(newContent);
    }
  }, [currentChapter.content, handleContentChange]);

  // 處理粘貼事件
  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        await handleImageUpload(file);
        break;
      }
    }
  }, [handleImageUpload]);

  // 處理拖放事件
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.indexOf('image') !== -1) {
        await handleImageUpload(files[i]);
        break;
      }
    }
  }, [handleImageUpload]);

  // 過濾章節
  const filteredChapters = chapters.filter(chapter =>
    chapter.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 初始化統計信息
  useEffect(() => {
    const lines = currentChapter.content.split('\n').length;
    const words = currentChapter.content.trim().split(/\s+/).length;
    const chars = currentChapter.content.length;
    setStats({ lines, words, chars });
  }, [currentChapter]);

  // 設置事件監聽器
  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('paste', handlePaste);
      editor.addEventListener('drop', handleDrop);
      editor.addEventListener('dragover', (e) => e.preventDefault());
    }
    return () => {
      if (editor) {
        editor.removeEventListener('paste', handlePaste);
        editor.removeEventListener('drop', handleDrop);
        editor.removeEventListener('dragover', (e) => e.preventDefault());
      }
    };
  }, [handlePaste, handleDrop]);

  // 渲染編輯器
  const renderEditor = () => {
    switch (editorMode) {
      case EditorMode.EDIT:
        return (
          <div className="w-full h-full relative border rounded overflow-hidden bg-gray-900">
            <textarea
              ref={editorRef}
              value={currentChapter.content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full p-4 pl-12 resize-none focus:outline-none bg-gray-900 text-gray-200"
            />
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-800 text-right pr-2 pt-4 text-gray-500 select-none">
              {currentChapter.content.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          </div>
        );
      case EditorMode.PREVIEW:
        return (
          <div className="w-full h-full overflow-auto bg-white p-4 border rounded">
            <MDEditor.Markdown
              source={currentChapter.content}
              rehypePlugins={[rehypePrism]}
              remarkPlugins={[remarkGfm]}
            />
          </div>
        );
      case EditorMode.SPLIT:
        return (
          <div className="w-full h-full flex">
            <div className="w-1/2 h-full relative border rounded overflow-hidden bg-gray-900">
              <textarea
                ref={editorRef}
                value={currentChapter.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-full p-4 pl-12 resize-none focus:outline-none bg-gray-900 text-gray-200"
              />
              <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-800 text-right pr-2 pt-4 text-gray-500 select-none">
                {currentChapter.content.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
            </div>
            <div className="w-1/2 h-full overflow-auto bg-white p-4 border rounded">
              <MDEditor.Markdown
                source={currentChapter.content}
                rehypePlugins={[rehypePrism]}
                remarkPlugins={[remarkGfm]}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* 側邊欄 */}
      <div className={`bg-white shadow-md transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'} flex flex-col overflow-hidden absolute left-0 top-0 bottom-0 z-10`}>
        <div className="p-2 flex justify-between items-center">
          <h2 className="text-xl font-bold">目錄</h2>
        </div>
        <div className="px-2 pb-2">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索章節..."
              className="w-full p-2 pr-8 border rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute right-2 top-2.5 text-gray-400" />
          </div>
        </div>
        <ul className="space-y-1 p-2 flex-1 overflow-auto">
          {filteredChapters.map((chapter) => (
            <li
              key={chapter.id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                currentChapter.id === chapter.id ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              onClick={() => handleChapterClick(chapter)}
            >
              <span>{chapter.title}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 側邊欄切換按鈕 */}
      <button 
        onClick={toggleSidebar} 
        className={`absolute top-1/2 transform -translate-y-1/2 z-20
                    ${sidebarOpen ? 'left-64' : 'left-0'} 
                    transition-all duration-300 bg-white shadow-md rounded-r-full h-12 w-6 flex items-center justify-center`}
      >
        {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* 主要內容 */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'} flex flex-col`}>
        <div className="flex-1 overflow-auto p-4 pt-2">
          {renderEditor()}
        </div>
        <div className="flex justify-between items-center px-4 py-1 bg-gray-200 text-xs">
          <div className="text-gray-500">
            行數: {stats.lines} | 字數: {stats.words} | 字符數: {stats.chars}
          </div>
          <div className="flex space-x-1">
            {Object.values(EditorMode).map((mode) => (
              <button
                key={mode}
                onClick={() => setEditorMode(mode)}
                className={`p-1 rounded ${editorMode === mode ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                {mode === EditorMode.EDIT && <Edit size={16} />}
                {mode === EditorMode.PREVIEW && <Eye size={16} />}
                {mode === EditorMode.SPLIT && <Columns size={16} />}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style jsx global>{`
        .wmde-markdown {
          font-size: 16px !important;
          max-width: 70ch;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
};

export default Notebook;