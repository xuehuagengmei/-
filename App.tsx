
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_SHOTS, MOCK_SCENE_PLACEHOLDER } from './constants';
import { ShotConfig, Language } from './types';
import * as GeminiService from './services/geminiService';
import ShotCard from './components/ShotCard';
import Toast from './components/Toast';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

function App() {
  // --- State ---
  const [sceneDescription, setSceneDescription] = useState<string>('');
  const [shots, setShots] = useState<ShotConfig[]>(INITIAL_SHOTS);
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingText, setAnalyzingText] = useState('开始分析 (Start Analysis)');
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isBtnHighlighted, setIsBtnHighlighted] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [finalOutput, setFinalOutput] = useState<string>('');
  const [isCopyingAll, setIsCopyingAll] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Analysis Text Animation ---
  useEffect(() => {
    let interval: number;
    if (isAnalyzing) {
      const tips = ["提取视觉特征...", "融合环境光影...", "捕捉角色细节...", "生成场景基因...", "精炼提示词..."];
      let i = 0;
      interval = window.setInterval(() => {
        setAnalyzingText(tips[i % tips.length]);
        i++;
      }, 1500);
    } else {
      setAnalyzingText('开始分析 (Start Analysis)');
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // --- Handlers ---

  const showToast = (message: string) => {
    setToast({ visible: true, message });
  };

  const closeToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;

    const newFiles = files.slice(0, 4 - imageFiles.length);
    
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFiles(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: reader.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImageFiles(prev => prev.filter(img => img.id !== id));
  };

  const handleAnalyze = async () => {
    if (imageFiles.length === 0) return;
    setIsAnalyzing(true);
    try {
      const imagesData = imageFiles.map(img => {
        const parts = img.preview.split(',');
        return {
          data: parts.length > 1 ? parts[1] : '',
          mimeType: img.file.type
        };
      });
      const analysis = await GeminiService.analyzeMultiImageScene(imagesData);
      setSceneDescription(analysis);
      showToast("多图场景并行分析成功");
    } catch (error) {
      showToast("分析失败，请检查网络");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShotTypeChange = (id: number, newType: string) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, defaultType: newType } : s));
  };

  const handleContentChange = (id: number, newContent: string) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, content: newContent } : s));
  };

  const handleRefreshShot = async (id: number) => {
    if (!sceneDescription) {
      showToast("请先生成场景描述");
      return;
    }
    const shot = shots.find(s => s.id === id);
    if (!shot) return;

    setShots(prev => prev.map(s => s.id === id ? { ...s, content: '', isLoading: true } : s));
    
    try {
      const newPrompt = await GeminiService.generateSingleShotPrompt(sceneDescription, shot.defaultType, language);
      setShots(prev => prev.map(s => s.id === id ? { ...s, content: newPrompt, isLoading: false } : s));
    } catch (error) {
      setShots(prev => prev.map(s => s.id === id ? { ...s, isLoading: false } : s));
      showToast("镜头生成失败");
    }
  };

  const handleBatchGenerate = async () => {
    if (!sceneDescription) {
      showToast("请先生成场景描述");
      return;
    }
    setIsBatchGenerating(true);
    setShots(prev => prev.map(s => ({ ...s, isLoading: true })));

    try {
      const generatedPrompts = await GeminiService.generateBatchPrompts(sceneDescription, shots, language);
      setShots(prev => prev.map((s, index) => ({
        ...s,
        content: generatedPrompts[index] || "生成失败",
        isLoading: false
      })));
      showToast("分镜批量生成完成");
    } catch (error) {
      showToast("批量生成失败");
      setShots(prev => prev.map(s => ({ ...s, isLoading: false })));
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleTranslateAll = async () => {
    // 1. 高亮反馈
    setIsBtnHighlighted(true);
    setTimeout(() => setIsBtnHighlighted(false), 300);

    const newLang = language === 'zh' ? 'en' : 'zh';
    const allTexts = [sceneDescription, ...shots.map(s => s.content)];
    const hasContent = allTexts.some(t => t && t.trim().length > 0);
    
    if (!hasContent) {
        setLanguage(newLang);
        return;
    }

    setIsTranslating(true);
    try {
        const translatedTexts = await GeminiService.translateBatchContents(allTexts, newLang);
        if (translatedTexts.length > 0) {
            setSceneDescription(translatedTexts[0]);
            const newShotContents = translatedTexts.slice(1);
            setShots(prev => prev.map((s, index) => ({
                ...s,
                content: newShotContents[index] || s.content
            })));
            setLanguage(newLang);
            showToast(`已翻译为 ${newLang === 'zh' ? '中文' : 'English'}`);
        }
    } catch(e) {
        showToast("翻译失败");
    } finally {
        setIsTranslating(false);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("确定要清空所有内容吗？")) {
      setSceneDescription('');
      setShots(INITIAL_SHOTS);
      setImageFiles([]);
      setFinalOutput('');
      setLanguage('zh');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const constructFinalOutput = useCallback(() => {
    if (shots.every(s => !s.content)) return '';
    const isZh = language === 'zh';
    
    const header = isZh 
      ? `生成一张具有凝聚力的[3x3]网格图像，包含在同一环境中的[9]个不同摄像机镜头，严格保持人物/物体、服装 and 光线的一致性，[8K]分辨率,[16:9]画幅。`
      : `Create a cohesive [3x3] grid image featuring [9] different camera shots in the same environment, strictly maintaining consistency in character/object, clothing, and lighting, [8K] resolution, [16:9] aspect ratio.`;

    const shotLines = shots.map(s => {
      const label = isZh ? s.label : `Shot ${s.id.toString().padStart(2, '0')}`;
      // 核心修改：移除 s.defaultType (景别预设)，直接拼接生成的描述内容
      return `${label}: ${s.content}`;
    }).join('\n');

    return `${header}\n${shotLines}`;
  }, [shots, language]);

  useEffect(() => {
    setFinalOutput(constructFinalOutput());
  }, [constructFinalOutput]);

  const handleCopy = () => {
    if (!finalOutput) return;
    navigator.clipboard.writeText(finalOutput);
    setIsCopyingAll(true);
    showToast("全部提示词已复制");
    setTimeout(() => setIsCopyingAll(false), 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-7xl mx-auto relative">
      <Toast message={toast.message} isVisible={toast.visible} onClose={closeToast} />

      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gemini 3 极速分镜助手</h1>
          <p className="text-slate-500 text-sm mt-1">支持多图并行分析，反推场景，秒级生成九宫格分镜提示词。</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleClearAll} className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-md shadow-sm hover:bg-red-100 text-sm font-medium transition-colors">
            清空 (Clear All)
          </button>
          <button 
            onClick={handleTranslateAll} 
            disabled={isTranslating}
            className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-all flex items-center gap-2 ${
              isBtnHighlighted 
                ? 'bg-indigo-600 text-white border-indigo-600 scale-105 shadow-md' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            } ${isTranslating ? 'opacity-80 cursor-wait' : ''}`}
          >
            {isTranslating && <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>}
            {language === 'zh' ? '中英文切换 (EN)' : '中英文切换 (CN)'}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">1. 参考图 (支持多选，最多4张)</h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {imageFiles.map(img => (
                <div key={img.id} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden group">
                  <img src={img.preview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    // Fixed: Changed 'id' to 'img.id' to fix "Cannot find name 'id'"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {imageFiles.length < 4 && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px] text-slate-400 mt-1">添加参考图</span>
                </div>
              )}
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                multiple
                className="hidden" 
            />
            <button 
                onClick={handleAnalyze}
                disabled={imageFiles.length === 0 || isAnalyzing}
                className={`w-full py-2.5 rounded-lg text-white font-medium shadow-md transition-all ${
                    imageFiles.length === 0 || isAnalyzing 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
                {isAnalyzing ? analyzingText : '开始并行分析 (Parallel Analysis)'}
            </button>
        </div>

        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col relative">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">2. 场景描述 (Scene Prompt)</h2>
            <textarea
                value={sceneDescription}
                onChange={(e) => setSceneDescription(e.target.value)}
                placeholder={MOCK_SCENE_PLACEHOLDER}
                className="flex-1 w-full p-3 text-sm text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-slate-50 leading-relaxed"
            />
        </div>
      </section>

      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">3. 分镜网格 (Shot Grid)</h2>
            <button
                onClick={handleBatchGenerate}
                disabled={isBatchGenerating || !sceneDescription}
                className={`px-5 py-2 rounded-lg text-white font-medium shadow-md transition-all ${
                    isBatchGenerating || !sceneDescription ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
                {isBatchGenerating ? '极速推理中...' : '一键生成全部分镜'}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shots.map(shot => (
                <ShotCard 
                    key={shot.id} 
                    shot={shot} 
                    onTypeChange={handleShotTypeChange}
                    onRefresh={handleRefreshShot}
                    onContentChange={handleContentChange}
                    onCopy={(content) => {
                      navigator.clipboard.writeText(content);
                      showToast("已复制镜头提示词");
                    }}
                />
            ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">4. 最终提示词 (Final Output)</h2>
            <button 
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    isCopyingAll ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
            >
                {isCopyingAll ? '已复制!' : '复制全部提示词'}
            </button>
        </div>
        <textarea
            value={finalOutput}
            readOnly
            className="w-full h-64 p-4 font-mono text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-100"
        />
      </section>

      <footer className="mt-8 flex flex-col items-end text-slate-400 text-xs font-medium space-y-1">
          <p>作者：雪花更美 | VX：18510699455</p>
          <p>Powered by Gemini 3 Flash Preview</p>
      </footer>
    </div>
  );
}

export default App;
