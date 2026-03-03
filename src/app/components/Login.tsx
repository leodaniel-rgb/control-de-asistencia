import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { seedDemoData } from '../../lib/seedData';
import { motion } from 'motion/react';
import { LogIn, User, Lock } from 'lucide-react';
import tecmilenioLogo from '/WEB_Logotipo_Variante_RGB_UNIVERSIDAD-01.png';
import universidadLogo from '/WEB_Logotipo_Negativo_RGB_UNIVERSIDAD-01.png';

export function Login() {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSeeding, setIsSeeding] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');
  const navigate = useNavigate();

  // Seed demo data on component mount
  useEffect(() => {
    const initializeDemoData = async () => {
      setIsSeeding(true);
      await seedDemoData();
      setIsSeeding(false);
    };
    initializeDemoData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir login mientras se cargan datos de prueba
    if (isSeeding) {
      setError('Cargando datos de prueba, espera un momento...');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', matricula);
      const response = await api.login(matricula, password);
      
      if (response.success) {
        // Save user data to localStorage
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('role', response.role);

        // Navigate based on role
        if (response.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/teacher');
        }
      }
    } catch (err) {
      setError('Credenciales incorrectas. Por favor, intenta de nuevo.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-500 to-green-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <img
                src={tecmilenioLogo}
                alt="Tecmilenio Logo"
                className="h-12 mx-auto mb-3"
              />
              <img
                src={universidadLogo}
                alt="Universidad Logo"
                className="h-12 mx-auto"
              />
            </div>
            <p className="text-gray-600 mt-4">Control de Asistencia</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <label htmlFor="matricula" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Matrícula
              </label>
              <input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="Ingresa tu numero de nomina"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="Ingresa tu contraseña"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
