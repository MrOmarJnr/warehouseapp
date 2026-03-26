import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, PlusCircle, Trash2, Save, X, AlertCircle, Package, Wrench, Truck, FileText, Camera, MessageSquare, History } from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { User, WOPriority, WorkOrderItem } from '../types';
import { cn } from '../lib/utils';

export default function CreateWorkOrder({ user }: { user: User }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    serialNumber: '',
    priority: 'MEDIUM' as WOPriority,
    category: 'Electronics',
    pickupLocation: user.role.startsWith('AT') ? 'AT Warehouse A' : 'LEF LAB',
    labLocation: 'LEF LAB',
    returnLocation: user.role.startsWith('AT') ? 'AT Warehouse A' : 'LEF LAB',
    requesterCompanyId: user.companyId,
    serviceCompanyId: 'LEF_ORG_1', // Default LEF org
  });

  const atLocations = ['AT Warehouse A', 'AT Warehouse B', 'AT Warehouse C', 'AT Warehouse D'];
  const lefLocations = ['LEF LAB'];

  const [items, setItems] = useState<Partial<WorkOrderItem>[]>([
    { itemName: '', quantity: 1, unit: 'pcs', itemCondition: 'Used' }
  ]);

  const handleAddItem = () => {
    setItems([...items, { itemName: '', quantity: 1, unit: 'pcs', itemCondition: 'Used' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof WorkOrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      setError('Please provide a title for the work order.');
      return;
    }
    if (!formData.serialNumber) {
      setError('Please provide a serial number.');
      return;
    }
    if (items.some(item => !item.itemName)) {
      setError('All items must have a name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const id = await workOrderService.createWorkOrder(formData, items);
      if (id) {
        navigate(`/work-orders/${id}`);
      }
    } catch (err) {
      setError('Failed to create work order. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Work Order</h1>
          <p className="text-gray-500 mt-1">Submit a new repair request to LEF.</p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 animate-in shake duration-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Work Order Title</label>
              <input 
                type="text" 
                placeholder="e.g., Repair for Server Node #42"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Serial Number</label>
              <input 
                type="text" 
                placeholder="Enter device serial number"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
              <textarea 
                rows={4}
                placeholder="Describe the issue and requirements..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Priority</label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as WOPriority })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
                <option value="IT Hardware">IT Hardware</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Items to Repair</h2>
            </div>
            <button 
              type="button"
              onClick={handleAddItem}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <PlusCircle className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-gray-50 rounded-xl relative group">
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Item Name</label>
                  <input 
                    type="text" 
                    placeholder="Item name"
                    value={item.itemName}
                    onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Qty</label>
                  <input 
                    type="number" 
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Condition</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Damaged screen"
                    value={item.itemCondition}
                    onChange={(e) => handleItemChange(index, 'itemCondition', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="md:col-span-1 flex items-end justify-center">
                  <button 
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Logistics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pickup Location</label>
              <select 
                value={formData.pickupLocation}
                onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {user.role.startsWith('AT') || user.role === 'SUPER_ADMIN' ? (
                  atLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)
                ) : (
                  lefLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Repair Lab</label>
              <select 
                value={formData.labLocation}
                onChange={(e) => setFormData({ ...formData, labLocation: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {lefLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Return Location</label>
              <select 
                value={formData.returnLocation}
                onChange={(e) => setFormData({ ...formData, returnLocation: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {user.role.startsWith('AT') || user.role === 'SUPER_ADMIN' ? (
                  atLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)
                ) : (
                  lefLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            Create Work Order
          </button>
        </div>
      </form>
    </div>
  );
}
