import type { GameState, TreeStage } from '../config/types';

export interface StoreEvents {
  'state:changed': GameState;
  'tree:stage': TreeStage;
  'tree:harvest-ready': void;
  'day:changed': number;
  'brand:changed': GameState;
}

type Handler<T> = (payload: T) => void;

export class Store {
  private _state: GameState;
  private handlers = new Map<keyof StoreEvents, Set<Handler<never>>>();

  constructor(initial: GameState) {
    this._state = initial;
  }

  get state(): GameState {
    return this._state;
  }

  set(next: GameState): void {
    this._state = next;
    this.emit('state:changed', next);
  }

  on<K extends keyof StoreEvents>(event: K, cb: Handler<StoreEvents[K]>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(cb as Handler<never>);
    return () => this.handlers.get(event)?.delete(cb as Handler<never>);
  }

  emit<K extends keyof StoreEvents>(event: K, payload: StoreEvents[K]): void {
    this.handlers.get(event)?.forEach((cb) => (cb as Handler<StoreEvents[K]>)(payload));
  }
}
