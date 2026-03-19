import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { generateQuestion, evaluateAnswer } from './ai.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Interview backend is running!' })
})

// Start interview - get first question
app.post('/start-interview', async (req, res) => {
  try {
    const { company, topic } = req.body
    const question = await generateQuestion(company, 5, topic, [])
    res.json({ success: true, question })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// Submit answer - get evaluation + next question
app.post('/submit-answer', async (req, res) => {
  try {
    const { question, answer, company, previousQuestions, currentDifficulty } = req.body

    // Evaluate the answer
    const evaluation = await evaluateAnswer(question, answer, company)

    // Adaptive difficulty
    let nextDifficulty = currentDifficulty
    if (evaluation.score < 4) nextDifficulty = Math.max(1, currentDifficulty - 1)
    else if (evaluation.score > 7) nextDifficulty = Math.min(10, currentDifficulty + 1)

    // Get next question
    const nextQuestion = await generateQuestion(
      company,
      nextDifficulty,
      'mixed',
      previousQuestions
    )

    res.json({
      success: true,
      evaluation,
      nextQuestion,
      nextDifficulty
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})