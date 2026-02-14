import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-af5c549d`;

async function request(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`API error at ${endpoint}:`, data);
    throw new Error(data.error || 'Error en la petición');
  }

  return data;
}

export const api = {
  login: (matricula: string, password: string) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify({ matricula, password }),
    }),

  // Teachers
  addTeacher: (teacher: { nombre: string; matricula: string; password: string; descripcion: string }) =>
    request('/teachers', {
      method: 'POST',
      body: JSON.stringify(teacher),
    }),

  getTeachers: () => request('/teachers'),

  deleteTeacher: (matricula: string) =>
    request(`/teachers/${matricula}`, { method: 'DELETE' }),

  // Classes
  addClass: (classData: {
    nombre: string;
    horarioInicio: string;
    horarioFin: string;
    dia: string;
    salon: string;
    docenteMatricula: string;
    qrCode: string;
    alumnos?: number;
  }) =>
    request('/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    }),

  getClasses: () => request('/classes'),

  getClassesByTeacher: (matricula: string) =>
    request(`/classes/teacher/${matricula}`),

  deleteClass: (id: string) =>
    request(`/classes/${id}`, { method: 'DELETE' }),

  // Attendance
  markAttendance: (attendance: {
    teacherMatricula: string;
    classId: string;
    date: string;
    time: string;
    status: 'present' | 'absent' | 'late';
    reason?: string;
  }) =>
    request('/attendance', {
      method: 'POST',
      body: JSON.stringify(attendance),
    }),

  getAttendanceByTeacher: (matricula: string) =>
    request(`/attendance/teacher/${matricula}`),

  getAllAttendance: () => request('/attendance'),

  // Classrooms
  addClassroom: (classroom: { nombre: string; horaApertura: string; horaCierre: string; qrCode: string }) =>
    request('/classrooms', {
      method: 'POST',
      body: JSON.stringify(classroom),
    }),

  getClassrooms: () => request('/classrooms'),

  deleteClassroom: (nombre: string) =>
    request(`/classrooms/${nombre}`, { method: 'DELETE' }),
};