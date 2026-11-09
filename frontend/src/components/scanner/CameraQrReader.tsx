import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { SwitchCamera, Zap, ZapOff, AlertCircle } from 'lucide-react';

interface CameraQrReaderProps {
  onScanSuccess: (decodedText: string) => void;
  paused?: boolean;
}

export const CameraQrReader: React.FC<CameraQrReaderProps> = ({ onScanSuccess, paused = false }) => {
  const containerId = 'qr-reader-container';
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Initialize and get cameras
  useEffect(() => {
    let mounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera
          const backCam = devices.find(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('No camera found on this device.');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setCameraError(err.message || 'Camera permission denied or camera unavailable.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Start scanner when camera is selected
  useEffect(() => {
    if (!selectedCameraId) return;

    let html5QrCode: Html5Qrcode;
    try {
      html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      html5QrCodeRef.current = html5QrCode;
    } catch {
      return;
    }

    const config = {
      fps: 15,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    html5QrCode
      .start(
        selectedCameraId,
        config,
        (decodedText) => {
          if (isProcessingRef.current || paused) return;
          isProcessingRef.current = true;
          onScanSuccess(decodedText);
          // Debounce 2 seconds
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 2000);
        },
        () => {} // scan failure on frame is normal, ignore
      )
      .then(() => {
        // Check torch capability
        try {
          const track = (html5QrCode as any).getRunningTrack();
          if (track && typeof track.getCapabilities === 'function') {
            const caps = track.getCapabilities();
            if (caps && caps.torch) {
              setHasTorch(true);
            }
          }
        } catch {}
      })
      .catch((err) => {
        setCameraError('Failed to start camera: ' + (err.message || 'Error'));
      });

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
          })
          .catch(() => {});
      }
    };
  }, [selectedCameraId]);

  // Switch camera toggle
  const handleSwitchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  // Torch toggle
  const handleToggleTorch = () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !isTorchOn;
      html5QrCodeRef.current
        .applyVideoConstraints({
          advanced: [{ torch: nextTorch } as any]
        })
        .then(() => setIsTorchOn(nextTorch))
        .catch(() => {});
    } catch {}
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Scanner Viewport */}
      <div className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800">
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Scan Frame Guidelines */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-56 h-56 border-2 border-white/60 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />

            {/* Scanning line animation */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Camera Controls Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-20">
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition cursor-pointer"
              title="Switch Camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}

          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md transition cursor-pointer ${
                isTorchOn ? 'bg-amber-400 text-gray-950' : 'bg-black/60 text-white hover:bg-black/80'
              }`}
              title="Toggle Flashlight"
            >
              {isTorchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="mt-3 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 max-w-sm">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}
    </div>
  );
};
