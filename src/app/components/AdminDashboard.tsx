import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { motion } from 'motion/react';
import {
  UserPlus,
  BookPlus,
  Search,
  Trash2,
  QrCode as QrCodeIcon,
  LogOut,
  Calendar,
  Clock,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';
import ExcelJS from 'exceljs';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  // Form states
  const [teacherForm, setTeacherForm] = useState({
    nombre: '',
    matricula: '',
    password: '',
    descripcion: '',
  });

  const [classForm, setClassForm] = useState({
    nombre: '',
    horarioInicio: '',
    horarioFin: '',
    dia: '',
    salon: '',
    docenteMatricula: '',
    qrCode: '',
    alumnos: 0,
  });

  const [classroomForm, setClassroomForm] = useState({
    nombre: '',
    horaApertura: '',
    horaCierre: '',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'teacher' | 'class' | 'classroom'>('teacher');
  const [deleteType, setDeleteType] = useState<'teacher' | 'class' | 'classroom'>('teacher');
  const [deleteId, setDeleteId] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      navigate('/login');
      return;
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teachersRes, classesRes, classroomsRes, attendanceRes] = await Promise.all([
        api.getTeachers(),
        api.getClasses(),
        api.getClassrooms(),
        api.getAllAttendance(),
      ]);

      setTeachers(teachersRes.teachers || []);
      setClasses(classesRes.classes || []);
      setClassrooms(classroomsRes.classrooms || []);
      setAttendance(attendanceRes.attendance || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addTeacher(teacherForm);
      alert('Docente agregado correctamente');
      setTeacherForm({ nombre: '', matricula: '', password: '', descripcion: '' });
      setActiveModal(null);
      loadData();
    } catch (error) {
      console.error('Error adding teacher:', error);
      alert('Error al agregar docente');
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Generate QR code for the classroom
      const qrData = `classroom:${classForm.salon}`;
      const qrCodeUrl = await QRCode.toDataURL(qrData);
      
      await api.addClass({ ...classForm, qrCode: qrData });
      alert('Clase agregada correctamente');
      setClassForm({
        nombre: '',
        horarioInicio: '',
        horarioFin: '',
        dia: '',
        salon: '',
        docenteMatricula: '',
        qrCode: '',
        alumnos: 0,
      });
      setActiveModal(null);
      loadData();
    } catch (error) {
      console.error('Error adding class:', error);
      alert('Error al agregar clase');
    }
  };

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qrData = `classroom:${classroomForm.nombre}`;
      const qrCodeUrl = await QRCode.toDataURL(qrData);
      
      await api.addClassroom({ ...classroomForm, qrCode: qrData });
      
      // Download QR code
      const link = document.createElement('a');
      link.download = `QR_Salon_${classroomForm.nombre}.png`;
      link.href = qrCodeUrl;
      link.click();
      
      alert('Código QR generado y descargado correctamente');
      setClassroomForm({ nombre: '', horaApertura: '', horaCierre: '' });
      setActiveModal(null);
      loadData();
    } catch (error) {
      console.error('Error generating QR:', error);
      alert('Error al generar código QR');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) {
      alert('Por favor selecciona un elemento para eliminar');
      return;
    }

    try {
      switch (deleteType) {
        case 'teacher':
          await api.deleteTeacher(deleteId);
          break;
        case 'class':
          await api.deleteClass(deleteId);
          break;
        case 'classroom':
          await api.deleteClassroom(deleteId);
          break;
      }

      alert('Elemento eliminado correctamente');
      setDeleteId('');
      setActiveModal(null);
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error al eliminar');
    }
  };

  const handleExportData = async () => {
    let data: any[] = [];
    let sheetName = '';

    switch (filterType) {
      case 'teacher':
        data = teachers;
        sheetName = 'Docentes';
        break;
      case 'class':
        data = classes;
        sheetName = 'Clases';
        break;
      case 'classroom':
        data = classrooms;
        sheetName = 'Salones';
        break;
    }

    if (data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Try to export as XLSX using exceljs; fall back to CSV on error
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      const keys = Array.from(new Set(data.flatMap((d) => Object.keys(d))));
      worksheet.addRow(keys);

      for (const row of data) {
        const vals = keys.map((k) => {
          const v = row[k] ?? '';
          return typeof v === 'string' ? v : JSON.stringify(v);
        });
        worksheet.addRow(vals);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sheetName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Excel export failed, falling back to CSV:', e);
      const keys = Array.from(new Set(data.flatMap((d) => Object.keys(d))));
      const csvRows = [keys.join(',')];
      for (const row of data) {
        const vals = keys.map((k) => {
          const v = row[k] ?? '';
          const s = typeof v === 'string' ? v : JSON.stringify(v);
          return '"' + String(s).replace(/"/g, '""') + '"';
        });
        csvRows.push(vals.join(','));
      }
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sheetName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const getFilteredData = () => {
    switch (filterType) {
      case 'teacher':
        return teachers.filter(t =>
          t.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.matricula?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      case 'class':
        return classes.filter(c =>
          c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.salon?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      case 'classroom':
        return classrooms.filter(c =>
          c.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      default:
        return [];
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const filteredTeachers = teachers.filter(t =>
    t.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.matricula?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold">Administrador</h1>
              <p className="text-green-100 mt-1">Panel de Control</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{format(currentTime, 'HH:mm:ss')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Add Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveModal('addTeacher')}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <UserPlus className="w-8 h-8 mx-auto mb-2" />
            <span className="font-semibold text-lg">Agregar Docente</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveModal('addClass')}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <BookPlus className="w-8 h-8 mx-auto mb-2" />
            <span className="font-semibold text-lg">Agregar Clase</span>
          </motion.button>
        </div>

        {/* Query and Delete Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveModal('query')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <Search className="w-8 h-8 mx-auto mb-2" />
            <span className="font-semibold text-lg">Consultar Información</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveModal('delete')}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <Trash2 className="w-8 h-8 mx-auto mb-2" />
            <span className="font-semibold text-lg">Borrar Datos</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveModal('generateQR')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <QrCodeIcon className="w-8 h-8 mx-auto mb-2" />
            <span className="font-semibold text-lg">Generar QR</span>
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-gray-600 mb-2">Total Docentes</h3>
            <p className="text-4xl font-bold text-green-600">{teachers.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-gray-600 mb-2">Total Clases</h3>
            <p className="text-4xl font-bold text-blue-600">{classes.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-gray-600 mb-2">Total Salones</h3>
            <p className="text-4xl font-bold text-purple-600">{classrooms.length}</p>
          </div>
        </div>
      </div>

      {/* Add Teacher Modal */}
      {activeModal === 'addTeacher' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8"
          >
            <h2 className="text-2xl font-semibold mb-4">Agregar Nuevo Docente</h2>
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                <input
                  type="text"
                  value={teacherForm.nombre}
                  onChange={(e) => setTeacherForm({ ...teacherForm, nombre: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número de Nomina</label>
                <input
                  type="text"
                  value={teacherForm.matricula}
                  onChange={(e) => setTeacherForm({ ...teacherForm, matricula: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <input
                  type="password"
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (máx. 100 caracteres)
                </label>
                <textarea
                  value={teacherForm.descripcion}
                  onChange={(e) => setTeacherForm({ ...teacherForm, descripcion: e.target.value })}
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none resize-none"
                  rows={3}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{teacherForm.descripcion.length}/100</p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                >
                  Agregar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Class Modal */}
      {activeModal === 'addClass' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8"
          >
            <h2 className="text-2xl font-semibold mb-4">Agregar Nueva Clase</h2>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Clase</label>
                <input
                  type="text"
                  value={classForm.nombre}
                  onChange={(e) => setClassForm({ ...classForm, nombre: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hora de Inicio</label>
                <input
                  type="time"
                  value={classForm.horarioInicio}
                  onChange={(e) => setClassForm({ ...classForm, horarioInicio: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Día</label>
                <select
                  value={classForm.dia}
                  onChange={(e) => setClassForm({ ...classForm, dia: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  required
                >
                  <option value="">-- Selecciona --</option>
                  <option value="Lunes">Lunes</option>
                  <option value="Martes">Martes</option>
                  <option value="Miércoles">Miércoles</option>
                  <option value="Jueves">Jueves</option>
                  <option value="Viernes">Viernes</option>
                  <option value="Sábado">Sábado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Salón</label>
                <input
                  type="text"
                  value={classForm.salon}
                  onChange={(e) => setClassForm({ ...classForm, salon: e.target.value })}
                  placeholder="Ej: 3404"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Docente</label>
                <input
                  type="text"
                  list="teachers-list"
                  value={classForm.docenteMatricula}
                  onChange={(e) => setClassForm({ ...classForm, docenteMatricula: e.target.value })}
                  placeholder="Buscar por nombre o matrícula"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
                <datalist id="teachers-list">
                  {teachers.map((teacher) => (
                    <option key={teacher.matricula} value={teacher.matricula}>
                      {teacher.nombre} - {teacher.matricula}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número de Alumnos</label>
                <input
                  type="number"
                  min="0"
                  value={classForm.alumnos}
                  onChange={(e) => setClassForm({ ...classForm, alumnos: parseInt(e.target.value) || 0 })}
                  placeholder="Ej: 30"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                >
                  Agregar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Query Modal */}
      {activeModal === 'query' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8"
          >
            <h2 className="text-2xl font-semibold mb-4">Consultar Información</h2>

            <div className="space-y-4">
              <div className="flex gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="teacher">Docentes</option>
                  <option value="class">Clases</option>
                  <option value="classroom">Salones</option>
                </select>

                <button
                  onClick={handleExportData}
                  className="px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Exportar
                </button>
              </div>

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />

              <div className="max-h-96 overflow-y-auto space-y-2">
                {getFilteredData().map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4">
                    <pre className="text-sm overflow-x-auto">{JSON.stringify(item, null, 2)}</pre>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Modal */}
      {activeModal === 'delete' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8"
          >
            <h2 className="text-2xl font-semibold mb-4">Borrar Datos</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={deleteType}
                  onChange={(e) => setDeleteType(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="teacher">Docente</option>
                  <option value="class">Clase</option>
                  <option value="classroom">Salón</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {deleteType === 'teacher' ? 'Matrícula' : deleteType === 'class' ? 'ID de Clase' : 'Nombre del Salón'}
                </label>
                <input
                  type="text"
                  value={deleteId}
                  onChange={(e) => setDeleteId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Ingresa el identificador"
                />
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">
                  ⚠️ Esta acción no se puede deshacer. Verifica el identificador antes de continuar.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Generate QR Modal */}
      {activeModal === 'generateQR' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8"
          >
            <h2 className="text-2xl font-semibold mb-4">Generar Código QR</h2>
            <form onSubmit={handleGenerateQR} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Salón</label>
                <input
                  type="text"
                  value={classroomForm.nombre}
                  onChange={(e) => setClassroomForm({ ...classroomForm, nombre: e.target.value })}
                  placeholder="Ej: 3404"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hora de Apertura</label>
                <input
                  type="time"
                  value={classroomForm.horaApertura}
                  onChange={(e) => setClassroomForm({ ...classroomForm, horaApertura: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hora de Cierre</label>
                <input
                  type="time"
                  value={classroomForm.horaCierre}
                  onChange={(e) => setClassroomForm({ ...classroomForm, horaCierre: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Generar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
