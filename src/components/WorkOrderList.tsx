import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ChevronRight, MoreVertical, PlusCircle, ClipboardList, Clock, CheckCircle2, AlertCircle, Package, Wrench, Truck, FileText, Camera, MessageSquare, History } from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { WorkOrder, User, WOStatus, WOPriority } from '../types';
import { cn, formatDate, getStatusColor } from '../lib/utils';

export default function WorkOrderList({ user }: { user: User }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filter, setFilter] = useState<WOStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribe = workOrderService.subscribeToWorkOrders(setWorkOrders);
    return () => unsubscribe();
  }, []);

  const filteredOrders = workOrders.filter(wo => {
    const matchesFilter = filter === 'ALL' || wo.currentStatus === filter;
    const matchesSearch = wo.woNumber.toLowerCase().includes(search.toLowerCase()) || 
                          wo.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statuses: (WOStatus | 'ALL')[] = [
    'ALL', 'CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_REPAIR', 'DIAGNOSED', 'REPAIRED', 'DISPATCHED', 'DELIVERED', 'ACCEPTED', 'REJECTED', 'CLOSED', 'REWORK'
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-500 mt-1">Manage and track all repair requests.</p>
        </div>
        {(user.role.startsWith('AT') || user.role === 'SUPER_ADMIN') && (
          <Link to="/work-orders/new" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            New Work Order
          </Link>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by ID or title..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          {statuses.slice(0, 6).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border",
                filter === s 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100" 
                  : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
          <select 
            className="bg-gray-50 border-none rounded-lg text-xs font-bold px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value as WOStatus | 'ALL')}
          >
            <option value="ALL">More Statuses...</option>
            {statuses.slice(6).map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.map((wo) => (
          <Link 
            key={wo.id} 
            to={`/work-orders/${wo.id}`}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
          >
            <div className={cn("absolute top-0 left-0 w-1.5 h-full", getPriorityColor(wo.priority))}></div>
            
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{wo.woNumber}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-1 group-hover:text-indigo-600 transition-colors">{wo.title}</h3>
              </div>
              <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider", getStatusColor(wo.currentStatus))}>
                {wo.currentStatus.replace('_', ' ')}
              </span>
            </div>

            <p className="text-sm text-gray-500 line-clamp-2 mb-6 h-10">{wo.description || 'No description provided.'}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Created</p>
                  <p className="text-xs font-medium text-gray-700">{formatDate(wo.createdAt)}</p>
                </div>
              </div>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">AT</div>
                <div className="w-8 h-8 rounded-full border-2 border-white bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600">LEF</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-1 text-gray-400">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">3</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <Camera className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">2</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <History className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">5</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-20 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ClipboardList className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No work orders found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
}

function getPriorityColor(priority: WOPriority) {
  switch (priority) {
    case 'LOW': return 'bg-blue-400';
    case 'MEDIUM': return 'bg-yellow-400';
    case 'HIGH': return 'bg-orange-400';
    case 'URGENT': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}
