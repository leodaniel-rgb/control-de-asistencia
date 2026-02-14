import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-af5c549d/health", (c) => {
  return c.json({ status: "ok" });
});

// Login endpoint
app.post("/make-server-af5c549d/login", async (c) => {
  try {
    const { matricula, password } = await c.req.json();
    
    // Admin credentials
    if (matricula === "2989234" && password === "Master73") {
      return c.json({ 
        success: true, 
        role: "admin",
        user: {
          matricula: "2989234",
          nombre: "Administrador"
        }
      });
    }
    
    // Teacher login
    const teacherKey = `teacher:${matricula}`;
    const teacher = await kv.get(teacherKey);
    
    if (!teacher) {
      return c.json({ success: false, error: "Credenciales incorrectas" }, 401);
    }
    
    if (teacher.password !== password) {
      return c.json({ success: false, error: "Credenciales incorrectas" }, 401);
    }
    
    return c.json({ 
      success: true, 
      role: "teacher",
      user: {
        matricula: teacher.matricula,
        nombre: teacher.nombre,
        descripcion: teacher.descripcion
      }
    });
  } catch (error) {
    console.log(`Error during login: ${error}`);
    return c.json({ success: false, error: "Error en el servidor" }, 500);
  }
});

// Add new teacher (admin only)
app.post("/make-server-af5c549d/teachers", async (c) => {
  try {
    const { nombre, matricula, password, descripcion } = await c.req.json();
    
    const teacherKey = `teacher:${matricula}`;
    await kv.set(teacherKey, { nombre, matricula, password, descripcion });
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error adding teacher: ${error}`);
    return c.json({ success: false, error: "Error al agregar docente" }, 500);
  }
});

// Get all teachers
app.get("/make-server-af5c549d/teachers", async (c) => {
  try {
    const teachers = await kv.getByPrefix("teacher:");
    return c.json({ success: true, teachers });
  } catch (error) {
    console.log(`Error getting teachers: ${error}`);
    return c.json({ success: false, error: "Error al obtener docentes" }, 500);
  }
});

// Delete teacher
app.delete("/make-server-af5c549d/teachers/:matricula", async (c) => {
  try {
    const matricula = c.req.param("matricula");
    await kv.del(`teacher:${matricula}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting teacher: ${error}`);
    return c.json({ success: false, error: "Error al eliminar docente" }, 500);
  }
});

// Add new class
app.post("/make-server-af5c549d/classes", async (c) => {
  try {
    const { nombre, horarioInicio, horarioFin, dia, salon, docenteMatricula, qrCode, alumnos } = await c.req.json();
    
    const classId = `${docenteMatricula}-${nombre}-${dia}`.replace(/\s/g, '_');
    const classKey = `class:${classId}`;
    
    await kv.set(classKey, {
      id: classId,
      nombre,
      horarioInicio,
      horarioFin,
      dia,
      salon,
      docenteMatricula,
      qrCode,
      alumnos: alumnos || 0
    });
    
    return c.json({ success: true, classId });
  } catch (error) {
    console.log(`Error adding class: ${error}`);
    return c.json({ success: false, error: "Error al agregar clase" }, 500);
  }
});

// Get all classes
app.get("/make-server-af5c549d/classes", async (c) => {
  try {
    const classes = await kv.getByPrefix("class:");
    return c.json({ success: true, classes });
  } catch (error) {
    console.log(`Error getting classes: ${error}`);
    return c.json({ success: false, error: "Error al obtener clases" }, 500);
  }
});

// Get classes by teacher
app.get("/make-server-af5c549d/classes/teacher/:matricula", async (c) => {
  try {
    const matricula = c.req.param("matricula");
    const allClasses = await kv.getByPrefix("class:");
    const teacherClasses = allClasses.filter(cls => cls.docenteMatricula === matricula);
    return c.json({ success: true, classes: teacherClasses });
  } catch (error) {
    console.log(`Error getting teacher classes: ${error}`);
    return c.json({ success: false, error: "Error al obtener clases del docente" }, 500);
  }
});

// Delete class
app.delete("/make-server-af5c549d/classes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`class:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting class: ${error}`);
    return c.json({ success: false, error: "Error al eliminar clase" }, 500);
  }
});

// Mark attendance
app.post("/make-server-af5c549d/attendance", async (c) => {
  try {
    const { teacherMatricula, classId, date, time, status, reason } = await c.req.json();
    
    const attendanceKey = `attendance:${teacherMatricula}:${classId}:${date}`;
    await kv.set(attendanceKey, {
      teacherMatricula,
      classId,
      date,
      time,
      status, // 'present', 'absent', 'late'
      reason: reason || null,
      timestamp: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error marking attendance: ${error}`);
    return c.json({ success: false, error: "Error al marcar asistencia" }, 500);
  }
});

// Get attendance by teacher and date range
app.get("/make-server-af5c549d/attendance/teacher/:matricula", async (c) => {
  try {
    const matricula = c.req.param("matricula");
    const allAttendance = await kv.getByPrefix(`attendance:${matricula}:`);
    return c.json({ success: true, attendance: allAttendance });
  } catch (error) {
    console.log(`Error getting attendance: ${error}`);
    return c.json({ success: false, error: "Error al obtener asistencias" }, 500);
  }
});

// Get all attendance (admin)
app.get("/make-server-af5c549d/attendance", async (c) => {
  try {
    const allAttendance = await kv.getByPrefix("attendance:");
    return c.json({ success: true, attendance: allAttendance });
  } catch (error) {
    console.log(`Error getting all attendance: ${error}`);
    return c.json({ success: false, error: "Error al obtener asistencias" }, 500);
  }
});

// Create/Update classroom
app.post("/make-server-af5c549d/classrooms", async (c) => {
  try {
    const { nombre, horaApertura, horaCierre, qrCode } = await c.req.json();
    
    const classroomKey = `classroom:${nombre}`;
    await kv.set(classroomKey, { nombre, horaApertura, horaCierre, qrCode });
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error adding classroom: ${error}`);
    return c.json({ success: false, error: "Error al agregar salón" }, 500);
  }
});

// Get all classrooms
app.get("/make-server-af5c549d/classrooms", async (c) => {
  try {
    const classrooms = await kv.getByPrefix("classroom:");
    return c.json({ success: true, classrooms });
  } catch (error) {
    console.log(`Error getting classrooms: ${error}`);
    return c.json({ success: false, error: "Error al obtener salones" }, 500);
  }
});

// Delete classroom
app.delete("/make-server-af5c549d/classrooms/:nombre", async (c) => {
  try {
    const nombre = c.req.param("nombre");
    await kv.del(`classroom:${nombre}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting classroom: ${error}`);
    return c.json({ success: false, error: "Error al eliminar salón" }, 500);
  }
});

Deno.serve(app.fetch);