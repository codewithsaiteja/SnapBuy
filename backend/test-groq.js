const Groq = require('groq-sdk');
require('dotenv').config();

const apiKey = process.env.GROQ_API_KEY;

async function testGroq() {
  console.log('🔑 Testing Groq API Key:', apiKey ? apiKey.slice(0, 12) + '...' : 'NOT FOUND in .env');

  if (!apiKey) {
    console.error('❌ GROQ_API_KEY is not set in .env');
    process.exit(1);
  }

  const groq = new Groq({ apiKey });

  try {
    const result = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a test bot. Reply with valid JSON only.' },
        { role: 'user',   content: 'Say hello as JSON like: {"hello": "world"}' }
      ],
      model:       'openai/gpt-oss-20b',
      max_tokens:  32,
      temperature: 0,
      stream:      false,
    });

    const content = result.choices[0]?.message?.content;
    console.log('✅ Groq API KEY IS WORKING!');
    console.log('   Model:    llama3-8b-8192');
    console.log('   Response:', content);
  } catch (err) {
    console.error('❌ Groq API KEY FAILED');
    console.error('   Error:', err.message);
    if (err.status)  console.error('   HTTP Status:', err.status);
    if (err.error)   console.error('   Details:', JSON.stringify(err.error));
  }
}

testGroq();
