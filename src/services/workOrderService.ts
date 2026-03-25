import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  runTransaction,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  WorkOrder, 
  WOStatus, 
  WorkOrderStatusHistory, 
  WorkOrderComment, 
  WorkOrderAttachment,
  WorkOrderItem,
  DiagnosisReport,
  RepairReport,
  PartUsed,
  DispatchDetail,
  InspectionReview,
  Notification
} from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeData(data: any) {
  const sanitized: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  });
  return sanitized;
}

export const workOrderService = {
  async createWorkOrder(data: Partial<WorkOrder>, items: Partial<WorkOrderItem>[]) {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      
      // Get count for today to generate WO number
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      const q = query(
        collection(db, 'workOrders'), 
        where('createdAt', '>=', startOfDay),
        where('createdAt', '<=', endOfDay)
      );
      const snapshot = await getDocs(q);
      const count = snapshot.size + 1;
      const woNumber = `wo-${dateStr}-${count.toString().padStart(3, '0')}`;

      const woData = {
        ...sanitizeData(data),
        woNumber,
        currentStatus: 'CREATED' as WOStatus,
        createdBy: auth.currentUser?.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rejectionCount: 0,
        isReworkRequired: false,
      };

      const docRef = await addDoc(collection(db, 'workOrders'), woData);
      
      // Add items
      for (const item of items) {
        await addDoc(collection(db, `workOrders/${docRef.id}/items`), {
          ...item,
          workOrderId: docRef.id,
          createdAt: new Date().toISOString()
        });
      }

      // Add history
      const historyData = {
        workOrderId: docRef.id,
        woNumber,
        newStatus: 'CREATED',
        changedBy: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || 'System',
        changeNote: 'Work order created',
        changedAt: new Date().toISOString()
      };
      await addDoc(collection(db, `workOrders/${docRef.id}/history`), historyData);
      
      // Add to global activities for dashboard
      await addDoc(collection(db, 'activities'), historyData);

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workOrders');
    }
  },

  async updateStatus(woId: string, newStatus: WOStatus, note?: string, extraData?: Partial<WorkOrder>) {
    try {
      const woRef = doc(db, 'workOrders', woId);
      const woDoc = await getDoc(woRef);
      const previousStatus = woDoc.data()?.currentStatus;

      const updateData: any = {
        currentStatus: newStatus,
        updatedAt: new Date().toISOString(),
        ...sanitizeData(extraData || {})
      };

      await updateDoc(woRef, updateData);

      const historyData: any = {
        workOrderId: woId,
        woNumber: woDoc.data()?.woNumber,
        previousStatus,
        newStatus,
        changedBy: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || 'System',
        changeNote: note || `Status changed to ${newStatus}`,
        changedAt: new Date().toISOString(),
      };

      if (extraData) {
        const sanitizedExtraData = sanitizeData(extraData);
        if (Object.keys(sanitizedExtraData).length > 0) {
          historyData.additionalData = sanitizedExtraData;
        }
      }

      await addDoc(collection(db, `workOrders/${woId}/history`), historyData);
      
      // Add to global activities
      await addDoc(collection(db, 'activities'), historyData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workOrders/${woId}`);
    }
  },

  subscribeToWorkOrders(callback: (wos: WorkOrder[]) => void) {
    const q = query(collection(db, 'workOrders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const wos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkOrder));
      callback(wos);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workOrders');
    });
  },

  async getWorkOrder(id: string) {
    try {
      const docRef = doc(db, 'workOrders', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as WorkOrder;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `workOrders/${id}`);
    }
  },

  async addComment(woId: string, comment: Partial<WorkOrderComment>) {
    try {
      await addDoc(collection(db, `workOrders/${woId}/comments`), {
        ...sanitizeData(comment),
        workOrderId: woId,
        userId: auth.currentUser?.uid,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `workOrders/${woId}/comments`);
    }
  },

  async addAttachment(woId: string, attachment: Partial<WorkOrderAttachment>) {
    try {
      await addDoc(collection(db, `workOrders/${woId}/attachments`), {
        ...sanitizeData(attachment),
        workOrderId: woId,
        uploadedBy: auth.currentUser?.uid,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `workOrders/${woId}/attachments`);
    }
  },

  subscribeToSubcollection<T>(woId: string, sub: string, callback: (data: T[]) => void) {
    // Use appropriate ordering for different subcollections
    let q;
    if (sub === 'history') {
      q = query(collection(db, `workOrders/${woId}/${sub}`), orderBy('changedAt', 'asc'));
    } else if (sub === 'items') {
      q = query(collection(db, `workOrders/${woId}/${sub}`), orderBy('itemName', 'asc'));
    } else {
      q = query(collection(db, `workOrders/${woId}/${sub}`), orderBy('createdAt', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `workOrders/${woId}/${sub}`);
    });
  },

  subscribeToActivities(callback: (activities: any[]) => void) {
    const q = query(collection(db, 'activities'), orderBy('changedAt', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(activities);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activities');
    });
  }
};
