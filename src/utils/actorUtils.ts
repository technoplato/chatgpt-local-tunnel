import type { ActorRefFrom } from 'xstate'
import {
  coordinatorMachine,
  GptCoordinatorMachineId,
} from '../gptCoordinator/coordinator.machine.ts'
import { __unsafe_getAllOwnEventDescriptors } from 'xstate'
import { logger } from '../logging.ts'

export const getActorPayload = (
  actor: ActorRefFrom<typeof coordinatorMachine>,
) => {
  const snapshot = actor.getSnapshot()
  const state = snapshot.value
  const nextEvents = __unsafe_getAllOwnEventDescriptors(snapshot)
  const context = snapshot.context
  const metaMap = snapshot.getMeta()

  const stateValueString = snapshot._nodes
    .filter((s) => s.type === 'atomic' || s.type === 'final')
    .map((s) => s.id)
    .join(', ')
    .split('.')
    .slice(1)
    .join('.')

  logger.info('stateValueString', { stateValueString })

  const metakey = `${GptCoordinatorMachineId}.${stateValueString}`
  const stateMeta = metaMap[metakey]?.hintsForGpt ?? ''
  const topLevelMeta =
    metaMap[GptCoordinatorMachineId]?.hintsForGpt ?? ''

  const IgnoreEverythingElseHeader = `
================================================================================
IGNORE EVERYTHING ELSE ABOVE THIS LINE
HINTS THAT WILL HELP YOU ARE BELOW
PAY CLOSE ATTENTION TO THE HINTS THAT ARE BELOW
IGNORE EVERYTHING ELSE ABOVE THIS LINE
================================================================================
  `
  const header = `
    \n---------------------------------------------------------\n
    Hints for this entire process:
    \n---------------------------------------------------------\n
  `

  const divider = `
    \n---------------------------------------------------------\n
    Hints specific to this state: ${stateValueString}
    \n---------------------------------------------------------\n
  `

  const combinedHintsForGpt =
    IgnoreEverythingElseHeader +
    header +
    topLevelMeta +
    divider +
    stateMeta

  return {
    state,
    context,
    nextEvents,
    hintsForGpt: combinedHintsForGpt,
  }
}
