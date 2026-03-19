import Groq from 'groq-sdk'
import dotenv from 'dotenv'

dotenv.config()

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

const ask = async (prompt, maxTokens = 800) => {
  const message = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  })
  return message.choices[0].message.content
}

export const generateQuestion = async (company, difficulty, topic, previousQuestions = []) => {
  const companyPrompts = {
    Google: 'Focus on deep computer science concepts, algorithms, and system design.',
    Amazon: 'Focus on behavioral questions using STAR format and Leadership Principles.',
    Microsoft: 'Focus on practical problem solving and real-world scenarios.'
  }

  const prompt = `You are a ${company} technical interviewer.
${companyPrompts[company]}
Difficulty level: ${difficulty}/10
Topic: ${topic}
${previousQuestions.length > 0 ? `Do NOT repeat these questions: ${previousQuestions.join(' | ')}` : ''}

Generate ONE interview question.
Respond ONLY in this exact JSON format, nothing else:
{
  "question": "your question here",
  "type": "technical",
  "expectedTopics": ["topic1", "topic2"],
  "difficulty": ${difficulty}
}`

  const text = await ask(prompt, 500)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}

export const evaluateAnswer = async (
  question,
  answer,
  company,
  timeTaken = 0,
  keystrokes = 0,
  backspaces = 0
) => {
  const backspaceRatio = keystrokes > 0
    ? ((backspaces / keystrokes) * 100).toFixed(1)
    : 0

  const wordsTyped = answer.trim().split(' ').length

  const typingSpeed = timeTaken > 0
    ? (wordsTyped / timeTaken * 60).toFixed(1)
    : 0

  const prompt = `You are an AI interview evaluator at ${company}.
Evaluate the candidate based on TWO things:
1. Answer quality
2. Behavioral signals

INPUT:
- Question: ${question}
- Answer: ${answer}
- Time taken: ${timeTaken} seconds
- Total keystrokes: ${keystrokes}
- Backspaces used: ${backspaces}
- Backspace ratio: ${backspaceRatio}% of keystrokes were deletions
- Typing speed: ${typingSpeed} words per minute
- Words in answer: ${wordsTyped}

BEHAVIORAL ANALYSIS RULES:
- Backspace ratio above 30 percent means low confidence
- Backspace ratio 10 to 30 percent means medium confidence
- Backspace ratio below 10 percent means high confidence
- Typing speed below 20 wpm means hesitation
- Typing speed 20 to 50 wpm means normal
- Typing speed above 50 wpm means confident
- Answer below 20 words means incomplete or nervous
- Time above 120 seconds means overthinking

You MUST respond ONLY with this exact JSON and nothing else.
Do not add any text before or after the JSON.
Do not add markdown or code blocks.

{
  "score": 7,
  "feedback": "your feedback on answer quality here",
  "confidence_level": "High",
  "behavior_analysis": "your behavioral analysis here",
  "improvement_tip": "one specific tip here"
}`

  const text = await ask(prompt, 800)
  console.log('AI RAW RESPONSE:', text)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}