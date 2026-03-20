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

FOLLOW-UP QUESTION RULES:
- Look at the improvement_tip you just wrote
- The follow_up_question MUST be a direct question asking the candidate to act on that tip
- If score is 10, set follow_up_question to empty string ""

COMPANY SPECIFIC EVALUATION RULES:
- If company is Google: focus on algorithmic efficiency, time/space complexity, scalability
- If company is Amazon: focus on Leadership Principles, STAR format, customer obsession
- If company is Microsoft: focus on practical implementation, collaboration, real-world scenarios

IMPORTANT: Respond with ONLY raw JSON, no extra text, no markdown.

{
  "score": 7,
  "feedback": "write your answer quality feedback here",
  "confidence_level": "High",
  "behavior_analysis": "write your behavioral analysis here",
  "improvement_tip": "write one specific tip here",
  "follow_up_question": "write ONE specific follow-up question directly based on the improvement tip",
  "company_feedback": "write why this answer would or would not pass at ${company} specifically"
}`

  const text = await ask(prompt, 1000)
  console.log('RAW AI RESPONSE:', text)

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}

export const generateCodingQuestion = async (company, difficulty) => {
  const companyFocus = {
    Google: 'algorithms, data structures, optimization, time complexity',
    Amazon: 'practical problem solving, scalability, real world scenarios',
    Microsoft: 'clean code, real-world applications, implementation clarity'
  }

  const prompt = `You are a ${company} technical interviewer.
Generate a ${difficulty} level coding interview question focused on ${companyFocus[company]}.

IMPORTANT RULES:
- You MUST include exactly 3 test cases
- Test cases must have realistic inputs and outputs
- Do NOT generate Two Sum - generate a different problem

Respond ONLY in this exact JSON format, nothing else:
{
  "title": "Problem Title Here",
  "question": "Full detailed problem description here with all edge cases explained",
  "examples": [
    { "input": "specific example input", "output": "specific example output" },
    { "input": "specific example input 2", "output": "specific example output 2" }
  ],
  "test_cases": [
    { "input": "test input 1", "expected": "expected output 1", "description": "Basic case" },
    { "input": "test input 2", "expected": "expected output 2", "description": "Edge case - empty or null" },
    { "input": "test input 3", "expected": "expected output 3", "description": "Large or complex input" }
  ],
  "constraints": [
    "specific constraint 1",
    "specific constraint 2",
    "specific constraint 3"
  ],
  "hints": [
    "First hint - very subtle nudge toward solution",
    "Second hint - more specific guidance",
    "Third hint - key insight without giving solution"
  ],
  "difficulty": "${difficulty}",
  "topic": "arrays"
}`

  const text = await ask(prompt, 1200)
  console.log('CODING QUESTION RESPONSE:', text)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}

export const evaluateCode = async (question, code, language, company, testCases = []) => {
  const testCasesText = testCases.length > 0
    ? `TEST CASES TO EVALUATE AGAINST:
${testCases.map((tc, i) =>
    `Test ${i + 1} (${tc.description}): Input: ${tc.input} | Expected: ${tc.expected}`
  ).join('\n')}`
    : 'No test cases provided - evaluate based on logic alone'

  const companyStandards = {
    Google: 'Google values optimal time/space complexity. They reject O(n²) when O(n) exists.',
    Amazon: 'Amazon values practical working solutions and clean readable code.',
    Microsoft: 'Microsoft values clean implementation, good naming, and edge case handling.'
  }

  const prompt = `You are a senior ${company} engineer doing a code review.

PROBLEM:
${question}

CANDIDATE'S ${language} CODE:
${code}

${testCasesText}

COMPANY STANDARD:
${companyStandards[company]}

Analyze the code carefully for each test case and respond ONLY in this exact JSON format, nothing else:
{
  "score": 7,
  "correctness": "Does this code correctly solve the problem? Be specific about what works and what doesn't.",
  "time_complexity": "O(n)",
  "space_complexity": "O(1)",
  "test_results": [
    {
      "description": "Basic case",
      "input": "the exact input",
      "expected": "the expected output",
      "status": "pass",
      "explanation": "The code handles this correctly because..."
    },
    {
      "description": "Edge case",
      "input": "the exact input",
      "expected": "the expected output",
      "status": "fail",
      "explanation": "The code fails here because..."
    },
    {
      "description": "Large input",
      "input": "the exact input",
      "expected": "the expected output",
      "status": "pass",
      "explanation": "The code handles this correctly because..."
    }
  ],
  "code_quality": "Comments on variable naming, structure, readability, best practices",
  "improvements": "Specific line by line improvements to make this code better",
  "company_verdict": "Would this pass ${company} interview? Detailed honest reasoning.",
  "better_approach": "If a more optimal solution exists describe it clearly"
}`

  const text = await ask(prompt, 1500)
  console.log('CODE EVALUATION:', text)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}

export const getHint = async (question, code, hintNumber) => {
  const prompt = `You are a helpful coding interview mentor.

PROBLEM: ${question}
CANDIDATE CODE SO FAR: ${code || 'No code written yet'}
HINT NUMBER REQUESTED: ${hintNumber}

Rules for hints:
- NEVER give the solution or write code
- Hint 1: Very subtle - mention a general concept or data structure category
- Hint 2: More specific - mention the exact data structure or algorithm approach
- Hint 3: Very direct - explain the key insight step by step without code

Respond ONLY in this exact JSON format:
{
  "hint": "your hint text here - one or two sentences max",
  "hint_number": ${hintNumber}
}`

  const text = await ask(prompt, 300)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}