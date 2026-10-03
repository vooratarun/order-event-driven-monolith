import WebSocket from "ws";

export class WebSocketManager {
  private connections = new Map<string, Set<WebSocket>>();

  add(userId: string, ws: WebSocket) {
    let set = this.connections.get(userId);

    if (!set) {
      set = new Set();
      this.connections.set(userId, set);
    }

    set.add(ws);
  }

  remove(userId: string, ws: WebSocket) {
    const set = this.connections.get(userId);
    if (!set) return;

    set.delete(ws);

    if (set.size === 0) {
      this.connections.delete(userId);
    }
  }

  sendToUser(userId: string, payload: unknown) {
    const set = this.connections.get(userId);
    if (!set) return;

    const message = JSON.stringify(payload);

    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}
