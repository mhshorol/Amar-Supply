import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Search, 
  Loader2,
  Calendar,
  User,
  Flag,
  ChevronRight,
  Filter,
  X,
  LayoutGrid,
  List,
  Hourglass,
  Settings,
  Circle,
  Activity,
  CheckCircle
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { db, auth, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, where, getDocs } from '../firebase';
import { Task, User as TeamMember } from '../types';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import ConfirmModal from './ConfirmModal';
import { createNotification } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';

export default function Tasks() {
  const { role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'todo' as 'todo' | 'in_progress' | 'completed' | 'on_hold',
    dueDate: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    // Subscribe to tasks
    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'tasks');
      }
      setLoading(false);
    });

    // Subscribe to team members
    const unsubMembers = onSnapshot(query(collection(db, 'users'), where('active', '==', true)), (snapshot) => {
      setTeamMembers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as any as TeamMember)));
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    });

    return () => {
      unsubTasks();
      unsubMembers();
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      assignedTo: '',
      priority: 'medium',
      status: 'todo',
      dueDate: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate.seconds * 1000).toISOString().split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const assignedUser = teamMembers.find(m => m.uid === taskForm.assignedTo);
      
      const taskData = {
        ...taskForm,
        assignedToName: assignedUser?.name || 'Unassigned',
        assignedBy: auth.currentUser.uid,
        assignedByName: auth.currentUser.displayName || 'Unknown',
        dueDate: taskForm.dueDate ? Timestamp.fromDate(new Date(taskForm.dueDate)) : null,
        updatedAt: serverTimestamp()
      };

      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
        toast.success('Task updated successfully.');
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          createdAt: serverTimestamp()
        });

        if (taskForm.assignedTo) {
          await createNotification({
            title: 'New Task Assigned',
            message: `You have been assigned a new task: ${taskForm.title}`,
            type: 'task',
            link: '/tasks',
            recipientIds: [taskForm.assignedTo]
          });
        }

        toast.success('Task created successfully.');
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task.');
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await createNotification({
          title: 'Task Status Updated',
          message: `The task "${task.title}" is now ${newStatus.replace('_', ' ')}`,
          type: 'task',
          link: '/tasks',
          forRole: 'admin', // Notify admins
          recipientIds: task.assignedBy !== auth.currentUser?.uid ? [task.assignedBy] : [] // Notify creator if not the one updating
        });
      }

      toast.success(`Task status updated to ${newStatus.replace('_', ' ')}.`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update task status.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'tasks', taskId));
          toast.success('Task deleted successfully.');
        } catch (error) {
          console.error('Error deleting task:', error);
          toast.error('Failed to delete task.');
        }
      }
    });
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || task.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Task['status'];
    
    try {
      await updateDoc(doc(db, 'tasks', draggableId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const PriorityBadge = ({ priority }: { priority: string }) => {
    const colors = {
      low: 'bg-brand/10 text-brand',
      medium: 'bg-orange-50 text-orange-600',
      high: 'bg-red-50 text-red-600'
    };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${colors[priority as keyof typeof colors]}`}>
        {priority}
      </span>
    );
  };

  const TaskCard = ({ task, index }: any) => {
    const initials = task.title.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    const assignedMember = teamMembers.find(m => m.uid === task.assignedTo);
    
    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`bg-surface p-5 rounded-xl border border-border shadow-subtle hover:shadow-premium transition-all group ${
              snapshot.isDragging ? 'shadow-2xl ring-2 ring-brand/10 rotate-1' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                  task.status === 'completed' ? 'bg-purple-50 text-purple-600' :
                  task.status === 'in_progress' ? 'bg-green-50 text-green-600' :
                  task.status === 'on_hold' ? 'bg-orange-50 text-orange-600' :
                  'bg-brand/10 text-brand'
                }`}>
                  {initials}
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-primary leading-tight group-hover:text-brand transition-colors">{task.title}</h4>
                </div>
              </div>
              <div className="flex items-center">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(task);
                  }} 
                  className="p-1 text-muted hover:text-secondary transition-colors"
                  title="Edit Task"
                >
                  <MoreVertical size={16} />
                </button>
                {role === 'admin' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id);
                    }}
                    className="p-1 ml-1 text-muted hover:text-red-500 transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            
            <p className="text-[11px] text-secondary leading-relaxed line-clamp-2 mb-4 h-8">{task.description || 'No description provided.'}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <Calendar size={13} strokeWidth={2.5} />
                <span>{task.dueDate?.toDate ? task.dueDate.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No date'}</span>
              </div>
              <div className="flex items-center gap-2">
                {task.status === 'completed' && <CheckCircle size={14} className="text-green-500" fill="currentColor" />}
                <div className="relative group/avatar">
                  {assignedMember?.photoURL ? (
                    <img src={assignedMember.photoURL} alt={assignedMember.name} className="w-6 h-6 rounded-full border border-white shadow-subtle object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-surface-hover border border-border text-secondary flex items-center justify-center text-[9px] font-bold uppercase">
                      {task.assignedToName?.[0] || 'U'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-[28px] font-bold text-primary tracking-tight">Task Management</h2>
          <p className="text-[13px] text-secondary mt-1">Assign and track tasks across your team members.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] font-semibold hover:bg-surface-hover transition-all shadow-subtle"
          >
            {viewMode === 'list' ? <LayoutGrid size={16} /> : <List size={16} />}
            <span>{viewMode === 'list' ? 'Kanban View' : 'List View'}</span>
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg text-[13px] font-bold hover:bg-brand-hover transition-all shadow-subtle"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-surface p-4 rounded-xl border border-border shadow-subtle">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input 
            type="text"
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-hover border border-transparent rounded-lg text-[13px] focus:bg-surface focus:border-border outline-none transition-all placeholder:text-muted"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'todo', 'in_progress', 'on_hold', 'completed'].map(status => {
            const count = tasks.filter(t => status === 'All' ? true : t.status === status).length;
            const label = status === 'All' ? 'All' : status.replace('_', ' ').split(' ').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
            
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold transition-all border ${
                  filterStatus === status 
                    ? 'bg-brand text-white border-brand shadow-subtle' 
                    : 'bg-surface text-secondary border-border hover:bg-surface-hover'
                }`}
              >
                {status !== 'All' && (
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    status === 'todo' ? 'bg-gray-400' :
                    status === 'in_progress' ? 'bg-brand' :
                    status === 'on_hold' ? 'bg-orange-500' : 'bg-[#1DAB61]'
                  }`} />
                )}
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                  filterStatus === status ? 'bg-surface/20 text-white' : 'bg-surface-hover text-secondary'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand" size={40} />
        </div>
      ) : viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(['todo', 'in_progress', 'on_hold', 'completed'] as const).map(status => {
              const statusTasks = filteredTasks.filter(t => t.status === status);
              const config = {
                todo: { label: 'To Do', icon: Circle, color: 'text-muted', bg: 'bg-surface-hover', sub: 'Tasks to be started' },
                in_progress: { label: 'In Progress', icon: Settings, color: 'text-brand', bg: 'bg-brand/10', sub: 'Tasks currently being worked on' },
                on_hold: { label: 'On Hold', icon: Hourglass, color: 'text-orange-500', bg: 'bg-orange-50', sub: 'Tasks on hold temporarily' },
                completed: { label: 'Completed', icon: CheckCircle2, color: 'text-[#1DAB61]', bg: 'bg-green-50', sub: 'Successfully completed tasks' }
              }[status];
              const Icon = config.icon;

              return (
                <div key={status} className="bg-surface-hover/50 rounded-2xl p-4 border border-border/50 flex flex-col">
                  <div className="mb-6 px-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center ${config.color}`}>
                          <Icon size={18} />
                        </div>
                        <h3 className="text-sm font-bold text-primary">{config.label}</h3>
                        <span className="bg-surface/80 px-2 py-0.5 rounded-full text-[10px] font-bold border border-border text-secondary">
                          {statusTasks.length}
                        </span>
                      </div>
                      <MoreVertical size={16} className="text-muted" />
                    </div>
                    <p className="text-[11px] text-muted font-medium ml-11">{config.sub}</p>
                  </div>

                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-4 min-h-[300px] transition-colors rounded-xl ${
                          snapshot.isDraggingOver ? 'bg-brand/10/20' : ''
                        }`}
                      >
                        {status !== 'completed' && (
                          <button 
                            onClick={handleOpenAddModal}
                            className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-border rounded-xl text-[11px] font-bold text-brand hover:bg-surface hover:border-brand/30 transition-all mb-4"
                          >
                            <Plus size={14} />
                            Add Task
                          </button>
                        )}

                        {statusTasks.map((task, index) => (
                          <TaskCard key={task.id} task={task} index={index} />
                        ))}
                        {provided.placeholder}

                        {status === 'completed' ? (
                          <button className="w-full text-center py-3 text-[11px] font-bold text-brand hover:underline mt-2">
                            View All Completed ({statusTasks.length})
                          </button>
                        ) : (
                          status !== 'todo' && (
                            <button 
                              onClick={handleOpenAddModal}
                              className="w-full py-2.5 flex items-center justify-center gap-2 text-[11px] font-bold text-brand hover:bg-surface/50 rounded-xl transition-all mt-4"
                            >
                              <Plus size={14} />
                              Add Task
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-surface-hover/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest leading-tight">Task</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest leading-tight">Assigned To</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest leading-tight">Priority</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest leading-tight">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest leading-tight">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest leading-tight text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.map(task => (
                <tr key={task.id} className="hover:bg-surface-hover/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-primary">{task.title}</span>
                      <span className="text-[11px] text-secondary line-clamp-1 truncate mt-0.5 max-w-[250px]">{task.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-bold border border-brand/20 shadow-subtle">
                        {task.assignedToName?.[0] || 'U'}
                      </div>
                      <span className="text-[12px] font-bold text-secondary">{task.assignedToName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit ${
                      task.status === 'todo' ? 'bg-surface-hover text-secondary' :
                      task.status === 'in_progress' ? 'bg-brand/10 text-brand' :
                      task.status === 'on_hold' ? 'bg-orange-50 text-orange-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        task.status === 'todo' ? 'bg-gray-400' :
                        task.status === 'in_progress' ? 'bg-brand' :
                        task.status === 'on_hold' ? 'bg-orange-500' : 'bg-[#1DAB61]'
                      }`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{task.status.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[12px] font-medium text-secondary">
                      {task.dueDate?.toDate ? task.dueDate.toDate().toLocaleDateString() : (task.dueDate?.seconds ? new Date(task.dueDate.seconds * 1000).toLocaleDateString() : 'No date')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEditModal(task)} className="p-2 hover:bg-surface-hover rounded-lg text-muted hover:text-brand transition-colors">
                        <Edit size={14} />
                      </button>
                      {role === 'admin' && (
                        <button onClick={() => handleDeleteTask(task.id)} className="p-2 hover:bg-red-50 rounded-lg text-muted hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {[
          { label: 'Total Tasks', value: tasks.length, sub: 'All assigned tasks', color: 'text-brand', bg: 'bg-brand/10', icon: List, percent: null },
          { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, sub: 'of total', color: 'text-brand', bg: 'bg-brand/10', icon: Activity, percent: tasks.length ? Math.round((tasks.filter(t => t.status === 'in_progress').length / tasks.length) * 100) : 0 },
          { label: 'On Hold', value: tasks.filter(t => t.status === 'on_hold').length, sub: 'of total', color: 'text-orange-500', bg: 'bg-orange-50', icon: Hourglass, percent: tasks.length ? Math.round((tasks.filter(t => t.status === 'on_hold').length / tasks.length) * 100) : 0 },
          { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, sub: 'of total', color: 'text-[#1DAB61]', bg: 'bg-green-50', icon: CheckCircle, percent: tasks.length ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0 }
        ].map((stat, i) => (
          <div key={i} className="bg-surface rounded-xl border border-border p-5 shadow-subtle hover:shadow-premium transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-subtle`}>
                <stat.icon size={22} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-secondary tracking-wide">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl font-black text-primary leading-none mt-1">{stat.value}</h4>
                  {stat.percent !== null && (
                    <span className="text-[11px] font-bold text-muted">{stat.percent}% {stat.sub}</span>
                  )}
                  {stat.percent === null && (
                    <span className="text-[11px] font-bold text-muted">{stat.sub}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-hover/50">
              <h3 className="text-lg font-bold text-primary">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Task Title</label>
                <input 
                  type="text" 
                  required
                  value={taskForm.title} 
                  onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                  className="w-full px-4 py-2.5 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all" 
                  placeholder="What needs to be done?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Description</label>
                <textarea 
                  value={taskForm.description} 
                  onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all min-h-[100px]" 
                  placeholder="Provide more details about the task..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-wider">Assign To</label>
                  <select 
                    required
                    value={taskForm.assignedTo} 
                    onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})}
                    className="w-full px-4 py-2.5 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all"
                  >
                    <option value="">Select Member</option>
                    {teamMembers.map(member => (
                      <option key={member.uid} value={member.uid}>{member.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-wider">Due Date</label>
                  <input 
                    type="date" 
                    value={taskForm.dueDate} 
                    onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})}
                    className="w-full px-4 py-2.5 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-wider">Priority</label>
                  <select 
                    value={taskForm.priority} 
                    onChange={e => setTaskForm({...taskForm, priority: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-wider">Status</label>
                  <select 
                    value={taskForm.status} 
                    onChange={e => setTaskForm({...taskForm, status: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-6 bg-surface-hover text-secondary rounded-2xl font-bold hover:bg-surface-hover transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
