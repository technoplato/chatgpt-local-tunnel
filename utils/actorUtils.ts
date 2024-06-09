import type { ActorRefFrom } from 'xstate'
import {
  gptCoordinatorMachine,
  GptCoordinatorMachineId,
} from '../src/gptCoordinator/gptCoordinatorMachine'
import { __unsafe_getAllOwnEventDescriptors } from 'xstate'
import { logger } from '../logging'

export const getActorPayload = (
  actor: ActorRefFrom<typeof gptCoordinatorMachine>,
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
    header + topLevelMeta + divider + stateMeta

  return {
    state,
    context,
    nextEvents,
    hintsForGpt: combinedHintsForGpt,
  }
}
