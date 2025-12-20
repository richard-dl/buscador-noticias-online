require('dotenv').config();
const { isClaudeAvailable, processNewsWithAI } = require('./services/claudeService');

async function test() {
  console.log('Claude disponible:', isClaudeAvailable());
  console.log('API Key presente:', !!process.env.ANTHROPIC_API_KEY);
  console.log('API Key (primeros 20 chars):', process.env.ANTHROPIC_API_KEY?.substring(0, 20));

  try {
    const result = await processNewsWithAI({
      title: 'Aumento de sueldo para docentes en Argentina',
      description: 'El gobierno anunció un incremento del 15% en los salarios de maestros',
      source: 'Infobae'
    });
    console.log('Resultado:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();
