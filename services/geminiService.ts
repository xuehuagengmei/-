
import { GoogleGenAI, Type } from "@google/genai";
import { ShotConfig, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 统一使用最新的 Gemini 3 Flash 模型获得极速体验
const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * 压缩图片以减少网络负载
 */
const compressImage = (base64Data: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve({ data: base64Data, mimeType });
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1024; 

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ data: base64Data, mimeType });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const newDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const parts = newDataUrl.split(',');
      resolve({ data: parts[1], mimeType: 'image/jpeg' });
    };
    img.src = `data:${mimeType};base64,${base64Data}`;
  });
};

/**
 * 支持多图并行分析
 */
export const analyzeMultiImageScene = async (images: { data: string; mimeType: string }[]): Promise<string> => {
  try {
    const compressedImages = await Promise.all(
      images.map(img => compressImage(img.data, img.mimeType))
    );

    const imageParts = compressedImages.map(img => ({
      inlineData: { mimeType: img.mimeType, data: img.data }
    }));

    const prompt = `
      你是一位资深分镜艺术指导。请综合分析这${images.length}张参考图，提炼出一个统一的视觉基因。
      请详细描述：
      1. 环境：建筑风格、室内细节、具体地点感。
      2. 角色：体型、面部特征、发型、服装材质与细节。
      3. 影调：主光源位置、阴影质感、色彩饱和度、整体氛围（如：赛博朋克、中世纪史诗、宁静午后）。
      
      要求：
      - 使用中文。
      - 描述高度一致且细节丰富。
      - 去掉所有镜头角度。
      - 字数 150-250 字左右。
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [...imageParts, { text: prompt }]
      }
    });

    return response.text?.trim() || "场景分析失败";
  } catch (error) {
    console.error("Multi-Image Analysis Error:", error);
    throw new Error("并行推理失败");
  }
};

/**
 * 批量生成 9 个镜头
 */
export const generateBatchPrompts = async (
  sceneDescription: string,
  shots: ShotConfig[],
  language: Language
): Promise<string[]> => {
  try {
    const shotListStr = shots.map(s => `镜头${s.id}: ${s.defaultType}`).join('\n');
    const langInstruction = language === 'zh' ? '使用中文' : 'Use English';

    const prompt = `
      基础场景描述: "${sceneDescription}"

      为这9个镜头分别生成符合对应景别的AI绘画提示词：
      ${shotListStr}

      要求：
      1. ${langInstruction}。
      2. 每个镜头必须严格遵循给定的景别。
      3. 保持角色和环境的高度连续性。
      4. 只返回 JSON 格式：{"shots": ["prompt1", "prompt2", ...]}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shots: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{"shots": []}');
    return json.shots;
  } catch (error) {
    throw new Error("批量推理失败");
  }
};

/**
 * 单镜头刷新：确保严格遵循景别
 */
export const generateSingleShotPrompt = async (
  sceneDescription: string,
  shotType: string,
  language: Language
): Promise<string> => {
  const langInstruction = language === 'zh' ? '使用中文' : 'Use English';
  const prompt = `
    核心场景: "${sceneDescription}"
    目标镜头景别: "${shotType}"
    
    任务：基于以上场景，生成一个该镜头的详细描写。
    要求：
    1. ${langInstruction}。
    2. 视觉特征必须严格体现出 "${shotType}"。
    3. 细节丰富，电影感十足。
    4. 描述简练，1-2句话。
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });

  return response.text?.trim() || "";
};

/**
 * 极速高保真翻译：精准保留结构与排版
 */
export const translateBatchContents = async (
  texts: string[],
  targetLang: Language
): Promise<string[]> => {
  const target = targetLang === 'zh' ? 'Simplified Chinese' : 'English';
  
  // 核心优化：强调“翻译括号内内容”，同时禁止修改任何排版结构
  const prompt = `Act as an AI translation engine. Translate the following strings into ${target}. 
  CRITICAL INSTRUCTIONS:
  1. Translate ALL text content, INCLUDING text within symbols like [ ], { }, ( ).
  2. KEEP ALL line breaks (\\n), spaces, and the symbols [ ], { }, ( ) exactly as they are in the input. 
  3. DO NOT rearrange the content. 
  4. Ensure the output order and format strictly match the input JSON array.
  5. Respond ONLY with a JSON object: {"translations": ["...", "..."]}.
  
  Input: ${JSON.stringify(texts)}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0, // 设为 0 以获得最高确定性和速度
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["translations"]
        }
      }
    });

    const json = JSON.parse(response.text || '{"translations": []}');
    return json.translations || texts;
  } catch (error) {
    console.error("High-Speed Fidelity Translation Error:", error);
    return texts;
  }
};

// 后向兼容
export const analyzeImageScene = async (data: string, mime: string) => analyzeMultiImageScene([{data, mimeType: mime}]);
export const translateText = async (text: string, lang: Language) => (await translateBatchContents([text], lang))[0];
