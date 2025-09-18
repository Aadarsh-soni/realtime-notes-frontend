// WebSocket-based collaboration client

import { API_BASE_WS } from './api';

export interface Operation {
  userId: number;
  userName: string;
  noteId: number;
  position: number;
  deleteLen: number;
  insert: string;
}

export interface PresenceUser {
  userId: number;
  userName: string;
  userEmail?: string;
  lastSeen?: number;
}

interface CollaborationCallbacks {
  onOperation: (operation: Operation) => void;
  onPresenceUpdate: (users: PresenceUser[]) => void;
  onError: (error: Error) => void;
}

export class RealtimeCollaboration {
  private noteId: number;
  private token: string;
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private callbacks: CollaborationCallbacks;
  private isJoined = false;

  constructor(noteId: number, token: string, callbacks: CollaborationCallbacks) {
    this.noteId = noteId;
    this.token = token;
    this.callbacks = callbacks;
  }

  connect(): void {
    try {
      const url = `${API_BASE_WS}/ws?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // request presence list and attempt join if preselected
        this.send({ type: 'presence.list' });
        if (this.noteId) {
          this.send({ type: 'room.join', noteId: this.noteId });
        }
      };

      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          this.handleMessage(msg);
        } catch (err) {
          this.callbacks.onError(new Error('invalid json'));
        }
      };

      this.ws.onclose = () => {
        this.isJoined = false;
        // exponential backoff capped
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // errors are handled via close/retry as well
      };
    } catch (err) {
      this.callbacks.onError(new Error('failed to connect'));
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = (setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1000) as unknown) as number;
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'presence.users':
        this.callbacks.onPresenceUpdate((msg.users || []) as PresenceUser[]);
        break;
      case 'invite.received':
        // surface as error for now until UI hook is added
        break;
      case 'room.snapshot':
        this.isJoined = true;
        // snapshot contains content; emit as a full replace op
        this.callbacks.onOperation({
          userId: 0,
          userName: 'server',
          noteId: msg.noteId,
          position: 0,
          deleteLen: Number.MAX_SAFE_INTEGER,
          insert: msg.content || ''
        });
        break;
      case 'op.applied':
        this.callbacks.onOperation({
          userId: msg.userId,
          userName: String(msg.userId),
          noteId: msg.noteId,
          position: msg.position,
          deleteLen: msg.deleteLen,
          insert: msg.insert,
        });
        break;
      case 'error':
        this.callbacks.onError(new Error(msg.message || 'error'));
        break;
      default:
        break;
    }
  }

  private send(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  listPresence() {
    this.send({ type: 'presence.list' });
  }

  joinRoom(noteId?: number) {
    if (noteId) this.noteId = noteId;
    this.send({ type: 'room.join', noteId: this.noteId });
  }

  sendOperation(position: number, deleteLen: number, insert: string) {
    if (!this.isJoined) return;
    this.send({ type: 'op.apply', noteId: this.noteId, position, deleteLen, insert });
  }

  sendInvite(toUserId: number) {
    this.send({ type: 'invite.send', noteId: this.noteId, toUserId });
  }

  acceptInvite(noteId: number) {
    this.send({ type: 'invite.accept', noteId });
  }

  close() {
    this.isJoined = false;
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
  }
}
