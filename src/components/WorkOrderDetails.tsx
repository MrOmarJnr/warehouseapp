import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Clock, CheckCircle2, AlertCircle, Package, Wrench, Truck, 
  FileText, Camera, MessageSquare, History, ChevronRight, ArrowLeft, 
  Send, Plus, MoreVertical, ShieldCheck, ShieldAlert, RotateCcw, XCircle, Check,
  Upload, Phone, User as UserIcon, Info
} from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { 
  WorkOrder, User, WOStatus, WorkOrderStatusHistory, 
  WorkOrderComment, WorkOrderAttachment, WorkOrderItem 
} from '../types';
import { cn, formatDate, getStatusColor, compressImage } from '../lib/utils';

export default function WorkOrderDetails({ user }: { user: User }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [items, setItems] = useState<WorkOrderItem[]>([]);
  const [history, setHistory] = useState<WorkOrderStatusHistory[]>([]);
  const [comments, setComments] = useState<WorkOrderComment[]>([]);
  const [attachments, setAttachments] = useState<WorkOrderAttachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states for mandatory info
  const [activeModal, setActiveModal] = useState<WOStatus | null>(null);
  const [modalData, setModalData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchWO = async () => {
      const data = await workOrderService.getWorkOrder(id);
      setWorkOrder(data);
      setLoading(false);
    };

    fetchWO();

    const unsubItems = workOrderService.subscribeToSubcollection<WorkOrderItem>(id, 'items', setItems);
    const unsubHistory = workOrderService.subscribeToSubcollection<WorkOrderStatusHistory>(id, 'history', setHistory);
    const unsubComments = workOrderService.subscribeToSubcollection<WorkOrderComment>(id, 'comments', setComments);
    const unsubAttachments = workOrderService.subscribeToSubcollection<WorkOrderAttachment>(id, 'attachments', setAttachments);

    return () => {
      unsubItems();
      unsubHistory();
      unsubComments();
      unsubAttachments();
    };
  }, [id]);

  const handleStatusChange = async (newStatus: WOStatus, additionalData?: any) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await workOrderService.updateStatus(id, newStatus, additionalData?.note || `Status changed to ${newStatus}`, additionalData);
      const updated = await workOrderService.getWorkOrder(id);
      setWorkOrder(updated);
      setActiveModal(null);
      setModalData({});
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;
    try {
      await workOrderService.addComment(id, {
        commentText: newComment,
        commentType: 'GENERAL',
        isInternal: false
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type?: WorkOrderAttachment['attachmentType']) => {
    if (!id || !e.target.files?.[0]) return;
    const files = Array.from(e.target.files);
    
    for (const file of files as File[]) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        let base64 = event.target?.result as string;
        let finalSize = file.size;

        // Compress if it's an image and too large
        if (file.type.startsWith('image/')) {
          try {
            // Initial compression
            base64 = await compressImage(base64);
            // Calculate approximate base64 size (3/4 of string length)
            finalSize = Math.round(base64.length * 0.75);
            
            // If still too large, compress more
            if (finalSize > 800000) {
              base64 = await compressImage(base64, 600, 600, 0.5);
              finalSize = Math.round(base64.length * 0.75);
            }
          } catch (err) {
            console.error('Compression failed:', err);
          }
        }

        // Final check for Firestore 1MB limit
        if (finalSize > 1000000) {
          alert(`File ${file.name} is too large for this demo. Please upload a smaller file (under 1MB).`);
          return;
        }

        try {
          await workOrderService.addAttachment(id, {
            fileName: file.name,
            attachmentType: type || (file.type.startsWith('image/') ? 'PICKUP_PHOTO' : 'REPORT'),
            filePath: base64,
            fileSize: finalSize,
            uploadedBy: user.id
          });
        } catch (error) {
          console.error('Failed to upload file:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  if (!workOrder) return <div className="text-center py-20"><h2 className="text-2xl font-bold text-gray-900">Work order not found</h2></div>;

  const canUpdateStatus = (status: WOStatus) => {
    const role = user.role;
    const current = workOrder.currentStatus;

    if (role === 'SUPER_ADMIN') return true;

    // AT Rules
    if (role.startsWith('AT')) {
      if (current === 'DELIVERED' && (status === 'ACCEPTED' || status === 'REJECTED')) return true;
      if (current === 'REJECTED' && status === 'REWORK') return true;
      if (current === 'ACCEPTED' && status === 'CLOSED') return true;
      return false;
    }

    // LEF Rules
    if (role.startsWith('LEF')) {
      if (current === 'CREATED' && status === 'ASSIGNED') return true;
      if (current === 'ASSIGNED' && status === 'PICKED_UP') return true;
      if (current === 'PICKED_UP' && status === 'IN_REPAIR') return true;
      if (current === 'IN_REPAIR' && status === 'DIAGNOSED') return true;
      if (current === 'DIAGNOSED' && status === 'REPAIRED') return true;
      if (current === 'REPAIRED' && status === 'DISPATCHED') return true;
      if (current === 'DISPATCHED' && status === 'DELIVERED') return true;
      if (current === 'REWORK' && status === 'IN_REPAIR') return true;
      return false;
    }

    return false;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Process Tracker (Image 1) */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[800px] px-4">
          {[
            { status: 'CREATED', label: 'Created', icon: Plus },
            { status: 'ASSIGNED', label: 'Assigned', icon: UserIcon },
            { status: 'PICKED_UP', label: 'Pickup', icon: Package },
            { status: 'IN_REPAIR', label: 'Repair', icon: Wrench },
            { status: 'REPAIRED', label: 'Repaired', icon: CheckCircle2 },
            { status: 'DISPATCHED', label: 'Dispatch', icon: Truck },
            { status: 'DELIVERED', label: 'Delivered', icon: ShieldCheck },
            { status: 'CLOSED', label: 'Closed', icon: XCircle },
          ].map((step, idx, arr) => {
            const isCompleted = history.some(h => h.newStatus === step.status);
            const isCurrent = workOrder.currentStatus === step.status;
            
            return (
              <React.Fragment key={step.status}>
                <div className="flex flex-col items-center gap-3 relative group">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-4",
                    isCurrent ? "bg-indigo-600 text-white border-indigo-100 scale-110 shadow-lg shadow-indigo-100" :
                    isCompleted ? "bg-emerald-500 text-white border-emerald-50" :
                    "bg-gray-50 text-gray-300 border-transparent"
                  )}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest transition-colors",
                    isCurrent ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-gray-400"
                  )}>
                    {step.label}
                  </span>
                  {isCurrent && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full animate-ping"></div>
                  )}
                </div>
                {idx < arr.length - 1 && (
                  <div className={cn(
                    "flex-1 h-1 mx-4 rounded-full transition-colors duration-1000",
                    isCompleted ? "bg-emerald-500" : "bg-gray-100"
                  )}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/work-orders')}
            className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200 text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{workOrder.woNumber}</span>
              <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider", getStatusColor(workOrder.currentStatus))}>
                {workOrder.currentStatus.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">{workOrder.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Action Buttons based on status and role */}
          {workOrder.currentStatus === 'CREATED' && canUpdateStatus('ASSIGNED') && (
            <ActionButton onClick={() => handleStatusChange('ASSIGNED')} icon={CheckCircle2} label="Accept & Assign" color="bg-indigo-600" />
          )}
          {workOrder.currentStatus === 'ASSIGNED' && canUpdateStatus('PICKED_UP') && (
            <ActionButton onClick={() => setActiveModal('PICKED_UP')} icon={Package} label="Confirm Pickup" color="bg-yellow-600" />
          )}
          {workOrder.currentStatus === 'PICKED_UP' && canUpdateStatus('IN_REPAIR') && (
            <ActionButton onClick={() => handleStatusChange('IN_REPAIR')} icon={Wrench} label="Start Repair" color="bg-orange-600" />
          )}
          {workOrder.currentStatus === 'IN_REPAIR' && canUpdateStatus('DIAGNOSED') && (
            <ActionButton onClick={() => setActiveModal('DIAGNOSED')} icon={FileText} label="Log Diagnosis" color="bg-purple-600" />
          )}
          {workOrder.currentStatus === 'DIAGNOSED' && canUpdateStatus('REPAIRED') && (
            <ActionButton onClick={() => setActiveModal('REPAIRED')} icon={CheckCircle2} label="Complete Repair" color="bg-green-600" />
          )}
          {workOrder.currentStatus === 'REPAIRED' && canUpdateStatus('DISPATCHED') && (
            <ActionButton onClick={() => setActiveModal('DISPATCHED')} icon={Truck} label="Dispatch Item" color="bg-cyan-600" />
          )}
          {workOrder.currentStatus === 'DISPATCHED' && canUpdateStatus('DELIVERED') && (
            <ActionButton onClick={() => handleStatusChange('DELIVERED')} icon={CheckCircle2} label="Mark Delivered" color="bg-teal-600" />
          )}
          {workOrder.currentStatus === 'DELIVERED' && canUpdateStatus('ACCEPTED') && (
            <>
              <ActionButton onClick={() => setActiveModal('ACCEPTED')} icon={ShieldCheck} label="Accept Item" color="bg-emerald-600" />
              <ActionButton onClick={() => setActiveModal('REJECTED')} icon={ShieldAlert} label="Reject Item" color="bg-red-600" />
            </>
          )}
          {workOrder.currentStatus === 'REJECTED' && canUpdateStatus('REWORK') && (
            <ActionButton onClick={() => handleStatusChange('REWORK')} icon={RotateCcw} label="Request Rework" color="bg-rose-600" />
          )}
          {workOrder.currentStatus === 'REWORK' && canUpdateStatus('IN_REPAIR') && (
            <ActionButton onClick={() => handleStatusChange('IN_REPAIR')} icon={Wrench} label="Start Rework" color="bg-orange-600" />
          )}
          {workOrder.currentStatus === 'ACCEPTED' && canUpdateStatus('CLOSED') && (
            <ActionButton onClick={() => handleStatusChange('CLOSED')} icon={XCircle} label="Close Order" color="bg-gray-600" />
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Items & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description Card */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Work Order Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">{workOrder.description || 'No description provided.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Serial Number</label>
                    <p className="text-sm font-bold text-gray-900 mt-1">{workOrder.serialNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn("w-2 h-2 rounded-full", getPriorityColor(workOrder.priority))}></div>
                      <span className="text-sm font-bold text-gray-900">{workOrder.priority}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Pickup</span>
                    <span className="text-xs font-bold text-gray-900">{workOrder.pickupLocation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Lab</span>
                    <span className="text-xs font-bold text-gray-900">{workOrder.labLocation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Return</span>
                    <span className="text-xs font-bold text-gray-900">{workOrder.returnLocation}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Colored Info Blocks (Image 2) - Showing all updates from history */}
            <div className="space-y-6 pt-6 border-t border-gray-50">
              {/* First, show current data from workOrder if not in history yet */}
              {(!history.some(h => h.additionalData)) && (
                <>
                  {workOrder.diagnosisInfo && (
                    <div className="p-6 bg-purple-50 rounded-2xl animate-in slide-in-from-left duration-500">
                      <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Diagnosis Info</label>
                      <p className="text-sm text-purple-900 mt-2 font-medium">{workOrder.diagnosisInfo}</p>
                    </div>
                  )}
                  {workOrder.repairInfo && (
                    <div className="p-6 bg-green-50 rounded-2xl animate-in slide-in-from-left duration-500">
                      <label className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Repair Details</label>
                      <p className="text-sm text-green-900 mt-2 font-medium">{workOrder.repairInfo}</p>
                    </div>
                  )}
                  {workOrder.dispatchAgentName && (
                    <div className="p-6 bg-cyan-50 rounded-2xl animate-in slide-in-from-left duration-500">
                      <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Dispatch Details</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        <div>
                          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest opacity-70">Agent Name</p>
                          <p className="text-sm font-bold text-cyan-900">{workOrder.dispatchAgentName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest opacity-70">Agent Phone</p>
                          <p className="text-sm font-bold text-cyan-900">{workOrder.dispatchAgentPhone}</p>
                        </div>
                        {workOrder.dispatchDescription && (
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest opacity-70">Description</p>
                            <p className="text-sm text-cyan-900">{workOrder.dispatchDescription}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {workOrder.acceptanceRemarks && (
                    <div className="p-6 bg-emerald-50 rounded-2xl animate-in slide-in-from-left duration-500">
                      <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Acceptance Remarks</label>
                      <p className="text-sm text-emerald-900 mt-2 font-medium">{workOrder.acceptanceRemarks}</p>
                    </div>
                  )}
                  {workOrder.rejectionReason && (
                    <div className="p-6 bg-red-50 rounded-2xl animate-in slide-in-from-left duration-500">
                      <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Rejection Reason</label>
                      <p className="text-sm text-red-900 mt-2 font-medium">{workOrder.rejectionReason}</p>
                    </div>
                  )}
                </>
              )}

              {/* Then show all historical updates */}
              {history.filter(h => h.additionalData).map((h) => (
                <div key={h.id} className="space-y-4">
                  {h.additionalData?.diagnosisInfo && (
                    <div className="p-6 bg-purple-50 rounded-2xl animate-in slide-in-from-left duration-500">
                      <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Diagnosis Info</label>
                      <p className="text-sm text-purple-900 mt-2 font-medium">{h.additionalData.diagnosisInfo}</p>
                    </div>
                  )}
                  {h.additionalData?.repairInfo && (
                    <div className="p-6 bg-green-50 rounded-2xl animate-in slide-in-from-left duration-500">
                      <label className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Repair Details</label>
                      <p className="text-sm text-green-900 mt-2 font-medium">{h.additionalData.repairInfo}</p>
                    </div>
                  )}
                  {h.additionalData?.dispatchAgentName && (
                    <div className="p-6 bg-cyan-50 rounded-2xl animate-in slide-in-from-left duration-500">
                      <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Dispatch Details</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        <div>
                          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest opacity-70">Agent Name</p>
                          <p className="text-sm font-bold text-cyan-900">{h.additionalData.dispatchAgentName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest opacity-70">Agent Phone</p>
                          <p className="text-sm font-bold text-cyan-900">{h.additionalData.dispatchAgentPhone}</p>
                        </div>
                        {h.additionalData.dispatchDescription && (
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest opacity-70">Description</p>
                            <p className="text-sm text-cyan-900">{h.additionalData.dispatchDescription}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {h.additionalData?.acceptanceRemarks && (
                    <div className="p-6 bg-emerald-50 rounded-2xl animate-in slide-in-from-left duration-500">
                      <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Acceptance Remarks</label>
                      <p className="text-sm text-emerald-900 mt-2 font-medium">{h.additionalData.acceptanceRemarks}</p>
                    </div>
                  )}
                  {h.additionalData?.rejectionReason && (
                    <div className="p-6 bg-red-50 rounded-2xl animate-in slide-in-from-left duration-500">
                      <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Rejection Reason</label>
                      <p className="text-sm text-red-900 mt-2 font-medium">{h.additionalData.rejectionReason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Repair Photos Section (Before & After) */}
            {(attachments.some(a => a.attachmentType === 'PICKUP_PHOTO') || attachments.some(a => a.attachmentType === 'REPAIR_PHOTO')) && (
              <div className="pt-8 border-t border-gray-50 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <Camera className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Repair Photos</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Before Photos */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Before Repair (Warehouse Pickup)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {attachments.filter(a => a.attachmentType === 'PICKUP_PHOTO').map(att => (
                        <div 
                          key={att.id} 
                          onClick={() => setSelectedImage(att.filePath)}
                          className="aspect-video bg-gray-50 rounded-xl overflow-hidden border border-gray-100 cursor-pointer group"
                        >
                          <img src={att.filePath} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      ))}
                      {attachments.filter(a => a.attachmentType === 'PICKUP_PHOTO').length === 0 && (
                        <div className="col-span-2 py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <p className="text-xs text-gray-400 italic">No before photos uploaded.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Photos */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">After Repair (Completion)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {attachments.filter(a => a.attachmentType === 'REPAIR_PHOTO').map(att => (
                        <div 
                          key={att.id} 
                          onClick={() => setSelectedImage(att.filePath)}
                          className="aspect-video bg-gray-50 rounded-xl overflow-hidden border border-gray-100 cursor-pointer group"
                        >
                          <img src={att.filePath} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      ))}
                      {attachments.filter(a => a.attachmentType === 'REPAIR_PHOTO').length === 0 && (
                        <div className="col-span-2 py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <p className="text-xs text-gray-400 italic">No after photos uploaded.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items Card */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Items ({items.length})</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Name</th>
                    <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Qty</th>
                    <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => (
                    <tr key={item.id} className="group">
                      <td className="py-4 text-sm font-bold text-gray-900">{item.itemName}</td>
                      <td className="py-4 text-sm text-gray-500">{item.quantity} {item.unit}</td>
                      <td className="py-4 text-sm text-gray-500">{item.itemCondition}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400 text-sm italic">No items listed.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attachments Card (Moved to Bottom) */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Camera className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Attachments & Photos</h2>
              </div>
              <label className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-indigo-600 cursor-pointer">
                <Plus className="w-5 h-5" />
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {attachments.map((att) => (
                <div 
                  key={att.id} 
                  onClick={() => att.attachmentType.includes('PHOTO') || att.filePath.startsWith('data:image') ? setSelectedImage(att.filePath) : null}
                  className="group relative aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100 cursor-pointer"
                >
                  {att.filePath.startsWith('data:image') || att.attachmentType.includes('PHOTO') ? (
                    <img src={att.filePath} alt={att.fileName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                      <FileText className="w-8 h-8 text-indigo-200" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="p-2 bg-white rounded-lg text-gray-900 shadow-xl hover:bg-indigo-50">
                      <Camera className="w-4 h-4" />
                    </button>
                    <a 
                      href={att.filePath} 
                      download={att.fileName} 
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-white rounded-lg text-gray-900 shadow-xl hover:bg-indigo-50"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </a>
                  </div>
                </div>
              ))}
              {attachments.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                  <Camera className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No attachments uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Timeline Only */}
        <div className="space-y-8">
          {/* Timeline Card */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <History className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Timeline</h2>
            </div>
            <div className="space-y-8 relative">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-100"></div>
              {[...history].reverse().map((h, i) => (
                <div key={h.id} className="flex gap-4 relative">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm",
                    i === 0 ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"
                  )}>
                    {i === 0 ? <Check className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-current"></div>}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{h.newStatus.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{h.changeNote}</p>
                    <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-wider">{formatDate(h.changedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {activeModal === 'PICKED_UP' && 'Confirm Pickup'}
                {activeModal === 'DIAGNOSED' && 'Log Diagnosis'}
                {activeModal === 'REPAIRED' && 'Complete Repair'}
                {activeModal === 'DISPATCHED' && 'Dispatch Details'}
                {activeModal === 'ACCEPTED' && 'Accept Work Order'}
                {activeModal === 'REJECTED' && 'Reject Work Order'}
              </h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-50 rounded-xl transition-all">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {activeModal === 'PICKED_UP' && (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 rounded-2xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-700">Please upload pictures of the item at the warehouse before proceeding.</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer relative">
                    <Camera className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-sm font-bold text-gray-500">Click to upload photos</p>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'PICKUP_PHOTO')} multiple accept="image/*" />
                  </div>
                  {attachments.filter(a => a.attachmentType === 'PICKUP_PHOTO').length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.filter(a => a.attachmentType === 'PICKUP_PHOTO').map(att => (
                        <div key={att.id} className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                          <img src={att.filePath} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeModal === 'DIAGNOSED' && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Diagnosis Details</label>
                  <textarea 
                    required
                    value={modalData.diagnosisInfo || ''}
                    onChange={(e) => setModalData({ ...modalData, diagnosisInfo: e.target.value, note: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    rows={4}
                    placeholder="Enter technical diagnosis results..."
                  />
                </div>
              )}

              {activeModal === 'REPAIRED' && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-2xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">Upload photos of the repaired item and provide repair details.</p>
                  </div>
                  <textarea 
                    required
                    value={modalData.repairInfo || ''}
                    onChange={(e) => setModalData({ ...modalData, repairInfo: e.target.value, note: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    rows={3}
                    placeholder="Describe the repairs performed..."
                  />
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer relative">
                    <Camera className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-sm font-bold text-gray-500">Upload repair photos</p>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'REPAIR_PHOTO')} multiple accept="image/*" />
                  </div>
                  {attachments.filter(a => a.attachmentType === 'REPAIR_PHOTO').length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.filter(a => a.attachmentType === 'REPAIR_PHOTO').map(att => (
                        <div key={att.id} className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                          <img src={att.filePath} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeModal === 'DISPATCHED' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Agent Name</label>
                      <input 
                        type="text" required
                        value={modalData.dispatchAgentName || ''}
                        onChange={(e) => setModalData({ ...modalData, dispatchAgentName: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Driver name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Agent Phone</label>
                      <input 
                        type="tel" required
                        value={modalData.dispatchAgentPhone || ''}
                        onChange={(e) => setModalData({ ...modalData, dispatchAgentPhone: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="024 XXX XXXX"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Dispatch Description</label>
                    <textarea 
                      value={modalData.dispatchDescription || ''}
                      onChange={(e) => setModalData({ ...modalData, dispatchDescription: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                      rows={3}
                      placeholder="Vehicle details, route, etc."
                    />
                  </div>
                </div>
              )}

              {activeModal === 'ACCEPTED' && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Acceptance Remarks</label>
                  <textarea 
                    required
                    value={modalData.acceptanceRemarks || ''}
                    onChange={(e) => setModalData({ ...modalData, acceptanceRemarks: e.target.value, note: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    rows={4}
                    placeholder="Any final remarks on the received item..."
                  />
                </div>
              )}

              {activeModal === 'REJECTED' && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Rejection Reason</label>
                  <textarea 
                    required
                    value={modalData.rejectionReason || ''}
                    onChange={(e) => setModalData({ ...modalData, rejectionReason: e.target.value, note: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    rows={4}
                    placeholder="Why is this item being rejected?"
                  />
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer relative">
                    <Upload className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Upload supporting docs</p>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'REPORT')} multiple />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleStatusChange(activeModal, modalData)}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Confirm Action'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 z-[60] animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
            onClick={() => setSelectedImage(null)}
          >
            <XCircle className="w-8 h-8" />
          </button>
          <img 
            src={selectedImage} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function ActionButton({ onClick, icon: Icon, label, color }: { onClick: () => void, icon: any, label: string, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-indigo-100 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0",
        color
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'LOW': return 'bg-blue-400';
    case 'MEDIUM': return 'bg-yellow-400';
    case 'HIGH': return 'bg-orange-400';
    case 'URGENT': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}
