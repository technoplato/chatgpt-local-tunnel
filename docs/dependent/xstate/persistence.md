Persistence
Actors can persist their internal state and restore it later. Persistence refers to storing the state of an actor in persistent storage, such as localStorage or a database. Restoration refers to restoring the state of an actor from persistent storage.

In frontend applications, persistence is useful for maintaining state across browser reloads. In backend applications, persistence allows workflows to span multiple requests, survive service restarts, be fault-tolerant, represent long-running processes, and be auditable and traceable.

In XState, you can obtain the snapshot (state) to be persisted via actor.getPersistedSnapshot() and restore it via createActor(behavior, { snapshot: restoredState }).start():

const feedbackActor = createActor(feedbackMachine).start();

// Get state to be persisted
const persistedState = feedbackActor.getPersistedSnapshot();

// Persist state
localStorage.setItem('feedback', JSON.stringify(persistedState));

// Restore state
const restoredState = JSON.parse(localStorage.getItem('feedback'));

const restoredFeedbackActor = createActor(feedbackMachine, {
  snapshot: restoredState,
}).start();

Persisting state
You can obtain the state to be persisted via actor.getPersistedSnapshot():

const feedbackActor = createActor(feedbackMachine).start();

// Get state to be persisted
const persistedState = feedbackActor.getPersistedSnapshot();

The internal state can be persisted from any actor, not only machines. Note that the persisted state is not the same as the snapshot from actor.getSnapshot(); persisted state represents the internal state of the actor, while snapshots represent the actor's last emitted value:

const promiseActor = fromPromise(() => Promise.resolve(42));

// Get the last emitted value
const snapshot = promiseActor.getSnapshot();
console.log(snapshot);
// logs 42

// Get the persisted state
const persistedState = promiseActor.getPersistedSnapshot();
console.log(persistedState);
// logs { status: 'done', data: 42 }

Restoring state
You can restore an actor to a persisted state by passing the persisted state into the state option of the second argument of createActor(logic, { snapshot: restoredState }):

// Get persisted state
const restoredState = JSON.parse(localStorage.getItem('feedback'));

// Restore state
const feedbackActor = createActor(feedbackMachine, {
  snapshot: restoredState,
});

feedbackActor.start();

Actions from machine actors will not be re-executed, because they are assumed to have been already executed. However, invocations will be restarted, and spawned actors will be restored recursively.

Deep persistence
Persisting & restoring state from machine actors is deep; all invoked & spawned actors will be persisted and restored recursively.

const feedbackMachine = createMachine({
  // ...
  states: {
    form: {
      invoke: {
        id: 'form',
        src: formMachine,
      },
    },
  },
});

const feedbackActor = createActor(feedbackMachine).start();

// Persist state
const persistedState = feedbackActor.getPersistedSnapshot();
localStorage.setItem('feedback', JSON.stringify(persistedState));

//  ...

// Restore state
const restoredState = JSON.parse(localStorage.getItem('feedback'));

const restoredFeedbackActor = createActor(feedbackMachine, {
  snapshot: restoredState,
}).start();
// Will restore both the feedbackActor and the invoked form actor at
// their persisted states

Persisting state machine values
If you want to persist only the finite state value (and optionally the context) of a state machine actor, you can use the machine.resolveState(...) method:

import { someMachine } from './someMachine';

const restoredStateValue = localStorage.getItem('someState');
// Assume that this is "pending"

const resolvedState = someMachine.resolveState({
  value: restoredStateValue,
  // context: { ... }
});

// Restore the actor
const restoredActor = createActor(someMachine, {
  snapshot: resolvedState
});

restoredActor.start();

Event sourcing
An alternative to persisting state is event sourcing, which is a way of restoring the state of an actor by replaying the events that led to that state. Event sourcing can be more reliable than persisting state, because it is less prone to incompatible state and it also allows you to replay actions.

One way to implement event sourcing is to persist the events as they happen using the inspection API, and then replay them to restore the state of the actor:

const events = [];

const someActor = createActor(someMachine, {
  // Inspect and persist events
  inspect: (inspectionEvent) => {
    if (inspectionEvent.type === '@xstate.event') {
      const event = inspectionEvent.event;

      // Only listen for events sent to the root actor
      if (inspectionEvent.actorRef !== someActor) { return; }

      events.push(event);
    }
  }
});

someActor.start();

// ...

// Assuming the events are stored somewhere, e.g. in localStorage,
// you can replay them to restore the state of the actor

const restoredActor = createActor(someMachine);
restoredActor.start();

for (const event of events) {
  // Replay events
  restoredActor.send(event);
}

Caveats
There are some caveats to persisting and restoring state that you should be aware of:

Incompatible state: if the machine or actor logic changes, the restored state may be incompatible with the new logic.
Replaying actions: actions that have already been executed will not be re-executed. Event sourcing is preferred for this use-case.
Serialization: the state must be serializable, which means that it must be JSON-serializable. This means that you cannot persist functions, classes, or other non-serializable values.
Persistence cheatsheet
Cheatsheet: persisting state
const persistedState = actor.getPersistedSnapshot();

Cheatsheet: restoring state
const restoredState = JSON.parse(localStorage.getItem('feedback'));

const restoredActor = createActor(actorMachine, {
  snapshot: restoredState,
}).start();

Resources
Blog: Persisting state in XState
