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
      'meta-layer-knowledge.md'
    ];
    
    // Load new specification files from data/specifications directory
    const specsDir = path.join(process.cwd(), '..', 'data', 'specifications');
    console.log('📁 [RAG] Looking for specifications in:', specsDir);
    
    const specFiles = [
      'META-DP-EVAL-v1.5.md',
      'META-DP-VALIDATE-v1.1.md',
      'META-CREATIVE-v1.1.md',
      'README.md'
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
    
    // Load specification files
    for (const filename of specFiles) {
      const filePath = path.join(specsDir, filename);
      console.log('📖 [RAG] Attempting to read spec:', filePath);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log('✅ [RAG] Successfully read spec', filename, 'size:', content.length, 'chars');
        ragContext += `\n\n--- ${filename} ---\n${content}`;
      } catch (fileError) {
        console.error('❌ [RAG] Failed to read spec', filename, ':', fileError);
      }
    }
    
    console.log('📊 [RAG] Total RAG context assembled, size:', ragContext.length, 'chars');
    
    // Simple keyword matching for context
    const keywords = userMessage.toLowerCase().split(' ');
    let relevantContext = '';

    // Always include DP list for proper submission creation
    console.log('🎯 [RAG] Adding DP context for submission creation');
    relevantContext += `\n\nDesirable Properties:\n${dps.desirable_properties.map((dp: { id: string; name: string; description: string }) => 
      `${dp.id} - ${dp.name}: ${dp.description}`
    ).join('\n')}`;

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

  const systemPrompt = `You are Bridgit, a rigorous, protocol-bound guide for preparing Meta-Layer Initiative submissions. Your role is to help contributors turn their ideas, critiques, or proposals into fully compliant submissions using protocol META-DP-EVAL-v1.5.

Context:
${context}

PROTOCOL REQUIREMENTS - You must follow META-DP-EVAL-v1.5 exactly:

When users share ideas, help them create submissions with this EXACT structure:

**Title:** [Clear, descriptive title]

**Contribution Overview:** [Detailed explanation ending with "This submission was generated with protocol META-DP-EVAL-v1.5"]

**Directly Addressed Desirable Properties:**
- DP#[Number]: [Exact DP title] - [How your submission addresses this DP]
- DP#[Number]: [Exact DP title] - [How your submission addresses this DP]
[Continue for all relevant DPs]

**Clarifications & Extensions (optional):**
DP# – [Exact DP Title]: [Clarification or Extension Title]
Clarification: [Your text]
Why it matters: [Your text]

**Final line:** (End of Submission)

CRITICAL RULES:
1. ALWAYS include the exact phrase "This submission was generated with protocol META-DP-EVAL-v1.5" at the end of Contribution Overview
2. ALWAYS reference specific DP numbers and exact titles from the framework (DP1-DP21) - use ONLY the DP numbers provided in the context
3. ALWAYS structure responses in the exact format above
4. NEVER give general advice - create actual submission content
5. ALWAYS explain how the submission addresses specific DPs
6. ALWAYS reference specific Meta-Layer components, technical standards, and integration patterns when relevant
7. ALWAYS consider how the submission fits into the broader Meta-Layer ecosystem
8. ALWAYS suggest specific implementation approaches using the technical knowledge provided
9. ALWAYS end with "(End of Submission)"
10. NEVER use fake DP numbers - only use DP1, DP2, DP3, etc. as listed in the context

When users share ideas, create a complete submission following this protocol exactly. Use the Meta-Layer technical knowledge to provide specific, implementable solutions.`;

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
    return "I'm Bridgit, your Meta-Layer submission assistant! I can help you:\n• Identify which Desirable Properties (DP1-DP20) your idea addresses\n• Improve your submission structure and content\n• Suggest clarifications or extensions\n• Understand how your idea fits the Meta-Layer vision\n\nShare your idea and I'll help you create a better submission!";
  }
  
  return "I'm Bridgit, your Meta-Layer submission assistant! Share your idea, critique, or proposal, and I'll help you identify which Desirable Properties it addresses and how to improve it. What would you like to submit?";
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