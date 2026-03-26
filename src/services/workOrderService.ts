import { 
  WorkOrder, 
  WorkOrderItem, 
  WorkOrderComment, 
  WorkOrderAttachment, 
  WorkOrderStatusHistory,
  WOStatus
} from '../types';

const API_BASE = '/api';

function sanitizeData(data: any) {
  const sanitized: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  });
  return sanitized;
}

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-user-id': localStorage.getItem('userId') || ''
});

export const workOrderService = {
  async createWorkOrder(data: Partial<WorkOrder>, items: Partial<WorkOrderItem>[]) {
    const response = await fetch(`${API_BASE}/work-orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...sanitizeData(data), items })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create work order');
    }
    const result = await response.json();
    return result.id;
  },

  async getWorkOrders() {
    const response = await fetch(`${API_BASE}/work-orders`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch work orders');
    return await response.json() as WorkOrder[];
  },

  async getWorkOrder(id: string) {
    const response = await fetch(`${API_BASE}/work-orders/${id}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Work order not found');
    return await response.json() as WorkOrder;
  },

  async updateStatus(woId: string, newStatus: WOStatus, note?: string, extraData?: Partial<WorkOrder>) {
    const wo = await this.getWorkOrder(woId);
    const previousStatus = wo.currentStatus;

    // Update work order
    const updateResponse = await fetch(`${API_BASE}/work-orders/${woId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        currentStatus: newStatus,
        ...sanitizeData(extraData || {})
      })
    });
    if (!updateResponse.ok) throw new Error('Failed to update work order status');

    // Add history
    const historyResponse = await fetch(`${API_BASE}/work-orders/${woId}/history`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        previousStatus,
        newStatus,
        changeNote: note || `Status changed to ${newStatus}`,
        additionalData: extraData
      })
    });
    if (!historyResponse.ok) throw new Error('Failed to add status history');
  },

  async getWorkOrderItems(woId: string) {
    const response = await fetch(`${API_BASE}/work-orders/${woId}/items`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch items');
    return await response.json() as WorkOrderItem[];
  },

  async getWorkOrderComments(woId: string) {
    const response = await fetch(`${API_BASE}/work-orders/${woId}/comments`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch comments');
    return await response.json() as WorkOrderComment[];
  },

  async addComment(woId: string, data: Partial<WorkOrderComment>) {
    const response = await fetch(`${API_BASE}/work-orders/${woId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sanitizeData(data))
    });
    if (!response.ok) throw new Error('Failed to add comment');
    const result = await response.json();
    return result.id;
  },

  async getWorkOrderAttachments(woId: string) {
    const response = await fetch(`${API_BASE}/work-orders/${woId}/attachments`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch attachments');
    return await response.json() as WorkOrderAttachment[];
  },

  async addAttachment(woId: string, data: Partial<WorkOrderAttachment>) {
    const response = await fetch(`${API_BASE}/work-orders/${woId}/attachments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sanitizeData(data))
    });
    if (!response.ok) throw new Error('Failed to add attachment');
    const result = await response.json();
    return result.id;
  },

  async getWorkOrderStatusHistory(woId: string) {
    const response = await fetch(`${API_BASE}/work-orders/${woId}/history`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch history');
    return await response.json() as WorkOrderStatusHistory[];
  },

  subscribeToWorkOrders(callback: (workOrders: WorkOrder[]) => void) {
    const interval = setInterval(async () => {
      try {
        const workOrders = await this.getWorkOrders();
        callback(workOrders);
      } catch (err) {
        console.error('WorkOrder subscription error:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  },

  subscribeToWorkOrder(id: string, callback: (workOrder: WorkOrder) => void) {
    const interval = setInterval(async () => {
      try {
        const workOrder = await this.getWorkOrder(id);
        callback(workOrder);
      } catch (err) {
        console.error('WorkOrder subscription error:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  },

  subscribeToComments(woId: string, callback: (comments: WorkOrderComment[]) => void) {
    const interval = setInterval(async () => {
      try {
        const comments = await this.getWorkOrderComments(woId);
        callback(comments);
      } catch (err) {
        console.error('Comments subscription error:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  },

  subscribeToAttachments(woId: string, callback: (attachments: WorkOrderAttachment[]) => void) {
    const interval = setInterval(async () => {
      try {
        const attachments = await this.getWorkOrderAttachments(woId);
        callback(attachments);
      } catch (err) {
        console.error('Attachments subscription error:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  },

  subscribeToHistory(woId: string, callback: (history: WorkOrderStatusHistory[]) => void) {
    const interval = setInterval(async () => {
      try {
        const history = await this.getWorkOrderStatusHistory(woId);
        callback(history);
      } catch (err) {
        console.error('History subscription error:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  },

  subscribeToSubcollection<T>(woId: string, subcollection: string, callback: (data: T[]) => void) {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/work-orders/${woId}/${subcollection}`, {
          headers: getHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          callback(data as T[]);
        }
      } catch (err) {
        console.error(`Subscription error for ${subcollection}:`, err);
      }
    }, 5000);
    return () => clearInterval(interval);
  },

  subscribeToActivities(callback: (activities: any[]) => void) {
    const interval = setInterval(async () => {
      try {
        // For activities, we can fetch the latest history entries across all work orders
        // For now, let's just fetch all work orders and use their status history if we had a global history endpoint
        // Let's assume we have a global history endpoint or just use work orders for now
        const response = await fetch(`${API_BASE}/work-orders`, {
          headers: getHeaders()
        });
        if (response.ok) {
          const wos = await response.json() as WorkOrder[];
          // This is a bit inefficient, but for a demo it's fine
          // In a real app, you'd have a /api/activities endpoint
          callback(wos.slice(0, 5).map(wo => ({
            id: wo.id,
            type: 'STATUS_CHANGE',
            title: wo.title,
            status: wo.currentStatus,
            timestamp: wo.updatedAt,
            userName: 'System'
          })));
        }
      } catch (err) {
        console.error('Activities subscription error:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }
};
