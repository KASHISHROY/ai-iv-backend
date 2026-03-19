import Groq from 'groq-sdk'
import dotenv from 'dotenv'

dotenv.config()

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

const ask = async (prompt, maxTokens = 600) => {
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

export const evaluateAnswer = async (question, answer, company) => {
  const prompt = `You are a strict but fair ${company} interviewer evaluating a candidate's answer.

Question: ${question}
Candidate's Answer: ${answer}

Evaluate and respond ONLY in this exact JSON format, nothing else:
{
  "score": 7,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "improvement": "specific advice here",
  "followUpQuestion": "one follow-up question here"
}`

  const text = await ask(prompt, 600)
  
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}