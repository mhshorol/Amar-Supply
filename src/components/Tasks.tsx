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
  List
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { db, auth, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, where, getDocs } from '../firebase';
import { Task, User as TeamMember } from '../types';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import ConfirmModal from './ConfirmModal';

export default function Tasks() {
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
      low: 'bg-blue-100 text-blue-700 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      high: 'bg-red-100 text-red-700 border-red-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors[priority as keyof typeof colors]}`}>
        {priority}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const configs = {
      todo: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock, label: 'To Do' },
      in_progress: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: AlertCircle, label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, label: 'Completed' },
      on_hold: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: X, label: 'On Hold' }
    };
    const config = configs[status as keyof typeof configs] || configs.todo;
    const Icon = config.icon;

    return (
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  const TaskCard = ({ task, index }: any) => (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div 
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group ${
            snapshot.isDragging ? 'shadow-2xl ring-2 ring-[#00AEEF]/20 rotate-2' : ''
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <PriorityBadge priority={task.priority} />
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenEditModal(task)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-[#00AEEF] transition-colors">
                <Edit size={14} />
              </button>
              <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">{task.title}</h4>
          <p className="text-xs text-gray-500 line-clamp-2 mb-4">{task.description}</p>
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#00AEEF] text-white flex items-center justify-center text-[10px] font-bold">
                {task.assignedToName?.[0] || 'U'}
              </div>
              <span className="text-[10px] font-bold text-gray-500">{task.assignedToName}</span>
            </div>
            {task.dueDate && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                <Calendar size={12} />
                {task.dueDate?.toDate ? task.dueDate.toDate().toLocaleDateString() : (task.dueDate?.seconds ? new Date(task.dueDate.seconds * 1000).toLocaleDateString() : 'No date')}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Task Management</h2>
          <p className="text-sm text-[#6b7280]">Assign and track tasks across your team members.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            {viewMode === 'list' ? <LayoutGrid size={18} /> : <List size={18} />}
            {viewMode === 'list' ? 'Kanban View' : 'List View'}
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-6 py-2 bg-[#141414] text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={18} />
            New Task
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text"
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['All', 'todo', 'in_progress', 'completed', 'on_hold'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                filterStatus === status 
                  ? 'bg-[#141414] text-white shadow-md' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#00AEEF]" size={40} />
        </div>
      ) : viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(['todo', 'in_progress', 'on_hold', 'completed'] as const).map(status => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      status === 'todo' ? 'bg-gray-300' :
                      status === 'in_progress' ? 'bg-blue-400' :
                      status === 'on_hold' ? 'bg-orange-400' : 'bg-green-400'
                    }`} />
                    {status.replace('_', ' ')}
                    <span className="ml-2 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">
                      {filteredTasks.filter(t => t.status === status).length}
                    </span>
                  </h3>
                </div>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-4 min-h-[500px] p-2 rounded-2xl border border-dashed transition-colors ${
                        snapshot.isDraggingOver ? 'bg-[#00AEEF]/5 border-[#00AEEF]/20' : 'bg-gray-50/50 border-gray-200'
                      }`}
                    >
                      {filteredTasks.filter(t => t.status === status).map((task, index) => (
                        <TaskCard key={task.id} task={task} index={index} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Task</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{task.title}</span>
                      <span className="text-xs text-gray-500 line-clamp-1">{task.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#00AEEF] text-white flex items-center justify-center text-[10px] font-bold">
                        {task.assignedToName?.[0] || 'U'}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{task.assignedToName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">
                      {task.dueDate?.toDate ? task.dueDate.toDate().toLocaleDateString() : (task.dueDate?.seconds ? new Date(task.dueDate.seconds * 1000).toLocaleDateString() : 'No date')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEditModal(task)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#00AEEF] transition-colors">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDeleteTask(task.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task Title</label>
                <input 
                  type="text" 
                  required
                  value={taskForm.title} 
                  onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all" 
                  placeholder="What needs to be done?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea 
                  value={taskForm.description} 
                  onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all min-h-[100px]" 
                  placeholder="Provide more details about the task..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assign To</label>
                  <select 
                    required
                    value={taskForm.assignedTo} 
                    onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                  >
                    <option value="">Select Member</option>
                    {teamMembers.map(member => (
                      <option key={member.uid} value={member.uid}>{member.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Due Date</label>
                  <input 
                    type="date" 
                    value={taskForm.dueDate} 
                    onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Priority</label>
                  <select 
                    value={taskForm.priority} 
                    onChange={e => setTaskForm({...taskForm, priority: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                  <select 
                    value={taskForm.status} 
                    onChange={e => setTaskForm({...taskForm, status: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
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
                  className="flex-1 py-3 px-6 bg-gray-50 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-6 bg-[#141414] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
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
