import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle2, AlertCircle, TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { WorkOrder, User } from '../types';
import { cn, formatDate, getStatusColor } from '../lib/utils';

export default function Dashboard({ user }: { user: User }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const unsubWOs = workOrderService.subscribeToWorkOrders(setWorkOrders);
    const unsubActivities = workOrderService.subscribeToActivities(setActivities);
    return () => {
      unsubWOs();
      unsubActivities();
    };
  }, []);

  const stats = [
    { label: 'Total Orders', value: workOrders.length, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'In Repair', value: workOrders.filter(wo => ['IN_REPAIR', 'DIAGNOSED'].includes(wo.currentStatus)).length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'Completed', value: workOrders.filter(wo => wo.currentStatus === 'CLOSED').length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Urgent', value: workOrders.filter(wo => wo.priority === 'URGENT').length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.firstName}</h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your work orders today.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            Export Report
          </button>
          {(user.role.startsWith('AT') || user.role === 'SUPER_ADMIN') && (
            <Link to="/work-orders/new" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              New Work Order
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
              <div className={cn("p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Work Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Work Orders</h2>
            <Link to="/work-orders" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {workOrders.slice(0, 5).map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">{wo.woNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-gray-900 truncate">{wo.title}</p>
                        <p className="text-xs text-gray-500 truncate">{wo.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", getStatusColor(wo.currentStatus))}>
                        {wo.currentStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(wo.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/work-orders/${wo.id}`} className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-indigo-600 inline-block">
                        <ArrowUpRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-6">
            {activities.length > 0 ? (
              activities.map((activity, i) => (
                <div key={i} className="flex gap-4 relative">
                  {i !== activities.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-100"></div>}
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 z-10">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-bold">{activity.userName}</span> {activity.changeNote} 
                      <Link to={`/work-orders/${activity.workOrderId}`} className="font-bold text-indigo-600 hover:underline"> {activity.woNumber}</Link>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(activity.changedAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
