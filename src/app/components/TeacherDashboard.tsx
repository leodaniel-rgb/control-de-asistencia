import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { QRScanner } from './QRScanner';
import { motion } from 'motion/react';
import {
  QrCode,
  XCircle,
  LogOut,
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Class {
  id: string;
  nombre: string;
  horarioInicio: string;
  horarioFin: string;
  dia: string;
  salon: string;
  docenteMatricula: string;
  qrCode: string;
  alumnos: number;
}

interface Attendance {
  teacherMatricula: string;
  classId: string;
  date: string;
  time: string;
  status: 'present' | 'absent' | 'late';
  reason?: string;
}

export function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showScanner, setShowScanner] = useState(false);
  const [showAbsentForm, setShowAbsentForm] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [filter, setFilter] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [absentReason, setAbsentReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const role = localStorage.getItem('role');

    if (!userData || role !== 'teacher') {
      navigate('/login');
      return;
    }

    setUser(JSON.parse(userData));
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      loadClasses();
      loadAttendance();
    }
  }, [user]);

  const loadClasses = async () => {
    try {
      const response = await api.getClassesByTeacher(user.matricula);
      setClasses(response.classes || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await api.getAttendanceByTeacher(user.matricula);
      setAttendance(response.attendance || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const handleQRScan = async (qrData: string) => {
    setShowScanner(false);
    setLoading(true);

    try {
      // Find class by QR code
      const matchedClass = classes.find(c => c.qrCode === qrData);
      
      if (!matchedClass) {
        alert('QR no válido. No se encontró la clase.');
        return;
      }

      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const currentTime = format(now, 'HH:mm');
      
      // Parse class start time
      const [startHour, startMinute] = matchedClass.horarioInicio.split(':').map(Number);
      const classStartTime = new Date(now);
      classStartTime.setHours(startHour, startMinute, 0);
      
      // Calculate if late (more than 10 minutes after start)
      const tenMinutesAfterStart = new Date(classStartTime);
      tenMinutesAfterStart.setMinutes(tenMinutesAfterStart.getMinutes() + 10);
      
      const status = now > tenMinutesAfterStart ? 'late' : 'present';

      await api.markAttendance({
        teacherMatricula: user.matricula,
        classId: matchedClass.id,
        date: today,
        time: currentTime,
        status,
      });

      alert(status === 'late' ? 'Asistencia marcada (Retardo)' : 'Asistencia marcada correctamente');
      loadAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Error al marcar asistencia');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAbsent = async () => {
    if (!selectedClass || !absentReason) {
      alert('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const currentTime = format(now, 'HH:mm');

      await api.markAttendance({
        teacherMatricula: user.matricula,
        classId: selectedClass,
        date: today,
        time: currentTime,
        status: 'absent',
        reason: absentReason,
      });

      alert('Inasistencia registrada');
      setShowAbsentForm(false);
      setSelectedClass('');
      setAbsentReason('');
      loadAttendance();
    } catch (error) {
      console.error('Error marking absence:', error);
      alert('Error al registrar inasistencia');
    } finally {
      setLoading(false);
    }
  };

  const getTodayStats = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayAttendance = attendance.filter(a => a.date === today);
    
    const present = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const absent = todayAttendance.filter(a => a.status === 'absent').length;
    
    return { present, absent };
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const stats = getTodayStats();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold">{user.nombre}</h1>
              <p className="text-green-100 mt-1">Matrícula: {user.matricula}</p>
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
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowScanner(true)}
            disabled={loading}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            <QrCode className="w-8 h-8 mx-auto mb-2" />
            <span className="font-semibold text-lg">Marcar Asistencia</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAbsentForm(true)}
            disabled={loading}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            <span className="font-semibold text-lg">Marcar Inasistencia</span>
          </motion.button>
        </div>

        {/* Daily Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Resumen del Día</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Asistencias</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.present}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Inasistencias</span>
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
            </div>
          </div>
        </div>

        {/* Classes List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Mis Clases</h2>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="dia">Día</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
            </select>
          </div>

          <div className="space-y-3">
            {classes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay clases registradas</p>
            ) : (
              classes.map((clase) => (
                <div
                  key={clase.id}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-lg mb-2">{clase.nombre}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>Salón: {clase.salon}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{clase.dia}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{clase.horarioInicio} - {clase.horarioFin}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{clase.alumnos} alumnos</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Absent Form Modal */}
      {showAbsentForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-semibold mb-4">Registrar Inasistencia</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona la clase
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">-- Selecciona --</option>
                  {classes.map((clase) => (
                    <option key={clase.id} value={clase.id}>
                      {clase.nombre} - {clase.dia} {clase.horarioInicio}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razón de la inasistencia
                </label>
                <textarea
                  value={absentReason}
                  onChange={(e) => setAbsentReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none resize-none"
                  rows={3}
                  placeholder="Describe el motivo..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAbsentForm(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMarkAbsent}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-700">Procesando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
