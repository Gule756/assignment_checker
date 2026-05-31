/**
 * ================================================================
 *  EventBus — Observer Pattern Implementation
 * ================================================================
 *  Pattern  : OBSERVER (Behavioral GoF Pattern)
 *  Intent   : Define a one-to-many dependency between objects so
 *             that when one object changes state, all its dependents
 *             are notified and updated automatically.
 *
 *  Participants (GoF roles):
 *    Subject         → EventBus (this class)
 *    Observer        → any Function registered via subscribe()
 *    ConcreteSubject → EventBus instance (holds listener registry)
 *    ConcreteObserver→ logger, counter, analytics callbacks in engine.js
 *
 *  How it applies here:
 *    When a submission is registered, the SubmissionAPI publishes
 *    'submission:registered'. All subscribed observers (logger,
 *    counter) are automatically notified without SubmissionAPI
 *    knowing who they are — perfect decoupling.
 * ================================================================
 */
class EventBus {
  constructor() {
    /**
     * Registry: event name → array of observer (listener) functions
     * @type {Object.<string, Function[]>}
     */
    this._listeners = {};
  }

  /**
   * Subscribe an observer to an event.
   * (GoF: attach(Observer) on Subject)
   *
   * @param {string}   event    - The event name to listen for
   * @param {Function} listener - The observer callback function
   */
  subscribe(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('[EventBus] Observer must be a function.');
    }
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(listener);
    console.log(`[EventBus] Observer attached → event: "${event}" (total: ${this._listeners[event].length})`);
  }

  /**
   * Unsubscribe an observer from an event.
   * (GoF: detach(Observer) on Subject)
   *
   * @param {string}   event    - The event name
   * @param {Function} listener - The observer to remove
   */
  unsubscribe(event, listener) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(l => l !== listener);
    console.log(`[EventBus] Observer detached → event: "${event}"`);
  }

  /**
   * Publish an event — notifies ALL subscribed observers.
   * (GoF: notify() on Subject → calls update() on each Observer)
   *
   * @param {string} event - The event name to broadcast
   * @param {*}      data  - Payload delivered to each observer
   */
  publish(event, data) {
    const observers = this._listeners[event] || [];
    console.log(`[EventBus] Publishing "${event}" → ${observers.length} observer(s) notified`);
    observers.forEach(listener => {
      try {
        listener(data);          // GoF: observer.update(data)
      } catch (err) {
        console.error(`[EventBus] Observer threw an error on "${event}": ${err.message}`);
      }
    });
  }

  /**
   * Return the list of event names that have at least one observer.
   * @returns {string[]}
   */
  activeEvents() {
    return Object.keys(this._listeners).filter(e => this._listeners[e].length > 0);
  }
}

module.exports = EventBus;
