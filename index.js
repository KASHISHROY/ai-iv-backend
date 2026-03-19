import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { generateQuestion, evaluateAnswer } from './ai.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Interview backend is running!' })
})

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

app.post('/submit-answer', async (req, res) => {
  try {
    const {
      question,
      answer,
      company,
      previousQuestions,
      currentDifficulty,
      timeTaken,
      keystrokes,
      backspaces,
      isFollowUp
    } = req.body

    console.log('Behavioral data:', { timeTaken, keystrokes, backspaces })
    console.log('Is follow-up:', isFollowUp)

    const evaluation = await evaluateAnswer(
      question,
      answer,
      company,
      timeTaken || 0,
      keystrokes || 0,
      backspaces || 0
    )

    console.log('Evaluation:', evaluation)

    // Adaptive difficulty
    let nextDifficulty = currentDifficulty
    if (evaluation.score < 4) nextDifficulty = Math.max(1, currentDifficulty - 1)
    else if (evaluation.score > 7) nextDifficulty = Math.min(10, currentDifficulty + 1)

    // Smart next question logic
    let nextQuestion
    if (isFollowUp || evaluation.score === 10) {
      // Was already a follow-up OR perfect score → fresh question
      nextQuestion = await generateQuestion(
        company,
        nextDifficulty,
        'mixed',
        previousQuestions
      )
    } else if (evaluation.follow_up_question) {
      // First answer → use follow-up as next question
      nextQuestion = {
        question: evaluation.follow_up_question,
        type: 'follow-up',
        difficulty: nextDifficulty
      }
    } else {
      // No follow-up → fresh question
      nextQuestion = await generateQuestion(
        company,
        nextDifficulty,
        'mixed',
        previousQuestions
      )
    }

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