import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface ChatRequest {
  message: string;
  history?: Array<{
    text: string;
    sender: 'user' | 'assistant';
  }>;
}

// Simple RAG context from local files
function getRAGContext(userMessage: string): string {
  console.log('🔍 [RAG] Starting RAG context generation for message:', userMessage.substring(0, 100) + '...');
  
  try {
    // Load desirable properties
    const dpPath = path.join(process.cwd(), 'data', 'desirable-properties.json');
    console.log('📁 [RAG] Attempting to load DPs from:', dpPath);
    
    const dps = JSON.parse(fs.readFileSync(dpPath, 'utf8'));
    console.log('✅ [RAG] Successfully loaded DPs, count:', dps.desirable_properties?.length || 0);
    
    // Load RAG knowledge files from docs directory
    const docsDir = path.join(process.cwd(), '..', 'docs');
    console.log('📁 [RAG] Looking for docs in:', docsDir);
    
    const ragFiles = [
      'desirable_properties.md',
      'gpt_instructions.md', 
      'protocol_META-DP-EVAL-v1.3.md'
    ];
    
    let ragContext = '';
    
    for (const filename of ragFiles) {
      const filePath = path.join(docsDir, filename);
      console.log('📖 [RAG] Attempting to read:', filePath);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log('✅ [RAG] Successfully read', filename, 'size:', content.length, 'chars');
        ragContext += `\n\n--- ${filename} ---\n${content}`;
      } catch (fileError) {
        console.error('❌ [RAG] Failed to read', filename, ':', fileError);
      }
    }
    
    console.log('📊 [RAG] Total RAG context assembled, size:', ragContext.length, 'chars');
    
    // Simple keyword matching for context
    const keywords = userMessage.toLowerCase().split(' ');
    let relevantContext = '';

    // Check for DP-related queries
    if (keywords.some(k => k.includes('dp') || k.includes('desirable'))) {
      console.log('🎯 [RAG] Detected DP-related query, adding DP context');
      relevantContext += `\n\nDesirable Properties:\n${dps.desirable_properties.map((dp: { id: string; name: string; description: string }) => 
        `${dp.id} - ${dp.name}: ${dp.description}`
      ).join('\n')}`;
    }

    // Always include RAG context for DeepSeek
    relevantContext += `\n\nRAG Knowledge Base:\n${ragContext}`;

    console.log('✅ [RAG] Final context prepared, size:', relevantContext.length, 'chars');
    return relevantContext;
  } catch (error) {
    console.error('❌ [RAG] Error loading RAG context:', error);
    return '';
  }
}

// Call DeepSeek API
async function callDeepSeek(message: string, context: string): Promise<string> {
  console.log('🚀 [DeepSeek] Starting API call');
  console.log('🔑 [DeepSeek] API key present:', !!process.env.DEEPSEEK_API_KEY);
  
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('❌ [DeepSeek] No API key found');
    throw new Error('DeepSeek API key not configured');
  }

  const systemPrompt = `You are a helpful assistant for the Meta-Layer Initiative. You have access to the following context about the Meta-Layer and its submission process. Use this context to provide accurate, helpful responses.

Context:
${context}

Please respond to user questions about the Meta-Layer Initiative, Desirable Properties, submission guidelines, and related topics. Be helpful, accurate, and reference the provided context when appropriate.`;

  const payload = {
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user", 
        content: message
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  };

  console.log('📤 [DeepSeek] Sending request to API');
  console.log('📊 [DeepSeek] Payload size:', JSON.stringify(payload).length, 'chars');
  console.log('📝 [DeepSeek] User message:', message.substring(0, 100) + '...');

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    console.log('📥 [DeepSeek] Response status:', response.status);
    console.log('📋 [DeepSeek] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DeepSeek] API error response:', errorText);
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ [DeepSeek] Successfully parsed response');
    console.log('📊 [DeepSeek] Response structure:', Object.keys(data));
    
    const assistantMessage = data.choices?.[0]?.message?.content;
    if (!assistantMessage) {
      console.error('❌ [DeepSeek] No assistant message in response:', data);
      throw new Error('No assistant message in DeepSeek response');
    }

    console.log('✅ [DeepSeek] Extracted assistant message, length:', assistantMessage.length);
    return assistantMessage;

  } catch (error) {
    console.error('❌ [DeepSeek] API call failed:', error);
    throw error;
  }
}

