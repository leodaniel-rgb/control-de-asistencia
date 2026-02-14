import { api } from './api';

export async function seedDemoData() {
  // Verificar si ya se crearon datos
  const seeded = localStorage.getItem('demo_data_seeded');
  const lastAttempt = localStorage.getItem('demo_data_last_attempt');
  const now = Date.now();
  
  // Si ya se sembró y fue reciente (menos de 1 hora), salir
  if (seeded && lastAttempt && (now - parseInt(lastAttempt)) < 3600000) {
    console.log('Demo data already seeded');
    return;
  }
  
  // Guardar timestamp del intento
  localStorage.setItem('demo_data_last_attempt', now.toString());

  try {
    console.log('Starting to seed demo data...');
    
    // Crear docentes de prueba
    const teachers = [
      {
        nombre: 'Dr. Juan Pérez García',
        matricula: '001234',
        password: 'demo123',
        descripcion: 'Profesor de Matemáticas Avanzadas con 15 años de experiencia',
      },
      {
        nombre: 'Mtra. María López Hernández',
        matricula: '001235',
        password: 'demo123',
        descripcion: 'Especialista en Física Cuántica y Ciencias Aplicadas',
      },
      {
        nombre: 'Dr. Carlos Ramírez Soto',
        matricula: '001236',
        password: 'demo123',
        descripcion: 'Docente de Programación y Desarrollo de Software',
      },
    ];

    for (const teacher of teachers) {
      try {
        await api.addTeacher(teacher);
        console.log(`✓ Teacher added: ${teacher.matricula} - ${teacher.nombre}`);
      } catch (error) {
        console.log(`Teacher may already exist: ${teacher.matricula}`, error);
      }
    }

    // Esperar un momento para asegurar que se guardaron
    await new Promise(resolve => setTimeout(resolve, 300));

    // Crear salones de prueba
    const classrooms = [
      { nombre: '3404', horaApertura: '07:00', horaCierre: '22:00', qrCode: 'classroom:3404' },
      { nombre: '3405', horaApertura: '07:00', horaCierre: '22:00', qrCode: 'classroom:3405' },
      { nombre: '2101', horaApertura: '07:00', horaCierre: '22:00', qrCode: 'classroom:2101' },
    ];

    for (const classroom of classrooms) {
      try {
        await api.addClassroom(classroom);
        console.log(`✓ Classroom added: ${classroom.nombre}`);
      } catch (error) {
        console.log(`Classroom may already exist: ${classroom.nombre}`, error);
      }
    }

    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 300));

    // Crear clases de prueba
    const classes = [
      {
        nombre: 'Cálculo Diferencial',
        horarioInicio: '08:00',
        horarioFin: '10:00',
        dia: 'Lunes',
        salon: '3404',
        docenteMatricula: '001234',
        qrCode: 'classroom:3404',
        alumnos: 35,
      },
      {
        nombre: 'Álgebra Lineal',
        horarioInicio: '10:00',
        horarioFin: '12:00',
        dia: 'Martes',
        salon: '3404',
        docenteMatricula: '001234',
        qrCode: 'classroom:3404',
        alumnos: 28,
      },
      {
        nombre: 'Física I',
        horarioInicio: '08:00',
        horarioFin: '10:00',
        dia: 'Miércoles',
        salon: '3405',
        docenteMatricula: '001235',
        qrCode: 'classroom:3405',
        alumnos: 32,
      },
      {
        nombre: 'Programación Orientada a Objetos',
        horarioInicio: '14:00',
        horarioFin: '16:00',
        dia: 'Jueves',
        salon: '2101',
        docenteMatricula: '001236',
        qrCode: 'classroom:2101',
        alumnos: 40,
      },
      {
        nombre: 'Desarrollo Web',
        horarioInicio: '16:00',
        horarioFin: '18:00',
        dia: 'Viernes',
        salon: '2101',
        docenteMatricula: '001236',
        qrCode: 'classroom:2101',
        alumnos: 25,
      },
    ];

    for (const cls of classes) {
      try {
        await api.addClass(cls);
        console.log(`✓ Class added: ${cls.nombre}`);
      } catch (error) {
        console.log(`Class may already exist: ${cls.nombre}`, error);
      }
    }

    // Esperar para asegurar que todos los datos se guardaron
    await new Promise(resolve => setTimeout(resolve, 1000));

    localStorage.setItem('demo_data_seeded', 'true');
    console.log('✓✓✓ Demo data seeded successfully! ✓✓✓');
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    // Limpiar el flag de seeded si hubo un error
    localStorage.removeItem('demo_data_seeded');
    throw error;
  }
}