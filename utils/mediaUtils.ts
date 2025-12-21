import { GoogleGenAI, Type } from "@google/genai";
import { UploadItem } from "../types";

/**
 * Creates a watermarked version of an image file.
 * Draws diagonal text "TFC MEDIA GROUP" across the image.
 */
export const createWatermarkedImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('Could not get canvas context');
        return;
      }

      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Configure Watermark Text
      const text = "TFC MEDIA GROUP";
      const fontSize = Math.max(40, canvas.width / 15); // Dynamic font size
      ctx.font = `900 ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Setup rotation for diagonal watermark
      const angle = -Math.PI / 4;
      
      // Calculate spacing
      const spacingX = ctx.measureText(text).width * 1.5;
      const spacingY = fontSize * 4;

      // Rotate context
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(angle);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Draw repeating pattern
      // We draw a large grid to cover the rotated canvas area
      const diag = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
      
      for (let y = -diag; y < diag; y += spacingY) {
        for (let x = -diag; x < diag; x += spacingX) {
           ctx.fillText(text, x, y);
        }
      }

      // Restore and export
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };

    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Generates a thumbnail for a video file and watermarks it.
 */
export const createVideoThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;
        
        video.onloadedmetadata = () => {
            video.currentTime = 1; // Seek to 1s
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.drawImage(video, 0, 0);
                
                // Add "VIDEO PREVIEW" Overlay
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Add Play Icon visual
                ctx.beginPath();
                ctx.moveTo(canvas.width/2 - 50, canvas.height/2 - 50);
                ctx.lineTo(canvas.width/2 + 50, canvas.height/2);
                ctx.lineTo(canvas.width/2 - 50, canvas.height/2 + 50);
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.fill();
            }

            // Convert to file to pass to watermarker
            canvas.toBlob(async (blob) => {
                if(blob) {
                    const imgFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
                    const watermarked = await createWatermarkedImage(imgFile);
                    resolve(watermarked);
                } else {
                    reject('Failed to create thumbnail blob');
                }
                URL.revokeObjectURL(video.src);
            }, 'image/jpeg');
        };

        video.onerror = reject;
    });
};

/**
 * Uses Gemini to analyze the media and return metadata.
 */
export const analyzeMediaWithAI = async (item: UploadItem): Promise<Partial<UploadItem>> => {
  try {
    // Safely retrieve API Key with browser compatibility check
    let apiKey = '';
    // Check if process exists (via polyfill or node) and has env
    if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
        apiKey = (window as any).process.env.API_KEY;
    } else if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        apiKey = process.env.API_KEY;
    }
    
    // Initialize Gemini only if key exists
    if (!apiKey) {
        console.warn("Gemini API Key missing. Skipping AI analysis.");
        return {
            status: 'error',
            title: item.file.name.split('.')[0],
            description: "AI Analysis unavailable (Missing API Key).",
            tags: []
        };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Convert file to Base64
    const base64Data = await fileToBase64(item.file);
    const mimeType = item.file.type;

    // Schema for structured JSON response
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "A creative, short title for the media." },
        description: { type: Type.STRING, description: "A professional description suitable for selling the media." },
        tags: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "5 relevant keywords for searchability."
        }
      },
      required: ["title", "description", "tags"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType.startsWith('video') ? 'video/mp4' : mimeType, // Simplify video mime
              data: base64Data
            }
          },
          {
            text: "Analyze this media content. Provide a creative title, a compelling sales description, and 5 relevant tags."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const json = JSON.parse(text);
    
    return {
      title: json.title,
      description: json.description,
      tags: json.tags,
      status: 'success'
    };

  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      status: 'error',
      title: item.file.name, // Fallback
      description: "Analysis failed. Please edit manually.",
      tags: []
    };
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:mime/type;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};