// Fallback responses when API is not available
function getFallbackResponse(userMessage: string): string {
  console.log('🔄 [Fallback] Using fallback response for message:', userMessage.substring(0, 100) + '...');
  
  const message = userMessage.toLowerCase();
  
  if (message.includes('dp4') || message.includes('data sovereignty')) {
    return "DP4 - Data Sovereignty and Privacy focuses on participants maintaining full control of their data through privacy-centric designs, dynamic privacy settings, and secure personal data vaults. It ensures long-term data security and sovereignty within a decentralized system.";
  }
  
  if (message.includes('dp7') || message.includes('simplicity')) {
    return "DP7 - Simplicity and Interoperability emphasizes reducing complexity in design and promoting seamless interoperability across platforms. This ensures participants can engage effortlessly while AI tools monitor data flow to maintain privacy.";
  }
  
  if (message.includes('overview') || message.includes('summary')) {
    return "For your submission overview, try to write 2-3 sentences that clearly explain your idea, critique, or proposal. Focus on what problem it solves and how it relates to the Meta-Layer ecosystem. Be specific about which Desirable Properties it addresses.";
  }
  
  if (message.includes('title')) {
    return "Your submission title should be clear, descriptive, and capture the essence of your idea. Good examples: 'Shared Tray Protocol for Coordinated Overlay Interfaces' or 'Gamified 4D Interaction Layer for Digital-Physical Quests'.";
  }
  
  if (message.includes('help') || message.includes('assist')) {
    return "I can help you with:\n• Understanding Desirable Properties (DP1-DP20)\n• Writing submission titles and overviews\n• Choosing which DPs your submission addresses\n• Clarifications and extensions\n\nWhat specific aspect would you like help with?";
  }
  
  return "I'm here to help with your Meta-Layer submission! You can ask me about Desirable Properties, submission guidelines, or request help with specific parts of your form. What would you like to know?";
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔄 [${requestId}] Chat API request received`);
  
  try {
    const { message }: ChatRequest = await request.json();
    console.log(`📝 [${requestId}] Parsed message:`, message?.substring(0, 100) + '...');
    
    if (!message || !message.trim()) {
      console.log(`❌ [${requestId}] Empty message received`);
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check if DeepSeek API is configured
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    console.log(`🔑 [${requestId}] DeepSeek API key present:`, !!deepseekApiKey);
    
    if (deepseekApiKey) {
      console.log(`🚀 [${requestId}] Attempting DeepSeek API call`);
      
      try {
        // Get RAG context
        const context = getRAGContext(message);
        console.log(`📚 [${requestId}] RAG context prepared, size:`, context.length, 'chars');
        
        // Call DeepSeek API
        const response = await callDeepSeek(message, context);
        console.log(`✅ [${requestId}] DeepSeek API call successful`);
        
        return NextResponse.json({
          response,
          context: context ? 'RAG context loaded' : 'No context found',
          source: 'deepseek',
          requestId
        });
        
      } catch (apiError) {
        console.error(`❌ [${requestId}] DeepSeek API call failed:`, apiError);
        console.log(`🔄 [${requestId}] Falling back to fallback response`);
        
        // Fallback to canned responses
        const fallbackResponse = getFallbackResponse(message);
        
        return NextResponse.json({
          response: fallbackResponse,
          source: 'fallback',
          error: apiError instanceof Error ? apiError.message : String(apiError),
          requestId
        });
      }
    } else {
      console.log(`🔄 [${requestId}] No DeepSeek API key, using fallback`);
      
      // Use fallback responses
      const response = getFallbackResponse(message);
      
      return NextResponse.json({
        response,
        source: 'fallback',
        note: 'DeepSeek API not configured - using fallback responses',
        requestId
      });
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] Chat API error:`, error);
    return NextResponse.json(
      { error: 'Failed to process chat message', requestId },
      { status: 500 }
    );
  }
} 