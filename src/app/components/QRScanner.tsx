import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isSecureContextState, setIsSecureContextState] = useState<boolean>(true);

  // Verificar el estado de permisos al cargar
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');
          console.log('Camera permission status:', result.state);
          
          if (result.state === 'denied') {
            setPermissionDenied(true);
            setIsInitializing(false);
            setError('Los permisos de cámara están bloqueados. Por favor, habilita el acceso a la cámara en la configuración de tu navegador.');
          }
        }
      } catch (err) {
        console.log('Permissions API not available:', err);
      }
      // Check secure context (camera via getUserMedia usually requires HTTPS or localhost)
      const secure = (window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
      setIsSecureContextState(secure);
    };
    
    checkPermissions();
  }, []);

  const startScanner = async () => {
    try {
      setError(null);
      setPermissionDenied(false);
      setIsInitializing(true);
      
      console.log('Requesting camera permissions...');
      
      // Verificar si el navegador soporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara. Por favor, usa Chrome, Safari o Firefox actualizado.');
      }
      
      console.log('Initializing QR scanner...');

      // First explicitly request camera access to trigger browser permission prompt
      try {
        const probeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        probeStream.getTracks().forEach((t) => t.stop());
        setPermissionStatus('granted');
      } catch (probeError: any) {
        console.error('Permission probe failed:', probeError);
        setPermissionStatus('denied');
        throw probeError;
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // Try to get available cameras and prefer a rear/environment camera when possible
      let cameras: Array<{ id: string; label?: string }> = [];
      try {
        // Html5Qrcode.getCameras uses enumerateDevices under the hood
        cameras = await Html5Qrcode.getCameras();
      } catch (e) {
        console.warn('Could not enumerate cameras (may need permissions):', e);
        cameras = [];
      }

      let cameraIdOrConfig: any = { facingMode: 'environment' };

      if (cameras && cameras.length > 0) {
        // Prefer a camera whose label hints it's the back camera
        const preferred = cameras.find((c) => /back|rear|environment|trasera/i.test(c.label || '')) || cameras[cameras.length - 1];
        if (preferred && preferred.id) cameraIdOrConfig = preferred.id;
      }

      await scanner.start(
        cameraIdOrConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log('QR Code detected:', decodedText);
          scanner.stop().catch(console.error);
          try { scanner.clear(); } catch (e) { /* ignore */ }
          onScan(decodedText);
        },
        (errorMessage) => {
          // Ignore transient scanning errors
        }
      );
      
      console.log('Scanner started successfully');
      setIsScanning(true);
      setIsInitializing(false);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setIsInitializing(false);
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara cuando tu navegador lo solicite.');
        setPermissionDenied(true);
      } else if (err.name === 'NotFoundError' || err.message?.includes('No camera')) {
        setError('No se encontró ninguna cámara en este dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('La cámara está siendo usada por otra aplicación.');
      } else if (err.name === 'NotSupportedError') {
        setError('Tu navegador no soporta acceso a la cámara. Intenta usar Chrome, Safari o Firefox.');
      } else {
        setError(`Error al acceder a la cámara: ${err.message || 'Error desconocido'}. Por favor, verifica los permisos e intenta de nuevo.`);
      }
    }
  };

  useEffect(() => {
    // Solo iniciar el scanner si no hay permisos denegados
    if (permissionStatus !== 'denied') {
      startScanner();
    }

    return () => {
      const stopAndClear = async () => {
        try {
          if (scannerRef.current) {
            if (scannerRef.current.isScanning) await scannerRef.current.stop();
            try { await scannerRef.current.clear(); } catch (e) { /* ignore */ }
          }
        } catch (e) {
          console.error('Error stopping scanner on unmount:', e);
        }
      };

      stopAndClear();
    };
  }, [permissionStatus]);

  const handleClose = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
    onClose();
  };

  const handleRetry = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
    scannerRef.current = null;
    startScanner();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold">Escanear QR</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 mb-1">Error de Cámara</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>

              {permissionDenied && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">📷 Cómo habilitar la cámara:</p>
                  
                  <div className="space-y-2 text-xs text-blue-700">
                    <div>
                      <p className="font-semibold">Chrome/Edge:</p>
                      <p>Haz clic en el icono 🔒 junto a la URL → Permisos → Cámara: Permitir</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold">Safari iOS:</p>
                      <p>Configuración → Safari → Cámara → Permitir</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold">Firefox:</p>
                      <p>Icono 🔒 → Permisos → Cámara → Permitir</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-blue-600 font-medium mt-3 pt-2 border-t border-blue-200">
                    💡 Después de cambiar permisos, presiona "Reintentar"
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 bg-green-500 text-white py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reintentar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <div id="qr-reader" className="rounded-xl overflow-hidden" />
              </div>

              <p className="text-sm text-gray-600 mt-4 mb-4 text-center">
                {isInitializing ? 'Iniciando cámara...' : isScanning ? 'Apunta la cámara al código QR del salón' : 'Iniciando cámara...'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}