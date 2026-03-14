import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiApiService {
  private getClient(apiKey: string) {
    return new GoogleGenerativeAI(apiKey);
  }

  async generateInsight(activityData: any, userPreferences?: any, apiKey?: string) {
    if (!apiKey) {
      throw new Error('Gemini API Key is required for this user.');
    }

    const genAI = this.getClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    let profileContext = '';
    if (userPreferences) {
      profileContext = `Thông tin người chạy: ${JSON.stringify(userPreferences)}`;
    }

    const prompt = `
      You are a Senior Running Coach. Analyze the following run activity data and provide personalized insights in Vietnamese.
      ${profileContext}

      Daily Journal (Nutrition, feeling, extra workouts):
      ${activityData.daily_journal || 'Không có ghi chép gì thêm cho ngày này.'}

      Respond ONLY in JSON format with the following structure:
      {
        "praise": "markdown string",
        "improvement": "markdown string",
        "warning": "markdown string"
      }

      Activity Data:
      ${JSON.stringify(activityData, (key, value) => (typeof value === 'bigint' ? value.toString() : value))}
    ...      Guidelines:
      - Praise: Focus on what went well.
      - Improvement: Focus on technique or training.
      - Warning: Focus on injury prevention or overtraining.
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const response = result.response;
    return {
      data: JSON.parse(response.text()),
      usage: response.usageMetadata,
      model: 'gemini-3-flash-preview'
    };
  }

  async generateText(prompt: string, apiKey?: string) {
    if (!apiKey) {
      throw new Error('Gemini API Key is required for this user.');
    }

    const genAI = this.getClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const result = await model.generateContent(prompt);
    
    return {
      text: result.response.text(),
      usage: result.response.usageMetadata,
      model: 'gemini-3-flash-preview'
    };
  }
}
