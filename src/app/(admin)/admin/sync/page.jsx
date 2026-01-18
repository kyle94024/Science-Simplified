'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function SyncPage() {
  const [progress, setProgress] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [status, setStatus] = useState('');
  const eventSourceRef = useRef(null);

  const startSync = () => {
    setIsRunning(true);
    setLog([]);
    setProgress(null);
    setStatus('Connecting...');

    const eventSource = new EventSource('/api/clinical-trials/sync');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'status') {
        setStatus(data.message);
        setLog((prev) => [...prev, { type: 'info', message: data.message, time: new Date() }]);
      } else if (data.type === 'progress') {
        setProgress(data);
        if (data.action === 'processed') {
          setLog((prev) => [
            ...prev,
            { type: 'success', message: `✅ Processed: ${data.nctId}`, time: new Date() },
          ]);
        }
      } else if (data.type === 'error') {
        setProgress(data);
        setLog((prev) => [
          ...prev,
          { type: 'error', message: `❌ Error on ${data.nctId}: ${data.message}`, time: new Date() },
        ]);
      } else if (data.type === 'complete') {
        setProgress(data);
        setStatus('Complete!');
        setIsRunning(false);
        setLog((prev) => [
          ...prev,
          {
            type: 'complete',
            message: `🎉 Sync complete! Processed: ${data.processed}, Skipped: ${data.skipped}, Errors: ${data.errors}`,
            time: new Date(),
          },
        ]);
        eventSource.close();
      } else if (data.type === 'fatal') {
        setStatus('Fatal error');
        setIsRunning(false);
        setLog((prev) => [...prev, { type: 'error', message: `💥 Fatal: ${data.message}`, time: new Date() }]);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setStatus('Connection error');
      setIsRunning(false);
      setLog((prev) => [...prev, { type: 'error', message: '🔌 Connection lost', time: new Date() }]);
      eventSource.close();
    };
  };

  const stopSync = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setIsRunning(false);
      setStatus('Stopped by user');
      setLog((prev) => [...prev, { type: 'info', message: '⏹️ Sync stopped by user', time: new Date() }]);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Clinical Trials Sync</h1>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <Button onClick={startSync} disabled={isRunning} className="bg-blue-600 hover:bg-blue-700">
          {isRunning ? 'Syncing...' : 'Start Sync'}
        </Button>
        {isRunning && (
          <Button onClick={stopSync} variant="destructive">
            Stop
          </Button>
        )}
      </div>

      {/* Status */}
      {status && (
        <div className="mb-4 text-sm text-gray-600">
          Status: <span className="font-medium">{status}</span>
        </div>
      )}

      {/* Progress Bar */}
      {progress && (
        <Card className="p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>
              Progress: {progress.current || 0} / {progress.total || 0}
            </span>
            <span>{progress.percent || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent || 0}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="bg-green-50 p-2 rounded">
              <div className="text-green-700 font-bold text-lg">{progress.processed || 0}</div>
              <div className="text-green-600">Processed</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-700 font-bold text-lg">{progress.skipped || 0}</div>
              <div className="text-gray-600">Skipped</div>
            </div>
            <div className="bg-red-50 p-2 rounded">
              <div className="text-red-700 font-bold text-lg">{progress.errors || 0}</div>
              <div className="text-red-600">Errors</div>
            </div>
          </div>
        </Card>
      )}

      {/* Log */}
      {log.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Activity Log</h3>
          <div className="max-h-96 overflow-y-auto space-y-1 text-sm font-mono bg-gray-900 text-gray-100 p-4 rounded">
            {log.map((item, i) => (
              <div
                key={i}
                className={`${
                  item.type === 'error'
                    ? 'text-red-400'
                    : item.type === 'success'
                    ? 'text-green-400'
                    : item.type === 'complete'
                    ? 'text-yellow-400'
                    : 'text-gray-300'
                }`}
              >
                <span className="text-gray-500 mr-2">
                  {item.time.toLocaleTimeString()}
                </span>
                {item.message}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Info */}
      <div className="mt-6 text-sm text-gray-500">
        <p>
          This will sync clinical trials from ClinicalTrials.gov for the current tenant. Studies that
          haven&apos;t changed in the last week will be skipped. Each new study takes ~10-15 seconds to
          process due to AI generation.
        </p>
      </div>
    </div>
  );
}