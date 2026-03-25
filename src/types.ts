export type CompanyType = 'AT' | 'LEF' | 'CLIENT' | 'VENDOR';
export type UserRole = 'SUPER_ADMIN' | 'AT_ADMIN' | 'AT_WAREHOUSE' | 'AT_INSPECTOR' | 'LEF_ADMIN' | 'LEF_LOGISTICS' | 'LEF_TECHNICIAN';
export type WOStatus = 'CREATED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_REPAIR' | 'DIAGNOSED' | 'REPAIRED' | 'DISPATCHED' | 'DELIVERED' | 'ACCEPTED' | 'REJECTED' | 'CLOSED' | 'REWORK';
export type WOPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Company {
  id: string;
  name: string;
  code: string;
  type: CompanyType;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  jobTitle?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  woNumber: string;
  createdBy: string;
  requesterCompanyId: string;
  serviceCompanyId: string;
  title: string;
  description?: string;
  priority: WOPriority;
  category?: string;
  currentStatus: WOStatus;
  serialNumber?: string;
  pickupLocation?: string;
  labLocation?: string;
  returnLocation?: string;
  assignedTo?: string;
  requestedPickupDate?: string;
  actualPickupDate?: string;
  dispatchDate?: string;
  deliveredDate?: string;
  closedAt?: string;
  rejectionCount: number;
  isReworkRequired: boolean;
  
  // New fields for workflow
  diagnosisInfo?: string;
  repairInfo?: string;
  dispatchAgentName?: string;
  dispatchAgentPhone?: string;
  dispatchDescription?: string;
  acceptanceRemarks?: string;
  rejectionReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderItem {
  id: string;
  workOrderId: string;
  itemName: string;
  itemCode?: string;
  serialNumber?: string;
  quantity: number;
  unit?: string;
  itemCondition?: string;
  itemDescription?: string;
}

export interface WorkOrderStatusHistory {
  id: string;
  workOrderId: string;
  previousStatus?: WOStatus;
  newStatus: WOStatus;
  changedBy: string;
  changeNote?: string;
  changedAt: string;
}

export interface WorkOrderComment {
  id: string;
  workOrderId: string;
  userId: string;
  commentType: 'GENERAL' | 'DIAGNOSIS' | 'REPAIR' | 'INSPECTION' | 'DISPATCH';
  commentText: string;
  isInternal: boolean;
  createdAt: string;
}

export interface WorkOrderAttachment {
  id: string;
  workOrderId: string;
  uploadedBy: string;
  attachmentType: 'PICKUP_PHOTO' | 'REPAIR_PHOTO' | 'REPORT' | 'DELIVERY_NOTE' | 'INVOICE';
  fileName: string;
  filePath: string;
  mimeType?: string;
  fileSize?: number;
  description?: string;
  createdAt: string;
}

export interface DiagnosisReport {
  id: string;
  workOrderId: string;
  diagnosedBy: string;
  issueSummary: string;
  rootCause?: string;
  findings?: string;
  recommendations?: string;
  estimatedCost?: number;
  diagnosisDate: string;
}

export interface RepairReport {
  id: string;
  workOrderId: string;
  repairedBy: string;
  repairSummary: string;
  actionsTaken?: string;
  testResults?: string;
  repairStatus: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  repairDate: string;
}

export interface PartUsed {
  id: string;
  workOrderId: string;
  partName: string;
  partNumber?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

export interface DispatchDetail {
  id: string;
  workOrderId: string;
  dispatchedBy: string;
  courierName?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  trackingReference?: string;
  dispatchNote?: string;
  dispatchedAt: string;
}

export interface InspectionReview {
  id: string;
  workOrderId: string;
  inspectedBy: string;
  inspectionResult: 'ACCEPTED' | 'REJECTED';
  inspectionNotes?: string;
  inspectedAt: string;
}

export interface Notification {
  id: string;
  workOrderId?: string;
  recipientUserId: string;
  channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP';
  title: string;
  message: string;
  isRead: boolean;
  sentAt: string;
  readAt?: string;
}
