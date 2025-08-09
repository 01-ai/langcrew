// eventBus.ts
class EventBus {
  private events: { [key: string]: Array<(data?: any) => void> } = {};

  on(event: string, callback: (data?: any) => void) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: (data?: any) => void) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((cb) => cb !== callback);
  }

  emit(event: string, data?: any) {
    if (!this.events[event]) return;
    this.events[event].forEach((callback) => callback(data));
  }
}

const eventBus = new EventBus();
export default eventBus;
