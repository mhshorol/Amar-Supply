import React, { useState, useEffect } from 'react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  Users, 
  UserPlus, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Download,
  ChevronRight,
  Filter,
  MoreVertical,
  Camera,
  X
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  orderBy, 
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Designation, 
  Employee, 
  Attendance, 
  SalaryAdvance, 
  SalaryRecord 
} from '../types';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import ConfirmModal from './ConfirmModal';

type HRTab = 'designations' | 'employees' | 'attendance' | 'salary';

const HR: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HRTab>('employees');
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);

  // Modals
  const [isDesignationModalOpen, setIsDesignationModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Forms
  const [designationForm, setDesignationForm] = useState({ name: '', description: '' });
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    designationId: '',
    joiningDate: format(new Date(), 'yyyy-MM-dd'),
    baseSalary: '',
    status: 'Active' as 'Active' | 'Inactive',
    profileImage: ''
  });
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Leave'>>({});
  const [advanceForm, setAdvanceForm] = useState({
    employeeId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  });
  const [salaryForm, setSalaryForm] = useState({
    employeeId: '',
    month: format(new Date(), 'yyyy-MM'),
    bonus: '0'
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    if (!user) return;
    const unsubDesignations = onSnapshot(query(collection(db, 'designations'), orderBy('createdAt', 'desc')), (snapshot) => {
      setDesignations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Designation)));
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'designations');
      }
    });

    const unsubEmployees = onSnapshot(query(collection(db, 'employees'), orderBy('createdAt', 'desc')), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'employees');
      }
    });

    const unsubAttendance = onSnapshot(query(collection(db, 'attendance'), orderBy('date', 'desc')), (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'attendance');
      }
    });

    const unsubAdvances = onSnapshot(query(collection(db, 'salaryAdvances'), orderBy('date', 'desc')), (snapshot) => {
      setSalaryAdvances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryAdvance)));
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'salaryAdvances');
      }
    });

    const unsubSalaries = onSnapshot(query(collection(db, 'salaryRecords'), orderBy('month', 'desc')), (snapshot) => {
      setSalaryRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryRecord)));
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'salaryRecords');
      }
    });

    return () => {
      unsubDesignations();
      unsubEmployees();
      unsubAttendance();
      unsubAdvances();
      unsubSalaries();
    };
  }, [user]);

  // Designation Actions
  const handleDesignationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'designations', editingId), designationForm);
        toast.success('Designation updated');
      } else {
        await addDoc(collection(db, 'designations'), {
          ...designationForm,
          uid: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
        toast.success('Designation added');
      }
      setIsDesignationModalOpen(false);
      setDesignationForm({ name: '', description: '' });
      setEditingId(null);
    } catch (error) {
      toast.error('Error saving designation');
    }
  };

  const deleteDesignation = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Designation',
      message: 'Are you sure you want to delete this designation? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'designations', id));
          toast.success('Designation deleted');
        } catch (error) {
          toast.error('Error deleting designation');
        }
      }
    });
  };

  // Employee Actions
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      const designation = designations.find(d => d.id === employeeForm.designationId);
      const data = {
        ...employeeForm,
        designationName: designation?.name || '',
        baseSalary: Number(employeeForm.baseSalary),
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'employees', editingId), data);
        toast.success('Employee updated');
      } else {
        await addDoc(collection(db, 'employees'), data);
        toast.success('Employee added');
      }
      setIsEmployeeModalOpen(false);
      setEmployeeForm({
        name: '', phone: '', email: '', address: '',
        designationId: '', joiningDate: format(new Date(), 'yyyy-MM-dd'),
        baseSalary: '', status: 'Active', profileImage: ''
      });
      setEditingId(null);
    } catch (error) {
      toast.error('Error saving employee');
    }
  };

  const deleteEmployee = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Employee',
      message: 'Are you sure you want to delete this employee? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'employees', id));
          toast.success('Employee deleted');
        } catch (error) {
          toast.error('Error deleting employee');
        }
      }
    });
  };

  // Attendance Actions
  const handleBulkAttendance = async () => {
    if (!auth.currentUser) return;
    try {
      const batch = writeBatch(db);
      for (const employee of employees) {
        const status = attendanceMarks[employee.id] || 'Present';
        const attendanceId = `${employee.id}_${attendanceDate}`;
        const ref = doc(db, 'attendance', attendanceId);
        batch.set(ref, {
          employeeId: employee.id,
          employeeName: employee.name,
          date: attendanceDate,
          status,
          uid: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
      await batch.commit();
      toast.success('Attendance marked for all employees');
      setIsAttendanceModalOpen(false);
    } catch (error) {
      toast.error('Error marking attendance');
    }
  };

  // Salary Advance Actions
  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      const employee = employees.find(emp => emp.id === advanceForm.employeeId);
      await addDoc(collection(db, 'salaryAdvances'), {
        ...advanceForm,
        employeeName: employee?.name || '',
        amount: Number(advanceForm.amount),
        status: 'Pending',
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      toast.success('Salary advance recorded');
      setIsAdvanceModalOpen(false);
      setAdvanceForm({ employeeId: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '' });
    } catch (error) {
      toast.error('Error saving advance');
    }
  };

  // Salary Generation
  const generateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      const employee = employees.find(emp => emp.id === salaryForm.employeeId);
      if (!employee) return;

      // Calculate deductions from attendance
      const monthStart = startOfMonth(new Date(salaryForm.month));
      const monthEnd = endOfMonth(new Date(salaryForm.month));
      
      const monthAttendance = attendance.filter(a => 
        a.employeeId === employee.id && 
        new Date(a.date) >= monthStart && 
        new Date(a.date) <= monthEnd
      );

      const absentCount = monthAttendance.filter(a => a.status === 'Absent').length;
      const lateCount = monthAttendance.filter(a => a.status === 'Late').length;
      
      // Simple deduction logic: 1 day salary for each absent, 0.25 day salary for each late
      const dailySalary = employee.baseSalary / 30;
      const deductions = (absentCount * dailySalary) + (lateCount * dailySalary * 0.25);

      // Calculate advance deductions
      const pendingAdvances = salaryAdvances.filter(adv => 
        adv.employeeId === employee.id && adv.status === 'Pending'
      );
      const totalAdvance = pendingAdvances.reduce((sum, adv) => sum + adv.amount, 0);

      const bonus = Number(salaryForm.bonus);
      const netSalary = employee.baseSalary - deductions - totalAdvance + bonus;

      await addDoc(collection(db, 'salaryRecords'), {
        employeeId: employee.id,
        employeeName: employee.name,
        month: salaryForm.month,
        baseSalary: employee.baseSalary,
        deductions: Math.round(deductions),
        advanceDeduction: totalAdvance,
        bonus,
        netSalary: Math.round(netSalary),
        status: 'Paid',
        paidAt: serverTimestamp(),
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      // Mark advances as deducted
      const batch = writeBatch(db);
      pendingAdvances.forEach(adv => {
        batch.update(doc(db, 'salaryAdvances', adv.id), { status: 'Deducted' });
      });
      await batch.commit();

      toast.success('Salary generated successfully');
      setIsSalaryModalOpen(false);
    } catch (error) {
      toast.error('Error generating salary');
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.designationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Human Resources</h1>
          <p className="text-sm text-secondary">Manage employees, attendance, and payroll</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'employees' && (
            <button 
              onClick={() => {
                setEditingId(null);
                setEmployeeForm({
                  name: '', phone: '', email: '', address: '',
                  designationId: '', joiningDate: format(new Date(), 'yyyy-MM-dd'),
                  baseSalary: '', status: 'Active', profileImage: ''
                });
                setIsEmployeeModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-black transition-all"
            >
              <UserPlus size={18} />
              Add Employee
            </button>
          )}
          {activeTab === 'designations' && (
            <button 
              onClick={() => {
                setEditingId(null);
                setDesignationForm({ name: '', description: '' });
                setIsDesignationModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-black transition-all"
            >
              <Plus size={18} />
              Add Designation
            </button>
          )}
          {activeTab === 'attendance' && (
            <button 
              onClick={() => {
                setAttendanceDate(format(new Date(), 'yyyy-MM-dd'));
                const marks: Record<string, any> = {};
                employees.forEach(emp => marks[emp.id] = 'Present');
                setAttendanceMarks(marks);
                setIsAttendanceModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-black transition-all"
            >
              <Clock size={18} />
              Mark Attendance
            </button>
          )}
          {activeTab === 'salary' && (
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAdvanceModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-border text-secondary rounded-lg text-sm font-bold hover:bg-surface-hover transition-all"
              >
                <DollarSign size={18} />
                Salary Advance
              </button>
              <button 
                onClick={() => setIsSalaryModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-black transition-all"
              >
                <FileText size={18} />
                Generate Salary
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-hover rounded-xl w-fit">
        {[
          { id: 'employees', label: 'Employees', icon: Users },
          { id: 'designations', label: 'Designations', icon: Briefcase },
          { id: 'attendance', label: 'Attendance', icon: Calendar },
          { id: 'salary', label: 'Payroll', icon: DollarSign },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as HRTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-surface text-primary shadow-subtle' 
                : 'text-secondary hover:text-secondary'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      {activeTab === 'employees' && (
        <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border shadow-subtle">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="Search employees by name or designation..."
              className="w-full pl-10 pr-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2 text-secondary hover:bg-surface-hover rounded-lg transition-all">
            <Filter size={20} />
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="bg-surface rounded-2xl border border-border shadow-subtle overflow-hidden">
        {activeTab === 'employees' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px] whitespace-nowrap">
              <thead>
                <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
                  <th className="px-6 py-4 font-semibold">Employee</th>
                  <th className="px-6 py-4 font-semibold">Designation</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Salary</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-surface-hover transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden border border-border">
                          {emp.profileImage ? (
                            <img src={emp.profileImage} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Users size={20} className="text-muted" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{emp.name}</p>
                          <p className="text-[10px] text-secondary">Joined: {emp.joiningDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-brand/10 text-brand rounded-md text-[10px] font-bold uppercase">
                        {emp.designationName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-secondary">{emp.phone}</p>
                      <p className="text-[10px] text-muted">{emp.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">৳{(emp.baseSalary || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        emp.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {emp.status === 'Active' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsProfileModalOpen(true);
                          }}
                          className="p-1.5 text-muted hover:text-brand hover:bg-brand/10 rounded-md"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingId(emp.id);
                            setEmployeeForm({
                              name: emp.name,
                              phone: emp.phone,
                              email: emp.email,
                              address: emp.address,
                              designationId: emp.designationId,
                              joiningDate: emp.joiningDate,
                              baseSalary: emp.baseSalary.toString(),
                              status: emp.status,
                              profileImage: emp.profileImage || ''
                            });
                            setIsEmployeeModalOpen(true);
                          }}
                          className="p-1.5 text-muted hover:text-green-600 hover:bg-green-50 rounded-md"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => deleteEmployee(emp.id)}
                          className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-md"
                        >
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

        {activeTab === 'designations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px] whitespace-nowrap">
              <thead>
                <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
                  <th className="px-6 py-4 font-semibold">Designation Name</th>
                  <th className="px-6 py-4 font-semibold">Description</th>
                  <th className="px-6 py-4 font-semibold">Employees</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {designations.map((des) => (
                  <tr key={des.id} className="hover:bg-surface-hover transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{des.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-secondary">{des.description || 'No description'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-surface-hover text-secondary rounded-md text-[10px] font-bold">
                        {employees.filter(e => e.designationId === des.id).length} Employees
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setEditingId(des.id);
                            setDesignationForm({ name: des.name, description: des.description || '' });
                            setIsDesignationModalOpen(true);
                          }}
                          className="p-1.5 text-muted hover:text-green-600 hover:bg-green-50 rounded-md"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => deleteDesignation(des.id)}
                          className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-md"
                        >
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

        {activeTab === 'attendance' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input 
                  type="date" 
                  className="px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                />
                <p className="text-sm font-medium text-secondary">
                  Showing attendance for <span className="text-primary font-bold">{format(new Date(attendanceDate), 'MMMM dd, yyyy')}</span>
                </p>
              </div>
            </div>
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left min-w-[800px] whitespace-nowrap">
                <thead>
                  <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
                    <th className="px-6 py-4 font-semibold">Employee</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => {
                    const record = attendance.find(a => a.employeeId === emp.id && a.date === attendanceDate);
                    return (
                      <tr key={emp.id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden">
                              {emp.profileImage ? (
                                <img src={emp.profileImage} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Users size={14} className="text-muted" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary">{emp.name}</p>
                              <p className="text-[10px] text-secondary">{emp.designationName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {record ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              record.status === 'Present' ? 'bg-green-50 text-green-600' :
                              record.status === 'Absent' ? 'bg-red-50 text-red-600' :
                              record.status === 'Late' ? 'bg-yellow-50 text-yellow-600' :
                              'bg-brand/10 text-brand'
                            }`}>
                              {record.status}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted italic">Not Marked</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-secondary">{record?.note || '-'}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'salary' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Recent Advances */}
              <div className="md:col-span-1 space-y-4">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Recent Advances</h4>
                <div className="space-y-3">
                  {salaryAdvances.slice(0, 5).map((adv) => (
                    <div key={adv.id} className="p-3 bg-surface-hover rounded-xl border border-border">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-bold text-primary">{adv.employeeName}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          adv.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {adv.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-secondary">{adv.date}</p>
                        <p className="text-sm font-bold text-red-600">৳{(adv.amount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Salary History */}
              <div className="md:col-span-2 space-y-4">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Salary History</h4>
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-left min-w-[800px] whitespace-nowrap">
                    <thead>
                      <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
                        <th className="px-4 py-3 font-semibold">Employee</th>
                        <th className="px-4 py-3 font-semibold">Month</th>
                        <th className="px-4 py-3 font-semibold">Net Salary</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {salaryRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-surface-hover transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-primary">{rec.employeeName}</td>
                          <td className="px-4 py-3 text-sm text-secondary">{rec.month}</td>
                          <td className="px-4 py-3 text-sm font-bold text-green-600">৳{(rec.netSalary || 0).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold uppercase">
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="p-1 text-muted hover:text-brand">
                              <Download size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Designation Modal */}
      {isDesignationModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">{editingId ? 'Edit' : 'Add'} Designation</h3>
              <button onClick={() => setIsDesignationModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDesignationSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Designation Name*</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                  placeholder="e.g. Sales Executive"
                  value={designationForm.name}
                  onChange={(e) => setDesignationForm({...designationForm, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Description</label>
                <textarea
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all resize-none h-24"
                  placeholder="Optional description..."
                  value={designationForm.description}
                  onChange={(e) => setDesignationForm({...designationForm, description: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDesignationModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors"
                >
                  {editingId ? 'Update' : 'Save'} Designation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">{editingId ? 'Edit' : 'Add'} Employee</h3>
              <button onClick={() => setIsEmployeeModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEmployeeSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Full Name*</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Phone*</label>
                  <input
                    required
                    type="tel"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Designation*</label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={employeeForm.designationId}
                    onChange={(e) => setEmployeeForm({...employeeForm, designationId: e.target.value})}
                  >
                    <option value="">Select Designation</option>
                    {designations.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Joining Date*</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={employeeForm.joiningDate}
                    onChange={(e) => setEmployeeForm({...employeeForm, joiningDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Base Salary*</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={employeeForm.baseSalary}
                    onChange={(e) => setEmployeeForm({...employeeForm, baseSalary: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Address</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={employeeForm.address}
                    onChange={(e) => setEmployeeForm({...employeeForm, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Status</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={employeeForm.status}
                    onChange={(e) => setEmployeeForm({...employeeForm, status: e.target.value as 'Active' | 'Inactive'})}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Profile Image URL</label>
                  <input
                    type="url"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="https://..."
                    value={employeeForm.profileImage}
                    onChange={(e) => setEmployeeForm({...employeeForm, profileImage: e.target.value})}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors"
                >
                  {editingId ? 'Update' : 'Save'} Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">Mark Daily Attendance</h3>
              <button onClick={() => setIsAttendanceModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between bg-surface-hover p-4 rounded-xl">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider">Attendance Date</p>
                  <input 
                    type="date" 
                    className="bg-transparent border-none text-sm font-bold outline-none"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const marks: Record<string, any> = {};
                      employees.forEach(emp => marks[emp.id] = 'Present');
                      setAttendanceMarks(marks);
                    }}
                    className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold uppercase"
                  >
                    All Present
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl hover:border-border transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden">
                        {emp.profileImage ? (
                          <img src={emp.profileImage} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Users size={14} className="text-muted" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{emp.name}</p>
                        <p className="text-[10px] text-secondary">{emp.designationName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {['Present', 'Absent', 'Late', 'Leave'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setAttendanceMarks({...attendanceMarks, [emp.id]: status as any})}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            attendanceMarks[emp.id] === status
                              ? status === 'Present' ? 'bg-green-600 text-white' :
                                status === 'Absent' ? 'bg-red-600 text-white' :
                                status === 'Late' ? 'bg-yellow-600 text-white' :
                                'bg-brand text-white'
                              : 'bg-surface-hover text-secondary hover:bg-surface-hover'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button
                type="button"
                onClick={() => setIsAttendanceModalOpen(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAttendance}
                className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors"
              >
                Save Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advance Modal */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">Salary Advance</h3>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdvanceSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Employee*</label>
                <select
                  required
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                  value={advanceForm.employeeId}
                  onChange={(e) => setAdvanceForm({...advanceForm, employeeId: e.target.value})}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Amount*</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm({...advanceForm, amount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Date*</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={advanceForm.date}
                    onChange={(e) => setAdvanceForm({...advanceForm, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Note</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                  placeholder="Reason for advance..."
                  value={advanceForm.note}
                  onChange={(e) => setAdvanceForm({...advanceForm, note: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors"
                >
                  Save Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Generation Modal */}
      {isSalaryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">Generate Salary</h3>
              <button onClick={() => setIsSalaryModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={generateSalary} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Employee*</label>
                <select
                  required
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                  value={salaryForm.employeeId}
                  onChange={(e) => setSalaryForm({...salaryForm, employeeId: e.target.value})}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Month*</label>
                  <input
                    required
                    type="month"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={salaryForm.month}
                    onChange={(e) => setSalaryForm({...salaryForm, month: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Bonus</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={salaryForm.bonus}
                    onChange={(e) => setSalaryForm({...salaryForm, bonus: e.target.value})}
                  />
                </div>
              </div>
              <div className="p-4 bg-brand/10 rounded-xl space-y-2">
                <p className="text-xs text-brand-hover font-medium">
                  * Deductions (Absent/Late) and Pending Advances will be automatically calculated and deducted from the net salary.
                </p>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSalaryModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors"
                >
                  Generate & Pay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile View Modal */}
      {isProfileModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="relative h-32 bg-slate-900 dark:bg-white text-white dark:text-black">
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-surface/10 hover:bg-surface/20 text-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-8 pb-8">
              <div className="relative -mt-12 mb-6 flex items-end gap-6">
                <div className="w-24 h-24 rounded-2xl bg-surface p-1 shadow-lg">
                  <div className="w-full h-full rounded-xl bg-surface-hover flex items-center justify-center overflow-hidden border border-border">
                    {selectedEmployee.profileImage ? (
                      <img src={selectedEmployee.profileImage} alt={selectedEmployee.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={40} className="text-muted" />
                    )}
                  </div>
                </div>
                <div className="pb-2">
                  <h3 className="text-2xl font-bold text-primary">{selectedEmployee.name}</h3>
                  <p className="text-secondary font-medium">{selectedEmployee.designationName}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-secondary">
                        <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-muted">
                          <Users size={16} />
                        </div>
                        {selectedEmployee.phone}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-secondary">
                        <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-muted">
                          <Users size={16} />
                        </div>
                        {selectedEmployee.email || 'No email provided'}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-secondary">
                        <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-muted">
                          <Users size={16} />
                        </div>
                        {selectedEmployee.address || 'No address provided'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Employment Details</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-surface-hover rounded-xl">
                        <span className="text-xs text-secondary">Base Salary</span>
                        <span className="text-sm font-bold text-primary">৳{(selectedEmployee.baseSalary || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-surface-hover rounded-xl">
                        <span className="text-xs text-secondary">Joining Date</span>
                        <span className="text-sm font-bold text-primary">{selectedEmployee.joiningDate}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-surface-hover rounded-xl">
                        <span className="text-xs text-secondary">Status</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedEmployee.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {selectedEmployee.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
};

export default HR;
