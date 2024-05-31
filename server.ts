import express from 'express'
import { type AnyActor, createActor } from 'xstate'
import { gptCoordinatorMachine } from './src/gptCoordinator/gptCoordinatorMachine.ts'

const app = express()
const port = 3000

const actor = createActor(gptCoordinatorMachine)
actor.start()

app.get('/machineState', (req, res) => {
  const state = actor.getSnapshot().value
  const context = actor.getSnapshot().context

  res.send({
    state,
    context,
  })
})

app.post('/machineSend', (req, res) => {
  const command = req.body.command
  console.log(command)
  // tood make sure right type or respond with valid types for state
  actor.send({ type: command })

  const snapshot = actor.getSnapshot()
  const meta = snapshot.getMeta()
  const hintsForGpt = meta.hintsForGpt
  res.send({
    state: snapshot.value,
    context: snapshot.context,
    hints: hintsForGpt,
  })
})

app.get('/', (req, res) => {
  res.send('Hello, World!')
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
