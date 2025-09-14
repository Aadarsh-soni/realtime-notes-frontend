// Real-time Collaboration Service

export interface Operation {
  userId: number;
  userName: string;
  noteId: number;
  baseVersion: number;
  position: number;
  deleteLen: number;
  insert: string;
  timestamp: number;
  version?: number;
}

export interface PresenceUser {
  userId: number;
  userName: string;
  userEmail?: string;
  lastSeen: number;
}

interface CollaborationCallbacks {
  onOperation: (operation: Operation) => void;
  onPresenceUpdate: (users: PresenceUser[]) => void;
  onError: (error: Error) => void;
}

export class RealtimeCollaboration {
  private noteId: number;
  private userId: number;
  private userName: string;
  private authToken: string;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastOperationTime: number = 0;
  private onOperation: (operation: Operation) => void;
  private onPresenceUpdate: (users: PresenceUser[]) => void;
  private onError: (error: Error) => void;

  constructor(
    noteId: number,
    userId: number,
    userName: string,
    authToken: string,
    callbacks: CollaborationCallbacks
  ) {
    this.noteId = noteId;
    this.userId = userId;
    this.userName = userName;
    this.authToken = authToken;
    this.onOperation = callbacks.onOperation;
    this.onPresenceUpdate = callbacks.onPresenceUpdate;
    this.onError = callbacks.onError;
  }

  // Join collaboration
  async join(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch('https://realtime-notes-backend.vercel.app/realtime/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          noteId: this.noteId,
          userName: this.userName
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.startPolling();
      }
      
      return data;
    } catch {
      this.onError(new Error('Failed to join collaboration'));
      return { success: false, message: 'Network error' };
    }
  }

  // Start polling for updates
  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        await Promise.all([
          this.pollForUpdates(),
          this.pollForPresence(),
          this.sendHeartbeat()
        ]);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000); // Poll every second
  }

  // Poll for new operations
  private async pollForUpdates(): Promise<void> {
    try {
      const response = await fetch(`https://realtime-notes-backend.vercel.app/realtime/operations/${this.noteId}?since=${this.lastOperationTime}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      
      // Process new operations
      data.operations?.forEach((operation: Operation) => {
        if (operation.userId !== this.userId) {
          this.onOperation(operation);
        }
        this.lastOperationTime = Math.max(this.lastOperationTime, operation.timestamp);
      });
    } catch (error) {
      console.error('Failed to poll for updates:', error);
    }
  }

  // Poll for presence updates
  private async pollForPresence(): Promise<void> {
    try {
      const response = await fetch(`https://realtime-notes-backend.vercel.app/realtime/users/${this.noteId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      this.onPresenceUpdate((data.users || []) as PresenceUser[]);
    } catch (error) {
      console.error('Failed to poll for presence:', error);
    }
  }

  // Send text operation
  async sendOperation(baseVersion: number, position: number, deleteLen: number, insert: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch('https://realtime-notes-backend.vercel.app/realtime/operation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          noteId: this.noteId,
          baseVersion,
          position,
          deleteLen,
          insert
        })
      });

      return await response.json();
    } catch {
      this.onError(new Error('Failed to send operation'));
      return { success: false, message: 'Network error' };
    }
  }

  // Send heartbeat to stay active
  private async sendHeartbeat(): Promise<void> {
    try {
      await fetch('https://realtime-notes-backend.vercel.app/realtime/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          noteId: this.noteId,
          userName: this.userName
        })
      });
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  // Leave collaboration
  async leave(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    try {
      await fetch('https://realtime-notes-backend.vercel.app/realtime/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          noteId: this.noteId,
          userName: this.userName
        })
      });
    } catch (error) {
      console.error('Failed to leave collaboration:', error);
    }
  }

  // Undo last operation
  async undo(): Promise<{ success: boolean; message?: string; content?: string }> {
    try {
      const response = await fetch(`https://realtime-notes-backend.vercel.app/realtime/undo/${this.noteId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          this.onError(new Error('Authentication failed - please log in again'));
          return { success: false, message: 'Authentication failed' };
        } else if (response.status === 404) {
          return { success: false, message: 'No operations to undo' };
        } else {
          this.onError(new Error(`Undo failed: ${errorData.error || response.statusText}`));
          return { success: false, message: errorData.error || `Server error: ${response.status}` };
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Undo network error:', error);
      this.onError(new Error('Network error - please check your connection'));
      return { success: false, message: 'Network error' };
    }
  }

  // Redo last undone operation
  async redo(): Promise<{ success: boolean; message?: string; content?: string }> {
    try {
      const response = await fetch(`https://realtime-notes-backend.vercel.app/realtime/redo/${this.noteId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          this.onError(new Error('Authentication failed - please log in again'));
          return { success: false, message: 'Authentication failed' };
        } else if (response.status === 404) {
          return { success: false, message: 'No operations to redo' };
        } else {
          this.onError(new Error(`Redo failed: ${errorData.error || response.statusText}`));
          return { success: false, message: errorData.error || `Server error: ${response.status}` };
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Redo network error:', error);
      this.onError(new Error('Network error - please check your connection'));
      return { success: false, message: 'Network error' };
    }
  }

  // Get current status
  getStatus(): { noteId: number; userId: number; userName: string; isActive: boolean } {
    return {
      noteId: this.noteId,
      userId: this.userId,
      userName: this.userName,
      isActive: this.pollingInterval !== null
    };
  }
}
