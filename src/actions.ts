import {
  Action,
  Event,
  EventType,
  EventObject,
  SendAction,
  SendActionOptions,
  CancelAction,
  ActionObject,
  ActionType,
  Assigner,
  PropertyAssigner,
  AssignAction,
  ActionFunction,
  ActionFunctionMap,
  ActivityActionObject,
  ActionTypes,
  ActivityDefinition
} from './types';
import * as actionTypes from './actionTypes';
import { getEventType } from './utils';

export { actionTypes };

export const toEventObject = (
  event: Event,
  id?: string | number
): EventObject => {
  if (typeof event === 'string' || typeof event === 'number') {
    const eventObject: EventObject = { type: event };
    if (id !== undefined) {
      eventObject.id = id;
    }

    return eventObject;
  }

  return event;
};

function getActionFunction<TContext>(
  actionType: ActionType,
  actionFunctionMap?: ActionFunctionMap<TContext>
): ActionFunction<TContext> | undefined {
  if (!actionFunctionMap) {
    return undefined;
  }
  const actionReference = actionFunctionMap[actionType];

  if (!actionReference) {
    return undefined;
  }

  if (typeof actionReference === 'function') {
    return actionReference;
  }

  return actionReference.exec;
}

export const toActionObject = <TContext>(
  action: Action<TContext>,
  actionFunctionMap?: ActionFunctionMap<TContext>
): ActionObject<TContext> => {
  let actionObject: ActionObject<TContext>;

  if (typeof action === 'string' || typeof action === 'number') {
    actionObject = {
      type: action,
      exec: getActionFunction(action, actionFunctionMap)
    };
  } else if (typeof action === 'function') {
    actionObject = {
      type: action.name,
      exec: action
    };
  } else {
    const exec = getActionFunction(action.type, actionFunctionMap);
    return exec
      ? {
          ...action,
          exec
        }
      : action;
  }

  Object.defineProperty(actionObject, 'toString', {
    value: () => actionObject.type,
    enumerable: false
  });

  return actionObject;
};

export function toActivityDefinition<TContext>(
  action: string | ActionObject<TContext> | ActivityDefinition<TContext>
): ActivityDefinition<TContext> {
  const actionObject = toActionObject(action);

  return {
    ...actionObject,
    type: actionObject.type,
    start: actionObject.start
      ? toActionObject(actionObject.start)
      : actionObject.exec
        ? toActionObject(actionObject.exec)
        : undefined,
    stop: actionObject.stop ? toActionObject(actionObject.stop) : undefined
  };
}

export const toActionObjects = <TContext>(
  action: Array<Action<TContext> | Action<TContext>> | undefined,
  actionFunctionMap?: ActionFunctionMap<TContext>
): Array<ActionObject<TContext>> => {
  if (!action) {
    return [];
  }

  const actions = Array.isArray(action) ? action : [action];

  return actions.map(subAction => toActionObject(subAction, actionFunctionMap));
};

export const raise = (eventType: EventType): EventObject => ({
  type: actionTypes.raise,
  event: eventType
});

export const send = (event: Event, options?: SendActionOptions): SendAction => {
  return {
    type: actionTypes.send,
    event: toEventObject(event),
    delay: options ? options.delay : undefined,
    id: options && options.id !== undefined ? options.id : getEventType(event)
  };
};

export function log<TContext>(
  expr: (ctx: TContext, event: EventObject) => void,
  label?: string
) {
  return {
    type: actionTypes.log,
    label,
    expr
  };
}

export const cancel = (sendId: string | number): CancelAction => {
  return {
    type: actionTypes.cancel,
    sendId
  };
};

export function start<TContext>(
  activity: string | ActionObject<TContext> | ActivityDefinition<TContext>
): ActivityActionObject<TContext> {
  const activityDef = toActivityDefinition(activity);

  return {
    type: ActionTypes.Start,
    activity: activityDef,
    exec: activityDef.start ? activityDef.start.exec : undefined
  };
}

export function stop<TContext>(
  activity: string | ActionObject<TContext> | ActivityDefinition<TContext>
): ActivityActionObject<TContext> {
  const activityDef = toActivityDefinition(activity);

  return {
    type: ActionTypes.Stop,
    activity: activityDef,
    exec: activityDef.stop ? activityDef.stop.exec : undefined
  };
}

export const assign = <TContext>(
  assignment: Assigner<TContext> | PropertyAssigner<TContext>
): AssignAction<TContext> => {
  return {
    type: actionTypes.assign,
    assignment
  };
};

export function isActionObject<TContext>(
  action: Action<TContext>
): action is ActionObject<TContext> {
  return typeof action === 'object' && 'type' in action;
}

export function after(delay: number, id?: string) {
  const idSuffix = id ? `#${id}` : '';
  return `${ActionTypes.After}(${delay})${idSuffix}`;
}

export function done(id: string) {
  return `${ActionTypes.DoneState}.${id}`;
}
