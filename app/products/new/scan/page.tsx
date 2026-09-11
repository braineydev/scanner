"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useZxing } from "react-zxing";

export default function BarcodeScannerPage() {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const router = useRouter();

  const { ref } = useZxing({
    constraints: {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    },
    // Leave formats unrestricted: inventory labels can be Code 128, ITF, or
    // another non-retail symbology as well as the usual EAN/UPC codes.
    timeBetweenDecodingAttempts: 250,
    onDecodeResult(result) {
      if (barcode) return;

      const scannedCode = result.rawValue?.trim();
      if (!scannedCode) return;

      setBarcode(scannedCode);

      setTimeout(() => {
        router.push(`/products/new/${scannedCode}`);
      }, 800);
    },
    onError(error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setHasPermission(false);
        return;
      }

      console.error("Unable to start barcode scanner", error);
      setScannerError("The scanner could not start. Please refresh and try again.");
    },
    onDecodeError(error) {
      console.error("Barcode decoding failed", error);
      setScannerError("The camera is on, but the barcode reader hit an error. Please refresh and try again.");
    },
    paused: !!barcode,
  });

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasPermission(false);
    } else {
      setHasPermission(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-black rounded-2xl overflow-hidden shadow-2xl relative flex flex-col h-[80vh] max-h-[700px]">
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent">
          <Link
            href="/products/new"
            className="text-white bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition"
          >
            ✕ Cancel
          </Link>
        </div>

        {hasPermission === false ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-900">
            <div className="bg-red-500/20 p-4 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">
              Camera Access Denied
            </h3>
            <p className="text-gray-400 text-sm">
              Please allow camera permissions in your browser settings to scan
              products.
            </p>
          </div>
        ) : (
          <div className="flex-1 relative bg-black">
            <video
              ref={ref}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
            />

            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/50 sm:border-[60px]">
              <div className="w-full h-48 border-2 border-white/50 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg -ml-[2px] -mt-[2px]"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg -mr-[2px] -mt-[2px]"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg -ml-[2px] -mb-[2px]"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg -mr-[2px] -mb-[2px]"></div>

                {!barcode && (
                  <div className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
          {barcode ? (
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 rounded-full p-1">
                  <svg
                    className="w-5 h-5 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-green-400 font-bold text-sm">
                    Barcode Detected
                  </p>
                  <p className="text-white text-xl font-mono mt-1">{barcode}</p>
                </div>
              </div>
              <button
                disabled
                className="mt-3 w-full bg-white/10 text-white py-2 rounded-lg text-sm font-medium opacity-50"
              >
                Redirecting...
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-white font-medium mb-1">
                Scan product barcode
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Position the barcode inside the frame.
              </p>
              {scannerError && (
                <p className="mb-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">
                  {scannerError}
                </p>
              )}
              <Link
                href="/products/new/manual"
                className="text-gray-400 text-sm underline hover:text-white transition"
              >
                Enter Barcode Manually
              </Link>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `,
        }}
      />
    </div>
  );
}
